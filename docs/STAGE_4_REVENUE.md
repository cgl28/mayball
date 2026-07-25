# Stage 4 Revenue

Stage 4 adds treasurer-controlled revenue forecasting and actual ticket-sales snapshot entry.

## Routes

- `/events/[eventId]/revenue`: canonical revenue overview.
- `/events/[eventId]/revenue/tickets`: ticket type prices, capacity and forecast sales.
- `/events/[eventId]/revenue/actual`: cumulative actual ticket-sales snapshots and history.
- `/events/[eventId]/revenue/other`: non-ticket revenue forecasts and received amounts.

## Ticket Forecast Model

Ticket forecasts are editable planning assumptions stored on `ticket_types`.

The executable schema stores ticket identity as an event-scoped name, not a separate ticket code. The unique database rule is `(event_id, lower(name))`; a separate ticket code remains a deferred schema decision.

Each ticket type stores explicit integer-minor-unit price components:

```text
net_price_minor + vat_minor = gross_price_minor
```

Canonical forecast views multiply those stored price components by the relevant quantity:

```text
maximum gross ticket revenue = gross price x maximum allocation
forecast gross ticket revenue = gross price x forecast sales quantity
```

VAT and net forecast amounts are calculated by the same multiplication of stored VAT/net price components. The app does not perform authoritative VAT division or floating-point financial arithmetic.

## Actual Ticket Snapshots

Actual ticket revenue is a time series of immutable cumulative snapshots in `ticket_sales_snapshots`.

The crucial rule is:

```text
the latest non-void cumulative snapshot is the current actual ticket position
```

Historical snapshots are retained as history and must never be added together as if they were individual-period revenue transactions.

`v_ticket_actual_summaries` reads `v_latest_ticket_sales_snapshot`, so application code can display current actual sales without duplicating snapshot logic in React.

## Snapshot Breakdown

`ticket_type_sales_snapshots` supports optional cumulative breakdown rows by ticket type.

A valid snapshot may be total-only. When a breakdown is supplied, each row must belong to the same event and each ticket type can appear at most once for that snapshot. The current database does not require breakdown rows to reconcile to the event-level total because Ticket Tailor exports may be available only as an event total.

## Booking Fees

Ticket Tailor booking fees are charged separately to the customer in the current product model.

Stage 4 records `booking_fees_to_date_minor` where available and displays it separately. The canonical gross ticket revenue fields do not deduct booking fees.

## Other Revenue

Other revenue is stored in `other_revenue_items`. It supports forecast and actual net/VAT/gross triples, category, owner, VAT treatment, expected/received dates and status.

Received or part-received records require an actual gross amount and received date through the Stage 4 RPC. Cancelled items remain visible history and are excluded from summary totals.

## Permissions

Revenue mutations require an active event treasurer role and a writable event status. President-only users, ordinary committee members and historical users can view permitted revenue through RLS but cannot mutate it.

Stage 4 uses these RPCs:

- `save_ticket_type`
- `record_ticket_sales_snapshot`
- `void_ticket_sales_snapshot`
- `save_other_revenue_item`

The RPCs derive the actor from `auth.uid()`, validate same-event ownership, and rely on RLS plus explicit role checks. No service-role key is used.

## Local Seed

The deterministic seed includes:

- active Downing ticket types with standard VAT and complimentary allocation examples;
- several Downing cumulative ticket snapshots, including a total-only snapshot and a snapshot with ticket-type breakdown;
- booking fees recorded separately;
- other revenue examples for received contribution and forecast sponsorship;
- historical Downing revenue;
- separate-organisation revenue for isolation tests.

Local seed login credentials remain documented in `docs/STAGE_1_LOCAL_AUTH.md`.

## Known Limitations

- No Ticket Tailor API integration or email/import automation exists.
- Snapshot correction is represented by voiding a bad snapshot and recording a new cumulative snapshot; no edit/delete UI is exposed.
- Ticket-type breakdown reconciliation to event totals is not enforced because the current database/specification permit total-only snapshots.
- Ticket type codes are deferred because the executable schema has no `ticket_types.code`.
- No spending, approval, payment, bank reconciliation or surplus dashboard UI is part of Stage 4.

## Verification

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
