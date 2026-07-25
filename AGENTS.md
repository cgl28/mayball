# May Ball Finance — Repository Instructions

## Product

May Ball Finance is a collaborative budgeting and expenditure-control
application for Cambridge May Balls and similar recurring events.

Read these documents before making architectural or financial changes:

1. `docs/PRODUCT_SPECIFICATION.md`
2. `docs/DATABASE_SPECIFICATION.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/DECISIONS.md`

The product specification controls user-visible behaviour.
The database specification controls database implementation.
Applied migrations are the executable database source of truth.

If the documents and migrations disagree, stop and report the conflict.
Do not silently choose one interpretation.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- `@supabase/ssr`
- Vitest or the existing test framework
- pgTAP for database tests
- Vercel deployment

Use the package manager identified by the repository lockfile.

## Database rules

- Never edit an applied migration.
- Add a new forward migration for every schema correction.
- Every event-owned record must contain `event_id`.
- Store money as integer minor units using `_minor` column names.
- Never use JavaScript floating-point arithmetic for authoritative money values.
- Roles belong to event memberships, never global profiles.
- Every exposed table must have explicit grants and RLS.
- RLS is the security boundary; hiding UI controls is insufficient.
- Index columns used by foreign keys, common filters and RLS policies.
- Submitted and approved financial records are immutable.
- Approval and payment status are separate.
- Completion is derived from payment allocations.
- Financial transitions must use the supplied RPC/database functions.
- Do not expose the Supabase service-role key to browser code.
- Dashboard calculations must use shared database views or reporting functions.

## Working rules

Before implementing a feature:

1. Inspect the relevant specification sections.
2. Inspect the current migrations and generated database types.
3. State any ambiguity or conflict.
4. Propose the smallest vertical slice.
5. Implement database, server and UI changes together where appropriate.
6. Verify permissions with more than one user role.

Do not build several major pages in one task.
Do not redesign the schema merely to simplify a component.

## Commands

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npx tsc --noEmit`
- `npx supabase start`
- `npx supabase db reset`
- `npx supabase test db`
- `npx supabase gen types typescript --local > src/types/database.generated.ts`

Update this list if the repository scripts change.

## Definition of done

A feature is complete only when:

- Database migrations and RLS changes are included where required.
- Generated Supabase types are current.
- Server-side validation is implemented.
- Loading, empty, success and error states exist.
- Relevant role and cross-event access tests pass.
- Lint, type checking, tests and production build pass.
- No secrets or service-role credentials are committed.
- Documentation is updated when behaviour changes.