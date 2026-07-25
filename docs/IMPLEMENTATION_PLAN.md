# May Ball Finance Implementation Plan

This plan breaks MVP 1 into small vertical stages. Each stage should ship database, RLS, server validation, generated types, UI, and tests together. Do not build broad product pages ahead of the database/security slice they depend on.

## Current Baseline

- Next.js App Router, Supabase SSR auth, and Tailwind are configured for the May Ball Finance application.
- Stage 1 authenticated shell and event-selection routes exist at `/events` and `/events/[eventId]`.
- Local Supabase reset, pgTAP tests, generated database types, TypeScript, lint, application tests, and production build pass.
- Stages 1 through 8 are implemented: authenticated event access, president setup/admin, budget/contingency, revenue, request drafts, treasurer approval/variations, payments and the event financial dashboard.
- Known database hardening work remains tracked in `docs/DATABASE_REVIEW.md`.

## Stage 0: Database Readiness Gate

Goal: make the database package executable and align it with the product/database contracts before UI feature work.

Work:

- Resolve the findings in `docs/DATABASE_REVIEW.md` through forward migrations.
- Decide documented conflicts, especially request component code uniqueness and draft/changes-requested revision semantics.
- Fill required schema gaps for financial immutability, reconciliation triggers, same-event validation, missing views, grants, and RLS policies.
- Expand seed data to cover realistic May Ball workflows.
- Expand pgTAP tests to cover the required constraint, RLS persona, workflow, and reporting cases.
- Regenerate Supabase TypeScript types after migrations pass.

Acceptance criteria:

- `npx supabase start`, `npx supabase db reset`, and `npx supabase test db` pass on a clean local environment.
- Seed data includes the required 2025 historical and 2027 planning fixtures, spending requests, variations, split allocations, payments, and other revenue.
- Every exposed public table has RLS enabled, forced, explicit grants, and policy tests.
- Submitted/approved financial records are immutable by direct client writes and by privileged accidental writes.
- Generated database types are committed and compile with `npx tsc --noEmit`.
- `npm run lint` and `npm run build` pass.

## Stage 1: Authenticated Shell And Event Access

Goal: replace starter screens with a minimal authenticated product shell and event picker.

Status: complete as of 2026-07-18.

Work:

- Product-specific email/password login and logout.
- Cookie-based Supabase SSR session handling using typed browser/server clients.
- Authenticated shell with current user/profile display, event switcher, and reusable event context.
- Event selector showing active event membership and same-organisation historical read-only access permitted by RLS.
- Event landing route with read-only treatment for completed or archived events.
- Stage 1 local auth documentation and app-level tests.

Acceptance criteria:

- Unauthenticated users can only see public/auth routes. Verified by `/events` redirecting to `/auth/login?returnTo=%2Fevents`.
- Authenticated users see only organisations/events permitted by RLS. Verified with `membera@example.test` and `outsider@example.test`.
- A member of another organisation cannot infer Downing event data. Verified by direct RLS query for the Downing event returning zero rows for `outsider@example.test`.
- Historical events are visibly read-only in the shell and event landing page.
- Loading, empty, and error states exist for the event picker.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 2: Membership, Roles, And Departments

Goal: let presidents manage the non-financial event structure.

Status: complete as of 2026-07-18.

Work:

- Transactional organisation and first-event setup.
- President-only recurring event creation inside an existing organisation.
- Non-financial event settings.
- Department list, standard template creation, custom creation and editing.
- Committee view with membership status, roles and department assignments.
- Invitation issue, revoke and authenticated token acceptance.
- Role assignment/removal and department membership assignment/removal.
- President/treasurer/read-only capability helpers reused by event pages.
- Database and application regression tests for governance boundaries.

Acceptance criteria:

- President can invite members, assign roles, assign departments and update membership status.
- President-only users cannot transfer contingency, activate budgets or record payments.
- Department codes are unique per event and validated server-side.
- Cross-event role and department assignment is rejected.
- Historical events remain read-only.
- Separate-organisation users cannot list or directly retrieve protected event data.
- RLS tests cover president, treasurer, member, invitee, no-event user and outsider personas.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 3: Budgets And Contingency

Goal: provide treasurer-controlled budget setup and active budget reporting.

Status: complete as of 2026-07-18.

Work:

- Build budget version creation/editing for draft versions.
- Build activation flow and contingency transfer flow through RPCs.
- Show original allocation, transfers, current budget, and unallocated contingency.
- Add canonical active budget views for summary and department positions.
- Add BigInt-safe money parsing/formatting utilities.

Acceptance criteria:

- Treasurer can create, edit, and activate a draft budget version.
- Activating a version supersedes the prior active version transactionally.
- Only one active budget exists per event.
- Contingency transfers cannot exceed available contingency.
- Original allocation and current department budget remain distinct.
- President-only, ordinary member and outsider budget mutation attempts fail.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 4: Revenue Forecasts And Snapshots

Goal: support ticket revenue forecasts, actual ticket snapshots, and other revenue.

Status: complete as of 2026-07-18.

Work:

- Build ticket type management.
- Build cumulative actual revenue snapshot entry.
- Build other revenue item forecast and actual received controls.
- Add shared SQL reporting definitions for revenue totals.

Acceptance criteria:

- Treasurer can manage ticket types and other revenue; committee can view only.
- Monetary triples reconcile exactly in the database.
- Latest non-void ticket snapshot drives actual revenue.
- Ticket sales snapshots are cumulative history and are never summed as separate revenue transactions.
- Total-only snapshots are valid; optional ticket-type breakdowns are stored when available.
- Booking fees are displayed separately and are not deducted from May Ball ticket revenue.
- Historical events and president-only/ordinary users cannot mutate revenue.
- Revenue cards label net, VAT, gross, and capture time clearly.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 5: Spending Request Drafts And Submission

Goal: let committee members create private draft requests and submit them.

Work:

- Build request list with privacy-aware filters. Complete.
- Build create/edit draft form with department allocations and components. Complete.
- Add trusted transactional draft create/update RPCs and a corrected submission RPC. Complete.
- Add server-side validation for amount, VAT, allocation, and component reconciliation. Complete.
- Keep approval, rejection, variation and payment flows deferred to later stages. Complete.

Acceptance criteria:

- A member can save/edit their own draft.
- Another ordinary member cannot see draft rows, revisions, allocations, components, aggregate counts or the current-request view entry for that draft.
- Treasurer can view drafts but cannot impersonate owner edit or submission rights.
- A president without treasurer role cannot see another member's draft and cannot use treasurer financial RPCs.
- Submission locks the revision and makes submitted data visible to active committee members.
- Allocation and component totals must reconcile before submission.
- Historical events reject draft creation and show read-only request records.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 6: Approval And Variation Workflow

Goal: give treasurers a transactional review flow that preserves immutable approval history.

Work:

- Build approval queue and review screen. Complete.
- Implement approve, reject, and request-changes flows. Complete.
- Build approved-request variation creation/submission/decision flow. Complete.
- Show old-versus-new variation impact. Complete.
- Preserve the approved baseline while a variation is pending. Complete.

Acceptance criteria:

- Treasurer decisions create review, state transition, notification, and activity records in one transaction.
- Rejection and changes-requested require reasons.
- Approved revisions are immutable.
- Approved variations supersede prior approved revisions without erasing history.
- Rejected variations leave the prior approval authoritative.
- Pending variations count only incremental exposure in pending-position views.
- President without treasurer role cannot access approval actions.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 7: Payments And Derived Completion

Goal: manually record payments and derive payment/completion state from allocations.

Status: complete, validated 2026-07-18.

Work:

- Build payment entry flow for approved components. Complete.
- Support one payment allocated across multiple components. Complete.
- Build reversal workflow. Complete.
- Use shared payment position view for request status. Complete.

Acceptance criteria:

- Treasurer can record and reverse payments; other roles cannot. Complete.
- Payment allocations reconcile to payment gross. Complete.
- Payment cannot target an unapproved component. Complete.
- Partial, paid, unpaid, and overpaid states are derived, not stored manually. Complete.
- Reversed payments remain in history but are excluded from paid totals. Complete.
- New payments target the current approved component baseline; historic allocations remain tied to the paid component revision. Complete.
- A downward variation below active non-reversed payments is blocked. Complete.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 8: Dashboard And Department Views

Goal: give treasurers and committee members accurate shared financial views.

Status: complete, validated 2026-07-18.

Work:

- Implement dashboard-specific SQL views combining active budgets, contingency, revenue, spending, draft exposure, payments, warnings, pending approvals and activity. Complete.
- Build `/events/[eventId]/dashboard` as the canonical event landing page. Complete.
- Redirect `/events/[eventId]` to the dashboard. Complete.
- Build dashboard cards, revenue snapshot details, warnings, pending approval summary, activity and department financial positions. Complete.
- Add role-aware visibility for draft-sensitive insights and treasurer-only approval queue details. Complete.

Acceptance criteria:

- Dashboard totals come from shared SQL views/functions. Complete.
- Formal and potential surplus match the product definitions. Complete.
- Department remaining figures use department allocations, not primary department alone. Complete.
- Draft values do not leak into committee-wide totals. Complete.
- Net and gross bases are labelled wherever money appears. Complete.
- Latest ticket actuals use the latest non-void cumulative snapshot and never sum snapshots. Complete.
- Unallocated contingency is held centrally and subtracted from formal and potential positions. Complete.
- Reversed payments remain in history but are excluded from paid and cash-movement totals. Complete.
- Treasurer, ordinary member, president-without-treasurer, historical and outsider visibility is covered by pgTAP and application tests. Complete.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 9: Event Lifecycle And Historical Access

Goal: complete operational lifecycle controls and historical read-only access.

Status: complete, validated 2026-07-18.

Work:

- Build completion readiness with database-backed blockers, warnings and acknowledgement. Complete.
- Build president-only completion, archive and exceptional reopen flows. Complete.
- Add append-only lifecycle history. Complete.
- Add lifecycle summary and history views under RLS. Complete.
- Enforce lifecycle status changes through transactional RPCs only. Complete.
- Harden historical access for active organisation members without duplicate event memberships. Complete.
- Add historical event selector grouping and lifecycle page. Complete.
- Add CSV exports for budgets, revenue, requests, and payments. Deferred to Stage 10/export work.

Acceptance criteria:

- President can complete/archive/reopen events with required confirmations and reasons. Complete.
- Completion warnings require explicit acknowledgement and are re-evaluated in PostgreSQL. Complete.
- Completed/archived events reject ordinary writes in governance, budget, revenue, requests, approvals and payments. Complete.
- Direct lifecycle status updates are blocked outside lifecycle RPCs. Complete.
- Active same-organisation members can read historical events without duplicate historical event memberships. Complete.
- Pending, removed and cross-organisation users do not gain historical access. Complete in pgTAP coverage for pending/outsider paths; removed persona remains a seed expansion candidate.
- Private drafts remain protected under historical access. Complete.
- Lifecycle history is append-only and readable only through event RLS. Complete.
- Reopening preserves lifecycle and financial history and returns the event to reconciliation. Complete.
- Event selector clearly distinguishes active/current, completed and archived events. Complete.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 10: Documents, Activity And CSV Exports

Goal: add private supporting documents, event audit activity and operational CSV exports.

Status: complete, validated 2026-07-25.

Work:

- Add a private document upload/finalisation lifecycle with pending, finalised and voided states. Complete.
- Add secure Storage policies tied to document metadata and parent visibility. Complete.
- Add event and request document interfaces with upload, listing, short-lived download and voiding controls. Complete.
- Add a paginated event activity interface using RLS-filtered activity rows. Complete.
- Add event CSV exports for budgets, revenue, requests, approvals, payments and activity. Complete.
- Preserve private-draft document/activity privacy and historical read-only behaviour. Complete.
- Use canonical database views/tables for exports and keep cumulative ticket snapshots as history rows. Complete.

Acceptance criteria:

- The document bucket is private and downloads use short-lived signed URLs. Complete.
- Pending uploads are hidden from visible document views. Complete.
- Private draft documents are visible only to the creator and treasurer. Complete.
- Submitted request documents follow request/revision visibility. Complete.
- Historical events allow document download and export but reject document mutation. Complete.
- Activity is append-only and private draft activity does not leak to ordinary members. Complete.
- CSV exports are event-scoped, RLS-filtered, spreadsheet-escaped and exact for money. Complete.
- Latest ticket actuals are not recomputed by summing snapshot history. Complete.
- `npx supabase db reset`, `npx supabase test db`, generated types, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` pass.

## Stage 11: Hardening And Release Readiness

Goal: make MVP reliable enough for real committee use.

Work:

- Complete accessibility, mobile, performance, security, and Supabase advisor review.
- Add rate limiting around invitations and high-risk server actions where applicable.
- Verify no service-role key is used client-side.
- Document operational backup/export expectations.

Acceptance criteria:

- WCAG 2.2 AA basics are met for forms, navigation, contrast, focus, and dialogs.
- Dashboard/list pages use pagination or bounded server queries.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npx supabase db reset`, and `npx supabase test db` pass.
- Supabase security/database advisors show no unintended exposed tables or missing RLS.
- Product, database, implementation, and decision docs reflect shipped behaviour.
