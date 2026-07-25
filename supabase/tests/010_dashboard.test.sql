begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);

select is((select count(*)::bigint from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),1::bigint,'treasurer sees exactly one Downing dashboard summary row');
select is((select has_active_budget from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),true,'active budget is selected');
select is((select active_budget_version_number from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),1,'active budget version is reported');
select is((select total_current_department_budget_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),8300000::bigint,'current department budget totals active allocations');
select is((select unallocated_contingency_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),1500000::bigint,'unallocated contingency is central and not duplicated into departments');
select is((select total_forecast_net_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),20708430::bigint,'forecast net revenue combines ticket and other forecasts');
select is((select latest_snapshot_id from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),'61000000-0000-0000-0000-000000000003'::uuid,'latest non-void cumulative ticket snapshot is selected');
select is((select ticket_actual_gross_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),12000000::bigint,'latest snapshot gross is used directly');
select isnt((select ticket_actual_gross_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),(select sum(gross_sales_minor)::bigint from public.ticket_sales_snapshots where event_id='30000000-0000-0000-0000-000000000027' and not is_void),'cumulative ticket snapshots are not summed');
select is((select ticket_booking_fees_to_date_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),240000::bigint,'booking fees are reported separately');
select is((select total_actual_gross_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),12500000::bigint,'actual gross revenue combines latest ticket snapshot and actual other revenue');
select is((select approved_net_spending_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),900000::bigint,'approved spending includes current approved baselines including a pending variation baseline');
select is((select pending_net_spending_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),520000::bigint,'pending spending uses initial submissions plus positive variation increment only');
select is((select approved_gross_spending_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),1080000::bigint,'approved gross spending remains separate from net formulas');
select is((select pending_gross_spending_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),624000::bigint,'pending gross spending uses incremental variation gross');
select is((select formal_forecast_net_position_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),18308430::bigint,'formal forecast subtracts approved net spending and unallocated contingency');
select is((select potential_forecast_net_position_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),17788430::bigint,'potential forecast also subtracts pending net exposure');
select is((select recorded_gross_cash_movement_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),12500000::bigint,'recorded cash movement is actual gross received minus active gross payments');

select is((select visible_draft_request_count from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),4::bigint,'treasurer dashboard draft aggregate includes all visible event drafts');
select is((select visible_draft_gross_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),1416000::bigint,'treasurer visible draft gross is aggregated under RLS');
select is((select draft_scope from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),'event_drafts','treasurer draft scope is labelled as event drafts');

select is((select current_budget_minor from public.v_event_department_financial_positions where department_id='40000000-0000-0000-0000-000000000001'),2500000::bigint,'department current budget comes from active budget positions');
select is((select approved_net_minor from public.v_event_department_financial_positions where department_id='40000000-0000-0000-0000-000000000001'),900000::bigint,'department approved net aggregates current approved allocations without multiplying rows');
select is((select pending_net_minor from public.v_event_department_financial_positions where department_id='40000000-0000-0000-0000-000000000001'),520000::bigint,'department pending net includes submitted initial plus variation increment');
select is((select remaining_approved_minor from public.v_event_department_financial_positions where department_id='40000000-0000-0000-0000-000000000001'),1600000::bigint,'department remaining approved budget is current budget minus approved net');
select is((select potential_remaining_minor from public.v_event_department_financial_positions where department_id='40000000-0000-0000-0000-000000000001'),1080000::bigint,'department potential remaining subtracts pending net');
select is((select visible_draft_net_minor from public.v_event_department_financial_positions where department_id='40000000-0000-0000-0000-000000000001'),350000::bigint,'department draft exposure follows visible draft allocations');

reset role;
insert into public.departments(id,event_id,name,code,display_order,created_by) values('40000000-0000-0000-0000-000000000088','30000000-0000-0000-0000-000000000027','Unbudgeted','UNB',88,'10000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select has_active_allocation from public.v_event_department_financial_positions where department_id='40000000-0000-0000-0000-000000000088'),false,'department without active allocation is represented safely');
select is((select current_budget_minor from public.v_event_department_financial_positions where department_id='40000000-0000-0000-0000-000000000088'),null,'missing allocation is not silently presented as a normal zero budget');

select is((select count(*)::bigint from public.v_event_dashboard_pending_approvals where event_id='30000000-0000-0000-0000-000000000027'),2::bigint,'treasurer sees pending approval widget rows');
select ok(exists(select 1 from public.v_event_dashboard_warnings where event_id='30000000-0000-0000-0000-000000000027' and code='pending_approvals'),'pending approvals warning is generated');
select ok(exists(select 1 from public.v_event_dashboard_warnings where event_id='30000000-0000-0000-0000-000000000027' and code='unpaid_approved_requests'),'unpaid approved request warning is generated');

create temp table paid as
select public.record_component_payment(
  '30000000-0000-0000-0000-000000000027',
  current_date,
  'Stage Supplier',
  120000,
  'DASH-PAY-001',
  'bank_transfer',
  'Dashboard test payment',
  jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where code='DMB_AE_3.1'),'gross_minor',120000)),
  'dashboard-payment'
) id;
select is((select paid_gross_spending_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),120000::bigint,'paid spending uses non-reversed payment allocations');
select is((select recorded_gross_cash_movement_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),12380000::bigint,'cash movement subtracts recorded active gross payments');
select lives_ok($$select public.reverse_payment((select id from paid),'Dashboard test reversal')$$,'treasurer reverses payment for dashboard test');
select is((select paid_gross_spending_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'reversed payment is excluded from paid totals');
select ok(exists(select 1 from public.v_event_dashboard_warnings where event_id='30000000-0000-0000-0000-000000000027' and code='reversed_payments'),'reversed payment warning is generated');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select is((select visible_draft_request_count from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),2::bigint,'ordinary member dashboard sees only own visible drafts');
select is((select visible_draft_gross_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),816000::bigint,'ordinary member cannot infer other members draft gross');
select is((select count(*)::bigint from public.v_event_dashboard_pending_approvals where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'non-treasurer does not receive actionable approval rows');
select is((select count(*)::bigint from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000025'),1::bigint,'same-organisation active member can view historical dashboard summary');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select visible_draft_request_count from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'president without treasurer cannot infer hidden draft count');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select is((select count(*)::bigint from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'outsider cannot access Downing dashboard summary by event id');
select is((select count(*)::bigint from public.v_event_department_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'outsider cannot access Downing department dashboard rows');

select * from finish();
rollback;
