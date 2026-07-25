# Stage 3 Budget And Contingency

Stage 3 adds treasurer-controlled budget versions, department allocations and contingency transfers.

## Routes

- `/events/[eventId]/budget`: active budget summary, department positions, version history and transfer history.
- `/events/[eventId]/budget/new`: create a draft budget version.
- `/events/[eventId]/budget/versions/[budgetVersionId]/edit`: edit a draft budget version.

## Lifecycle

Budget versions use the database enum values:

- `draft`: editable by event treasurers.
- `active`: canonical current budget.
- `superseded`: previous active version retained as immutable history.
- `final`: schema-supported immutable status for later lifecycle work.

Activating a draft uses `activate_budget_version`. It locks the event/version rows, validates the draft has allocations, supersedes the old active version and activates the selected draft in one transaction. PostgreSQL also enforces at most one active version per event with `one_active_budget_per_event`.

## Original Versus Current Budget

Department allocations are stored on `department_budget_allocations` as original budget values for a version.

Current department budget is read from `v_active_budget_department_positions`:

```text
current budget = original allocation + transfers received - transfers released
```

The application does not overwrite original allocations when contingency is transferred.

## Contingency

Contingency is stored on `budget_versions.original_contingency_minor`. It is an event-level reserve, not a department.

`transfer_event_contingency` derives the active budget in PostgreSQL, locks by event, verifies the destination department belongs to the same event and rejects transfers that would overdraw unallocated contingency.

Transfer history is append-only. Reversal UI is deferred; erroneous transfers must be corrected by a future explicit reversing RPC rather than editing/deleting the original transfer.

## Money Handling

All authoritative amounts are integer minor units. UI input is parsed by `lib/money.ts` using BigInt-safe validation before converting to generated Supabase RPC argument types. Inputs with more than two decimal places, negative values or oversized values are rejected.

## Local Seed

The deterministic seed includes:

- Downing May Ball 2027 with an active treasurer.
- President-only, treasurer-only, ordinary committee and outsider personas.
- Four active departments.
- One active budget version with department allocations and contingency.

Stage 3 tests create additional draft, active and transfer records inside rolled-back pgTAP transactions.

## Known Limitations

- Transfer reversal/correction UI is deferred.
- Browser automation is not configured; runtime checks are HTTP/Node smoke checks.
- No revenue, spending requests, approvals, payments, surplus dashboard or exports are implemented in this stage.
