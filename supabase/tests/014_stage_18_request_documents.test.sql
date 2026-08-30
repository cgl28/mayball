begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);

create temp table stable_request_doc as
select * from public.begin_document_upload(
  '30000000-0000-0000-0000-000000000027',
  '70000000-0000-0000-0000-000000000004',
  null, null, 'invoice', 'Final floral invoice.pdf', 'application/pdf', 321, 'Final payment invoice'
);
insert into storage.objects(bucket_id,name,owner,metadata)
select bucket_id,object_path,'10000000-0000-0000-0000-000000000003'::uuid,jsonb_build_object('size',321,'mimetype','application/pdf') from stable_request_doc;
select lives_ok($$select public.finalise_document_upload((select document_id from stable_request_doc),321,'application/pdf')$$,'request owner can finalise submitted-request evidence');
select is((select request_id from public.documents where id=(select document_id from stable_request_doc)),'70000000-0000-0000-0000-000000000004'::uuid,'new evidence is linked to the stable request');
select is((select revision_id from public.documents where id=(select document_id from stable_request_doc)),null::uuid,'new evidence does not depend on a revision');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select throws_ok(
  $$select public.begin_document_upload('30000000-0000-0000-0000-000000000027','70000000-0000-0000-0000-000000000004',null,null,'invoice','intrusion.pdf','application/pdf',100,null)$$,
  'P0001','Not authorised','unrelated committee member cannot attach evidence to another owner request'
);
select is((select count(*)::bigint from public.v_visible_documents where document_id=(select document_id from stable_request_doc)),1::bigint,'committee can read submitted request evidence');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.decide_spending_request('70000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000004','changes_requested','Please clarify')$$,'treasurer can return the request and create a new revision');
select is((select count(*)::bigint from public.v_visible_documents where document_id=(select document_id from stable_request_doc)),1::bigint,'stable request evidence remains visible after a replacement revision is created');
create temp table treasurer_request_doc as
select * from public.begin_document_upload('30000000-0000-0000-0000-000000000027','70000000-0000-0000-0000-000000000004',null,null,'receipt','Treasurer receipt.pdf','application/pdf',222,null);
insert into storage.objects(bucket_id,name,owner,metadata)
select bucket_id,object_path,'10000000-0000-0000-0000-000000000002'::uuid,jsonb_build_object('size',222,'mimetype','application/pdf') from treasurer_request_doc;
select lives_ok($$select public.finalise_document_upload((select document_id from treasurer_request_doc),222,'application/pdf')$$,'treasurer can attach request-level evidence to another owner request');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.void_document((select document_id from stable_request_doc),'Superseded invoice')$$,'request owner can void their submitted/changes-requested evidence');
select is((select status::text from public.documents where id=(select document_id from stable_request_doc)),'voided','voiding retains the request document row');

select * from finish();
rollback;
