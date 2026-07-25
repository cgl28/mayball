begin;

create or replace function public.issue_invitation(
  p_event_id uuid,
  p_email text,
  p_roles public.event_role[] default array['committee_member']::public.event_role[],
  p_department_ids uuid[] default array[]::uuid[],
  p_expires_in_days integer default 14
) returns table(invitation_id uuid, invitation_token text)
language plpgsql security definer set search_path='' as $$
declare
  ev public.events;
  inv_id uuid := gen_random_uuid();
  raw_token text := encode(extensions.gen_random_bytes(32),'hex');
  email_norm extensions.citext := public.normalise_email(p_email);
  role_value public.event_role;
  dep_id uuid;
begin
  ev := public.assert_president_can_manage_event(p_event_id);
  if email_norm::text !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email address'; end if;
  if p_expires_in_days is null or p_expires_in_days < 1 or p_expires_in_days > 90 then raise exception 'Invalid expiry'; end if;
  if exists(select 1 from public.invitations where event_id=ev.id and email=email_norm and status='pending') then raise exception 'Pending invitation already exists'; end if;

  insert into public.invitations(id,organisation_id,event_id,email,token_hash,expires_at,invited_by)
    values(inv_id,ev.organisation_id,ev.id,email_norm,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+make_interval(days=>p_expires_in_days),(select auth.uid()));

  foreach role_value in array coalesce(p_roles,array['committee_member']::public.event_role[]) loop
    insert into public.invitation_roles(invitation_id,role) values(inv_id,role_value) on conflict do nothing;
  end loop;
  if not exists(select 1 from public.invitation_roles where invitation_id=inv_id) then
    insert into public.invitation_roles(invitation_id,role) values(inv_id,'committee_member');
  end if;

  foreach dep_id in array coalesce(p_department_ids,array[]::uuid[]) loop
    if not exists(select 1 from public.departments where id=dep_id and event_id=ev.id) then
      raise exception 'Department does not belong to event';
    end if;
    insert into public.invitation_departments(invitation_id,event_id,department_id) values(inv_id,ev.id,dep_id) on conflict do nothing;
  end loop;

  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(ev.id,(select auth.uid()),'invitation.issued','invitation',inv_id,'Invitation created for '||email_norm::text);
  return query select inv_id,raw_token;
end $$;

create or replace function public.accept_invitation(p_raw_token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  actor_email extensions.citext;
  inv public.invitations;
  org_member_id uuid;
  event_member_id uuid;
  role_value public.event_role;
  dep record;
begin
  if actor is null then raise exception 'Not authorised'; end if;
  select public.normalise_email(email) into actor_email from auth.users where id=actor;
  if actor_email is null then raise exception 'Authenticated email required'; end if;

  select * into strict inv
    from public.invitations
    where token_hash=encode(extensions.digest(coalesce(p_raw_token,''),'sha256'),'hex')
    for update;

  if inv.status='accepted' and inv.accepted_by=actor then
    return inv.event_id;
  end if;
  if inv.status <> 'pending' then raise exception 'Invitation is not pending'; end if;
  if inv.expires_at <= now() then
    update public.invitations set status='expired' where id=inv.id;
    raise exception 'Invitation has expired';
  end if;
  if inv.email <> actor_email then raise exception 'Invitation email does not match signed-in user'; end if;
  if not exists(select 1 from public.events where id=inv.event_id and status not in ('completed','archived')) then raise exception 'Event is not accepting invitations'; end if;

  insert into public.organisation_members(organisation_id,user_id,status)
    values(inv.organisation_id,actor,'active')
    on conflict(organisation_id,user_id) do update set status='active',left_at=null,updated_at=now()
    returning id into org_member_id;
  insert into public.event_members(event_id,user_id,status,invited_by)
    values(inv.event_id,actor,'active',inv.invited_by)
    on conflict(event_id,user_id) do update set status='active',left_at=null,updated_at=now()
    returning id into event_member_id;

  for role_value in select role from public.invitation_roles where invitation_id=inv.id loop
    insert into public.event_member_roles(event_id,event_member_id,role,assigned_by)
      values(inv.event_id,event_member_id,role_value,inv.invited_by)
      on conflict do nothing;
  end loop;
  for dep in select department_id from public.invitation_departments where invitation_id=inv.id loop
    insert into public.department_members(event_id,department_id,event_member_id,assigned_by)
      values(inv.event_id,dep.department_id,event_member_id,inv.invited_by)
      on conflict do nothing;
  end loop;

  update public.invitations set status='accepted',accepted_by=actor,accepted_at=now() where id=inv.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(inv.event_id,actor,'invitation.accepted','invitation',inv.id,'Invitation accepted');
  return inv.event_id;
exception
  when no_data_found then raise exception 'Invitation is invalid';
end $$;

commit;
