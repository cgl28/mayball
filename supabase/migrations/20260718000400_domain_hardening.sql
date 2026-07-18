begin;

-- Narrow mutable column privileges.
revoke update on public.profiles from authenticated;
grant update(display_name,preferred_name) on public.profiles to authenticated;
revoke select on public.event_reference_counters,public.department_reference_counters from authenticated;

-- Component codes repeat across immutable revisions of the same request.
alter table public.request_components drop constraint request_components_event_id_code_key;
alter table public.request_components add constraint request_components_revision_code_key unique(revision_id,code);

-- Complete same-event foreign-key coverage for ticket snapshot breakdowns.
alter table public.ticket_sales_snapshots add constraint ticket_sales_snapshots_event_id_id_key unique(event_id,id);
alter table public.ticket_types add constraint ticket_types_event_id_id_key unique(event_id,id);
alter table public.ticket_type_sales_snapshots drop constraint ticket_type_sales_snapshots_snapshot_id_fkey;
alter table public.ticket_type_sales_snapshots drop constraint ticket_type_sales_snapshots_ticket_type_id_fkey;
alter table public.ticket_type_sales_snapshots add foreign key(event_id,snapshot_id) references public.ticket_sales_snapshots(event_id,id);
alter table public.ticket_type_sales_snapshots add foreign key(event_id,ticket_type_id) references public.ticket_types(event_id,id);

create policy ticket_types_treasurer_insert on public.ticket_types for insert to authenticated with check(public.is_event_treasurer(event_id) and public.is_event_writable(event_id));
create policy ticket_types_treasurer_update on public.ticket_types for update to authenticated using(public.is_event_treasurer(event_id) and public.is_event_writable(event_id)) with check(public.is_event_treasurer(event_id) and public.is_event_writable(event_id));
create policy other_revenue_treasurer_insert on public.other_revenue_items for insert to authenticated with check(public.is_event_treasurer(event_id) and public.is_event_writable(event_id));
create policy other_revenue_treasurer_update on public.other_revenue_items for update to authenticated using(public.is_event_treasurer(event_id) and public.is_event_writable(event_id)) with check(public.is_event_treasurer(event_id) and public.is_event_writable(event_id));

create or replace function public.decide_spending_request(p_request_id uuid,p_revision_id uuid,p_decision public.review_decision,p_reason text default null) returns void
language plpgsql security definer set search_path='' as $$
declare r public.spending_requests; v public.spending_request_revisions; prior uuid; nid uuid; n integer;
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
    select max(revision_number)+1 into n from public.spending_request_revisions where request_id=r.id; nid:=gen_random_uuid();
    insert into public.spending_request_revisions(id,event_id,request_id,revision_number,status,title,description,business_justification,supplier_name,expected_payment_date,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment,vat_recoverable,change_summary,created_by)
      values(nid,v.event_id,v.request_id,n,'draft',v.title,v.description,v.business_justification,v.supplier_name,v.expected_payment_date,v.net_minor,v.vat_minor,v.gross_minor,v.vat_rate,v.vat_treatment,v.vat_recoverable,p_reason,r.owner_user_id);
    insert into public.spending_request_department_allocations(event_id,revision_id,department_id,net_minor,vat_minor,gross_minor)
      select event_id,nid,department_id,net_minor,vat_minor,gross_minor from public.spending_request_department_allocations where revision_id=v.id;
    insert into public.request_components(event_id,revision_id,sequence_number,code,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment)
      select event_id,nid,sequence_number,r.code||'.'||sequence_number,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment from public.request_components where revision_id=v.id;
    update public.spending_requests set approval_status='changes_requested',current_draft_revision_id=nid where id=r.id;
  else
    update public.spending_request_revisions set status='rejected',decided_at=now() where id=v.id;
    update public.spending_requests set approval_status=case when prior is null then 'rejected' else 'approved' end where id=r.id;
  end if;
  insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(r.event_id,(select auth.uid()),'request.'||p_decision::text,'spending_request',r.id,'Spending request '||r.code||' '||replace(p_decision::text,'_',' '));
  insert into public.notifications(user_id,event_id,type,entity_type,entity_id,title,body) values(r.owner_user_id,r.event_id,case p_decision when 'approved' then 'request_approved'::public.notification_type when 'rejected' then 'request_rejected'::public.notification_type else 'changes_requested'::public.notification_type end,'spending_request',r.id,'Request decision','Your request '||r.code||' was '||replace(p_decision::text,'_',' '));
end $$;

create or replace function public.complete_event(p_event_id uuid,p_acknowledge_warnings boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pending integer; unpaid integer;
begin
 if not public.is_event_president(p_event_id) then raise exception 'Not authorised'; end if;
 select count(*) into pending from public.spending_requests where event_id=p_event_id and approval_status in('submitted','variation_pending');
 select count(*) into unpaid from public.v_request_payment_positions where event_id=p_event_id and payment_status in('unpaid','partially_paid','overpaid');
 if (pending>0 or unpaid>0) and not p_acknowledge_warnings then return jsonb_build_object('completed',false,'pending_requests',pending,'unresolved_payments',unpaid); end if;
 update public.events set status='completed',completed_at=now(),archived_at=null where id=p_event_id and status in('planning','live','reconciliation');
 if not found then raise exception 'Event cannot be completed from current status'; end if;
 insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary) values(p_event_id,(select auth.uid()),'event.completed','event',p_event_id,'Event marked completed');
 return jsonb_build_object('completed',true,'pending_requests',pending,'unresolved_payments',unpaid);
end $$;

create or replace function public.reopen_event(p_event_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_event_president(p_event_id) or nullif(btrim(p_reason),'') is null then raise exception 'Not authorised or reason missing'; end if;
 update public.events set status='reconciliation',completed_at=null,archived_at=null,reopened_at=now() where id=p_event_id and status in('completed','archived');
 if not found then raise exception 'Event is not completed'; end if;
 insert into public.activity_log(event_id,actor_user_id,action,entity_type,entity_id,summary,metadata) values(p_event_id,(select auth.uid()),'event.reopened','event',p_event_id,'Event reopened',jsonb_build_object('reason',p_reason));
end $$;

grant execute on function public.complete_event(uuid,boolean),public.reopen_event(uuid,text) to authenticated;

-- Prevent a recorded payment taking any request beyond its current approved gross.
create or replace function public.enforce_request_not_overpaid() returns trigger language plpgsql set search_path='' as $$
declare approved bigint; paid bigint;
begin
 select v.gross_minor into approved from public.spending_requests r join public.spending_request_revisions v on v.id=r.current_approved_revision_id where r.id=new.request_id;
 select coalesce(sum(pa.gross_minor),0) into paid from public.payment_allocations pa join public.payments p on p.id=pa.payment_id where pa.request_id=new.request_id and p.status='recorded';
 if paid>approved then raise exception 'Payment allocations exceed approved request amount'; end if; return new;
end $$;
create constraint trigger payment_request_not_overpaid after insert or update on public.payment_allocations deferrable initially deferred for each row execute function public.enforce_request_not_overpaid();

commit;
