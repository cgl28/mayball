begin;

create or replace function public.update_spending_request_draft(
  p_request_id uuid,
  p_primary_department_id uuid,
  p_title text,
  p_description text default null,
  p_business_justification text default null,
  p_supplier_name text default null,
  p_expected_payment_date date default null,
  p_net_minor bigint default 0,
  p_vat_minor bigint default 0,
  p_gross_minor bigint default 0,
  p_vat_rate numeric default null,
  p_vat_treatment public.vat_treatment default 'unknown',
  p_vat_recoverable boolean default null,
  p_allocations jsonb default '[]'::jsonb,
  p_components jsonb default '[]'::jsonb,
  p_change_summary text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; v public.spending_request_revisions;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if r.owner_user_id <> (select auth.uid()) or r.current_draft_revision_id is null or not public.is_event_writable(r.event_id) then
    raise exception 'Not authorised or not draft';
  end if;
  select * into strict v from public.spending_request_revisions where id=r.current_draft_revision_id and request_id=r.id for update;
  if v.status <> 'draft' then raise exception 'Revision is not editable'; end if;
  if nullif(btrim(coalesce(p_title,'')),'') is null then raise exception 'Request title is required'; end if;
  if coalesce(p_net_minor,0) < 0 or coalesce(p_vat_minor,0) < 0 or coalesce(p_gross_minor,0) < 0 then raise exception 'Request amounts cannot be negative'; end if;
  if coalesce(p_net_minor,0)+coalesce(p_vat_minor,0) <> coalesce(p_gross_minor,0) then raise exception 'Request net and VAT must equal gross'; end if;
  if coalesce(p_vat_rate,0) < 0 or coalesce(p_vat_rate,0) > 100 then raise exception 'VAT rate is invalid'; end if;
  if not exists(select 1 from public.departments where id=p_primary_department_id and event_id=r.event_id and is_active) then
    raise exception 'Department does not belong to event';
  end if;
  update public.spending_requests set primary_department_id=p_primary_department_id where id=r.id;
  update public.spending_request_revisions
    set title=btrim(p_title),
      description=nullif(btrim(coalesce(p_description,'')),''),
      business_justification=nullif(btrim(coalesce(p_business_justification,'')),''),
      supplier_name=nullif(btrim(coalesce(p_supplier_name,'')),''),
      expected_payment_date=p_expected_payment_date,
      net_minor=coalesce(p_net_minor,0),
      vat_minor=coalesce(p_vat_minor,0),
      gross_minor=coalesce(p_gross_minor,0),
      vat_rate=p_vat_rate,
      vat_treatment=p_vat_treatment,
      vat_recoverable=p_vat_recoverable,
      change_summary=case when v.revision_number > 1 then nullif(btrim(coalesce(p_change_summary,v.change_summary,'')),'') else v.change_summary end
    where id=v.id;
  delete from public.spending_request_department_allocations where revision_id=v.id;
  delete from public.request_components where revision_id=v.id;
  perform public.insert_request_allocations(r.event_id,v.id,p_allocations);
  perform public.insert_request_components(r.event_id,v.id,r.code,p_components);
  perform public.assert_revision_balanced(v.id);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,visibility)
    values(r.event_id,(select auth.uid()),'request.updated','spending_request',r.id,'Spending request '||r.code||' draft updated','private_owner');
end $$;

create or replace function public.submit_spending_request(p_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; v public.spending_request_revisions;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if r.owner_user_id<>(select auth.uid()) or not public.is_event_writable(r.event_id) then raise exception 'Not authorised'; end if;
  if r.current_draft_revision_id is null then raise exception 'Request is not editable'; end if;
  select * into strict v from public.spending_request_revisions where id=r.current_draft_revision_id and request_id=r.id for update;
  if v.status<>'draft' then raise exception 'Revision is not editable'; end if;
  perform public.assert_revision_balanced(v.id);
  if v.revision_number>1 and nullif(btrim(v.change_summary),'') is null then raise exception 'Variation change summary required'; end if;
  update public.spending_request_revisions set status='submitted',submitted_at=now() where id=v.id;
  update public.spending_requests set approval_status=case when current_approved_revision_id is null
      then 'submitted'::public.request_approval_status
      else 'variation_pending'::public.request_approval_status
    end,
    submitted_at=now(),current_draft_revision_id=null where id=r.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(r.event_id,(select auth.uid()),case when r.current_approved_revision_id is null then 'request.submitted' else 'request.variation_submitted' end,'spending_request',r.id,'Spending request '||r.code||' submitted');
end $$;

create or replace function public.start_request_variation(p_request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; old public.spending_request_revisions; nid uuid:=gen_random_uuid(); n integer;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if r.owner_user_id<>(select auth.uid()) or r.approval_status<>'approved' or r.current_draft_revision_id is not null or not public.is_event_writable(r.event_id) then
    raise exception 'Variation not allowed';
  end if;
  select * into strict old from public.spending_request_revisions where id=r.current_approved_revision_id for update;
  select coalesce(max(revision_number),0)+1 into n from public.spending_request_revisions where request_id=r.id;
  insert into public.spending_request_revisions(id,event_id,request_id,revision_number,status,title,description,business_justification,supplier_name,expected_payment_date,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment,vat_recoverable,change_summary,created_by)
  values(nid,old.event_id,old.request_id,n,'draft',old.title,old.description,old.business_justification,old.supplier_name,old.expected_payment_date,old.net_minor,old.vat_minor,old.gross_minor,old.vat_rate,old.vat_treatment,old.vat_recoverable,'Variation proposed',(select auth.uid()));
  insert into public.spending_request_department_allocations(event_id,revision_id,department_id,net_minor,vat_minor,gross_minor)
    select event_id,nid,department_id,net_minor,vat_minor,gross_minor from public.spending_request_department_allocations where revision_id=old.id;
  insert into public.request_components(event_id,revision_id,sequence_number,code,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment)
    select event_id,nid,sequence_number,r.code||'.'||sequence_number,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment from public.request_components where revision_id=old.id;
  update public.spending_requests set current_draft_revision_id=nid where id=r.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,visibility)
    values(r.event_id,(select auth.uid()),'request.variation_started','spending_request',r.id,'Variation started for '||r.code,'private_owner');
  return nid;
end $$;

create or replace function public.decide_spending_request(
  p_request_id uuid,
  p_revision_id uuid,
  p_decision public.review_decision,
  p_reason text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; v public.spending_request_revisions; prior uuid; nid uuid; n integer; is_variation boolean;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if not public.is_event_treasurer(r.event_id) or not public.is_event_writable(r.event_id) then raise exception 'Not authorised'; end if;
  select * into strict v from public.spending_request_revisions where id=p_revision_id and request_id=r.id for update;
  if v.status<>'submitted' then raise exception 'Revision is not awaiting decision'; end if;
  prior:=r.current_approved_revision_id;
  is_variation := prior is not null;
  if (not is_variation and r.approval_status <> 'submitted') or (is_variation and r.approval_status <> 'variation_pending') then
    raise exception 'Request is not awaiting decision';
  end if;
  if is_variation and v.id = prior then raise exception 'Revision is not awaiting decision'; end if;
  if p_decision<>'approved' and nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Reason required'; end if;
  perform public.assert_revision_balanced(v.id);

  insert into public.request_reviews(event_id,request_id,revision_id,reviewer_user_id,decision,reason)
    values(r.event_id,r.id,v.id,(select auth.uid()),p_decision,nullif(btrim(coalesce(p_reason,'')),''));

  if p_decision='approved' then
    if prior is not null then update public.spending_request_revisions set status='superseded',decided_at=coalesce(decided_at,now()) where id=prior; end if;
    update public.spending_request_revisions set status='approved',decided_at=now() where id=v.id;
    update public.spending_requests set approval_status='approved',current_approved_revision_id=v.id,current_draft_revision_id=null,approved_at=now() where id=r.id;
  elsif p_decision='changes_requested' then
    update public.spending_request_revisions set status='changes_requested',decided_at=now() where id=v.id;
    select coalesce(max(revision_number),0)+1 into n from public.spending_request_revisions where request_id=r.id; nid:=gen_random_uuid();
    insert into public.spending_request_revisions(id,event_id,request_id,revision_number,status,title,description,business_justification,supplier_name,expected_payment_date,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment,vat_recoverable,change_summary,created_by)
      values(nid,v.event_id,v.request_id,n,'draft',v.title,v.description,v.business_justification,v.supplier_name,v.expected_payment_date,v.net_minor,v.vat_minor,v.gross_minor,v.vat_rate,v.vat_treatment,v.vat_recoverable,p_reason,r.owner_user_id);
    insert into public.spending_request_department_allocations(event_id,revision_id,department_id,net_minor,vat_minor,gross_minor)
      select event_id,nid,department_id,net_minor,vat_minor,gross_minor from public.spending_request_department_allocations where revision_id=v.id;
    insert into public.request_components(event_id,revision_id,sequence_number,code,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment)
      select event_id,nid,sequence_number,r.code||'.'||sequence_number,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment from public.request_components where revision_id=v.id;
    update public.spending_requests set approval_status='changes_requested',current_draft_revision_id=nid where id=r.id;
  else
    update public.spending_request_revisions set status='rejected',decided_at=now() where id=v.id;
    update public.spending_requests set approval_status=case when prior is null then 'rejected'::public.request_approval_status else 'approved'::public.request_approval_status end,
      current_draft_revision_id=null where id=r.id;
  end if;

  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary)
    values(r.event_id,(select auth.uid()),case when is_variation then 'request.variation_'||p_decision::text else 'request.'||p_decision::text end,'spending_request',r.id,'Spending request '||r.code||' '||replace(p_decision::text,'_',' '));
  insert into public.notifications(user_id,event_id,type,entity_type,entity_id,title,body)
    values(r.owner_user_id,r.event_id,case when is_variation then 'variation_decided'::public.notification_type when p_decision='approved' then 'request_approved'::public.notification_type when p_decision='rejected' then 'request_rejected'::public.notification_type else 'changes_requested'::public.notification_type end,'spending_request',r.id,'Request decision','Your request '||r.code||' was '||replace(p_decision::text,'_',' '));
end $$;

create or replace function public.prevent_request_review_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Request reviews are append-only';
end $$;
drop trigger if exists request_reviews_append_only_update on public.request_reviews;
drop trigger if exists request_reviews_append_only_delete on public.request_reviews;
create trigger request_reviews_append_only_update before update on public.request_reviews
  for each row execute function public.prevent_request_review_mutation();
create trigger request_reviews_append_only_delete before delete on public.request_reviews
  for each row execute function public.prevent_request_review_mutation();

create or replace view public.v_approval_queue with (security_invoker=true) as
select
  r.id request_id,
  r.event_id,
  r.code,
  r.owner_user_id,
  p.display_name owner_display_name,
  p.preferred_name owner_preferred_name,
  r.primary_department_id,
  d.name primary_department_name,
  d.code primary_department_code,
  r.approval_status,
  v.id revision_id,
  v.revision_number,
  v.title,
  v.supplier_name,
  v.net_minor,
  v.vat_minor,
  v.gross_minor,
  v.submitted_at,
  case when r.current_approved_revision_id is null then 'initial' else 'variation' end request_type,
  public.is_event_treasurer(r.event_id) can_decide
from public.spending_requests r
join public.spending_request_revisions v on v.request_id=r.id and v.status='submitted'
join public.departments d on d.id=r.primary_department_id
join public.profiles p on p.id=r.owner_user_id
where r.approval_status in ('submitted','variation_pending')
  and r.current_draft_revision_id is null
  and public.is_event_treasurer(r.event_id);

create or replace view public.v_request_revision_history with (security_invoker=true) as
select
  r.id request_id,
  r.event_id,
  r.code request_code,
  r.current_draft_revision_id,
  r.current_approved_revision_id,
  r.approval_status,
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
  v.vat_treatment,
  v.change_summary,
  v.created_by,
  cp.display_name created_by_display_name,
  cp.preferred_name created_by_preferred_name,
  v.created_at,
  v.submitted_at,
  v.decided_at,
  (v.id=r.current_draft_revision_id) is_current_draft,
  (v.id=r.current_approved_revision_id) is_current_approved,
  (v.status='submitted' and r.approval_status in ('submitted','variation_pending')) is_pending_review
from public.spending_requests r
join public.spending_request_revisions v on v.request_id=r.id
left join public.profiles cp on cp.id=v.created_by;

create or replace view public.v_request_review_history with (security_invoker=true) as
select
  rr.id review_id,
  rr.event_id,
  rr.request_id,
  rr.revision_id,
  v.revision_number,
  rr.reviewer_user_id,
  p.display_name reviewer_display_name,
  p.preferred_name reviewer_preferred_name,
  rr.decision,
  rr.reason,
  rr.created_at
from public.request_reviews rr
join public.spending_request_revisions v on v.id=rr.revision_id
join public.profiles p on p.id=rr.reviewer_user_id;

create or replace view public.v_department_spending_positions with (security_invoker=true) as
with approved as (
  select a.event_id,a.department_id,sum(a.net_minor)::bigint approved_net_minor,sum(a.gross_minor)::bigint approved_gross_minor
  from public.spending_requests r
  join public.spending_request_department_allocations a on a.revision_id=r.current_approved_revision_id
  where r.approval_status='approved'
  group by a.event_id,a.department_id
),
pending as (
  select proposed.event_id,proposed.department_id,
    sum(case when r.current_approved_revision_id is null then proposed.net_minor else greatest(proposed.net_minor-coalesce(base.net_minor,0),0) end)::bigint pending_net_minor,
    sum(case when r.current_approved_revision_id is null then proposed.gross_minor else greatest(proposed.gross_minor-coalesce(base.gross_minor,0),0) end)::bigint pending_gross_minor
  from public.spending_requests r
  join public.spending_request_revisions v on v.request_id=r.id and v.status='submitted'
  join public.spending_request_department_allocations proposed on proposed.revision_id=v.id
  left join public.spending_request_department_allocations base on base.revision_id=r.current_approved_revision_id and base.department_id=proposed.department_id
  where r.approval_status in ('submitted','variation_pending')
  group by proposed.event_id,proposed.department_id
)
select
  b.event_id,
  b.budget_version_id,
  b.department_id,
  b.department_name,
  b.department_code,
  b.current_budget_minor,
  coalesce(approved.approved_net_minor,0)::bigint approved_net_minor,
  coalesce(approved.approved_gross_minor,0)::bigint approved_gross_minor,
  coalesce(pending.pending_net_minor,0)::bigint pending_net_minor,
  coalesce(pending.pending_gross_minor,0)::bigint pending_gross_minor,
  (b.current_budget_minor-coalesce(approved.approved_net_minor,0))::bigint remaining_approved_minor,
  (b.current_budget_minor-coalesce(approved.approved_net_minor,0)-coalesce(pending.pending_net_minor,0))::bigint potential_remaining_minor
from public.v_active_budget_department_positions b
left join approved on approved.event_id=b.event_id and approved.department_id=b.department_id
left join pending on pending.event_id=b.event_id and pending.department_id=b.department_id;

create or replace view public.v_request_department_impacts with (security_invoker=true) as
select
  q.event_id,
  q.request_id,
  q.revision_id,
  q.request_type,
  a.department_id,
  d.name department_name,
  d.code department_code,
  coalesce(pos.current_budget_minor,0)::bigint current_budget_minor,
  coalesce(pos.approved_net_minor,0)::bigint approved_net_minor,
  coalesce(base.net_minor,0)::bigint baseline_net_minor,
  a.net_minor proposed_net_minor,
  (a.net_minor-coalesce(base.net_minor,0))::bigint incremental_net_minor,
  (coalesce(pos.current_budget_minor,0)-coalesce(pos.approved_net_minor,0)-case when q.request_type='variation' then greatest(a.net_minor-coalesce(base.net_minor,0),0) else a.net_minor end)::bigint potential_remaining_after_minor,
  ((coalesce(pos.current_budget_minor,0)-coalesce(pos.approved_net_minor,0)-case when q.request_type='variation' then greatest(a.net_minor-coalesce(base.net_minor,0),0) else a.net_minor end) < 0) over_budget
from public.v_approval_queue q
join public.spending_request_department_allocations a on a.revision_id=q.revision_id
join public.departments d on d.id=a.department_id
left join public.spending_requests r on r.id=q.request_id
left join public.spending_request_department_allocations base on base.revision_id=r.current_approved_revision_id and base.department_id=a.department_id
left join public.v_department_spending_positions pos on pos.event_id=q.event_id and pos.department_id=a.department_id;

create or replace view public.v_event_approval_context with (security_invoker=true) as
select
  e.id event_id,
  coalesce(rev.total_forecast_net_minor,0)::bigint forecast_net_revenue_minor,
  coalesce(abs.total_cost_budget_minor,0)::bigint total_cost_budget_minor,
  coalesce(abs.unallocated_contingency_minor,0)::bigint unallocated_contingency_minor,
  coalesce(approved.approved_net_minor,0)::bigint approved_net_spending_minor,
  coalesce(pending.pending_net_minor,0)::bigint pending_net_spending_minor,
  (coalesce(rev.total_forecast_net_minor,0)-coalesce(approved.approved_net_minor,0))::bigint formal_net_position_minor,
  (coalesce(rev.total_forecast_net_minor,0)-coalesce(approved.approved_net_minor,0)-coalesce(pending.pending_net_minor,0))::bigint potential_net_position_minor
from public.events e
left join public.v_event_revenue_summaries rev on rev.event_id=e.id
left join public.v_active_budget_summaries abs on abs.event_id=e.id
left join (
  select r.event_id,sum(v.net_minor)::bigint approved_net_minor
  from public.spending_requests r
  join public.spending_request_revisions v on v.id=r.current_approved_revision_id
  where r.approval_status='approved'
  group by r.event_id
) approved on approved.event_id=e.id
left join (
  select proposed.event_id,
    sum(case when r.current_approved_revision_id is null then proposed.net_minor else greatest(proposed.net_minor-coalesce(base.net_minor,0),0) end)::bigint pending_net_minor
  from public.spending_requests r
  join public.spending_request_revisions v on v.request_id=r.id and v.status='submitted'
  join public.spending_request_department_allocations proposed on proposed.revision_id=v.id
  left join public.spending_request_department_allocations base on base.revision_id=r.current_approved_revision_id and base.department_id=proposed.department_id
  where r.approval_status in ('submitted','variation_pending')
  group by proposed.event_id
) pending on pending.event_id=e.id;

create policy request_reviews_select_scoped on public.request_reviews for select to authenticated using(
  exists(
    select 1 from public.spending_requests r
    where r.id=request_reviews.request_id
      and r.event_id=request_reviews.event_id
      and (r.owner_user_id=(select auth.uid()) or public.is_event_treasurer(r.event_id) or (r.approval_status not in ('draft','cancelled','rejected') and public.can_view_event(r.event_id)))
  )
);
drop policy if exists reviews_select on public.request_reviews;

create index if not exists request_reviews_event_created_idx on public.request_reviews(event_id,created_at desc);
create index if not exists request_reviews_reviewer_created_idx on public.request_reviews(reviewer_user_id,created_at desc);
create index if not exists spending_requests_approved_revision_idx on public.spending_requests(current_approved_revision_id);
create index if not exists spending_requests_draft_revision_idx on public.spending_requests(current_draft_revision_id);

grant select on
  public.v_approval_queue,
  public.v_request_revision_history,
  public.v_request_review_history,
  public.v_department_spending_positions,
  public.v_request_department_impacts,
  public.v_event_approval_context
to authenticated;

grant execute on function
  public.update_spending_request_draft(uuid,uuid,text,text,text,text,date,bigint,bigint,bigint,numeric,public.vat_treatment,boolean,jsonb,jsonb,text),
  public.submit_spending_request(uuid),
  public.start_request_variation(uuid),
  public.decide_spending_request(uuid,uuid,public.review_decision,text)
to authenticated;

commit;
