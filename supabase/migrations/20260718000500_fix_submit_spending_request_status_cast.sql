begin;

create or replace function public.submit_spending_request(p_request_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; v public.spending_request_revisions;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if r.owner_user_id<>(select auth.uid()) or not public.is_event_writable(r.event_id) then raise exception 'Not authorised'; end if;
  select * into strict v from public.spending_request_revisions where id=r.current_draft_revision_id for update;
  if v.status<>'draft' then raise exception 'Revision is not editable'; end if;
  perform public.assert_revision_balanced(v.id);
  if v.revision_number>1 and nullif(btrim(v.change_summary),'') is null then raise exception 'Variation change summary required'; end if;
  update public.spending_request_revisions set status='submitted',submitted_at=now() where id=v.id;
  update public.spending_requests set approval_status=case when current_approved_revision_id is null
      then 'submitted'::public.request_approval_status
      else 'variation_pending'::public.request_approval_status
    end,
    submitted_at=now(),current_draft_revision_id=null where id=r.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(r.event_id,(select auth.uid()),'request.submitted','spending_request',r.id,'Spending request '||r.code||' submitted');
end $$;

commit;
