# May Ball Finance Supabase package

This directory contains the executable MVP 1 database implementation.

## Run locally

Install Docker Desktop and the Supabase CLI, then run from the repository root:

```bash
supabase start
supabase db reset
supabase test db
supabase gen types typescript --local > src/types/database.generated.ts
```

`db reset` applies migrations in timestamp order and then `seed.sql`. Tests use pgTAP and fixed development identities. The seed password is `password`; these accounts and UUIDs must never be used in production.

## Migration contents

- `20260718000100_initial_schema.sql`: enums, tables, constraints and indexes.
- `20260718000200_functions_views_rls.sql`: triggers, authorization helpers, workflow RPCs, reporting views, grants and RLS.
- `20260718000300_storage.sql`: private Storage bucket and object policies.
- `20260718000400_domain_hardening.sql`: early hardening for profile privileges, component code decisions, ticket snapshot FKs, treasurer revenue policies, event completion/reopen and payment overpayment guard.
- `20260718000500_fix_submit_spending_request_status_cast.sql`: corrective spending submission RPC enum cast.
- `20260718000600_stage_2_governance_setup.sql`: president-controlled setup, departments, invitations, roles and department membership RPCs.
- `20260718000700_fix_issue_invitation_token_generation.sql`: corrective invitation token hashing/generation qualification.
- `20260718000800_fix_issue_invitation_role_check.sql`: corrective invitation role existence check.
- `20260718000900_stage_3_budget_contingency.sql`: treasurer-controlled budget draft editing, activation, active budget views and contingency transfers.
- `20260718001000_stage_4_revenue.sql`: treasurer-controlled ticket types, cumulative ticket snapshots, other revenue RPCs, append-only snapshot triggers, revenue views and indexes.
- `20260718001100_fix_ticket_type_display_order_arg.sql`: corrective ticket-type RPC display-order argument for generated TypeScript and integer clients.
- `20260718001200_stage_5_spending_request_drafts.sql`: private spending request draft create/update RPCs, corrected submission, submitted-revision immutability triggers and current-request view.
- `20260718001300_fix_submitted_revision_metadata_updates.sql`: corrective submitted-revision metadata trigger for future treasurer decisions.
- `20260718001400_lock_request_helper_functions.sql`: revokes direct execute on internal request allocation/component helper functions.
- `20260718001500_stage_6_treasurer_approval.sql`: treasurer approval decisions, changes-requested cloning, variation-safe decisions, append-only review triggers and approval impact views.
- `20260718001600_drop_stage_5_update_draft_overload.sql`: removes the older draft-update overload after adding change summaries.
- `20260718001700_fix_current_request_pending_revision_priority.sql`: makes the current-request view surface pending submitted variations for review while preserving the approved baseline pointer.
- `20260718001800_stage_7_payments.sql`: request-component payment recording, reversal, payment allocation consistency, overpayment protection and derived payment-position views.
- `20260718001900_stage_8_dashboard.sql`: dashboard reporting views for event financial position, department positions, draft exposure, pending approvals, activity and warnings.
- `20260718002000_stage_9_event_lifecycle.sql`: event lifecycle history, completion readiness, president-only completion/archive/reopen RPCs, direct lifecycle-update protection and historical-access hardening.
- `20260718002100_stage_10_documents_activity_exports.sql`: document upload lifecycle, Storage policy hardening, document/activity views and document RPCs.
- `20260718002200_fix_private_activity_treasurer_visibility.sql`: corrective activity RLS policy so treasurers can see private-owner activity for their event.

## Required application rule

Call the workflow RPCs for request draft creation/update/submission, request decisions, budget activation/transfers, revenue mutations and payments. Do not recreate these transitions in Next.js or use the service-role key from browser code.

Actual ticket revenue is cumulative snapshot history. Use `v_ticket_actual_summaries` or `v_latest_ticket_sales_snapshot` for the current position; do not sum historical snapshots together.

Spending request drafts are private planning records. A draft is visible only to its creator and event treasurers; another ordinary member and a president without treasurer role must not be able to list, count or directly retrieve it. Submitted requests become visible to active committee members but are not approved or paid.

Approval decisions must use `decide_spending_request`; application code must not mutate approval fields or review rows directly. Pending variations do not replace `current_approved_revision_id` until approved, and pending exposure views count only the incremental variation effect over the approved baseline.

Dashboard totals must use the Stage 8 reporting views, especially `v_event_financial_positions` and `v_event_department_financial_positions`. Do not recalculate formal forecast, potential forecast, current department budget, draft exposure, latest ticket actuals or payment-derived cash movement independently in application code.

Event lifecycle transitions must use `complete_event`, `archive_event` and `reopen_event`. Direct lifecycle status updates are blocked. Completion and archive make events historical/read-only; exceptional reopening returns the event to `reconciliation` without rewriting financial history.

Document uploads must use `begin_document_upload`, Storage upload and `finalise_document_upload`. Pending metadata is not a visible completed document. Downloads should be authorised under the signed-in user's session and served through short-lived Storage signed URLs; do not expose object paths or public URLs.
