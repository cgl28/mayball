begin;

drop policy if exists activity_select on public.activity_log;
create policy activity_select on public.activity_log for select to authenticated using(
  public.can_view_event(event_id)
  and (
    visibility='committee'
    or (visibility in ('treasurer','private_owner') and public.is_event_treasurer(event_id))
    or actor_user_id=(select auth.uid())
  )
);

commit;
