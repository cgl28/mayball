begin;

drop function public.save_ticket_type(uuid,uuid,text,text,bigint,bigint,bigint,numeric,public.vat_treatment,integer,integer,integer,smallint,boolean);

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
  p_display_order integer default 0,
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
  if coalesce(p_display_order,0) < 0 or coalesce(p_display_order,0) > 32767 then raise exception 'Display order is invalid'; end if;
  if p_ticket_type_id is not null and not exists(select 1 from public.ticket_types where id=p_ticket_type_id and event_id=p_event_id) then
    raise exception 'Ticket type does not belong to event';
  end if;

  insert into public.ticket_types(
    id,event_id,name,description,net_price_minor,vat_minor,gross_price_minor,vat_rate,vat_treatment,
    maximum_quantity,forecast_quantity,complimentary_quantity,display_order,is_active,created_by
  )
  values(
    ticket_id,p_event_id,btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),coalesce(p_net_price_minor,0),coalesce(p_vat_minor,0),coalesce(p_gross_price_minor,0),
    p_vat_rate,p_vat_treatment,coalesce(p_maximum_quantity,0),coalesce(p_forecast_quantity,0),coalesce(p_complimentary_quantity,0),coalesce(p_display_order,0)::smallint,coalesce(p_is_active,true),(select auth.uid())
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

grant execute on function
  public.save_ticket_type(uuid,uuid,text,text,bigint,bigint,bigint,numeric,public.vat_treatment,integer,integer,integer,integer,boolean)
to authenticated;

commit;
