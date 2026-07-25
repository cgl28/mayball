# Stage 5: Spending Request Drafts

Stage 5 adds private spending request drafts and owner submission. It does not add approval decisions, request changes, variations, payments, invoice upload, dashboards or exports.

## Routes

- `/events/[eventId]/requests`: RLS-filtered request list with basic filters.
- `/events/[eventId]/requests/new`: create a draft for an active writable event.
- `/events/[eventId]/requests/[requestId]`: request detail, allocations and components.
- `/events/[eventId]/requests/[requestId]/edit`: owner-only draft editing.
- `/events/[eventId]/requests/[requestId]/review`: owner-only final submission screen.

The event ID in the URL is the selected-event context. Every page loads through the signed-in Supabase session, so manually changing IDs cannot bypass RLS.

## Draft Privacy

Drafts are private to the creator and event treasurers. A different ordinary member cannot list another member's draft, retrieve it by ID, see it through `v_spending_request_current_revisions`, infer it through draft counts, or access its child allocations/components. A president without treasurer role has the same draft visibility as an ordinary non-owner.

Treasurers may see draft content for financial oversight, but they cannot edit or submit another user's draft. Only the creator can edit or submit their own draft.

## Request Creation

Draft creation uses `create_spending_request_draft`, a transactional PostgreSQL RPC. The RPC derives the owner from `auth.uid()`, generates the reference code from the primary department counter, creates the stable request row, creates the draft revision, writes allocations/components, verifies reconciliation and logs a private activity entry.

Draft editing uses `update_spending_request_draft` and rewrites allocations/components atomically. Submitted revisions, allocations and components are protected from direct content edits.

## Submission

Submission uses `submit_spending_request`. It changes the request to `submitted`, marks the draft revision `submitted`, clears `current_draft_revision_id`, logs activity and makes the submitted request visible to active committee members. Submission does not approve the request, create a payment obligation, allocate payment, or mark anything as paid.

## Local Personas

All local seed users use the password documented in `supabase/README.md`.

- `membera@example.test`: ordinary Downing member with a private draft and a submitted fixture.
- `memberb@example.test`: ordinary Downing member who cannot see Member A's drafts.
- `treasurer@example.test`: Downing treasurer, not president; can see drafts but cannot edit another creator's draft.
- `president@example.test`: Downing president, not treasurer; cannot see another member's draft and cannot use treasurer financial RPCs.
- `outsider@example.test`: separate-organisation user; cannot enumerate Downing requests.

## Known Limitations

The current form offers three component rows per save. The database RPC accepts a JSON array and is not limited to three components.

Request cancellation, approval, rejection, request-changes, variations, invoice/document handling and payments are deliberately deferred.
