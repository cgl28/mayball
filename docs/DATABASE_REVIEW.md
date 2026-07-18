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

### Medium: Required domain RPCs are missing or partial

The database spec requires `create_organisation_and_event`, invitation issue/accept, budget reversal, request cancellation, payment overpayment policy, event completion/reopen, and more. Current migrations implement a subset: spending create/submit/variation/decision, budget activation/transfer, payment record/reverse, completion/reopen (`20260718000200_functions_views_rls.sql:62-182`; `20260718000400_domain_hardening.sql:58-80`).

Recommended fix: either mark missing RPCs as deliberate deferrals in `docs/DECISIONS.md` and tests, or implement before feature pages rely on them.

### Medium: Reporting layer is incomplete

Only `v_latest_ticket_sales_snapshot` and `v_request_payment_positions` exist (`20260718000200_functions_views_rls.sql:184-194`). The database spec also requires `v_active_budget_department_positions` and `v_event_financial_position`.

Recommended fix: implement missing shared reporting views before dashboard/department UI work.

### Medium: Seed fixture is not complete enough for required tests

The seed creates five users, two organisations, three events, four departments, one active budget, two ticket types, and two ticket snapshots (`supabase/seed.sql:3-67`). It does not create default full department template, a contingency transfer, other revenue, private/submitted/approved/variation-pending requests, split Amazon request, multi-component act, partial payment, read-only/removed personas, or historical spending data.

Recommended fix: expand seed to the database spec's required fixture and keep UUIDs deterministic.

### Medium: pgTAP coverage is much thinner than the required database tests

Current tests cover a small set of schema constraints, RLS visibility, role recognition, one contingency transfer, and a happy-path request/payment workflow. They do not cover many required personas, draft privacy for allocations/components, immutable submitted/approved rows, historical read-only writes, direct write denials, missing reconciliation triggers, concurrency, reporting totals, void/reversal behaviour, or cross-event document/invitation edges.

Recommended fix: expand tests before building product pages. Tests should fail for the findings above before fixes land.

### Low: `supabase/README.md` migration list is stale

The README lists only three migrations and omits `20260718000400_domain_hardening.sql`.

Recommended fix: update README when the corrective migration set is final.

### Low: Next.js scaffold remains generic

The app and root README are still the Supabase starter (`app/page.tsx`, `app/protected/page.tsx`, `README.md`). This is acceptable for the current review because no feature pages should be built yet, but it should be replaced in Stage 1.

## Seed And Test Executability

Static review suggests the seed and pgTAP tests are intended to be executable against local Supabase after migrations and seed apply. However, this could not be proven because Docker Desktop was not running. Two static risks remain:

- `seed.sql` uses `set session_replication_role=replica` around `auth.users` insertion (`supabase/seed.sql:2`), which requires sufficient privileges in the local reset context. Supabase local seed commonly runs with owner-level privileges, but this must be verified.
- The tests rely on seeded fixed UUIDs and local JWT claim settings. They are likely local-only by design, but they do not prove the full specification yet.

## Recommended Fix Order

1. Start Docker Desktop and rerun `npx supabase start`, `npx supabase db reset`, and `npx supabase test db`.
2. Add `docs/DECISIONS.md` and decide the component-code uniqueness conflict.
3. Add immutability and reconciliation forward migrations.
4. Close same-event validation gaps for payment allocations, invitation departments, and budget transfer reversals.
5. Rework grants/function execute privileges and add direct-denial tests.
6. Complete reporting views and required indexes.
7. Expand seed and pgTAP coverage to match the specification.
8. Generate Supabase types and add package scripts for repeatable checks.
