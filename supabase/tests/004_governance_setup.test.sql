begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000007',true);
create temp table bootstrapped as
  select * from public.create_organisation_and_event(
    'Clare May Ball',
    'clare-may-ball',
    'Clare May Ball 2028',
    'CMB',
    2028::smallint,
    '2028-06-17'::date,
    '2027-08-01'::date,
    null::text,
    'setup'::public.event_status,
    false
  );
select ok((select organisation_id is not null and event_id is not null from bootstrapped),'organisation and first event are created atomically');
select is((select count(*)::bigint from public.organisation_members where organisation_id=(select organisation_id from bootstrapped) and user_id='10000000-0000-0000-0000-000000000007' and status='active'),1::bigint,'creator receives organisation membership');
select is((select count(*)::bigint from public.event_members where event_id=(select event_id from bootstrapped) and user_id='10000000-0000-0000-0000-000000000007' and status='active'),1::bigint,'creator receives event membership');
select ok(public.is_event_president((select event_id from bootstrapped)),'creator receives president role');
select ok(not public.is_event_treasurer((select event_id from bootstrapped)),'creator does not receive treasurer unless requested');

create temp table before_duplicate as select count(*)::bigint organisation_count from public.organisations;
select throws_ok($$select * from public.create_organisation_and_event('Duplicate Clare','clare-may-ball','Duplicate 2028','CMB',2028::smallint,null::date,null::date,null::text,'setup'::public.event_status,false)$$,'P0001','Organisation or event already exists','duplicate setup fails safely');
select is((select count(*)::bigint from public.organisations),(select organisation_count from before_duplicate),'failed setup leaves no extra organisation');

select lives_ok($$select public.create_recurring_event((select organisation_id from bootstrapped),'Clare May Ball 2029','CMB',2029::smallint,'2029-06-16'::date,'2028-08-01'::date,'setup'::public.event_status)$$,'president can create recurring event');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.create_recurring_event((select organisation_id from bootstrapped),'Illegal Event','BAD',2030::smallint,null::date,null::date,'setup'::public.event_status)$$,'P0001','Not authorised','ordinary member cannot create event in another organisation');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.create_department('30000000-0000-0000-0000-000000000027','Food','FOOD','#336699'::text,'Food operations'::text,5::smallint)$$,'president can create department');
select lives_ok($$select public.update_department((select id from public.departments where event_id='30000000-0000-0000-0000-000000000027' and code='FOOD'),'Food and Drink','FOD','#336699'::text,'Food operations'::text,5::smallint,true)$$,'president can edit department');
select throws_ok($$select public.create_department('30000000-0000-0000-0000-000000000027','Duplicate Security','SEC',null::text,null::text,1::smallint)$$,'P0001','Department code or name already exists','department codes are unique within event');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000007',true);
create temp table clare_department as select public.create_department((select event_id from bootstrapped),'Security','SEC',null::text,null::text,1::smallint) id;
select ok((select id is not null from clare_department),'same department code can be used in another event');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.create_department('30000000-0000-0000-0000-000000000027','Member Department','MD',null::text,null::text,1::smallint)$$,'P0001','Not authorised','ordinary member cannot mutate departments');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.create_department('30000000-0000-0000-0000-000000000025','Historical Edit','HIST',null::text,null::text,1::smallint)$$,'P0001','Not authorised','completed event departments are read-only');

select lives_ok($$select public.assign_event_role('31000000-0000-0000-0000-000000000003','treasurer')$$,'president can assign event role');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select ok(public.is_event_treasurer('30000000-0000-0000-0000-000000000027'),'assigned treasurer role is recognised for that user');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.remove_event_role('31000000-0000-0000-0000-000000000003','treasurer')$$,'president can remove non-final role');
select throws_ok($$select public.remove_event_role('31000000-0000-0000-0000-000000000001','president')$$,'P0001','An active event must keep at least one president','final president cannot be removed');

select lives_ok($$select public.assign_department_member('31000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000003')$$,'president can assign department membership');
select lives_ok($$select public.assign_department_member('31000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000004')$$,'member can belong to multiple departments');
select throws_ok($$select public.assign_department_member('31000000-0000-0000-0000-000000000003',(select id from clare_department))$$,'P0001','Department and member must belong to the same event','cross-event department assignment is rejected');

create temp table issued as
  select * from public.issue_invitation(
    '30000000-0000-0000-0000-000000000027',
    ' Invitee@Example.Test ',
    array['committee_member']::public.event_role[],
    array['40000000-0000-0000-0000-000000000003']::uuid[],
    14
  );
select is((select count(*)::bigint from public.invitations where id=(select invitation_id from issued) and email='invitee@example.test' and status='pending'),1::bigint,'president can create normalised pending invitation');
select ok((select token_hash <> invitation_token from public.invitations join issued on issued.invitation_id=invitations.id),'raw invitation token is not stored');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select is((select count(*)::bigint from public.invitations),0::bigint,'ordinary member cannot enumerate invitations');
select throws_ok($$select public.issue_invitation('30000000-0000-0000-0000-000000000027','bad@example.test',array['committee_member']::public.event_role[],array[]::uuid[],14)$$,'P0001','Not authorised','ordinary member cannot create invitation');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000006',true);
select lives_ok($$select public.accept_invitation((select invitation_token from issued))$$,'matching invitee can accept invitation');
select lives_ok($$select public.accept_invitation((select invitation_token from issued))$$,'acceptance is idempotent for same user');
select is((select count(*)::bigint from public.event_members where event_id='30000000-0000-0000-0000-000000000027' and user_id='10000000-0000-0000-0000-000000000006' and status='active'),1::bigint,'acceptance creates active event membership once');
select is((select count(*)::bigint from public.department_members dm join public.event_members em on em.id=dm.event_member_id where em.user_id='10000000-0000-0000-0000-000000000006' and dm.department_id='40000000-0000-0000-0000-000000000003'),1::bigint,'acceptance applies intended department once');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
create temp table revoked as select * from public.issue_invitation('30000000-0000-0000-0000-000000000027','noevents@example.test',array['committee_member']::public.event_role[],array[]::uuid[],14);
select lives_ok($$select public.revoke_invitation((select invitation_id from revoked))$$,'president can revoke pending invitation');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000007',true);
select throws_ok($$select public.accept_invitation((select invitation_token from revoked))$$,'P0001','Invitation is not pending','revoked invitation cannot be accepted');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.activate_budget_version('50000000-0000-0000-0000-000000000001')$$,'P0001','Not authorised or not draft','president without treasurer cannot activate budget');
select throws_ok($$select public.transfer_contingency('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',10000,'President should fail')$$,'P0001','Not authorised','president without treasurer cannot transfer contingency');
select throws_ok($$select public.record_payment('30000000-0000-0000-0000-000000000027',current_date,'Supplier',100,'REF',array[]::uuid[],array[]::bigint[])$$,'P0001','Not authorised','president without treasurer cannot record payment');

select * from finish();
rollback;
