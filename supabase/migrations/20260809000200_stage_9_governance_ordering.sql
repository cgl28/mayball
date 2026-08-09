begin;

create or replace function public.standard_department_display_order(p_code text)
returns smallint
language sql immutable set search_path='' as $$
  select case public.normalise_event_code(p_code)
    when 'AE' then 1::smallint
    when 'DR' then 2::smallint
    when 'FOOD' then 3::smallint
    when 'GR' then 4::smallint
    when 'INS' then 5::smallint
    when 'LA' then 6::smallint
    when 'LAW' then 7::smallint
    when 'LOG' then 8::smallint
    when 'ME' then 9::smallint
    when 'NME' then 10::smallint
    when 'PER' then 11::smallint
    when 'PROD' then 12::smallint
    when 'SEC' then 13::smallint
    when 'TIX' then 14::smallint
    when 'WEB' then 15::smallint
    when 'WEL' then 16::smallint
    else null::smallint
  end
$$;

create or replace function public.next_custom_department_display_order(p_event_id uuid)
returns smallint
language plpgsql security definer set search_path='' as $$
declare
  next_order integer;
begin
  select greatest(coalesce(max(display_order), 16), 16) + 1
    into next_order
    from public.departments
    where event_id = p_event_id;

  if next_order > 32767 then
    raise exception 'Department order is exhausted';
  end if;

  return next_order::smallint;
end $$;

create or replace function public.assert_event_retains_active_president(
  p_event_id uuid,
  p_excluding_event_member_id uuid default null
) returns void
language plpgsql security definer set search_path='' as $$
declare
  active_president_count integer;
begin
  perform 1 from public.events where id = p_event_id for update;

  select count(*) into active_president_count
  from public.event_members m
  join public.event_member_roles r
    on r.event_id = m.event_id
   and r.event_member_id = m.id
  where m.event_id = p_event_id
    and m.status = 'active'
    and r.role = 'president'
    and (p_excluding_event_member_id is null or m.id <> p_excluding_event_member_id);

  if active_president_count < 1 then
    raise exception 'Every event must retain at least one active President. Assign another President before removing this role.';
  end if;
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
declare
  ev public.events;
  dep_id uuid := gen_random_uuid();
  dep_code text := public.normalise_event_code(p_code);
  resolved_order smallint;
begin
  ev := public.assert_president_can_manage_event(p_event_id);
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Department name is required'; end if;
  if dep_code !~ '^[A-Z][A-Z0-9]{0,7}$' then raise exception 'Invalid department code'; end if;

  resolved_order := coalesce(
    public.standard_department_display_order(dep_code),
    public.next_custom_department_display_order(ev.id)
  );

  insert into public.departments(id,event_id,name,code,colour,description,display_order,created_by)
    values(dep_id,ev.id,btrim(p_name),dep_code,nullif(btrim(coalesce(p_colour,'')),''),nullif(btrim(coalesce(p_description,'')),''),resolved_order,(select auth.uid()));
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
declare
  dep public.departments;
  dep_code text := public.normalise_event_code(p_code);
begin
  select * into strict dep from public.departments where id=p_department_id for update;
  perform public.assert_president_can_manage_event(dep.event_id);
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Department name is required'; end if;
  if dep_code !~ '^[A-Z][A-Z0-9]{0,7}$' then raise exception 'Invalid department code'; end if;
  update public.departments
    set name=btrim(p_name),
        code=dep_code,
        colour=nullif(btrim(coalesce(p_colour,'')),''),
        description=nullif(btrim(coalesce(p_description,'')),''),
        display_order=dep.display_order,
        is_active=coalesce(p_is_active,true)
    where id=dep.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(dep.event_id,(select auth.uid()),'department.updated','department',dep.id,'Department updated');
exception
  when unique_violation then raise exception 'Department code or name already exists';
end $$;

create or replace function public.remove_event_role(
  p_event_member_id uuid,
  p_role public.event_role
) returns void
language plpgsql security definer set search_path='' as $$
declare
  em public.event_members;
begin
  select * into strict em from public.event_members where id=p_event_member_id for update;
  perform public.assert_president_can_manage_event(em.event_id);
  if p_role='president' and em.status='active' then
    perform public.assert_event_retains_active_president(em.event_id, em.id);
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
declare
  em public.event_members;
begin
  select * into strict em from public.event_members where id=p_event_member_id for update;
  perform public.assert_president_can_manage_event(em.event_id);
  if em.status='active'
     and p_status in ('suspended','left','removed')
     and exists(select 1 from public.event_member_roles where event_id=em.event_id and event_member_id=em.id and role='president') then
    perform public.assert_event_retains_active_president(em.event_id, em.id);
  end if;
  update public.event_members
    set status=p_status, left_at=case when p_status in ('left','removed') then now() else null end
    where id=em.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(em.event_id,(select auth.uid()),'member.status_changed','event_member',em.id,'Member status changed');
end $$;

revoke execute on function public.next_custom_department_display_order(uuid) from public;
revoke execute on function public.assert_event_retains_active_president(uuid,uuid) from public;

grant execute on function
  public.create_department(uuid,text,text,text,text,smallint),
  public.update_department(uuid,text,text,text,text,smallint,boolean),
  public.assign_event_role(uuid,public.event_role),
  public.remove_event_role(uuid,public.event_role),
  public.update_event_member_status(uuid,public.membership_status)
to authenticated;

commit;
