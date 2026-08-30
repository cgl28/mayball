begin;

-- The former unqualified `id` references resolved inside the policy's
-- subqueries, hiding organisations even when the actor had valid access.
drop policy if exists organisations_select on public.organisations;
create policy organisations_select on public.organisations for select to authenticated using(
  exists(
    select 1 from public.organisation_members om
    where om.organisation_id=organisations.id
      and om.user_id=(select auth.uid())
      and om.status='active'
  )
  or exists(
    select 1 from public.events e
    where e.organisation_id=organisations.id
      and public.can_view_event(e.id)
  )
);

create or replace function public.normalise_document_extension(p_mime_type text)
returns text language sql immutable set search_path='' as $$
  select case p_mime_type
    when 'application/pdf' then 'pdf'
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then 'docx'
    when 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' then 'xlsx'
    when 'application/vnd.ms-excel' then 'xls'
    else null
  end
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'event-documents',
  'event-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

commit;
