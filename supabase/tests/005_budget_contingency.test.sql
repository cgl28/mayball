begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
create temp table draft_budget as
  select public.create_budget_version(
    '30000000-0000-0000-0000-000000000027',
    'January reforecast',
    '2027-01-15'::date,
    'Budget test',
    200000::bigint,
    jsonb_build_array(
      jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','original_net_minor',1000000),
      jsonb_build_object('department_id','40000000-0000-0000-0000-000000000003','original_net_minor',500000)
    )
  ) id;
select is((select status::text from public.budget_versions where id=(select id from draft_budget)),'draft','treasurer creates draft budget');
select is((select version_number from public.budget_versions where id=(select id from draft_budget)),2,'version number is generated in database');
select is((select count(*)::bigint from public.department_budget_allocations where budget_version_id=(select id from draft_budget)),2::bigint,'draft allocations created atomically');

select lives_ok($$select public.update_draft_budget_version((select id from draft_budget),'January reforecast updated','2027-01-20'::date,'Updated',250000,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','original_net_minor',1200000),jsonb_build_object('department_id','40000000-0000-0000-0000-000000000004','original_net_minor',300000)))$$,'treasurer edits draft atomically');
select is((select original_contingency_minor from public.budget_versions where id=(select id from draft_budget)),250000::bigint,'draft contingency updated');
select is((select count(*)::bigint from public.department_budget_allocations where budget_version_id=(select id from draft_budget)),2::bigint,'allocation rewrite remains complete');

select throws_ok($$select public.update_draft_budget_version((select id from draft_budget),'Bad','2027-01-20'::date,null,0,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000099','original_net_minor',1)))$$,'P0001','Department does not belong to event','invalid department fails before partial rewrite');
select is((select count(*)::bigint from public.department_budget_allocations where budget_version_id=(select id from draft_budget)),2::bigint,'failed rewrite leaves previous allocations intact');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.create_budget_version('30000000-0000-0000-0000-000000000027','President budget',null,null,0,'[]'::jsonb)$$,'P0001','Not authorised','president without treasurer cannot create budget');
select throws_ok($$select public.activate_budget_version((select id from draft_budget))$$,'P0001','Not authorised or not draft','president without treasurer cannot activate budget');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.create_budget_version('30000000-0000-0000-0000-000000000027','Member budget',null,null,0,'[]'::jsonb)$$,'P0001','Not authorised','ordinary member cannot create budget');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select throws_ok($$select public.create_budget_version('30000000-0000-0000-0000-000000000027','Outsider budget',null,null,0,'[]'::jsonb)$$,'P0001','Not authorised','outsider cannot create budget for another event');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.create_budget_version('30000000-0000-0000-0000-000000000027','Negative contingency',null,null,-1,'[]'::jsonb)$$,'P0001','Contingency cannot be negative','negative contingency rejected');
select throws_ok($$select public.create_budget_version('30000000-0000-0000-0000-000000000027','Bad allocation',null,null,0,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','original_net_minor',-1)))$$,'P0001','Invalid allocation amount','negative allocation rejected');
select throws_ok($$select public.create_budget_version('30000000-0000-0000-0000-000000000027','Cross event',null,null,0,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000099','original_net_minor',1)))$$,'P0001','Department does not belong to event','cross-event allocation id is rejected');

select lives_ok($$select public.activate_budget_version((select id from draft_budget))$$,'treasurer activates valid draft');
select is((select status::text from public.budget_versions where id='50000000-0000-0000-0000-000000000001'),'superseded','previous active version becomes superseded');
select is((select count(*)::bigint from public.budget_versions where event_id='30000000-0000-0000-0000-000000000027' and status='active'),1::bigint,'only one active budget remains');
select throws_ok($$select public.update_draft_budget_version((select id from draft_budget),'No edit active',null,null,0,'[]'::jsonb)$$,'P0001','Not authorised or not draft','active budget cannot be edited');
select is((select count(*)::bigint from public.activity_log where entity_id=(select id from draft_budget) and action='budget.activated'),1::bigint,'activation logs activity');

select lives_ok($$select public.transfer_event_contingency('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001',50000,'Extra aesthetics')$$,'treasurer transfers active contingency');
select is((select unallocated_contingency_minor from public.v_active_budget_summaries where event_id='30000000-0000-0000-0000-000000000027'),200000::bigint,'unallocated contingency decreases');
select is((select current_budget_minor from public.v_active_budget_department_positions where department_id='40000000-0000-0000-0000-000000000001'),1250000::bigint,'current department budget includes transfer');
select is((select original_allocation_minor from public.v_active_budget_department_positions where department_id='40000000-0000-0000-0000-000000000001'),1200000::bigint,'original allocation is preserved');
select throws_ok($$select public.transfer_event_contingency('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001',999999999,'Too much')$$,'P0001','Insufficient contingency','transfer cannot overdraw contingency');
select throws_ok($$select public.transfer_event_contingency('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001',0,'Zero')$$,'P0001','Transfer amount must be positive','zero transfer rejected');
select throws_ok($$update public.budget_transfers set reason='Edited' where event_id='30000000-0000-0000-0000-000000000027'$$,'42501',null,'transfer history is immutable to authenticated users');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.transfer_event_contingency('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001',1,'President fail')$$,'P0001','Not authorised','president without treasurer cannot transfer contingency');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select is((select count(*)::bigint from public.v_active_budget_summaries where event_id='30000000-0000-0000-0000-000000000027'),1::bigint,'active committee can view budget summary');

select * from finish();
rollback;
