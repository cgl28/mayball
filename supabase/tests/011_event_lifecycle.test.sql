begin;
create extension if not exists pgtap with schema extensions;
select plan(50);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);

select is(
  (select enum_range(null::public.event_status)::text),
  '{setup,planning,live,reconciliation,completed,archived}',
  'event_status state values are explicit'
);

select ok(exists(select 1 from public.event_completion_readiness('30000000-0000-0000-0000-000000000027') where code='requests_awaiting_approval' and severity='warning' and not blocks_completion),'pending approval readiness warning is present');
select ok(exists(select 1 from public.event_completion_readiness('30000000-0000-0000-0000-000000000027') where code='unpaid_approved_requests' and amount_minor=1080000),'unpaid approved request readiness amount is canonical');
select ok(exists(select 1 from public.event_completion_readiness('30000000-0000-0000-0000-000000000027') where code='private_spending_drafts' and item_count=4),'president sees event-wide draft warning for completion');
select ok(not exists(select 1 from public.event_completion_readiness('30000000-0000-0000-0000-000000000027') where blocks_completion),'seed planning event has no hard blockers');

select is(
  (public.complete_event('30000000-0000-0000-0000-000000000027',false,'Closing review')->>'completed')::boolean,
  false,
  'completion with warnings requires acknowledgement'
);
select is((select status::text from public.events where id='30000000-0000-0000-0000-000000000027'),'planning','unacknowledged completion does not change status');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select throws_ok(
  $$select public.complete_event('30000000-0000-0000-0000-000000000027',true,'Member attempt')$$,
  'P0001',
  'Not authorised',
  'ordinary member cannot complete an event'
);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select throws_ok(
  $$select public.complete_event('30000000-0000-0000-0000-000000000027',true,'Outsider attempt')$$,
  'P0001',
  'Not authorised',
  'separate organisation user cannot complete another event'
);
select throws_ok(
  $$select * from public.event_completion_readiness('30000000-0000-0000-0000-000000000027')$$,
  'P0001',
  'Not authorised',
  'outsider cannot read lifecycle readiness'
);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select throws_ok(
  $$select public.complete_event('30000000-0000-0000-0000-000000000027',true,'Treasurer attempt')$$,
  'P0001',
  'Not authorised',
  'treasurer without president cannot complete an event'
);

create temp table lifecycle_payment as
select public.record_component_payment(
  '30000000-0000-0000-0000-000000000027',
  current_date,
  'Lifecycle Supplier',
  120000,
  'LIFE-PAY-001',
  'bank_transfer',
  'Lifecycle reversal guard',
  jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where code='DMB_AE_3.1'),'gross_minor',120000)),
  'life-pay-001'
) id;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is(
  (public.complete_event('30000000-0000-0000-0000-000000000027',true,'Committee confirmed the event should become historical')->>'completed')::boolean,
  true,
  'president completes event with warning acknowledgement'
);
select is((select status::text from public.events where id='30000000-0000-0000-0000-000000000027'),'completed','event status is completed');
select ok((select completed_at is not null and completed_by='10000000-0000-0000-0000-000000000001' from public.events where id='30000000-0000-0000-0000-000000000027'),'completion actor and timestamp are recorded');
select is((select count(*)::bigint from public.event_lifecycle_history where event_id='30000000-0000-0000-0000-000000000027' and action='completed'),1::bigint,'completion lifecycle history row is written');
select ok(exists(select 1 from public.activity_log where event_id='30000000-0000-0000-0000-000000000027' and action='event.completed'),'completion activity is written');
select throws_ok(
  $$select public.complete_event('30000000-0000-0000-0000-000000000027',true,'Duplicate')$$,
  'P0001',
  'Event completion is blocked',
  'duplicate completion fails safely'
);

select ok(public.can_view_event('30000000-0000-0000-0000-000000000027'),'active organisation member can still view just-completed event');
select is((select count(*)::bigint from public.event_members where event_id='30000000-0000-0000-0000-000000000025' and user_id='10000000-0000-0000-0000-000000000003'),0::bigint,'historical access does not require duplicate event membership');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select ok(public.can_view_event('30000000-0000-0000-0000-000000000025'),'same-organisation member sees earlier historical event');
select ok(public.can_view_event('30000000-0000-0000-0000-000000000027'),'same-organisation member sees newly completed event historically');
select is((select count(*)::bigint from public.spending_requests where id='70000000-0000-0000-0000-000000000002'),0::bigint,'historical member cannot see another member private draft request');
select throws_ok(
  $$select public.create_spending_request_draft('30000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001','Historical draft',null,null,null,null,100,20,120,20,'standard',true,jsonb_build_array(jsonb_build_object('department_id','40000000-0000-0000-0000-000000000001','net_minor',100,'vat_minor',20,'gross_minor',120)),jsonb_build_array(jsonb_build_object('sequence_number',1,'description','One','net_minor',100,'vat_minor',20,'gross_minor',120,'vat_treatment','standard')))$$,
  'P0001',
  'Not authorised',
  'completed event rejects new spending drafts'
);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.update_event_settings('30000000-0000-0000-0000-000000000027','Edited','DMB',2027::smallint,'2027-06-19'::date,'2026-08-01'::date)$$,'P0001','Not authorised','completed event rejects settings updates');
select throws_ok($$select public.create_department('30000000-0000-0000-0000-000000000027','Late Department','LATE',null,null,10::smallint)$$,'P0001','Not authorised','completed event rejects department creation');
select throws_ok($$select public.issue_invitation('30000000-0000-0000-0000-000000000027','late@example.test',array['committee_member']::public.event_role[],array[]::uuid[],14)$$,'P0001','Not authorised','completed event rejects invitation creation');
select throws_ok($$select public.assign_event_role('31000000-0000-0000-0000-000000000003','treasurer')$$,'P0001','Not authorised','completed event rejects role changes');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select throws_ok($$select public.create_budget_version('30000000-0000-0000-0000-000000000027','Late budget',null::date,null::text,0::bigint,'[]'::jsonb)$$,'P0001','Not authorised','completed event rejects budget draft creation');
select throws_ok($$select public.transfer_contingency('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',10000,'Late transfer')$$,'P0001','Not authorised','completed event rejects contingency transfers');
select throws_ok($$select public.record_ticket_sales_snapshot('30000000-0000-0000-0000-000000000027','2027-07-01',1,null,null,120,0,0,'manual_ticket_tailor',null,'[]')$$,'P0001','Not authorised','completed event rejects revenue snapshots');
select throws_ok($$select public.decide_spending_request('70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','approved','Late approval')$$,'P0001','Not authorised','completed event rejects approval decisions');
select throws_ok($$select public.record_component_payment('30000000-0000-0000-0000-000000000027',current_date,'Late Supplier',10000,'LIFE-PAY-LATE','bank_transfer',null,jsonb_build_array(jsonb_build_object('component_id',(select id from public.request_components where code='DMB_AE_3.1'),'gross_minor',10000)),'life-late')$$,'P0001','Not authorised','completed event rejects payment recording');
select throws_ok($$select public.reverse_payment((select id from lifecycle_payment),'Late reversal')$$,'P0001','Not authorised or invalid reversal','completed event rejects payment reversal');

reset role;
select throws_ok(
  $$update public.events set status='archived',completed_at=now(),archived_at=now() where id='30000000-0000-0000-0000-000000000099'$$,
  'P0001',
  'Event lifecycle changes must use lifecycle RPCs',
  'direct lifecycle status updates are blocked even for privileged direct writes'
);
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);

select throws_ok($$select public.archive_event('30000000-0000-0000-0000-000000000099','Wrong organisation')$$,'P0001','Not authorised','president cannot archive another organisation event');
select throws_ok($$select public.archive_event('30000000-0000-0000-0000-000000000025','Seed historical archive')$$,'P0001','Not authorised','historical role absence does not grant archive authority');
select throws_ok($$select public.archive_event('30000000-0000-0000-0000-000000000027','')$$,'P0001','Archive reason required','archive requires a reason');
select is((public.archive_event('30000000-0000-0000-0000-000000000027','Long-term historical classification')->>'archived')::boolean,true,'president archives completed event');
select is((select status::text from public.events where id='30000000-0000-0000-0000-000000000027'),'archived','event status is archived');
select ok(public.can_view_event('30000000-0000-0000-0000-000000000027'),'archived event remains historically visible');
select is((select count(*)::bigint from public.event_lifecycle_history where event_id='30000000-0000-0000-0000-000000000027'),2::bigint,'archive appends lifecycle history');

select throws_ok($$select public.reopen_event('30000000-0000-0000-0000-000000000027','')$$,'P0001','Reopen reason required','reopen requires a reason');
select is((public.reopen_event('30000000-0000-0000-0000-000000000027','Correction needed for late supplier issue')->>'reopened')::boolean,true,'president reopens archived event exceptionally');
select is((select status::text from public.events where id='30000000-0000-0000-0000-000000000027'),'reconciliation','reopening returns event to reconciliation');
select ok((select reopened_at is not null and reopened_by='10000000-0000-0000-0000-000000000001' from public.events where id='30000000-0000-0000-0000-000000000027'),'reopen actor and timestamp are recorded');
select is((select count(*)::bigint from public.event_lifecycle_history where event_id='30000000-0000-0000-0000-000000000027'),3::bigint,'reopen preserves and appends lifecycle history');
select is((select count(*)::bigint from public.payments where event_id='30000000-0000-0000-0000-000000000027'),1::bigint,'reopening does not delete payment history');
select lives_ok($$select public.create_department('30000000-0000-0000-0000-000000000027','Reopened Ops','ROPS',null,null,11::smallint)$$,'reopened event restores normal president setup mutations');
select lives_ok($$select public.complete_event('30000000-0000-0000-0000-000000000027',true,'Re-completed after correction')$$,'reopened event can be completed again with history preserved');
select is((select count(*)::bigint from public.event_lifecycle_history where event_id='30000000-0000-0000-0000-000000000027' and action='completed'),2::bigint,'recompletion creates another completion history row');

select * from finish();
rollback;
