begin;

create index if not exists spending_requests_event_status_idx on public.spending_requests(event_id,approval_status);
create index if not exists spending_request_revisions_event_status_idx on public.spending_request_revisions(event_id,status);
create index if not exists spending_request_allocations_event_department_idx on public.spending_request_department_allocations(event_id,department_id);
create index if not exists payments_event_status_created_idx on public.payments(event_id,status,created_at desc);

create or replace view public.v_event_dashboard_draft_exposures with (security_invoker=true) as
select
  r.event_id,
  count(distinct r.id)::bigint visible_draft_request_count,
  coalesce(sum(v.net_minor),0)::bigint visible_draft_net_minor,
  coalesce(sum(v.gross_minor),0)::bigint visible_draft_gross_minor,
  case when public.is_event_treasurer(r.event_id) then 'event_drafts' else 'my_visible_drafts' end draft_scope
from public.spending_requests r
join public.events e on e.id=r.event_id and e.status not in ('completed','archived')
join public.spending_request_revisions v on v.id=r.current_draft_revision_id and v.status='draft'
where r.approval_status in ('draft','changes_requested')
group by r.event_id;

create or replace view public.v_event_department_draft_exposures with (security_invoker=true) as
select
  r.event_id,
  a.department_id,
  count(distinct r.id)::bigint visible_draft_request_count,
  coalesce(sum(a.net_minor),0)::bigint visible_draft_net_minor,
  coalesce(sum(a.gross_minor),0)::bigint visible_draft_gross_minor
from public.spending_requests r
join public.events e on e.id=r.event_id and e.status not in ('completed','archived')
join public.spending_request_revisions v on v.id=r.current_draft_revision_id and v.status='draft'
join public.spending_request_department_allocations a on a.revision_id=v.id
where r.approval_status in ('draft','changes_requested')
group by r.event_id,a.department_id;

create or replace view public.v_event_spending_summaries with (security_invoker=true) as
with approved as (
  select
    r.event_id,
    count(distinct r.id)::bigint approved_request_count,
    coalesce(sum(v.net_minor),0)::bigint approved_net_minor,
    coalesce(sum(v.gross_minor),0)::bigint approved_gross_minor
  from public.spending_requests r
  join public.spending_request_revisions v on v.id=r.current_approved_revision_id
  where r.current_approved_revision_id is not null
  group by r.event_id
),
pending as (
  select
    pending_by_department.event_id,
    count(distinct pending_by_department.request_id)::bigint pending_request_count,
    coalesce(sum(pending_by_department.pending_net_minor),0)::bigint pending_net_minor,
    coalesce(sum(pending_by_department.pending_gross_minor),0)::bigint pending_gross_minor
  from (
    select
      r.event_id,
      r.id request_id,
      proposed.department_id,
      case when r.current_approved_revision_id is null then proposed.net_minor else greatest(proposed.net_minor-coalesce(base.net_minor,0),0) end pending_net_minor,
      case when r.current_approved_revision_id is null then proposed.gross_minor else greatest(proposed.gross_minor-coalesce(base.gross_minor,0),0) end pending_gross_minor
    from public.spending_requests r
    join public.spending_request_revisions v on v.request_id=r.id and v.status='submitted'
    join public.spending_request_department_allocations proposed on proposed.revision_id=v.id
    left join public.spending_request_department_allocations base on base.revision_id=r.current_approved_revision_id and base.department_id=proposed.department_id
    where r.approval_status in ('submitted','variation_pending')
  ) pending_by_department
  group by pending_by_department.event_id
),
payment_positions as (
  select
    event_id,
    count(*) filter(where payment_status='unpaid')::bigint unpaid_request_count,
    count(*) filter(where payment_status='partially_paid')::bigint partially_paid_request_count,
    count(*) filter(where payment_status='paid')::bigint paid_request_count,
    coalesce(sum(approved_gross_minor),0)::bigint approved_payable_gross_minor,
    coalesce(sum(paid_gross_minor),0)::bigint paid_gross_minor,
    coalesce(sum(outstanding_gross_minor),0)::bigint unpaid_approved_gross_minor
  from public.v_request_payment_positions
  where payment_status<>'not_applicable'
  group by event_id
)
select
  e.id event_id,
  coalesce(approved.approved_request_count,0)::bigint approved_request_count,
  coalesce(approved.approved_net_minor,0)::bigint approved_net_minor,
  coalesce(approved.approved_gross_minor,0)::bigint approved_gross_minor,
  coalesce(pending.pending_request_count,0)::bigint pending_request_count,
  coalesce(pending.pending_net_minor,0)::bigint pending_net_minor,
  coalesce(pending.pending_gross_minor,0)::bigint pending_gross_minor,
  coalesce(payment_positions.unpaid_request_count,0)::bigint unpaid_request_count,
  coalesce(payment_positions.partially_paid_request_count,0)::bigint partially_paid_request_count,
  coalesce(payment_positions.paid_request_count,0)::bigint paid_request_count,
  coalesce(payment_positions.approved_payable_gross_minor,0)::bigint approved_payable_gross_minor,
  coalesce(payment_positions.paid_gross_minor,0)::bigint paid_gross_minor,
  coalesce(payment_positions.unpaid_approved_gross_minor,0)::bigint unpaid_approved_gross_minor
from public.events e
left join approved on approved.event_id=e.id
left join pending on pending.event_id=e.id
left join payment_positions on payment_positions.event_id=e.id;

create or replace view public.v_event_financial_positions with (security_invoker=true) as
with current_department_budgets as (
  select event_id, coalesce(sum(current_budget_minor),0)::bigint total_current_department_budget_minor
  from public.v_active_budget_department_positions
  group by event_id
),
ticket_type_counts as (
  select event_id, count(*) filter(where is_active)::bigint active_ticket_type_count
  from public.ticket_types
  group by event_id
),
reversed_payments as (
  select event_id, count(*)::bigint reversed_payment_count
  from public.payments
  where status='reversed'
  group by event_id
)
select
  e.id event_id,
  e.name event_name,
  e.event_year,
  e.event_date,
  e.status event_status,
  e.organisation_id,
  abs.budget_version_id active_budget_version_id,
  abs.version_number active_budget_version_number,
  abs.name active_budget_name,
  abs.effective_date active_budget_effective_date,
  (abs.budget_version_id is not null) has_active_budget,
  coalesce(cdb.total_current_department_budget_minor,0)::bigint total_current_department_budget_minor,
  abs.original_contingency_minor,
  abs.unallocated_contingency_minor,
  coalesce(rev.ticket_forecast_net_minor,0)::bigint ticket_forecast_net_minor,
  coalesce(rev.ticket_forecast_gross_minor,0)::bigint ticket_forecast_gross_minor,
  coalesce(rev.other_forecast_net_minor,0)::bigint other_forecast_net_minor,
  coalesce(rev.other_forecast_gross_minor,0)::bigint other_forecast_gross_minor,
  coalesce(rev.total_forecast_net_minor,0)::bigint total_forecast_net_minor,
  coalesce(rev.total_forecast_gross_minor,0)::bigint total_forecast_gross_minor,
  rev.latest_snapshot_id,
  rev.latest_captured_at,
  rev.tickets_sold_to_date,
  rev.ticket_actual_net_minor,
  rev.ticket_actual_gross_minor,
  rev.ticket_refunds_to_date_minor,
  rev.ticket_booking_fees_to_date_minor,
  coalesce(rev.other_actual_net_minor,0)::bigint other_actual_net_minor,
  coalesce(rev.other_actual_gross_minor,0)::bigint other_actual_gross_minor,
  rev.total_actual_gross_minor,
  coalesce(spend.approved_request_count,0)::bigint approved_request_count,
  coalesce(spend.approved_net_minor,0)::bigint approved_net_spending_minor,
  coalesce(spend.approved_gross_minor,0)::bigint approved_gross_spending_minor,
  coalesce(spend.pending_request_count,0)::bigint pending_request_count,
  coalesce(spend.pending_net_minor,0)::bigint pending_net_spending_minor,
  coalesce(spend.pending_gross_minor,0)::bigint pending_gross_spending_minor,
  coalesce(drafts.visible_draft_request_count,0)::bigint visible_draft_request_count,
  coalesce(drafts.visible_draft_net_minor,0)::bigint visible_draft_net_minor,
  coalesce(drafts.visible_draft_gross_minor,0)::bigint visible_draft_gross_minor,
  coalesce(drafts.draft_scope, case when public.is_event_treasurer(e.id) then 'event_drafts' else 'my_visible_drafts' end) draft_scope,
  coalesce(spend.unpaid_request_count,0)::bigint unpaid_request_count,
  coalesce(spend.partially_paid_request_count,0)::bigint partially_paid_request_count,
  coalesce(spend.paid_request_count,0)::bigint paid_request_count,
  coalesce(spend.approved_payable_gross_minor,0)::bigint approved_payable_gross_minor,
  coalesce(spend.paid_gross_minor,0)::bigint paid_gross_spending_minor,
  coalesce(spend.unpaid_approved_gross_minor,0)::bigint unpaid_approved_gross_minor,
  coalesce(pay.recorded_gross_minor,0)::bigint recorded_payment_gross_minor,
  coalesce(pay.reversed_gross_minor,0)::bigint reversed_payment_gross_minor,
  coalesce(pay.recorded_payment_count,0)::bigint recorded_payment_count,
  coalesce(reversed_payments.reversed_payment_count,0)::bigint reversed_payment_count,
  (coalesce(rev.total_forecast_net_minor,0)-coalesce(spend.approved_net_minor,0)-coalesce(abs.unallocated_contingency_minor,0))::bigint formal_forecast_net_position_minor,
  (coalesce(rev.total_forecast_net_minor,0)-coalesce(spend.approved_net_minor,0)-coalesce(spend.pending_net_minor,0)-coalesce(abs.unallocated_contingency_minor,0))::bigint potential_forecast_net_position_minor,
  coalesce(spend.pending_net_minor,0)::bigint pending_net_position_delta_minor,
  case when rev.latest_snapshot_id is null then null else (coalesce(rev.total_actual_gross_minor,0)-coalesce(pay.recorded_gross_minor,0))::bigint end recorded_gross_cash_movement_minor,
  coalesce(ticket_type_counts.active_ticket_type_count,0)::bigint active_ticket_type_count
from public.events e
left join public.v_active_budget_summaries abs on abs.event_id=e.id
left join current_department_budgets cdb on cdb.event_id=e.id
left join public.v_event_revenue_summaries rev on rev.event_id=e.id
left join public.v_event_spending_summaries spend on spend.event_id=e.id
left join public.v_event_dashboard_draft_exposures drafts on drafts.event_id=e.id
left join public.v_event_payment_summaries pay on pay.event_id=e.id
left join ticket_type_counts on ticket_type_counts.event_id=e.id
left join reversed_payments on reversed_payments.event_id=e.id;

create or replace view public.v_event_department_financial_positions with (security_invoker=true) as
with approved as (
  select
    a.event_id,
    a.department_id,
    coalesce(sum(a.net_minor),0)::bigint approved_net_minor,
    coalesce(sum(a.gross_minor),0)::bigint approved_gross_minor
  from public.spending_requests r
  join public.spending_request_department_allocations a on a.revision_id=r.current_approved_revision_id
  where r.current_approved_revision_id is not null
  group by a.event_id,a.department_id
),
pending as (
  select
    proposed.event_id,
    proposed.department_id,
    coalesce(sum(case when r.current_approved_revision_id is null then proposed.net_minor else greatest(proposed.net_minor-coalesce(base.net_minor,0),0) end),0)::bigint pending_net_minor,
    coalesce(sum(case when r.current_approved_revision_id is null then proposed.gross_minor else greatest(proposed.gross_minor-coalesce(base.gross_minor,0),0) end),0)::bigint pending_gross_minor
  from public.spending_requests r
  join public.spending_request_revisions v on v.request_id=r.id and v.status='submitted'
  join public.spending_request_department_allocations proposed on proposed.revision_id=v.id
  left join public.spending_request_department_allocations base on base.revision_id=r.current_approved_revision_id and base.department_id=proposed.department_id
  where r.approval_status in ('submitted','variation_pending')
  group by proposed.event_id,proposed.department_id
)
select
  d.event_id,
  d.id department_id,
  d.name department_name,
  d.code department_code,
  d.display_order,
  b.budget_version_id,
  b.version_number active_budget_version_number,
  b.original_allocation_minor,
  b.transfers_received_minor,
  b.transfers_released_minor,
  b.current_budget_minor,
  (b.department_id is not null) has_active_allocation,
  coalesce(approved.approved_net_minor,0)::bigint approved_net_minor,
  coalesce(approved.approved_gross_minor,0)::bigint approved_gross_minor,
  coalesce(pending.pending_net_minor,0)::bigint pending_net_minor,
  coalesce(pending.pending_gross_minor,0)::bigint pending_gross_minor,
  coalesce(drafts.visible_draft_request_count,0)::bigint visible_draft_request_count,
  coalesce(drafts.visible_draft_net_minor,0)::bigint visible_draft_net_minor,
  coalesce(drafts.visible_draft_gross_minor,0)::bigint visible_draft_gross_minor,
  case when b.department_id is null then null else (b.current_budget_minor-coalesce(approved.approved_net_minor,0))::bigint end remaining_approved_minor,
  case when b.department_id is null then null else (b.current_budget_minor-coalesce(approved.approved_net_minor,0)-coalesce(pending.pending_net_minor,0))::bigint end potential_remaining_minor,
  case when b.department_id is not null and (b.current_budget_minor-coalesce(approved.approved_net_minor,0)) < 0 then true else false end approved_over_budget,
  case when b.department_id is not null and (b.current_budget_minor-coalesce(approved.approved_net_minor,0)-coalesce(pending.pending_net_minor,0)) < 0 then true else false end potential_over_budget
from public.departments d
left join public.v_active_budget_department_positions b on b.department_id=d.id
left join approved on approved.event_id=d.event_id and approved.department_id=d.id
left join pending on pending.event_id=d.event_id and pending.department_id=d.id
left join public.v_event_department_draft_exposures drafts on drafts.department_id=d.id
where d.is_active;

create or replace view public.v_event_dashboard_pending_approvals with (security_invoker=true) as
select
  q.event_id,
  q.request_id,
  q.revision_id,
  q.code request_code,
  q.title,
  q.owner_display_name,
  q.owner_preferred_name,
  q.primary_department_id,
  q.primary_department_name,
  q.primary_department_code,
  q.net_minor,
  q.gross_minor,
  q.submitted_at,
  q.request_type,
  exists(
    select 1 from public.v_request_department_impacts i
    where i.event_id=q.event_id and i.request_id=q.request_id and i.revision_id=q.revision_id and i.over_budget
  ) budget_warning
from public.v_approval_queue q
where public.is_event_treasurer(q.event_id);

create or replace view public.v_event_dashboard_activity with (security_invoker=true) as
select
  a.id activity_id,
  a.event_id,
  a.actor_user_id,
  p.display_name actor_display_name,
  a.action,
  a.entity_type,
  a.entity_id,
  a.summary,
  a.visibility,
  a.created_at
from public.activity_log a
left join public.profiles p on p.id=a.actor_user_id
where a.action in (
  'budget.activated',
  'budget.transferred',
  'revenue.ticket_snapshot_recorded',
  'revenue.ticket_snapshot_voided',
  'revenue.other_saved',
  'request.submitted',
  'request.approved',
  'request.rejected',
  'request.changes_requested',
  'request.variation_submitted',
  'payment.recorded',
  'payment.reversed'
);

create or replace view public.v_event_dashboard_warnings with (security_invoker=true) as
select event_id,'no_active_budget' code,'warning' severity,'No active budget' title,'Create and activate a budget before relying on budget positions.' message,'budget' target_module
from public.v_event_financial_positions
where not has_active_budget
union all
select event_id,'no_ticket_forecast','info','No active ticket forecast','Add active ticket types with forecast quantities to complete forecast revenue.','revenue'
from public.v_event_financial_positions
where active_ticket_type_count=0
union all
select event_id,'no_actual_revenue_snapshot','info','No actual ticket snapshot','Record a cumulative actual ticket-sales snapshot before reading actual revenue as current.','revenue'
from public.v_event_financial_positions
where latest_snapshot_id is null
union all
select event_id,'department_approved_over_budget','warning','Approved spending exceeds department budget','At least one department has approved net spending above its current budget.','budget'
from public.v_event_department_financial_positions
where approved_over_budget
group by event_id
union all
select event_id,'department_potential_over_budget','warning','Potential spending exceeds department budget','At least one department would exceed its current budget if pending approvals were approved.','approvals'
from public.v_event_department_financial_positions
where potential_over_budget
group by event_id
union all
select event_id,'pending_approvals','info','Pending approvals awaiting review','Submitted requests or variations are awaiting treasurer review.','approvals'
from public.v_event_financial_positions
where pending_request_count>0
union all
select event_id,'partly_paid_requests','info','Approved requests are partly paid','One or more approved requests has a payment recorded but remains outstanding.','payments'
from public.v_event_financial_positions
where partially_paid_request_count>0
union all
select event_id,'unpaid_approved_requests','info','Approved requests are unpaid','One or more approved requests has no active payment recorded.','payments'
from public.v_event_financial_positions
where unpaid_request_count>0
union all
select event_id,'reversed_payments','info','Reversed payments exist','Payment history includes reversed records that are excluded from active paid totals.','payments'
from public.v_event_financial_positions
where reversed_payment_count>0;

grant select on
  public.v_event_dashboard_draft_exposures,
  public.v_event_department_draft_exposures,
  public.v_event_spending_summaries,
  public.v_event_financial_positions,
  public.v_event_department_financial_positions,
  public.v_event_dashboard_pending_approvals,
  public.v_event_dashboard_activity,
  public.v_event_dashboard_warnings
to authenticated;

commit;
