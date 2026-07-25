# Stage 1 Local Authentication

Stage 1 uses the local Supabase database and the seed identities from `supabase/seed.sql`.

## Environment

Create `.env.local` from `.env.example` and fill in the local values printed by:

```bash
npx supabase start
```

The required variables are:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable or anon key from supabase start/status>
```

Do not commit `.env.local`.

## Seed Users

The local seed password is intentionally documented in `supabase/README.md` as `password`.

Useful local accounts:

- `president@example.test`
- `treasurer@example.test`
- `membera@example.test`
- `memberb@example.test`
- `outsider@example.test`
- `invitee@example.test`
- `noevents@example.test`

## Manual Test Flow

1. Run `npx supabase start`.
2. Run `npx supabase db reset`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.
5. Sign in as `membera@example.test` with `password`.
6. Confirm the event selector shows Downing May Ball 2027 and the completed Downing May Ball 2025 historical event.
7. Open the completed 2025 event and confirm the read-only banner appears.
8. Sign out.
9. Sign in as `outsider@example.test` and confirm only Other Ball 2027 is visible.

The application does not use a service-role key. Event visibility is filtered by Supabase RLS under the signed-in user session.
