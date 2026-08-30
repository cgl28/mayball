alter type public.document_category add value if not exists 'expense_claim_form';

begin;

create or replace function public.submit_spending_request(p_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare
  r public.spending_requests;
  v public.spending_request_revisions;
  submitted_action text;
  submitted_summary text;
  has_claim_form boolean;
  has_receipt boolean;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if r.owner_user_id<>(select auth.uid()) or not public.is_event_writable(r.event_id) then raise exception 'Not authorised'; end if;
  if r.current_draft_revision_id is null then raise exception 'Request is not editable'; end if;
  select * into strict v from public.spending_request_revisions where id=r.current_draft_revision_id and request_id=r.id for update;
  if v.status<>'draft' then raise exception 'Revision is not editable'; end if;

  if r.request_kind='member_reimbursement' then
    select
      coalesce(bool_or(d.category::text='expense_claim_form'), false),
      coalesce(bool_or(d.category='receipt'), false)
    into has_claim_form, has_receipt
    from public.documents d
    where d.event_id=r.event_id and d.request_id=r.id and d.status='finalised';

    if not has_claim_form and not has_receipt then
      raise exception 'Add an expense claim form and at least one receipt before submitting this reimbursement';
    elsif not has_claim_form then
      raise exception 'Add an expense claim form before submitting this reimbursement';
    elsif not has_receipt then
      raise exception 'Add at least one receipt before submitting this reimbursement';
    end if;
  end if;

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

commit;
