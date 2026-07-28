begin;

create or replace function public.get_invitation_preview(p_raw_token text)
returns table(
  event_id uuid,
  event_name text,
  event_year smallint,
  event_date date,
  organisation_name text,
  invitation_status public.invitation_status,
  expires_at timestamptz,
  invited_email text,
  roles public.event_role[],
  departments text[],
  already_member boolean
)
language plpgsql
security definer
set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  actor_email extensions.citext;
  inv public.invitations;
begin
  if actor is null then raise exception 'Not authorised'; end if;
  select public.normalise_email(email) into actor_email from auth.users where id=actor;
  if actor_email is null then raise exception 'Authenticated email required'; end if;

  select * into strict inv
    from public.invitations
    where token_hash=encode(extensions.digest(coalesce(p_raw_token,''),'sha256'),'hex')
    for update;

  if inv.expires_at <= now() and inv.status='pending' then
    update public.invitations set status='expired' where id=inv.id;
    raise exception 'Invitation has expired';
  end if;

  if inv.status='accepted' and inv.accepted_by=actor then
    -- Keep going so the caller can present an "already joined" summary.
  elsif inv.status <> 'pending' then
    raise exception 'Invitation is not pending';
  end if;

  if inv.email <> actor_email then
    raise exception 'Invitation email does not match signed-in user';
  end if;

  if not exists(
    select 1 from public.events e
    where e.id=inv.event_id and e.status not in ('completed','archived')
  ) then
    raise exception 'Event is not accepting invitations';
  end if;

  return query
  select
    e.id,
    e.name,
    e.event_year,
    e.event_date,
    o.name,
    inv.status,
    inv.expires_at,
    inv.email::text,
    coalesce(
      array(
        select ir.role
        from public.invitation_roles ir
        where ir.invitation_id=inv.id
        order by ir.role::text
      ),
      array[]::public.event_role[]
    ),
    coalesce(
      array(
        select d.name
        from public.invitation_departments idp
        join public.departments d
          on d.event_id=idp.event_id and d.id=idp.department_id
        where idp.invitation_id=inv.id
        order by d.display_order, d.name
      ),
      array[]::text[]
    ),
    exists(
      select 1
      from public.event_members em
      where em.event_id=inv.event_id
        and em.user_id=actor
        and em.status='active'
    )
  from public.events e
  join public.organisations o on o.id=e.organisation_id
  where e.id=inv.event_id;
exception
  when no_data_found then raise exception 'Invitation is invalid';
end $$;

revoke execute on function public.get_invitation_preview(text) from public, anon;
grant execute on function public.get_invitation_preview(text) to authenticated;

commit;
