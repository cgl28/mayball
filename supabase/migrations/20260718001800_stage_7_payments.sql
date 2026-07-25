begin;

alter table public.payments add column if not exists idempotency_key text;
create unique index if not exists payments_event_idempotency_uidx on public.payments(event_id,idempotency_key) where idempotency_key is not null;
create index if not exists payments_event_status_date_idx on public.payments(event_id,status,payment_date desc,created_at desc);
create index if not exists payment_allocations_payment_idx on public.payment_allocations(payment_id);
create index if not exists payment_allocations_component_idx on public.payment_allocations(request_component_id);

create or replace function public.enforce_payment_allocation_consistency() returns trigger
language plpgsql
set search_path=''
as $$
declare component_request uuid;
begin
  select v.request_id
    into component_request
    from public.request_components c
    join public.spending_request_revisions v on v.id=c.revision_id
   where c.id=new.request_component_id
     and c.event_id=new.event_id;

  if component_request is null or component_request<>new.request_id then
    raise exception 'Payment allocation component does not belong to request'
      using errcode='P0001';
  end if;

  return new;
end $$;

drop trigger if exists payment_allocation_consistency on public.payment_allocations;
create trigger payment_allocation_consistency
before insert or update on public.payment_allocations
for each row execute function public.enforce_payment_allocation_consistency();

create or replace function public.enforce_payment_allocations_match_payment() returns trigger
language plpgsql
set search_path=''
as $$
declare payment_total bigint; allocation_total bigint;
begin
  select gross_minor into payment_total from public.payments where id=new.payment_id;
  select coalesce(sum(gross_minor),0)
    into allocation_total
    from public.payment_allocations
   where payment_id=new.payment_id;

  if payment_total is not null and allocation_total<>payment_total then
    raise exception 'Payment allocations do not reconcile'
      using errcode='P0001';
  end if;

  return new;
end $$;

drop trigger if exists payment_allocations_match_payment on public.payment_allocations;
create constraint trigger payment_allocations_match_payment
after insert or update on public.payment_allocations
deferrable initially deferred
for each row execute function public.enforce_payment_allocations_match_payment();

create or replace function public.enforce_component_not_overpaid() returns trigger
language plpgsql
set search_path=''
as $$
declare approved bigint; paid bigint;
begin
  select gross_minor
    into approved
    from public.request_components
   where id=new.request_component_id;

  select coalesce(sum(pa.gross_minor),0)
    into paid
    from public.payment_allocations pa
    join public.payments p on p.id=pa.payment_id
   where pa.request_component_id=new.request_component_id
     and p.status='recorded';

  if paid>approved then
    raise exception 'Payment allocations exceed approved component amount'
      using errcode='P0001';
  end if;

  return new;
end $$;

drop trigger if exists payment_component_not_overpaid on public.payment_allocations;
create constraint trigger payment_component_not_overpaid
after insert or update on public.payment_allocations
deferrable initially deferred
for each row execute function public.enforce_component_not_overpaid();

create or replace function public.prevent_approved_revision_below_paid() returns trigger
language plpgsql
set search_path=''
as $$
declare approved bigint; paid bigint;
begin
  if new.current_approved_revision_id is distinct from old.current_approved_revision_id
     and new.current_approved_revision_id is not null then
    select gross_minor
      into approved
      from public.spending_request_revisions
     where id=new.current_approved_revision_id
       and event_id=new.event_id
       and request_id=new.id;

    select coalesce(sum(pa.gross_minor),0)
      into paid
      from public.payment_allocations pa
      join public.payments p on p.id=pa.payment_id
     where pa.request_id=new.id
       and p.status='recorded';

    if paid>approved then
      raise exception 'Approved variation cannot be below active payments'
        using errcode='P0001';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists approved_revision_not_below_paid on public.spending_requests;
create trigger approved_revision_not_below_paid
before update of current_approved_revision_id on public.spending_requests
for each row execute function public.prevent_approved_revision_below_paid();

create or replace function public.prevent_payment_record_mutation() returns trigger
language plpgsql
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    raise exception 'Payment records are append-only'
      using errcode='P0001';
  end if;

  if old.status='recorded'
     and new.id=old.id
     and new.event_id=old.event_id
     and new.code=old.code
     and new.payment_date=old.payment_date
     and new.net_minor is not distinct from old.net_minor
     and new.vat_minor is not distinct from old.vat_minor
     and new.gross_minor=old.gross_minor
     and new.bank_reference is not distinct from old.bank_reference
     and new.method=old.method
     and new.payee=old.payee
     and new.note is not distinct from old.note
     and new.entered_by=old.entered_by
     and new.created_at=old.created_at
     and new.idempotency_key is not distinct from old.idempotency_key
     and new.status='reversed'
     and new.reversed_at is not null
     and new.reversed_by is not null
     and nullif(btrim(coalesce(new.reversal_reason,'')),'') is not null then
    return new;
  end if;

  raise exception 'Payment records are immutable except reversal metadata'
    using errcode='P0001';
end $$;

drop trigger if exists payment_records_append_only on public.payments;
create trigger payment_records_append_only
before update or delete on public.payments
for each row execute function public.prevent_payment_record_mutation();

create or replace function public.prevent_payment_allocation_mutation() returns trigger
language plpgsql
set search_path=''
as $$
begin
  raise exception 'Payment allocations are append-only'
    using errcode='P0001';
end $$;

drop trigger if exists payment_allocations_append_only on public.payment_allocations;
create trigger payment_allocations_append_only
before update or delete on public.payment_allocations
for each row execute function public.prevent_payment_allocation_mutation();

create or replace function public.record_component_payment(
  p_event_id uuid,
  p_payment_date date,
  p_payee text,
  p_gross_minor bigint,
  p_bank_reference text,
  p_method public.payment_method,
  p_note text,
  p_allocations jsonb,
  p_idempotency_key text default null
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  pid uuid;
  existing uuid;
  seq integer;
  ev public.events;
  item jsonb;
  component_id uuid;
  allocation_gross bigint;
  allocation_net bigint;
  allocation_vat bigint;
  allocation_sum bigint:=0;
  allocation_count integer:=0;
  req uuid;
  component_gross bigint;
  component_paid bigint;
begin
  if not public.is_event_treasurer(p_event_id) or not public.is_event_writable(p_event_id) then
    raise exception 'Not authorised'
      using errcode='P0001';
  end if;
  if p_payment_date is null or nullif(btrim(coalesce(p_payee,'')),'') is null or coalesce(p_gross_minor,0)<=0 then
    raise exception 'Invalid payment'
      using errcode='P0001';
  end if;
  if p_allocations is null or jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations)=0 then
    raise exception 'Invalid allocations'
      using errcode='P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_event_id::text));

  if nullif(btrim(coalesce(p_idempotency_key,'')),'') is not null then
    select id
      into existing
      from public.payments
     where event_id=p_event_id
       and idempotency_key=btrim(p_idempotency_key);
    if existing is not null then
      return existing;
    end if;
  end if;

  select * into strict ev from public.events where id=p_event_id;

  for item in select * from jsonb_array_elements(p_allocations) loop
    component_id := (item->>'component_id')::uuid;
    allocation_gross := (item->>'gross_minor')::bigint;
    allocation_net := nullif(item->>'net_minor','')::bigint;
    allocation_vat := nullif(item->>'vat_minor','')::bigint;

    if component_id is null or coalesce(allocation_gross,0)<=0 then
      raise exception 'Invalid allocations'
        using errcode='P0001';
    end if;
    if (allocation_net is null and allocation_vat is not null) or (allocation_net is not null and allocation_vat is null) then
      raise exception 'Allocation net and VAT must be provided together'
        using errcode='P0001';
    end if;
    if allocation_net is not null and allocation_net+allocation_vat<>allocation_gross then
      raise exception 'Allocation net plus VAT must equal gross'
        using errcode='P0001';
    end if;

    select r.id, c.gross_minor
      into req, component_gross
      from public.request_components c
      join public.spending_request_revisions v on v.id=c.revision_id
      join public.spending_requests r on r.id=v.request_id
     where c.id=component_id
       and c.event_id=p_event_id
       and v.status='approved'
       and r.current_approved_revision_id=v.id
     for update of c, r;

    if req is null then
      raise exception 'Payment cannot target an unapproved component'
        using errcode='P0001';
    end if;

    select coalesce(sum(pa.gross_minor),0)
      into component_paid
      from public.payment_allocations pa
      join public.payments p on p.id=pa.payment_id
     where pa.request_component_id=component_id
       and p.status='recorded';

    if component_paid+allocation_gross>component_gross then
      raise exception 'Payment allocations exceed approved component amount'
        using errcode='P0001';
    end if;

    if exists (
      select 1
        from jsonb_array_elements(p_allocations) duplicate_item
       where (duplicate_item->>'component_id')::uuid=component_id
       group by duplicate_item->>'component_id'
      having count(*)>1
    ) then
      raise exception 'Duplicate payment component allocation'
        using errcode='P0001';
    end if;

    allocation_sum := allocation_sum + allocation_gross;
    allocation_count := allocation_count + 1;
  end loop;

  if allocation_count=0 or allocation_sum<>p_gross_minor then
    raise exception 'Allocations do not reconcile'
      using errcode='P0001';
  end if;

  pid := gen_random_uuid();
  insert into public.event_reference_counters(event_id,next_payment_number)
  values(p_event_id,2)
  on conflict(event_id) do update
    set next_payment_number=public.event_reference_counters.next_payment_number+1,
        updated_at=now()
  returning next_payment_number-1 into seq;

  insert into public.payments(
    id,event_id,code,payment_date,gross_minor,bank_reference,method,payee,note,entered_by,idempotency_key
  ) values (
    pid,p_event_id,'PAY-'||ev.event_year||'-'||lpad(seq::text,4,'0'),p_payment_date,p_gross_minor,
    nullif(btrim(coalesce(p_bank_reference,'')),''),coalesce(p_method,'bank_transfer'),
    btrim(p_payee),nullif(btrim(coalesce(p_note,'')),''),(select auth.uid()),
    nullif(btrim(coalesce(p_idempotency_key,'')),'')
  );

  for item in select * from jsonb_array_elements(p_allocations) loop
    component_id := (item->>'component_id')::uuid;
    allocation_gross := (item->>'gross_minor')::bigint;
    allocation_net := nullif(item->>'net_minor','')::bigint;
    allocation_vat := nullif(item->>'vat_minor','')::bigint;

    select r.id
      into strict req
      from public.request_components c
      join public.spending_request_revisions v on v.id=c.revision_id
      join public.spending_requests r on r.id=v.request_id
     where c.id=component_id
       and c.event_id=p_event_id
       and v.status='approved'
       and r.current_approved_revision_id=v.id;

    insert into public.payment_allocations(event_id,payment_id,request_id,request_component_id,net_minor,vat_minor,gross_minor)
    values(p_event_id,pid,req,component_id,allocation_net,allocation_vat,allocation_gross);
  end loop;

  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
  values(p_event_id,(select auth.uid()),'payment.recorded','payment',pid,'Payment recorded for '||btrim(p_payee));

  return pid;
end $$;

create or replace function public.record_payment(
  p_event_id uuid,
  p_payment_date date,
  p_payee text,
  p_gross_minor bigint,
  p_bank_reference text,
  p_component_ids uuid[],
  p_allocation_gross_minor bigint[]
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  allocations jsonb:='[]'::jsonb;
  i integer;
begin
  if not public.is_event_treasurer(p_event_id) or not public.is_event_writable(p_event_id) then
    raise exception 'Not authorised'
      using errcode='P0001';
  end if;
  if array_length(p_component_ids,1) is null or array_length(p_component_ids,1)<>array_length(p_allocation_gross_minor,1) then
    raise exception 'Invalid allocations'
      using errcode='P0001';
  end if;
  for i in 1..array_length(p_component_ids,1) loop
    allocations := allocations || jsonb_build_array(jsonb_build_object('component_id',p_component_ids[i],'gross_minor',p_allocation_gross_minor[i]));
  end loop;

  return public.record_component_payment(p_event_id,p_payment_date,p_payee,p_gross_minor,p_bank_reference,'bank_transfer',null,allocations,null);
end $$;

create or replace function public.reverse_payment(p_payment_id uuid,p_reason text) returns void
language plpgsql
security definer
set search_path=''
as $$
declare p public.payments;
begin
  select * into strict p from public.payments where id=p_payment_id for update;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p.event_id::text));
  if not public.is_event_treasurer(p.event_id) or not public.is_event_writable(p.event_id) or p.status<>'recorded' or nullif(btrim(p_reason),'') is null then
    raise exception 'Not authorised or invalid reversal'
      using errcode='P0001';
  end if;
  update public.payments
     set status='reversed',
         reversed_at=now(),
         reversed_by=(select auth.uid()),
         reversal_reason=btrim(p_reason)
   where id=p.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
  values(p.event_id,(select auth.uid()),'payment.reversed','payment',p.id,'Payment reversed');
end $$;

drop view if exists public.v_request_component_payment_positions;
drop view if exists public.v_request_payment_positions;

create view public.v_request_payment_positions with (security_invoker=true) as
with paid as (
  select pa.request_id, coalesce(sum(pa.gross_minor),0)::bigint paid_gross_minor
    from public.payment_allocations pa
    join public.payments p on p.id=pa.payment_id and p.status='recorded'
   group by pa.request_id
)
select
  r.id request_id,
  r.event_id,
  r.code,
  v.id approved_revision_id,
  v.revision_number approved_revision_number,
  v.net_minor approved_net_minor,
  v.gross_minor approved_gross_minor,
  coalesce(paid.paid_gross_minor,0)::bigint paid_gross_minor,
  case when v.id is null then null else (v.gross_minor-coalesce(paid.paid_gross_minor,0))::bigint end outstanding_gross_minor,
  case
    when v.id is null then 'not_applicable'
    when coalesce(paid.paid_gross_minor,0)=0 then 'unpaid'
    when coalesce(paid.paid_gross_minor,0)<v.gross_minor then 'partially_paid'
    when coalesce(paid.paid_gross_minor,0)=v.gross_minor then 'paid'
    else 'overpaid'
  end payment_status
from public.spending_requests r
left join public.spending_request_revisions v on v.id=r.current_approved_revision_id
left join paid on paid.request_id=r.id;

create view public.v_request_component_payment_positions with (security_invoker=true) as
with paid as (
  select pa.request_component_id, coalesce(sum(pa.gross_minor),0)::bigint paid_gross_minor
    from public.payment_allocations pa
    join public.payments p on p.id=pa.payment_id and p.status='recorded'
   group by pa.request_component_id
)
select
  r.event_id,
  r.id request_id,
  r.code request_code,
  v.id revision_id,
  v.revision_number,
  c.id request_component_id,
  c.code component_code,
  c.description,
  c.expected_payment_date,
  c.supplier_name,
  c.net_minor approved_net_minor,
  c.vat_minor approved_vat_minor,
  c.gross_minor approved_gross_minor,
  coalesce(paid.paid_gross_minor,0)::bigint paid_gross_minor,
  (c.gross_minor-coalesce(paid.paid_gross_minor,0))::bigint outstanding_gross_minor,
  case
    when coalesce(paid.paid_gross_minor,0)=0 then 'unpaid'
    when coalesce(paid.paid_gross_minor,0)<c.gross_minor then 'partially_paid'
    when coalesce(paid.paid_gross_minor,0)=c.gross_minor then 'paid'
    else 'overpaid'
  end payment_status
from public.spending_requests r
join public.spending_request_revisions v on v.id=r.current_approved_revision_id
join public.request_components c on c.revision_id=v.id
left join paid on paid.request_component_id=c.id
where r.current_approved_revision_id is not null;

create or replace view public.v_payment_details with (security_invoker=true) as
select
  p.id payment_id,
  p.event_id,
  p.code,
  p.payment_date,
  p.net_minor,
  p.vat_minor,
  p.gross_minor,
  p.bank_reference,
  p.method,
  p.payee,
  p.note,
  p.status,
  p.entered_by,
  entered.display_name entered_by_display_name,
  p.reversed_at,
  p.reversed_by,
  reversed.display_name reversed_by_display_name,
  p.reversal_reason,
  p.created_at,
  coalesce(count(pa.id),0)::bigint allocation_count,
  coalesce(sum(pa.gross_minor),0)::bigint allocated_gross_minor,
  string_agg(distinct r.code, ', ' order by r.code) request_codes
from public.payments p
left join public.payment_allocations pa on pa.payment_id=p.id
left join public.spending_requests r on r.id=pa.request_id
left join public.profiles entered on entered.id=p.entered_by
left join public.profiles reversed on reversed.id=p.reversed_by
group by p.id, entered.display_name, reversed.display_name;

create or replace view public.v_payment_allocation_details with (security_invoker=true) as
select
  pa.id payment_allocation_id,
  pa.event_id,
  pa.payment_id,
  p.code payment_code,
  p.payment_date,
  p.status payment_status,
  pa.request_id,
  r.code request_code,
  pa.request_component_id,
  c.code component_code,
  c.description component_description,
  c.revision_id,
  v.revision_number,
  pa.net_minor,
  pa.vat_minor,
  pa.gross_minor,
  pa.created_at
from public.payment_allocations pa
join public.payments p on p.id=pa.payment_id
join public.spending_requests r on r.id=pa.request_id
join public.request_components c on c.id=pa.request_component_id
join public.spending_request_revisions v on v.id=c.revision_id;

create or replace view public.v_event_payment_summaries with (security_invoker=true) as
select
  e.id event_id,
  coalesce(sum(p.gross_minor) filter(where p.status='recorded'),0)::bigint recorded_gross_minor,
  coalesce(sum(p.gross_minor) filter(where p.status='reversed'),0)::bigint reversed_gross_minor,
  count(p.id) filter(where p.status='recorded')::bigint recorded_payment_count,
  count(p.id) filter(where p.status='reversed')::bigint reversed_payment_count
from public.events e
left join public.payments p on p.event_id=e.id
group by e.id;

revoke execute on function public.record_component_payment(uuid,date,text,bigint,text,public.payment_method,text,jsonb,text) from public, anon;
grant execute on function public.record_component_payment(uuid,date,text,bigint,text,public.payment_method,text,jsonb,text) to authenticated;
grant execute on function public.record_payment(uuid,date,text,bigint,text,uuid[],bigint[]), public.reverse_payment(uuid,text) to authenticated;
grant select on public.v_request_payment_positions, public.v_request_component_payment_positions, public.v_payment_details, public.v_payment_allocation_details, public.v_event_payment_summaries to authenticated;

commit;
