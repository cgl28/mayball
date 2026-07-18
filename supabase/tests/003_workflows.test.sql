begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
create temp table made as select * from public.create_spending_request('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000002','Test act','Workflow fixture',100000,20000,'standard',current_date+30);
select matches(request_code,'^DMB_ME_[0-9]+$','request code generated') from made;
select results_eq($$select approval_status::text from public.spending_requests where id=(select request_id from made)$$,$$values('draft')$$,'request begins draft');
select lives_ok($$select public.submit_spending_request((select request_id from made))$$,'owner submits request');
select results_eq($$select approval_status::text from public.spending_requests where id=(select request_id from made)$$,$$values('submitted')$$,'request submitted');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.decide_spending_request((select request_id from made),(select revision_id from made),'approved',null)$$,'treasurer approves request');
select results_eq($$select approval_status::text from public.spending_requests where id=(select request_id from made)$$,$$values('approved')$$,'request approved');
select results_eq($$select payment_status from public.v_request_payment_positions where request_id=(select request_id from made)$$,$$values('unpaid')$$,'approved request starts unpaid');
select lives_ok($$select public.record_payment('30000000-0000-0000-0000-000000000027',current_date,'Test supplier',120000,'TEST-001',array[(select id from public.request_components where revision_id=(select revision_id from made))],array[120000::bigint])$$,'treasurer records payment');
select results_eq($$select payment_status from public.v_request_payment_positions where request_id=(select request_id from made)$$,$$values('paid')$$,'full payment derives paid status');
select results_eq($$select count(*)::bigint from public.activity_log where entity_id=(select request_id from made)$$,$$values(3::bigint)$$,'request create, submission and approval activity exists');

select * from finish();
rollback;
