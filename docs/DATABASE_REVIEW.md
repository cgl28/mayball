# Database Review

Review date: 18 July 2026
Latest executable-package update: 18 July 2026

Scope: `AGENTS.md`, product/database specifications, `supabase/README.md`, all migrations, `supabase/seed.sql`, all pgTAP tests, and the existing Next.js/package scaffold. No product feature pages were implemented and no remote Supabase changes were made.

## Executive Summary

The intended architecture is a Next.js App Router application backed by Supabase Auth, PostgreSQL, RLS, workflow RPCs, reporting views, and private Supabase Storage. The financial model separates forecasts, budgets, approvals, revisions, payments, and reporting. Authoritative money is stored as integer minor units, event roles live on event membership, event-owned records carry `event_id`, approval status is separate from payment status, and completion is derived from payment allocations.

The repository has the right broad shape for `AGENTS.md`: Next.js, TypeScript, Tailwind, Supabase SSR helpers, Supabase migrations, seed, and pgTAP tests exist. However, it is still a starter scaffold plus a first-pass database package. Important database-readiness criteria are not yet met, and the seed/tests are much thinner than the database specification requires.

## Validation Results

Current results after starting Docker:

- `npx supabase db reset`: passed. Migrations `20260718000100` through `20260718000500` applied and `supabase/seed.sql` seeded successfully.
- `npx supabase test db`: passed. All 3 pgTAP files passed, 35 tests total.
- `npx supabase gen types typescript --local > src/types/database.generated.ts`: passed and generated `src/types/database.generated.ts`.
- Supabase CLI version observed locally: `2.109.1`.

Stage 2 validation on 2026-07-18:

- `npx supabase db reset`: passed. Migrations `20260718000100` through `20260718000800` applied and `supabase/seed.sql` seeded successfully.
- `npx supabase test db`: passed. All 4 pgTAP files passed, 70 tests total.
- `npx supabase gen types typescript --local > src/types/database.generated.ts`: passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm test`: passed. 7 files, 29 tests.
- `npm run build`: passed.

Stage 3 validation on 2026-07-18:

- `npx supabase db reset`: passed. Migrations `20260718000100` through `20260718000900` applied and `supabase/seed.sql` seeded successfully.
- `npx supabase test db`: passed. All 5 pgTAP files passed, 99 tests total.
- `npx supabase gen types typescript --local > src/types/database.generated.ts`: passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm test`: passed. 8 files, 36 tests.
- `npm run build`: passed.

Stage 4 validation on 2026-07-18:

- `npx supabase db reset`: passed. Migrations `20260718000100` through `20260718001100` applied and `supabase/seed.sql` seeded successfully.
- `npx supabase test db`: passed. All 6 pgTAP files passed, 143 tests total.
- `npx supabase gen types typescript --local > src/types/database.generated.ts`: passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm test`: passed. 9 files, 43 tests.
- `npm run build`: passed.

Earlier environment note:

- Before Docker was started, `npx supabase start` failed because the Docker daemon socket did not exist at `/Users/cameronlackey/.docker/run/docker.sock`.

## Repository Structure

Matches `AGENTS.md`:

- Uses npm, confirmed by `package-lock.json`.
- Next.js App Router structure exists under `app/`.
- Supabase SSR helpers exist under `lib/supabase/`.
- Supabase migrations, seed, config, README, and pgTAP tests exist under `supabase/`.
- Product and database specifications exist under `docs/`.

Gaps:

- `docs/IMPLEMENTATION_PLAN.md` and `docs/DATABASE_REVIEW.md` were absent before this review and have now been added.
- `docs/DECISIONS.md` is referenced by `AGENTS.md` but does not exist.
- Generated Supabase types are now present at `src/types/database.generated.ts`.
- The root `README.md` is still the generic Next.js/Supabase starter README.
- No Vitest or application test framework is configured.
- Package scripts do not include `typecheck`, Supabase reset/test aliases, or generated type commands.
- The app still renders starter pages and tutorial components, not May Ball product pages.

## Intended Domain Model

Core ownership:

- Organisations own recurring events.
- Events own departments, event memberships, budgets, revenue, spending requests, payments, notifications, activity, and documents.
- Event membership plus event roles controls permissions; profiles contain identity/display data only.

Budgeting:

- Budget versions are immutable after activation.
- Department allocations and contingency are separate from transfers.
- Contingency transfers are append-only and should be done through RPCs.

Revenue:

- Ticket types model maximum and forecast revenue.
- Actual ticket revenue is cumulative snapshots.
- Other revenue has forecast and actual cumulative fields.

Spending:

- Spending requests hold stable identity and status.
- Revisions hold immutable submitted/approved financial content.
- Allocations split revision totals across departments.
- Components split revision totals into payable parts.

Payments:

- Payments record gross cash leaving the bank.
- Payment allocations link payments to approved request components.
- Paid/completed status is derived from non-reversed allocations against the current approved revision.

Reporting:

- Dashboard and department calculations should come from shared SQL views/functions, not React-side recomputation.

## Findings

### Fixed: pgTAP `results_eq` assertions were not executable in the local test container

The original tests used `results_eq(...)` for scalar query comparisons. In the local `public.ecr.aws/supabase/pg_prove:3.36` test container these errored with `cannot open EXECUTE query as cursor`, causing bad plans before the database behaviour under test could be evaluated.

Fix applied: scalar comparisons in `001_schema_constraints.test.sql`, `002_rls.test.sql`, and `003_workflows.test.sql` now use pgTAP `is(...)`. This preserves the assertions without weakening constraints or RLS.

Regression coverage: the same schema, RLS, and workflow assertions now execute as part of `npx supabase test db`.

### Fixed: `submit_spending_request` wrote a text expression into an enum column

The workflow test exposed a real SQL defect in `public.submit_spending_request`: the `case` expression assigned to `spending_requests.approval_status` resolved as `text`, but the target column is `public.request_approval_status`. PostgreSQL rejected submission with `column "approval_status" is of type public.request_approval_status but expression is of type text`.

Fix applied: `20260718000500_fix_submit_spending_request_status_cast.sql` replaces the RPC and explicitly casts both `case` branches to `public.request_approval_status`.

Regression coverage: `003_workflows.test.sql` asserts that an owner can submit a request and that the request status becomes `submitted`, then continues through treasurer approval, payment recording, and payment-derived `paid` status.

### Fixed: workflow activity-log assertion ignored private draft visibility

The workflow test originally counted request activity as the treasurer after payment recording. The request-created activity is intentionally `private_owner`, so the treasurer sees only the submitted/approved entries under the current visibility policy. The test expectation conflicted with private draft visibility rather than exposing a data defect.

Fix applied: `003_workflows.test.sql` switches back to the request owner before asserting the full three request activity entries.

Regression coverage: the workflow test now preserves the private-owner visibility rule and still verifies that create, submit, and approve activity entries exist.

### Migration strategy note

No `supabase/.temp/project-ref` file is present, so this workspace does not appear to be linked to a remote Supabase project. If the database were guaranteed to be brand-new and local-only, correcting the original baseline migration would produce a cleaner initial history. However, the repository instructions say applied migrations are executable source of truth and must not be edited, and local reset had already applied the existing migration set. A forward corrective migration is therefore the safer default and is the approach used here.

### High: Financial immutability is not enforced broadly enough

`spending_request_revisions`, allocations, components, budget versions, payments, transfers, reviews, and activity records need immutability protections beyond ordinary grants. Current migrations grant direct `UPDATE` on revisions/allocations/components and only gate drafts through RLS policies (`supabase/migrations/20260718000200_functions_views_rls.sql:199`, `:223`, `:225`, `:227`). There are no `prevent_immutable_update` triggers as required by the specification.

Recommended fix: add forward migrations with immutable-state triggers and column-level privilege narrowing. Ensure submitted, approved, superseded, rejected, recorded, and append-only rows cannot be mutated by direct authenticated writes or accidental privileged application paths.

### High: Required reconciliation constraint triggers are missing

The spec requires deferrable triggers for revision allocations, request components, payment allocations, revision pointers, and payment component/request consistency. The implementation has an RPC helper `assert_revision_balanced` (`20260718000200_functions_views_rls.sql:52`) and one overpayment trigger (`20260718000400_domain_hardening.sql:83`), but no general deferrable reconciliation triggers for allocations/components/payment totals.

Recommended fix: add deferrable constraint triggers and tests proving invalid direct writes fail at commit, not only through happy-path RPCs.

### High: `payment_allocations` does not prove the component belongs to the request

The table separately checks `payment_id`, `request_id`, and `request_component_id` by event (`20260718000100_initial_schema.sql:219-224`) but does not enforce that the component belongs to the same request. `record_payment` selects a request from each component (`20260718000200_functions_views_rls.sql:171-173`), but direct or privileged inserts can associate a component with a different request in the same event.

Recommended fix: add a composite validation trigger or schema-level composite key path tying allocation request, component revision, and spending request together.

### High: Payment can target superseded components

`record_payment` allows components whose revision status is `approved` or `superseded` as long as the request has some current approved revision (`20260718000200_functions_views_rls.sql:171-172`). The specification says allocation stores the component authoritative when allocated, but the RPC should not allow a new payment against a superseded component after a later variation is approved unless explicitly designed and tested.

Recommended fix: require `v.id = r.current_approved_revision_id` for new payment allocations, or document and test a deliberate exception.

### High: `v_request_payment_positions` likely reports `unpaid` for requests with no approved revision

The view left joins the current approved revision but groups on `r.id,v.id` and compares aggregate payment sums before checking `v.id is null` (`20260718000200_functions_views_rls.sql:186-194`). Because the aggregate over a left-join row is zero, a draft request may be classified as `unpaid` instead of `not_applicable`.

Recommended fix: make `case when r.current_approved_revision_id is null then 'not_applicable'` the first condition and test draft/rejected/unapproved cases.

### High: Component code uniqueness conflicts with the database specification

Initial migration creates `unique(event_id, code)` for `request_components` (`20260718000100_initial_schema.sql:198`), matching the database spec. The hardening migration drops it and replaces it with `unique(revision_id, code)` (`20260718000400_domain_hardening.sql:8-10`) so copied variation components can repeat codes.

Recommended fix: make an explicit product/database decision. If component codes are stable across revisions, update `docs/DATABASE_SPECIFICATION.md`; if codes must be unique event-wide, change variation component coding.

### Medium: Missing same-event validation on invitation departments

`invitation_departments` validates the department's event but not that the invitation belongs to the same event (`20260718000100_initial_schema.sql:235-237`). This can attach a department from one event to an invitation for another event if both rows exist.

Recommended fix: include `event_id` in a composite FK to `invitations(id,event_id)` or add a validation trigger.

### Medium: `budget_transfers.reverses_transfer_id` is not scoped to the same event/version

The reversal FK references only `budget_transfers(id)` (`20260718000100_initial_schema.sql:118`). The database spec requires same event/version reversal linkage.

Recommended fix: add a composite unique key and FK or trigger enforcing reversal event/version equality.

### Medium: Missing indexes required by the spec

Several FK/common-filter indexes are absent, including `organisation_members(organisation_id,status)`, `department_budget_allocations(budget_version_id)`, transfer endpoint indexes, `other_revenue_items(event_id,category)`, `payment_allocations(payment_id)`, `payment_allocations(request_component_id)`, `request_reviews(reviewer_user_id,created_at)`, and invitation/email indexes. Existing indexes are listed at `20260718000100_initial_schema.sql:265-290`.

Recommended fix: add a forward migration with required FK/RLS/reporting indexes and verify with advisor/explain output once realistic seed volume exists.

### Medium: Grants are broad and not fully reconciled with table policies

Migration 002 grants `SELECT` on all public tables to `authenticated` (`20260718000200_functions_views_rls.sql:198`) and direct `INSERT,UPDATE` on several tables (`:199`). Migration 004 narrows profile update and counter select (`20260718000400_domain_hardening.sql:3-6`), but invitation/notification/activity helper functions and default privileges are not comprehensively locked down.

Recommended fix: replace broad grants with explicit table grants, add default privilege revocations, and test `anon` plus authenticated direct write denial for every financial table.

### Medium: Security-definer helper functions are still executable by default unless revoked

Functions are created but there is no global revoke from `public` for helper/security-definer functions before selected execute grants (`20260718000200_functions_views_rls.sql:18-50`, `:202`). PostgreSQL grants execute on functions to `PUBLIC` by default unless default privileges or revokes are applied.

Recommended fix: revoke execute on all functions from `public`/`anon`, then grant only intended RPCs to `authenticated`. Keep helper functions callable by policies without client execute exposure.

Stage 5 partial resolution, 2026-07-18: the new internal request helper functions are locked down by `20260718001400_lock_request_helper_functions.sql`, which revokes direct execute on:

- `insert_request_allocations(uuid, uuid, jsonb)`
- `insert_request_components(uuid, uuid, text, jsonb)`

Regression tests in `007_spending_request_drafts.test.sql` prove authenticated clients cannot call those helpers directly while the trusted draft create/update RPCs still work. The older helper/security-definer functions from previous stages still need the broader execute-privilege audit recommended above.

### Medium: Required domain RPCs are missing or partial

The database spec requires `create_organisation_and_event`, invitation issue/accept, budget reversal, request cancellation, payment overpayment policy, event completion/reopen, and more. Current migrations implement a subset: spending create/submit/variation/decision, budget activation/transfer, payment record/reverse, completion/reopen (`20260718000200_functions_views_rls.sql:62-182`; `20260718000400_domain_hardening.sql:58-80`).

Recommended fix: either mark missing RPCs as deliberate deferrals in `docs/DECISIONS.md` and tests, or implement before feature pages rely on them.

Stage 2 update, 2026-07-18: governance/setup RPCs were added in forward migrations:

- `20260718000600_stage_2_governance_setup.sql`: organisation/event bootstrap, recurring event creation, event settings, department creation/update, invitation issue/revoke/accept, role assignment/removal, event-member status update and department-member assignment/removal.
- `20260718000700_fix_issue_invitation_token_generation.sql`: corrected token generation and acceptance hashing to schema-qualify pgcrypto extension functions.
- `20260718000800_fix_issue_invitation_role_check.sql`: corrected an ambiguous invitation role existence check.

Deferred RPC gaps remain for later stages, including request cancellation, budget transfer reversal and additional payment overpayment policy controls.

Stage 3 update, 2026-07-18: `20260718000900_stage_3_budget_contingency.sql` adds budget draft create/edit RPCs, stronger activation, active-budget reporting views, active-event contingency transfer, append-only transfer triggers and focused indexes. Transfer reversal remains deferred because no explicit reversal RPC was present before Stage 3.

Stage 4 update, 2026-07-18: revenue RPCs and reporting views were added in forward migrations:

- `20260718001000_stage_4_revenue.sql`: treasurer-authorised `save_ticket_type`, `record_ticket_sales_snapshot`, `void_ticket_sales_snapshot`, `save_other_revenue_item`, append-only snapshot triggers, revenue summary views and revenue indexes.
- `20260718001100_fix_ticket_type_display_order_arg.sql`: corrected the ticket-type RPC display-order argument from `smallint` to `integer` so generated TypeScript/RPC calls and pgTAP integer literals can execute without casts.

The Stage 4 views deliberately treat actual ticket revenue as a latest cumulative position. `v_ticket_actual_summaries` reads `v_latest_ticket_sales_snapshot`; older snapshots remain history and are not summed. Booking fees are reported separately and are not deducted from gross May Ball ticket revenue.

Material ambiguity: the Stage 4 implementation brief mentions a ticket type code, but the executable schema has no `ticket_types.code`; the database currently enforces uniqueness with `(event_id, lower(name))`. Stage 4 preserves the executable schema and documents a separate ticket-code field as deferred rather than inventing a parallel application-only identifier.

### Medium: Reporting layer is incomplete

Only `v_latest_ticket_sales_snapshot` and `v_request_payment_positions` exist (`20260718000200_functions_views_rls.sql:184-194`). The database spec also requires `v_active_budget_department_positions` and `v_event_financial_position`.

Recommended fix: implement missing shared reporting views before dashboard/department UI work.

Stage 4 update: revenue-specific reporting views now exist:

- `v_ticket_type_forecast_positions`
- `v_ticket_forecast_summaries`
- `v_ticket_actual_summaries`
- `v_other_revenue_summaries`
- `v_event_revenue_summaries`

The final dashboard-oriented `v_event_financial_position` remains deferred until revenue, spending and payments can be combined without building Stage 8 early.

Stage 5 update, 2026-07-18: spending request draft support was added in forward migrations:

- `20260718001200_stage_5_spending_request_drafts.sql`: draft immutability triggers, transactional `create_spending_request_draft`, owner-only `update_spending_request_draft`, corrected `submit_spending_request`, internal allocation/component helper functions, and `v_spending_request_current_revisions`.
- `20260718001300_fix_submitted_revision_metadata_updates.sql`: corrected the submitted-revision immutability trigger so future treasurer decision RPCs may update decision metadata without allowing content edits.
- `20260718001400_lock_request_helper_functions.sql`: revoked direct authenticated execution on internal request child-row helper functions.

The Stage 5 view intentionally exposes draft rows only through underlying RLS: owner or treasurer can see a draft; another ordinary member and a president without treasurer role cannot see the draft via base tables or the current-request view. Submitted requests become visible to active committee members. Submitted request revisions, allocations and components reject direct authenticated content edits. Approval, rejection, request-changes, variation and payment workflows remain deferred to later stages.

Stage 5 validation on 2026-07-18:

- `npx supabase db reset` passed.
- `npx supabase test db` passed: 7 files, 187 tests.
- `npx supabase gen types typescript --local > src/types/database.generated.ts` passed.
- Runtime RLS checks passed with seeded users for owner draft create/submit, Member B draft non-discovery, treasurer view without edit/submit, president-without-treasurer denial, historical read-only rejection and separate-organisation isolation.

Material limitation: the Stage 5 browser form provides three component rows per save. The database RPC accepts an arbitrary JSON component array, so this is a UI limit rather than a schema limit. Request cancellation is not implemented because the existing specification/database contract did not define a complete secure cancellation RPC for this stage.

Stage 6 update, 2026-07-18: treasurer approval and variation support was added in forward migrations:

- `20260718001500_stage_6_treasurer_approval.sql`: replaces the draft update/submit and decision RPCs to support changes-requested clones and approved-request variations; adds append-only review triggers; adds approval queue, revision history, review history, department spending, request impact and event approval context views.
- `20260718001600_drop_stage_5_update_draft_overload.sql`: removes the older 15-argument draft update overload so PostgreSQL clients and pgTAP calls do not become ambiguous after adding `p_change_summary`.
- `20260718001700_fix_current_request_pending_revision_priority.sql`: corrects `v_spending_request_current_revisions` so pending submitted variations are shown for review while the approved baseline remains separately tracked by `current_approved_revision_id`.

The Stage 6 decision RPC locks the request and reviewed revision, verifies treasurer authority, verifies writable event state, rejects stale/non-submitted revisions, requires reasons for rejection and changes-requested decisions, records a review row, records activity and creates a notification in one transaction. Requesting changes preserves the submitted revision and creates a new creator-editable draft revision. Approved variations supersede the previous approved revision only at approval time; rejected variations leave the approved baseline unchanged.

Stage 6 canonical views deliberately separate formal and potential exposure. Approved spending uses current approved revisions. Pending initial requests count in full. Pending variations count only positive incremental net/gross exposure over the approved baseline.

Material ambiguity: neither the product specification nor executable schema explicitly prohibits self-approval by a user who is both request creator and event treasurer. Stage 6 preserves the existing schema behaviour and permits self-approval for users with the treasurer role. A separation-of-duties rule should be added later only as an explicit product/database decision.

Stage 6 validation on 2026-07-18:

- `npx supabase db reset` passed.
- `npx supabase test db` passed: 8 files, 223 tests.
- `npx supabase gen types typescript --local > src/types/database.generated.ts` passed.
- Runtime checks passed with seeded users for treasurer queue access, president/outsider denial, initial approval, rejection, changes-requested cloning/resubmission, variation pending baseline preservation, variation approval/rejection and unauthenticated approval-route redirect.

Stage 7 update, 2026-07-18: payment recording and derived completion were hardened in `20260718001800_stage_7_payments.sql`.

Resolved findings:

- `record_payment` previously accepted superseded components. New payments now go through `record_component_payment`, which requires each target component to belong to the request's current approved revision. The legacy `record_payment` signature is retained as a compatibility wrapper.
- `payment_allocations` previously did not prove that the component belonged to the same request. A consistency trigger now rejects mismatched request/component pairs.
- Payment allocation totals are now checked against payment gross by a deferrable trigger.
- Component-level overpayment is rejected, and existing request-level overpayment protection remains in place.
- Payment records and allocations are append-only. Payment rows may only be updated through the narrow reversal metadata path.
- Downward approved variations below active non-reversed payments are blocked before the approved revision pointer changes.
- `v_request_payment_positions` was recreated to expose approved revision metadata while preserving derived `not_applicable`, `unpaid`, `partially_paid`, `paid` and `overpaid` statuses.
- New views expose payment details, allocation history, component payment positions and event payment summaries without exposing idempotency keys.

Stage 7 validation on 2026-07-18:

- `npx supabase db reset` passed after the view recreation was changed from `create or replace view` to drop/recreate because PostgreSQL cannot insert columns into the middle of an existing view definition.
- `npx supabase test db` passed: 9 files, 253 tests.
- `npx supabase gen types typescript --local > src/types/database.generated.ts` passed.

Material limitation: the executable schema records payment allocations against request components. The application therefore supports request-specific payment entry by selecting that request's current approved components, rather than adding a separate request-only allocation path. Payment overpayment with an explicit treasurer explanation remains deferred because the current product/database contract does not define the exception workflow in enough detail for an MVP UI.

Stage 8 update, 2026-07-18: event dashboard reporting was added in `20260718001900_stage_8_dashboard.sql`.

Added views:

- `v_event_financial_positions`: one RLS-filtered dashboard row per visible event, combining active budget metadata, current department budget, unallocated contingency, forecast revenue, latest actual revenue snapshot, approved spending, pending exposure, visible drafts, payment totals, formal forecast, potential forecast and recorded gross cash movement.
- `v_event_department_financial_positions`: one RLS-filtered row per active department, using department allocations rather than the request primary department.
- `v_event_dashboard_draft_exposures` and `v_event_department_draft_exposures`: draft exposure visible to the current user. Treasurers see event-wide drafts; ordinary members see only drafts exposed by base-table RLS.
- `v_event_spending_summaries`: dashboard-level approved, pending and payment-position aggregates.
- `v_event_dashboard_pending_approvals`: treasurer-only approval queue details for the dashboard.
- `v_event_dashboard_activity`: bounded financial activity feed using activity-log RLS.
- `v_event_dashboard_warnings`: objective warning rows for missing setup, pending work, over-budget departments and reversed/unpaid payment states.

Resolved findings:

- The earlier Stage 6 approval-context view did not subtract unallocated contingency from formal and potential positions. Stage 8 leaves that legacy view in place for its original workflow context, but the dashboard canonical position now follows the product definition: forecast net revenue minus approved net spending minus unallocated contingency, with potential also subtracting pending net exposure.
- Department approved spending now includes the current approved baseline even while a variation is pending, because the dashboard aggregates directly from `current_approved_revision_id`.
- Actual ticket revenue is still derived from `v_latest_ticket_sales_snapshot`; older cumulative snapshots remain history and are not summed.
- Reversed payments are retained in history but excluded from paid and recorded cash-movement totals through the Stage 7 payment summary views.
- A first implementation of `v_event_financial_positions` joined `organisations`; under the current organisation RLS this could hide an otherwise visible historical/event dashboard row. The view now carries `organisation_id` and lets the application use the already-authorised event-access query for the organisation display name.

Stage 8 validation on 2026-07-18:

- `npx supabase db reset` passed.
- `npx supabase test db` passed: 10 files, 297 tests.
- `npx supabase gen types typescript --local > src/types/database.generated.ts` passed.

Material limitation: the dashboard uses a fixed-size recent activity and pending approval feed. Pagination, filters and export/report downloads remain deferred to later lifecycle/reporting stages.

Stage 9 update, 2026-07-18: event lifecycle and historical access were hardened in `20260718002000_stage_9_event_lifecycle.sql`.

Added:

- `event_lifecycle_history`: append-only lifecycle transition history with previous/new status, action, actor, reason, acknowledged warnings, metadata and timestamp.
- `event_completion_readiness(event_id)`: president/treasurer-authorised canonical readiness rows with code, severity, category, count, money amount, target route, acknowledgement flag and blocker flag.
- `v_event_lifecycle_summary`: RLS-filtered lifecycle timestamp, actor and note summary for visible events.
- `archive_event(event_id, reason)`: president-only completed-to-archived transition.
- Replacement `complete_event(event_id, acknowledge_warnings, reason)` and `reopen_event(event_id, reason)` RPCs with row locks, explicit authorisation, lifecycle history and activity logging.
- Direct lifecycle update trigger on `events` so ordinary direct updates cannot change status or lifecycle timestamps outside the lifecycle RPC path.

Resolved findings:

- The original `can_view_historical_event` required active membership in a current non-historical event. That matched the active-current-committee path but made a just-completed latest event disappear if no later event existed. Stage 9 now also permits explicit active organisation membership, matching the product/database specification's agreed historical-access policy.
- The legacy `transfer_contingency(budget_version_id, ...)` RPC did not check `is_event_writable`, so a treasurer could transfer contingency after completion. Stage 9 replaces the legacy signature with a writability check while preserving the newer event-scoped transfer RPC.
- The first lifecycle trigger guard used a transaction-local setting that remained enabled after the lifecycle RPC update. It is now cleared immediately after the guarded update so a caller cannot chain direct lifecycle updates in the same transaction.
- Completion readiness treats unsupported source status and missing active president as blockers. Financial/setup conditions, including unpaid approvals, pending requests, draft budgets, missing ticket snapshots, expected other revenue, unallocated contingency, reversed payments and pending invitations, are warnings/information requiring acknowledgement where appropriate rather than invented hard blockers.
- Historical dashboard draft exposure remains zero for completed/archived events, and base request/revision RLS continues to hide private drafts from derived historical users who are not the owner or old-event treasurer.

Stage 9 validation on 2026-07-18:

- `npx supabase db reset` passed.
- `npx supabase test db` passed: 11 files, 347 tests.
- `npx supabase gen types typescript --local > src/types/database.generated.ts` passed.

Material limitation: the `events` table's original timestamp consistency constraints require `completed_at`/`archived_at` to be cleared when an event is reopened. Stage 9 preserves every completion/archive/reopen timestamp in append-only `event_lifecycle_history`; mutable event summary columns show only the current lifecycle state/latest reopen metadata.

Stage 10 update, 2026-07-25: documents, activity and CSV export support were added in `20260718002100_stage_10_documents_activity_exports.sql`; a follow-up private activity visibility correction was added in `20260718002200_fix_private_activity_treasurer_visibility.sql`.

Added:

- `document_upload_status` enum with `pending`, `finalised` and `voided` states.
- Document lifecycle columns for description, finalisation, voiding reason/actor/time and replacement pointer.
- Document parent/state constraints, document indexes and RLS-safe helpers for request/document visibility.
- `begin_document_upload`, `finalise_document_upload` and `void_document` RPCs with explicit `auth.uid()` checks, event writability checks, parent validation, MIME/size validation, Storage-object verification and activity logging.
- `v_visible_documents` and `v_event_activity_feed` views for application listing without exposing object paths or raw activity metadata.
- Revised Storage policies that keep `event-documents` private, allow inserts only for matching pending metadata, and allow object reads only for authorised finalised/voided documents.

Resolved findings:

- The original `documents` table represented final metadata only and had no safe partial-upload state. Stage 10 adds a pending/finalised lifecycle so failed uploads do not appear as completed evidence.
- The original Storage insert policy depended on a direct RLS-filtered lookup of document metadata. Pending metadata is intentionally hidden from ordinary document reads, so Stage 10 adds a narrow security-definer `can_insert_document_object(bucket,path)` helper for Storage insert checks.
- The original document metadata policy did not hide pending rows and did not model void/replacement retention. Stage 10 replaces it with `can_view_document(id)` and the `v_visible_documents` reporting view.
- Document activity now uses `private_owner` for draft-linked documents, `committee` for submitted/request documents and `treasurer` for payment-linked documents.
- A runtime check showed event treasurers could see private draft document metadata but not the matching private-owner activity row. Migration `20260718002200_fix_private_activity_treasurer_visibility.sql` updates `activity_select` so treasurers can see `private_owner` activity for their event while ordinary members still cannot.

Stage 10 validation on 2026-07-25:

- `npx supabase db reset` passed.
- `npx supabase test db` passed: 12 files, 383 tests.
- `npx supabase gen types typescript --local > src/types/database.generated.ts` passed.

Material limitations: Stage 10 implements secure upload, download, voiding and CSV exports but does not add production malware scanning, ZIP archive exports, background cleanup for abandoned pending metadata or binary seed files. The application reports failed finalisation safely, but abandoned pending metadata cleanup remains an operational hardening task.

### Medium: Seed fixture is not complete enough for required tests

The seed creates five users, two organisations, three events, four departments, one active budget, two ticket types, and two ticket snapshots (`supabase/seed.sql:3-67`). It does not create default full department template, a contingency transfer, other revenue, private/submitted/approved/variation-pending requests, split Amazon request, multi-component act, partial payment, read-only/removed personas, or historical spending data.

Recommended fix: expand seed to the database spec's required fixture and keep UUIDs deterministic.

Stage 1 update, 2026-07-18: the local auth seed fixture was corrected so the manually inserted `auth.users` rows populate the string token fields scanned by the current local GoTrue service (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `email_change_token_current`, and `reauthentication_token`). Before this fix, `npx supabase db reset` passed but password login for the seed users returned a local Auth 500 because GoTrue could not scan null token strings. This was fixed in `supabase/seed.sql` only; no product schema migration was required.

### Medium: pgTAP coverage is much thinner than the required database tests

Current tests cover a small set of schema constraints, RLS visibility, role recognition, one contingency transfer, and a happy-path request/payment workflow. They do not cover many required personas, draft privacy for allocations/components, immutable submitted/approved rows, historical read-only writes, direct write denials, missing reconciliation triggers, concurrency, reporting totals, void/reversal behaviour, or cross-event document/invitation edges.

Recommended fix: expand tests before building product pages. Tests should fail for the findings above before fixes land.

### Low: `supabase/README.md` migration list is stale

The README lists only three migrations and omits `20260718000400_domain_hardening.sql`.

Recommended fix: update README when the corrective migration set is final.

### Low: Next.js scaffold remains generic

The app and root README are still the Supabase starter (`app/page.tsx`, `app/protected/page.tsx`, `README.md`). This is acceptable for the current review because no feature pages should be built yet, but it should be replaced in Stage 1.

## Seed And Test Executability

The seed and pgTAP tests are executable against the local Supabase stack.

Validation on 2026-07-18:

- `npx supabase db reset` passed.
- `npx supabase test db` passed: 3 files, 35 tests.
- `npx supabase gen types typescript --local > src/types/database.generated.ts` passed.
- Local password sign-in with seeded users passed after the auth seed fixture fix.
- RLS smoke check passed: `membera@example.test` saw `Downing May Ball 2027` and historical `Downing May Ball 2025`; `outsider@example.test` saw only `Other Ball 2027` and a direct query for the Downing event returned zero rows.

The tests still rely on seeded fixed UUIDs and local JWT claim settings. They are local-only by design and still do not prove the full database specification.

## Recommended Fix Order

1. Add `docs/DECISIONS.md` and decide the component-code uniqueness conflict.
2. Add immutability and reconciliation forward migrations.
3. Close same-event validation gaps for payment allocations, invitation departments, and budget transfer reversals.
4. Rework grants/function execute privileges and add direct-denial tests.
5. Complete reporting views and required indexes.
6. Expand seed and pgTAP coverage to match the specification.
7. Regenerate Supabase types after every database change.
