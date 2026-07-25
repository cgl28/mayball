begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);

create temp table new_ticket as
  select public.save_ticket_type(
    '30000000-0000-0000-0000-000000000027',
    null,
    'Late Release',
    'Treasurer-created ticket type',
    10000,
    2000,
    12000,
    20.00,
    'standard',
    100,
    80,
    0,
    4,
    true
  ) id;

select is((select name from public.ticket_types where id=(select id from new_ticket)),'Late Release','treasurer can create ticket type');
select lives_ok($$select public.save_ticket_type((select event_id from public.ticket_types where id=(select id from new_ticket)),(select id from new_ticket),'Late Release Updated','Updated',11000,2200,13200,20.00,'standard',100,90,0,4,true)$$,'treasurer can update ticket type');
select is((select gross_price_minor from public.ticket_types where id=(select id from new_ticket)),13200::bigint,'ticket type update persisted');
select throws_ok($$select public.save_ticket_type('30000000-0000-0000-0000-000000000027',null,'Bad triple',null,100,20,119,20,'standard',1,1,0,1,true)$$,'P0001','Ticket price net and VAT must equal gross','ticket price triple must reconcile');
select throws_ok($$select public.save_ticket_type('30000000-0000-0000-0000-000000000027',null,'Bad capacity',null,100,20,120,20,'standard',1,2,0,1,true)$$,'P0001','Forecast and complimentary tickets cannot exceed capacity','forecast cannot exceed capacity');
select throws_ok($$select public.save_ticket_type('30000000-0000-0000-0000-000000000027',null,'Negative ticket',null,-1,0,-1,20,'standard',1,1,0,1,true)$$,'P0001','Ticket prices cannot be negative','negative ticket price fails');
select throws_ok($$select public.save_ticket_type('30000000-0000-0000-0000-000000000027','60000000-0000-0000-0000-000000000099','Cross update',null,100,20,120,20,'standard',1,1,0,1,true)$$,'P0001','Ticket type does not belong to event','cross-event ticket update fails');
select throws_ok($$select public.save_ticket_type('30000000-0000-0000-0000-000000000027',null,'Standard',null,100,20,120,20,'standard',1,1,0,1,true)$$,null,null,'duplicate ticket name in the same event fails');

select is((select forecast_gross_minor from public.v_ticket_type_forecast_positions where ticket_type_id=(select id from new_ticket)),1188000::bigint,'ticket forecast gross is price times forecast quantity');
select is((select maximum_gross_minor from public.v_ticket_type_forecast_positions where ticket_type_id=(select id from new_ticket)),1320000::bigint,'ticket maximum gross is price times capacity');
select is((select forecast_vat_minor from public.v_ticket_type_forecast_positions where ticket_type_id=(select id from new_ticket)),198000::bigint,'ticket forecast VAT is price VAT times forecast quantity');
select is((select forecast_net_minor + forecast_vat_minor from public.v_ticket_type_forecast_positions where ticket_type_id=(select id from new_ticket)),(select forecast_gross_minor from public.v_ticket_type_forecast_positions where ticket_type_id=(select id from new_ticket)),'ticket forecast net and VAT reconcile to gross');
select ok((select forecast_gross_minor from public.v_ticket_forecast_summaries where event_id='30000000-0000-0000-0000-000000000027') >= 23988000,'ticket forecast summary includes active ticket rows');

create temp table total_snapshot as
  select public.record_ticket_sales_snapshot(
    '30000000-0000-0000-0000-000000000027',
    '2027-02-01 12:00:00+00',
    900,
    11250000,
    2250000,
    13500000,
    25000,
    270000,
    'manual_ticket_tailor',
    'Total-only cumulative export',
    '[]'::jsonb
  ) id;

select ok(exists(select 1 from public.ticket_sales_snapshots where id=(select id from total_snapshot) and entered_by='10000000-0000-0000-0000-000000000002'),'snapshot actor is derived from auth.uid');
select is((select count(*)::bigint from public.ticket_type_sales_snapshots where snapshot_id=(select id from total_snapshot)),0::bigint,'total-only snapshot is valid');
select is((select latest_snapshot_id from public.v_ticket_actual_summaries where event_id='30000000-0000-0000-0000-000000000027'),(select id from total_snapshot),'latest cumulative snapshot is current actual position');
select is((select gross_sales_minor from public.v_ticket_actual_summaries where event_id='30000000-0000-0000-0000-000000000027'),13500000::bigint,'latest snapshot gross is used directly');
select isnt((select gross_sales_minor from public.v_ticket_actual_summaries where event_id='30000000-0000-0000-0000-000000000027'),(select sum(gross_sales_minor)::bigint from public.ticket_sales_snapshots where event_id='30000000-0000-0000-0000-000000000027' and not is_void),'cumulative snapshots are not summed as actual revenue');
select is((select booking_fees_to_date_minor from public.v_ticket_actual_summaries where event_id='30000000-0000-0000-0000-000000000027'),270000::bigint,'booking fees are reported separately');
select is((select gross_sales_minor from public.v_ticket_actual_summaries where event_id='30000000-0000-0000-0000-000000000027') - (select booking_fees_to_date_minor from public.v_ticket_actual_summaries where event_id='30000000-0000-0000-0000-000000000027'),13230000::bigint,'booking fees are available but not deducted by the canonical gross field');

create temp table breakdown_snapshot as
  select public.record_ticket_sales_snapshot(
    '30000000-0000-0000-0000-000000000027',
    '2027-03-01 12:00:00+00',
    920,
    11500000,
    2300000,
    13800000,
    25000,
    276000,
    'manual_ticket_tailor',
    'Cumulative export with type breakdown',
    jsonb_build_array(
      jsonb_build_object('ticket_type_id','60000000-0000-0000-0000-000000000001','quantity_to_date',700,'gross_sales_minor',10500000),
      jsonb_build_object('ticket_type_id','60000000-0000-0000-0000-000000000002','quantity_to_date',220,'gross_sales_minor',4400000)
    )
  ) id;

select is((select count(*)::bigint from public.ticket_type_sales_snapshots where snapshot_id=(select id from breakdown_snapshot)),2::bigint,'snapshot breakdown rows are recorded atomically');
select throws_ok($$select public.record_ticket_sales_snapshot('30000000-0000-0000-0000-000000000027','2027-03-02',1,100,20,120,0,0,'manual_ticket_tailor','Duplicate breakdown',jsonb_build_array(jsonb_build_object('ticket_type_id','60000000-0000-0000-0000-000000000001','quantity_to_date',1,'gross_sales_minor',120),jsonb_build_object('ticket_type_id','60000000-0000-0000-0000-000000000001','quantity_to_date',1,'gross_sales_minor',120)))$$,null,null,'same ticket type cannot appear twice in a snapshot breakdown');
select throws_ok($$select public.record_ticket_sales_snapshot('30000000-0000-0000-0000-000000000027','2027-03-02',1,100,20,120,0,0,'manual_ticket_tailor','Cross ticket',jsonb_build_array(jsonb_build_object('ticket_type_id','60000000-0000-0000-0000-000000000099','quantity_to_date',1,'gross_sales_minor',120)))$$,'P0001','Ticket type does not belong to event','cross-event ticket type in breakdown fails');
select throws_ok($$select public.record_ticket_sales_snapshot('30000000-0000-0000-0000-000000000027','2027-03-02',1,100,20,121,0,0,'manual_ticket_tailor','Bad triple','[]')$$,'P0001','Snapshot net and VAT must equal gross','snapshot net and VAT must reconcile');
select throws_ok($$select public.record_ticket_sales_snapshot('30000000-0000-0000-0000-000000000027','2027-03-02',-1,null,null,0,0,0,'manual_ticket_tailor','Negative','[]')$$,'P0001','Tickets sold cannot be negative','negative snapshot counts fail');
select throws_ok($$delete from public.ticket_sales_snapshots where id=(select id from breakdown_snapshot)$$,'42501',null,'snapshots cannot be deleted by authenticated users');
select throws_ok($$update public.ticket_type_sales_snapshots set quantity_to_date=999 where snapshot_id=(select id from breakdown_snapshot)$$,'42501',null,'snapshot breakdowns cannot be updated by authenticated users');
select lives_ok($$select public.void_ticket_sales_snapshot((select id from total_snapshot),'Superseded export')$$,'treasurer can void a snapshot with a reason');
select is((select latest_snapshot_id from public.v_ticket_actual_summaries where event_id='30000000-0000-0000-0000-000000000027'),(select id from breakdown_snapshot),'latest valid snapshot ignores voided rows');

create temp table other_revenue as
  select public.save_other_revenue_item(
    '30000000-0000-0000-0000-000000000027',
    null,
    'Programme adverts',
    'merchandise',
    '10000000-0000-0000-0000-000000000003',
    100000,
    20000,
    120000,
    0,
    0,
    0,
    20.00,
    'standard',
    '2027-04-01',
    null,
    'confirmed',
    'Advert revenue'
  ) id;

select is((select title from public.other_revenue_items where id=(select id from other_revenue)),'Programme adverts','treasurer can create other revenue');
select lives_ok($$select public.save_other_revenue_item('30000000-0000-0000-0000-000000000027',(select id from other_revenue),'Programme adverts','merchandise','10000000-0000-0000-0000-000000000003',100000,20000,120000,50000,10000,60000,20,'standard','2027-04-01','2027-04-05','part_received','Part received')$$,'treasurer can update other revenue actuals');
select is((select actual_gross_minor from public.other_revenue_items where id=(select id from other_revenue)),60000::bigint,'other revenue actual update persisted');
select throws_ok($$select public.save_other_revenue_item('30000000-0000-0000-0000-000000000027',null,'Bad owner','other','10000000-0000-0000-0000-000000000005',0,0,0,0,0,0,null,'unknown',null,null,'forecast',null)$$,'P0001','Owner does not belong to event','other revenue owner must belong to event');
select throws_ok($$select public.save_other_revenue_item('30000000-0000-0000-0000-000000000027',null,'Bad actual','other',null,0,0,0,1,0,1,null,'unknown',null,null,'received',null)$$,'P0001','Received revenue needs an actual amount and received date','received revenue needs a date');
select is((select forecast_gross_minor from public.v_other_revenue_summaries where event_id='30000000-0000-0000-0000-000000000027') >= 1820000,true,'other revenue summary includes non-cancelled forecasts');
select is((select total_forecast_gross_minor from public.v_event_revenue_summaries where event_id='30000000-0000-0000-0000-000000000027'),(select ticket_forecast_gross_minor + other_forecast_gross_minor from public.v_event_revenue_summaries where event_id='30000000-0000-0000-0000-000000000027'),'combined forecast gross reconciles');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.save_ticket_type('30000000-0000-0000-0000-000000000027',null,'President Revenue',null,100,20,120,20,'standard',1,1,0,1,true)$$,'P0001','Not authorised','president without treasurer cannot create ticket type');
select throws_ok($$select public.record_ticket_sales_snapshot('30000000-0000-0000-0000-000000000027','2027-04-01',1,null,null,120,0,0,'manual_ticket_tailor',null,'[]')$$,'P0001','Not authorised','president without treasurer cannot record snapshots');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select throws_ok($$select public.save_other_revenue_item('30000000-0000-0000-0000-000000000027',null,'Member Revenue','other',null,0,0,0,0,0,0,null,'unknown',null,null,'forecast',null)$$,'P0001','Not authorised','ordinary member cannot mutate other revenue');
select is((select count(*)::bigint from public.v_event_revenue_summaries where event_id='30000000-0000-0000-0000-000000000025'),1::bigint,'same-organisation active member sees historical revenue summary');
select throws_ok($$select public.record_ticket_sales_snapshot('30000000-0000-0000-0000-000000000025','2027-04-01',1,null,null,120,0,0,'manual_ticket_tailor',null,'[]')$$,'P0001','Not authorised','historical completed event cannot receive snapshots');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select is((select count(*)::bigint from public.v_event_revenue_summaries where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'outsider cannot see Downing revenue summary');
select throws_ok($$select public.save_ticket_type('30000000-0000-0000-0000-000000000027',null,'Outsider Revenue',null,100,20,120,20,'standard',1,1,0,1,true)$$,'P0001','Not authorised','outsider cannot mutate Downing revenue');
select lives_ok($$select public.save_ticket_type('30000000-0000-0000-0000-000000000099',null,'Standard',null,100,20,120,20,'standard',1,1,0,1,true)$$,'same ticket name is allowed in a separate event');

select * from finish();
rollback;
