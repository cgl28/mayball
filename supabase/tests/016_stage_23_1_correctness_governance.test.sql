begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);

-- Simulate a legacy forecast row that carried amounts before status semantics
-- were corrected. It must remain forecast-only in every reporting view.
insert into public.other_revenue_items(
  id,event_id,title,category,forecast_net_minor,forecast_vat_minor,forecast_gross_minor,
  actual_net_minor,actual_vat_minor,actual_gross_minor,vat_treatment,expected_date,received_date,status,created_by
) values (
  '63000000-0000-0000-0000-000000000020','30000000-0000-0000-0000-000000000027','Legacy forecast','other',
  10000,0,10000,10000,0,10000,'outside_scope','2027-05-01','2027-05-02','forecast','10000000-0000-0000-0000-000000000002'
);
select is((select actual_gross_minor from public.v_other_revenue_summaries where event_id='30000000-0000-0000-0000-000000000027'),500000::bigint,'forecast-only other revenue is excluded from actual other income');
select is((select other_actual_gross_minor from public.v_event_financial_positions where event_id='30000000-0000-0000-0000-000000000027'),500000::bigint,'dashboard actual other income reconciles to the revenue summary');
select is((select total_actual_gross_minor from public.v_event_revenue_summaries where event_id='30000000-0000-0000-0000-000000000027'),12500000::bigint,'received other revenue remains included in total actual income');
select throws_ok($$select public.save_other_revenue_item('30000000-0000-0000-0000-000000000027',null,'Invalid forecast actual','other',null,100,0,100,100,0,100,null,'outside_scope',null,current_date,'forecast',null)$$,'P0001','Forecast revenue cannot include received amounts or a received date','future forecast payloads cannot carry actual revenue');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select is((select count(*)::bigint from public.organisation_members where organisation_id='20000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000003' and status='active'),1::bigint,'active event member has durable organisation affiliation');
select lives_ok($$select public.set_preferred_organisation('20000000-0000-0000-0000-000000000001')$$,'active affiliated member can choose preferred organisation');
select throws_ok($$select public.set_preferred_organisation('20000000-0000-0000-0000-000000000002')$$,'P0001','Not authorised','preferred organisation remains restricted to active affiliations');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select throws_ok($$select * from public.issue_invitation('30000000-0000-0000-0000-000000000027','missing-role@example.test',array[]::public.event_role[],array[]::uuid[],14)$$,'P0001','Please select a role.','invitation without an intended role is rejected');
select throws_ok($$select * from public.issue_invitation('30000000-0000-0000-0000-000000000027','missing-department@example.test',array['committee_member']::public.event_role[],array[]::uuid[],14)$$,'P0001','Please select a department.','committee invitation without an intended department is rejected');
select lives_ok($$select * from public.issue_invitation('30000000-0000-0000-0000-000000000027','valid-committee@example.test',array['committee_member']::public.event_role[],array['40000000-0000-0000-0000-000000000001']::uuid[],14)$$,'valid committee invitation still succeeds');

select throws_ok($$select public.update_event_settings('30000000-0000-0000-0000-000000000027','Renamed event','DMB',2027::smallint,date '2027-06-20',date '2026-08-02')$$,'P0001','Event name cannot be changed after creation','event name is immutable after creation');
select throws_ok($$select public.update_event_settings('30000000-0000-0000-0000-000000000027','Downing May Ball 2027','NEW',2027::smallint,date '2027-06-20',date '2026-08-02')$$,'P0001','Event code cannot be changed after creation','event code is immutable after creation');
select lives_ok($$select public.update_event_settings('30000000-0000-0000-0000-000000000027','Downing May Ball 2027','DMB',2027::smallint,date '2027-06-20',date '2026-08-02')$$,'event date and planning start remain editable');
select is((select event_date from public.events where id='30000000-0000-0000-0000-000000000027'),'2027-06-20'::date,'event date update persists without changing identity');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
create temp table snapshot_before as select gross_sales_minor from public.ticket_sales_snapshots where id='61000000-0000-0000-0000-000000000003';
select lives_ok($$select public.save_ticket_type('30000000-0000-0000-0000-000000000027','60000000-0000-0000-0000-000000000001','Standard revised','Edited current configuration',15000,3000,18000,20,'standard',1200,1100,0,1,true)$$,'existing ticket type can be edited');
select is((select forecast_gross_minor from public.v_ticket_type_forecast_positions where ticket_type_id='60000000-0000-0000-0000-000000000001'),19800000::bigint,'ticket forecast uses the edited current ticket configuration');
select is((select gross_sales_minor from public.ticket_sales_snapshots where id='61000000-0000-0000-0000-000000000003'),(select gross_sales_minor from snapshot_before),'ticket editing leaves historical actual snapshots unchanged');

select * from finish();
rollback;
