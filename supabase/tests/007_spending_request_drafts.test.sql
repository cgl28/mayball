begin;
create extension if not exists pgtap with schema extensions;
select plan(48);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
create temp table made as
  select * from public.create_spending_request_draft(
    '30000000-0000-0000-0000-000000000027',
    '40000000-0000-0000-0000-000000000001',
    'Runtime draft request',
    'Created by Member A',
    'Useful for Stage 5 tests',
    'Draft Supplier',
    current_date + 20,
    100000,
    20000,
    120000,
    20.00,
    'standard',
    true,
    jsonb_build_array(
      jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',70000,'vat_minor',14000,'gross_minor',84000),
      jsonb_build_object('department_id','40000000-0000-0000-0000-000000000004','net_minor',30000,'vat_minor',6000,'gross_minor',36000)
    ),
    jsonb_build_array(
      jsonb_build_object('sequence_number',1,'description','Deposit','expected_payment_date',(current_date+10)::text,'supplier_name','Draft Supplier','net_minor',40000,'vat_minor',8000,'gross_minor',48000,'vat_rate',20,'vat_treatment','standard'),
      jsonb_build_object('sequence_number',2,'description','Balance','expected_payment_date',(current_date+20)::text,'supplier_name','Draft Supplier','net_minor',60000,'vat_minor',12000,'gross_minor',72000,'vat_rate',20,'vat_treatment','standard')
    )
  );

select matches((select request_code from made),'^DMB_AE_[0-9]+$','request reference is generated in PostgreSQL');
select is((select owner_user_id from public.spending_requests where id=(select request_id from made)),'10000000-0000-0000-0000-000000000003'::uuid,'creator derives from auth.uid');
select is((select approval_status::text from public.spending_requests where id=(select request_id from made)),'draft','new request starts draft');
select is((select count(*)::bigint from public.spending_request_department_allocations where revision_id=(select revision_id from made)),2::bigint,'multi-department allocations are created');
select is((select count(*)::bigint from public.request_components where revision_id=(select revision_id from made)),2::bigint,'multi-component draft is created');
select is((select sum(gross_minor)::bigint from public.spending_request_department_allocations where revision_id=(select revision_id from made)),120000::bigint,'allocation gross reconciles');
select is((select sum(gross_minor)::bigint from public.request_components where revision_id=(select revision_id from made)),120000::bigint,'component gross reconciles');
select is((select count(*)::bigint from public.activity_log where entity_id=(select request_id from made) and action='request.created'),1::bigint,'draft creation logs private activity');
select throws_ok($$select public.insert_request_allocations('30000000-0000-0000-0000-000000000027',(select revision_id from made),'[]'::jsonb)$$,'42501',null,'allocation helper is not directly executable');
select throws_ok($$select public.insert_request_components('30000000-0000-0000-0000-000000000027',(select revision_id from made),'DMB_AE_X','[]'::jsonb)$$,'42501',null,'component helper is not directly executable');

select throws_ok($$select public.create_spending_request_draft('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Bad reconciliation',null,null,null,null,100,20,119,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',100,'vat_minor',20,'gross_minor',120)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100,'vat_minor',20,'gross_minor',120,'vat_treatment','standard')))$$,'P0001','Request net and VAT must equal gross','invalid request money fails');
select throws_ok($$select public.create_spending_request_draft('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Bad allocation',null,null,null,null,100,20,120,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000099','net_minor',100,'vat_minor',20,'gross_minor',120)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100,'vat_minor',20,'gross_minor',120,'vat_treatment','standard')))$$,'P0001','Department does not belong to event','cross-event department allocation fails');
select throws_ok($$select public.create_spending_request_draft('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Bad component',null,null,null,null,100,20,120,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',100,'vat_minor',20,'gross_minor',120)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100,'vat_minor',20,'gross_minor',119,'vat_treatment','standard')))$$,'P0001','Component net and VAT must equal gross','invalid component money fails');
select throws_ok($$select public.create_spending_request_draft('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Duplicate allocation',null,null,null,null,100,20,120,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',50,'vat_minor',10,'gross_minor',60),jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',50,'vat_minor',10,'gross_minor',60)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100,'vat_minor',20,'gross_minor',120,'vat_treatment','standard')))$$,null,null,'duplicate department allocation fails');
select throws_ok($$select public.create_spending_request_draft('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Duplicate component',null,null,null,null,100,20,120,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',100,'vat_minor',20,'gross_minor',120)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',50,'vat_minor',10,'gross_minor',60,'vat_treatment','standard'),jsonb_build_object('sequence_number',1,'description','Two','net_minor',50,'vat_minor',10,'gross_minor',60,'vat_treatment','standard')))$$,null,null,'duplicate component sequence fails');

select count(*) before_bad from public.spending_requests \gset
select throws_ok($$select public.create_spending_request_draft('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Atomic bad',null,null,null,null,100,20,120,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',99,'vat_minor',20,'gross_minor',119)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100,'vat_minor',20,'gross_minor',120,'vat_treatment','standard')))$$,'P0001','Department allocations do not reconcile','failed atomic create raises reconciliation error');
select is((select count(*)::integer from public.spending_requests),:'before_bad'::integer,'failed create leaves no partial request');

select lives_ok($$select public.update_spending_request_draft((select request_id from made),'40000000-0000-0000-0000-000000000002','Runtime draft updated','Updated by owner','Still useful','Updated Supplier',current_date+30,120000,24000,144000,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000002','net_minor',120000,'vat_minor',24000,'gross_minor',144000)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','Updated component','net_minor',120000,'vat_minor',24000,'gross_minor',144000,'vat_treatment','standard')))$$,'creator can edit own draft atomically');
select is((select title from public.v_spending_request_current_revisions where request_id=(select request_id from made)),'Runtime draft updated','draft edit persists');
select is((select count(*)::bigint from public.spending_request_department_allocations where revision_id=(select revision_id from made)),1::bigint,'draft allocation rewrite persists');

create temp table split_made as
  select * from public.create_spending_request_draft(
    '30000000-0000-0000-0000-000000000027',
    '40000000-0000-0000-0000-000000000001',
    'Split rounding request',
    'Two instalments with balanced residual pennies',
    null,
    'Split Supplier',
    current_date + 10,
    166667,
    33333,
    200000,
    20,
    'standard',
    true,
    jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',166667,'vat_minor',33333,'gross_minor',200000)),
    jsonb_build_array(
      jsonb_build_object('sequence_number',1,'description','Deposit','expected_payment_date',(current_date+10)::text,'net_minor',83333,'vat_minor',16667,'gross_minor',100000,'vat_rate',20,'vat_treatment','standard'),
      jsonb_build_object('sequence_number',2,'description','Final Payment','expected_payment_date',(current_date+20)::text,'net_minor',83334,'vat_minor',16666,'gross_minor',100000,'vat_rate',20,'vat_treatment','standard')
    )
  );
select is((select sum(net_minor)::bigint from public.request_components where revision_id=(select revision_id from split_made)),166667::bigint,'two-component split net reconciles exactly');
select lives_ok($$select public.submit_spending_request((select request_id from split_made))$$,'creator can submit two-component split request');

create temp table three_component_made as
  select * from public.create_spending_request_draft(
    '30000000-0000-0000-0000-000000000027',
    '40000000-0000-0000-0000-000000000001',
    'Three instalment request',
    'Three instalments with balanced component rows',
    null,
    'Split Supplier',
    current_date + 10,
    166667,
    33333,
    200000,
    20,
    'standard',
    true,
    jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',166667,'vat_minor',33333,'gross_minor',200000)),
    jsonb_build_array(
      jsonb_build_object('sequence_number',1,'description','Deposit','expected_payment_date',(current_date+10)::text,'net_minor',41667,'vat_minor',8333,'gross_minor',50000,'vat_rate',20,'vat_treatment','standard'),
      jsonb_build_object('sequence_number',2,'description','Second instalment','expected_payment_date',(current_date+20)::text,'net_minor',41667,'vat_minor',8333,'gross_minor',50000,'vat_rate',20,'vat_treatment','standard'),
      jsonb_build_object('sequence_number',3,'description','Final Payment','expected_payment_date',(current_date+30)::text,'net_minor',83333,'vat_minor',16667,'gross_minor',100000,'vat_rate',20,'vat_treatment','standard')
    )
  );
select is((select count(*)::bigint from public.request_components where revision_id=(select revision_id from three_component_made)),3::bigint,'three-component split is created');
select lives_ok($$select public.submit_spending_request((select request_id from three_component_made))$$,'creator can submit three-component split request');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select is((select count(*)::bigint from public.spending_requests where id=(select request_id from made)),0::bigint,'Member B cannot retrieve Member A draft by direct request ID');
select is((select count(*)::bigint from public.v_spending_request_current_revisions where request_id=(select request_id from made)),0::bigint,'Member B cannot retrieve Member A draft through current view');
select is((select count(*)::bigint from public.v_spending_request_current_revisions where approval_status='draft'),1::bigint,'Member B count only includes their own visible draft');
select throws_ok($$select public.update_spending_request_draft((select request_id from made),'40000000-0000-0000-0000-000000000002','Member B edit',null,null,null,null,120000,24000,144000,20,'standard',true,'[]'::jsonb,'[]'::jsonb)$$,'P0001','Not authorised or not draft','ordinary member cannot edit another draft');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select count(*)::bigint from public.spending_requests where id=(select request_id from made)),0::bigint,'president without treasurer cannot retrieve another draft');
select throws_ok($$select public.update_spending_request_draft((select request_id from made),'40000000-0000-0000-0000-000000000002','President edit',null,null,null,null,120000,24000,144000,20,'standard',true,'[]'::jsonb,'[]'::jsonb)$$,'P0001','Not authorised or not draft','president cannot edit another draft');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*)::bigint from public.spending_requests where id=(select request_id from made)),1::bigint,'treasurer can retrieve Member A draft');
select is((select count(*)::bigint from public.v_spending_request_current_revisions where request_id=(select request_id from made)),1::bigint,'treasurer can retrieve draft through current view');
select throws_ok($$select public.update_spending_request_draft((select request_id from made),'40000000-0000-0000-0000-000000000002','Treasurer edit',null,null,null,null,120000,24000,144000,20,'standard',true,'[]'::jsonb,'[]'::jsonb)$$,'P0001','Not authorised or not draft','treasurer cannot edit another creator draft');
select throws_ok($$select public.submit_spending_request((select request_id from made))$$,'P0001','Not authorised','treasurer cannot submit another creator draft');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.submit_spending_request((select request_id from made))$$,'creator can submit valid draft');
select is((select approval_status::text from public.spending_requests where id=(select request_id from made)),'submitted','submission changes request status only to submitted');
select is((select status::text from public.spending_request_revisions where id=(select revision_id from made)),'submitted','submission marks revision submitted');
select is((select payment_status from public.v_request_payment_positions where request_id=(select request_id from made)),'not_applicable','submission does not approve or pay the request');
select is((select count(*)::bigint from public.activity_log where entity_id=(select request_id from made) and action='request.submitted'),1::bigint,'submission logs activity');
select throws_ok($$select public.submit_spending_request((select request_id from made))$$,'P0001','Request is not editable','duplicate submission fails safely');
update public.spending_request_revisions set title='Edited submitted' where id=(select revision_id from made);
select is((select title from public.spending_request_revisions where id=(select revision_id from made)),'Runtime draft updated','submitted revision cannot be directly edited by authenticated user');
update public.spending_request_department_allocations set gross_minor=1 where revision_id=(select revision_id from made);
select is((select sum(gross_minor)::bigint from public.spending_request_department_allocations where revision_id=(select revision_id from made)),144000::bigint,'submitted allocations cannot be directly edited by authenticated user');
update public.request_components set gross_minor=1 where revision_id=(select revision_id from made);
select is((select sum(gross_minor)::bigint from public.request_components where revision_id=(select revision_id from made)),144000::bigint,'submitted components cannot be directly edited by authenticated user');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select is((select count(*)::bigint from public.spending_requests where id=(select request_id from made)),1::bigint,'submitted request becomes visible to active committee member');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select throws_ok($$select public.create_spending_request_draft('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Outsider draft',null,null,null,null,100,20,120,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',100,'vat_minor',20,'gross_minor',120)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100,'vat_minor',20,'gross_minor',120,'vat_treatment','standard')))$$,'P0001','Not authorised','outsider cannot create Downing request');
select is((select count(*)::bigint from public.v_spending_request_current_revisions where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'outsider cannot see Downing requests through view');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.create_spending_request_draft('30000000-0000-0000-0000-000000000025','40000000-0000-0000-0000-000000000025','Historical draft',null,null,null,null,100,20,120,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000025','net_minor',100,'vat_minor',20,'gross_minor',120)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100,'vat_minor',20,'gross_minor',120,'vat_treatment','standard')))$$,'P0001','Not authorised','historical event rejects draft creation');
select is((select count(*)::bigint from public.v_spending_request_current_revisions where event_id='30000000-0000-0000-0000-000000000025'),1::bigint,'same-organisation member can view historical submitted request');

select * from finish();
rollback;
