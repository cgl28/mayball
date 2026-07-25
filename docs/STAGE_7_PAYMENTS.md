# Stage 7 Payments

Stage 7 adds manual payment recording and payment-derived completion. It does not add invoices, bank import, reconciliation, document upload, CSV export or the final dashboard.

## Payment Model

Payments record money leaving the event bank account. Approval status remains separate from payment status.

Payment status is derived from non-reversed allocations:

- `unpaid`: no active allocations against the current approved request.
- `partially_paid`: active allocations are less than the current approved gross.
- `paid`: active allocations equal the current approved gross.
- `overpaid`: active allocations exceed the current approved gross. New overpayments are rejected by the current RPC/trigger path.
- `not_applicable`: no approved revision exists.

Reversing a payment marks the payment `reversed` and preserves the row and its allocations. Reporting excludes reversed payments from paid totals.

## Routes

- `/events/[eventId]/payments`: event payment summary, approved request payment positions and payment history.
- `/events/[eventId]/payments/new`: treasurer-only payment entry across one or more current approved components.
- `/events/[eventId]/payments/[paymentId]`: payment detail, allocation history and treasurer reversal.
- `/events/[eventId]/requests/[requestId]/payments`: request-specific payment position and allocation history.
- `/events/[eventId]/requests/[requestId]/payments/new`: treasurer-only payment entry scoped to one request's current approved components.

## Authorization

The UI hides mutation controls unless the current user has the event treasurer role and the event is writable. The database remains authoritative:

- `record_component_payment` checks `auth.uid()` through event treasurer membership.
- `reverse_payment` checks treasurer authority and writable event state.
- Ordinary committee members can view payment records permitted by RLS but cannot create or reverse them.
- Historical events are read-only.
- Separate-organisation users cannot enumerate payment records, allocation rows or payment views for another event.

## Variations

Historic allocations remain tied to the request component and revision that was paid. New payments target the request's current approved revision. If a later variation is approved for a larger gross value, previous payments remain counted against the request and the outstanding amount increases by the difference. A downward variation below active non-reversed payments is rejected.

## Local Testing

Use the local seed users from `docs/STAGE_1_LOCAL_AUTH.md`.

1. Sign in as `treasurer@example.test`.
2. Open Downing May Ball 2027.
3. Visit `/events/30000000-0000-0000-0000-000000000027/payments`.
4. Record a payment against an approved unpaid component.
5. Open the payment detail page and reverse it with a reason.
6. Sign in as `membera@example.test` or `president@example.test` and confirm payment history is visible but mutation controls are absent.
7. Sign in as `outsider@example.test` and confirm Downing payment pages cannot be reached.

Validation commands:

```bash
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local > src/types/database.generated.ts
npx tsc --noEmit
npm run lint
npm test
npm run build
```

## Known Limitations

The payment form records gross allocations only. The database table can store allocation net/VAT values, but the current payment RPC and MVP UI do not require the treasurer to split payment VAT at entry time.

Overpayment with an explicit treasurer explanation is deferred until the product decision for exceptional overpayment handling is specified.
