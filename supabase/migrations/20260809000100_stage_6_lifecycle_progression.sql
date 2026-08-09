begin;

alter table public.event_lifecycle_history
  drop constraint if exists event_lifecycle_history_action_check;
alter table public.event_lifecycle_history
  add constraint event_lifecycle_history_action_check
  check (action in ('progressed','completed','archived','reopened'));

create or replace function public.normal_lifecycle_target(p_status public.event_status)
returns public.event_status
language sql immutable set search_path='' as $$
  select case p_status
    when 'setup' then 'planning'::public.event_status
    when 'planning' then 'live'::public.event_status
    when 'live' then 'reconciliation'::public.event_status
    when 'reconciliation' then 'completed'::public.event_status
    when 'completed' then 'archived'::public.event_status
    else null::public.event_status
  end
$$;

create or replace function public.event_lifecycle_readiness(
  p_event_id uuid,
  p_to_status public.event_status default null
)
returns table(
  code text,
  severity text,
  category text,
  item_count bigint,
  amount_minor bigint,
  target_route text,
  acknowledgement_allowed boolean,
  blocks_completion boolean
)
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  ev public.events;
  target public.event_status;
begin
  if actor is null then raise exception 'Not authorised'; end if;
  select * into strict ev from public.events where id=p_event_id;
  if not public.can_view_event(p_event_id)
     or not (public.is_event_president(p_event_id) or public.is_event_treasurer(p_event_id)) then
    raise exception 'Not authorised';
  end if;

  target := coalesce(p_to_status, public.normal_lifecycle_target(ev.status));

  if target is null then
    return;
  end if;

  if ev.status = 'reconciliation' and target = 'completed' then
    return query select * from public.event_completion_readiness(p_event_id);
    return;
  end if;

  if not (
    (ev.status='setup' and target='planning')
    or (ev.status='planning' and target='live')
    or (ev.status='live' and target='reconciliation')
    or (ev.status='completed' and target='archived')
  ) then
    return query
    select 'invalid_transition','blocker','Lifecycle',1::bigint,null::bigint,'settings/lifecycle',false,true;
    return;
  end if;

  return query
  select 'missing_event_date','warning','Settings',1::bigint,null::bigint,'settings',true,false
  where target in ('planning','live') and ev.event_date is null
  union all
  select 'no_president_assigned','blocker','Committee',1::bigint,null::bigint,'committee',false,true
  where target in ('planning','live','reconciliation') and not exists(
    select 1 from public.event_members em
    join public.event_member_roles r on r.event_id=em.event_id and r.event_member_id=em.id and r.role='president'
    where em.event_id=p_event_id and em.status='active'
  )
  union all
  select 'no_treasurer_assigned','warning','Committee',1::bigint,null::bigint,'committee',true,false
  where target in ('planning','live') and not exists(
    select 1 from public.event_members em
    join public.event_member_roles r on r.event_id=em.event_id and r.event_member_id=em.id and r.role='treasurer'
    where em.event_id=p_event_id and em.status='active'
  )
  union all
  select 'no_departments_configured','warning','Departments',1::bigint,null::bigint,'departments',true,false
  where target in ('planning','live') and not exists(
    select 1 from public.departments d where d.event_id=p_event_id and d.is_active
  )
  union all
  select 'no_active_budget','warning','Budget',1::bigint,null::bigint,'budget',true,false
  where target='live' and not exists(
    select 1 from public.budget_versions b where b.event_id=p_event_id and b.status='active'
  )
  union all
  select 'draft_budget_versions','info','Budget',count(*)::bigint,null::bigint,'budget',true,false
  from public.budget_versions b
  where target in ('live','reconciliation') and b.event_id=p_event_id and b.status='draft'
  having count(*) > 0
  union all
  select 'requests_awaiting_approval','warning','Requests',count(distinct r.id)::bigint,coalesce(sum(v.gross_minor),0)::bigint,'approvals',true,false
  from public.spending_requests r
  join public.spending_request_revisions v on v.request_id=r.id and v.status='submitted'
  where target in ('live','reconciliation') and r.event_id=p_event_id and r.approval_status in ('submitted','variation_pending')
  having count(distinct r.id) > 0
  union all
  select 'changes_requested_open','warning','Requests',count(*)::bigint,null::bigint,'requests',true,false
  from public.spending_requests r
  where target in ('live','reconciliation') and r.event_id=p_event_id and r.approval_status='changes_requested'
  having count(*) > 0
  union all
  select 'private_spending_drafts','warning','Requests',count(*)::bigint,coalesce(sum(v.gross_minor),0)::bigint,'requests',true,false
  from public.spending_requests r
  join public.spending_request_revisions v on v.id=r.current_draft_revision_id
  where target='reconciliation' and r.event_id=p_event_id and r.approval_status in ('draft','changes_requested') and v.status='draft'
  having count(*) > 0
  union all
  select 'unpaid_approved_requests','warning','Payments',count(*)::bigint,coalesce(sum(outstanding_gross_minor),0)::bigint,'payments',true,false
  from public.v_request_payment_positions
  where target='reconciliation' and event_id=p_event_id and payment_status in ('unpaid','partially_paid','overpaid')
  having count(*) > 0
  union all
  select 'no_actual_revenue_snapshot','info','Revenue',1::bigint,null::bigint,'revenue/actual',true,false
  where target='reconciliation' and not exists(
    select 1 from public.v_latest_ticket_sales_snapshot s where s.event_id=p_event_id
  )
  union all
  select 'active_invitations','info','Committee',count(*)::bigint,null::bigint,'committee',true,false
  from public.invitations
  where target in ('planning','live') and event_id=p_event_id and status='pending' and expires_at > now()
  having count(*) > 0;
end $$;

create or replace function public.progress_event_lifecycle(
  p_event_id uuid,
  p_to_status public.event_status,
  p_acknowledge_warnings boolean default false,
  p_reason text default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  ev public.events;
  expected public.event_status;
  blockers jsonb;
  warnings jsonb;
begin
  if actor is null then raise exception 'Not authorised'; end if;
  select * into strict ev from public.events where id=p_event_id for update;
  if not public.is_event_president(p_event_id) then raise exception 'Not authorised'; end if;

  expected := public.normal_lifecycle_target(ev.status);
  if expected is null or p_to_status is distinct from expected or p_to_status not in ('planning','live','reconciliation') then
    raise exception 'Invalid lifecycle transition';
  end if;

  select coalesce(jsonb_agg(to_jsonb(r)) filter(where r.blocks_completion),'[]'::jsonb),
         coalesce(jsonb_agg(to_jsonb(r)) filter(where not r.blocks_completion and r.severity='warning'),'[]'::jsonb)
    into blockers,warnings
  from public.event_lifecycle_readiness(p_event_id,p_to_status) r;

  if jsonb_array_length(blockers) > 0 then
    raise exception 'Lifecycle progression is blocked';
  end if;
  if jsonb_array_length(warnings) > 0 and not coalesce(p_acknowledge_warnings,false) then
    return jsonb_build_object('progressed',false,'status',ev.status,'target_status',p_to_status,'warnings',warnings,'blockers',blockers);
  end if;

  perform set_config('app.lifecycle_transition','on',true);
  update public.events
    set status=p_to_status
    where id=ev.id and status=ev.status;
  perform set_config('app.lifecycle_transition','off',true);
  if not found then raise exception 'Lifecycle state changed; refresh and try again'; end if;

  insert into public.event_lifecycle_history(event_id,previous_status,new_status,action,actor_user_id,reason,acknowledged_warnings,metadata)
    values(ev.id,ev.status,p_to_status,'progressed',actor,nullif(btrim(coalesce(p_reason,'')),''),warnings,jsonb_build_object('warning_count',jsonb_array_length(warnings)));
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,metadata)
    values(ev.id,actor,'event.lifecycle_progressed','event',ev.id,'Event lifecycle progressed',jsonb_build_object('from',ev.status,'to',p_to_status,'warning_count',jsonb_array_length(warnings)));

  return jsonb_build_object('progressed',true,'status',p_to_status,'warnings',warnings,'blockers',blockers);
end $$;

revoke execute on function public.normal_lifecycle_target(public.event_status) from public, anon;
revoke execute on function public.event_lifecycle_readiness(uuid,public.event_status) from public, anon;
revoke execute on function public.progress_event_lifecycle(uuid,public.event_status,boolean,text) from public, anon;
grant execute on function public.normal_lifecycle_target(public.event_status) to authenticated;
grant execute on function public.event_lifecycle_readiness(uuid,public.event_status) to authenticated;
grant execute on function public.progress_event_lifecycle(uuid,public.event_status,boolean,text) to authenticated;

commit;
