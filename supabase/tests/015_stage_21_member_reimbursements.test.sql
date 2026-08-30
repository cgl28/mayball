begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);

select is((select request_kind::text from public.spending_requests where code='DMB_AE_1'),'supplier_purchase','existing requests default to supplier purchase');

create temp table reimbursement as
select * from public.create_member_reimbursement_draft(
  '30000000-0000-0000-0000-000000000027',
  '40000000-0000-0000-0000-000000000001',
  'Emergency supplies', 'Bought personally for the event', current_date - 1,
  8450, 0, 8450, null, 'unknown', false
);

select is((select request_kind::text from public.spending_requests where id=(select request_id from reimbursement)),'member_reimbursement','claim uses a stable reimbursement subtype');
select is((select owner_user_id from public.spending_requests where id=(select request_id from reimbursement)),'10000000-0000-0000-0000-000000000003'::uuid,'claimant derives from auth identity');
select is((select expense_date from public.spending_requests where id=(select request_id from reimbursement)),current_date - 1,'expense date is retained on the stable request');
select is((select count(*)::bigint from public.request_components where revision_id=(select revision_id from reimbursement)),1::bigint,'claim creates one reimbursement component');
select is((select description from public.request_components where revision_id=(select revision_id from reimbursement)),'Reimbursement','claim component has the normal reimbursement label');
select throws_ok($$select public.submit_spending_request((select request_id from reimbursement))$$,'P0001','Add an expense claim form and at least one receipt before submitting this reimbursement','claim form and receipt are required before reimbursement submission');

create temp table claim_receipt as
select * from public.begin_document_upload(
  '30000000-0000-0000-0000-000000000027',(select request_id from reimbursement),null,null,
  'receipt','Emergency supplies receipt.pdf','application/pdf',123,'Receipt'
);
insert into storage.objects(bucket_id,name,owner,metadata)
select bucket_id,object_path,'10000000-0000-0000-0000-000000000003'::uuid,jsonb_build_object('size',123,'mimetype','application/pdf') from claim_receipt;
select lives_ok($$select public.finalise_document_upload((select document_id from claim_receipt),123,'application/pdf')$$,'claimant finalises a stable request receipt');
select throws_ok($$select public.submit_spending_request((select request_id from reimbursement))$$,'P0001','Add an expense claim form before submitting this reimbursement','claim form is required when a receipt exists');

create temp table claim_form as
select * from public.begin_document_upload(
  '30000000-0000-0000-0000-000000000027',(select request_id from reimbursement),null,null,
  'expense_claim_form','Emergency supplies expense claim.pdf','application/pdf',123,'Expense claim form'
);
insert into storage.objects(bucket_id,name,owner,metadata)
select bucket_id,object_path,'10000000-0000-0000-0000-000000000003'::uuid,jsonb_build_object('size',123,'mimetype','application/pdf') from claim_form;
select lives_ok($$select public.finalise_document_upload((select document_id from claim_form),123,'application/pdf')$$,'claimant finalises the expense claim form');
select is((select count(*)::bigint from public.documents where request_id=(select request_id from reimbursement) and category='invoice'),0::bigint,'an invoice is not required for reimbursement submission');
select lives_ok($$select public.submit_spending_request((select request_id from reimbursement))$$,'claimant submits reimbursement after claim form and receipt');
select is((select approval_status::text from public.spending_requests where id=(select request_id from reimbursement)),'submitted','claim enters the normal approval queue');
select is((select action from public.activity_log where entity_id=(select request_id from reimbursement) and action='request.reimbursement_submitted'),'request.reimbursement_submitted','submission audit action identifies reimbursement');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select is((select count(*)::bigint from public.spending_requests where id=(select request_id from reimbursement)),1::bigint,'submitted claim is visible to another active committee member');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
create temp table private_claim as
select * from public.create_member_reimbursement_draft('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Private expense','Private draft',current_date,100,0,100,null,'unknown',false);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select is((select count(*)::bigint from public.spending_requests where id=(select request_id from private_claim)),0::bigint,'another committee member cannot view a private reimbursement draft');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.decide_spending_request((select request_id from reimbursement),(select revision_id from reimbursement),'approved',null)$$,'treasurer approves the reimbursement through normal approval');
select is((select approved_net_minor from public.v_request_payment_positions where request_id=(select request_id from reimbursement)),8450::bigint,'approved reimbursement has normal commitment position');
select is((select request_kind::text from public.v_request_component_payment_positions where request_id=(select request_id from reimbursement)),'member_reimbursement','payment workload retains reimbursement type');
select is(
  (select claimant_display_name from public.v_request_component_payment_positions where request_id=(select request_id from reimbursement)),
  (select display_name from public.profiles where id='10000000-0000-0000-0000-000000000003'),
  'payment workload exposes claimant display name'
);
select lives_ok($$select public.record_component_payment('30000000-0000-0000-0000-000000000027',current_date,'Member A',4000,'REIMB-PART','bank_transfer',null,jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where revision_id=(select revision_id from reimbursement)),'gross_minor',4000)),'reimbursement-part')$$,'treasurer can make a partial reimbursement payment');
select is((select payment_status from public.v_request_payment_positions where request_id=(select request_id from reimbursement)),'partially_paid','partial reimbursement uses the normal derived payment state');

select * from finish();
rollback;
