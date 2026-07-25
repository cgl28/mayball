begin;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace='public'::regnamespace and typname='document_upload_status') then
    create type public.document_upload_status as enum ('pending','finalised','voided');
  end if;
end $$;

alter table public.documents
  add column if not exists status public.document_upload_status not null default 'pending',
  add column if not exists description text check(description is null or char_length(description)<=1000),
  add column if not exists finalized_at timestamptz,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id),
  add column if not exists void_reason text,
  add column if not exists replaced_by_document_id uuid references public.documents(id);

alter table public.documents
  add constraint documents_status_metadata_check check (
    (status='pending' and finalized_at is null and voided_at is null and voided_by is null and void_reason is null)
    or (status='finalised' and finalized_at is not null and voided_at is null and voided_by is null and void_reason is null)
    or (status='voided' and finalized_at is not null and voided_at is not null and voided_by is not null and char_length(btrim(void_reason)) between 1 and 1000)
  );

alter table public.documents
  add constraint documents_one_material_parent_check check (
    num_nonnulls(revision_id,payment_id)=1
  );

create index if not exists documents_event_status_created_idx on public.documents(event_id,status,created_at desc,id desc);
create index if not exists documents_event_request_idx on public.documents(event_id,request_id);
create index if not exists documents_event_revision_idx on public.documents(event_id,revision_id);
create index if not exists documents_event_payment_idx on public.documents(event_id,payment_id);
create index if not exists documents_uploaded_by_status_idx on public.documents(uploaded_by,status);

create or replace function public.can_view_request(p_request_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.spending_requests r
    where r.id=p_request_id
      and (
        r.owner_user_id=(select auth.uid())
        or public.is_event_treasurer(r.event_id)
        or (r.approval_status not in ('draft','cancelled','rejected') and public.can_view_event(r.event_id))
      )
  )
$$;

create or replace function public.can_view_document(p_document_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.documents d
    left join public.spending_request_revisions v on v.id=d.revision_id
    left join public.spending_requests r on r.id=coalesce(d.request_id,v.request_id)
    left join public.payments p on p.id=d.payment_id
    where d.id=p_document_id
      and d.status in ('finalised','voided')
      and public.can_view_event(d.event_id)
      and (
        (d.revision_id is not null and public.can_view_request_revision(d.revision_id))
        or (d.revision_id is null and d.request_id is not null and public.can_view_request(d.request_id))
        or (d.payment_id is not null and p.event_id=d.event_id and public.can_view_event(d.event_id))
      )
      and (r.id is null or r.event_id=d.event_id)
      and (p.id is null or p.event_id=d.event_id)
  )
$$;

create or replace function public.can_insert_document_object(p_bucket_id text,p_object_path text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.documents d
    where d.bucket_id=p_bucket_id
      and d.object_path=p_object_path
      and d.status='pending'
      and d.uploaded_by=(select auth.uid())
      and public.is_event_writable(d.event_id)
  )
$$;

create or replace function public.document_activity_visibility(p_revision_id uuid,p_payment_id uuid)
returns text language sql stable security definer set search_path='' as $$
  select case
    when p_payment_id is not null then 'treasurer'
    when exists(select 1 from public.spending_request_revisions v where v.id=p_revision_id and v.status='draft') then 'private_owner'
    else 'committee'
  end
$$;

create or replace function public.assert_document_parent(
  p_event_id uuid,
  p_request_id uuid,
  p_revision_id uuid,
  p_payment_id uuid
) returns table(request_id uuid, parent_summary text)
language plpgsql security definer set search_path='' as $$
declare
  v public.spending_request_revisions;
  r public.spending_requests;
  p public.payments;
begin
  if num_nonnulls(p_revision_id,p_payment_id)<>1 then
    raise exception 'Document must be linked to exactly one supported parent';
  end if;

  if p_revision_id is not null then
    select * into strict v from public.spending_request_revisions where id=p_revision_id and event_id=p_event_id;
    select * into strict r from public.spending_requests where id=v.request_id and event_id=p_event_id;
    if p_request_id is not null and p_request_id<>r.id then
      raise exception 'Document parent does not belong to request';
    end if;
    return query select r.id, 'request '||r.code||' revision '||v.revision_number::text;
    return;
  end if;

  select * into strict p from public.payments where id=p_payment_id and event_id=p_event_id;
  return query select null::uuid, 'payment '||p.code;
end $$;

create or replace function public.normalise_document_extension(p_mime_type text)
returns text language sql immutable set search_path='' as $$
  select case p_mime_type
    when 'application/pdf' then 'pdf'
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then 'docx'
    else null
  end
$$;

create or replace function public.begin_document_upload(
  p_event_id uuid,
  p_request_id uuid,
  p_revision_id uuid,
  p_payment_id uuid,
  p_category public.document_category,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_description text default null
) returns table(document_id uuid,bucket_id text,object_path text)
language plpgsql security definer set search_path='' as $$
declare
  did uuid:=gen_random_uuid();
  parent record;
  ext text;
  clean_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authorised';
  end if;
  if not public.can_view_event(p_event_id) or not public.is_event_writable(p_event_id) then
    raise exception 'Not authorised';
  end if;

  select * into parent from public.assert_document_parent(p_event_id,p_request_id,p_revision_id,p_payment_id);

  if p_revision_id is not null then
    if not (public.can_edit_request_revision(p_revision_id) or public.is_event_treasurer(p_event_id)) then
      raise exception 'Not authorised';
    end if;
  elsif p_payment_id is not null then
    if not public.is_event_treasurer(p_event_id) then
      raise exception 'Not authorised';
    end if;
  end if;

  clean_name:=nullif(btrim(p_original_filename),'');
  if clean_name is null or char_length(clean_name)>255 then
    raise exception 'Invalid file name';
  end if;
  ext:=public.normalise_document_extension(p_mime_type);
  if ext is null then
    raise exception 'Unsupported file type';
  end if;
  if p_size_bytes is null or p_size_bytes<=0 or p_size_bytes>10485760 then
    raise exception 'Invalid file size';
  end if;
  if p_description is not null and char_length(p_description)>1000 then
    raise exception 'Description is too long';
  end if;

  insert into public.documents(
    id,event_id,uploaded_by,request_id,revision_id,payment_id,category,bucket_id,object_path,
    original_filename,mime_type,size_bytes,description,status
  )
  values(
    did,p_event_id,(select auth.uid()),parent.request_id,p_revision_id,p_payment_id,p_category,'event-documents',
    p_event_id::text||'/'||did::text||'/'||replace(gen_random_uuid()::text,'-','')||'.'||ext,
    clean_name,p_mime_type,p_size_bytes,nullif(btrim(p_description),''),'pending'
  );

  return query select did,'event-documents'::text,(select d.object_path from public.documents d where d.id=did);
end $$;

create or replace function public.finalise_document_upload(
  p_document_id uuid,
  p_size_bytes bigint,
  p_mime_type text
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  d public.documents;
  visibility text;
begin
  select * into strict d from public.documents where id=p_document_id for update;
  if d.uploaded_by<>(select auth.uid()) or d.status<>'pending' then
    raise exception 'Not authorised';
  end if;
  if not public.is_event_writable(d.event_id) then
    raise exception 'Not authorised';
  end if;
  if p_size_bytes<>d.size_bytes or p_mime_type<>d.mime_type then
    raise exception 'Uploaded object metadata does not match';
  end if;
  if not exists(select 1 from storage.objects o where o.bucket_id=d.bucket_id and o.name=d.object_path) then
    raise exception 'Uploaded object was not found';
  end if;

  update public.documents set status='finalised',finalized_at=now() where id=d.id;
  visibility:=public.document_activity_visibility(d.revision_id,d.payment_id);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,visibility,metadata)
  values(d.event_id,(select auth.uid()),'document.finalised','document',d.id,'Document uploaded',visibility,jsonb_build_object('category',d.category,'parent_type',case when d.payment_id is not null then 'payment' else 'request_revision' end));
  return d.id;
end $$;

create or replace function public.void_document(p_document_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  d public.documents;
  visibility text;
begin
  select * into strict d from public.documents where id=p_document_id for update;
  if d.status<>'finalised' or nullif(btrim(p_reason),'') is null then
    raise exception 'Invalid document state';
  end if;
  if not public.is_event_writable(d.event_id) then
    raise exception 'Not authorised';
  end if;
  if d.revision_id is not null then
    if not (public.can_edit_request_revision(d.revision_id) or public.is_event_treasurer(d.event_id)) then
      raise exception 'Not authorised';
    end if;
  elsif d.payment_id is not null then
    if not public.is_event_treasurer(d.event_id) then
      raise exception 'Not authorised';
    end if;
  end if;

  update public.documents
  set status='voided',voided_at=now(),voided_by=(select auth.uid()),void_reason=btrim(p_reason)
  where id=d.id;
  visibility:=public.document_activity_visibility(d.revision_id,d.payment_id);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,visibility,metadata)
  values(d.event_id,(select auth.uid()),'document.voided','document',d.id,'Document voided',visibility,jsonb_build_object('reason',btrim(p_reason)));
  return d.id;
end $$;

create or replace view public.v_visible_documents with (security_invoker=true) as
select
  d.id document_id,
  d.event_id,
  d.request_id,
  r.code request_code,
  d.revision_id,
  v.revision_number,
  v.status revision_status,
  d.payment_id,
  p.code payment_code,
  d.category,
  d.description,
  d.original_filename,
  d.mime_type,
  d.size_bytes,
  d.uploaded_by,
  up.display_name uploaded_by_display_name,
  up.preferred_name uploaded_by_preferred_name,
  d.status,
  d.created_at,
  d.finalized_at,
  d.voided_at,
  d.voided_by,
  vp.display_name voided_by_display_name,
  d.void_reason,
  case
    when d.payment_id is not null then 'treasurer'
    when v.status='draft' then 'private_draft'
    else 'committee'
  end visibility_scope
from public.documents d
left join public.spending_request_revisions v on v.id=d.revision_id
left join public.spending_requests r on r.id=coalesce(d.request_id,v.request_id)
left join public.payments p on p.id=d.payment_id
left join public.profiles up on up.id=d.uploaded_by
left join public.profiles vp on vp.id=d.voided_by
where public.can_view_document(d.id);

create or replace view public.v_event_activity_feed with (security_invoker=true) as
select
  a.id activity_id,
  a.event_id,
  a.actor_user_id,
  p.display_name actor_display_name,
  p.preferred_name actor_preferred_name,
  a.action,
  split_part(a.action,'.',1) category,
  a.entity_type,
  a.entity_id,
  a.summary,
  a.visibility,
  a.created_at
from public.activity_log a
left join public.profiles p on p.id=a.actor_user_id;

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated using(public.can_view_document(id));

drop policy if exists event_documents_select on storage.objects;
drop policy if exists event_documents_insert on storage.objects;

create policy event_documents_select on storage.objects for select to authenticated using(
  bucket_id='event-documents'
  and exists(
    select 1 from public.documents d
    where d.bucket_id=storage.objects.bucket_id
      and d.object_path=storage.objects.name
      and public.can_view_document(d.id)
  )
);

create policy event_documents_insert on storage.objects for insert to authenticated with check(
  bucket_id='event-documents'
  and public.can_insert_document_object(storage.objects.bucket_id,storage.objects.name)
);

grant select on public.v_visible_documents,public.v_event_activity_feed to authenticated;

revoke execute on function
  public.can_view_request(uuid),
  public.can_view_document(uuid),
  public.can_insert_document_object(text,text),
  public.document_activity_visibility(uuid,uuid),
  public.assert_document_parent(uuid,uuid,uuid,uuid),
  public.normalise_document_extension(text),
  public.begin_document_upload(uuid,uuid,uuid,uuid,public.document_category,text,text,bigint,text),
  public.finalise_document_upload(uuid,bigint,text),
  public.void_document(uuid,text)
from public;

grant execute on function
  public.can_view_request(uuid),
  public.can_view_document(uuid),
  public.can_insert_document_object(text,text),
  public.begin_document_upload(uuid,uuid,uuid,uuid,public.document_category,text,text,bigint,text),
  public.finalise_document_upload(uuid,bigint,text),
  public.void_document(uuid,text)
to authenticated;

commit;
