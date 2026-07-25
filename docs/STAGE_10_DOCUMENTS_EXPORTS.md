# Stage 10: Documents, Activity And CSV Exports

Stage 10 adds private supporting-document uploads, document listing/download, event activity and CSV exports. It does not add invoice accounting, bank reconciliation, Ticket Tailor imports, production email or production malware scanning.

## Document Model

Documents live in `public.documents` and files live in the private Supabase Storage bucket `event-documents`.

Supported parent links are:

- Spending request revision documents.
- Payment documents, for treasurer-controlled evidence.

The original filename is display metadata only. Storage paths use `event_id/document_id/random-name.ext` and are not shown in the UI. Knowing a path is not sufficient for access because Storage policies verify a visible document metadata row.

## Visibility

- Pending uploads are hidden from `v_visible_documents`.
- Draft-linked documents inherit private draft visibility: creator and treasurer only.
- Submitted and approved request documents inherit request/revision visibility.
- Payment-linked document activity is treasurer-visible.
- Completed and archived events allow authorised downloads and exports but reject new uploads and voiding.
- Separate-organisation users cannot list, count, download or infer protected documents through the app or Storage policies.

## Upload Lifecycle

Uploads use a three-step flow:

1. `begin_document_upload` validates the signed-in user, event, parent record, event mutability, category, filename, MIME type and size, then creates pending metadata and a random Storage path.
2. The app uploads the file to the private Storage bucket using the user's Supabase session.
3. `finalise_document_upload` locks the metadata row, verifies the uploader, pending state, expected MIME/size and Storage object existence, then marks the document finalised and writes activity.

If upload or finalisation fails, the document does not appear as completed evidence. Abandoned pending metadata cleanup is deferred to operational hardening.

Allowed types are PDF, JPEG, PNG and DOCX. Maximum size is 10 MB.

## Download Design

Downloads go through `/events/[eventId]/documents/[documentId]/download`.

The route authenticates the user, loads the document under RLS, verifies visibility through `v_visible_documents`, then asks Supabase Storage for a 60-second signed URL. Signed URLs are never stored in PostgreSQL and permanent public URLs are not used.

## Voiding And Retention

Finalised documents are not overwritten or hard-deleted by the app. `void_document` records actor, reason and timestamp while retaining the original metadata and object. Replacement chains are schema-ready through `replaced_by_document_id`, but full replacement UI is deferred.

## Activity

`/events/[eventId]/activity` reads `v_event_activity_feed`, ordered by `created_at` and activity ID. The view exposes safe fields only: actor display name, action, category, entity type, summary, visibility and timestamp. Raw JSON metadata, Storage paths and tokens are not displayed.

## CSV Exports

`/events/[eventId]/exports` provides separate downloads for:

- Department budget positions.
- Budget-version history.
- Budget transfers.
- Ticket revenue forecast.
- Ticket-sales snapshot history.
- Other revenue.
- Spending requests.
- Request department allocations.
- Request components.
- Approval/revision history.
- Payments.
- Payment allocations.
- Activity log.

Exports use the signed-in user's Supabase session and existing RLS-filtered tables/views. The app does not use service-role queries or export hidden data and filter it afterwards.

Ticket snapshot history is exported as cumulative history. The latest non-void snapshot remains the current actual ticket position; snapshot rows must not be added together.

CSV output is UTF-8, has deterministic headers, uses exact integer minor-unit conversion for money decimals and neutralises spreadsheet formulas in user-controlled text by prefixing risky text with a single quote. Negative numeric money remains numeric.

## Permission Matrix

- Treasurer: exports RLS-visible financial data, including treasurer-visible drafts and payment evidence.
- President without treasurer: exports only rows visible under ordinary event/document RLS; no hidden financial powers are gained.
- Ordinary active member: exports committee-visible rows and their own private drafts only where RLS permits.
- Historical viewer: exports/downloads historical read-only data permitted by historical event access.
- Outsider: receives no protected rows and cannot download protected documents.

## Local Testing

Run:

```bash
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local > src/types/database.generated.ts
npx tsc --noEmit
npm run lint
npm test
npm run build
```

The pgTAP suite covers document metadata privacy, pending/finalised state, Storage read/insert policies, draft and submitted visibility, outsider denial, historical mutation denial, voiding and activity visibility.

## Known Limitations

- No production malware scanning.
- No ZIP archive export.
- No background job for abandoned pending-upload cleanup.
- No binary fixture files are committed.
- Payment document upload UI is not yet surfaced as a dedicated payment-detail section, although the database supports payment-linked documents.
