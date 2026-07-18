begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('public','events','events exists');
select has_table('public','spending_requests','spending_requests exists');
select has_table('public','payment_allocations','payment_allocations exists');
select col_type_is('public','spending_request_revisions','gross_minor','bigint','money uses bigint minor units');
select has_index('public','budget_versions','one_active_budget_per_event','one active budget index exists');
select has_function('public','submit_spending_request',array['uuid'],'submit RPC exists');

select throws_ok($$insert into public.events(organisation_id,name,event_year,code,status,created_by)
 values('20000000-0000-0000-0000-000000000001','Bad Code',2028,'bad','planning','10000000-0000-0000-0000-000000000001')$$,'23514',null,'lowercase event code rejected');
select throws_ok($$insert into public.ticket_types(event_id,name,net_price_minor,vat_minor,gross_price_minor,maximum_quantity,forecast_quantity,created_by)
 values('30000000-0000-0000-0000-000000000027','Broken VAT',100,20,121,1,1,'10000000-0000-0000-0000-000000000002')$$,'23514',null,'money triple must reconcile');
select throws_ok($$insert into public.budget_versions(event_id,version_number,name,status,effective_date,created_by,activated_by,activated_at)
 values('30000000-0000-0000-0000-000000000027',2,'Second active','active',current_date,'10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',now())$$,'23505',null,'only one active budget');
select throws_ok($$insert into public.department_members(event_id,department_id,event_member_id,assigned_by)
 values('30000000-0000-0000-0000-000000000099','40000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000005')$$,'23503',null,'cross-event relationship rejected');

select results_eq($$select count(*)::bigint from public.v_latest_ticket_sales_snapshot where event_id='30000000-0000-0000-0000-000000000027'$$,$$values(1::bigint)$$,'one latest snapshot');
select results_eq($$select gross_sales_minor from public.v_latest_ticket_sales_snapshot where event_id='30000000-0000-0000-0000-000000000027'$$,$$values(9750000::bigint)$$,'latest snapshot selected');

select * from finish();
rollback;
