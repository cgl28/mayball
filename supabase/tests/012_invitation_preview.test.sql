begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
create temp table preview_invite as
  select * from public.issue_invitation(
    '30000000-0000-0000-0000-000000000027',
    ' Invitee@Example.Test ',
    array['committee_member','treasurer']::public.event_role[],
    array['40000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000004']::uuid[],
    14
  );

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000006',true);
create temp table invite_preview as
  select * from public.get_invitation_preview((select invitation_token from preview_invite));
select is((select event_name from invite_preview),'Downing May Ball 2027','preview exposes safe event name to invited user');
select is((select organisation_name from invite_preview),'Downing May Ball','preview exposes safe organisation name');
select is((select invitation_status from invite_preview),'pending'::public.invitation_status,'preview reports pending status');
select ok((select roles @> array['committee_member','treasurer']::public.event_role[] from invite_preview),'preview includes intended roles');
select ok((select departments @> array['Security','Welfare']::text[] from invite_preview),'preview includes intended departments');
select is((select already_member from invite_preview),false,'preview reports non-member before acceptance');

select lives_ok($$select public.accept_invitation((select invitation_token from preview_invite))$$,'invited user can accept after preview');
select is((select already_member from public.get_invitation_preview((select invitation_token from preview_invite))),true,'preview is idempotent for accepted invitation by same user');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
create temp table wrong_email_preview_invite as
  select * from public.issue_invitation(
    '30000000-0000-0000-0000-000000000027',
    'invitee@example.test',
    array['committee_member']::public.event_role[],
    array[]::uuid[],
    14
  );
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000007',true);
select throws_ok($$select public.get_invitation_preview((select invitation_token from wrong_email_preview_invite))$$,'P0001','Invitation email does not match signed-in user','wrong email cannot preview invitation');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
create temp table revoked_preview_invite as
  select * from public.issue_invitation(
    '30000000-0000-0000-0000-000000000027',
    'noevents@example.test',
    array['committee_member']::public.event_role[],
    array[]::uuid[],
    14
  );
select public.revoke_invitation((select invitation_id from revoked_preview_invite));
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000007',true);
select throws_ok($$select public.get_invitation_preview((select invitation_token from revoked_preview_invite))$$,'P0001','Invitation is not pending','revoked invitation cannot be previewed as joinable');

select * from finish();
rollback;
