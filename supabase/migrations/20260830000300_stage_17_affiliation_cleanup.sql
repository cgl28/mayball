begin;

-- Organisation affiliation is established by creating or accepting an event,
-- never by a client-side profile action.
revoke all on function public.join_organisation(uuid) from public, authenticated;
revoke all on function public.search_organisations(text) from public, authenticated;
revoke all on function public.create_organisation(text,text,text) from public, authenticated;

create or replace function public.set_preferred_organisation(p_organisation_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if p_organisation_id is not null and not exists (
    select 1 from public.organisation_members
    where organisation_id=p_organisation_id and user_id=actor and status='active'
  ) then raise exception 'Not authorised'; end if;
  update public.profiles set preferred_organisation_id=p_organisation_id where id=actor;
end $$;

revoke all on function public.set_preferred_organisation(uuid) from public;
grant execute on function public.set_preferred_organisation(uuid) to authenticated;
commit;
