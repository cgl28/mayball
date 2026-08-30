begin;

do $$ begin
  create type public.event_product_tier as enum ('demo','pro');
exception when duplicate_object then null;
end $$;

alter table public.events
  add column if not exists product_tier public.event_product_tier not null default 'demo',
  add column if not exists pro_activated_at timestamptz,
  add column if not exists chiffre_owner_user_id uuid references public.profiles(id) on delete set null;

alter table public.events
  add constraint events_pro_tier_activation_check
  check ((product_tier = 'demo' and pro_activated_at is null) or product_tier = 'pro') not valid;
alter table public.events validate constraint events_pro_tier_activation_check;

update public.events
  set chiffre_owner_user_id = created_by
  where chiffre_owner_user_id is null;

create or replace function public.default_chiffre_owner() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.chiffre_owner_user_id is null then new.chiffre_owner_user_id := new.created_by; end if;
  return new;
end $$;
drop trigger if exists events_default_chiffre_owner on public.events;
create trigger events_default_chiffre_owner before insert on public.events
for each row execute function public.default_chiffre_owner();

alter table public.profiles
  add column if not exists preferred_organisation_id uuid references public.organisations(id) on delete set null;

create index if not exists events_chiffre_owner_idx on public.events(chiffre_owner_user_id);
create index if not exists organisation_members_user_active_idx on public.organisation_members(user_id,organisation_id) where status='active';

create or replace function public.create_organisation(
  p_name text,
  p_slug text,
  p_legal_name text default null
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  organisation_id uuid := gen_random_uuid();
  organisation_slug text := public.normalise_slug(p_slug);
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Organisation name is required'; end if;
  if nullif(organisation_slug,'') is null or organisation_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid organisation slug'; end if;

  insert into public.organisations(id,name,legal_name,slug,created_by)
    values(organisation_id,btrim(p_name),nullif(btrim(coalesce(p_legal_name,'')),''),organisation_slug,actor);
  insert into public.organisation_members(organisation_id,user_id,status)
    values(organisation_id,actor,'active');
  update public.profiles set preferred_organisation_id=organisation_id where id=actor;
  return organisation_id;
exception when unique_violation then
  raise exception 'Organisation already exists';
end $$;

create or replace function public.set_preferred_organisation(p_organisation_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if p_organisation_id is not null and not exists (
    select 1 from public.organisation_members
    where organisation_id=p_organisation_id and user_id=actor and status='active'
  ) then raise exception 'Not authorised'; end if;
  update public.profiles set preferred_organisation_id=p_organisation_id where id=actor;
end $$;

create or replace function public.create_event_for_organisation(
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
  event_id uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
  event_code text := public.normalise_event_code(p_event_code);
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if not exists (select 1 from public.organisation_members where organisation_id=p_organisation_id and user_id=actor and status='active') then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_event_name,'')),'') is null then raise exception 'Event name is required'; end if;
  if event_code !~ '^[A-Z][A-Z0-9]{1,9}$' then raise exception 'Invalid event code'; end if;
  if p_initial_status not in ('setup','planning') then raise exception 'Invalid initial status'; end if;
  if p_planning_start_date is not null and p_event_date is not null and p_planning_start_date > p_event_date then raise exception 'Planning start must not be after event date'; end if;

  insert into public.events(id,organisation_id,name,event_year,event_date,planning_start_date,code,status,created_by,product_tier,chiffre_owner_user_id)
    values(event_id,p_organisation_id,btrim(p_event_name),p_event_year,p_event_date,p_planning_start_date,event_code,p_initial_status,actor,'demo',actor);
  insert into public.event_members(id,event_id,user_id,status) values(member_id,event_id,actor,'active');
  insert into public.event_member_roles(event_id,event_member_id,role,assigned_by) values(event_id,member_id,'president',actor);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(event_id,actor,'event.created','event',event_id,'Event created');
  return event_id;
exception when unique_violation then raise exception 'Event already exists';
end $$;

create or replace function public.create_organisation_and_event(
  p_organisation_name text, p_organisation_slug text, p_event_name text, p_event_code text,
  p_event_year smallint, p_event_date date default null, p_planning_start_date date default null,
  p_legal_name text default null, p_initial_status public.event_status default 'setup', p_assign_treasurer boolean default false
) returns table(organisation_id uuid,event_id uuid)
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); org_id uuid := gen_random_uuid(); ev_id uuid := gen_random_uuid(); member_id uuid := gen_random_uuid(); org_slug text := public.normalise_slug(p_organisation_slug); ev_code text := public.normalise_event_code(p_event_code);
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_organisation_name,'')),'') is null then raise exception 'Organisation name is required'; end if;
  if nullif(org_slug,'') is null or org_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid organisation slug'; end if;
  if nullif(btrim(coalesce(p_event_name,'')),'') is null then raise exception 'Event name is required'; end if;
  if ev_code !~ '^[A-Z][A-Z0-9]{1,9}$' then raise exception 'Invalid event code'; end if;
  if p_initial_status not in ('setup','planning') then raise exception 'Invalid initial status'; end if;
  if p_planning_start_date is not null and p_event_date is not null and p_planning_start_date > p_event_date then raise exception 'Planning start must not be after event date'; end if;
  insert into public.organisations(id,name,legal_name,slug,created_by) values(org_id,btrim(p_organisation_name),nullif(btrim(coalesce(p_legal_name,'')),''),org_slug,actor);
  insert into public.organisation_members(organisation_id,user_id,status) values(org_id,actor,'active');
  update public.profiles set preferred_organisation_id=coalesce(preferred_organisation_id,org_id) where id=actor;
  insert into public.events(id,organisation_id,name,event_year,event_date,planning_start_date,code,status,created_by,product_tier,chiffre_owner_user_id) values(ev_id,org_id,btrim(p_event_name),p_event_year,p_event_date,p_planning_start_date,ev_code,p_initial_status,actor,'demo',actor);
  insert into public.event_members(id,event_id,user_id,status) values(member_id,ev_id,actor,'active');
  insert into public.event_member_roles(event_id,event_member_id,role,assigned_by) values(ev_id,member_id,'president',actor);
  if p_assign_treasurer then insert into public.event_member_roles(event_id,event_member_id,role,assigned_by) values(ev_id,member_id,'treasurer',actor); end if;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(ev_id,actor,'event.created','event',ev_id,'Organisation and event created');
  return query select org_id,ev_id;
exception when unique_violation then raise exception 'Organisation or event already exists'; end $$;

create or replace function public.create_recurring_event(
  p_organisation_id uuid, p_event_name text, p_event_code text, p_event_year smallint,
  p_event_date date default null, p_planning_start_date date default null, p_initial_status public.event_status default 'setup'
) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); ev_id uuid := gen_random_uuid(); member_id uuid := gen_random_uuid(); ev_code text := public.normalise_event_code(p_event_code);
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if not exists(select 1 from public.events e join public.event_members em on em.event_id=e.id and em.user_id=actor and em.status='active' join public.event_member_roles r on r.event_id=em.event_id and r.event_member_id=em.id and r.role='president' where e.organisation_id=p_organisation_id and e.status not in ('completed','archived')) then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_event_name,'')),'') is null then raise exception 'Event name is required'; end if;
  if ev_code !~ '^[A-Z][A-Z0-9]{1,9}$' then raise exception 'Invalid event code'; end if;
  if p_initial_status not in ('setup','planning') then raise exception 'Invalid initial status'; end if;
  if p_planning_start_date is not null and p_event_date is not null and p_planning_start_date > p_event_date then raise exception 'Planning start must not be after event date'; end if;
  insert into public.events(id,organisation_id,name,event_year,event_date,planning_start_date,code,status,created_by,product_tier,chiffre_owner_user_id) values(ev_id,p_organisation_id,btrim(p_event_name),p_event_year,p_event_date,p_planning_start_date,ev_code,p_initial_status,actor,'demo',actor);
  insert into public.event_members(id,event_id,user_id,status) values(member_id,ev_id,actor,'active');
  insert into public.event_member_roles(event_id,event_member_id,role,assigned_by) values(ev_id,member_id,'president',actor);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(ev_id,actor,'event.created','event',ev_id,'Recurring event created'); return ev_id;
exception when unique_violation then raise exception 'Event already exists'; end $$;

create or replace function public.update_event_organisation(p_event_id uuid,p_organisation_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.events; actor uuid := (select auth.uid());
begin
  ev := public.assert_president_can_manage_event(p_event_id);
  if not exists (select 1 from public.organisation_members where organisation_id=p_organisation_id and user_id=actor and status='active') then raise exception 'Choose an organisation you are associated with'; end if;
  update public.events set organisation_id=p_organisation_id where id=ev.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(ev.id,actor,'event.organisation_updated','event',ev.id,'Event organisation updated');
end $$;

drop policy if exists organisations_select on public.organisations;
create policy organisations_select on public.organisations for select to authenticated using(
  exists(select 1 from public.organisation_members om where om.organisation_id=id and om.user_id=(select auth.uid()) and om.status='active')
  or exists(select 1 from public.events e where e.organisation_id=id and public.can_view_event(e.id))
);
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using(
  id=(select auth.uid())
  or exists(select 1 from public.event_members a join public.event_members b on b.event_id=a.event_id where a.user_id=(select auth.uid()) and a.status='active' and b.user_id=profiles.id and b.status='active')
  or exists(select 1 from public.events e where e.chiffre_owner_user_id=profiles.id and public.can_view_event(e.id))
);

grant execute on function
  public.create_organisation(text,text,text),
  public.set_preferred_organisation(uuid),
  public.create_event_for_organisation(uuid,text,text,smallint,date,date,public.event_status),
  public.update_event_organisation(uuid,uuid)
to authenticated;

commit;
