begin;

alter table public.events
  add column if not exists completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists reopened_by uuid references public.profiles(id) on delete set null,
  add column if not exists completion_note text check (completion_note is null or char_length(completion_note)<=4000),
  add column if not exists archive_reason text check (archive_reason is null or char_length(archive_reason)<=4000),
  add column if not exists reopen_reason text check (reopen_reason is null or char_length(reopen_reason)<=4000);

create or replace function public.can_view_historical_event(p_event_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.events old
    where old.id=p_event_id
      and old.status in ('completed','archived')
      and (
        exists(
          select 1
          from public.events current
          join public.event_members em on em.event_id=current.id and em.user_id=(select auth.uid()) and em.status='active'
          where current.organisation_id=old.organisation_id and current.status not in ('completed','archived')
        )
        or exists(
          select 1
          from public.organisation_members om
          where om.organisation_id=old.organisation_id and om.user_id=(select auth.uid()) and om.status='active'
        )
      )
  )
$$;

create table public.event_lifecycle_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  previous_status public.event_status not null,
  new_status public.event_status not null,
  action text not null check (action in ('completed','archived','reopened')),
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  reason text check (reason is null or char_length(reason)<=4000),
  acknowledged_warnings jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index event_lifecycle_history_event_time_idx on public.event_lifecycle_history(event_id,created_at desc);
alter table public.event_lifecycle_history enable row level security;
alter table public.event_lifecycle_history force row level security;
create policy event_lifecycle_history_select on public.event_lifecycle_history
  for select to authenticated using(public.can_view_event(event_id));
grant select on public.event_lifecycle_history to authenticated;

create or replace function public.prevent_event_lifecycle_direct_update() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.status is distinct from new.status
    or old.completed_at is distinct from new.completed_at
    or old.archived_at is distinct from new.archived_at
    or old.reopened_at is distinct from new.reopened_at
    or old.completed_by is distinct from new.completed_by
    or old.archived_by is distinct from new.archived_by
    or old.reopened_by is distinct from new.reopened_by then
    if coalesce(current_setting('app.lifecycle_transition', true),'') <> 'on' then
      raise exception 'Event lifecycle changes must use lifecycle RPCs';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists events_lifecycle_direct_update on public.events;
create trigger events_lifecycle_direct_update
  before update on public.events
  for each row execute function public.prevent_event_lifecycle_direct_update();

create or replace function public.prevent_event_lifecycle_history_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Lifecycle history is append-only';
end $$;
drop trigger if exists event_lifecycle_history_append_only_update on public.event_lifecycle_history;
drop trigger if exists event_lifecycle_history_append_only_delete on public.event_lifecycle_history;
create trigger event_lifecycle_history_append_only_update
  before update on public.event_lifecycle_history
  for each row execute function public.prevent_event_lifecycle_history_mutation();
create trigger event_lifecycle_history_append_only_delete
  before delete on public.event_lifecycle_history
  for each row execute function public.prevent_event_lifecycle_history_mutation();

create or replace function public.event_completion_readiness(p_event_id uuid)
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
begin
  if actor is null then raise exception 'Not authorised'; end if;
  select * into strict ev from public.events where id=p_event_id;
  if not public.can_view_event(p_event_id) or not (public.is_event_president(p_event_id) or public.is_event_treasurer(p_event_id)) then
    raise exception 'Not authorised';
  end if;

  return query
  select 'invalid_status','blocker','Lifecycle',1::bigint,null::bigint,'settings/lifecycle',false,true
  where ev.status not in ('planning','live','reconciliation')
  union all
  select 'missing_event_date','warning','Setup',1::bigint,null::bigint,'settings',true,false
  where ev.event_date is null
  union all
  select 'no_active_budget','warning','Budget',1::bigint,null::bigint,'budget',true,false
  where not exists(select 1 from public.budget_versions b where b.event_id=p_event_id and b.status='active')
  union all
  select 'draft_budget_versions','warning','Budget',count(*)::bigint,null::bigint,'budget',true,false
  from public.budget_versions b where b.event_id=p_event_id and b.status='draft'
  having count(*) > 0
  union all
  select 'no_final_budget','warning','Budget',1::bigint,null::bigint,'budget',true,false
  where exists(select 1 from public.budget_versions b where b.event_id=p_event_id and b.status='active')
    and not exists(select 1 from public.budget_versions b where b.event_id=p_event_id and b.status='final')
  union all
  select 'private_spending_drafts','warning','Requests',count(*)::bigint,coalesce(sum(v.gross_minor),0)::bigint,'requests',true,false
  from public.spending_requests r
  join public.spending_request_revisions v on v.id=r.current_draft_revision_id
  where r.event_id=p_event_id and r.approval_status in ('draft','changes_requested') and v.status='draft'
  having count(*) > 0
  union all
  select 'requests_awaiting_approval','warning','Requests',count(*)::bigint,coalesce(sum(v.gross_minor),0)::bigint,'approvals',true,false
  from public.spending_requests r
  join public.spending_request_revisions v on v.request_id=r.id and v.status='submitted'
  where r.event_id=p_event_id and r.approval_status in ('submitted','variation_pending')
  having count(distinct r.id) > 0
  union all
  select 'changes_requested_open','warning','Requests',count(*)::bigint,null::bigint,'requests',true,false
  from public.spending_requests r
  where r.event_id=p_event_id and r.approval_status='changes_requested'
  having count(*) > 0
  union all
  select 'unpaid_approved_requests','warning','Payments',count(*)::bigint,coalesce(sum(outstanding_gross_minor),0)::bigint,'payments',true,false
  from public.v_request_payment_positions
  where event_id=p_event_id and payment_status in ('unpaid','partially_paid','overpaid')
  having count(*) > 0
  union all
  select 'no_actual_revenue_snapshot','warning','Revenue',1::bigint,null::bigint,'revenue/actual',true,false
  where not exists(select 1 from public.v_latest_ticket_sales_snapshot s where s.event_id=p_event_id)
  union all
  select 'expected_other_revenue','warning','Revenue',count(*)::bigint,coalesce(sum(forecast_gross_minor-coalesce(actual_gross_minor,0)),0)::bigint,'revenue/other',true,false
  from public.other_revenue_items
  where event_id=p_event_id and status in ('forecast','confirmed','part_received') and coalesce(actual_gross_minor,0) < forecast_gross_minor
  having count(*) > 0
  union all
  select 'unallocated_contingency','info','Budget',1::bigint,unallocated_contingency_minor::bigint,'budget',true,false
  from public.v_active_budget_summaries
  where event_id=p_event_id and coalesce(unallocated_contingency_minor,0) > 0
  union all
  select 'reversed_payments','info','Payments',count(*)::bigint,coalesce(sum(gross_minor),0)::bigint,'payments',true,false
  from public.payments
  where event_id=p_event_id and status='reversed'
  having count(*) > 0
  union all
  select 'active_invitations','warning','Committee',count(*)::bigint,null::bigint,'committee',true,false
  from public.invitations
  where event_id=p_event_id and status='pending' and expires_at > now()
  having count(*) > 0
  union all
  select 'no_treasurer_assigned','warning','Committee',1::bigint,null::bigint,'committee',true,false
  where not exists(
    select 1 from public.event_members em
    join public.event_member_roles r on r.event_id=em.event_id and r.event_member_id=em.id and r.role='treasurer'
    where em.event_id=p_event_id and em.status='active'
  )
  union all
  select 'no_president_assigned','blocker','Committee',1::bigint,null::bigint,'committee',false,true
  where not exists(
    select 1 from public.event_members em
    join public.event_member_roles r on r.event_id=em.event_id and r.event_member_id=em.id and r.role='president'
    where em.event_id=p_event_id and em.status='active'
  );
end $$;

create or replace view public.v_event_lifecycle_summary with (security_invoker=true) as
select
  e.id event_id,
  e.status,
  e.completed_at,
  e.completed_by,
  cp.display_name completed_by_display_name,
  e.archived_at,
  e.archived_by,
  ap.display_name archived_by_display_name,
  e.reopened_at,
  e.reopened_by,
  rp.display_name reopened_by_display_name,
  e.completion_note,
  e.archive_reason,
  e.reopen_reason,
  (e.status in ('completed','archived')) is_read_only,
  coalesce((select count(*) from public.event_lifecycle_history h where h.event_id=e.id),0)::bigint lifecycle_history_count
from public.events e
left join public.profiles cp on cp.id=e.completed_by
left join public.profiles ap on ap.id=e.archived_by
left join public.profiles rp on rp.id=e.reopened_by;
grant select on public.v_event_lifecycle_summary to authenticated;

create or replace function public.transfer_contingency(p_budget_version_id uuid,p_department_id uuid,p_amount_minor bigint,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare b public.budget_versions; available bigint; tid uuid:=gen_random_uuid();
begin
  select * into strict b from public.budget_versions where id=p_budget_version_id for update;
  if not public.is_event_treasurer(b.event_id) or not public.is_event_writable(b.event_id) or b.status<>'active' or p_amount_minor<=0 then
    raise exception 'Not authorised';
  end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Transfer reason is required'; end if;
  if not exists(select 1 from public.departments where id=p_department_id and event_id=b.event_id and is_active) then
    raise exception 'Department does not belong to event';
  end if;
  select b.original_contingency_minor-coalesce(sum(case when from_department_id is null then amount_minor else -amount_minor end),0)
    into available
  from public.budget_transfers
  where budget_version_id=b.id;
  if p_amount_minor>available then raise exception 'Insufficient contingency'; end if;
  insert into public.budget_transfers(id,event_id,budget_version_id,to_department_id,amount_minor,reason,created_by)
    values(tid,b.event_id,b.id,p_department_id,p_amount_minor,btrim(p_reason),(select auth.uid()));
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(b.event_id,(select auth.uid()),'budget.transferred','budget_transfer',tid,'Contingency allocated');
  return tid;
end $$;

drop function if exists public.complete_event(uuid,boolean);
create or replace function public.complete_event(
  p_event_id uuid,
  p_acknowledge_warnings boolean default false,
  p_reason text default null
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := (select auth.uid());
  ev public.events;
  blockers jsonb;
  warnings jsonb;
begin
  if actor is null then raise exception 'Not authorised'; end if;
  select * into strict ev from public.events where id=p_event_id for update;
  if not public.is_event_president(p_event_id) then raise exception 'Not authorised'; end if;

  select coalesce(jsonb_agg(to_jsonb(r)) filter(where r.blocks_completion),'[]'::jsonb),
         coalesce(jsonb_agg(to_jsonb(r)) filter(where not r.blocks_completion and r.severity='warning'),'[]'::jsonb)
    into blockers,warnings
  from public.event_completion_readiness(p_event_id) r;

  if jsonb_array_length(blockers) > 0 then
    raise exception 'Event completion is blocked';
  end if;
  if jsonb_array_length(warnings) > 0 and not coalesce(p_acknowledge_warnings,false) then
    return jsonb_build_object('completed',false,'status',ev.status,'warnings',warnings,'blockers',blockers);
  end if;

  perform set_config('app.lifecycle_transition','on',true);
  update public.events
    set status='completed',
        completed_at=now(),
        completed_by=actor,
        completion_note=nullif(btrim(coalesce(p_reason,'')),''),
        archived_at=null,
        archived_by=null,
        archive_reason=null
    where id=ev.id and status in ('planning','live','reconciliation');
  perform set_config('app.lifecycle_transition','off',true);
  if not found then raise exception 'Event cannot be completed from current status'; end if;

  insert into public.event_lifecycle_history(event_id,previous_status,new_status,action,actor_user_id,reason,acknowledged_warnings,metadata)
    values(ev.id,ev.status,'completed','completed',actor,nullif(btrim(coalesce(p_reason,'')),''),warnings,jsonb_build_object('warning_count',jsonb_array_length(warnings)));
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,metadata)
    values(ev.id,actor,'event.completed','event',ev.id,'Event marked completed',jsonb_build_object('warning_count',jsonb_array_length(warnings)));

  return jsonb_build_object('completed',true,'status','completed','warnings',warnings,'blockers',blockers);
end $$;

create or replace function public.archive_event(p_event_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); ev public.events;
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Archive reason required'; end if;
  select * into strict ev from public.events where id=p_event_id for update;
  if not public.is_event_president(p_event_id) then raise exception 'Not authorised'; end if;
  if ev.status <> 'completed' then raise exception 'Event can only be archived after completion'; end if;

  perform set_config('app.lifecycle_transition','on',true);
  update public.events
    set status='archived',
        archived_at=now(),
        archived_by=actor,
        archive_reason=btrim(p_reason)
    where id=ev.id and status='completed';
  perform set_config('app.lifecycle_transition','off',true);
  if not found then raise exception 'Event can only be archived after completion'; end if;
  insert into public.event_lifecycle_history(event_id,previous_status,new_status,action,actor_user_id,reason)
    values(ev.id,ev.status,'archived','archived',actor,btrim(p_reason));
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,metadata)
    values(ev.id,actor,'event.archived','event',ev.id,'Event archived',jsonb_build_object('reason',btrim(p_reason)));
  return jsonb_build_object('archived',true,'status','archived');
end $$;

drop function if exists public.reopen_event(uuid,text);
create or replace function public.reopen_event(p_event_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); ev public.events;
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Reopen reason required'; end if;
  select * into strict ev from public.events where id=p_event_id for update;
  if not public.is_event_president(p_event_id) then raise exception 'Not authorised'; end if;
  if ev.status not in ('completed','archived') then raise exception 'Event is not completed or archived'; end if;

  perform set_config('app.lifecycle_transition','on',true);
  update public.events
    set status='reconciliation',
        completed_at=null,
        completed_by=null,
        archived_at=null,
        archived_by=null,
        reopened_at=now(),
        reopened_by=actor,
        reopen_reason=btrim(p_reason)
    where id=ev.id and status in ('completed','archived');
  perform set_config('app.lifecycle_transition','off',true);
  if not found then raise exception 'Event is not completed or archived'; end if;
  insert into public.event_lifecycle_history(event_id,previous_status,new_status,action,actor_user_id,reason,metadata)
    values(ev.id,ev.status,'reconciliation','reopened',actor,btrim(p_reason),jsonb_build_object('source_status',ev.status));
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,metadata)
    values(ev.id,actor,'event.reopened','event',ev.id,'Event reopened',jsonb_build_object('reason',btrim(p_reason),'source_status',ev.status));
  return jsonb_build_object('reopened',true,'status','reconciliation');
end $$;

revoke execute on function public.event_completion_readiness(uuid) from public, anon;
revoke execute on function public.complete_event(uuid,boolean,text) from public, anon;
revoke execute on function public.archive_event(uuid,text) from public, anon;
revoke execute on function public.reopen_event(uuid,text) from public, anon;
grant execute on function public.event_completion_readiness(uuid) to authenticated;
grant execute on function public.complete_event(uuid,boolean,text) to authenticated;
grant execute on function public.archive_event(uuid,text) to authenticated;
grant execute on function public.reopen_event(uuid,text) to authenticated;
grant execute on function public.transfer_contingency(uuid,uuid,bigint,text) to authenticated;

commit;
