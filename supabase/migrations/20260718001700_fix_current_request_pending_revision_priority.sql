begin;

create or replace view public.v_spending_request_current_revisions with (security_invoker=true) as
select
  r.id request_id,
  r.event_id,
  r.code,
  r.owner_user_id,
  r.primary_department_id,
  d.name primary_department_name,
  d.code primary_department_code,
  r.approval_status,
  r.current_draft_revision_id,
  r.current_approved_revision_id,
  r.submitted_at request_submitted_at,
  r.created_at request_created_at,
  r.updated_at request_updated_at,
  v.id revision_id,
  v.revision_number,
  v.status revision_status,
  v.title,
  v.description,
  v.business_justification,
  v.supplier_name,
  v.expected_payment_date,
  v.net_minor,
  v.vat_minor,
  v.gross_minor,
  v.vat_rate,
  v.vat_treatment,
  v.vat_recoverable,
  v.submitted_at revision_submitted_at,
  v.created_at revision_created_at,
  v.updated_at revision_updated_at,
  p.display_name owner_display_name,
  p.preferred_name owner_preferred_name,
  public.is_request_owner(r.id) and v.status='draft' can_edit_draft
from public.spending_requests r
join lateral (
  select *
  from public.spending_request_revisions rv
  where rv.request_id=r.id
    and (
      rv.id=r.current_draft_revision_id
      or (r.approval_status in ('submitted','variation_pending') and rv.status='submitted')
      or rv.id=r.current_approved_revision_id
      or (r.current_draft_revision_id is null and r.current_approved_revision_id is null)
    )
  order by
    case
      when rv.id=r.current_draft_revision_id then 0
      when r.approval_status in ('submitted','variation_pending') and rv.status='submitted' then 1
      when rv.id=r.current_approved_revision_id then 2
      else 3
    end,
    rv.revision_number desc
  limit 1
) v on true
join public.departments d on d.id=r.primary_department_id
join public.profiles p on p.id=r.owner_user_id;

commit;
