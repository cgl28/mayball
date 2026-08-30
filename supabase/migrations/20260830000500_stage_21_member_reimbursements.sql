begin;

create type public.spending_request_kind as enum ('supplier_purchase', 'member_reimbursement');

alter table public.spending_requests
  add column request_kind public.spending_request_kind not null default 'supplier_purchase',
  add column expense_date date;

alter table public.spending_requests
  add constraint spending_requests_reimbursement_expense_date_check
  check (request_kind <> 'member_reimbursement' or expense_date is not null);

create index requests_event_kind_status_idx
  on public.spending_requests(event_id, request_kind, approval_status, updated_at desc);

create or replace function public.create_member_reimbursement_draft(
  p_event_id uuid,
  p_primary_department_id uuid,
  p_title text,
  p_description text,
  p_expense_date date,
  p_net_minor bigint,
  p_vat_minor bigint,
  p_gross_minor bigint,
  p_vat_rate numeric default null,
  p_vat_treatment public.vat_treatment default 'unknown',
  p_vat_recoverable boolean default null
) returns table(request_id uuid, revision_id uuid, request_code text)
language plpgsql security definer set search_path='' as $$
declare made record;
begin
  if p_expense_date is null then raise exception 'Expense date is required'; end if;
  if coalesce(p_gross_minor, 0) <= 0 then raise exception 'Reimbursement gross must be greater than zero'; end if;

  select * into made
  from public.create_spending_request_draft(
    p_event_id, p_primary_department_id, p_title, p_description, null, null, null,
    p_net_minor, p_vat_minor, p_gross_minor, p_vat_rate, p_vat_treatment, p_vat_recoverable,
    jsonb_build_array(jsonb_build_object(
      'department_id', p_primary_department_id, 'net_minor', p_net_minor,
      'vat_minor', p_vat_minor, 'gross_minor', p_gross_minor
    )),
    jsonb_build_array(jsonb_build_object(
      'sequence_number', 1, 'description', 'Reimbursement',
      'net_minor', p_net_minor, 'vat_minor', p_vat_minor, 'gross_minor', p_gross_minor,
      'vat_rate', p_vat_rate, 'vat_treatment', p_vat_treatment
    ))
  );

  update public.spending_requests
     set request_kind = 'member_reimbursement', expense_date = p_expense_date
   where id = made.request_id;
  update public.activity_log
     set action = 'request.reimbursement_created', summary = 'Reimbursement ' || made.request_code || ' created'
   where entity_id = made.request_id and action = 'request.created';

  return query select made.request_id, made.revision_id, made.request_code;
end $$;

create or replace function public.update_member_reimbursement_draft(
  p_request_id uuid,
  p_primary_department_id uuid,
  p_title text,
  p_description text,
  p_expense_date date,
  p_net_minor bigint,
  p_vat_minor bigint,
  p_gross_minor bigint,
  p_vat_rate numeric default null,
  p_vat_treatment public.vat_treatment default 'unknown',
  p_vat_recoverable boolean default null,
  p_change_summary text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests;
begin
  select * into strict r from public.spending_requests where id = p_request_id for update;
  if r.request_kind <> 'member_reimbursement' or p_expense_date is null then
    raise exception 'Not a valid reimbursement draft';
  end if;
  if coalesce(p_gross_minor, 0) <= 0 then raise exception 'Reimbursement gross must be greater than zero'; end if;

  perform public.update_spending_request_draft(
    p_request_id, p_primary_department_id, p_title, p_description, null, null, null,
    p_net_minor, p_vat_minor, p_gross_minor, p_vat_rate, p_vat_treatment, p_vat_recoverable,
    jsonb_build_array(jsonb_build_object(
      'department_id', p_primary_department_id, 'net_minor', p_net_minor,
      'vat_minor', p_vat_minor, 'gross_minor', p_gross_minor
    )),
    jsonb_build_array(jsonb_build_object(
      'sequence_number', 1, 'description', 'Reimbursement',
      'net_minor', p_net_minor, 'vat_minor', p_vat_minor, 'gross_minor', p_gross_minor,
      'vat_rate', p_vat_rate, 'vat_treatment', p_vat_treatment
    )),
    p_change_summary
  );
  update public.spending_requests set expense_date = p_expense_date where id = p_request_id;
end $$;

create or replace function public.submit_spending_request(p_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; v public.spending_request_revisions; submitted_action text; submitted_summary text;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if r.owner_user_id<>(select auth.uid()) or not public.is_event_writable(r.event_id) then raise exception 'Not authorised'; end if;
  if r.current_draft_revision_id is null then raise exception 'Request is not editable'; end if;
  select * into strict v from public.spending_request_revisions where id=r.current_draft_revision_id and request_id=r.id for update;
  if v.status<>'draft' then raise exception 'Revision is not editable'; end if;
  if r.request_kind='member_reimbursement' and not exists (
    select 1 from public.documents d
    where d.event_id=r.event_id and d.request_id=r.id and d.category='receipt' and d.status='finalised'
  ) then raise exception 'Upload a finalised receipt before submitting this reimbursement'; end if;
  perform public.assert_revision_balanced(v.id);
  if v.revision_number>1 and nullif(btrim(v.change_summary),'') is null then raise exception 'Variation change summary required'; end if;
  update public.spending_request_revisions set status='submitted',submitted_at=now() where id=v.id;
  update public.spending_requests set approval_status=case when current_approved_revision_id is null then 'submitted'::public.request_approval_status else 'variation_pending'::public.request_approval_status end,
    submitted_at=now(),current_draft_revision_id=null where id=r.id;
  submitted_action := case
    when r.request_kind='member_reimbursement' and r.current_approved_revision_id is null then 'request.reimbursement_submitted'
    when r.current_approved_revision_id is null then 'request.submitted'
    else 'request.variation_submitted'
  end;
  submitted_summary := case when r.request_kind='member_reimbursement' then 'Reimbursement ' else 'Spending request ' end || r.code || ' submitted';
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(r.event_id,(select auth.uid()),submitted_action,'spending_request',r.id,submitted_summary);
end $$;

create or replace view public.v_spending_request_current_revisions with (security_invoker=true) as
select
  r.id request_id, r.event_id, r.code, r.owner_user_id, r.primary_department_id,
  d.name primary_department_name, d.code primary_department_code, r.approval_status,
  r.current_draft_revision_id, r.current_approved_revision_id, r.submitted_at request_submitted_at,
  r.created_at request_created_at, r.updated_at request_updated_at,
  v.id revision_id, v.revision_number, v.status revision_status, v.title, v.description,
  v.business_justification, v.supplier_name, v.expected_payment_date, v.net_minor, v.vat_minor,
  v.gross_minor, v.vat_rate, v.vat_treatment, v.vat_recoverable,
  v.submitted_at revision_submitted_at, v.created_at revision_created_at, v.updated_at revision_updated_at,
  p.display_name owner_display_name, p.preferred_name owner_preferred_name,
  public.is_request_owner(r.id) and v.status='draft' can_edit_draft,
  r.request_kind, r.expense_date
from public.spending_requests r
join lateral (
  select * from public.spending_request_revisions rv where rv.request_id=r.id and (
    rv.id=r.current_draft_revision_id or (r.approval_status in ('submitted','variation_pending') and rv.status='submitted')
    or rv.id=r.current_approved_revision_id or (r.current_draft_revision_id is null and r.current_approved_revision_id is null)
  ) order by case when rv.id=r.current_draft_revision_id then 0 when r.approval_status in ('submitted','variation_pending') and rv.status='submitted' then 1 when rv.id=r.current_approved_revision_id then 2 else 3 end, rv.revision_number desc limit 1
) v on true
join public.departments d on d.id=r.primary_department_id
join public.profiles p on p.id=r.owner_user_id;

create or replace view public.v_approval_queue with (security_invoker=true) as
select
  r.id request_id, r.event_id, r.code, r.owner_user_id, p.display_name owner_display_name, p.preferred_name owner_preferred_name,
  r.primary_department_id, d.name primary_department_name, d.code primary_department_code, r.approval_status,
  v.id revision_id, v.revision_number, v.title, v.supplier_name, v.net_minor, v.vat_minor, v.gross_minor, v.submitted_at,
  case when r.current_approved_revision_id is null then 'initial' else 'variation' end request_type,
  public.is_event_treasurer(r.event_id) can_decide,
  r.request_kind, r.expense_date
from public.spending_requests r
join public.spending_request_revisions v on v.request_id=r.id and v.status='submitted'
join public.departments d on d.id=r.primary_department_id
join public.profiles p on p.id=r.owner_user_id
where r.approval_status in ('submitted','variation_pending') and r.current_draft_revision_id is null and public.is_event_treasurer(r.event_id);

create or replace view public.v_request_component_payment_positions with (security_invoker=true) as
with paid as (
  select pa.request_component_id, coalesce(sum(pa.gross_minor),0)::bigint paid_gross_minor
  from public.payment_allocations pa join public.payments p on p.id=pa.payment_id and p.status='recorded'
  group by pa.request_component_id
)
select
  r.event_id, r.id request_id, r.code request_code, v.id revision_id, v.revision_number,
  c.id request_component_id, c.code component_code, c.description, c.expected_payment_date, c.supplier_name,
  c.net_minor approved_net_minor, c.vat_minor approved_vat_minor, c.gross_minor approved_gross_minor,
  coalesce(paid.paid_gross_minor,0)::bigint paid_gross_minor,
  (c.gross_minor-coalesce(paid.paid_gross_minor,0))::bigint outstanding_gross_minor,
  case when coalesce(paid.paid_gross_minor,0)=0 then 'unpaid' when coalesce(paid.paid_gross_minor,0)<c.gross_minor then 'partially_paid' when coalesce(paid.paid_gross_minor,0)=c.gross_minor then 'paid' else 'overpaid' end payment_status,
  r.request_kind, r.owner_user_id claimant_user_id, p.display_name claimant_display_name, p.preferred_name claimant_preferred_name
from public.spending_requests r
join public.spending_request_revisions v on v.id=r.current_approved_revision_id
join public.request_components c on c.revision_id=v.id
join public.profiles p on p.id=r.owner_user_id
left join paid on paid.request_component_id=c.id
where r.current_approved_revision_id is not null;

revoke execute on function public.create_member_reimbursement_draft(uuid,uuid,text,text,date,bigint,bigint,bigint,numeric,public.vat_treatment,boolean), public.update_member_reimbursement_draft(uuid,uuid,text,text,date,bigint,bigint,bigint,numeric,public.vat_treatment,boolean,text) from public, anon;
grant execute on function public.create_member_reimbursement_draft(uuid,uuid,text,text,date,bigint,bigint,bigint,numeric,public.vat_treatment,boolean), public.update_member_reimbursement_draft(uuid,uuid,text,text,date,bigint,bigint,bigint,numeric,public.vat_treatment,boolean,text) to authenticated;

commit;
