# Stage 9: Event Lifecycle And Historical Access

Stage 9 adds president-controlled event completion, archiving, exceptional reopening and append-only lifecycle history.

## State Machine

The database enum is:

```text
setup -> planning -> live -> reconciliation -> completed -> archived
```

Stage 9 implements these lifecycle RPC transitions:

- `planning`, `live` or `reconciliation` -> `completed`
- `completed` -> `archived`
- `completed` or `archived` -> `reconciliation`

Direct updates to lifecycle status and lifecycle timestamp/actor columns are blocked by a database trigger. Lifecycle RPCs lock the event row, verify `auth.uid()`, verify the president role and insert lifecycle history and activity records.

## Authority

Only an active event president may complete, archive or reopen an event. A treasurer does not gain lifecycle authority unless they also hold the president role. A president does not gain treasurer financial powers.

The same user may hold both roles because roles are event-scoped and additive.

## Completion Readiness

`event_completion_readiness(event_id)` returns canonical rows with:

- code
- severity
- category
- count
- optional money amount
- target route
- acknowledgement flag
- blocker flag

Unsupported source status and missing active president are blockers. Financial and setup conditions are warnings or information, including pending approvals, private drafts, unpaid approved requests, missing/final budget state, missing ticket snapshot, expected other revenue, unallocated contingency, reversed payments and active invitations.

Warnings must be explicitly acknowledged. PostgreSQL recomputes readiness inside `complete_event`; the client cannot bypass blockers or stale warning state.

## Completion Behaviour

Completion:

- changes the event to `completed`
- records actor, timestamp and note
- writes `event_lifecycle_history`
- writes activity log
- makes the event read-only through existing `is_event_writable` checks and Stage 9 direct lifecycle-update protection
- preserves budgets, revenue, requests, approvals, snapshots and payments

Completion is not the same as request payment completion and is not bank reconciliation.

## Archive Behaviour

Archiving is a long-term historical classification:

- only `completed` events may be archived
- a reason is required
- data is preserved
- historical read-only access remains available
- lifecycle history is appended

## Exceptional Reopening

Reopening:

- requires president authority and a non-empty reason
- works from `completed` or `archived`
- returns the event to `reconciliation`
- records actor, timestamp, reason, source status and activity
- does not reverse payments, reopen revisions, alter budgets, delete snapshots, copy memberships or create a new event

Because the original `events` constraints require completion/archive timestamps to match current status, reopened events keep prior completion/archive timestamps in `event_lifecycle_history` rather than in the mutable summary columns.

## Historical Access

Historical access is derived. Duplicate historical `event_members` rows are not required.

A user can read a completed/archived event when they:

- have active event membership in a current non-historical event from the same organisation, or
- have explicit active organisation membership for that organisation.

Pending invitations, removed memberships and other-organisation membership do not grant access.

Historical access is read-only. Old event roles do not grant mutation authority for completed/archived events.

## Draft Privacy

Derived historical users do not gain access to another person's private drafts. Base request/revision RLS still controls draft visibility, and Stage 8 dashboard draft exposure is suppressed for completed/archived events.

Owners may still see their own old private draft records where base RLS permits it. Treasurers of the historical event may see historical draft records only through existing event-role policies; this remains event-scoped, not organisation-global.

## Local Testing

Run:

```bash
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local > src/types/database.generated.ts
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Manual/runtime checks should use the seed users from `docs/STAGE_1_LOCAL_AUTH.md`.

Useful checks:

- `president@example.test` can open `/events/30000000-0000-0000-0000-000000000027/settings/lifecycle`.
- Completing Downing 2027 without acknowledgement returns an acknowledgement-required result.
- Completing with acknowledgement makes the event read-only.
- Existing dashboard, budget, revenue, request and payment data remains readable.
- Mutations in completed events fail.
- Same-organisation users retain historical read-only access.
- `outsider@example.test` cannot see Downing lifecycle data.

## Known Limitations

- CSV/export/report generation is deferred.
- Documents and storage UI are not implemented here.
- Bank reconciliation and imported bank balances are deferred.
- Removed-member historical-access testing should be expanded when the seed adds a removed same-organisation persona.
