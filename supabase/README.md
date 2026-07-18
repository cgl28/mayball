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

## Required application rule

Call the workflow RPCs for request submission/decisions, budget activation/transfers and payments. Do not recreate these transitions in Next.js or use the service-role key from browser code.
