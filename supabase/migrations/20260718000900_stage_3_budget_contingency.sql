begin;

create or replace function public.prevent_budget_transfer_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Budget transfers are append-only';
end $$;

drop trigger if exists budget_transfers_append_only_update on public.budget_transfers;
drop trigger if exists budget_transfers_append_only_delete on public.budget_transfers;
create trigger budget_transfers_append_only_update before update on public.budget_transfers
  for each row execute function public.prevent_budget_transfer_mutation();
create trigger budget_transfers_append_only_delete before delete on public.budget_transfers
  for each row execute function public.prevent_budget_transfer_mutation();

create or replace function public.assert_budget_editable(p_budget_version_id uuid) returns public.budget_versions
language plpgsql security definer set search_path='' as $$
declare b public.budget_versions;
begin
  select * into strict b from public.budget_versions where id=p_budget_version_id for update;
  if not public.is_event_treasurer(b.event_id) or not public.is_event_writable(b.event_id) or b.status <> 'draft' then
    raise exception 'Not authorised or not draft';
  end if;
  return b;
end $$;

create or replace function public.insert_budget_allocations(
  p_event_id uuid,
  p_budget_version_id uuid,
  p_allocations jsonb
) returns void
language plpgsql security definer set search_path='' as $$
declare allocation jsonb; dep_id uuid; net_minor bigint; gross_minor bigint;
begin
  if jsonb_typeof(coalesce(p_allocations,'[]'::jsonb)) <> 'array' then
    raise exception 'Invalid allocations';
  end if;

  for allocation in select value from jsonb_array_elements(coalesce(p_allocations,'[]'::jsonb)) loop
    dep_id := (allocation->>'department_id')::uuid;
    net_minor := (allocation->>'original_net_minor')::bigint;
    gross_minor := nullif(allocation->>'original_gross_minor','')::bigint;
    if dep_id is null or net_minor is null or net_minor < 0 or (gross_minor is not null and gross_minor < 0) then
      raise exception 'Invalid allocation amount';
    end if;
    if not exists(select 1 from public.departments d where d.id=dep_id and d.event_id=p_event_id) then
      raise exception 'Department does not belong to event';
    end if;
    insert into public.department_budget_allocations(event_id,budget_version_id,department_id,original_net_minor,original_gross_minor)
      values(p_event_id,p_budget_version_id,dep_id,net_minor,gross_minor);
  end loop;
end $$;

create or replace function public.create_budget_version(
  p_event_id uuid,
  p_name text,
  p_effective_date date default null,
  p_notes text default null,
  p_original_contingency_minor bigint default 0,
  p_allocations jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path='' as $$
declare version_id uuid := gen_random_uuid(); next_version integer;
begin
  if not public.is_event_treasurer(p_event_id) or not public.is_event_writable(p_event_id) then
    raise exception 'Not authorised';
  end if;
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Budget name is required'; end if;
  if coalesce(p_original_contingency_minor,0) < 0 then raise exception 'Contingency cannot be negative'; end if;

  perform 1 from public.events where id=p_event_id for update;
  select coalesce(max(version_number),0)+1 into next_version from public.budget_versions where event_id=p_event_id;
  insert into public.budget_versions(id,event_id,version_number,name,status,effective_date,original_contingency_minor,notes,created_by)
    values(version_id,p_event_id,next_version,btrim(p_name),'draft',p_effective_date,coalesce(p_original_contingency_minor,0),nullif(btrim(coalesce(p_notes,'')),''),(select auth.uid()));
  perform public.insert_budget_allocations(p_event_id,version_id,p_allocations);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(p_event_id,(select auth.uid()),'budget.created','budget_version',version_id,'Draft budget version created');
  return version_id;
end $$;

create or replace function public.update_draft_budget_version(
  p_budget_version_id uuid,
  p_name text,
  p_effective_date date default null,
  p_notes text default null,
  p_original_contingency_minor bigint default 0,
  p_allocations jsonb default '[]'::jsonb
) returns void
language plpgsql security definer set search_path='' as $$
declare b public.budget_versions;
begin
  b := public.assert_budget_editable(p_budget_version_id);
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Budget name is required'; end if;
  if coalesce(p_original_contingency_minor,0) < 0 then raise exception 'Contingency cannot be negative'; end if;

  update public.budget_versions
    set name=btrim(p_name), effective_date=p_effective_date, notes=nullif(btrim(coalesce(p_notes,'')),''), original_contingency_minor=coalesce(p_original_contingency_minor,0)
    where id=b.id;
  delete from public.department_budget_allocations where budget_version_id=b.id;
  perform public.insert_budget_allocations(b.event_id,b.id,p_allocations);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(b.event_id,(select auth.uid()),'budget.updated','budget_version',b.id,'Draft budget version updated');
end $$;

create or replace function public.activate_budget_version(p_budget_version_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare b public.budget_versions; allocation_count integer;
begin
  select * into strict b from public.budget_versions where id=p_budget_version_id for update;
  if not public.is_event_treasurer(b.event_id) or not public.is_event_writable(b.event_id) or b.status <> 'draft' then
    raise exception 'Not authorised or not draft';
  end if;
  perform 1 from public.events where id=b.event_id for update;
  perform 1 from public.budget_versions where event_id=b.event_id for update;
  select count(*) into allocation_count from public.department_budget_allocations where budget_version_id=b.id;
  if allocation_count = 0 then raise exception 'Budget must contain at least one allocation'; end if;

  update public.budget_versions set status='superseded' where event_id=b.event_id and status='active';
  update public.budget_versions
    set status='active', effective_date=coalesce(effective_date,current_date), activated_by=(select auth.uid()), activated_at=now()
    where id=b.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(b.event_id,(select auth.uid()),'budget.activated','budget_version',b.id,'Budget version activated');
end $$;

create or replace function public.transfer_event_contingency(
  p_event_id uuid,
  p_department_id uuid,
  p_amount_minor bigint,
  p_reason text
) returns uuid
language plpgsql security definer set search_path='' as $$
declare b public.budget_versions; available bigint; tid uuid := gen_random_uuid();
begin
  if not public.is_event_treasurer(p_event_id) or not public.is_event_writable(p_event_id) then raise exception 'Not authorised'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'Transfer amount must be positive'; end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Transfer reason is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text,0));
  select * into strict b from public.budget_versions where event_id=p_event_id and status='active' for update;
  if not exists(select 1 from public.departments where id=p_department_id and event_id=p_event_id and is_active) then
    raise exception 'Department does not belong to event';
  end if;
  select b.original_contingency_minor
    - coalesce(sum(amount_minor) filter(where from_department_id is null),0)
    + coalesce(sum(amount_minor) filter(where to_department_id is null),0)
    into available
    from public.budget_transfers
    where budget_version_id=b.id;
  if p_amount_minor > available then raise exception 'Insufficient contingency'; end if;
  insert into public.budget_transfers(id,event_id,budget_version_id,from_department_id,to_department_id,amount_minor,reason,created_by)
    values(tid,p_event_id,b.id,null,p_department_id,p_amount_minor,btrim(p_reason),(select auth.uid()));
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(p_event_id,(select auth.uid()),'budget.transferred','budget_transfer',tid,'Contingency allocated');
  return tid;
end $$;

create or replace view public.v_budget_version_summaries with (security_invoker=true) as
select
  b.id budget_version_id,
  b.event_id,
  b.version_number,
  b.name,
  b.status,
  b.effective_date,
  b.original_contingency_minor,
  b.notes,
  b.created_by,
  b.activated_by,
  b.activated_at,
  b.created_at,
  b.updated_at,
  coalesce(sum(a.original_net_minor),0)::bigint total_department_original_minor,
  (coalesce(sum(a.original_net_minor),0)+b.original_contingency_minor)::bigint total_cost_budget_minor
from public.budget_versions b
left join public.department_budget_allocations a on a.budget_version_id=b.id
group by b.id;

create or replace view public.v_active_budget_department_positions with (security_invoker=true) as
select
  a.event_id,
  a.budget_version_id,
  b.version_number,
  d.id department_id,
  d.name department_name,
  d.code department_code,
  a.original_net_minor original_allocation_minor,
  coalesce(sum(t.amount_minor) filter(where t.to_department_id=d.id),0)::bigint transfers_received_minor,
  coalesce(sum(t.amount_minor) filter(where t.from_department_id=d.id),0)::bigint transfers_released_minor,
  (a.original_net_minor
    + coalesce(sum(t.amount_minor) filter(where t.to_department_id=d.id),0)
    - coalesce(sum(t.amount_minor) filter(where t.from_department_id=d.id),0))::bigint current_budget_minor
from public.department_budget_allocations a
join public.budget_versions b on b.id=a.budget_version_id and b.status='active'
join public.departments d on d.id=a.department_id
left join public.budget_transfers t on t.budget_version_id=b.id and (t.to_department_id=d.id or t.from_department_id=d.id)
group by a.event_id,a.budget_version_id,b.version_number,d.id,d.name,d.code,a.original_net_minor;

create or replace view public.v_active_budget_summaries with (security_invoker=true) as
select
  b.id budget_version_id,
  b.event_id,
  b.version_number,
  b.name,
  b.status,
  b.effective_date,
  b.original_contingency_minor,
  coalesce(sum(a.original_net_minor),0)::bigint total_department_original_minor,
  (coalesce(sum(a.original_net_minor),0)+b.original_contingency_minor)::bigint total_cost_budget_minor,
  (b.original_contingency_minor
    - coalesce((select sum(t.amount_minor) from public.budget_transfers t where t.budget_version_id=b.id and t.from_department_id is null),0)
    + coalesce((select sum(t.amount_minor) from public.budget_transfers t where t.budget_version_id=b.id and t.to_department_id is null),0))::bigint unallocated_contingency_minor
from public.budget_versions b
left join public.department_budget_allocations a on a.budget_version_id=b.id
where b.status='active'
group by b.id;

create index if not exists department_budget_allocations_version_idx on public.department_budget_allocations(budget_version_id);
create index if not exists budget_transfers_event_from_idx on public.budget_transfers(event_id,from_department_id);
create index if not exists budget_transfers_event_to_idx on public.budget_transfers(event_id,to_department_id);

grant select on public.v_budget_version_summaries,public.v_active_budget_department_positions,public.v_active_budget_summaries to authenticated;
grant execute on function
  public.create_budget_version(uuid,text,date,text,bigint,jsonb),
  public.update_draft_budget_version(uuid,text,date,text,bigint,jsonb),
  public.transfer_event_contingency(uuid,uuid,bigint,text)
to authenticated;

commit;
