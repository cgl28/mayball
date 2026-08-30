begin;

-- Actual other revenue is authoritative only once its current status records
-- receipt. Forecast and confirmed items remain forecast income.
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
  if not public.is_event_treasurer(p_event_id) or not public.is_event_writable(p_event_id) then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_title,'')),'') is null then raise exception 'Revenue title is required'; end if;
  if coalesce(p_forecast_net_minor,0) < 0 or coalesce(p_forecast_vat_minor,0) < 0 or coalesce(p_forecast_gross_minor,0) < 0
    or coalesce(p_actual_net_minor,0) < 0 or coalesce(p_actual_vat_minor,0) < 0 or coalesce(p_actual_gross_minor,0) < 0 then raise exception 'Revenue amounts cannot be negative'; end if;
  if coalesce(p_forecast_net_minor,0) + coalesce(p_forecast_vat_minor,0) <> coalesce(p_forecast_gross_minor,0) then raise exception 'Forecast net and VAT must equal gross'; end if;
  if coalesce(p_actual_net_minor,0) + coalesce(p_actual_vat_minor,0) <> coalesce(p_actual_gross_minor,0) then raise exception 'Actual net and VAT must equal gross'; end if;
  if coalesce(p_vat_rate,0) < 0 or coalesce(p_vat_rate,0) > 100 then raise exception 'VAT rate is invalid'; end if;
  if p_owner_user_id is not null and not exists(select 1 from public.event_members where event_id=p_event_id and user_id=p_owner_user_id and status='active') then raise exception 'Owner does not belong to event'; end if;
  if p_status in ('part_received','received') and (coalesce(p_actual_gross_minor,0) = 0 or p_received_date is null) then raise exception 'Received revenue needs an actual amount and received date'; end if;
  if p_status in ('forecast','confirmed') and (coalesce(p_actual_gross_minor,0) <> 0 or p_received_date is not null) then raise exception 'Forecast revenue cannot include received amounts or a received date'; end if;
  if p_item_id is not null and not exists(select 1 from public.other_revenue_items where id=p_item_id and event_id=p_event_id) then raise exception 'Revenue item does not belong to event'; end if;

  insert into public.other_revenue_items(id,event_id,title,category,owner_user_id,forecast_net_minor,forecast_vat_minor,forecast_gross_minor,actual_net_minor,actual_vat_minor,actual_gross_minor,vat_rate,vat_treatment,expected_date,received_date,status,notes,created_by)
  values(item_id,p_event_id,btrim(p_title),p_category,p_owner_user_id,coalesce(p_forecast_net_minor,0),coalesce(p_forecast_vat_minor,0),coalesce(p_forecast_gross_minor,0),coalesce(p_actual_net_minor,0),coalesce(p_actual_vat_minor,0),coalesce(p_actual_gross_minor,0),p_vat_rate,p_vat_treatment,p_expected_date,p_received_date,p_status,nullif(btrim(coalesce(p_notes,'')),''),(select auth.uid()))
  on conflict(id) do update set title=excluded.title,category=excluded.category,owner_user_id=excluded.owner_user_id,forecast_net_minor=excluded.forecast_net_minor,forecast_vat_minor=excluded.forecast_vat_minor,forecast_gross_minor=excluded.forecast_gross_minor,actual_net_minor=excluded.actual_net_minor,actual_vat_minor=excluded.actual_vat_minor,actual_gross_minor=excluded.actual_gross_minor,vat_rate=excluded.vat_rate,vat_treatment=excluded.vat_treatment,expected_date=excluded.expected_date,received_date=excluded.received_date,status=excluded.status,notes=excluded.notes;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(p_event_id,(select auth.uid()),case when p_item_id is null then 'revenue.other.created' else 'revenue.other.updated' end,'other_revenue_item',item_id,'Other revenue item saved');
  return item_id;
end $$;

create or replace view public.v_other_revenue_summaries with (security_invoker=true) as
select event_id,
  coalesce(sum(forecast_net_minor) filter(where status <> 'cancelled'),0)::bigint forecast_net_minor,
  coalesce(sum(forecast_vat_minor) filter(where status <> 'cancelled'),0)::bigint forecast_vat_minor,
  coalesce(sum(forecast_gross_minor) filter(where status <> 'cancelled'),0)::bigint forecast_gross_minor,
  coalesce(sum(actual_net_minor) filter(where status in ('part_received','received')),0)::bigint actual_net_minor,
  coalesce(sum(actual_vat_minor) filter(where status in ('part_received','received')),0)::bigint actual_vat_minor,
  coalesce(sum(actual_gross_minor) filter(where status in ('part_received','received')),0)::bigint actual_gross_minor,
  coalesce(sum(greatest(forecast_gross_minor - actual_gross_minor,0)) filter(where status not in ('cancelled','received')),0)::bigint outstanding_gross_minor
from public.other_revenue_items
group by event_id;

-- Active event membership establishes the durable organisation affiliation.
insert into public.organisation_members(organisation_id,user_id,status)
select distinct e.organisation_id, em.user_id, 'active'::public.membership_status
from public.events e
join public.event_members em on em.event_id=e.id and em.status='active'
on conflict(organisation_id,user_id) do update set status='active',left_at=null,updated_at=now();

create or replace function public.update_event_organisation(p_event_id uuid,p_organisation_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.events; actor uuid := (select auth.uid());
begin
  ev := public.assert_president_can_manage_event(p_event_id);
  if not exists (select 1 from public.organisation_members where organisation_id=p_organisation_id and user_id=actor and status='active') then raise exception 'Choose an organisation you are associated with'; end if;
  update public.events set organisation_id=p_organisation_id where id=ev.id;
  insert into public.organisation_members(organisation_id,user_id,status)
  select p_organisation_id, em.user_id, 'active'::public.membership_status
  from public.event_members em where em.event_id=ev.id and em.status='active'
  on conflict(organisation_id,user_id) do update set status='active',left_at=null,updated_at=now();
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(ev.id,actor,'event.organisation_updated','event',ev.id,'Event organisation updated');
end $$;

create or replace function public.update_event_settings(
  p_event_id uuid,
  p_name text,
  p_code text,
  p_event_year smallint,
  p_event_date date default null,
  p_planning_start_date date default null
) returns void
language plpgsql security definer set search_path='' as $$
declare ev public.events; ev_code text := public.normalise_event_code(p_code);
begin
  ev := public.assert_president_can_manage_event(p_event_id);
  if btrim(coalesce(p_name,'')) <> ev.name then raise exception 'Event name cannot be changed after creation'; end if;
  if ev_code <> ev.code then raise exception 'Event code cannot be changed after creation'; end if;
  if p_planning_start_date is not null and p_event_date is not null and p_planning_start_date > p_event_date then raise exception 'Planning start must not be after event date'; end if;
  update public.events set event_year=p_event_year,event_date=p_event_date,planning_start_date=p_planning_start_date where id=ev.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(ev.id,(select auth.uid()),'event.settings_updated','event',ev.id,'Event settings updated');
end $$;

drop function public.issue_invitation(uuid,text,public.event_role[],uuid[],integer);

create function public.issue_invitation(
  p_event_id uuid,
  p_email text,
  p_roles public.event_role[],
  p_department_ids uuid[],
  p_expires_in_days integer default 14
) returns table(invitation_id uuid, invitation_token text)
language plpgsql security definer set search_path='' as $$
declare ev public.events; inv_id uuid := gen_random_uuid(); raw_token text := encode(extensions.gen_random_bytes(32),'hex'); email_norm extensions.citext := public.normalise_email(p_email); role_value public.event_role; dep_id uuid;
begin
  ev := public.assert_president_can_manage_event(p_event_id);
  if email_norm::text !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email address'; end if;
  if coalesce(cardinality(p_roles),0)=0 then raise exception 'Please select a role.'; end if;
  if 'committee_member'=any(p_roles) and coalesce(cardinality(p_department_ids),0)=0 then raise exception 'Please select a department.'; end if;
  if p_expires_in_days is null or p_expires_in_days < 1 or p_expires_in_days > 90 then raise exception 'Invalid expiry'; end if;
  if exists(select 1 from public.invitations i where i.event_id=ev.id and i.email=email_norm and i.status='pending') then raise exception 'Pending invitation already exists'; end if;
  foreach dep_id in array p_department_ids loop
    if not exists(select 1 from public.departments d where d.id=dep_id and d.event_id=ev.id) then raise exception 'Department does not belong to event'; end if;
  end loop;
  insert into public.invitations(id,organisation_id,event_id,email,token_hash,expires_at,invited_by) values(inv_id,ev.organisation_id,ev.id,email_norm,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+make_interval(days=>p_expires_in_days),(select auth.uid()));
  foreach role_value in array p_roles loop insert into public.invitation_roles(invitation_id,role) values(inv_id,role_value) on conflict do nothing; end loop;
  foreach dep_id in array p_department_ids loop insert into public.invitation_departments(invitation_id,event_id,department_id) values(inv_id,ev.id,dep_id) on conflict do nothing; end loop;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(ev.id,(select auth.uid()),'invitation.issued','invitation',inv_id,'Invitation created for '||email_norm::text);
  return query select inv_id,raw_token;
end $$;

grant execute on function public.update_event_organisation(uuid,uuid), public.update_event_settings(uuid,text,text,smallint,date,date), public.issue_invitation(uuid,text,public.event_role[],uuid[],integer) to authenticated;

commit;
