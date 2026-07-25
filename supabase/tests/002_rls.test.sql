begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select ok(public.can_view_event('30000000-0000-0000-0000-000000000027'),'member can view current event');
select ok(public.can_view_event('30000000-0000-0000-0000-000000000025'),'current member can view historical event');
select ok(not public.can_view_event('30000000-0000-0000-0000-000000000099'),'member cannot view other organisation');
select is((select count(*)::bigint from public.events),2::bigint,'member sees current and historical events only');
select ok(not public.is_event_treasurer('30000000-0000-0000-0000-000000000027'),'ordinary member is not treasurer');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select ok(public.is_event_president('30000000-0000-0000-0000-000000000027'),'president role recognised');
select ok(not public.is_event_treasurer('30000000-0000-0000-0000-000000000027'),'president has no implicit treasurer power');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select ok(public.is_event_treasurer('30000000-0000-0000-0000-000000000027'),'treasurer role recognised');
select lives_ok($$select public.transfer_contingency('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',10000,'RLS test')$$,'treasurer can transfer contingency');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.transfer_contingency('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',10000,'Should fail')$$,'P0001','Not authorised','member cannot transfer contingency');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select is((select count(*)::bigint from public.events),1::bigint,'outsider sees only own event');
select is((select count(*)::bigint from public.departments where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'outsider sees no Downing departments');
select is((select count(*)::bigint from public.ticket_sales_snapshots where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'outsider sees no Downing revenue');

select * from finish();
rollback;
