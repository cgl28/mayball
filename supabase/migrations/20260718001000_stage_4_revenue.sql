begin;

create or replace function public.prevent_ticket_snapshot_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Ticket sales snapshots are append-only';
end $$;

create or replace function public.prevent_ticket_snapshot_breakdown_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Ticket sales snapshot breakdowns are append-only';
end $$;

drop trigger if exists ticket_sales_snapshots_append_only_delete on public.ticket_sales_snapshots;
drop trigger if exists ticket_type_sales_snapshots_append_only_update on public.ticket_type_sales_snapshots;
drop trigger if exists ticket_type_sales_snapshots_append_only_delete on public.ticket_type_sales_snapshots;
create trigger ticket_sales_snapshots_append_only_delete before delete on public.ticket_sales_snapshots
  for each row execute function public.prevent_ticket_snapshot_mutation();
create trigger ticket_type_sales_snapshots_append_only_update before update on public.ticket_type_sales_snapshots
  for each row execute function public.prevent_ticket_snapshot_breakdown_mutation();
create trigger ticket_type_sales_snapshots_append_only_delete before delete on public.ticket_type_sales_snapshots
  for each row execute function public.prevent_ticket_snapshot_breakdown_mutation();

create or replace function public.save_ticket_type(
  p_event_id uuid,
  p_ticket_type_id uuid default null,
  p_name text default null,
  p_description text default null,
  p_net_price_minor bigint default 0,
  p_vat_minor bigint default 0,
  p_gross_price_minor bigint default 0,
  p_vat_rate numeric default null,
  p_vat_treatment public.vat_treatment default 'standard',
  p_maximum_quantity integer default 0,
  p_forecast_quantity integer default 0,
  p_complimentary_quantity integer default 0,
  p_display_order smallint default 0,
  p_is_active boolean default true
) returns uuid
language plpgsql security definer set search_path='' as $$
declare ticket_id uuid := coalesce(p_ticket_type_id,gen_random_uuid());
begin
  if not public.is_event_treasurer(p_event_id) or not public.is_event_writable(p_event_id) then
    raise exception 'Not authorised';
  end if;
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Ticket type name is required'; end if;
  if coalesce(p_net_price_minor,0) < 0 or coalesce(p_vat_minor,0) < 0 or coalesce(p_gross_price_minor,0) < 0 then
    raise exception 'Ticket prices cannot be negative';
  end if;
  if coalesce(p_net_price_minor,0) + coalesce(p_vat_minor,0) <> coalesce(p_gross_price_minor,0) then
    raise exception 'Ticket price net and VAT must equal gross';
  end if;
  if coalesce(p_vat_rate,0) < 0 or coalesce(p_vat_rate,0) > 100 then raise exception 'VAT rate is invalid'; end if;
  if coalesce(p_maximum_quantity,0) < 0 or coalesce(p_forecast_quantity,0) < 0 or coalesce(p_complimentary_quantity,0) < 0 then
    raise exception 'Ticket quantities cannot be negative';
  end if;
  if coalesce(p_forecast_quantity,0) + coalesce(p_complimentary_quantity,0) > coalesce(p_maximum_quantity,0) then
    raise exception 'Forecast and complimentary tickets cannot exceed capacity';
  end if;
  if p_ticket_type_id is not null and not exists(select 1 from public.ticket_types where id=p_ticket_type_id and event_id=p_event_id) then
    raise exception 'Ticket type does not belong to event';
  end if;

  insert into public.ticket_types(
    id,event_id,name,description,net_price_minor,vat_minor,gross_price_minor,vat_rate,vat_treatment,
    maximum_quantity,forecast_quantity,complimentary_quantity,display_order,is_active,created_by
  )
  values(
    ticket_id,p_event_id,btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),coalesce(p_net_price_minor,0),coalesce(p_vat_minor,0),coalesce(p_gross_price_minor,0),
    p_vat_rate,p_vat_treatment,coalesce(p_maximum_quantity,0),coalesce(p_forecast_quantity,0),coalesce(p_complimentary_quantity,0),coalesce(p_display_order,0),coalesce(p_is_active,true),(select auth.uid())
  )
  on conflict(id) do update set
    name=excluded.name,
    description=excluded.description,
    net_price_minor=excluded.net_price_minor,
    vat_minor=excluded.vat_minor,
    gross_price_minor=excluded.gross_price_minor,
    vat_rate=excluded.vat_rate,
    vat_treatment=excluded.vat_treatment,
    maximum_quantity=excluded.maximum_quantity,
    forecast_quantity=excluded.forecast_quantity,
    complimentary_quantity=excluded.complimentary_quantity,
    display_order=excluded.display_order,
    is_active=excluded.is_active;

  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(p_event_id,(select auth.uid()),case when p_ticket_type_id is null then 'revenue.ticket_type.created' else 'revenue.ticket_type.updated' end,'ticket_type',ticket_id,'Ticket type saved');
  return ticket_id;
end $$;

create or replace function public.record_ticket_sales_snapshot(
  p_event_id uuid,
  p_captured_at timestamptz,
  p_tickets_sold_to_date integer default null,
  p_net_sales_minor bigint default null,
  p_vat_minor bigint default null,
  p_gross_sales_minor bigint default 0,
  p_refunds_to_date_minor bigint default 0,
  p_booking_fees_to_date_minor bigint default 0,
  p_source public.snapshot_source default 'manual_ticket_tailor',
  p_notes text default null,
  p_breakdown jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path='' as $$
declare snapshot_id uuid := gen_random_uuid(); item jsonb; ticket_id uuid; qty integer; gross bigint;
begin
  if not public.is_event_treasurer(p_event_id) or not public.is_event_writable(p_event_id) then
    raise exception 'Not authorised';
  end if;
  if p_captured_at is null then raise exception 'Captured time is required'; end if;
  if p_tickets_sold_to_date is not null and p_tickets_sold_to_date < 0 then raise exception 'Tickets sold cannot be negative'; end if;
  if coalesce(p_gross_sales_minor,0) < 0 or coalesce(p_refunds_to_date_minor,0) < 0 or coalesce(p_booking_fees_to_date_minor,0) < 0 then
    raise exception 'Snapshot amounts cannot be negative';
  end if;
  if (p_net_sales_minor is null) <> (p_vat_minor is null) then raise exception 'Net and VAT must be supplied together'; end if;
  if p_net_sales_minor is not null and (p_net_sales_minor < 0 or p_vat_minor < 0 or p_net_sales_minor + p_vat_minor <> p_gross_sales_minor) then
    raise exception 'Snapshot net and VAT must equal gross';
  end if;
  if jsonb_typeof(coalesce(p_breakdown,'[]'::jsonb)) <> 'array' then raise exception 'Invalid ticket breakdown'; end if;

  insert into public.ticket_sales_snapshots(
    id,event_id,captured_at,tickets_sold_to_date,net_sales_minor,vat_minor,gross_sales_minor,
    refunds_to_date_minor,booking_fees_to_date_minor,source,notes,entered_by
  )
  values(
    snapshot_id,p_event_id,p_captured_at,p_tickets_sold_to_date,p_net_sales_minor,p_vat_minor,p_gross_sales_minor,
    coalesce(p_refunds_to_date_minor,0),coalesce(p_booking_fees_to_date_minor,0),p_source,nullif(btrim(coalesce(p_notes,'')),''),(select auth.uid())
  );

  for item in select value from jsonb_array_elements(coalesce(p_breakdown,'[]'::jsonb)) loop
    ticket_id := (item->>'ticket_type_id')::uuid;
    qty := (item->>'quantity_to_date')::integer;
    gross := (item->>'gross_sales_minor')::bigint;
    if ticket_id is null or qty is null or gross is null or qty < 0 or gross < 0 then raise exception 'Invalid ticket breakdown'; end if;
    if not exists(select 1 from public.ticket_types where id=ticket_id and event_id=p_event_id) then
      raise exception 'Ticket type does not belong to event';
    end if;
    insert into public.ticket_type_sales_snapshots(event_id,snapshot_id,ticket_type_id,quantity_to_date,gross_sales_minor)
      values(p_event_id,snapshot_id,ticket_id,qty,gross);
  end loop;

  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(p_event_id,(select auth.uid()),'revenue.ticket_snapshot.recorded','ticket_sales_snapshot',snapshot_id,'Ticket sales snapshot recorded');
  return snapshot_id;
end $$;

create or replace function public.void_ticket_sales_snapshot(p_snapshot_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare snap public.ticket_sales_snapshots;
begin
  select * into strict snap from public.ticket_sales_snapshots where id=p_snapshot_id for update;
  if not public.is_event_treasurer(snap.event_id) or not public.is_event_writable(snap.event_id) then raise exception 'Not authorised'; end if;
  if snap.is_void or nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Snapshot cannot be voided'; end if;
  update public.ticket_sales_snapshots
    set is_void=true, void_reason=btrim(p_reason), voided_by=(select auth.uid()), voided_at=now()
    where id=snap.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(snap.event_id,(select auth.uid()),'revenue.ticket_snapshot.voided','ticket_sales_snapshot',snap.id,'Ticket sales snapshot voided');
end $$;

create or replace function public.save_other_revenue_item(
  p_event_id uuid,
  p_item_id uuid default null,
  p_title text default null,
  p_category public.revenue_item_category default 'other',
  p_owner_user_id uuid default null,
  p_forecast_net_minor bigint default 0,
  p_forecast_vat_minor bigint default 0,
  p_forecast_gross_minor bigint default 0,
  p_actual_net_minor bigint default 0,
  p_actual_vat_minor bigint default 0,
  p_actual_gross_minor bigint default 0,
  p_vat_rate numeric default null,
  p_vat_treatment public.vat_treatment default 'unknown',
  p_expected_date date default null,
  p_received_date date default null,
  p_status public.revenue_item_status default 'forecast',
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path='' as $$
declare item_id uuid := coalesce(p_item_id,gen_random_uuid());
begin
  if not public.is_event_treasurer(p_event_id) or not public.is_event_writable(p_event_id) then
    raise exception 'Not authorised';
  end if;
  if nullif(btrim(coalesce(p_title,'')),'') is null then raise exception 'Revenue title is required'; end if;
  if coalesce(p_forecast_net_minor,0) < 0 or coalesce(p_forecast_vat_minor,0) < 0 or coalesce(p_forecast_gross_minor,0) < 0
    or coalesce(p_actual_net_minor,0) < 0 or coalesce(p_actual_vat_minor,0) < 0 or coalesce(p_actual_gross_minor,0) < 0 then
    raise exception 'Revenue amounts cannot be negative';
  end if;
  if coalesce(p_forecast_net_minor,0) + coalesce(p_forecast_vat_minor,0) <> coalesce(p_forecast_gross_minor,0) then
    raise exception 'Forecast net and VAT must equal gross';
  end if;
  if coalesce(p_actual_net_minor,0) + coalesce(p_actual_vat_minor,0) <> coalesce(p_actual_gross_minor,0) then
    raise exception 'Actual net and VAT must equal gross';
  end if;
  if coalesce(p_vat_rate,0) < 0 or coalesce(p_vat_rate,0) > 100 then raise exception 'VAT rate is invalid'; end if;
  if p_owner_user_id is not null and not exists(select 1 from public.event_members where event_id=p_event_id and user_id=p_owner_user_id and status='active') then
    raise exception 'Owner does not belong to event';
  end if;
  if p_status in ('part_received','received') and (coalesce(p_actual_gross_minor,0) = 0 or p_received_date is null) then
    raise exception 'Received revenue needs an actual amount and received date';
  end if;
  if p_item_id is not null and not exists(select 1 from public.other_revenue_items where id=p_item_id and event_id=p_event_id) then
    raise exception 'Revenue item does not belong to event';
  end if;

  insert into public.other_revenue_items(
    id,event_id,title,category,owner_user_id,forecast_net_minor,forecast_vat_minor,forecast_gross_minor,
    actual_net_minor,actual_vat_minor,actual_gross_minor,vat_rate,vat_treatment,expected_date,received_date,status,notes,created_by
  )
  values(
    item_id,p_event_id,btrim(p_title),p_category,p_owner_user_id,coalesce(p_forecast_net_minor,0),coalesce(p_forecast_vat_minor,0),coalesce(p_forecast_gross_minor,0),
    coalesce(p_actual_net_minor,0),coalesce(p_actual_vat_minor,0),coalesce(p_actual_gross_minor,0),p_vat_rate,p_vat_treatment,p_expected_date,p_received_date,p_status,
    nullif(btrim(coalesce(p_notes,'')),''),(select auth.uid())
  )
  on conflict(id) do update set
    title=excluded.title,
    category=excluded.category,
    owner_user_id=excluded.owner_user_id,
    forecast_net_minor=excluded.forecast_net_minor,
    forecast_vat_minor=excluded.forecast_vat_minor,
    forecast_gross_minor=excluded.forecast_gross_minor,
    actual_net_minor=excluded.actual_net_minor,
    actual_vat_minor=excluded.actual_vat_minor,
    actual_gross_minor=excluded.actual_gross_minor,
    vat_rate=excluded.vat_rate,
    vat_treatment=excluded.vat_treatment,
    expected_date=excluded.expected_date,
    received_date=excluded.received_date,
    status=excluded.status,
    notes=excluded.notes;

  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(p_event_id,(select auth.uid()),case when p_item_id is null then 'revenue.other.created' else 'revenue.other.updated' end,'other_revenue_item',item_id,'Other revenue item saved');
  return item_id;
end $$;

create or replace view public.v_ticket_type_forecast_positions with (security_invoker=true) as
select
  id ticket_type_id,
  event_id,
  name,
  description,
  net_price_minor,
  vat_minor,
  gross_price_minor,
  vat_rate,
  vat_treatment,
  maximum_quantity,
  forecast_quantity,
  complimentary_quantity,
  display_order,
  is_active,
  (net_price_minor * maximum_quantity)::bigint maximum_net_minor,
  (vat_minor * maximum_quantity)::bigint maximum_vat_minor,
  (gross_price_minor * maximum_quantity)::bigint maximum_gross_minor,
  (net_price_minor * forecast_quantity)::bigint forecast_net_minor,
  (vat_minor * forecast_quantity)::bigint forecast_vat_minor,
  (gross_price_minor * forecast_quantity)::bigint forecast_gross_minor
from public.ticket_types;

create or replace view public.v_ticket_forecast_summaries with (security_invoker=true) as
select
  event_id,
  coalesce(sum(maximum_quantity) filter(where is_active),0)::integer maximum_ticket_capacity,
  coalesce(sum(forecast_quantity) filter(where is_active),0)::integer forecast_ticket_quantity,
  coalesce(sum(complimentary_quantity) filter(where is_active),0)::integer complimentary_ticket_quantity,
  coalesce(sum(maximum_net_minor) filter(where is_active),0)::bigint maximum_net_minor,
  coalesce(sum(maximum_vat_minor) filter(where is_active),0)::bigint maximum_vat_minor,
  coalesce(sum(maximum_gross_minor) filter(where is_active),0)::bigint maximum_gross_minor,
  coalesce(sum(forecast_net_minor) filter(where is_active),0)::bigint forecast_net_minor,
  coalesce(sum(forecast_vat_minor) filter(where is_active),0)::bigint forecast_vat_minor,
  coalesce(sum(forecast_gross_minor) filter(where is_active),0)::bigint forecast_gross_minor
from public.v_ticket_type_forecast_positions
group by event_id;

create or replace view public.v_ticket_actual_summaries with (security_invoker=true) as
select
  event_id,
  id latest_snapshot_id,
  captured_at latest_captured_at,
  tickets_sold_to_date,
  net_sales_minor,
  vat_minor,
  gross_sales_minor,
  refunds_to_date_minor,
  booking_fees_to_date_minor,
  source,
  entered_by
from public.v_latest_ticket_sales_snapshot;

create or replace view public.v_other_revenue_summaries with (security_invoker=true) as
select
  event_id,
  coalesce(sum(forecast_net_minor) filter(where status <> 'cancelled'),0)::bigint forecast_net_minor,
  coalesce(sum(forecast_vat_minor) filter(where status <> 'cancelled'),0)::bigint forecast_vat_minor,
  coalesce(sum(forecast_gross_minor) filter(where status <> 'cancelled'),0)::bigint forecast_gross_minor,
  coalesce(sum(actual_net_minor) filter(where status <> 'cancelled'),0)::bigint actual_net_minor,
  coalesce(sum(actual_vat_minor) filter(where status <> 'cancelled'),0)::bigint actual_vat_minor,
  coalesce(sum(actual_gross_minor) filter(where status <> 'cancelled'),0)::bigint actual_gross_minor,
  coalesce(sum(greatest(forecast_gross_minor - actual_gross_minor,0)) filter(where status not in ('cancelled','received')),0)::bigint outstanding_gross_minor
from public.other_revenue_items
group by event_id;

create or replace view public.v_event_revenue_summaries with (security_invoker=true) as
select
  e.id event_id,
  coalesce(tf.maximum_ticket_capacity,0)::integer maximum_ticket_capacity,
  coalesce(tf.forecast_ticket_quantity,0)::integer forecast_ticket_quantity,
  coalesce(tf.maximum_net_minor,0)::bigint ticket_maximum_net_minor,
  coalesce(tf.maximum_vat_minor,0)::bigint ticket_maximum_vat_minor,
  coalesce(tf.maximum_gross_minor,0)::bigint ticket_maximum_gross_minor,
  coalesce(tf.forecast_net_minor,0)::bigint ticket_forecast_net_minor,
  coalesce(tf.forecast_vat_minor,0)::bigint ticket_forecast_vat_minor,
  coalesce(tf.forecast_gross_minor,0)::bigint ticket_forecast_gross_minor,
  ta.latest_snapshot_id,
  ta.latest_captured_at,
  ta.tickets_sold_to_date,
  ta.net_sales_minor ticket_actual_net_minor,
  ta.vat_minor ticket_actual_vat_minor,
  ta.gross_sales_minor ticket_actual_gross_minor,
  ta.refunds_to_date_minor ticket_refunds_to_date_minor,
  ta.booking_fees_to_date_minor ticket_booking_fees_to_date_minor,
  coalesce(ors.forecast_net_minor,0)::bigint other_forecast_net_minor,
  coalesce(ors.forecast_vat_minor,0)::bigint other_forecast_vat_minor,
  coalesce(ors.forecast_gross_minor,0)::bigint other_forecast_gross_minor,
  coalesce(ors.actual_net_minor,0)::bigint other_actual_net_minor,
  coalesce(ors.actual_vat_minor,0)::bigint other_actual_vat_minor,
  coalesce(ors.actual_gross_minor,0)::bigint other_actual_gross_minor,
  coalesce(ors.outstanding_gross_minor,0)::bigint other_outstanding_gross_minor,
  (coalesce(tf.forecast_net_minor,0)+coalesce(ors.forecast_net_minor,0))::bigint total_forecast_net_minor,
  (coalesce(tf.forecast_vat_minor,0)+coalesce(ors.forecast_vat_minor,0))::bigint total_forecast_vat_minor,
  (coalesce(tf.forecast_gross_minor,0)+coalesce(ors.forecast_gross_minor,0))::bigint total_forecast_gross_minor,
  (coalesce(ta.gross_sales_minor,0)+coalesce(ors.actual_gross_minor,0))::bigint total_actual_gross_minor
from public.events e
left join public.v_ticket_forecast_summaries tf on tf.event_id=e.id
left join public.v_ticket_actual_summaries ta on ta.event_id=e.id
left join public.v_other_revenue_summaries ors on ors.event_id=e.id;

create index if not exists ticket_types_event_active_order_idx on public.ticket_types(event_id,is_active,display_order);
create index if not exists ticket_sales_snapshots_event_captured_idx on public.ticket_sales_snapshots(event_id,captured_at desc,created_at desc) where not is_void;
create index if not exists ticket_type_sales_snapshots_snapshot_idx on public.ticket_type_sales_snapshots(snapshot_id);
create index if not exists other_revenue_items_event_category_idx on public.other_revenue_items(event_id,category);
create index if not exists other_revenue_items_event_status_idx on public.other_revenue_items(event_id,status);

grant select on public.v_ticket_type_forecast_positions,public.v_ticket_forecast_summaries,public.v_ticket_actual_summaries,public.v_other_revenue_summaries,public.v_event_revenue_summaries to authenticated;
grant execute on function
  public.save_ticket_type(uuid,uuid,text,text,bigint,bigint,bigint,numeric,public.vat_treatment,integer,integer,integer,smallint,boolean),
  public.record_ticket_sales_snapshot(uuid,timestamptz,integer,bigint,bigint,bigint,bigint,bigint,public.snapshot_source,text,jsonb),
  public.void_ticket_sales_snapshot(uuid,text),
  public.save_other_revenue_item(uuid,uuid,text,public.revenue_item_category,uuid,bigint,bigint,bigint,bigint,bigint,bigint,numeric,public.vat_treatment,date,date,public.revenue_item_status,text)
to authenticated;

commit;
