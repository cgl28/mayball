begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*)::bigint from public.v_approval_queue where event_id='30000000-0000-0000-0000-000000000027'),2::bigint,'treasurer sees seeded submitted request and pending variation in approval queue');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select count(*)::bigint from public.v_approval_queue where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'president without treasurer sees no actionable queue rows');
select throws_ok($$select public.decide_spending_request('70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','approved',null)$$,'P0001','Not authorised','president without treasurer cannot approve');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select throws_ok($$select public.decide_spending_request('70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','approved',null)$$,'P0001','Not authorised','ordinary member cannot approve');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select is((select count(*)::bigint from public.v_approval_queue where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'outsider cannot see Downing approval queue rows');
select throws_ok($$select public.decide_spending_request('70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','approved',null)$$,'P0001','Not authorised','outsider cannot approve cross-organisation request');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.decide_spending_request('70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','approved',null)$$,'treasurer can approve submitted request');
select is((select approval_status::text from public.spending_requests where id='70000000-0000-0000-0000-000000000004'),'approved','approved request status is recorded');
select is((select current_approved_revision_id from public.spending_requests where id='70000000-0000-0000-0000-000000000004'),'71000000-0000-0000-0000-000000000004'::uuid,'approved revision pointer is recorded');
select is((select status::text from public.spending_request_revisions where id='71000000-0000-0000-0000-000000000004'),'approved','revision is marked approved');
select is((select count(*)::bigint from public.request_reviews where revision_id='71000000-0000-0000-0000-000000000004' and decision='approved'),1::bigint,'approval review record is appended');
select is((select count(*)::bigint from public.activity_log where entity_id='70000000-0000-0000-0000-000000000004' and action='request.approved'),1::bigint,'approval activity is recorded');
select is((select payment_status from public.v_request_payment_positions where request_id='70000000-0000-0000-0000-000000000004'),'unpaid','approval does not mark request paid');
select is((select count(*)::bigint from public.payments where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'approval does not create a payment');
select throws_ok($$select public.decide_spending_request('70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','approved',null)$$,'P0001','Revision is not awaiting decision','duplicate approval fails safely');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
create temp table cr as
  select * from public.create_spending_request_draft(
    '30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000002','Change request fixture',null,null,'Supplier',current_date+30,100000,20000,120000,20,'standard',true,
    jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000002','net_minor',100000,'vat_minor',20000,'gross_minor',120000)),
    jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100000,'vat_minor',20000,'gross_minor',120000,'vat_treatment','standard'))
  );
select lives_ok($$select public.submit_spending_request((select request_id from cr))$$,'owner submits change-request fixture');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.decide_spending_request((select request_id from cr),(select revision_id from cr),'changes_requested','Please add a second quote')$$,'treasurer can request changes');
select is((select approval_status::text from public.spending_requests where id=(select request_id from cr)),'changes_requested','request moves to changes requested');
select is((select status::text from public.spending_request_revisions where id=(select revision_id from cr)),'changes_requested','submitted revision remains preserved as changes-requested history');
select is((select count(*)::bigint from public.spending_request_revisions where request_id=(select request_id from cr)),2::bigint,'changes requested creates a cloned editable revision');
select is((select change_summary from public.spending_request_revisions where request_id=(select request_id from cr) and status='draft'),'Please add a second quote','change instructions are copied to the new editable revision');
select throws_ok($$select public.update_spending_request_draft((select request_id from cr),'40000000-0000-0000-0000-000000000002','Treasurer edit',null,null,null,null,100000,20000,120000,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000002','net_minor',100000,'vat_minor',20000,'gross_minor',120000)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100000,'vat_minor',20000,'gross_minor',120000,'vat_treatment','standard')),'Updated')$$,'P0001','Not authorised or not draft','treasurer cannot edit creator changes-requested revision');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.update_spending_request_draft((select request_id from cr),'40000000-0000-0000-0000-000000000002','Change request updated',null,null,'Supplier',current_date+35,120000,24000,144000,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000002','net_minor',120000,'vat_minor',24000,'gross_minor',144000)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','Updated','net_minor',120000,'vat_minor',24000,'gross_minor',144000,'vat_treatment','standard')),'Addressed quote request')$$,'creator can edit cloned changes-requested revision');
select lives_ok($$select public.submit_spending_request((select request_id from cr))$$,'creator can resubmit cloned revision');
select is((select approval_status::text from public.spending_requests where id=(select request_id from cr)),'submitted','resubmission returns to approval queue');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.start_request_variation('70000000-0000-0000-0000-000000000004')$$,'creator can start variation for own approved request');
select is((select approval_status::text from public.spending_requests where id='70000000-0000-0000-0000-000000000004'),'approved','approved request status remains approved while variation draft is private');
select lives_ok($$select public.update_spending_request_draft('70000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000001','Floral arch expanded',null,null,'Cambridge Florals','2027-05-20',500000,100000,600000,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',500000,'vat_minor',100000,'gross_minor',600000)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','Expanded floral arch','net_minor',500000,'vat_minor',100000,'gross_minor',600000,'vat_treatment','standard')),'Expanded entrance design')$$,'creator can edit variation draft');
select lives_ok($$select public.submit_spending_request('70000000-0000-0000-0000-000000000004')$$,'creator can submit variation');
select is((select approval_status::text from public.spending_requests where id='70000000-0000-0000-0000-000000000004'),'variation_pending','submitted variation is pending');
select is((select current_approved_revision_id from public.spending_requests where id='70000000-0000-0000-0000-000000000004'),'71000000-0000-0000-0000-000000000004'::uuid,'approved baseline remains canonical while variation is pending');
select is((select gross_minor from public.v_spending_request_current_revisions where request_id='70000000-0000-0000-0000-000000000004'),600000::bigint,'current request view shows pending variation revision for review');
select is((select pending_net_minor from public.v_department_spending_positions where department_id='40000000-0000-0000-0000-000000000001'),220000::bigint,'pending variations count only incremental net exposure');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.decide_spending_request('70000000-0000-0000-0000-000000000004',(select id from public.spending_request_revisions where request_id='70000000-0000-0000-0000-000000000004' and status='submitted' order by revision_number desc limit 1),'rejected','Too expensive')$$,'treasurer can reject variation');
select is((select approval_status::text from public.spending_requests where id='70000000-0000-0000-0000-000000000004'),'approved','rejected variation leaves request approved');
select is((select current_approved_revision_id from public.spending_requests where id='70000000-0000-0000-0000-000000000004'),'71000000-0000-0000-0000-000000000004'::uuid,'rejected variation does not replace approved baseline');

select * from finish();
rollback;
