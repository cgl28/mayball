begin;

create or replace function public.search_organisations(p_query text)
returns table(id uuid,name text,is_associated boolean)
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); query_text text := btrim(coalesce(p_query,''));
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if char_length(query_text) < 2 then return; end if;
  return query
    select o.id,o.name,exists(select 1 from public.organisation_members om where om.organisation_id=o.id and om.user_id=actor and om.status='active')
    from public.organisations o
    where o.status='active' and o.name ilike '%' || query_text || '%'
    order by o.name asc
    limit 10;
end $$;

create or replace function public.join_organisation(p_organisation_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if not exists(select 1 from public.organisations where id=p_organisation_id and status='active') then raise exception 'Organisation is not available'; end if;
  insert into public.organisation_members(organisation_id,user_id,status)
    values(p_organisation_id,actor,'active')
    on conflict(organisation_id,user_id) do update set status='active',left_at=null,updated_at=now();
end $$;

create or replace function public.create_organisation(p_name text,p_slug text,p_legal_name text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid()); organisation_id uuid := gen_random_uuid(); organisation_slug text := public.normalise_slug(p_slug);
begin
  if actor is null then raise exception 'Not authorised'; end if;
  if nullif(btrim(coalesce(p_name,'')),'') is null then raise exception 'Organisation name is required'; end if;
  if exists(select 1 from public.organisations where lower(name)=lower(btrim(p_name))) then raise exception 'An organisation with this name already exists. Search and join it instead.'; end if;
  if nullif(organisation_slug,'') is null or organisation_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid organisation slug'; end if;
  insert into public.organisations(id,name,legal_name,slug,created_by) values(organisation_id,btrim(p_name),nullif(btrim(coalesce(p_legal_name,'')),''),organisation_slug,actor);
  insert into public.organisation_members(organisation_id,user_id,status) values(organisation_id,actor,'active');
  update public.profiles set preferred_organisation_id=organisation_id where id=actor;
  return organisation_id;
exception when unique_violation then raise exception 'Organisation already exists'; end $$;

grant execute on function public.search_organisations(text),public.join_organisation(uuid),public.create_organisation(text,text,text) to authenticated;
commit;
