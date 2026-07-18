begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('event-documents','event-documents',false,10485760,array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy event_documents_select on storage.objects for select to authenticated using(
  bucket_id='event-documents' and exists(select 1 from public.documents d where d.bucket_id=storage.objects.bucket_id and d.object_path=storage.objects.name and public.can_view_event(d.event_id) and (d.revision_id is null or public.can_view_request_revision(d.revision_id)))
);
create policy event_documents_insert on storage.objects for insert to authenticated with check(
  bucket_id='event-documents' and exists(select 1 from public.documents d where d.bucket_id='event-documents' and d.object_path=storage.objects.name and d.uploaded_by=(select auth.uid()) and (d.revision_id is null or public.can_edit_request_revision(d.revision_id)))
);

commit;
