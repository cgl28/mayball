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
  if exists(select 1 from public.invitations i where i.event_id=ev.id and i.email=email_norm and i.status='pending') then raise exception 'Pending invitation already exists'; end if;

  insert into public.invitations(id,organisation_id,event_id,email,token_hash,expires_at,invited_by)
    values(inv_id,ev.organisation_id,ev.id,email_norm,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+make_interval(days=>p_expires_in_days),(select auth.uid()));

  foreach role_value in array coalesce(p_roles,array['committee_member']::public.event_role[]) loop
    insert into public.invitation_roles(invitation_id,role) values(inv_id,role_value) on conflict do nothing;
  end loop;
  if not exists(select 1 from public.invitation_roles ir where ir.invitation_id=inv_id) then
    insert into public.invitation_roles(invitation_id,role) values(inv_id,'committee_member');
  end if;

  foreach dep_id in array coalesce(p_department_ids,array[]::uuid[]) loop
    if not exists(select 1 from public.departments d where d.id=dep_id and d.event_id=ev.id) then
      raise exception 'Department does not belong to event';
    end if;
    insert into public.invitation_departments(invitation_id,event_id,department_id) values(inv_id,ev.id,dep_id) on conflict do nothing;
  end loop;

  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(ev.id,(select auth.uid()),'invitation.issued','invitation',inv_id,'Invitation created for '||email_norm::text);
  return query select inv_id,raw_token;
end $$;

commit;
