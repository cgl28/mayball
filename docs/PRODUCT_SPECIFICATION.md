---
title: "May Ball Finance"
subtitle: "Full Program Specification — MVP 1"
date: "17 July 2026"
author: "Implementation baseline • Version 1.0"
---

**Intended stack:** Next.js, TypeScript, Supabase Auth, PostgreSQL, Row Level Security and Supabase Storage  
**Primary audience:** Product owner, software developers, future maintainers, May Ball presidents, treasurers and committee members

---

## 1. Executive summary

May Ball Finance is a collaborative financial planning and expenditure-control application for Cambridge May Balls and similar recurring committee-run events. It replaces a collection of department spreadsheets, email approvals and locally stored invoice folders with one shared system.

The application will allow an event committee to forecast ticket and other revenue, allocate budgets to departments, submit spending requests, approve expenditure, record payments and monitor the expected surplus or deficit. It will preserve the finances of completed events so future committees can learn from previous balls.

The application is not, in MVP 1, a full double-entry accounting package, VAT-return system, ticketing platform or automated bank feed. It is the operational layer between the event budget and the bank account: it records what the committee wants to spend, what the treasurer has authorised, and what the ball has actually paid.

The core financial distinctions are:

- **Forecast revenue:** income the event expects to earn.
- **Actual revenue:** cumulative income reported from Ticket Tailor or another source.
- **Department budget:** the current spending envelope controlled by the treasurer.
- **Draft spending:** private proposals still being prepared.
- **Submitted spending:** requests awaiting a treasurer decision.
- **Approved spending:** authorised expenditure based on the current approved revision.
- **Paid spending:** gross cash that has left the ball's bank account.
- **Contingency:** event-level reserve not yet assigned to a department.

Approval status and payment status must remain separate. An approved request may be unpaid, partially paid or paid.

## 2. Product goals

MVP 1 must:

1. Give the treasurer a reliable, current view of revenue, budgets, approved commitments and payments.
2. Let committee members propose expenditure without editing the central budget.
3. give the treasurer sole control of approvals, budget versions, contingency transfers and payment records.
4. Make the effect of each request on its department and the event's projected result visible before approval.
5. Preserve immutable approval history when an approved amount is changed.
6. Replace separate department spreadsheet tabs with filterable department views.
7. Preserve completed events as read-only history for future committees within the same organisation.
8. Enforce event separation and permissions in the database through Supabase Row Level Security, not only through the interface.
9. Establish a schema that can later accept invoices, documents, bank transactions, Ticket Tailor imports and formal reports without collapsing or replacing the MVP's core entities.

## 3. Non-goals for MVP 1

The following are deliberately deferred:

- Automated bank feeds or Open Banking.
- Bank-statement CSV import and reconciliation.
- Ticket Tailor API integration or order-level ticket data.
- Full invoice capture, invoice-line extraction or credit notes.
- Supplier management and purchase-order generation.
- Double-entry bookkeeping, ledgers, trial balances or statutory accounts.
- VAT return preparation or submission.
- Automated email or push notifications; in-app notifications are sufficient initially.
- Multi-currency accounting; each event uses one currency.
- Formal two-person authorisation of payments.
- Native mobile applications; the web application must be responsive.

These are exclusions from the initial interface, not reasons to distort the core schema. Requests, revisions, components and payments must remain separate so future modules can be added cleanly.

## 4. Terminology

### Organisation

The enduring legal or committee entity that runs one or more events, for example **Downing May Ball Association Ltd**.

### Event

One occurrence of a ball, for example **Downing May Ball 2027**. Events may be annual, biennial or irregular; recurrence is represented by multiple events within an organisation rather than a fixed recurrence rule.

### Department

A custom event-specific area of responsibility, such as Food, Security or Musical Ents. Departments are copied from a default template, copied from an earlier event or created manually.

### Spending request

The overarching proposal or commitment previously described as an “idea”, for example **Champions tribute act** or **Perimeter fencing**.

### Request revision

An immutable version of the financial and descriptive content submitted for approval. A changed approved request creates a new revision; it does not overwrite the approved record.

### Request component

An expected purchase, instalment or payment beneath a request, such as a deposit, final balance or travel expenses.

### Payment

A record that money has left the event's bank account. Payments may be allocated across one or more request components or requests.

### Completed

A financial meaning: the request has been fully paid from the ball's bank account. Completion is derived from payment allocations rather than selected independently.

## 5. Organisational hierarchy

The system hierarchy is:

```text
Organisation
├── Organisation membership
├── Event 2025 (completed)
│   ├── Event membership and roles
│   ├── Departments and department membership
│   ├── Budget versions and transfers
│   ├── Revenue
│   ├── Spending requests and revisions
│   └── Payments
└── Event 2027 (active)
    └── same event-owned structure
```

Every event-owned financial record must contain `event_id`, even when the event could be inferred through another relationship. This supports simple RLS policies, reporting, exports and cross-event isolation. The database must verify that related records carry the same `event_id`.

## 6. Event lifecycle

An event has one of the following statuses:

1. **Setup:** president and treasurer configure departments, members, budget and ticket types.
2. **Planning:** committee members can create and submit requests; normal budgeting is active.
3. **Live:** the event is approaching or taking place; the same financial functions remain available.
4. **Reconciliation:** new ordinary requests are discouraged or disabled, but the treasurer can record final payments and resolve outstanding items.
5. **Completed:** event data becomes read-only and is shown in historical views.
6. **Archived:** still readable to eligible users but hidden from default navigation.

Only the president may change the general event lifecycle. Changing an event to completed requires a confirmation screen showing unpaid approved requests and unresolved pending requests. The application may permit completion with warnings, but the user must explicitly acknowledge them.

Reopening a completed event is an exceptional president action and must require confirmation, a reason and an activity-log entry. Financial powers after reopening still depend on the treasurer role.

## 7. Users, membership and roles

### 7.1 Authentication

Users authenticate through Supabase Auth. MVP 1 should support email magic link or email and password. A verified email is required before accepting an invitation. A profile record is created for every authenticated user.

Authentication proves identity; membership and roles determine access. No global `is_admin` or `is_treasurer` field may grant event powers.

### 7.2 Membership levels

- **Organisation member:** links a user to the enduring organisation and supports historical access.
- **Event member:** grants access to an active event and holds event-specific status.
- **Department member:** links an event member to zero or more departments.
- **Event role:** links an event member to one or more roles.

A user can belong to multiple organisations, multiple events and multiple departments. A user can hold both president and treasurer roles.

### 7.3 Roles

#### President

The president can:

- Create and configure the organisation and event.
- Invite, remove and deactivate event members.
- Assign or remove event roles.
- Create, rename, reorder and deactivate departments.
- Assign people to departments.
- Change event lifecycle status and archive an event.
- View all non-draft committee information and, where explicitly permitted below, operational warnings.

The president cannot change budgets, transfer contingency, approve requests, or record payments unless also assigned the treasurer role.

#### Treasurer

The treasurer can:

- View all event data, including private drafts.
- Create and activate budget versions.
- Set department budgets and event contingency.
- Transfer contingency to departments and, later, support controlled department transfers.
- Manage revenue forecasts and actual revenue snapshots.
- Review, approve, reject or request changes to submitted requests.
- Approve modifications to previously approved requests.
- Record, edit or reverse payment records.
- See financial warnings and audit history.

Only a treasurer can exercise these financial powers.

#### Committee member

A committee member can:

- View the whole active event budget, submitted requests, approved requests, supporting information and payments.
- View previous completed events for the same organisation.
- Create their own spending requests.
- Edit their own draft or changes-requested revision.
- Submit their own request for approval.
- Respond to requested changes by creating or updating the pending revision.

A committee member cannot edit another person's request, approve requests, change budgets, transfer contingency or record payments.

#### Read-only or alumni member

A read-only member can view authorised event data but cannot create or modify records. It is useful for advisers, auditors or former committee members where explicit continued access is desired.

### 7.4 Membership status

Event membership has `invited`, `active`, `suspended`, `left` or `removed` status. Only active members receive normal current-event access. Removing a member never deletes their authored records. Their profile name remains attached to requests and audit events.

## 8. Historical access

An active event member automatically receives read-only access to completed and archived events belonging to the same organisation. This access is derived from current active membership plus organisation identity; duplicate event membership rows are not required.

Historical access:

- Never crosses organisation boundaries.
- Does not expose private drafts from historical events to ordinary users.
- Does expose submitted, approved, rejected where configured, paid requests, revenue, budgets and payment history.
- Is read-only even if the user is treasurer of the current event.
- Ends when the user's current organisation/event membership is removed, unless they retain explicit read-only organisation membership.

## 9. Department model

### 9.1 Default departments

The setup wizard offers the following editable template:

- Aesthetics
- Drinks
- Food
- Graphics
- Insurance
- Launch
- Lawyers
- Logistics
- Musical Ents
- Non-musical Ents
- Personnel
- Production
- Security
- Ticketing
- Web
- Welfare

These values are seed data, not application constants.

### 9.2 Department configuration

Each department has a name, short code, colour, display order, active status and optional description. Codes must be unique within an event. Departments may be renamed; after financial records exist, their code is immutable by default.

Departments with linked financial records cannot be deleted. They can be deactivated, which removes them from new-entry controls while preserving history.

### 9.3 Multiple memberships and split requests

A user can belong to multiple departments. A spending request can be allocated to multiple departments, although it normally has one primary department for ownership, navigation and code generation.

The request code does not determine its accounting allocation. Each revision holds explicit department allocation amounts which must reconcile with the revision total before submission.

## 10. Human-readable reference codes

Every event has a short code, such as `DMB`. Every department has a short code, such as `ME`. A request receives an immutable human reference:

```text
DMB_ME_1
```

A request component receives:

```text
DMB_ME_1.1
DMB_ME_1.2
```

Rules:

- UUIDs are the database primary keys; human codes are references only.
- Codes are unique within an event.
- A request code is assigned when the first draft is created or first saved.
- The sequence is generated atomically in PostgreSQL or a trusted server transaction.
- The browser must never calculate `maximum existing number + 1`.
- The primary department determines the code prefix.
- Changing allocations does not change the request code.
- Existing codes remain stable if a department is renamed.
- Payment and future invoice records use separate sequences, for example `PAY-2027-0031` and `INV-2027-0042`.

## 11. Budget model

### 11.1 Treasurer control

Only the treasurer can create, edit, activate or supersede a budget. The president may view it but has no financial write access unless also treasurer.

### 11.2 Budget versions

The database supports multiple versions from launch, even if the first interface emphasises the active version:

- Original budget
- January reforecast
- Post-ticket-launch reforecast
- Final forecast
- Final out-turn

A version has a sequence number, name, status (`draft`, `active`, `superseded`, `final`), effective date, notes, creator and timestamps. Only one active version may exist per event.

Activating a version is an explicit treasurer action. The previous active version becomes superseded. Historical versions are immutable; corrections require a new version.

### 11.3 Department allocations and contingency

Each budget version contains:

- Initial department allocations.
- Initial unallocated event contingency.
- Transfers applied during that version.

For each department:

```text
Current department budget
= original allocation
+ transfers received
- transfers released
```

For event contingency:

```text
Current unallocated contingency
= original contingency
+ transfers returned to contingency
- transfers allocated from contingency
```

MVP 1 must support contingency-to-department transfers. The schema may also permit department-to-department or department-to-contingency transfers, but the initial interface should expose them only if the product owner enables them.

Every transfer records source, destination, amount, reason, date, treasurer and creation timestamp. Transfers are never represented by overwriting original allocations. A reversal creates a compensating transfer rather than deleting the original record.

### 11.4 Budget validation

- All amounts must be non-negative except explicit reversing transactions.
- A transfer cannot exceed current unallocated contingency unless the treasurer confirms an authorised negative contingency policy; MVP default is to block it.
- Department allocations plus contingency form the total expenditure budget.
- The active budget may differ from forecast revenue; the application warns about a deficit but does not require equality.

## 12. Monetary and VAT rules

### 12.1 Storage

All money is stored in the event's currency using integer minor units (pence) or PostgreSQL `numeric(14,2)`. JavaScript floating-point numbers must not be used for authoritative calculations. Server and database calculations are canonical.

Each financial amount supports:

- Net amount.
- VAT amount.
- Gross amount.
- VAT rate where known.
- VAT treatment.
- Expected VAT recoverability.

Supported VAT treatments are `standard`, `reduced`, `zero_rated`, `exempt`, `outside_scope` and `unknown`.

### 12.2 Entry behaviour

The user may enter any two of net, VAT and gross, after which the interface calculates the third. If a VAT rate is selected, the interface may calculate values from one amount. The user may override a calculated value where rounding or supplier documentation requires it; the override must be recorded.

For normal records:

```text
net + VAT = gross
```

The database allows a maximum one-penny rounding difference only where explicitly supported. Negative money is prohibited on ordinary requests and payments; reversals are separate records.

### 12.3 Reporting views

Budgetary reporting primarily uses net cost where VAT is recoverable. Cash reporting uses gross cash received and paid. The interface must label net and gross figures clearly and never show an ambiguous “total spending” without a basis.

## 13. Revenue model

### 13.1 Ticket types

The treasurer can create, edit, reorder, activate and deactivate ticket types. Each ticket type contains:

- Name and description.
- Ticket price charged by the ball, excluding checkout booking fees.
- Net, VAT and gross price.
- VAT treatment and rate.
- Maximum allocation.
- Forecast sales quantity.
- Complimentary allocation.
- Display order and active status.

Derived values include maximum gross revenue, forecast gross revenue, forecast net revenue and unsold forecast capacity.

Ticket Tailor booking fees are assumed to be charged separately to the customer and are not deducted from the ball's revenue. This remains configurable for future organisations.

### 13.2 Actual ticket-sales snapshots

Actual ticket revenue is stored as cumulative snapshots rather than one overwritten value. A snapshot records:

- Capture date and time.
- Gross sales to date.
- Optional net and VAT totals.
- Optional tickets sold to date.
- Optional refunds to date.
- Optional booking fees.
- Source, initially `manual_ticket_tailor` or `manual_other`.
- User who entered it and notes.

The latest valid snapshot drives current actual-revenue cards. Earlier snapshots remain visible as a history and later support sales trajectory charts.

An optional child table can store cumulative quantities and revenue by ticket type. MVP 1 may accept a single event-level total, but the schema must support ticket-type breakdowns.

Corrections are made by adding a new snapshot. A snapshot may be marked void by the treasurer with a reason; it is not hard-deleted.

### 13.3 Other revenue

Other revenue categories include sponsorship, college contribution, donations, merchandise, interest and other income. Each item records:

- Title and category.
- Owner.
- Forecast net, VAT and gross amounts.
- Actual received net, VAT and gross amounts.
- Expected and received dates.
- Status (`forecast`, `confirmed`, `part_received`, `received`, `cancelled`).
- Notes.

Only the treasurer can change authoritative actual-received values. The system may later add multiple receipts beneath an item without changing the forecast entity.

## 14. Spending request model

### 14.1 Creation and ownership

Any active committee member can create a request. The creator becomes its owner and is the only user who can edit its draft content. Ownership does not automatically change when department membership changes. MVP 1 does not allow collaborative editing or ownership transfer; a later controlled transfer can be added without changing the schema.

A request contains stable identity and workflow fields. Financial and descriptive content submitted for approval is held in revisions.

### 14.2 Request fields

Stable request fields include:

- UUID and event ID.
- Human-readable code.
- Creator/owner.
- Primary department.
- Current approval status.
- Current draft revision.
- Current approved revision.
- Created, submitted, approved and closed timestamps where applicable.
- Cancellation metadata.

A revision includes:

- Revision number.
- Title.
- Description and business justification.
- Supplier name if known; full supplier entities are deferred.
- Expected commitment or payment date.
- Net, VAT and gross forecast.
- VAT treatment and recoverability.
- Department allocations.
- Components or instalments.
- Revision notes and change summary.
- Creator and timestamps.
- Lock/approval metadata.

### 14.3 Department allocations

Each revision has one or more fixed-value department allocations. Every allocation contains net, VAT and gross amounts. Before submission:

```text
sum(allocation net) = revision net
sum(allocation VAT) = revision VAT
sum(allocation gross) = revision gross
```

Percentages may be shown as a convenience but fixed amounts are authoritative.

### 14.4 Components and instalments

A revision may contain components such as deposit, final balance, travel expenses or several purchases. Each component has an immutable sequence within its request and a human code such as `DMB_ME_1.2`.

Component totals must reconcile with the revision total if components are used. A simple request can have one automatically generated component equal to its total, so payment allocation remains consistent.

Components include description, expected date, net/VAT/gross, VAT details and optional supplier name. Payment state is derived from allocations.

## 15. Approval workflow

### 15.1 Approval status

The canonical approval states are:

- `draft`
- `submitted`
- `changes_requested`
- `approved`
- `variation_pending`
- `rejected`
- `cancelled`

Payment status is not included in this list.

### 15.2 Initial request transitions

```text
Draft → Submitted
Submitted → Approved
Submitted → Changes requested
Submitted → Rejected
Changes requested → Submitted
Draft → Cancelled
```

The creator can save a draft, submit it or cancel it. Submission locks the submitted revision. Only the treasurer can approve, reject or request changes.

Every treasurer decision records actor, timestamp and an optional or required comment. A reason is required for rejection and changes requested.

### 15.3 Approved-request variations

An approved revision is immutable. When the creator proposes a material change:

1. The system copies the approved revision into a new editable revision.
2. The creator changes the new revision and supplies a change summary.
3. Submission sets the request to `variation_pending`.
4. The treasurer sees old and new values side by side, including departmental and event impact.
5. Approval makes the new revision current and preserves the prior approval.
6. Changes requested returns the pending revision to the creator.
7. Rejection leaves the prior approved revision authoritative.

Until a variation is approved, dashboards continue to treat the previous approved revision as formal approved spending and show the variation separately in the potential position.

### 15.4 Cancellation

A draft can be cancelled by its creator. An approved request can only be cancelled through a treasurer-authorised action with a reason. Paid amounts are never erased by cancellation. A request with payments cannot be treated as if it never existed.

## 16. Draft privacy and record visibility

| Record/state | Creator | Treasurer | Other active committee | Historical viewer |
|---|---:|---:|---:|---:|
| Draft request | View/edit | View | No access | No access |
| Changes-requested draft | View/edit | View | View submitted history only | No access |
| Submitted request | View | View/decide | View | View after completion |
| Approved request | View | View/manage finance | View | View |
| Variation draft | View/edit | View | View prior approved revision only | No access |
| Variation submitted | View | View/decide | View | View after completion |
| Rejected/cancelled request | View | View | Hidden by default; policy may expose summary | View only if included in historical policy |
| Payment | View | View/manage | View | View |

Draft privacy must be enforced with RLS. Hiding a route or button is insufficient.

## 17. Payment model

### 17.1 Purpose

MVP 1 records payments manually because “completed” means money has left the ball's bank account. Full reconciliation is deferred, but payment records are essential.

### 17.2 Payment fields

A payment contains:

- Event ID and immutable UUID.
- Human payment reference.
- Payment date.
- Gross amount paid.
- Optional net and VAT amount for reporting.
- Bank reference.
- Payment method, such as bank transfer, card or cash.
- Payee/supplier text.
- Entered by and timestamps.
- Note.
- Status (`recorded`, `reversed`).
- Optional reversal link and reason.

Only the treasurer can create, amend or reverse a payment.

### 17.3 Payment allocations

A payment may cover multiple request components, and a component may be paid by multiple payments. Therefore payments and components have a many-to-many allocation table.

Allocation rules:

- Allocation gross amounts must total the payment gross amount before the payment is finalised.
- An allocation must link to the same event as the payment.
- The interface warns if allocations exceed the latest approved payable gross value.
- Overpayment may be permitted only with an explicit treasurer explanation.
- Reversing a payment reverses its allocations for derived calculations but preserves the record.

Where no components were manually entered, the request's default component receives the allocation.

### 17.4 Derived payment status

For each request:

```text
paid gross = sum(non-reversed payment allocations)
payable gross = current approved revision gross
```

Derived status:

- `not_applicable`: no approved revision.
- `unpaid`: payable amount exists and paid gross is zero.
- `partially_paid`: paid gross is greater than zero and below payable gross.
- `paid`: paid gross equals payable gross within one penny.
- `overpaid`: paid gross exceeds payable gross; shown as a warning state.

The user-facing label **Completed** corresponds to `paid`. It is not manually selectable.

## 18. Dashboard and calculations

### 18.1 Dashboard principles

The dashboard must distinguish forecasts, approvals and cash. Every card identifies whether it is net or gross and the “as at” time where appropriate. Draft totals shown to a treasurer must not leak to ordinary committee members.

### 18.2 Revenue cards

- Forecast ticket revenue, net and gross.
- Maximum possible ticket revenue.
- Latest actual cumulative ticket revenue, gross.
- Forecast other revenue.
- Other revenue received.
- Forecast-versus-actual variance.
- Timestamp of the latest sales snapshot.

### 18.3 Spending cards

- Total active department budget.
- Unallocated contingency.
- Submitted spending awaiting approval.
- Approved net spending.
- Gross amount expected to be paid.
- Gross amount paid.
- Approved but unpaid amount.
- Number and value of pending variations.

### 18.4 Department table

For each department display:

- Original allocation.
- Net transfers.
- Current budget.
- Submitted requests.
- Approved spending.
- Paid gross, clearly labelled.
- Remaining approved budget.
- Potential remaining budget.
- Warning state.

Calculations:

```text
approved department spending
= sum(current approved revision allocations to department)
```

```text
remaining approved budget
= current department budget - approved department spending
```

```text
potential remaining budget
= current department budget
- approved department spending
- submitted initial requests
- positive value of pending variations over prior approvals
```

Drafts are excluded from committee-wide totals. The treasurer may have a private “including drafts” insight, clearly labelled.

### 18.5 Event position

```text
formal forecast surplus/(deficit)
= forecast net revenue
- approved net spending
- unallocated contingency
```

```text
potential forecast surplus/(deficit)
= forecast net revenue
- approved net spending
- submitted initial requests
- net increase represented by submitted variations
- unallocated contingency
```

```text
current recorded cash movement
= actual gross cash received
- gross payments recorded
```

Recorded cash movement is not labelled as bank balance. A future bank module will calculate opening balance plus all bank inflows and outflows.

### 18.6 Warnings

Warnings include:

- Department approved spending exceeds current budget.
- Department potential spending exceeds current budget.
- Event formal or potential position is a deficit.
- Approved request is overdue for expected payment.
- Payment allocation exceeds approved amount.
- Latest actual revenue snapshot is stale.
- Event completion attempted with unpaid or pending items.

Warnings inform; they do not silently change records.

## 19. Application pages and interactions

### 19.1 Login and landing page

The public landing page explains the product's purpose, core workflow and privacy model. Users can sign in, accept an invitation or request assistance. No event financial data is public.

After login, users see organisations and events they can access, separated into active and historical events.

### 19.2 Event setup wizard

The president completes:

1. Organisation name and legal display name.
2. Event name, year/date, short code, currency and VAT settings.
3. Department choice: standard template, copy previous event or start blank.
4. Department names and codes.
5. Treasurer assignment.
6. Committee invitations and department membership.

The treasurer then completes:

7. Initial budget version, department allocations and contingency.
8. Ticket types and forecast quantities.
9. Other forecast revenue.

The event remains in setup until required fields are complete. The system shows a checklist rather than blocking all navigation.

### 19.3 Dashboard

The default event page contains headline cards, formal and potential forecast positions, department budget table, approval queue summary, payment summary, warnings and recent activity. Role-specific quick actions are shown without changing underlying permission rules.

### 19.4 Revenue forecast page

The treasurer manages ticket types, prices, capacity and forecast sales. The page shows per-type and total maximum/forecast net, VAT and gross revenue. It also manages other revenue forecasts.

Committee members can view but not edit this page.

### 19.5 Actual revenue page

The treasurer enters a new cumulative Ticket Tailor snapshot and records other revenue received. The page shows the latest value, capture time, history and variance from forecast. Corrections are added as later snapshots or voided with reasons.

### 19.6 Spending request list

Available filters:

- Mine or all.
- Department.
- Owner.
- Approval status.
- Payment status.
- Over-budget warning.
- Awaiting approval.
- Search by code, title or supplier text.

Rows show code, title, primary department, owner, approved/submitted amount, approval status, payment status and updated time. Draft rows appear only to the creator and treasurer.

### 19.7 New/edit request page

The request form includes title, justification, supplier, primary department, department splits, amounts, VAT treatment, expected date and components. It continually shows the department's current and potential remaining budget.

Actions are save draft, submit and cancel draft. Submission is blocked until required fields and reconciliations pass. The user sees a final review summary before submission.

### 19.8 Request detail page

The page displays stable request identity, current status, current approved revision, any pending revision, components, department allocations, review history, payment history and activity. Ordinary committee members never receive draft-only fields they are not authorised to see.

### 19.9 Treasurer approval queue

The queue lists submitted initial requests and variations. The review screen includes:

- Request details and supporting explanation.
- Creator and departments.
- Net/VAT/gross totals.
- Effect on each department budget.
- Effect on formal and potential event position.
- Old-versus-new comparison for variations.
- Approve, request changes or reject controls.
- Mandatory reason where changes or rejection is selected.

Decisions require a confirmation step and are transactionally recorded.

### 19.10 Payments page

The treasurer can create a payment, search approved unpaid components, allocate the payment, enter the bank reference and finalise. The page lists recent payments and supports a reversal workflow.

Committee members can view payment records but cannot modify them.

### 19.11 Department pages

Each department page replaces a spreadsheet tab and contains current budget, transfers, approved spending, pending spending, paid amounts, remaining positions, members and request list. Split requests appear in every affected department with only that department's allocation used in departmental totals.

### 19.12 Committee and settings

The president manages invitations, membership, roles, departments and event lifecycle. The treasurer manages financial settings, budgets, contingency and revenue configuration. Controls are separated by permission and labelled clearly.

### 19.13 Historical event views

Completed events use the same page structure in read-only mode. A persistent banner identifies the event as completed and historical. No editing controls are rendered, and RLS rejects writes even if a client attempts one.

## 20. Invitations and onboarding

The president creates an invitation containing organisation, event, intended roles, intended departments, invited email, expiry and single-use token. The invited user signs in or creates an account and accepts.

Rules:

- Tokens expire and are stored hashed where practicable.
- An invitation can be revoked before acceptance.
- Acceptance must match the invited email unless the president explicitly reissues it.
- Duplicate active membership is prevented.
- Role assignment is recorded in the activity log.
- The first president may be established through the secure event-creation transaction.

## 21. Comments, review records and notifications

MVP 1 requires structured review history. A review record is created for every approval decision. Optional request comments may support discussion, but they must not replace formal decision records.

In-app notifications are created for:

- Invitation issued or accepted.
- Request submitted.
- Changes requested.
- Request approved or rejected.
- Variation submitted or decided.
- Payment recorded against the user's request.
- Member role changed.

Notifications contain event-scoped links and must respect current access if membership later changes. Read/unread state is per user. Email delivery can be added later.

## 22. Activity log and auditability

The activity log is append-only and records material actions including:

- Event creation and lifecycle changes.
- Membership, role and department changes.
- Budget version creation and activation.
- Budget transfers and reversals.
- Revenue snapshot creation or voiding.
- Request creation, submission and cancellation.
- Approval decisions and variations.
- Payment creation and reversal.
- Exceptional reopening of a completed event.

Each entry contains actor, event, action type, entity type/ID, timestamp, summary and structured before/after metadata where appropriate. Sensitive draft information is not included in log summaries visible to ordinary committee members.

The activity log does not substitute for immutable revision and payment records. It explains that a change occurred; the authoritative domain table stores the financial fact.

## 23. Data model specification

### 23.1 Identity and tenancy

#### `profiles`

One-to-one with `auth.users`; display name, preferred name, timestamps. It contains no global event role.

#### `organisations`

Name, legal name, slug, creator, status and timestamps.

#### `organisation_members`

Organisation, user, membership status, joined/left timestamps. Supports derived historical access.

#### `events`

Organisation, name, year, event date, planning start, short code, currency, VAT settings, lifecycle status, creator, completed/archived timestamps.

#### `event_members`

Event, user, membership status, inviter, joined/left timestamps. Unique per event/user.

#### `event_member_roles`

Event member and role enum or role table. Multiple roles per member; unique pairing.

#### `departments`

Event, name, code, colour, order, description, active state. Unique event/code.

#### `department_members`

Event, department, event member and timestamps. Unique department/member; same-event validation required.

### 23.2 Budgeting

#### `budget_versions`

Event, version number, name, status, effective date, original contingency, notes, creator and timestamps. Partial unique index permits only one active version per event.

#### `department_budget_allocations`

Event, budget version, department, original net budget and optional gross cash-planning value. Unique version/department.

#### `budget_transfers`

Event, budget version, optional source department, optional destination department, amount, reason, creator, timestamp, optional reversal link. A null endpoint represents contingency. Source and destination cannot both be null or equal.

### 23.3 Revenue

#### `ticket_types`

Event, name, description, monetary fields, VAT data, maximum quantity, forecast quantity, complimentary quantity, order and active state.

#### `ticket_sales_snapshots`

Event, capture time, cumulative sales values, refund/fee fields, source, creator, void state/reason and timestamps.

#### `ticket_type_sales_snapshots`

Event, parent snapshot, ticket type, cumulative quantity and monetary values. Unique snapshot/ticket type.

#### `other_revenue_items`

Event, title, category, owner, forecast and actual monetary fields, dates, status, notes and timestamps.

### 23.4 Spending and approvals

#### `spending_requests`

Event, code, owner, primary department, approval status, current draft revision ID, current approved revision ID, lifecycle timestamps and cancellation metadata.

#### `spending_request_revisions`

Event, request, revision number, descriptive fields, supplier text, expected date, monetary/VAT fields, change summary, creator, submission/decision lock state and timestamps. Unique request/revision number.

#### `spending_request_department_allocations`

Event, revision, department and monetary allocation fields. Unique revision/department.

#### `request_components`

Event, revision, component sequence/code, description, expected date, monetary/VAT fields and supplier text. Unique revision/sequence and event/code.

#### `request_reviews`

Event, request, revision, reviewer, decision, reason and timestamp. Only treasurer-created decisions are valid.

### 23.5 Payments

#### `payments`

Event, payment code, date, monetary values, bank reference, method, payee, note, status, creator, reversal link/reason and timestamps.

#### `payment_allocations`

Event, payment, request component, allocated monetary values and timestamps. Same-event validation and reconciliation required.

### 23.6 Operations

#### `invitations`

Organisation/event, invited email, token hash, expiry, inviter, status and intended role/department metadata.

#### `notifications`

User, event, type, entity link, message metadata, created/read timestamps.

#### `activity_log`

Event, actor, action, entity type/ID, summary, structured metadata and timestamp. Append-only.

#### `documents` (architecture-ready; UI optional)

Event, uploader, linked entity type/ID, storage path, original name, MIME type, size, category and timestamps. A private Storage bucket is required when uploads are enabled.

## 24. Database invariants and transactional rules

The database, not merely the client, must enforce:

1. Every event-owned row belongs to one event.
2. Related event-owned rows use the same event.
3. Human codes and department codes are unique within an event.
4. Only one active budget version exists per event.
5. Submitted and approved revisions cannot be edited.
6. Approval records identify a treasurer, revision, decision and time.
7. Current approved revision belongs to the same request.
8. Revision allocations reconcile to revision totals.
9. Component totals reconcile where components are used.
10. Payment allocations reconcile to payment totals.
11. Net plus VAT equals gross within defined rounding rules.
12. Completed and archived events reject normal writes.
13. Ordinary financial records are cancelled, voided or reversed rather than hard-deleted.
14. Reference sequence generation is concurrency safe.
15. An approval decision, state change and activity entry commit in one database transaction.
16. A payment and its allocations commit in one transaction.
17. Budget activation and supersession commit in one transaction.

Complex state transitions should be exposed through trusted PostgreSQL functions or server-only application actions rather than arbitrary client updates.

## 25. Row Level Security specification

RLS must be enabled on every table exposed through Supabase APIs. Policies should use small, tested helper functions such as `is_active_event_member(event_id)`, `has_event_role(event_id, role)`, `can_view_historical_event(event_id)` and `is_request_owner(request_id)`.

### Read policy principles

- Current active members can read current-event non-draft records.
- A request owner and treasurer can read its drafts.
- Other members cannot read draft revisions or allocations/components belonging only to a draft.
- Active organisation members can read non-draft records from completed/archived events within that organisation.
- Users receive no access to other organisations unless separately members.
- Notifications are readable only by their recipient.

### Write policy principles

- Presidents manage event configuration and membership only.
- Treasurers manage budgets, revenue, approvals and payments.
- Request owners create and edit their own unlocked drafts.
- Owners cannot update submitted/approved revisions or approval fields.
- No normal financial write is permitted to completed/archived events.
- Activity log inserts occur through trusted transactions; clients cannot update or delete log rows.

RLS tests must use at least: unauthenticated user, member A, member B, treasurer, president-only user, historical viewer, and member of another organisation.

## 26. Security and privacy requirements

- Supabase service-role credentials must never be included in browser code.
- Server-only secrets are stored in deployment environment variables.
- Auth and session handling use the current Supabase SSR cookie pattern.
- All form input is validated on both client and server.
- Authoritative permission checks occur in RLS and transactional database functions.
- Invitation tokens are time limited and not stored in plaintext where avoidable.
- Private documents use a non-public Storage bucket with event-aware policies and signed access.
- Errors shown to users do not expose SQL, secrets or cross-tenant record existence.
- Rate limiting is applied to invitation, authentication and high-risk mutation endpoints where supported.
- Production logs avoid document contents, access tokens and unnecessary personal data.
- Database backups and recovery follow Supabase plan capabilities; the application supports data export for operational resilience.

## 27. Validation and error handling

Forms provide inline errors and preserve unsaved user input. Common validation includes required titles, valid non-negative amounts, allocation reconciliation, maximum/forecast ticket consistency, unique codes and valid dates.

Server errors return stable, user-friendly messages. Concurrency conflicts do not silently overwrite data. If another actor changes a record after it was loaded, the user is asked to refresh and review the new state.

Approval and payment actions show a final summary and disable repeated submission while processing. Database idempotency or unique operation identifiers should prevent duplicate approval/payment records caused by retries.

## 28. Responsive design and accessibility

The application is designed desktop-first for treasurer work but remains usable on mobile for committee submissions and review.

Requirements:

- WCAG 2.2 AA target for contrast, keyboard navigation, focus state and form labelling.
- Status is conveyed by text and icon, not colour alone.
- Tables have accessible headers and collapse into readable cards or horizontal scroll on narrow screens.
- Monetary inputs identify currency and net/gross basis.
- Confirmation dialogs are keyboard accessible and return focus correctly.
- Date and number formatting follow event currency and UK-style defaults while storing canonical values.

## 29. Performance and reliability

- Typical dashboard and list pages should render useful content within two seconds on a normal broadband connection after authentication, excluding cold-start constraints.
- List pages use server-side pagination and filters; the client does not download an entire multi-year ledger.
- Dashboard aggregates are calculated in SQL views/functions or efficient server queries, not by repeatedly downloading raw records.
- Indexes cover event ID, status, owner, department, codes, capture/payment dates and foreign keys.
- Mutations use transactions and return the authoritative resulting record.
- The interface provides clear loading, empty and retry states.

## 30. Exports, retention and deletion

MVP 1 should at minimum permit CSV exports of:

- Department budgets and transfers.
- Revenue forecasts and snapshots.
- Spending requests and current revisions.
- Payment list and allocations.

Exports are event-scoped, permission checked and labelled with generation time and net/gross basis.

Financial records are retained when an event is completed. Ordinary users cannot hard-delete organisations, events, budgets, approved revisions, approvals or payments. Account deletion must preserve legally/operationally necessary event records while anonymising personal profile data where required and permitted.

## 31. Future integration boundaries

The following additions must fit without rewriting the request model:

### Documents and folders

Files will link through a generic document metadata table to requests, revisions, components, invoices or payments. Human reference codes can be used to produce an export folder structure, but storage paths are not the source of financial identity.

### Invoices

Future `invoices` and `invoice_allocations` tables will allow one invoice to span multiple requests/components, including Amazon-style mixed purchases. An invoice will not require a single request foreign key.

### Bank reconciliation

Future bank transactions will be imported and matched to payment records. Payments remain the operational assertion that money left the bank; reconciliation confirms it against the bank feed.

### Ticket Tailor

API or CSV imports will create revenue snapshots or richer ticket-order records. Existing manual snapshots remain valid provenance-labelled records.

### Purchase orders

An approved request can later generate a formal purchase-order document without becoming a different accounting entity.

## 32. Analytics and reporting definitions

All reports use one shared calculation layer. The dashboard, department view and export must not independently reimplement financial formulas.

The reporting layer should provide:

- Active budget and current contingency.
- Revenue forecast by source.
- Latest actual revenue.
- Approved, submitted and paid spending by department.
- Formal and potential event positions.
- Outstanding approved gross amount.
- Variance between approved revision and paid amount.
- Historical event comparisons in a later release.

Each metric has a documented SQL definition, currency basis, VAT basis and treatment of cancelled/reversed records.

## 33. MVP acceptance criteria

MVP 1 is complete when all of the following are demonstrable:

### Setup and membership

- A president can create an organisation and event, configure custom departments and invite committee members.
- Members can accept invitations and hold multiple departments/roles.
- A president-only user cannot use treasurer functions.
- A member of another organisation cannot read or infer event data.

### Budget and contingency

- A treasurer can create and activate a budget with department allocations and contingency.
- The treasurer can transfer contingency to a department with a reason.
- Original allocation, transfers and current allocation remain separately visible.
- No other role can change these records.

### Revenue

- The treasurer can create ticket types and see maximum and forecast revenue.
- The treasurer can add cumulative actual-revenue snapshots without overwriting history.
- Other revenue can be forecast and marked received.
- Committee members can view but not edit authoritative revenue.

### Spending requests

- A member can create, save and edit their private draft.
- Another ordinary member cannot see that draft.
- The treasurer can see it but cannot impersonate the creator's edit rights.
- On submission, the committee can view the request and the creator can no longer edit it.
- The treasurer can approve, reject or request changes.
- An approved revision is immutable.
- A proposed change creates a variation and preserves the prior approval.
- Multi-department allocations reconcile and appear correctly in each department.

### Payments

- The treasurer can record one payment across one or more components.
- Partial payment produces partially paid status.
- Full allocation produces paid/completed status.
- Reversal removes the payment from derived paid totals while preserving audit history.
- Other roles cannot create or reverse payments.

### Dashboard

- Formal and potential positions calculate from the agreed definitions.
- Department remaining figures use only that department's allocations.
- Draft values never leak into committee-wide totals.
- Net and gross values are clearly labelled.

### History and security

- Completing an event makes it read-only.
- An active member of a later event in the same organisation can view the completed event.
- Historical access does not cross organisations.
- RLS integration tests demonstrate all critical permissions directly against Supabase.

### Engineering quality

- Database migrations are repeatable and version controlled.
- Seed data creates a realistic sample May Ball.
- Type checking, linting and automated tests pass.
- No service-role secret is shipped to the client.
- Core workflows have error, empty, loading and mobile states.

## 34. Recommended implementation sequence

1. Establish repository instructions, environment handling and Supabase SSR authentication.
2. Implement organisations, events, memberships, roles and invitations.
3. Implement departments and department membership.
4. Implement RLS helper functions and cross-tenant security tests.
5. Implement budget versions, allocations, contingency and transfers.
6. Implement ticket types, revenue forecasts and cumulative snapshots.
7. Implement spending requests, revisions, allocations and components.
8. Implement approval transactions and review history.
9. Implement payments, allocations and derived payment status.
10. Implement shared reporting functions and dashboard.
11. Implement lifecycle completion, historical access and archive views.
12. Add notifications, activity views and CSV exports.
13. Complete accessibility, performance and security review.

Each stage must include migration, RLS policy, TypeScript types, server action/API, interface, tests and verification before the next stage begins.

## 35. Definition of done for each feature

A feature is not complete merely because the page renders. It is done when:

- Its database migration and constraints exist.
- Appropriate RLS policies and policy tests exist.
- Server-side validation and transaction boundaries are implemented.
- UI permissions match, but do not substitute for, database permissions.
- Loading, empty, error and success states exist.
- The feature works on supported desktop and mobile layouts.
- Relevant activity and notification records are created.
- Shared calculations and exports include the feature correctly.
- Type checking, linting and tests pass.
- The implementation and any assumptions are documented.

## 36. Open operational choices that do not block the schema

The following can be decided during interface prototyping without changing the core architecture:

- Whether rejected requests are visible to the wider committee or only creator and treasurer.
- Whether reconciliation status blocks new requests or only displays a warning.
- Whether department-to-department transfers are exposed in MVP 1.
- Whether ticket snapshot entry requires ticket counts as well as revenue.
- Whether request ownership transfer is introduced for members who step down.
- Whether document uploads are included at the end of MVP 1 or begin MVP 2.
- Exact product name, branding and tone of the friendly “idea” terminology.

Until changed, the conservative defaults are: rejected requests private to creator and treasurer; reconciliation discourages but does not technically block treasurer actions; only contingency-to-department transfers are exposed; ticket counts are optional; ownership transfer is deferred; document architecture is prepared but uploads are deferred.

## 37. Final product principle

The application must always allow a treasurer to answer five separate questions:

1. What income do we expect?
2. What income have we actually recorded so far?
3. What expenditure has the committee proposed?
4. What expenditure have I authorised?
5. What money has actually left the bank?

Those answers must remain distinct in the database, interface and reports. Preserving that separation is the central architectural rule of May Ball Finance.
