begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

-- The active committee member has both an event membership and a durable
-- organisation membership. The policy must correlate to organisations.id.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select is(
  (select count(*)::bigint from public.organisations where id='20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'an active affiliated member can read their organisation through RLS'
);
select is(
  (select count(*)::bigint from public.organisations where id='20000000-0000-0000-0000-000000000002'),
  0::bigint,
  'an unrelated organisation remains hidden through RLS'
);

-- Invitation acceptance must also result in an organisation that is visible
-- to the newly affiliated member, without a UI-only fallback.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
create temp table organisation_visibility_invite as
  select * from public.issue_invitation(
    '30000000-0000-0000-0000-000000000027',
    'invitee@example.test',
    array['committee_member']::public.event_role[],
    array['40000000-0000-0000-0000-000000000003']::uuid[],
    14
  );
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000006',true);
select lives_ok(
  $$select public.accept_invitation((select invitation_token from organisation_visibility_invite))$$,
  'invited member can accept an organisation-affiliated event invitation'
);
select is(
  (select count(*)::bigint from public.organisations where id='20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'an invited member can read the organisation after acceptance'
);

-- Both supported Excel MIME types must pass the authorised upload intent
-- boundary, and the private bucket must accept their eventual upload.
reset role;
select ok(
  (select allowed_mime_types @> array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]::text[] from storage.buckets where id='event-documents'),
  'private event documents bucket permits Excel MIME types'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
create temp table excel_document_intent as
  select * from public.begin_document_upload(
    '30000000-0000-0000-0000-000000000027',
    '70000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    null,
    'supporting',
    'budget.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    123,
    'Budget workbook'
  );
select ok(
  (select object_path like '%.xlsx' from excel_document_intent),
  'XLSX upload intent stores an XLSX object path'
);
create temp table legacy_excel_document_intent as
  select * from public.begin_document_upload(
    '30000000-0000-0000-0000-000000000027',
    '70000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    null,
    'supporting',
    'legacy-budget.xls',
    'application/vnd.ms-excel',
    123,
    'Legacy budget workbook'
  );
select ok(
  (select object_path like '%.xls' from legacy_excel_document_intent),
  'legacy XLS upload intent stores an XLS object path'
);

select * from finish();
rollback;
