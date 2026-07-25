begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

select is(
  (select public from storage.buckets where id='event-documents'),
  false,
  'event document bucket is private'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
create temp table draft_doc as
select * from public.begin_document_upload(
  '30000000-0000-0000-0000-000000000027',
  '70000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  null,
  'quote',
  'Lantern quote.pdf',
  'application/pdf',
  120::bigint,
  'Owner quote'
);

select matches((select object_path from draft_doc),'^30000000-0000-0000-0000-000000000027/.+/.+\.pdf$','object path is event/document/random based');
select isnt((select object_path from draft_doc),'Lantern quote.pdf','original filename is not used as the object path');
select is((select count(*)::bigint from public.v_visible_documents where document_id=(select document_id from draft_doc)),0::bigint,'pending document is hidden from visible document view');
select throws_ok(
  $$select public.finalise_document_upload((select document_id from draft_doc),120,'application/pdf')$$,
  'P0001',
  'Uploaded object was not found',
  'finalisation fails until the Storage object exists'
);

insert into storage.objects(bucket_id,name,owner,metadata)
select bucket_id,object_path,'10000000-0000-0000-0000-000000000003'::uuid,jsonb_build_object('size',120,'mimetype','application/pdf')
from draft_doc;

select lives_ok(
  $$select public.finalise_document_upload((select document_id from draft_doc),120,'application/pdf')$$,
  'creator can finalise after uploading the Storage object'
);
select is((select status::text from public.documents where id=(select document_id from draft_doc)),'finalised','finalised status is stored');
select is((select count(*)::bigint from public.activity_log where entity_id=(select document_id from draft_doc) and action='document.finalised' and visibility='private_owner'),1::bigint,'draft finalisation logs private-owner activity');
select is((select count(*)::bigint from public.v_visible_documents where document_id=(select document_id from draft_doc)),1::bigint,'creator can see finalised own draft document');
select ok(public.can_view_document((select document_id from draft_doc)),'creator can pass document access helper');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*)::bigint from public.v_visible_documents where document_id=(select document_id from draft_doc)),1::bigint,'treasurer can see private draft document metadata');
select is((select count(*)::bigint from storage.objects where bucket_id='event-documents' and name=(select object_path from draft_doc)),1::bigint,'treasurer can read matching Storage object metadata');
select is((select count(*)::bigint from public.v_event_activity_feed where entity_id=(select document_id from draft_doc)),1::bigint,'treasurer can see private draft document activity');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select is((select count(*)::bigint from public.v_visible_documents where document_id=(select document_id from draft_doc)),0::bigint,'other ordinary member cannot see private draft document metadata');
select is((select count(*)::bigint from storage.objects where bucket_id='event-documents' and name=(select object_path from draft_doc)),0::bigint,'other ordinary member cannot read private draft Storage object');
select is((select count(*)::bigint from public.v_event_activity_feed where entity_id=(select document_id from draft_doc)),0::bigint,'other ordinary member cannot infer private draft document activity');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select count(*)::bigint from public.v_visible_documents where document_id=(select document_id from draft_doc)),0::bigint,'president without treasurer cannot infer another private draft document');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select is((select count(*)::bigint from public.v_visible_documents where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'outsider cannot list Downing documents');
select throws_ok(
  $$select public.begin_document_upload('30000000-0000-0000-0000-000000000027','70000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001',null,'quote','bad.pdf','application/pdf',100,null)$$,
  'P0001',
  'Not authorised',
  'outsider cannot begin upload against another organisation event'
);

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
create temp table submitted_doc as
select * from public.begin_document_upload(
  '30000000-0000-0000-0000-000000000027',
  '70000000-0000-0000-0000-000000000004',
  '71000000-0000-0000-0000-000000000004',
  null,
  'contract',
  'Floral contract.pdf',
  'application/pdf',
  200::bigint,
  'Submitted contract'
);
insert into storage.objects(bucket_id,name,owner,metadata)
select bucket_id,object_path,'10000000-0000-0000-0000-000000000002'::uuid,jsonb_build_object('size',200,'mimetype','application/pdf')
from submitted_doc;
select lives_ok($$select public.finalise_document_upload((select document_id from submitted_doc),200,'application/pdf')$$,'treasurer can attach a submitted-request document');
select is((select count(*)::bigint from public.activity_log where entity_id=(select document_id from submitted_doc) and visibility='committee'),1::bigint,'submitted document activity is committee-visible');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select is((select count(*)::bigint from public.v_visible_documents where document_id=(select document_id from submitted_doc)),1::bigint,'ordinary member can see submitted request document');
select ok(public.can_view_document((select document_id from submitted_doc)),'ordinary member can pass submitted document helper');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select throws_ok(
  $$select public.begin_document_upload('30000000-0000-0000-0000-000000000027','70000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001',null,'quote','bad.exe','application/x-msdownload',100,null)$$,
  'P0001',
  'Unsupported file type',
  'unsupported MIME is rejected'
);
select throws_ok(
  $$select public.begin_document_upload('30000000-0000-0000-0000-000000000027','70000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001',null,'quote','too-large.pdf','application/pdf',10485761,null)$$,
  'P0001',
  'Invalid file size',
  'oversized upload intent is rejected'
);
select throws_ok(
  $$select public.begin_document_upload('30000000-0000-0000-0000-000000000027','70000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000004',null,'quote','wrong.pdf','application/pdf',100,null)$$,
  'P0001',
  'Document parent does not belong to request',
  'mismatched request and revision are rejected'
);
select throws_ok(
  $$select public.begin_document_upload('30000000-0000-0000-0000-000000000025','70000000-0000-0000-0000-000000000005','71000000-0000-0000-0000-000000000005',null,'quote','historical.pdf','application/pdf',100,null)$$,
  'P0001',
  'Not authorised',
  'historical event rejects upload intent'
);

select throws_ok(
  $$select public.finalise_document_upload((select document_id from submitted_doc),201,'application/pdf')$$,
  'P0001',
  'Not authorised',
  'already-finalised upload cannot be finalised again'
);

select lives_ok($$select public.void_document((select document_id from submitted_doc),'Wrong version uploaded')$$,'treasurer can void finalised submitted evidence with a reason');
select is((select status::text from public.documents where id=(select document_id from submitted_doc)),'voided','voiding preserves the document row');
select is((select count(*)::bigint from public.activity_log where entity_id=(select document_id from submitted_doc) and action='document.voided'),1::bigint,'voiding logs activity');
select throws_ok($$select public.void_document((select document_id from submitted_doc),'Again')$$,'P0001','Invalid document state','double void fails safely');
select throws_ok($$delete from storage.objects where bucket_id='event-documents' and name=(select object_path from submitted_doc)$$,'42501',null,'direct Storage deletion is denied');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select throws_ok($$select public.void_document((select document_id from draft_doc),'Member attempt')$$,'P0001','Not authorised','ordinary member cannot void another document');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select ok(exists(select 1 from public.v_event_activity_feed where event_id='30000000-0000-0000-0000-000000000027' order by created_at desc,activity_id desc limit 1),'activity feed is queryable and ordered by timestamp/id');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select is((select count(*)::bigint from public.v_event_activity_feed where event_id='30000000-0000-0000-0000-000000000027'),0::bigint,'outsider cannot read Downing activity feed rows');

select * from finish();
rollback;
