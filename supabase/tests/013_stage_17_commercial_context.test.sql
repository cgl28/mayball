begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_column('public','events','product_tier','event tier is stored on the event');
select has_column('public','events','chiffre_owner_user_id','commercial owner is separate from membership roles');
select is((select product_tier::text from public.events where id='30000000-0000-0000-0000-000000000027'),'demo','existing events backfill conservatively to demo');
select is((select chiffre_owner_user_id from public.events where id='30000000-0000-0000-0000-000000000027'),(select created_by from public.events where id='30000000-0000-0000-0000-000000000027'),'existing creator backfills as owner');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select throws_ok(
  $$select public.join_organisation('20000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'signed-in users cannot self-affiliate with an organisation'
);
create temp table stage17_event as select public.create_event_for_organisation('20000000-0000-0000-0000-000000000001','Stage 17 Test Event','S17',2028::smallint,null::date,null::date,'setup'::public.event_status) id;
select is((select product_tier::text from public.events where id=(select id from stage17_event)),'demo','new events default to demo');
select is((select chiffre_owner_user_id from public.events where id=(select id from stage17_event)),'10000000-0000-0000-0000-000000000001'::uuid,'creator becomes Chiffre owner');
select ok(public.is_event_president((select id from stage17_event)),'creator remains president through existing governance model');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.update_event_organisation('30000000-0000-0000-0000-000000000027','20000000-0000-0000-0000-000000000001')$$,'P0001','Not authorised','non-president cannot change event organisation');
select ok(not public.is_event_treasurer((select id from stage17_event)),'commercial ownership grants no treasurer authority');

select * from finish();
rollback;
