begin;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['profiles','organisations','organisation_members','events','event_members','departments','budget_versions','department_budget_allocations','ticket_types','other_revenue_items','spending_requests','spending_request_revisions','spending_request_department_allocations','request_components','invitations'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
  end loop;
end $$;

create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),split_part(coalesce(new.email,'User'),'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.is_active_event_member(p_event_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.event_members em where em.event_id=p_event_id and em.user_id=(select auth.uid()) and em.status='active')
$$;
create or replace function public.has_event_role(p_event_id uuid,p_role public.event_role) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.event_members em join public.event_member_roles r on r.event_id=em.event_id and r.event_member_id=em.id
    where em.event_id=p_event_id and em.user_id=(select auth.uid()) and em.status='active' and r.role=p_role)
$$;
create or replace function public.is_event_president(p_event_id uuid) returns boolean language sql stable set search_path='' as $$ select public.has_event_role(p_event_id,'president') $$;
create or replace function public.is_event_treasurer(p_event_id uuid) returns boolean language sql stable set search_path='' as $$ select public.has_event_role(p_event_id,'treasurer') $$;
create or replace function public.can_view_historical_event(p_event_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.events old
    join public.events current on current.organisation_id=old.organisation_id and current.status not in ('completed','archived')
    join public.event_members em on em.event_id=current.id and em.user_id=(select auth.uid()) and em.status='active'
    where old.id=p_event_id and old.status in ('completed','archived'))
$$;
create or replace function public.can_view_event(p_event_id uuid) returns boolean language sql stable set search_path='' as $$
  select public.is_active_event_member(p_event_id) or public.can_view_historical_event(p_event_id)
$$;
create or replace function public.is_event_writable(p_event_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.events e where e.id=p_event_id and e.status in ('setup','planning','live','reconciliation'))
$$;
create or replace function public.is_request_owner(p_request_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.spending_requests r where r.id=p_request_id and r.owner_user_id=(select auth.uid()))
$$;
create or replace function public.can_view_request_revision(p_revision_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.spending_request_revisions v join public.spending_requests r on r.id=v.request_id
    where v.id=p_revision_id and (r.owner_user_id=(select auth.uid()) or public.is_event_treasurer(v.event_id)
      or (v.status<>'draft' and public.can_view_event(v.event_id))))
$$;
create or replace function public.can_edit_request_revision(p_revision_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.spending_request_revisions v join public.spending_requests r on r.id=v.request_id
    where v.id=p_revision_id and v.status='draft' and r.owner_user_id=(select auth.uid()) and public.is_event_writable(v.event_id))
$$;

create or replace function public.assert_revision_balanced(p_revision_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v public.spending_request_revisions; an bigint; av bigint; ag bigint; cn bigint; cv bigint; cg bigint;
begin
  select * into strict v from public.spending_request_revisions where id=p_revision_id;
  select coalesce(sum(net_minor),0),coalesce(sum(vat_minor),0),coalesce(sum(gross_minor),0) into an,av,ag from public.spending_request_department_allocations where revision_id=p_revision_id;
  select coalesce(sum(net_minor),0),coalesce(sum(vat_minor),0),coalesce(sum(gross_minor),0) into cn,cv,cg from public.request_components where revision_id=p_revision_id;
  if (an,av,ag)<>(v.net_minor,v.vat_minor,v.gross_minor) then raise exception 'Department allocations do not reconcile'; end if;
  if (cn,cv,cg)<>(v.net_minor,v.vat_minor,v.gross_minor) then raise exception 'Components do not reconcile'; end if;
end $$;

create or replace function public.create_spending_request(p_event_id uuid,p_primary_department_id uuid,p_title text,p_description text,
 p_net_minor bigint,p_vat_minor bigint,p_vat_treatment public.vat_treatment,p_expected_date date default null)
returns table(request_id uuid,revision_id uuid,request_code text) language plpgsql security definer set search_path='' as $$
declare dep public.departments; ev public.events; seq integer; rid uuid:=gen_random_uuid(); vid uuid:=gen_random_uuid(); c text;
begin
  if not public.is_active_event_member(p_event_id) or not public.is_event_writable(p_event_id) then raise exception 'Not authorised'; end if;
  select * into strict dep from public.departments where id=p_primary_department_id and event_id=p_event_id and is_active;
  select * into strict ev from public.events where id=p_event_id;
  insert into public.department_reference_counters(event_id,department_id,next_request_number) values(p_event_id,dep.id,2)
    on conflict(event_id,department_id) do update set next_request_number=public.department_reference_counters.next_request_number+1,updated_at=now()
    returning next_request_number-1 into seq;
  c:=ev.code||'_'||dep.code||'_'||seq;
  insert into public.spending_requests(id,event_id,code,owner_user_id,primary_department_id,current_draft_revision_id) values(rid,p_event_id,c,(select auth.uid()),dep.id,vid);
  insert into public.spending_request_revisions(id,event_id,request_id,revision_number,title,description,expected_payment_date,net_minor,vat_minor,gross_minor,vat_treatment,created_by)
    values(vid,p_event_id,rid,1,p_title,p_description,p_expected_date,p_net_minor,p_vat_minor,p_net_minor+p_vat_minor,p_vat_treatment,(select auth.uid()));
  insert into public.spending_request_department_allocations(event_id,revision_id,department_id,net_minor,vat_minor,gross_minor)
    values(p_event_id,vid,dep.id,p_net_minor,p_vat_minor,p_net_minor+p_vat_minor);
  insert into public.request_components(event_id,revision_id,sequence_number,code,description,expected_payment_date,net_minor,vat_minor,gross_minor,vat_treatment)
    values(p_event_id,vid,1,c||'.1',p_title,p_expected_date,p_net_minor,p_vat_minor,p_net_minor+p_vat_minor,p_vat_treatment);
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,visibility) values(p_event_id,(select auth.uid()),'request.created','spending_request',rid,'Spending request '||c||' created','private_owner');
  return query select rid,vid,c;
end $$;

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
  update public.spending_requests set approval_status=case when current_approved_revision_id is null then 'submitted' else 'variation_pending' end,
    submitted_at=now(),current_draft_revision_id=null where id=r.id;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(r.event_id,(select auth.uid()),'request.submitted','spending_request',r.id,'Spending request '||r.code||' submitted');
end $$;

create or replace function public.start_request_variation(p_request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; old public.spending_request_revisions; nid uuid:=gen_random_uuid(); n integer;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if r.owner_user_id<>(select auth.uid()) or r.approval_status<>'approved' or r.current_draft_revision_id is not null then raise exception 'Variation not allowed'; end if;
  select * into strict old from public.spending_request_revisions where id=r.current_approved_revision_id;
  select max(revision_number)+1 into n from public.spending_request_revisions where request_id=r.id;
  insert into public.spending_request_revisions(id,event_id,request_id,revision_number,status,title,description,business_justification,supplier_name,expected_payment_date,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment,vat_recoverable,created_by)
  values(nid,old.event_id,old.request_id,n,'draft',old.title,old.description,old.business_justification,old.supplier_name,old.expected_payment_date,old.net_minor,old.vat_minor,old.gross_minor,old.vat_rate,old.vat_treatment,old.vat_recoverable,(select auth.uid()));
  insert into public.spending_request_department_allocations(event_id,revision_id,department_id,net_minor,vat_minor,gross_minor)
    select event_id,nid,department_id,net_minor,vat_minor,gross_minor from public.spending_request_department_allocations where revision_id=old.id;
  insert into public.request_components(event_id,revision_id,sequence_number,code,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment)
    select event_id,nid,sequence_number,r.code||'.'||sequence_number,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment from public.request_components where revision_id=old.id;
  update public.spending_requests set current_draft_revision_id=nid where id=r.id; return nid;
end $$;

create or replace function public.decide_spending_request(p_request_id uuid,p_revision_id uuid,p_decision public.review_decision,p_reason text default null) returns void
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; v public.spending_request_revisions; prior uuid;
begin
  select * into strict r from public.spending_requests where id=p_request_id for update;
  if not public.is_event_treasurer(r.event_id) or not public.is_event_writable(r.event_id) then raise exception 'Not authorised'; end if;
  select * into strict v from public.spending_request_revisions where id=p_revision_id and request_id=r.id for update;
  if v.status<>'submitted' then raise exception 'Revision is not awaiting decision'; end if;
  if p_decision<>'approved' and nullif(btrim(p_reason),'') is null then raise exception 'Reason required'; end if;
  prior:=r.current_approved_revision_id;
  insert into public.request_reviews(event_id,request_id,revision_id,reviewer_user_id,decision,reason) values(r.event_id,r.id,v.id,(select auth.uid()),p_decision,p_reason);
  if p_decision='approved' then
    if prior is not null then update public.spending_request_revisions set status='superseded' where id=prior; end if;
    update public.spending_request_revisions set status='approved',decided_at=now() where id=v.id;
    update public.spending_requests set approval_status='approved',current_approved_revision_id=v.id,approved_at=now() where id=r.id;
  elsif p_decision='changes_requested' then
    update public.spending_request_revisions set status='changes_requested',decided_at=now() where id=v.id;
    update public.spending_requests set approval_status='changes_requested' where id=r.id;
  else
    update public.spending_request_revisions set status='rejected',decided_at=now() where id=v.id;
    update public.spending_requests set approval_status=case when prior is null then 'rejected' else 'approved' end where id=r.id;
  end if;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(r.event_id,(select auth.uid()),'request.'||p_decision::text,'spending_request',r.id,'Spending request '||r.code||' '||replace(p_decision::text,'_',' '));
  insert into public.notifications(user_id,event_id,type,entity_type,entity_id,title,body) values(r.owner_user_id,r.event_id,case p_decision when 'approved' then 'request_approved'::public.notification_type when 'rejected' then 'request_rejected'::public.notification_type else 'changes_requested'::public.notification_type end,'spending_request',r.id,'Request decision','Your request '||r.code||' was '||replace(p_decision::text,'_',' '));
end $$;

create or replace function public.activate_budget_version(p_budget_version_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare b public.budget_versions;
begin select * into strict b from public.budget_versions where id=p_budget_version_id for update;
 if not public.is_event_treasurer(b.event_id) or not public.is_event_writable(b.event_id) or b.status<>'draft' then raise exception 'Not authorised or not draft'; end if;
 update public.budget_versions set status='superseded' where event_id=b.event_id and status='active';
 update public.budget_versions set status='active',effective_date=current_date,activated_by=(select auth.uid()),activated_at=now() where id=b.id;
 insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(b.event_id,(select auth.uid()),'budget.activated','budget_version',b.id,'Budget version activated'); end $$;

create or replace function public.transfer_contingency(p_budget_version_id uuid,p_department_id uuid,p_amount_minor bigint,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.budget_versions; available bigint; tid uuid:=gen_random_uuid();
begin select * into strict b from public.budget_versions where id=p_budget_version_id for update;
 if not public.is_event_treasurer(b.event_id) or b.status<>'active' or p_amount_minor<=0 then raise exception 'Not authorised'; end if;
 perform 1 from public.departments where id=p_department_id and event_id=b.event_id;
 select b.original_contingency_minor-coalesce(sum(case when from_department_id is null then amount_minor else -amount_minor end),0) into available from public.budget_transfers where budget_version_id=b.id;
 if p_amount_minor>available then raise exception 'Insufficient contingency'; end if;
 insert into public.budget_transfers(id,event_id,budget_version_id,to_department_id,amount_minor,reason,created_by) values(tid,b.event_id,b.id,p_department_id,p_amount_minor,p_reason,(select auth.uid()));
 insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(b.event_id,(select auth.uid()),'budget.transferred','budget_transfer',tid,'Contingency allocated'); return tid; end $$;

create or replace function public.record_payment(p_event_id uuid,p_payment_date date,p_payee text,p_gross_minor bigint,p_bank_reference text,p_component_ids uuid[],p_allocation_gross_minor bigint[])
returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid:=gen_random_uuid(); seq integer; ev public.events; i integer; req uuid;
begin
 if not public.is_event_treasurer(p_event_id) or not public.is_event_writable(p_event_id) then raise exception 'Not authorised'; end if;
 if array_length(p_component_ids,1) is null or array_length(p_component_ids,1)<>array_length(p_allocation_gross_minor,1) then raise exception 'Invalid allocations'; end if;
 if (select sum(x) from unnest(p_allocation_gross_minor)x)<>p_gross_minor then raise exception 'Allocations do not reconcile'; end if;
 select * into strict ev from public.events where id=p_event_id;
 insert into public.event_reference_counters(event_id,next_payment_number) values(p_event_id,2) on conflict(event_id) do update set next_payment_number=public.event_reference_counters.next_payment_number+1,updated_at=now() returning next_payment_number-1 into seq;
 insert into public.payments(id,event_id,code,payment_date,gross_minor,bank_reference,payee,entered_by) values(pid,p_event_id,'PAY-'||ev.event_year||'-'||lpad(seq::text,4,'0'),p_payment_date,p_gross_minor,p_bank_reference,p_payee,(select auth.uid()));
 for i in 1..array_length(p_component_ids,1) loop
   select r.id into strict req from public.request_components c join public.spending_request_revisions v on v.id=c.revision_id join public.spending_requests r on r.id=v.request_id
     where c.id=p_component_ids[i] and c.event_id=p_event_id and v.status in ('approved','superseded') and r.current_approved_revision_id is not null;
   insert into public.payment_allocations(event_id,payment_id,request_id,request_component_id,gross_minor) values(p_event_id,pid,req,p_component_ids[i],p_allocation_gross_minor[i]);
 end loop;
 insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(p_event_id,(select auth.uid()),'payment.recorded','payment',pid,'Payment recorded for '||p_payee); return pid;
end $$;

create or replace function public.reverse_payment(p_payment_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.payments; begin select * into strict p from public.payments where id=p_payment_id for update;
 if not public.is_event_treasurer(p.event_id) or p.status<>'recorded' or nullif(btrim(p_reason),'') is null then raise exception 'Not authorised or invalid reversal'; end if;
 update public.payments set status='reversed',reversed_at=now(),reversed_by=(select auth.uid()),reversal_reason=p_reason where id=p.id;
 insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(p.event_id,(select auth.uid()),'payment.reversed','payment',p.id,'Payment reversed'); end $$;

create or replace view public.v_latest_ticket_sales_snapshot with (security_invoker=true) as
 select distinct on(event_id) * from public.ticket_sales_snapshots where not is_void order by event_id,captured_at desc,created_at desc;
create or replace view public.v_request_payment_positions with (security_invoker=true) as
 select r.id request_id,r.event_id,r.code,v.net_minor approved_net_minor,v.gross_minor approved_gross_minor,
 coalesce(sum(pa.gross_minor) filter(where p.status='recorded'),0)::bigint paid_gross_minor,
 (v.gross_minor-coalesce(sum(pa.gross_minor) filter(where p.status='recorded'),0))::bigint outstanding_gross_minor,
 case when v.id is null then 'not_applicable' when coalesce(sum(pa.gross_minor) filter(where p.status='recorded'),0)=0 then 'unpaid'
 when coalesce(sum(pa.gross_minor) filter(where p.status='recorded'),0)<v.gross_minor then 'partially_paid'
 when coalesce(sum(pa.gross_minor) filter(where p.status='recorded'),0)=v.gross_minor then 'paid' else 'overpaid' end payment_status
 from public.spending_requests r left join public.spending_request_revisions v on v.id=r.current_approved_revision_id
 left join public.payment_allocations pa on pa.request_id=r.id left join public.payments p on p.id=pa.payment_id group by r.id,v.id;

-- Grants and RLS.
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert,update on public.profiles,public.ticket_types,public.other_revenue_items,public.spending_request_revisions,public.spending_request_department_allocations,public.request_components to authenticated;
revoke delete on all tables in schema public from anon,authenticated;
revoke insert,update,delete on public.activity_log,public.request_reviews,public.payments,public.payment_allocations,public.budget_transfers from authenticated;
grant execute on function public.create_spending_request(uuid,uuid,text,text,bigint,bigint,public.vat_treatment,date),public.submit_spending_request(uuid),public.start_request_variation(uuid),public.decide_spending_request(uuid,uuid,public.review_decision,text),public.activate_budget_version(uuid),public.transfer_contingency(uuid,uuid,bigint,text),public.record_payment(uuid,date,text,bigint,text,uuid[],bigint[]),public.reverse_payment(uuid,text) to authenticated;

do $$ declare t text; begin foreach t in array array['profiles','organisations','organisation_members','events','event_members','event_member_roles','departments','department_members','budget_versions','department_budget_allocations','budget_transfers','ticket_types','ticket_sales_snapshots','ticket_type_sales_snapshots','other_revenue_items','spending_requests','spending_request_revisions','spending_request_department_allocations','request_components','request_reviews','payments','payment_allocations','invitations','invitation_roles','invitation_departments','notifications','activity_log','documents','event_reference_counters','department_reference_counters'] loop execute format('alter table public.%I enable row level security',t); execute format('alter table public.%I force row level security',t); end loop; end $$;

create policy profiles_select on public.profiles for select to authenticated using(id=(select auth.uid()) or exists(select 1 from public.event_members a join public.event_members b on b.event_id=a.event_id where a.user_id=(select auth.uid()) and a.status='active' and b.user_id=profiles.id and b.status='active'));
create policy profiles_update_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy organisations_select on public.organisations for select to authenticated using(exists(select 1 from public.events e where e.organisation_id=id and public.can_view_event(e.id)));
create policy events_select on public.events for select to authenticated using(public.can_view_event(id));
create policy event_scoped_select on public.event_members for select to authenticated using(public.can_view_event(event_id));
create policy roles_select on public.event_member_roles for select to authenticated using(public.can_view_event(event_id));
create policy departments_select on public.departments for select to authenticated using(public.can_view_event(event_id));
create policy department_members_select on public.department_members for select to authenticated using(public.can_view_event(event_id));
create policy budgets_select on public.budget_versions for select to authenticated using(public.can_view_event(event_id));
create policy budget_alloc_select on public.department_budget_allocations for select to authenticated using(public.can_view_event(event_id));
create policy transfers_select on public.budget_transfers for select to authenticated using(public.can_view_event(event_id));
create policy tickets_select on public.ticket_types for select to authenticated using(public.can_view_event(event_id));
create policy ticket_snapshots_select on public.ticket_sales_snapshots for select to authenticated using(public.can_view_event(event_id));
create policy ticket_type_snapshots_select on public.ticket_type_sales_snapshots for select to authenticated using(public.can_view_event(event_id));
create policy other_revenue_select on public.other_revenue_items for select to authenticated using(public.can_view_event(event_id));
create policy requests_select on public.spending_requests for select to authenticated using(owner_user_id=(select auth.uid()) or public.is_event_treasurer(event_id) or (approval_status not in('draft','cancelled','rejected') and public.can_view_event(event_id)));
create policy revisions_select on public.spending_request_revisions for select to authenticated using(public.can_view_request_revision(id));
create policy revisions_update_owner on public.spending_request_revisions for update to authenticated using(public.can_edit_request_revision(id)) with check(public.can_edit_request_revision(id));
create policy request_alloc_select on public.spending_request_department_allocations for select to authenticated using(public.can_view_request_revision(revision_id));
create policy request_alloc_write on public.spending_request_department_allocations for all to authenticated using(public.can_edit_request_revision(revision_id)) with check(public.can_edit_request_revision(revision_id));
create policy components_select on public.request_components for select to authenticated using(public.can_view_request_revision(revision_id));
create policy components_write on public.request_components for all to authenticated using(public.can_edit_request_revision(revision_id)) with check(public.can_edit_request_revision(revision_id));
create policy reviews_select on public.request_reviews for select to authenticated using(public.can_view_event(event_id));
create policy payments_select on public.payments for select to authenticated using(public.can_view_event(event_id));
create policy payment_alloc_select on public.payment_allocations for select to authenticated using(public.can_view_event(event_id));
create policy notifications_self on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_read on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy activity_select on public.activity_log for select to authenticated using(public.can_view_event(event_id) and (visibility='committee' or (visibility='treasurer' and public.is_event_treasurer(event_id)) or actor_user_id=(select auth.uid())));
create policy documents_select on public.documents for select to authenticated using(public.can_view_event(event_id) and (revision_id is null or public.can_view_request_revision(revision_id)));
create policy organisation_members_select on public.organisation_members for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.events e where e.organisation_id=organisation_members.organisation_id and public.can_view_event(e.id)));

commit;
