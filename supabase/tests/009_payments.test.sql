begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);

select isnt_empty(
  $$select request_component_id from public.v_request_component_payment_positions where event_id='30000000-0000-0000-0000-000000000027' and request_code='DMB_AE_3'$$,
  'approved current components are available as payment targets'
);

create temp table first_payment as
select public.record_component_payment(
  '30000000-0000-0000-0000-000000000027',
  current_date,
  'Stage Supplier',
  240000,
  'PAY-STAGE7-001',
  'bank_transfer',
  'Partial staging payment',
  jsonb_build_array(jsonb_build_object(
    'component_id',(select id from public.request_components where code='DMB_AE_3.1'),
    'gross_minor',240000
  )),
  'stage7-partial'
) id;

select ok((select id is not null from first_payment),'treasurer records a component payment');
select is((select payment_status from public.v_request_payment_positions where request_id='70000000-0000-0000-0000-000000000006'),'partially_paid','partial payment derives partially paid status');
select is((select outstanding_gross_minor from public.v_request_component_payment_positions where request_code='DMB_AE_3' and component_code='DMB_AE_3.1'),480000::bigint,'component outstanding amount is derived');

create temp table repeated_payment as
select public.record_component_payment(
  '30000000-0000-0000-0000-000000000027',
  current_date,
  'Stage Supplier',
  240000,
  'PAY-STAGE7-001',
  'bank_transfer',
  'Retried partial staging payment',
  jsonb_build_array(jsonb_build_object(
    'component_id',(select id from public.request_components where code='DMB_AE_3.1'),
    'gross_minor',240000
  )),
  'stage7-partial'
) id;

select is((select id from repeated_payment),(select id from first_payment),'idempotency key returns the existing payment');
select is((select count(*)::bigint from public.payments where idempotency_key='stage7-partial'),1::bigint,'idempotent retry does not create a duplicate payment');

create temp table second_payment as
select public.record_component_payment(
  '30000000-0000-0000-0000-000000000027',
  current_date,
  'Stage Supplier',
  480000,
  'PAY-STAGE7-002',
  'bank_transfer',
  'Final staging payment',
  jsonb_build_array(jsonb_build_object(
    'component_id',(select id from public.request_components where code='DMB_AE_3.1'),
    'gross_minor',480000
  )),
  'stage7-final'
) id;

select is((select payment_status from public.v_request_payment_positions where request_id='70000000-0000-0000-0000-000000000006'),'paid','full allocation derives paid status');
select lives_ok($$select public.reverse_payment((select id from second_payment),'Duplicate bank entry')$$,'treasurer can reverse an erroneous payment');
select is((select status::text from public.payments where id=(select id from second_payment)),'reversed','reversal preserves the payment row with reversed status');
select is((select payment_status from public.v_request_payment_positions where request_id='70000000-0000-0000-0000-000000000006'),'partially_paid','reversed payment is excluded from derived totals');
select is((select count(*)::bigint from public.v_payment_details where event_id='30000000-0000-0000-0000-000000000027' and status='reversed'),1::bigint,'payment history includes reversed records');

select throws_ok(
  $$select public.record_component_payment('30000000-0000-0000-0000-000000000027',current_date,'Stage Supplier',500000,'PAY-STAGE7-OVER','bank_transfer',null,jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where code='DMB_AE_3.1'),'gross_minor',500000)),'stage7-over')$$,
  'P0001',
  'Payment allocations exceed approved component amount',
  'component overpayment is rejected'
);

select throws_ok(
  $$select public.record_component_payment('30000000-0000-0000-0000-000000000027',current_date,'Cambridge Florals',10000,'PAY-STAGE7-UNAPPROVED','bank_transfer',null,jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where code='DMB_AE_2.1'),'gross_minor',10000)),'stage7-unapproved')$$,
  'P0001',
  'Payment cannot target an unapproved component',
  'unapproved submitted components cannot be paid'
);

select throws_ok(
  $$select public.record_component_payment('30000000-0000-0000-0000-000000000027',current_date,'Cambridge Florals',20000,'PAY-STAGE7-DUP','bank_transfer',null,jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where code='DMB_AE_4.1' and revision_id='71000000-0000-0000-0000-000000000009'),'gross_minor',10000),jsonb_build_object('component_id',(select id from public.request_components where code='DMB_AE_4.1' and revision_id='71000000-0000-0000-0000-000000000009'),'gross_minor',10000)),'stage7-dup')$$,
  'P0001',
  'Duplicate payment component allocation',
  'duplicate component allocations in one payment are rejected'
);

select lives_ok(
  $$select public.record_payment('30000000-0000-0000-0000-000000000027',current_date,'Cambridge Florals',10000,'PAY-STAGE7-OLD',array[(select id from public.request_components where code='DMB_AE_4.1' and revision_id='71000000-0000-0000-0000-000000000009')],array[10000::bigint])$$,
  'legacy record_payment RPC remains executable'
);

select lives_ok(
  $$select public.decide_spending_request('70000000-0000-0000-0000-000000000009','71000000-0000-0000-0000-000000000019','approved','Approved increase')$$,
  'treasurer can approve an upward variation after a partial payment'
);
select is((select current_approved_revision_id from public.spending_requests where id='70000000-0000-0000-0000-000000000009'),'71000000-0000-0000-0000-000000000019'::uuid,'upward variation becomes the current approved baseline');
select throws_ok(
  $$select public.record_component_payment('30000000-0000-0000-0000-000000000027',current_date,'Cambridge Florals',10000,'PAY-STAGE7-SUPERSEDED','bank_transfer',null,jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where code='DMB_AE_4.1' and revision_id='71000000-0000-0000-0000-000000000009'),'gross_minor',10000)),'stage7-superseded')$$,
  'P0001',
  'Payment cannot target an unapproved component',
  'new payments cannot target superseded components'
);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select throws_ok(
  $$select public.record_component_payment('30000000-0000-0000-0000-000000000027',current_date,'Stage Supplier',10000,'PAY-STAGE7-MEMBER','bank_transfer',null,jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where code='DMB_AE_3.1'),'gross_minor',10000)),'stage7-member')$$,
  'P0001',
  'Not authorised',
  'ordinary member cannot record payment'
);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select throws_ok(
  $$select public.reverse_payment((select id from first_payment),'President attempt')$$,
  'P0001',
  'Not authorised or invalid reversal',
  'president without treasurer cannot reverse payments'
);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select is((select count(*)::bigint from public.v_payment_details where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'separate organisation user cannot enumerate Downing payments');

reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select throws_ok(
  $$update public.payments set payee='Edited supplier' where id=(select id from first_payment)$$,
  'P0001',
  'Payment records are immutable except reversal metadata',
  'recorded payment facts cannot be edited'
);

select throws_ok(
  $$delete from public.payment_allocations where payment_id=(select id from first_payment)$$,
  'P0001',
  'Payment allocations are append-only',
  'payment allocations cannot be deleted'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
create temp table downward as
  select * from public.create_spending_request_draft(
    '30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Paid variation floor',null,null,'Fixture Supplier',current_date+30,100000,20000,120000,20,'standard',true,
    jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',100000,'vat_minor',20000,'gross_minor',120000)),
    jsonb_build_array(jsonb_build_object('sequence_number',1,'description','Original','net_minor',100000,'vat_minor',20000,'gross_minor',120000,'vat_treatment','standard'))
  );
select lives_ok($$select public.submit_spending_request((select request_id from downward))$$,'owner submits request for downward-variation test');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.decide_spending_request((select request_id from downward),(select revision_id from downward),'approved',null)$$,'treasurer approves request for downward-variation test');
select lives_ok($$select public.record_component_payment('30000000-0000-0000-0000-000000000027',current_date,'Fixture Supplier',120000,'PAY-STAGE7-FLOOR','bank_transfer',null,jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where revision_id=(select revision_id from downward)),'gross_minor',120000)),'stage7-floor')$$,'treasurer pays the approved baseline');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.start_request_variation((select request_id from downward))$$,'owner starts downward variation');
select lives_ok($$select public.update_spending_request_draft((select request_id from downward),'40000000-0000-0000-0000-000000000001','Paid variation floor reduced',null,null,'Fixture Supplier',current_date+30,50000,10000,60000,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',50000,'vat_minor',10000,'gross_minor',60000)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','Reduced','net_minor',50000,'vat_minor',10000,'gross_minor',60000,'vat_treatment','standard')),'Reduced below paid total')$$,'owner edits variation below paid amount');
select lives_ok($$select public.submit_spending_request((select request_id from downward))$$,'owner submits downward variation');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select throws_ok(
  $$select public.decide_spending_request((select request_id from downward),(select id from public.spending_request_revisions where request_id=(select request_id from downward) and status='submitted' order by revision_number desc limit 1),'approved','Below paid')$$,
  'P0001',
  'Approved variation cannot be below active payments',
  'downward variation below active payments is blocked'
);

select * from finish();
rollback;
