# Refinement Roadmap 2

Stage 0 audit document. This file records recommended refinement work only; it does not implement product, database, RLS, route or UI changes.

Stage 1 update, 2026-08-09: responsive shell, branding and navigation polish has been implemented without database, RLS, RPC or financial logic changes. The authenticated shell now uses a sidebar/main grid with a shrinkable content column; wide table wrappers explicitly contain horizontal overflow; the sidebar shows current event activity, lifecycle stage and roles from the existing `EventAccess` data; redundant dashboard shortcut buttons were removed while contextual metric/warning links remain; auth pages now use a Home link to `/`; and the canonical `/brand/mbf-logo.png` asset is used across public, authenticated and auth surfaces.

Stage 2 update, 2026-08-09: the Request Changes workflow has been repaired at the application layer without database, RLS or RPC changes. The existing `decide_spending_request` RPC already preserves the submitted revision, records the treasurer review, creates a cloned owner-editable draft revision and sets `current_draft_revision_id`. The bug was that the React editor allowed only request-level `draft` status, so a request with `approval_status='changes_requested'` and a current draft revision opened as non-editable. The editor now uses the actual owner-editable draft predicate, shows the existing treasurer review reason, pre-fills the returned draft's change summary and keeps approved-request variation drafts on the separate existing path.

Stage 3 update, 2026-08-09: request component entry has been improved without database, RPC, RLS or payment-allocation changes. New requests still start with a single `Full payment` component; adding a second component renames an untouched first component to `Deposit` and adds `Final Payment`; later components default to `Instalment N`. Component expected payment dates remain stored on `request_components.expected_payment_date` and are the operational payment schedule, while the request-level `expected_payment_date` is preserved as the existing summary/reference field for request lists, approvals, finance views and exports. Component VAT treatment/rate are now editable in the form, each component has an explicit integer-safe `Compute from Gross` action, reconciliation messaging shows request/component/remaining gross totals, and the component supplier override remains supported but hidden behind an opt-in control.

Stage 3.1 update, 2026-08-09: request component reconciliation has been repaired without schema, RPC, RLS or generated-type changes. The split-request submission failure was traced to the UI splitting request net, VAT and gross independently, which could make a component row fail `net + VAT = gross` even when the total request appeared balanced. Component allocation now uses integer minor units, splits from authoritative parent gross values and applies deterministic residual pennies to the final component so component net, VAT and gross totals reconcile exactly to the parent request. The visible split presets are now `50 / 50`, `20 / 80` and `10 / 90`; duplicate equal-split controls were removed. Payment components are gated until parent request totals are valid, the parent expected-payment-date input has been removed from normal editing, and the legacy request-level date sent to existing views/RPCs is derived from the earliest component due date. Component supplier overrides are no longer exposed in the normal workflow; existing stored component supplier values are preserved via hidden compatibility data. Validation now surfaces specific actionable problems before submission, and pgTAP covers two-component and three-component split submission regressions.

Stage 3.2 update, 2026-08-09: a runtime crash in multi-component `Compute from Gross` has been fixed without database, RPC, RLS or generated-type changes. The crash was caused by invoking whole-schedule residual reconciliation while only one component row had been calculated; incomplete sibling rows could force an impossible residual onto the final component and throw through the React runtime. Per-component calculation is now local to the clicked row, while whole-schedule reconciliation remains reserved for explicit split/allocation operations and submission validation. The reconciliation helper now exposes a non-throwing result for expected incomplete, overallocated or unreconcilable user-input states. Regression tests cover the reported £400 three-component case, sequential and reverse-order component calculations, four-component residual balancing, partial schedules, over/under allocation states and the existing £2,000 split regressions.

Stage 4 update, 2026-08-09: Treasurer approval actions have been visually clarified without approval logic, RPC, RLS, schema or generated-type changes. The shared button variant system now includes reusable `success` and `warning` variants, and the approval review cards map `Approve` to green, `Request Changes` to amber and `Reject` to the existing destructive red treatment. The existing per-action confirmation checkbox, Request Changes instructions field and rejection reason field remain intact, with action-specific pending labels. Status badges remain separate from action-button styling, and the decision card layout now wraps from one column to two and three columns responsively.

Stage 4.1 update, 2026-08-09: The approval success button disabled state has been fixed without approval workflow, RPC, RLS, schema or generated-type changes. The `success` variant was already emitting the intended green background and white text, but the shared opacity-only disabled treatment could wash the green fill into a pale, low-contrast button while retaining white text. The semantic success, warning and destructive button variants now define explicit readable disabled colours, with Approve using pale green and dark green text while disabled or pending.

Stage 5 update, 2026-08-09: The Payments page has been redesigned around approved payment components without payment workflow, RPC, RLS, schema or generated-type changes. The main operational section now uses `v_request_component_payment_positions` so only current approved revision components appear, with component due dates as the scheduling field, non-reversed allocation totals as paid gross, and approved gross minus paid gross as outstanding. The default workload view is Outstanding, with URL-backed filters for Overdue, Due soon, Unpaid, Partially Paid, Paid and All; Due soon is the next 14 days, and paid components suppress due-date urgency. Summary cards distinguish approved commitments, outstanding approved gross, overdue gross, due-soon gross and paid-to-date gross. Recorded payments now appear in a separate ledger section, newest first, with method, bank reference, allocation summary and reversal status visible. Workload and ledger pagination remain independent and bounded, and no Banking-stage reconciliation or bank-import behaviour has been added.

Stage 5.1 update, 2026-08-09: Component-level payment entry has been polished without payment RPC, RLS, schema or generated-type changes. Payment workload rows now link to the existing payment form with the specific `request_component_id` as context, so the selected component is shown with request, supplier, due date, approved gross and outstanding gross, and its allocation defaults to the current outstanding amount while sibling components remain available for the general multi-allocation workflow. The Payments page now includes an accessible urgency information disclosure and a stacked workload-state bar splitting approved gross into Paid, Outstanding future/no-date, Due soon and Overdue; partially paid components contribute their paid value to Paid and only their remaining outstanding value to the relevant urgency segment. The record-payment allocation rows now use shrink-safe grid columns, `min-w-0` text containers and full-width inputs so long component labels do not push amount controls outside the card. Bank import, transaction matching, reconciliation and scheduled bank payments remain deferred.

Stage 7 update, 2026-08-09: Dashboard, Budget and Finances hierarchy has been tightened without database, RPC, RLS, permission or workflow changes. Dashboard now leads with six executive metrics and a whole-event spending-position bar that separates approved-and-paid, approved-but-unpaid, submitted/potential and remaining budget; detailed department rows have been demoted into compact visual summaries and action links. Budget now adds an active-budget allocation donut using department colours where available, keeps contingency visible as a reserve, and loads contingency transfer history only when requested with `?transfers=1`. Finances now starts with a whole-event net budget-use bar before department tabs, then repeats the same model for the selected department above the existing request table. Budget-use visuals are net-basis only; paid portions are derived proportionally from authoritative gross payment coverage, while gross cash paid remains a separate metric so net budget and gross cash are not mixed in a single stack. Charts use lightweight SVG/CSS primitives rather than a charting dependency, and no generated types or Supabase migrations were required.

Stage 8 update, 2026-08-09: Revenue entry has been simplified without database, RPC, RLS, permission, generated-type or dashboard-calculation changes. The ticket-type creation failure was traced to the UI asking treasurers to manually enter net price, VAT amount and gross price; the existing `save_ticket_type` RPC correctly rejects any payload where `net + VAT <> gross`, but the app collapsed that into a generic error. Ticket entry now asks for ticket name, gross ticket price, maximum available, forecast sales and VAT treatment, derives the reconciled net/VAT/gross RPC payload in the server action, and keeps description, update ID, VAT rate, complimentary allocation, display order and active status under Advanced. The Revenue page now leads with forecast/actual summary cards, a simple gross forecast-vs-actual visual, explicit formulas and clearer sections for ticket forecast, other forecast income and actual revenue. Forecast ticket revenue remains `gross ticket price x forecast sales`; maximum revenue remains `gross ticket price x maximum available`; total forecast and actual values still come from the existing reporting views, with actual ticket revenue based only on the latest non-void cumulative snapshot. Booking fees remain shown separately and are not deducted from canonical gross ticket revenue. Error handling now surfaces known ticket validation problems with actionable messages, and no hosted Supabase change was made.

Stage 9 update, 2026-08-09: Committee governance and Department ordering protections have been strengthened with a forward migration, app UI changes and pgTAP coverage. The active-President invariant is now centralized in `assert_event_retains_active_president`: every event must retain at least one active event member holding the President role. The existing role-removal and member-status RPCs call this helper, and the event row lock taken through `assert_president_can_manage_event`/the helper serializes concurrent President removals so two Presidents cannot simultaneously step down and leave zero active Presidents. Pending invitations and inactive members do not satisfy the invariant. The Committee page now disables the final active President role-removal control and replaces member-status mutation with a concise explanation while another President is required. Department ordering is now system-managed: standard departments receive the canonical template order from their code, custom departments are automatically placed after standard departments, and updates preserve existing order while ignoring caller-supplied order values. The raw Department “Order” input has been removed. Existing department rows are not destructively renumbered, RLS semantics are unchanged, and hosted Supabase was not touched.

## 1. Executive Summary

The application is substantially built through the MVP 1 workflow: authentication, event setup, committee administration, budgets, revenue, requests, approvals, payments, dashboard, lifecycle, documents, activity and exports are all present. The remaining issues are mostly refinement work across usability, information hierarchy and workflow clarity, with a smaller set of higher-risk database/RPC or server-action issues that must be treated as vertical fixes with regression coverage.

The highest-risk areas are:

1. Request Changes end-to-end workflow. The database has a good model: `decide_spending_request` preserves the submitted revision and creates a new owner-editable draft. The UI and tests need direct coverage that the requester can discover, edit and resubmit that draft after a treasurer requests changes.
2. Ticket type creation/update bug. The database has already had a corrective migration for the `display_order` argument type, and pgTAP covers RPC success. Any remaining hosted/UI failure is likely in form data, deployed schema drift, or stale generated types and should be debugged as a targeted Stage 4 regression.
3. Payments/Finances scalability and clarity. Payments and Finances use correct payment-derived completion concepts, but forms and tables still expose dense record sets. Previous local benchmarking showed request/payment payload size and broad payable-component loading as likely bottlenecks.

Most requested visual refinements can be handled without schema changes. Any change to approval transitions, lifecycle progression, president-removal invariants, financial dashboard calculations, ticket type persistence, or hosted test/demo data should be treated as a database-aware PR with pgTAP and generated type checks.

## 2. Issue Matrix

| # | Issue | Current behaviour | Root cause / likely cause | Change type | Risk | Migration likely? | Dependencies | Recommended stage |
|---:|---|---|---|---|---|---|---|---|
| 1 | Responsive sizing | Shell uses fixed desktop sidebar and wide tables with horizontal scroll. Mobile has a details-menu nav. | MVP screens are table/card first; few mobile-specific summaries. | UI-only | Medium | No | Shared layout, major panels | Stage A |
| 2 | Request Changes workflow not editable | RPC creates a cloned draft; edit route requires owner-editable current draft. End-to-end UI discoverability needs proof. | Tests cover DB clone/edit, but UI may not surface the edit path clearly for `changes_requested`. | App logic + DB regression | High | Maybe, only if hosted DB differs | Requests, approvals, current revision view | Stage B |
| 3 | Approval action styling | Approve, Reject and Request Changes forms share generic submit styling. | `DecisionForm` has no semantic button variants. | UI-only | Low | No | Approvals panel | Stage D |
| 4 | Request components/payment scheduling | Request form supports multiple components, dates and suppliers, but component UX is dense and table-based. | Stage 5 component model was implemented conservatively. | App logic/UI | Medium | Unlikely | Requests, payments | Stage C |
| 5 | Dashboard clarity | Dashboard exposes many correct metrics as equal-weight cards. | No top-level visual hierarchy or scenario grouping yet. | UI-only/reporting | Medium | Unlikely | Dashboard views | Stage G |
| 6 | Dashboard legacy buttons | Dashboard still uses a strip of module buttons. | Early navigation affordance remained after sidebar matured. | UI-only | Low | No | Dashboard panel, sidebar | Stage A/G |
| 7 | Revenue simplification | Revenue is split into overview/tickets/actual/other with many fields. | Database model is richer than first-time treasurer workflow. | UI/app logic | Medium | No | Revenue actions/views | Stage I |
| 8 | Requests page stable | Requests page has filters and pagination; still depends on wide table and current visible revision view. | Good MVP list, not yet optimised for daily scanning. | UI/app logic | Medium | No | Request list/data | Stage B/C |
| 9 | Payments page redesign | Payments list has summary cards, approved positions and history; record form loads payable components. | Correct model, dense UX and potential large form payload. | UI/app logic | Medium | Unlikely | Payment views/RPCs | Stage E |
| 10 | Lifecycle progression | Lifecycle page has stage display, readiness and transition forms. | Operational progression exists but needs clearer guided state. | UI/app logic + DB if transitions change | Medium | Maybe | Lifecycle RPCs/history | Stage F |
| 11 | Lifecycle vs Settings | Settings page links to lifecycle and says they are separate. | Separation exists, but navigation can be more explicit. | UI-only | Low | No | Settings/lifecycle routes | Stage F |
| 12 | Sidebar current-event display | Sidebar shows current event name and read-only/active badge only. | Lacks year/status/organisation context on compact screens. | UI-only | Low | No | AppSidebar, EventAccess | Stage A |
| 13 | President self-removal safeguard | DB blocks removing/deactivating the final active president; UI has no pre-confirmation. | RPC invariant exists, but controls are simple toggles. | UI/app logic + tests | Medium | No | Committee panel/actions | Stage J |
| 14 | Department ordering | Departments have numeric order fields and standard template order. | Ordering is manually typed, no drag/reorder workflow. | UI/app logic | Low | No | Departments panel/RPC | Stage J |
| 15 | Budget visualisation | Budget uses cards and tables. | No visual allocation/contingency chart yet. | UI-only | Low | No | Budget views | Stage G |
| 16 | Forecast revenue workflow | Ticket forecasts are editable assumptions; forms are detailed. | Need a quicker forecast editing path without changing snapshot semantics. | UI/app logic | Medium | No | Revenue/ticket type form | Stage I |
| 17 | Finances page ordering | Finances has department tabs and filters; request table is dense and ordered by fetched rows. | Department detail combines summary and row table without prioritised grouping. | UI/app logic | Medium | No | Finances data/panel | Stage G |
| 18 | Whole-event finances visual | Whole-event view is dashboard metrics rather than a single visual financial story. | Reporting data exists, presentation is still card grid. | UI-only/reporting | Medium | Maybe if new aggregate view needed | Dashboard/finances views | Stage G |
| 19 | Finances paid vs unpaid approved spend | Paid and outstanding are shown, but approved net/gross/payment concepts are split across pages. | Correct domain split, incomplete visual explanation. | UI/reporting | Medium | Maybe | Payment position views | Stage G/E |
| 20 | Automatic component naming | New/split components use labels like Full payment, Deposit, Balance; DB code uses request code plus sequence. | Basic naming heuristic only. | App logic/UI | Low | No | SpendingRequestForm/RPC | Stage C |
| 21 | Ticket-type creation bug | RPC has a corrective migration for integer display order and pgTAP success coverage. Hosted/UI failures likely need isolated repro. | Possible deployment drift, stale types, form validation, or unseen hosted error. | DB/RPC + app debug | High | Maybe | Revenue actions, Supabase hosted migration state | Stage H |
| 22 | Auth navigation text | Login/sign-up and public header are polished but may need copy consistency. | Public/auth routes evolved over several passes. | UI-only | Low | No | Public/auth components | Stage A |
| 23 | Logo consistency | Header/sidebar use PNG logo; footer still uses text `MBF` mark. | Logo pass covered header/sidebar, not every brand surface. | UI-only | Low | No | Public footer, app shell | Stage A |
| 24 | Hosted test accounts | Local seed has deterministic users; hosted Supabase should not blindly receive local passwords. | Auth users are environment data, not pure migrations. | Ops/documentation | Medium | No schema migration | Supabase Auth, seed policy | Stage K |
| 25 | 2025 demo event | Local seed includes completed 2025 event with historical fixture data. Hosted demo/import strategy unclear. | Seed data is local deterministic, production demo data needs deliberate import path. | Ops/data tooling | Medium | Maybe data-only | Supabase hosted, demo policy | Stage L |

## 3. Detailed Analysis Per Issue

### 1. Responsive sizing

- Current implementation: `components/app-shell.tsx` uses `lg:pl-72`, max-width content, and the sidebar is a fixed `w-72`. Tables in Requests, Approvals, Dashboard, Budget, Finances and Payments use large `min-w-*` values inside `overflow-x-auto`.
- Relevant files: `components/app-shell.tsx`, `components/app-sidebar.tsx`, `components/requests-panel.tsx`, `components/payments-panel.tsx`, `components/dashboard-panel.tsx`, `components/finances-panel.tsx`, `components/budget-panel.tsx`.
- Relevant DB/RPCs: none.
- Current tests: component rendering tests exist for major panels, but little viewport/responsive assertion coverage.
- Likely fix: add mobile-first summary cards above wide tables, tighten header/sidebar spacing, and make current-event context clearer on mobile.
- Dependencies: none, but do before page-specific visual work so later refinements inherit the shell.
- Risks: accidental loss of table data on small screens.
- Acceptance criteria: no content overlap at mobile/tablet/desktop widths; keyboard navigation remains visible; wide financial tables remain accessible.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 2. Request Changes workflow not editable

- Current implementation: `public.decide_spending_request` marks the submitted revision `changes_requested`, clones a new `draft` revision, copies allocations/components and sets `spending_requests.current_draft_revision_id`. The edit route only renders when `can_edit_draft`, `current_draft_revision_id` and `revision_status='draft'` are present.
- Relevant files: `app/events/[eventId]/approvals/actions.ts`, `app/events/[eventId]/requests/[requestId]/edit/page.tsx`, `components/requests-panel.tsx`, `lib/requests/data.ts`, `supabase/migrations/20260718001500_stage_6_treasurer_approval.sql`, `supabase/migrations/20260718001700_fix_current_request_pending_revision_priority.sql`.
- Relevant DB/RPCs: `decide_spending_request`, `update_spending_request_draft`, `submit_spending_request`, `v_spending_request_current_revisions`.
- Current tests: `supabase/tests/008_treasurer_approval.test.sql` proves treasurer request-changes creates a cloned draft and the creator can edit/resubmit it. UI tests verify decision controls and status labels, but not the requester discovery/edit route after changes requested.
- Likely fix: add app tests and, if needed, UI affordance on request detail/list for owners when status is `changes_requested`. Do not change the DB unless the hosted schema diverges from local.
- Dependencies: should be first workflow refinement after responsive shell.
- Risks: exposing another user's private draft if query/view assumptions are changed incorrectly.
- Acceptance criteria: treasurer requests changes; owner sees a clear requested-changes state, can open edit, sees instructions, saves, resubmits; non-owner cannot see/edit the cloned draft; pgTAP still passes.
- Migration needed: unlikely locally; possible corrective migration if hosted/database types prove drift.
- Hosted Supabase update needed: only if a migration/type drift is identified.

### 3. Approval action styling

- Current implementation: `DecisionForm` renders all three decisions with `SubmitButton` default styling, making approve/reject/request-changes visually equivalent.
- Relevant files: `components/approvals-panel.tsx`, `components/submit-button.tsx`.
- Relevant DB/RPCs: `decide_spending_request`.
- Current tests: `test/approval-stage-6.test.tsx` checks decision controls render and historical controls are hidden.
- Likely fix: semantic button variants: approve primary, request changes secondary/warning, reject destructive/outline with confirmation copy.
- Dependencies: none.
- Risks: accidental form-action changes if refactoring too broadly.
- Acceptance criteria: buttons are visually distinct, labelled accessibly, still submit the same hidden `decision` values.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 4. Request components/payment scheduling

- Current implementation: `SpendingRequestForm` supports multiple components with description/date/supplier/net/VAT/gross, plus split and allocate remaining helpers. Payment recording later allocates to approved components.
- Relevant files: `components/spending-request-form.tsx`, `lib/requests/form.ts`, `lib/requests/data.ts`, `components/payments-panel.tsx`.
- Relevant DB/RPCs: `request_components`, `create_spending_request_draft`, `update_spending_request_draft`, `record_component_payment`.
- Current tests: Stage 5/7 tests cover component reconciliation and payment-derived status.
- Likely fix: improve scheduling UX: clearer default component names, date validation guidance, component totals summary, and a stronger distinction between request expected date and component payment schedule.
- Dependencies: Request Changes work, because edited requested-changes drafts reuse the same form.
- Risks: breaking exact reconciliation or creating misleading payment expectations.
- Acceptance criteria: single-payment, deposit/balance and multiple-installment requests are understandable and still reconcile exactly.
- Migration needed: no unless new scheduling fields are introduced; avoid that in first pass.
- Hosted Supabase update needed: no.

### 5. Dashboard clarity

- Current implementation: `DashboardPanel` shows a correct but large grid of financial cards, then formal/potential, revenue snapshot, departments, warnings, pending approvals and activity.
- Relevant files: `components/dashboard-panel.tsx`, `lib/dashboard/data.ts`, `supabase/migrations/20260718001900_stage_8_dashboard.sql`.
- Relevant DB/RPCs: `v_event_financial_positions`, `v_event_department_financial_positions`, `v_event_dashboard_warnings`.
- Current tests: `test/dashboard-stage-8.test.tsx`, `supabase/tests/010_dashboard.test.sql`.
- Likely fix: restructure into a small number of top-level questions: current forecast, cash movement, budget pressure, actions needing attention.
- Dependencies: payments/finances visual decisions.
- Risks: hiding important net/gross distinctions.
- Acceptance criteria: net/gross labels remain explicit; warning routes remain actionable; treasurer-only draft/approval data remains role-gated.
- Migration needed: unlikely.
- Hosted Supabase update needed: no unless reporting view changes.

### 6. Dashboard legacy buttons

- Current implementation: module shortcut buttons remain in the dashboard hero while the sidebar already provides primary navigation.
- Relevant files: `components/dashboard-panel.tsx`, `components/app-sidebar.tsx`.
- Relevant DB/RPCs: none.
- Current tests: dashboard tests expect module content but likely not every shortcut.
- Likely fix: replace button strip with contextual next actions or remove duplicate navigation.
- Dependencies: responsive/sidebar pass.
- Risks: reducing discoverability if sidebar is collapsed on mobile.
- Acceptance criteria: users can still reach all modules on mobile and desktop; no duplicate/confusing action strip.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 7. Revenue simplification

- Current implementation: revenue is split across Overview, Ticket types, Actual snapshots and Other revenue. It correctly states forecasts are editable assumptions and actual ticket revenue is cumulative snapshots.
- Relevant files: `components/revenue-panel.tsx`, `lib/revenue/data.ts`, `app/events/[eventId]/revenue/actions.ts`.
- Relevant DB/RPCs: `save_ticket_type`, `record_ticket_sales_snapshot`, `save_other_revenue_item`, `v_event_revenue_summaries`.
- Current tests: `test/revenue-stage-4.test.tsx`, `supabase/tests/006_revenue.test.sql`.
- Likely fix: create a clearer first-run workflow while preserving the separate pages and cumulative snapshot model.
- Dependencies: ticket-type bug investigation.
- Risks: mixing forecast and actual terminology.
- Acceptance criteria: users can understand/edit forecast assumptions without thinking snapshots are additive transactions.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 8. Requests page stable

- Current implementation: requests list has filters, search and pagination. It uses `v_spending_request_current_revisions` and payment positions for list badges.
- Relevant files: `components/requests-panel.tsx`, `lib/requests/data.ts`.
- Relevant DB/RPCs: `v_spending_request_current_revisions`, `v_request_payment_positions`.
- Current tests: `test/spending-stage-5.test.tsx`, `test/list-pagination-data.test.ts`.
- Likely fix: improve row hierarchy, owner action visibility and stable filters; add requested-changes path coverage.
- Dependencies: issue 2.
- Risks: accidentally filtering private drafts incorrectly.
- Acceptance criteria: list remains paginated, filters preserve query state, draft privacy and requested-changes owner actions are correct.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 9. Payments page redesign

- Current implementation: `PaymentsPanel` shows summary cards, approved request positions, payment history and a record form that can load all payable components.
- Relevant files: `components/payments-panel.tsx`, `lib/payments/data.ts`.
- Relevant DB/RPCs: `v_request_payment_positions`, `v_request_component_payment_positions`, `v_payment_details`, `record_component_payment`, `reverse_payment`.
- Current tests: `test/payments-stage-7.test.tsx`, `supabase/tests/009_payments.test.sql`.
- Likely fix: make payments task-oriented: “things to pay”, “recent payments”, “reversed history”. Filter component selection by request/search instead of presenting every component.
- Dependencies: component scheduling UX.
- Risks: paying the wrong component if grouping becomes too clever.
- Acceptance criteria: payment status remains derived from allocations; record form only targets approved outstanding components; reversal history remains visible.
- Migration needed: unlikely.
- Hosted Supabase update needed: no.

### 10. Lifecycle progression

- Current implementation: lifecycle page shows stages, readiness warnings, history and RPC-backed complete/archive/reopen controls.
- Relevant files: `components/lifecycle-panel.tsx`, `lib/lifecycle/data.ts`, `app/events/[eventId]/settings/lifecycle/actions.ts`, `supabase/migrations/20260718002000_stage_9_event_lifecycle.sql`.
- Relevant DB/RPCs: `event_completion_readiness`, `complete_event`, `archive_event`, `reopen_event`, `event_lifecycle_history`.
- Current tests: `test/lifecycle-stage-9.test.tsx`, `supabase/tests/011_event_lifecycle.test.sql`.
- Likely fix: clearer stage guidance and decision language. Only change RPCs if product rules for status transitions change.
- Dependencies: settings separation issue.
- Risks: lifecycle mutations change read-only state for the whole event.
- Acceptance criteria: supported transitions remain exactly DB-backed; warnings/blockers are understandable; completed/archived events stay read-only.
- Migration needed: maybe, only for transition-rule changes.
- Hosted Supabase update needed: yes if lifecycle RPC changes.

### 11. Lifecycle vs Settings

- Current implementation: Event settings page explicitly says lifecycle is managed separately and links to lifecycle settings.
- Relevant files: `components/event-settings-panel.tsx`, `app/events/[eventId]/settings/page.tsx`, `components/app-sidebar.tsx`.
- Relevant DB/RPCs: `update_event_settings`, lifecycle RPCs.
- Current tests: lifecycle/settings tests are split.
- Likely fix: make sidebar labels and settings page copy clearer, possibly group “Event setup” and “Lifecycle” under one navigation section.
- Dependencies: responsive sidebar pass.
- Risks: navigation churn.
- Acceptance criteria: users know where to edit event identity versus complete/archive/reopen.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 12. Sidebar current-event display

- Current implementation: sidebar shows current event name plus Active/Read-only badge; it does not show year/status/organisation in the compact current-event block.
- Relevant files: `components/app-sidebar.tsx`, `lib/events/access.ts`.
- Relevant DB/RPCs: none.
- Current tests: `test/app-sidebar.test.tsx`.
- Likely fix: include event year and status label; keep mobile nav compact.
- Dependencies: responsive shell pass.
- Risks: overcrowding mobile menu.
- Acceptance criteria: current event is identifiable without raw IDs; historical state visible; no layout overlap.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 13. President self-removal safeguard

- Current implementation: DB functions `remove_event_role` and `update_event_member_status` reject removal/deactivation of the last active president. UI does not pre-warn.
- Relevant files: `components/committee-panel.tsx`, `app/events/actions.ts`, `supabase/migrations/20260718000600_stage_2_governance_setup.sql`.
- Relevant DB/RPCs: `remove_event_role`, `update_event_member_status`.
- Current tests: `supabase/tests/004_governance_setup.test.sql` covers final-president rejection.
- Likely fix: add visible disabled/confirmation state when a member is the final president; preserve DB invariant.
- Dependencies: committee/governance refinement.
- Risks: computing “final president” incorrectly in UI; DB remains authoritative.
- Acceptance criteria: final president cannot accidentally remove their last managing role; direct RPC still rejects.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 14. Department ordering

- Current implementation: departments have `display_order`; standard templates assign order; edit form exposes a numeric Order field.
- Relevant files: `components/departments-panel.tsx`, `lib/departments/templates.ts`, `app/events/actions.ts`.
- Relevant DB/RPCs: `create_department`, `update_department`.
- Current tests: Stage 2 tests include department rendering and pgTAP uniqueness.
- Likely fix: add simple up/down or reorder controls, or clarify manual numeric ordering.
- Dependencies: responsive shell and committee governance refinements.
- Risks: reorder race/duplicate order values if implemented as bulk update without transaction.
- Acceptance criteria: departments sort predictably; same-event code uniqueness remains enforced.
- Migration needed: no for manual/up-down; maybe if adding bulk reorder RPC.
- Hosted Supabase update needed: only if new RPC.

### 15. Budget visualisation

- Current implementation: budget overview has summary cards, department budget table, transfer form/history and budget version cards.
- Relevant files: `components/budget-panel.tsx`, `lib/budget/data.ts`.
- Relevant DB/RPCs: `v_active_budget_summaries`, `v_active_budget_department_positions`, `transfer_contingency`, budget version RPCs.
- Current tests: `test/budget-stage-3.test.tsx`, `supabase/tests/005_budget_contingency.test.sql`.
- Likely fix: add visual allocation bars for department budgets and contingency reserve.
- Dependencies: dashboard visual language.
- Risks: charts implying spending values that budget page intentionally excludes.
- Acceptance criteria: page continues to distinguish budget allocation from spending/revenue.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 16. Forecast revenue workflow

- Current implementation: ticket type form edits assumptions with net/VAT/gross/capacity/forecast fields. Existing ticket update uses a raw existing ticket ID input.
- Relevant files: `components/revenue-panel.tsx`, `app/events/[eventId]/revenue/actions.ts`.
- Relevant DB/RPCs: `save_ticket_type`.
- Current tests: revenue panel tests verify form visibility and snapshot semantics.
- Likely fix: replace raw ID update field with per-ticket edit affordances or selectable existing ticket, while keeping forecast and actual separate.
- Dependencies: ticket-type creation bug investigation.
- Risks: accidental creation of duplicate ticket types.
- Acceptance criteria: update path is human-friendly and duplicate event-scoped names fail safely.
- Migration needed: no.
- Hosted Supabase update needed: no unless DB drift found.

### 17. Finances page ordering

- Current implementation: finances page defaults to the first department, uses department tabs and filters request rows client-side.
- Relevant files: `components/finances-panel.tsx`, `lib/finances/data.ts`.
- Relevant DB/RPCs: `v_event_department_financial_positions`, `spending_request_department_allocations`, `v_request_payment_positions`.
- Current tests: `test/finances-panel.test.tsx`, `test/finances-data.test.ts`.
- Likely fix: group rows by actionable state or risk, not just current fetched order; consider server-side filtering/pagination if lists grow.
- Dependencies: payments redesign and dashboard visual language.
- Risks: changing sort order could obscure newly updated requests.
- Acceptance criteria: users can quickly identify over-budget/unpaid/pending items; filters preserve URL state.
- Migration needed: no initially.
- Hosted Supabase update needed: no.

### 18. Whole-event finances visual

- Current implementation: whole-event financial story is mainly dashboard cards plus department table.
- Relevant files: `components/dashboard-panel.tsx`, `components/finances-panel.tsx`, `lib/dashboard/data.ts`.
- Relevant DB/RPCs: dashboard reporting views.
- Current tests: dashboard and finances tests cover labels and historical behavior.
- Likely fix: add a visual “forecast waterfall” or grouped position summary using existing view values.
- Dependencies: dashboard clarity.
- Risks: misrepresenting net/gross or contingency.
- Acceptance criteria: visual explicitly labels forecast revenue, approved spending, pending exposure, contingency and potential position.
- Migration needed: unlikely unless current view lacks a needed field.
- Hosted Supabase update needed: only if view changes.

### 19. Finances paid vs unpaid approved spend

- Current implementation: dashboard and finances show approved spend, paid spending and unpaid approved values; payments page shows request/component positions.
- Relevant files: `components/dashboard-panel.tsx`, `components/finances-panel.tsx`, `components/payments-panel.tsx`.
- Relevant DB/RPCs: `v_request_payment_positions`, `v_request_component_payment_positions`, dashboard views.
- Current tests: Stage 7/8 tests cover derived payment statuses and labels.
- Likely fix: stronger side-by-side explanation of approval commitment versus cash paid/outstanding.
- Dependencies: payments redesign.
- Risks: mixing net approved spend with gross payment movement.
- Acceptance criteria: every card/table labels net/gross and “approved does not mean paid.”
- Migration needed: maybe if a department-level unpaid approved view is needed.
- Hosted Supabase update needed: only if view changes.

### 20. Automatic component naming

- Current implementation: component defaults are “Full payment”, “Deposit” and “Balance”; DB component codes are derived from request code and sequence.
- Relevant files: `components/spending-request-form.tsx`, `supabase/migrations/20260718001500_stage_6_treasurer_approval.sql`.
- Relevant DB/RPCs: `request_components`.
- Current tests: component reconciliation tests exist.
- Likely fix: generate clearer labels when splitting, e.g. “Deposit”, “Second instalment”, “Final balance,” without changing DB code rules.
- Dependencies: request component scheduling.
- Risks: changing user-entered component names unexpectedly.
- Acceptance criteria: automatic names are only defaults and remain editable; component sequence/code remains stable.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 21. Ticket-type creation bug

- Current implementation: `save_ticket_type` accepts integer display order after `20260718001100_fix_ticket_type_display_order_arg.sql`; server action sends parsed integer; pgTAP verifies create/update.
- Relevant files: `components/revenue-panel.tsx`, `app/events/[eventId]/revenue/actions.ts`, `supabase/migrations/20260718001000_stage_4_revenue.sql`, `supabase/migrations/20260718001100_fix_ticket_type_display_order_arg.sql`.
- Relevant DB/RPCs: `save_ticket_type`.
- Current tests: `supabase/tests/006_revenue.test.sql` covers create/update and invalid cases. UI test only renders the form.
- Likely fix: reproduce with hosted schema and logged safe error. Check generated type signature, Supabase migration state and server-action redirect error.
- Dependencies: none, but do before revenue simplification.
- Risks: hosted DB may not have the corrective migration or grants.
- Acceptance criteria: treasurer can create and update a ticket type in local and hosted preview; failure messages are safe and specific; pgTAP and app tests cover the actual defect.
- Migration needed: maybe if hosted/local migration state diverges.
- Hosted Supabase update needed: likely if migration drift is confirmed.

### 22. Auth navigation text

- Current implementation: public header uses “Log In” and “Get Started”; authenticated state uses “Open App”. Auth pages have Back control.
- Relevant files: `components/marketing/public-layout.tsx`, `app/auth/login/page.tsx`, `app/auth/sign-up/page.tsx`, `components/login-form.tsx`, `components/sign-up-form.tsx`.
- Relevant DB/RPCs: none.
- Current tests: `test/public-marketing.test.tsx`, `test/login-form.test.tsx`, sign-up/login tests.
- Likely fix: tighten labels and return-path language; ensure `/login` and `/signup` shortcuts stay consistent if present.
- Dependencies: branding pass.
- Risks: auth redirect regression if route logic is touched unnecessarily.
- Acceptance criteria: login/signup text is consistent and existing auth tests still pass.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 23. Logo consistency

- Current implementation: public header and app sidebar use `/brand/mbf-logo.png`; public footer still uses a text `MBF` block.
- Relevant files: `components/marketing/public-layout.tsx`, `components/app-sidebar.tsx`.
- Relevant DB/RPCs: none.
- Current tests: `test/public-marketing.test.tsx`, `test/app-sidebar.test.tsx`.
- Likely fix: use the same logo mark in footer and any remaining brand surfaces while preserving compact layout.
- Dependencies: responsive/branding pass.
- Risks: layout shift if dimensions are omitted.
- Acceptance criteria: all public and authenticated brand surfaces use consistent alt text and dimensions.
- Migration needed: no.
- Hosted Supabase update needed: no.

### 24. Hosted test accounts

- Current implementation: local seed creates deterministic users such as `president@example.test` and `treasurer@example.test`. Hosted Auth users are environment-specific and should not be seeded casually into production.
- Relevant files: `supabase/seed.sql`, `docs/STAGE_1_LOCAL_AUTH.md`, `docs/STAGE_2_SETUP_ADMIN.md`.
- Relevant DB/RPCs: none, except hosted Auth/profile setup triggers.
- Current tests: local tests use deterministic users.
- Likely fix: document a safe hosted preview persona strategy: either invite real test emails in preview, or run a controlled preview-only Auth seed script outside production.
- Dependencies: deployment/preview environment policy.
- Risks: exposing shared passwords or `.example.test` accounts in production.
- Acceptance criteria: preview testing has known users without committing secrets or polluting production data.
- Migration needed: no schema migration.
- Hosted Supabase update needed: yes, operational Auth/data setup in preview only if chosen.

### 25. 2025 demo event

- Current implementation: local seed includes `Downing May Ball 2025` as completed historical data with revenue/spending fixtures. Documentation notes historical access behavior.
- Relevant files: `supabase/seed.sql`, `docs/STAGE_9_EVENT_LIFECYCLE.md`, `docs/IMPLEMENTATION_PLAN.md`.
- Relevant DB/RPCs: event/history/read-only policies and all financial views.
- Current tests: pgTAP covers historical visibility and read-only mutation rejection.
- Likely fix: decide whether hosted preview should include imported demo data, a controlled SQL fixture, or no demo data.
- Dependencies: hosted test accounts strategy.
- Risks: accidentally importing local fake data into production-like user space or confusing real accounts.
- Acceptance criteria: demo event policy is explicit; if imported, it remains read-only and clearly marked as demo/historical.
- Migration needed: maybe data-only tooling, not schema.
- Hosted Supabase update needed: yes if preview demo data is desired.

## 4. Recommended Implementation Sequence

### Stage 5.2 payment workflow refinements

- Completed: payment workload rows now use an effective due date at read time: component due date first, then event date, then no due date.
- Completed: payment workload status includes a visible pastel legend, and urgency help opens in a central modal rather than inline table details.
- Completed: request-detail payment entry now uses the same editable component-selection form as the general payment route.
- Completed: payment gross is derived from selected component allocations and no longer has a separate editable gross field in the UI.
- Completed: workload row actions now present `Record payment` before `History`.
- Database impact: no migration, RPC, RLS, or generated-type change required.
- Regression coverage: payment helper tests cover effective due-date fallback; payment UI tests cover editable component selection, derived gross, action order, legend and urgency modal behavior.

1. Stage A: Responsive shell, branding and navigation. Issues 1, 6, 12, 22, 23.
2. Stage B: Request Changes workflow. Issues 2 and 8.
3. Stage C: Request component scheduling and naming. Issues 4 and 20.
4. Stage D: Approval action styling. Issue 3.
5. Stage E: Payments redesign and paid/outstanding clarity. Issues 9 and 19.
6. Stage F: Lifecycle/Settings separation and progression clarity. Issues 10 and 11.
7. Stage G: Dashboard, Budget and Finances visual refinement. Issues 5, 15, 17, 18 and any remaining part of 19.
8. Stage H: Ticket-type creation bug investigation/fix. Issue 21.
9. Stage I: Revenue simplification and forecast workflow. Issues 7 and 16.
10. Stage J: Committee/department governance polish. Issues 13 and 14.
11. Stage K: Hosted test-account strategy. Issue 24.
12. Stage L: 2025 demo import/tooling decision. Issue 25.
13. Stage M: Regression, accessibility and performance pass across all changed routes.

## 5. PR Boundaries

- PR 1: Shell/navigation/branding only. No database changes.
- PR 2: Request Changes workflow and request list/detail discoverability. Include UI tests and pgTAP only if behavior changes.
- PR 3: Request component scheduling/naming. No payment RPC changes unless a defect is found.
- PR 4: Approval decision button styling. UI-only.
- PR 5: Payments UX and paid/outstanding clarity. Keep payment-derived completion intact.
- PR 6: Lifecycle/settings UX. DB-only if transition semantics change.
- PR 7: Dashboard/Budget/Finances visual pass. Prefer existing views.
- PR 8: Ticket type bug fix. Narrow repro, DB migration only if required.
- PR 9: Revenue simplification. Preserve cumulative snapshot semantics.
- PR 10: Governance polish. Preserve final-president DB invariant.
- PR 11: Preview data/account documentation or scripts. Keep production data separate.

## 6. Database-Change Forecast

Likely no migration:

- Responsive sizing, approval styling, dashboard legacy buttons, sidebar display, auth text, logo consistency, budget visualisation, most revenue simplification, component naming.

Possible migration or generated-type update:

- Request Changes only if hosted/local behavior proves divergent.
- Lifecycle progression if allowed transitions or readiness rules change.
- Whole-event finances or paid/unpaid reporting if current views do not expose the needed aggregate.
- Ticket-type creation if the hosted schema lacks `20260718001100_fix_ticket_type_display_order_arg.sql` or another RPC/grant defect is found.
- Department ordering only if a bulk reorder RPC is added.

Operational hosted work, not ordinary schema migration:

- Hosted test accounts.
- 2025 demo event import or preview fixture.

## 7. Regression-Risk Map

- RLS/privacy: Request Changes, Requests list, hosted demo data, historical access.
- Financial correctness: Dashboard, Finances, Budget, Payments, Revenue snapshots.
- Workflow state machines: Approval decisions, lifecycle completion/archive/reopen, payment reversal.
- Role boundaries: President self-removal, president without treasurer, ordinary member read-only access.
- Performance: Payments form payable component loading, Requests/Payments payload size, Finances request row volume.
- Accessibility: Responsive shell, wide tables, action button semantics, lifecycle confirmations.

## 8. Test-Gap Analysis

- Add UI tests for owner discovering and editing a changes-requested draft.
- Add integration or server-action tests around the exact hosted/local ticket-type creation failure once reproduced.
- Add responsive smoke tests for sidebar/current-event/mobile navigation.
- Add tests that approval decision buttons remain semantically distinct while posting the same RPC payloads.
- Add payments tests for filtered/targeted component selection if the form is redesigned.
- Add dashboard/finances tests for any new visual summaries to ensure net/gross labels remain visible.
- Add committee UI tests for final-president warnings, alongside existing pgTAP invariant tests.
- Add documentation or script tests for preview-only account/demo-data setup if scripts are introduced.

## 9. Manual Acceptance Plan

Run this after each implementation PR that touches the relevant area:

1. Sign in as president, treasurer, ordinary member and outsider in local Supabase.
2. Verify responsive navigation at mobile, tablet and desktop widths.
3. Submit a request, have treasurer request changes, return as owner, edit and resubmit.
4. Approve, reject and request changes from approval detail; confirm button styling and resulting states.
5. Create a multi-component request and record a partial payment against one component.
6. Confirm approved, paid and outstanding values remain separated and labelled.
7. Create/update ticket types, record two cumulative snapshots and verify only the latest snapshot is current.
8. Complete/archive/reopen an event only through lifecycle controls and verify read-only behavior.
9. Attempt final-president role removal and status deactivation.
10. Verify outsider cannot list or open protected records.
11. For hosted preview, verify selected test/demo users are intentional and not production secrets.

## 10. Open Decisions

- `docs/DECISIONS.md` is referenced by `AGENTS.md` but is not present. Decide whether to create it or update `AGENTS.md`.
- Should hosted preview have shared test users, invited real tester accounts, or a separate preview Auth seed process?
- Should the 2025 demo event be imported into hosted preview, generated through a script, or remain local-only?
- Should revenue ticket type editing use inline rows, a dedicated edit page, or a modal?
- Should department reordering stay as manual numeric order or become a transaction-backed reorder action?
- Should dashboard visuals be implemented with CSS-only bars first, or introduce a charting dependency?
- Should payments form load only a selected request's payable components by default for large events?

## 11. Stage 12 Release-Candidate Regression Pass

- Completed: baseline verification passed locally with TypeScript, lint, Vitest, production build, Supabase reset, pgTAP and regenerated Supabase types.
- Completed: public, authentication, app home/profile/join, event shell, dashboard, committee, departments, budget, revenue, finances, requests, approvals, payments, settings, lifecycle, documents, activity and exports routes returned successfully in local production smoke checks.
- Completed: seeded president, treasurer, ordinary member, outsider and no-event personas were used for local route and access smoke checks. Cross-organisation direct event URLs did not expose protected Downing event names or financial details.
- Completed: `MBF_PERF_TRACE=1` route sampling confirmed one request-scoped auth/profile load and one visible-event access load per protected route, with bounded page-specific Supabase calls on the local seed dataset.
- Completed: local migration ordering was checked with `npx supabase migration list --local`; the unqualified linked migration list was intentionally stopped after it hung while checking linked state.
- Regressions found: no P0/P1 release blockers were found. No bounded P2 application or database fix was required during this pass.
- Fixes made: documentation-only Stage 12 release-candidate note.
- Deferred: Stages 10 and 11 remain intentionally skipped. Banking and Timeline are future route names; the current application exposes Documents, Activity and Exports instead. Generic fallback error messages remain only where mapping every database failure to a safe user-facing message would be broader than this pass.
- Readiness recommendation: ready for preview release after the final verification commands remain green.
