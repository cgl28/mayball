# Chiffre Pre-Launch Development Sprint — Working Instructions

We are beginning the next pre-launch refinement sprint for Chiffre.

The planned stages are:

1. Stage 13 — Chiffre Branding
2. Stage 14 — Design-System Consistency
3. Lifecycle Regression Fixes
4. Stage 15 — Dashboard Intelligence
5. Stage 16 — Budget Improvements
6. Stage 17 — Organisation / Demo / Pro / Chiffre Ownership Architecture
7. Stage 18 — Documents 2.0
8. Stage 19 — Audit / Recent Financial Activity
9. Stage 20 — Forecast Clarity
10. Expense / Member Reimbursement Workflow

IMPORTANT:

Do **not** implement all of these stages now.

We will implement them sequentially, one stage at a time.

For every stage:

1. Inspect the existing implementation before editing.
2. Understand and report the relevant architecture/root cause.
3. Keep changes strictly bounded to the current stage.
4. Reuse existing helpers, views, components and business logic.
5. Do not duplicate financial calculations.
6. Database/RLS/RPC behaviour should remain authoritative where appropriate.
7. Assume production data may eventually exist; database changes must be forward-safe migrations.
8. Do not reset, discard or revert unrelated working-tree changes.
9. Do not modify hosted Supabase.
10. Do not commit, push or deploy unless explicitly instructed.
11. Do not begin the next stage automatically.
12. At the end of a stage, stop and report what changed, tests performed and any issues/follow-up work.

Standard application verification:

- git diff --check
- npx tsc --noEmit
- npm run lint
- npm test
- npm run build

Where database behaviour/schema changes:

- npx supabase db reset
- npx supabase test db
- npx supabase gen types typescript --local > src/types/database.generated.ts

Preserve Chiffre's existing accounting semantics, particularly the distinction between:

- net budget accounting
- VAT
- gross cash/payment figures

Do not change financial definitions merely to simplify UI implementation.

The application is approaching production quality. Prefer small, understandable and well-tested changes over broad refactors.

Wait for an explicit stage prompt before beginning each stage.