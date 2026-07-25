begin;

create or replace function public.normalise_event_code(p_code text) returns text
language sql immutable set search_path='' as $$
  select upper(regexp_replace(btrim(coalesce(p_code,'')), '\s+', '', 'g'))
$$;

create or replace function public.normalise_slug(p_slug text) returns text
language sql immutable set search_path='' as $$
  select regexp_replace(regexp_replace(lower(btrim(coalesce(p_slug,''))), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
$$;

create or replace function public.normalise_email(p_email text) returns extensions.citext
language sql immutable set search_path='' as $$
  select lower(btrim(coalesce(p_email,'')))::extensions.citext
$$;

create or replace function public.assert_president_can_manage_event(p_event_id uuid) returns public.events
language plpgsql security definer set search_path='' as $$
declare ev public.events;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authorised';
  end if;

  select * into strict ev from public.events where id=p_event_id for update;
  if not public.is_event_president(p_event_id) or not public.is_event_writable(p_event_id) then
    raise exception 'Not authorised';
  end if;
  return ev;
end $$;

create or replace function public.create_organisation_and_event(
  p_organisation_name text,
  p_organisation_slug text,
  p_event_name text,
  p_event_code text,
  p_event_year smallint,
  p_event_date date default null,
  p_planning_start_date date default null,
  p_legal_name text default null,
  p_initial_status public.event_status default 'setup',
  p_assign_treasurer boolean default false
) returns table(organisation_id uuid,event_id uuid)
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  org_id uuid := gen_random_uuid();
  ev_id uuid := gen_random_uuid();
  org_slug text := public.normalise_slug(p_organisation_slug);
  ev_code text := public.normalise_event_code(p_event_code);
  member_id uuid := gen_random_uuid();
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_organisation_name,'')),'') is null then raise exception 'Organisation name is required'; end if;
  if nullif(org_slug,'') is null or org_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid organisation slug'; end if;
  if nullif(btrim(coalesce(p_event_name,'')),'') is null then raise exception 'Event name is required'; end if;
  if ev_code !~ '^[A-Z][A-Z0-9]{1,9}$' then raise exception 'Invalid event code'; end if;
  if p_initial_status not in ('setup','planning') then raise exception 'Invalid initial status'; end if;
  if p_planning_start_date is not null and p_event_date is not null and p_planning_start_date > p_event_date then raise exception 'Planning start must not be after event date'; end if;

  insert into public.organisations(id,name,legal_name,slug,created_by)
    values(org_id,btrim(p_organisation_name),nullif(btrim(coalesce(p_legal_name,'')),''),org_slug,actor);
  insert into public.organisation_members(organisation_id,user_id,status)
    values(org_id,actor,'active');
  insert into public.events(id,organisation_id,name,event_year,event_date,planning_start_date,code,status,created_by)
    values(ev_id,org_id,btrim(p_event_name),p_event_year,p_event_date,p_planning_start_date,ev_code,p_initial_status,actor);
  insert into public.event_members(id,event_id,user_id,status)
    values(member_id,ev_id,actor,'active');
  insert into public.event_member_roles(event_id,event_member_id,role,assigned_by)
    values(ev_id,member_id,'president',actor);
  if p_assign_treasurer then
    insert into public.event_member_roles(event_id,event_member_id,role,assigned_by)
      values(ev_id,member_id,'treasurer',actor);
  end if;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(ev_id,actor,'event.created','event',ev_id,'Organisation and event created');

  return query select org_id,ev_id;
exception
  when unique_violation then
    raise exception 'Organisation or event already exists';
end $$;

create or replace function public.create_recurring_event(
  p_organisation_id uuid,
  p_event_name text,
  p_event_code text,
  p_event_year smallint,
  p_event_date date default null,
  p_planning_start_date date default null,
  p_initial_status public.event_status default 'setup'
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  ev_id uuid := gen_random_uuid();
  ev_code text := public.normalise_event_code(p_event_code);
  member_id uuid := gen_random_uuid();
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if not exists (
    select 1
    from public.events e
    join public.event_members em on em.event_id=e.id and em.user_id=actor and em.status='active'
    join public.event_member_roles r on r.event_id=em.event_id and r.event_member_id=em.id and r.role='president'
    where e.organisation_id=p_organisation_id and e.status not in ('completed','archived')
  ) then
    raise exception 'Not authorised';
  end if;
  if nullif(btrim(coalesce(p_event_name,'')),'') is null then raise exception 'Event name is required'; end if;
  if ev_code !~ '^[A-Z][A-Z0-9]{1,9}$' then raise exception 'Invalid event code'; end if;
  if p_initial_status not in ('setup','planning') then raise exception 'Invalid initial status'; end if;
  if p_planning_start_date is not null and p_event_date is not null and p_planning_start_date > p_event_date then raise exception 'Planning start must not be after event date'; end if;

  insert into public.events(id,organisation_id,name,event_year,event_date,planning_start_date,code,status,created_by)
    values(ev_id,p_organisation_id,btrim(p_event_name),p_event_year,p_event_date,p_planning_start_date,ev_code,p_initial_status,actor);
  insert into public.event_members(id,event_id,user_id,status)
    values(member_id,ev_id,actor,'active');
  insert into public.event_member_roles(event_id,event_member_id,role,assigned_by)
    values(ev_id,member_id,'president',actor);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(ev_id,actor,'event.created','event',ev_id,'Recurring event created');
  return ev_id;
exception
  when unique_violation then
    raise exception 'Event already exists';
end $$;

create or replace function public.update_event_settings(
  p_event_id uuid,
  p_name text,
  p_code text,
  p_event_year smallint,
  p_event_date date default null,
  p_planning_start_date date default null
) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.events; ev_code text := public.normalise_event_code(p_code);
begin
  ev := public.assert_president_can_manage_event(p_event_id);
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Event name is required'; end if;
  if ev_code !~ '^[A-Z][A-Z0-9]{1,9}$' then raise exception 'Invalid event code'; end if;
  if p_planning_start_date is not null and p_event_date is not null and p_planning_start_date > p_event_date then raise exception 'Planning start must not be after event date'; end if;
  update public.events
    set name=btrim(p_name), code=ev_code, event_year=p_event_year, event_date=p_event_date, planning_start_date=p_planning_start_date
    where id=ev.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(ev.id,(select auth.uid()),'event.settings_updated','event',ev.id,'Event settings updated');
end $$;

create or replace function public.create_department(
  p_event_id uuid,
  p_name text,
  p_code text,
  p_colour text default null,
  p_description text default null,
  p_display_order smallint default 0
) returns uuid
language plpgsql security definer set search_path='' as $$
declare ev public.events; dep_id uuid := gen_random_uuid(); dep_code text := public.normalise_event_code(p_code);
begin
  ev := public.assert_president_can_manage_event(p_event_id);
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Department name is required'; end if;
  if dep_code !~ '^[A-Z][A-Z0-9]{0,7}$' then raise exception 'Invalid department code'; end if;
  insert into public.departments(id,event_id,name,code,colour,description,display_order,created_by)
    values(dep_id,ev.id,btrim(p_name),dep_code,nullif(btrim(coalesce(p_colour,'')),''),nullif(btrim(coalesce(p_description,'')),''),coalesce(p_display_order,0),(select auth.uid()));
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(ev.id,(select auth.uid()),'department.created','department',dep_id,'Department created');
  return dep_id;
exception
  when unique_violation then raise exception 'Department code or name already exists';
end $$;

create or replace function public.update_department(
  p_department_id uuid,
  p_name text,
  p_code text,
  p_colour text default null,
  p_description text default null,
  p_display_order smallint default 0,
  p_is_active boolean default true
) returns void
language plpgsql security definer set search_path='' as $$
declare dep public.departments; dep_code text := public.normalise_event_code(p_code);
begin
  select * into strict dep from public.departments where id=p_department_id for update;
  perform public.assert_president_can_manage_event(dep.event_id);
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Department name is required'; end if;
  if dep_code !~ '^[A-Z][A-Z0-9]{0,7}$' then raise exception 'Invalid department code'; end if;
  update public.departments
    set name=btrim(p_name), code=dep_code, colour=nullif(btrim(coalesce(p_colour,'')),''), description=nullif(btrim(coalesce(p_description,'')),''), display_order=coalesce(p_display_order,0), is_active=coalesce(p_is_active,true)
    where id=dep.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(dep.event_id,(select auth.uid()),'department.updated','department',dep.id,'Department updated');
exception
  when unique_violation then raise exception 'Department code or name already exists';
end $$;

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
  raw_token text := encode(gen_random_bytes(32),'hex');
  email_norm extensions.citext := public.normalise_email(p_email);
  role_value public.event_role;
  dep_id uuid;
begin
  ev := public.assert_president_can_manage_event(p_event_id);
  if email_norm::text !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email address'; end if;
  if p_expires_in_days is null or p_expires_in_days < 1 or p_expires_in_days > 90 then raise exception 'Invalid expiry'; end if;
  if exists(select 1 from public.invitations where event_id=ev.id and email=email_norm and status='pending') then raise exception 'Pending invitation already exists'; end if;

  insert into public.invitations(id,organisation_id,event_id,email,token_hash,expires_at,invited_by)
    values(inv_id,ev.organisation_id,ev.id,email_norm,encode(digest(raw_token,'sha256'),'hex'),now()+make_interval(days=>p_expires_in_days),(select auth.uid()));

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

create or replace function public.revoke_invitation(p_invitation_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare inv public.invitations;
begin
  select * into strict inv from public.invitations where id=p_invitation_id for update;
  perform public.assert_president_can_manage_event(inv.event_id);
  if inv.status <> 'pending' then raise exception 'Invitation is not pending'; end if;
  update public.invitations set status='revoked',revoked_at=now() where id=inv.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(inv.event_id,(select auth.uid()),'invitation.revoked','invitation',inv.id,'Invitation revoked');
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
    where token_hash=encode(digest(coalesce(p_raw_token,''),'sha256'),'hex')
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

create or replace function public.assign_event_role(
  p_event_member_id uuid,
  p_role public.event_role
) returns void
language plpgsql security definer set search_path='' as $$
declare em public.event_members;
begin
  select * into strict em from public.event_members where id=p_event_member_id for update;
  perform public.assert_president_can_manage_event(em.event_id);
  insert into public.event_member_roles(event_id,event_member_id,role,assigned_by)
    values(em.event_id,em.id,p_role,(select auth.uid())) on conflict do nothing;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(em.event_id,(select auth.uid()),'role.assigned','event_member',em.id,'Event role assigned');
end $$;

create or replace function public.remove_event_role(
  p_event_member_id uuid,
  p_role public.event_role
) returns void
language plpgsql security definer set search_path='' as $$
declare em public.event_members; remaining integer;
begin
  select * into strict em from public.event_members where id=p_event_member_id for update;
  perform public.assert_president_can_manage_event(em.event_id);
  if p_role='president' then
    select count(*) into remaining
    from public.event_members m
    join public.event_member_roles r on r.event_id=m.event_id and r.event_member_id=m.id
    where m.event_id=em.event_id and m.status='active' and r.role='president' and m.id<>em.id;
    if remaining=0 then raise exception 'An active event must keep at least one president'; end if;
  end if;
  delete from public.event_member_roles where event_id=em.event_id and event_member_id=em.id and role=p_role;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(em.event_id,(select auth.uid()),'role.removed','event_member',em.id,'Event role removed');
end $$;

create or replace function public.update_event_member_status(
  p_event_member_id uuid,
  p_status public.membership_status
) returns void
language plpgsql security definer set search_path='' as $$
declare em public.event_members; remaining integer;
begin
  select * into strict em from public.event_members where id=p_event_member_id for update;
  perform public.assert_president_can_manage_event(em.event_id);
  if p_status in ('suspended','left','removed') and exists(select 1 from public.event_member_roles where event_id=em.event_id and event_member_id=em.id and role='president') then
    select count(*) into remaining
    from public.event_members m
    join public.event_member_roles r on r.event_id=m.event_id and r.event_member_id=m.id
    where m.event_id=em.event_id and m.status='active' and r.role='president' and m.id<>em.id;
    if remaining=0 then raise exception 'An active event must keep at least one president'; end if;
  end if;
  update public.event_members
    set status=p_status, left_at=case when p_status in ('left','removed') then now() else null end
    where id=em.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(em.event_id,(select auth.uid()),'member.status_changed','event_member',em.id,'Member status changed');
end $$;

create or replace function public.assign_department_member(
  p_event_member_id uuid,
  p_department_id uuid
) returns void
language plpgsql security definer set search_path='' as $$
declare em public.event_members; dep public.departments;
begin
  select * into strict em from public.event_members where id=p_event_member_id;
  select * into strict dep from public.departments where id=p_department_id;
  if em.event_id <> dep.event_id then raise exception 'Department and member must belong to the same event'; end if;
  perform public.assert_president_can_manage_event(em.event_id);
  insert into public.department_members(event_id,department_id,event_member_id,assigned_by)
    values(em.event_id,dep.id,em.id,(select auth.uid())) on conflict do nothing;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(em.event_id,(select auth.uid()),'department_member.assigned','event_member',em.id,'Department membership assigned');
end $$;

create or replace function public.remove_department_member(
  p_event_member_id uuid,
  p_department_id uuid
) returns void
language plpgsql security definer set search_path='' as $$
declare em public.event_members; dep public.departments;
begin
  select * into strict em from public.event_members where id=p_event_member_id;
  select * into strict dep from public.departments where id=p_department_id;
  if em.event_id <> dep.event_id then raise exception 'Department and member must belong to the same event'; end if;
  perform public.assert_president_can_manage_event(em.event_id);
  delete from public.department_members where event_id=em.event_id and event_member_id=em.id and department_id=dep.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(em.event_id,(select auth.uid()),'department_member.removed','event_member',em.id,'Department membership removed');
end $$;

alter table public.invitations add constraint invitations_id_event_id_key unique(id,event_id);
alter table public.invitation_departments
  add constraint invitation_departments_invitation_event_fk
  foreign key(invitation_id,event_id) references public.invitations(id,event_id) on delete cascade;

create index if not exists organisation_members_org_status_idx on public.organisation_members(organisation_id,status);
create index if not exists invitations_email_status_expires_idx on public.invitations(email,status,expires_at);
create index if not exists invitations_event_status_idx on public.invitations(event_id,status,created_at desc);
create index if not exists invitation_departments_event_idx on public.invitation_departments(event_id,department_id);

create policy invitations_president_select on public.invitations for select to authenticated using(public.is_event_president(event_id));
create policy invitation_roles_president_select on public.invitation_roles for select to authenticated using(exists(select 1 from public.invitations i where i.id=invitation_roles.invitation_id and public.is_event_president(i.event_id)));
create policy invitation_departments_president_select on public.invitation_departments for select to authenticated using(public.is_event_president(event_id));

grant execute on function
  public.create_organisation_and_event(text,text,text,text,smallint,date,date,text,public.event_status,boolean),
  public.create_recurring_event(uuid,text,text,smallint,date,date,public.event_status),
  public.update_event_settings(uuid,text,text,smallint,date,date),
  public.create_department(uuid,text,text,text,text,smallint),
  public.update_department(uuid,text,text,text,text,smallint,boolean),
  public.issue_invitation(uuid,text,public.event_role[],uuid[],integer),
  public.revoke_invitation(uuid),
  public.accept_invitation(text),
  public.assign_event_role(uuid,public.event_role),
  public.remove_event_role(uuid,public.event_role),
  public.update_event_member_status(uuid,public.membership_status),
  public.assign_department_member(uuid,uuid),
  public.remove_department_member(uuid,uuid)
to authenticated;

commit;
