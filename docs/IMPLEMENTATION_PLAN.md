# May Ball Finance Implementation Plan

This plan breaks MVP 1 into small vertical stages. Each stage should ship database, RLS, server validation, generated types, UI, and tests together. Do not build broad product pages ahead of the database/security slice they depend on.

## Current Baseline

- Next.js App Router scaffold exists from the Supabase starter.
- Supabase SSR client helpers and auth pages exist.
- The public application still shows starter content; no May Ball product feature pages have been implemented.
- A first-pass Supabase schema, RLS helpers, workflow RPCs, Storage policy, seed, and pgTAP tests exist.
- Local database validation could not run during the incoming review because Docker Desktop was not running.

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

Work:

- Keep public landing/login simple and product-specific.
- Show organisations and active/historical events available to the signed-in user.
- Add server-side access helpers around Supabase queries.
- Add basic app navigation and event context.

Acceptance criteria:

- Unauthenticated users can only see public/auth routes.
- Authenticated users see only organisations/events permitted by RLS.
- A member of another organisation cannot infer Downing event data.
- Historical events are visibly read-only in the shell.
- Loading, empty, and error states exist for the event picker.

## Stage 2: Membership, Roles, And Departments

Goal: let presidents manage the non-financial event structure.

Work:

- Build department list/editing and department membership views.
- Add invitation issue/accept/revoke RPCs if they are not complete from Stage 0.
- Build role assignment surfaces for president users.
- Keep treasurer financial powers separate from president powers.

Acceptance criteria:

- President can invite members, assign roles, and assign departments.
- President-only users cannot mutate budgets, revenue, approvals, or payments.
- Department codes are unique per event and validated server-side.
- Removed/suspended members lose current-event access without deleting authored records.
- RLS tests cover president, treasurer, member, read-only, removed, and outsider personas.

## Stage 3: Budgets And Contingency

Goal: provide treasurer-controlled budget setup and active budget reporting.

Work:

- Build budget version creation/editing for draft versions.
- Build activation flow and contingency transfer flow through RPCs.
- Show original allocation, transfers, current budget, and remaining contingency.

Acceptance criteria:

- Treasurer can create, edit, and activate a draft budget version.
- Activating a version supersedes the prior active version transactionally.
- Only one active budget exists per event.
- Contingency transfers cannot exceed available contingency.
- Non-treasurer writes fail through direct SQL/RLS tests.

## Stage 4: Revenue Forecasts And Snapshots

Goal: support ticket revenue forecasts, actual ticket snapshots, and other revenue.

Work:

- Build ticket type management.
- Build cumulative actual revenue snapshot entry and voiding.
- Build other revenue item forecast and actual received controls.
- Add shared SQL reporting definitions for revenue totals.

Acceptance criteria:

- Treasurer can manage ticket types and other revenue; committee can view only.
- Monetary triples reconcile exactly in the database.
- Latest non-void ticket snapshot drives actual revenue.
- Corrections are append/void actions, not overwrites.
- Revenue cards label net, VAT, gross, and capture time clearly.

## Stage 5: Spending Request Drafts And Submission

Goal: let committee members create private draft requests and submit them.

Work:

- Build request list with privacy-aware filters.
- Build create/edit draft form with department allocations and components.
- Use `create_spending_request` and `submit_spending_request` RPCs or corrected successors.
- Add server-side validation for amount, VAT, allocation, and component reconciliation.

Acceptance criteria:

- A member can save/edit their own draft.
- Another ordinary member cannot see draft rows, revisions, allocations, or components.
- Treasurer can view drafts but cannot impersonate owner edit rights.
- Submission locks the revision and makes submitted data visible to active committee members.
- Allocation and component totals must reconcile before submission.

## Stage 6: Approval And Variation Workflow

Goal: give treasurers a transactional review flow that preserves immutable approval history.

Work:

- Build approval queue and review screen.
- Implement approve, reject, and request-changes flows.
- Build approved-request variation creation/submission/decision flow.
- Show old-versus-new variation impact.

Acceptance criteria:

- Treasurer decisions create review, state transition, notification, and activity records in one transaction.
- Rejection and changes-requested require reasons.
- Approved revisions are immutable.
- Approved variations supersede prior approved revisions without erasing history.
- Rejected variations leave the prior approval authoritative.

## Stage 7: Payments And Derived Completion

Goal: manually record payments and derive payment/completion state from allocations.

Work:

- Build payment entry flow for approved components.
- Support one payment allocated across multiple components.
- Build reversal workflow.
- Use shared payment position view for request status.

Acceptance criteria:

- Treasurer can record and reverse payments; other roles cannot.
- Payment allocations reconcile to payment gross.
- Payment cannot target an unapproved component.
- Partial, paid, unpaid, and overpaid states are derived, not stored manually.
- Reversed payments remain in history but are excluded from paid totals.

## Stage 8: Dashboard And Department Views

Goal: give treasurers and committee members accurate shared financial views.

Work:

- Implement `v_active_budget_department_positions` and `v_event_financial_position`.
- Build dashboard cards, warnings, department table, and department pages.
- Add role-aware visibility for draft-sensitive insights.

Acceptance criteria:

- Dashboard totals come from shared SQL views/functions.
- Formal and potential surplus match the product definitions.
- Department remaining figures use department allocations, not primary department alone.
- Draft values do not leak into committee-wide totals.
- Net and gross bases are labelled wherever money appears.

## Stage 9: Event Lifecycle, History, Activity, And Exports

Goal: complete operational controls and historical read-only access.

Work:

- Build completion/reopen flows with warnings and acknowledgement.
- Build activity log views with visibility rules.
- Add CSV exports for budgets, revenue, requests, and payments.
- Add historical event read-only banners and write suppression.

Acceptance criteria:

- President can complete/reopen events with required confirmations and reasons.
- Completed/archived events reject ordinary writes in RLS and RPCs.
- Current active organisation members can read historical events without cross-organisation leakage.
- Activity entries are visible according to committee/treasurer/private-owner visibility.
- CSV exports are permission checked, event-scoped, timestamped, and labelled by money basis.

## Stage 10: Hardening And Release Readiness

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
