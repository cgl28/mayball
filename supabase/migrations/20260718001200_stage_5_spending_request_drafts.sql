begin;

create or replace function public.prevent_submitted_revision_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.status <> 'draft' then
    raise exception 'Submitted request revisions are immutable';
  end if;
  return new;
end $$;

create or replace function public.prevent_submitted_revision_child_mutation() returns trigger
language plpgsql set search_path='' as $$
declare revision_status public.revision_status;
begin
  select status into strict revision_status
  from public.spending_request_revisions
  where id=coalesce(old.revision_id,new.revision_id);
  if revision_status <> 'draft' then
    raise exception 'Submitted request revision children are immutable';
  end if;
  return coalesce(new,old);
end $$;

drop trigger if exists submitted_revisions_immutable_update on public.spending_request_revisions;
drop trigger if exists submitted_revisions_immutable_delete on public.spending_request_revisions;
drop trigger if exists submitted_allocations_immutable_update on public.spending_request_department_allocations;
drop trigger if exists submitted_allocations_immutable_delete on public.spending_request_department_allocations;
drop trigger if exists submitted_components_immutable_update on public.request_components;
drop trigger if exists submitted_components_immutable_delete on public.request_components;

create trigger submitted_revisions_immutable_update before update on public.spending_request_revisions
  for each row execute function public.prevent_submitted_revision_mutation();
create trigger submitted_revisions_immutable_delete before delete on public.spending_request_revisions
  for each row execute function public.prevent_submitted_revision_mutation();
create trigger submitted_allocations_immutable_update before update on public.spending_request_department_allocations
  for each row execute function public.prevent_submitted_revision_child_mutation();
create trigger submitted_allocations_immutable_delete before delete on public.spending_request_department_allocations
  for each row execute function public.prevent_submitted_revision_child_mutation();
create trigger submitted_components_immutable_update before update on public.request_components
  for each row execute function public.prevent_submitted_revision_child_mutation();
create trigger submitted_components_immutable_delete before delete on public.request_components
  for each row execute function public.prevent_submitted_revision_child_mutation();

create or replace function public.insert_request_allocations(
  p_event_id uuid,
  p_revision_id uuid,
  p_allocations jsonb
) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb; dep_id uuid; net_minor bigint; vat_minor bigint; gross_minor bigint;
begin
  if jsonb_typeof(coalesce(p_allocations,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_allocations,'[]'::jsonb)) = 0 then
    raise exception 'At least one department allocation is required';
  end if;
  for item in select value from jsonb_array_elements(coalesce(p_allocations,'[]'::jsonb)) loop
    dep_id := (item->>'department_id')::uuid;
    net_minor := (item->>'net_minor')::bigint;
    vat_minor := (item->>'vat_minor')::bigint;
    gross_minor := (item->>'gross_minor')::bigint;
    if dep_id is null or net_minor is null or vat_minor is null or gross_minor is null
      or net_minor < 0 or vat_minor < 0 or gross_minor < 0 then
      raise exception 'Invalid department allocation';
    end if;
    if net_minor + vat_minor <> gross_minor then raise exception 'Allocation net and VAT must equal gross'; end if;
    if not exists(select 1 from public.departments where id=dep_id and event_id=p_event_id and is_active) then
      raise exception 'Department does not belong to event';
    end if;
    insert into public.spending_request_department_allocations(event_id,revision_id,department_id,net_minor,vat_minor,gross_minor)
      values(p_event_id,p_revision_id,dep_id,net_minor,vat_minor,gross_minor);
  end loop;
end $$;

create or replace function public.insert_request_components(
  p_event_id uuid,
  p_revision_id uuid,
  p_request_code text,
  p_components jsonb
) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb; seq integer; description text; net_minor bigint; vat_minor bigint; gross_minor bigint; expected_date date; supplier text; vat_rate numeric; treatment public.vat_treatment;
begin
  if jsonb_typeof(coalesce(p_components,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_components,'[]'::jsonb)) = 0 then
    raise exception 'At least one component is required';
  end if;
  for item in select value from jsonb_array_elements(coalesce(p_components,'[]'::jsonb)) loop
    seq := (item->>'sequence_number')::integer;
    description := nullif(btrim(coalesce(item->>'description','')),'');
    expected_date := nullif(item->>'expected_payment_date','')::date;
    supplier := nullif(btrim(coalesce(item->>'supplier_name','')),'');
    net_minor := (item->>'net_minor')::bigint;
    vat_minor := (item->>'vat_minor')::bigint;
    gross_minor := (item->>'gross_minor')::bigint;
    vat_rate := nullif(item->>'vat_rate','')::numeric;
    treatment := coalesce(nullif(item->>'vat_treatment','')::public.vat_treatment,'unknown');
    if seq is null or seq <= 0 or description is null or net_minor is null or vat_minor is null or gross_minor is null
      or net_minor < 0 or vat_minor < 0 or gross_minor < 0 then
      raise exception 'Invalid request component';
    end if;
    if net_minor + vat_minor <> gross_minor then raise exception 'Component net and VAT must equal gross'; end if;
    if vat_rate is not null and (vat_rate < 0 or vat_rate > 100) then raise exception 'VAT rate is invalid'; end if;
    insert into public.request_components(event_id,revision_id,sequence_number,code,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment)
      values(p_event_id,p_revision_id,seq,p_request_code||'.'||seq,description,expected_date,supplier,net_minor,vat_minor,gross_minor,vat_rate,treatment);
  end loop;
end $$;

create or replace function public.create_spending_request_draft(
  p_event_id uuid,
  p_primary_department_id uuid,
  p_title text,
  p_description text default null,
  p_business_justification text default null,
  p_supplier_name text default null,
  p_expected_payment_date date default null,
  p_net_minor bigint default 0,
  p_vat_minor bigint default 0,
  p_gross_minor bigint default 0,
  p_vat_rate numeric default null,
  p_vat_treatment public.vat_treatment default 'unknown',
  p_vat_recoverable boolean default null,
  p_allocations jsonb default '[]'::jsonb,
  p_components jsonb default '[]'::jsonb
) returns table(request_id uuid,revision_id uuid,request_code text)
language plpgsql security definer set search_path='' as $$
declare dep public.departments; ev public.events; seq integer; rid uuid:=gen_random_uuid(); vid uuid:=gen_random_uuid(); code text;
begin
  if not public.is_active_event_member(p_event_id) or not public.is_event_writable(p_event_id) then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_title,'')),'') is null then raise exception 'Request title is required'; end if;
  if coalesce(p_net_minor,0) < 0 or coalesce(p_vat_minor,0) < 0 or coalesce(p_gross_minor,0) < 0 then raise exception 'Request amounts cannot be negative'; end if;
  if coalesce(p_net_minor,0)+coalesce(p_vat_minor,0) <> coalesce(p_gross_minor,0) then raise exception 'Request net and VAT must equal gross'; end if;
  if coalesce(p_vat_rate,0) < 0 or coalesce(p_vat_rate,0) > 100 then raise exception 'VAT rate is invalid'; end if;
  select * into strict dep from public.departments where id=p_primary_department_id and event_id=p_event_id and is_active;
  select * into strict ev from public.events where id=p_event_id for update;
  insert into public.department_reference_counters(event_id,department_id,next_request_number) values(p_event_id,dep.id,2)
    on conflict(event_id,department_id) do update set next_request_number=public.department_reference_counters.next_request_number+1,updated_at=now()
    returning next_request_number-1 into seq;
  code := ev.code||'_'||dep.code||'_'||seq;
  insert into public.spending_requests(id,event_id,code,owner_user_id,primary_department_id,current_draft_revision_id)
    values(rid,p_event_id,code,(select auth.uid()),dep.id,vid);
  insert into public.spending_request_revisions(id,event_id,request_id,revision_number,status,title,description,business_justification,supplier_name,expected_payment_date,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment,vat_recoverable,created_by)
    values(vid,p_event_id,rid,1,'draft',btrim(p_title),nullif(btrim(coalesce(p_description,'')),''),nullif(btrim(coalesce(p_business_justification,'')),''),nullif(btrim(coalesce(p_supplier_name,'')),''),p_expected_payment_date,coalesce(p_net_minor,0),coalesce(p_vat_minor,0),coalesce(p_gross_minor,0),p_vat_rate,p_vat_treatment,p_vat_recoverable,(select auth.uid()));
  perform public.insert_request_allocations(p_event_id,vid,p_allocations);
  perform public.insert_request_components(p_event_id,vid,code,p_components);
  perform public.assert_revision_balanced(vid);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,visibility)
    values(p_event_id,(select auth.uid()),'request.created','spending_request',rid,'Spending request '||code||' created','private_owner');
  return query select rid,vid,code;
end $$;

create or replace function public.update_spending_request_draft(
  p_request_id uuid,
  p_primary_department_id uuid,
  p_title text,
  p_description text default null,
  p_business_justification text default null,
  p_supplier_name text default null,
  p_expected_payment_date date default null,
  p_net_minor bigint default 0,
  p_vat_minor bigint default 0,
  p_gross_minor bigint default 0,
  p_vat_rate numeric default null,
  p_vat_treatment public.vat_treatment default 'unknown',
  p_vat_recoverable boolean default null,
  p_allocations jsonb default '[]'::jsonb,
  p_components jsonb default '[]'::jsonb
) returns void
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; v public.spending_request_revisions;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if r.owner_user_id <> (select auth.uid()) or r.approval_status <> 'draft' or r.current_draft_revision_id is null or not public.is_event_writable(r.event_id) then
    raise exception 'Not authorised or not draft';
  end if;
  select * into strict v from public.spending_request_revisions where id=r.current_draft_revision_id and request_id=r.id for update;
  if v.status <> 'draft' then raise exception 'Revision is not editable'; end if;
  if nullif(btrim(coalesce(p_title,'')),'') is null then raise exception 'Request title is required'; end if;
  if coalesce(p_net_minor,0) < 0 or coalesce(p_vat_minor,0) < 0 or coalesce(p_gross_minor,0) < 0 then raise exception 'Request amounts cannot be negative'; end if;
  if coalesce(p_net_minor,0)+coalesce(p_vat_minor,0) <> coalesce(p_gross_minor,0) then raise exception 'Request net and VAT must equal gross'; end if;
  if coalesce(p_vat_rate,0) < 0 or coalesce(p_vat_rate,0) > 100 then raise exception 'VAT rate is invalid'; end if;
  if not exists(select 1 from public.departments where id=p_primary_department_id and event_id=r.event_id and is_active) then
    raise exception 'Department does not belong to event';
  end if;
  update public.spending_requests set primary_department_id=p_primary_department_id where id=r.id;
  update public.spending_request_revisions
    set title=btrim(p_title),
      description=nullif(btrim(coalesce(p_description,'')),''),
      business_justification=nullif(btrim(coalesce(p_business_justification,'')),''),
      supplier_name=nullif(btrim(coalesce(p_supplier_name,'')),''),
      expected_payment_date=p_expected_payment_date,
      net_minor=coalesce(p_net_minor,0),
      vat_minor=coalesce(p_vat_minor,0),
      gross_minor=coalesce(p_gross_minor,0),
      vat_rate=p_vat_rate,
      vat_treatment=p_vat_treatment,
      vat_recoverable=p_vat_recoverable
    where id=v.id;
  delete from public.spending_request_department_allocations where revision_id=v.id;
  delete from public.request_components where revision_id=v.id;
  perform public.insert_request_allocations(r.event_id,v.id,p_allocations);
  perform public.insert_request_components(r.event_id,v.id,r.code,p_components);
  perform public.assert_revision_balanced(v.id);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,visibility)
    values(r.event_id,(select auth.uid()),'request.updated','spending_request',r.id,'Spending request '||r.code||' draft updated','private_owner');
end $$;

create or replace function public.submit_spending_request(p_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; v public.spending_request_revisions;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if r.owner_user_id<>(select auth.uid()) or not public.is_event_writable(r.event_id) then raise exception 'Not authorised'; end if;
  if r.approval_status <> 'draft' or r.current_draft_revision_id is null then raise exception 'Request is not editable'; end if;
  select * into strict v from public.spending_request_revisions where id=r.current_draft_revision_id and request_id=r.id for update;
  if v.status<>'draft' then raise exception 'Revision is not editable'; end if;
  perform public.assert_revision_balanced(v.id);
  if v.revision_number>1 and nullif(btrim(v.change_summary),'') is null then raise exception 'Variation change summary required'; end if;
  update public.spending_request_revisions set status='submitted',submitted_at=now() where id=v.id;
  update public.spending_requests set approval_status=case when current_approved_revision_id is null
      then 'submitted'::public.request_approval_status
      else 'variation_pending'::public.request_approval_status
    end,
    submitted_at=now(),current_draft_revision_id=null where id=r.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(r.event_id,(select auth.uid()),'request.submitted','spending_request',r.id,'Spending request '||r.code||' submitted');
end $$;

create or replace view public.v_spending_request_current_revisions with (security_invoker=true) as
select
  r.id request_id,
  r.event_id,
  r.code,
  r.owner_user_id,
  r.primary_department_id,
  d.name primary_department_name,
  d.code primary_department_code,
  r.approval_status,
  r.current_draft_revision_id,
  r.current_approved_revision_id,
  r.submitted_at request_submitted_at,
  r.created_at request_created_at,
  r.updated_at request_updated_at,
  v.id revision_id,
  v.revision_number,
  v.status revision_status,
  v.title,
  v.description,
  v.business_justification,
  v.supplier_name,
  v.expected_payment_date,
  v.net_minor,
  v.vat_minor,
  v.gross_minor,
  v.vat_rate,
  v.vat_treatment,
  v.vat_recoverable,
  v.submitted_at revision_submitted_at,
  v.created_at revision_created_at,
  v.updated_at revision_updated_at,
  p.display_name owner_display_name,
  p.preferred_name owner_preferred_name,
  public.is_request_owner(r.id) can_edit_draft
from public.spending_requests r
join lateral (
  select *
  from public.spending_request_revisions rv
  where rv.request_id=r.id
    and rv.id=coalesce(r.current_draft_revision_id,r.current_approved_revision_id,rv.id)
  order by
    case when rv.id=r.current_draft_revision_id then 0 when rv.id=r.current_approved_revision_id then 1 else 2 end,
    rv.revision_number desc
  limit 1
) v on true
join public.departments d on d.id=r.primary_department_id
join public.profiles p on p.id=r.owner_user_id;

create index if not exists request_allocations_revision_idx on public.spending_request_department_allocations(revision_id);
create index if not exists request_components_revision_only_idx on public.request_components(revision_id);

grant select on public.v_spending_request_current_revisions to authenticated;
grant execute on function
  public.create_spending_request_draft(uuid,uuid,text,text,text,text,date,bigint,bigint,bigint,numeric,public.vat_treatment,boolean,jsonb,jsonb),
  public.update_spending_request_draft(uuid,uuid,text,text,text,text,date,bigint,bigint,bigint,numeric,public.vat_treatment,boolean,jsonb,jsonb),
  public.insert_request_allocations(uuid,uuid,jsonb),
  public.insert_request_components(uuid,uuid,text,jsonb)
to authenticated;

commit;
