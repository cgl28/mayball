# Stage 8: Event Financial Dashboard

Stage 8 makes `/events/[eventId]/dashboard` the canonical event landing page. The route is protected by the Stage 1 authenticated shell and event-access helper, then loads dashboard data through typed Supabase SSR clients under the current user's session.

## Reporting Source

Dashboard totals come from PostgreSQL views added in `supabase/migrations/20260718001900_stage_8_dashboard.sql`:

- `v_event_financial_positions`
- `v_event_department_financial_positions`
- `v_event_dashboard_draft_exposures`
- `v_event_department_draft_exposures`
- `v_event_spending_summaries`
- `v_event_dashboard_pending_approvals`
- `v_event_dashboard_activity`
- `v_event_dashboard_warnings`

Application code must not reimplement these accounting formulas in React. Use the generated `Database` type and `lib/dashboard/data.ts` to fetch the views.

## Dashboard Formula Rules

- Current department budget is active allocation plus transfers received minus transfers released.
- Unallocated contingency remains central. It is not spread across departments.
- Forecast net revenue is ticket forecast net plus active other-revenue forecast net.
- Actual ticket revenue uses the latest non-void cumulative ticket snapshot only. Snapshots are history and must never be summed together.
- Booking fees are displayed separately and are not deducted from May Ball ticket revenue.
- Pending spending is submitted initial request exposure plus positive incremental exposure from pending variations.
- Approved spending uses current approved revisions. An approved baseline remains approved while a variation is pending.
- Formal forecast is forecast net revenue minus approved net spending minus unallocated contingency.
- Potential forecast is forecast net revenue minus approved net spending minus pending net spending minus unallocated contingency.
- Draft exposure is viewer-dependent through RLS and is excluded from formal and potential positions.
- Paid gross uses non-reversed payment allocations only.
- Recorded gross cash movement is actual gross revenue recorded minus active gross payments. It is not a bank balance.

## Visibility Model

RLS remains authoritative:

- Treasurers can see event-wide draft exposure and pending approval rows.
- Ordinary members see only the draft records exposed to them by base-table RLS.
- Presidents without the treasurer role do not gain treasury dashboard powers.
- Historical events render as read-only.
- Separate-organisation users cannot list or directly open another organisation's dashboard data.

The dashboard UI labels every displayed amount as net or gross, and calls out draft privacy and historical read-only state.

## Local Runtime Checks

After starting Supabase and the app:

```bash
npx supabase db reset
npm run dev
```

Use the development seed personas documented in `docs/STAGE_1_LOCAL_AUTH.md`.

Expected Downing 2027 seeded dashboard values include:

- Forecast revenue: GBP 207,084.30 net.
- Actual revenue recorded: GBP 125,000.00 gross from the latest cumulative ticket snapshot plus other actual revenue.
- Current department budget: GBP 83,000.00 net.
- Unallocated contingency: GBP 15,000.00 net.
- Approved spending: GBP 9,000.00 net.
- Pending approvals: GBP 5,200.00 net.
- Formal forecast: GBP 183,084.30 net.
- Potential forecast: GBP 177,884.30 net.

The same-organisation historical event is visible as read-only. The separate-organisation outsider must not see or open the Downing dashboard.

## Deferred

- Dashboard pagination and filter controls.
- CSV/export/report generation.
- Event completion, archival and reopen workflow.
- Bank reconciliation and imported statement balances.
