---
title: "May Ball Finance"
subtitle: "Concrete Supabase Database Specification — MVP 1"
date: "18 July 2026"
author: "Implementation baseline • Database contract v1.0"
---

**Target:** Supabase PostgreSQL with Supabase Auth, Data API, Row Level Security and private Storage  
**Derived from:** May Ball Finance Full Program Specification — MVP 1, version 1.0  
**Purpose:** Authoritative contract for migrations, generated TypeScript types, server actions, database tests and future schema changes

---

# 1. Design decisions

## 1.1 Database boundaries

Application data lives in `public`. Supabase-managed identities remain in `auth.users`. The application may read the guaranteed `auth.users.id` primary key through foreign keys but must not depend on other internal Auth columns. Private files use Supabase Storage; file metadata and event ownership remain in `public.documents`.

Every event-owned table carries `event_id uuid not null`, including join tables where it is technically derivable. Composite foreign keys verify that both ends belong to the same event. This deliberate duplication makes RLS, reporting and isolation auditable.

## 1.2 Identifiers and timestamps

- Primary keys: `uuid default gen_random_uuid()`.
- Auth user keys: `uuid references auth.users(id)`.
- Timestamps: `timestamptz`, stored in UTC.
- Calendar dates: `date`.
- Creation timestamps: `created_at timestamptz not null default now()`.
- Mutable tables also have `updated_at timestamptz not null default now()`, maintained by a trigger.
- Human references are immutable text and never primary keys.

## 1.3 Money

All authoritative amounts use `bigint` minor units: pounds sterling are stored as pence. Column suffix `_minor` is mandatory. This avoids JavaScript floating-point arithmetic and permits exact constraint checks.

Currency uses `char(3)` ISO 4217 codes. MVP events default to `GBP`. One event has one currency. VAT rates use `numeric(5,2)` percentages, e.g. `20.00`.

For financial triples:

```text
net_minor + vat_minor = gross_minor
```

All three values are stored. This favours auditability and unusual invoices over generated columns. Check constraints enforce exact reconciliation; entry services calculate missing values before insertion.

## 1.4 Deletion strategy

Core financial and governance records use no hard-delete API. They are cancelled, voided, deactivated, superseded or reversed. Foreign keys generally use `on delete restrict`. Cascades are limited to unaccepted invitation metadata and other non-financial child records whose parent can legitimately be removed during setup.

## 1.5 Mutability strategy

Direct Data API writes are allowed only for low-risk records and editable drafts. Significant operations use database functions:

- create organisation/event;
- accept invitation;
- activate a budget;
- transfer contingency;
- submit a request;
- decide a request;
- start and submit a variation;
- record/reverse a payment;
- complete/reopen an event.

These functions lock relevant rows, validate role and state, update related tables and append the activity log within one transaction.

# 2. Extensions and schemas

Required extensions:

```sql
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
```

Use `gen_random_uuid()` from `pgcrypto`. Email fields use `extensions.citext`. Do not expose a custom schema unless a later migration deliberately changes the Supabase Data API configuration.

# 3. Enumerated types

Create PostgreSQL enums in `public`:

| Type | Values |
|---|---|
| `organisation_status` | `active`, `inactive` |
| `event_status` | `setup`, `planning`, `live`, `reconciliation`, `completed`, `archived` |
| `membership_status` | `invited`, `active`, `suspended`, `left`, `removed` |
| `event_role` | `president`, `treasurer`, `committee_member`, `read_only` |
| `budget_version_status` | `draft`, `active`, `superseded`, `final` |
| `vat_treatment` | `standard`, `reduced`, `zero_rated`, `exempt`, `outside_scope`, `unknown` |
| `revenue_item_category` | `sponsorship`, `college_contribution`, `donation`, `merchandise`, `interest`, `other` |
| `revenue_item_status` | `forecast`, `confirmed`, `part_received`, `received`, `cancelled` |
| `snapshot_source` | `manual_ticket_tailor`, `manual_other`, `ticket_tailor_api`, `csv_import` |
| `request_approval_status` | `draft`, `submitted`, `changes_requested`, `approved`, `variation_pending`, `rejected`, `cancelled` |
| `revision_status` | `draft`, `submitted`, `approved`, `changes_requested`, `rejected`, `superseded`, `cancelled` |
| `review_decision` | `approved`, `changes_requested`, `rejected`, `cancelled` |
| `payment_method` | `bank_transfer`, `card`, `cash`, `direct_debit`, `other` |
| `payment_record_status` | `recorded`, `reversed` |
| `invitation_status` | `pending`, `accepted`, `revoked`, `expired` |
| `notification_type` | `invitation`, `request_submitted`, `changes_requested`, `request_approved`, `request_rejected`, `variation_submitted`, `variation_decided`, `payment_recorded`, `role_changed`, `event_status_changed` |
| `document_category` | `quote`, `contract`, `invoice`, `receipt`, `expense_claim_form`, `supporting`, `other` |

Database enums are appropriate because these state values participate in constraints and policy logic. New values must be added through migrations; values must never be renamed casually.

# 4. Common constraint conventions

Use the following named checks consistently:

```sql
check (char_length(trim(name)) between 1 and 160)
check (currency ~ '^[A-Z]{3}$')
check (vat_rate is null or vat_rate between 0 and 100)
check (net_minor >= 0 and vat_minor >= 0 and gross_minor >= 0)
check (net_minor + vat_minor = gross_minor)
```

All human codes are stored uppercase after server/database normalisation and checked with restricted patterns. Event codes: `^[A-Z][A-Z0-9]{1,9}$`. Department codes: `^[A-Z][A-Z0-9]{0,7}$`.

# 5. Identity, organisations and events

## 5.1 `profiles`

One application profile per Auth user.

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, not null | FK `auth.users(id) on delete cascade` |
| `display_name` | `text` | not null | 1–120 trimmed chars |
| `preferred_name` | `text` | null | 1–80 when present |
| `created_at` | `timestamptz` | `now()` | immutable |
| `updated_at` | `timestamptz` | `now()` | trigger-maintained |

Constraints: trimmed non-empty display name. A security-definer Auth trigger inserts a profile from trusted signup metadata, falling back to the email prefix. A failed profile trigger can block signup, so it requires dedicated tests.

Indexes: primary key only.

## 5.2 `organisations`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, UUID default | |
| `name` | `text` | not null | friendly name |
| `legal_name` | `text` | null | legal company/entity name |
| `slug` | `text` | not null | lowercase URL slug |
| `status` | `organisation_status` | `active` | |
| `created_by` | `uuid` | not null | FK `profiles(id)`, restrict |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | |

Constraints: name 1–160; slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`; unique slug.

Indexes: unique `slug`; `(created_by)`.

## 5.3 `organisation_members`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `organisation_id` | `uuid` | not null | FK organisations, restrict |
| `user_id` | `uuid` | not null | FK profiles, restrict |
| `status` | `membership_status` | `active` | organisation-level access state |
| `joined_at` | `timestamptz` | `now()` | |
| `left_at` | `timestamptz` | null | required for left/removed |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | |

Constraints: unique `(organisation_id,user_id)`; `left_at` required for `left`/`removed` and null for `active`; unique `(organisation_id,id)` to support composite FKs if required.

Indexes: `(user_id,status)`, `(organisation_id,status)`.

## 5.4 `events`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `organisation_id` | `uuid` | not null | FK organisations, restrict |
| `name` | `text` | not null | e.g. Downing May Ball 2027 |
| `event_year` | `smallint` | not null | 2000–2200 |
| `event_date` | `date` | null | |
| `planning_start_date` | `date` | null | not after event date |
| `code` | `text` | not null | e.g. DMB |
| `currency` | `char(3)` | `'GBP'` | ISO pattern |
| `is_vat_registered` | `boolean` | `true` | |
| `default_vat_rate` | `numeric(5,2)` | `20.00` | 0–100 |
| `status` | `event_status` | `setup` | |
| `created_by` | `uuid` | not null | FK profiles, restrict |
| `completed_at` | `timestamptz` | null | set for completed/archived |
| `archived_at` | `timestamptz` | null | set only for archived |
| `reopened_at` | `timestamptz` | null | latest exceptional reopen |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | |

Constraints: unique `(organisation_id,event_year,code)`; unique `(id,organisation_id)`; unique `(id,currency)` for same-currency composite references; code pattern; lifecycle timestamp consistency; planning start not after event date.

Indexes: `(organisation_id,status,event_year desc)`, `(created_by)`.

## 5.5 `event_members`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | FK events, restrict |
| `user_id` | `uuid` | not null | FK profiles, restrict |
| `status` | `membership_status` | `active` | |
| `invited_by` | `uuid` | null | FK profiles, set null |
| `joined_at` | `timestamptz` | `now()` | |
| `left_at` | `timestamptz` | null | |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | |

Constraints: unique `(event_id,user_id)`; unique `(event_id,id)`; same status/timestamp rule as organisation membership.

Indexes: `(user_id,status,event_id)`, `(event_id,status)`.

## 5.6 `event_member_roles`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `event_id` | `uuid` | not null | |
| `event_member_id` | `uuid` | not null | composite FK to event_members |
| `role` | `event_role` | not null | |
| `assigned_by` | `uuid` | not null | FK profiles, restrict |
| `created_at` | `timestamptz` | `now()` | |

Primary key `(event_member_id,role)`. Composite FK `(event_id,event_member_id)` references `event_members(event_id,id)` on delete restrict.

Indexes: `(event_id,role,event_member_id)`. This is the critical role-check index.

# 6. Departments and membership

## 6.1 `departments`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | FK events, restrict |
| `name` | `text` | not null | 1–100 chars |
| `code` | `text` | not null | uppercase code |
| `colour` | `text` | null | `#RRGGBB` |
| `description` | `text` | null | max 1000 chars |
| `display_order` | `smallint` | `0` | non-negative |
| `is_active` | `boolean` | `true` | deactivation replaces deletion |
| `created_by` | `uuid` | not null | FK profiles |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | |

Constraints: unique `(event_id,code)`; unique `(event_id,name)` case-insensitively via unique index on `(event_id,lower(name))`; unique `(event_id,id)`; code/colour/order checks.

Indexes: `(event_id,is_active,display_order)`.

## 6.2 `department_members`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `event_id` | `uuid` | not null | |
| `department_id` | `uuid` | not null | composite FK department |
| `event_member_id` | `uuid` | not null | composite FK event member |
| `assigned_by` | `uuid` | not null | FK profiles |
| `created_at` | `timestamptz` | `now()` | |

Primary key `(department_id,event_member_id)`. Same-event composite FKs reference departments and event_members.

Indexes: `(event_member_id)`, `(event_id,department_id)`.

# 7. Budgeting

## 7.1 `budget_versions`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | FK events, restrict |
| `version_number` | `integer` | not null | > 0 |
| `name` | `text` | not null | 1–120 chars |
| `status` | `budget_version_status` | `draft` | |
| `effective_date` | `date` | null | set on activation |
| `original_contingency_minor` | `bigint` | `0` | >= 0 |
| `notes` | `text` | null | max 4000 |
| `created_by` | `uuid` | not null | treasurer profile |
| `activated_by` | `uuid` | null | treasurer profile |
| `activated_at` | `timestamptz` | null | |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | |

Constraints: unique `(event_id,version_number)`; unique `(event_id,id)`; activation fields required for `active`, `superseded`, `final`; non-draft rows immutable except controlled status transition.

Indexes: unique partial index `one_active_budget_per_event on budget_versions(event_id) where status='active'`; `(event_id,status,version_number desc)`.

## 7.2 `department_budget_allocations`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `budget_version_id` | `uuid` | not null | same-event composite FK |
| `department_id` | `uuid` | not null | same-event composite FK |
| `original_net_minor` | `bigint` | not null | >= 0 |
| `original_gross_minor` | `bigint` | null | optional cash-planning value, >= 0 |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | draft only |

Constraints: unique `(budget_version_id,department_id)`; original gross null or non-negative. Allocations are editable only while the version is draft.

Indexes: `(event_id,department_id)`, `(budget_version_id)`.

## 7.3 `budget_transfers`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `budget_version_id` | `uuid` | not null | active version |
| `from_department_id` | `uuid` | null | null means contingency |
| `to_department_id` | `uuid` | null | null means contingency |
| `amount_minor` | `bigint` | not null | > 0 |
| `reason` | `text` | not null | 1–1000 chars |
| `effective_at` | `timestamptz` | `now()` | |
| `created_by` | `uuid` | not null | treasurer |
| `reverses_transfer_id` | `uuid` | null | same event/version |
| `created_at` | `timestamptz` | `now()` | |

Constraints: exactly one or two endpoints, but not both null; endpoints unequal; MVP RPC permits only null source to department destination, plus explicit compensating reversals; unique non-null `reverses_transfer_id`; no updates/deletes.

Indexes: `(budget_version_id,effective_at)`, `(event_id,from_department_id)`, `(event_id,to_department_id)`.

# 8. Revenue

## 8.1 `ticket_types`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | FK events |
| `name` | `text` | not null | |
| `description` | `text` | null | |
| `net_price_minor` | `bigint` | not null | >= 0 |
| `vat_minor` | `bigint` | not null | >= 0 |
| `gross_price_minor` | `bigint` | not null | reconciles |
| `vat_rate` | `numeric(5,2)` | null | |
| `vat_treatment` | `vat_treatment` | `standard` | |
| `maximum_quantity` | `integer` | not null | >= 0 |
| `forecast_quantity` | `integer` | not null | >= 0 and <= maximum |
| `complimentary_quantity` | `integer` | `0` | >= 0 and <= maximum |
| `display_order` | `smallint` | `0` | >= 0 |
| `is_active` | `boolean` | `true` | |
| `created_by` | `uuid` | not null | treasurer |
| timestamps | `timestamptz` | | created/updated |

Constraints: unique lower-case name per event; monetary triple; `forecast_quantity + complimentary_quantity <= maximum_quantity` unless a future explicit over-allocation field is added.

Indexes: `(event_id,is_active,display_order)`.

## 8.2 `ticket_sales_snapshots`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `captured_at` | `timestamptz` | not null | business timestamp |
| `tickets_sold_to_date` | `integer` | null | >= 0 |
| `net_sales_minor` | `bigint` | null | all-or-none with VAT/gross |
| `vat_minor` | `bigint` | null | |
| `gross_sales_minor` | `bigint` | not null | >= 0 |
| `refunds_to_date_minor` | `bigint` | `0` | >= 0 |
| `booking_fees_to_date_minor` | `bigint` | `0` | >= 0 |
| `source` | `snapshot_source` | not null | |
| `notes` | `text` | null | |
| `entered_by` | `uuid` | not null | treasurer |
| `is_void` | `boolean` | `false` | |
| `void_reason` | `text` | null | required when void |
| `voided_by` | `uuid` | null | |
| `voided_at` | `timestamptz` | null | |
| `created_at` | `timestamptz` | `now()` | |

Constraints: VAT triple either entirely present and reconciled or only gross present; void fields consistent; snapshot rows otherwise immutable.

Indexes: partial latest index `(event_id,captured_at desc,created_at desc) where not is_void`; `(event_id,is_void)`.

## 8.3 `ticket_type_sales_snapshots`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `snapshot_id` | `uuid` | not null | same-event parent |
| `ticket_type_id` | `uuid` | not null | same-event type |
| `quantity_to_date` | `integer` | not null | >= 0 |
| `gross_sales_minor` | `bigint` | not null | >= 0 |
| `created_at` | `timestamptz` | `now()` | |

Constraints: unique `(snapshot_id,ticket_type_id)`; child sums may be less than parent when breakdown incomplete, but if `breakdown_is_complete` is later added then exact reconciliation is required.

Indexes: `(event_id,ticket_type_id,snapshot_id)`.

## 8.4 `other_revenue_items`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `title` | `text` | not null | |
| `category` | `revenue_item_category` | not null | |
| `owner_user_id` | `uuid` | null | profile |
| forecast net/VAT/gross | `bigint` | all not null | reconciles, non-negative |
| actual net/VAT/gross | `bigint` | all not null, `0` | reconciles, non-negative |
| `vat_rate` | `numeric(5,2)` | null | |
| `vat_treatment` | `vat_treatment` | not null | |
| `expected_date` | `date` | null | |
| `received_date` | `date` | null | |
| `status` | `revenue_item_status` | `forecast` | |
| `notes` | `text` | null | |
| `created_by` | `uuid` | not null | treasurer |
| timestamps | `timestamptz` | | |

Constraints: status/date/actual consistency; cancelled remains in history. MVP allows one cumulative actual triple; later receipts become child rows without changing forecast fields.

Indexes: `(event_id,status,expected_date)`, `(event_id,category)`.

# 9. Spending requests and approvals

## 9.1 `spending_requests`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `code` | `text` | not null | immutable, e.g. DMB_ME_1 |
| `owner_user_id` | `uuid` | not null | creator/editor |
| `request_kind` | `spending_request_kind` | `supplier_purchase` | supplier purchase or member reimbursement |
| `expense_date` | `date` | null | required for `member_reimbursement` |
| `primary_department_id` | `uuid` | not null | same event |
| `approval_status` | `request_approval_status` | `draft` | aggregate workflow state |
| `current_draft_revision_id` | `uuid` | null | same request/event |
| `current_approved_revision_id` | `uuid` | null | same request/event |
| `submitted_at` | `timestamptz` | null | latest submission |
| `approved_at` | `timestamptz` | null | current approval |
| `cancelled_at` | `timestamptz` | null | |
| `cancelled_by` | `uuid` | null | |
| `cancellation_reason` | `text` | null | |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | |

Constraints: unique `(event_id,code)`; unique `(event_id,id)`; a `member_reimbursement` must have an expense date; revision pointers use deferrable composite foreign keys added after revision table creation; state/pointer/timestamp consistency; owner and primary department fixed after first submission unless a future dedicated RPC is introduced. Reimbursement claimant identity is the existing `owner_user_id`; no bank details are stored.

Indexes: `(event_id,approval_status,updated_at desc)`, `(event_id,owner_user_id,approval_status)`, `(event_id,primary_department_id,approval_status)`, `(current_draft_revision_id)`, `(current_approved_revision_id)`.

## 9.2 `spending_request_revisions`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `request_id` | `uuid` | not null | same-event request |
| `revision_number` | `integer` | not null | > 0 |
| `status` | `revision_status` | `draft` | |
| `title` | `text` | not null | 1–200 chars |
| `description` | `text` | null | max 10000 |
| `business_justification` | `text` | null | max 10000 |
| `supplier_name` | `text` | null | max 200 |
| `expected_payment_date` | `date` | null | |
| `net_minor` | `bigint` | not null | >= 0 |
| `vat_minor` | `bigint` | not null | >= 0 |
| `gross_minor` | `bigint` | not null | reconciles |
| `vat_rate` | `numeric(5,2)` | null | |
| `vat_treatment` | `vat_treatment` | not null | |
| `vat_recoverable` | `boolean` | null | null when unknown |
| `calculation_overridden` | `boolean` | `false` | user override marker |
| `calculation_override_reason` | `text` | null | required when overridden |
| `change_summary` | `text` | null | required for revision > 1 submission |
| `created_by` | `uuid` | not null | must equal owner for normal drafts |
| `submitted_at` | `timestamptz` | null | |
| `decided_at` | `timestamptz` | null | |
| timestamps | `timestamptz` | | |

Constraints: unique `(request_id,revision_number)`; unique `(event_id,id)` and `(event_id,request_id,id)`; monetary triple; override consistency; submitted/decision timestamps consistent with status. Submitted and terminal revisions are immutable.

Indexes: `(event_id,request_id,revision_number desc)`, `(event_id,status,submitted_at)`, `(created_by,status)`.

## 9.3 `spending_request_department_allocations`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `revision_id` | `uuid` | not null | same event |
| `department_id` | `uuid` | not null | same event |
| `net_minor` | `bigint` | not null | >= 0 |
| `vat_minor` | `bigint` | not null | >= 0 |
| `gross_minor` | `bigint` | not null | reconciles |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | draft only |

Constraints: unique `(revision_id,department_id)`; monetary triple. A deferred constraint trigger verifies allocation sums equal revision totals at submission/transaction completion.

Indexes: `(event_id,department_id,revision_id)`, `(revision_id)`.

## 9.4 `request_components`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `revision_id` | `uuid` | not null | same event |
| `sequence_number` | `integer` | not null | > 0 |
| `code` | `text` | not null | immutable request code + decimal |
| `description` | `text` | not null | 1–500 |
| `expected_payment_date` | `date` | null | |
| `supplier_name` | `text` | null | |
| `net_minor` | `bigint` | not null | |
| `vat_minor` | `bigint` | not null | |
| `gross_minor` | `bigint` | not null | reconciles |
| `vat_rate` | `numeric(5,2)` | null | |
| `vat_treatment` | `vat_treatment` | not null | |
| timestamps | `timestamptz` | | |

Constraints: unique `(revision_id,sequence_number)`; unique `(event_id,code)`; unique `(event_id,id)`; component sums equal revision totals. Every revision has at least one component before submission; a default single component is automatically created where necessary.

Indexes: `(event_id,revision_id,sequence_number)`, `(event_id,expected_payment_date)`.

## 9.5 `request_reviews`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `request_id` | `uuid` | not null | |
| `revision_id` | `uuid` | not null | exact decided revision |
| `reviewer_user_id` | `uuid` | not null | treasurer |
| `decision` | `review_decision` | not null | |
| `reason` | `text` | null | required except approval |
| `created_at` | `timestamptz` | `now()` | decision time |

Constraints: same-event/request/revision composite FK; reason required for changes/rejection/cancellation; one decision of each terminal kind per submitted revision, normally unique `(revision_id)` for the final decision. Append-only.

Indexes: `(event_id,request_id,created_at desc)`, `(reviewer_user_id,created_at desc)`.

# 10. Payments

## 10.1 `payments`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `code` | `text` | not null | e.g. PAY-2027-0031 |
| `payment_date` | `date` | not null | |
| `net_minor` | `bigint` | null | optional triple |
| `vat_minor` | `bigint` | null | optional triple |
| `gross_minor` | `bigint` | not null | > 0 |
| `bank_reference` | `text` | null | max 200 |
| `method` | `payment_method` | `bank_transfer` | |
| `payee` | `text` | not null | 1–200 |
| `note` | `text` | null | max 2000 |
| `status` | `payment_record_status` | `recorded` | |
| `entered_by` | `uuid` | not null | treasurer |
| `reverses_payment_id` | `uuid` | null | link for compensating reversal if used |
| `reversed_at` | `timestamptz` | null | set on original |
| `reversed_by` | `uuid` | null | |
| `reversal_reason` | `text` | null | |
| `created_at` | `timestamptz` | `now()` | |

Constraints: unique `(event_id,code)`; unique `(event_id,id)`; optional net/VAT both present and reconcile or both null; reversal fields consistent. Recorded rows immutable except reversal metadata controlled by RPC.

Indexes: `(event_id,payment_date desc,created_at desc)`, `(event_id,status)`, partial unique bank reference where non-null may be considered but not required because references can repeat.

## 10.2 `payment_allocations`

Payment allocation targets a request, not only a revision component. To preserve payment history across later approved variations, it stores both request and the component that was authoritative when allocated.

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `payment_id` | `uuid` | not null | same event |
| `request_id` | `uuid` | not null | same event |
| `request_component_id` | `uuid` | not null | component of an approved revision of request |
| `net_minor` | `bigint` | null | optional triple |
| `vat_minor` | `bigint` | null | optional triple |
| `gross_minor` | `bigint` | not null | > 0 |
| `created_at` | `timestamptz` | `now()` | |

Constraints: unique `(payment_id,request_component_id)`; optional triple consistency; same-event and component/request validation. Deferred trigger requires allocation gross sum equals payment gross before commit.

Indexes: `(event_id,request_id)`, `(request_component_id)`, `(payment_id)`.

Payment status is calculated, not stored on `spending_requests`. A reporting view returns `not_applicable`, `unpaid`, `partially_paid`, `paid` or `overpaid` from the current approved gross and all non-reversed payment allocations for the request.

# 11. Invitations, notifications, activity and files

## 11.1 `invitations`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `organisation_id` | `uuid` | not null | |
| `event_id` | `uuid` | not null | same organisation |
| `email` | `extensions.citext` | not null | normalised |
| `token_hash` | `text` | not null | never store raw token |
| `status` | `invitation_status` | `pending` | |
| `expires_at` | `timestamptz` | not null | future on issue |
| `invited_by` | `uuid` | not null | president |
| `accepted_by` | `uuid` | null | |
| `accepted_at` | `timestamptz` | null | |
| `revoked_at` | `timestamptz` | null | |
| timestamps | `timestamptz` | | |

Indexes: unique `token_hash`; partial unique `(event_id,email) where status='pending'`; `(email,status,expires_at)`.

## 11.2 `invitation_roles` and `invitation_departments`

`invitation_roles(invitation_id uuid, role event_role, primary key(invitation_id,role))` and `invitation_departments(invitation_id uuid, department_id uuid, event_id uuid, primary key(invitation_id,department_id))`. Same-event validation applies. These rows may cascade when an unaccepted invitation is deleted by an administrative retention job; normal UI revokes instead.

## 11.3 `notifications`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null | recipient |
| `event_id` | `uuid` | not null | |
| `type` | `notification_type` | not null | |
| `entity_type` | `text` | null | allowlisted by producer |
| `entity_id` | `uuid` | null | |
| `title` | `text` | not null | |
| `body` | `text` | not null | no private data leakage |
| `read_at` | `timestamptz` | null | recipient editable |
| `created_at` | `timestamptz` | `now()` | |

Indexes: partial `(user_id,created_at desc) where read_at is null`; `(user_id,created_at desc)`.

## 11.4 `activity_log`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `bigint generated always as identity` | PK | ordered append-only identifier |
| `event_id` | `uuid` | not null | |
| `actor_user_id` | `uuid` | null | null for system |
| `action` | `text` | not null | controlled dotted verb, e.g. `request.approved` |
| `entity_type` | `text` | not null | controlled name |
| `entity_id` | `uuid` | null | |
| `summary` | `text` | not null | privacy-safe |
| `metadata` | `jsonb` | `'{}'` | structured before/after IDs and amounts |
| `visibility` | `text` | `'committee'` | `treasurer`, `committee`, `private_owner` |
| `created_at` | `timestamptz` | `now()` | |

Constraints: metadata must be JSON object; allowed visibility check. No client insert/update/delete grant.

Indexes: `(event_id,created_at desc,id desc)`, `(event_id,entity_type,entity_id,created_at desc)`, optional GIN on metadata only if real queries justify it.

## 11.5 `documents`

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `event_id` | `uuid` | not null | |
| `uploaded_by` | `uuid` | not null | |
| `request_id` | `uuid` | null | stable request evidence parent |
| `revision_id` | `uuid` | null | legacy exact draft/submission link |
| `payment_id` | `uuid` | null | optional |
| `category` | `document_category` | not null | |
| `bucket_id` | `text` | `'event-documents'` | private bucket |
| `object_path` | `text` | not null | UUID-based path |
| `original_filename` | `text` | not null | display only |
| `mime_type` | `text` | not null | allowlisted |
| `size_bytes` | `bigint` | not null | > 0, capped by policy |
| `sha256` | `text` | null | integrity/dedup hint |
| `created_at` | `timestamptz` | `now()` | |

Constraints: at least one domain link; same-event validation; unique `(bucket_id,object_path)`; object paths use `event_id/document_id/sanitised-filename` but permission never relies solely on string parsing. New request evidence is linked to the stable request identity, so it survives revision changes; legacy revision/payment links remain supported. Documents linked to a draft request inherit draft privacy.

Indexes: `(event_id,request_id)`, `(event_id,revision_id)`, `(event_id,payment_id)`.

# 12. Reference sequence tables

Use `event_reference_counters` to generate concurrency-safe human codes:

| Column | Type | Notes |
|---|---|---|
| `event_id` | `uuid` | PK/FK |
| `next_payment_number` | `integer` | starts 1 |
| `updated_at` | `timestamptz` | |

Use `department_reference_counters(event_id,department_id,next_request_number,primary key(event_id,department_id))`.

RPC functions increment counters with `insert ... on conflict ... do update ... returning`. Gaps are acceptable after rolled-back or abandoned operations; codes are stable references, not proof of completeness.

# 13. Views and reporting functions

Views use `security_invoker = true` where supported so caller RLS applies. Do not use an owner-bypassing view accidentally.

## 13.1 `v_active_budget_department_positions`

One row per active budget department with original allocation, transfers in/out, current budget, approved net, submitted net, pending variation increase, remaining approved and potential remaining.

## 13.2 `v_request_payment_positions`

One row per request with current approved net/gross, allocated paid gross excluding reversed payments, outstanding gross and derived payment status.

## 13.3 `v_event_financial_position`

One row per event with forecast ticket/other revenue, latest actual ticket revenue, other revenue received, total budget, contingency, approved spending, submitted spending, paid gross, formal surplus and potential surplus.

## 13.4 `v_latest_ticket_sales_snapshot`

Uses `distinct on (event_id)` ordered by `captured_at desc, created_at desc`, excluding void rows.

The application must use these shared definitions rather than reimplementing totals in React.

# 14. Helper functions for RLS

All authorization helpers:

- live in `public`;
- are `stable` SQL functions where possible;
- are `security definer` only when necessary to avoid recursive RLS;
- set `search_path = ''` and fully qualify all objects;
- are owned by a non-login privileged owner;
- are not executable by `anon` unless explicitly required;
- return false for null `auth.uid()`.

Required helpers:

```sql
public.is_active_event_member(p_event_id uuid) returns boolean
public.has_event_role(p_event_id uuid, p_role public.event_role) returns boolean
public.is_event_president(p_event_id uuid) returns boolean
public.is_event_treasurer(p_event_id uuid) returns boolean
public.can_view_historical_event(p_event_id uuid) returns boolean
public.can_view_event(p_event_id uuid) returns boolean
public.is_event_writable(p_event_id uuid) returns boolean
public.is_request_owner(p_request_id uuid) returns boolean
public.can_view_request_revision(p_revision_id uuid) returns boolean
public.can_edit_request_revision(p_revision_id uuid) returns boolean
```

`can_view_historical_event` returns true when the target event is completed/archived and the caller is an active organisation member with an active membership in any current non-historical event of the same organisation, or has explicit active organisation membership under the agreed policy.

Policies call `(select auth.uid())` and stable helpers using scalar subqueries where valid so PostgreSQL can initialise them once per statement. Every helper join column is indexed.

# 15. Transactional domain functions

All mutation RPCs are `security definer`, have fixed empty search paths, qualify every identifier, verify `auth.uid()`, revoke execute from `public` and `anon`, and grant only to `authenticated`. They never accept an actor user ID from the client.

## 15.1 `create_organisation_and_event(...)`

Creates organisation, creator organisation membership, event, creator event membership and president role in one transaction. Normalises codes/slugs, rejects duplicates and appends `event.created` activity. It may optionally assign the creator treasurer role.

## 15.2 `issue_invitation(...)`

President-only. Validates intended departments belong to event, upserts/revokes conflicting pending invitations, stores only token hash and returns the raw token once to trusted server code. Prefer generating the token server-side and passing only its hash if the Data API response path could log values.

## 15.3 `accept_invitation(p_raw_token text)`

Hashes token, locks invitation, checks pending/unexpired status and authenticated email match, creates/activates organisation and event memberships, inserts intended roles/departments, marks accepted and logs activity.

## 15.4 `activate_budget_version(p_budget_version_id uuid)`

Treasurer-only; event writable; locks all event budget versions; verifies draft allocation integrity; changes former active to superseded, sets target active/effective/activation fields and logs before/after IDs.

## 15.5 `transfer_budget(...)`

Treasurer-only; active budget only. MVP permits contingency to a department. Locks budget version and existing transfers, calculates current contingency, rejects insufficient funds, inserts transfer and activity record. `reverse_budget_transfer` inserts a compensating transfer with a unique reversal link.

## 15.6 `create_spending_request(...)`

Active committee member; event writable. Verifies primary department, atomically generates code, creates request, revision 1 and default component or supplied components/allocations. Returns IDs and code.

## 15.7 `submit_spending_request(p_request_id uuid)`

Owner-only; event writable. Locks request/revision, requires draft or changes-requested state, validates allocation/component reconciliation and required fields, marks revision submitted, updates request status (`submitted` or `variation_pending`), clears editable pointer as appropriate, logs and creates treasurer notifications.

## 15.8 `decide_spending_request(p_request_id,p_revision_id,p_decision,p_reason)`

Treasurer-only. Locks request and exact submitted revision. Rejects stale decisions. For approval, marks prior approved revision superseded if this is a variation, marks target approved, updates current approved pointer/status/timestamps and inserts review/activity/notification. For changes requested, returns revision to an owner-editable state without mutating the submitted historical values: preferably clone it into a new draft revision and mark the submitted revision `changes_requested`. For rejection, retains any prior approved revision and restores aggregate request status to `approved` for a rejected variation, otherwise `rejected`.

## 15.9 `start_request_variation(p_request_id uuid)`

Owner-only; approved request; no existing draft/pending variation. Clones current approved revision, allocations and components into next revision number, sets change summary empty/draft pointer, and does not change formal approved spending.

## 15.10 `record_payment(...)`

Treasurer-only; event writable in planning/live/reconciliation. Locks referenced requests/components, ensures components belong to approved revisions, generates payment code, validates allocations equal payment gross, warns or rejects overpayment according to explicit `p_allow_overpayment` plus required reason, inserts payment/allocations/activity and notifies owners.

## 15.11 `reverse_payment(p_payment_id,p_reason)`

Treasurer-only. Locks recorded payment, rejects repeated reversal, sets reversal metadata or creates a compensating record according to implementation convention, preserves allocations, logs action. Reporting excludes reversed payment allocations.

## 15.12 `complete_event(p_event_id,p_acknowledge_warnings boolean)`

President-only. Returns blockers/warnings for submitted requests, pending variations and unpaid approvals. Requires explicit acknowledgement where warnings exist, sets completed timestamp/status and logs. Does not grant president financial mutation rights.

## 15.13 `reopen_event(p_event_id,p_reason)`

President-only exceptional action with non-empty reason. Changes completed/reconciliation state according to product rule, records `reopened_at` and activity. Historical records remain intact.

# 16. Trigger functions

## 16.1 `set_updated_at()`

`before update` on mutable tables; sets `new.updated_at = now()`. It does not run on append-only records.

## 16.2 `handle_new_auth_user()`

`after insert on auth.users`; security definer with empty search path; inserts profile. Test failure behaviour because a trigger error blocks signup.

## 16.3 `prevent_immutable_update()`

Applied to submitted/terminal revisions, active/superseded budgets, reviews, transfers, recorded payments and activity logs as appropriate. It either rejects all changes or permits a narrow allowlist of fields changed only by trusted RPC context. Prefer revoking direct update grants plus explicit triggers for defence in depth.

## 16.4 Reconciliation constraint triggers

Deferrable constraint triggers verify:

- revision department allocations sum to revision totals;
- request components sum to revision totals;
- payment allocations sum to payment totals;
- request revision pointers belong to the same request/event;
- payment component belongs to request and event.

Drafts may temporarily be incomplete inside a transaction. Submission RPC performs immediate explicit checks before state change. The deferred triggers protect direct trusted writes and transaction ordering.

## 16.5 Activity log production

Critical domain RPCs insert their own meaningful log entries. Do not rely exclusively on generic row triggers, which lack business context and can expose draft fields. Optional low-level triggers may add technical audit entries for unexpected privileged changes.

# 17. RLS policy matrix

RLS is enabled and forced on every public application table. Table owners used by migrations must still be treated carefully because owners can bypass RLS. The service role is never exposed to the client.

## 17.1 Profiles

- SELECT: authenticated user may read own profile and profiles of users sharing an accessible event.
- UPDATE: own profile only, limited by grants/server validation to display fields.
- INSERT/DELETE: no client grant; Auth trigger/administrative workflow only.

## 17.2 Organisations and events

- SELECT organisations: caller has accessible current or historical event in organisation.
- SELECT events: `can_view_event(id)`.
- INSERT/UPDATE: no general direct client write; RPCs. President may update a restricted event-settings surface through RPC.
- DELETE: none.

## 17.3 Membership, roles and departments

- SELECT: active current members, plus historical readers for historical configuration.
- INSERT/UPDATE roles/membership/departments: president via RPC or tightly scoped policy; recommended RPC.
- Department membership changes: president only.
- DELETE: none after operational use; removal changes status or deactivates.

## 17.4 Budgets and transfers

- SELECT: `can_view_event(event_id)`.
- INSERT/UPDATE draft budget rows: treasurer and writable event.
- Active/superseded versions: read only; activation through RPC.
- Transfers: insert only through RPC; no update/delete.

## 17.5 Revenue

- SELECT: `can_view_event(event_id)`.
- INSERT/UPDATE ticket types and other revenue: treasurer, event writable; preferably server action/RPC.
- Snapshots: treasurer insert; void via RPC; no delete.

## 17.6 Spending requests

- SELECT request row: owner, treasurer, or accessible event member when aggregate status is not private draft/cancelled/rejected under configured policy.
- SELECT revision: `can_view_request_revision(id)`. Owners/treasurer see draft; other members see only submitted/terminal revisions and the approved revision during private variation editing.
- SELECT allocations/components: access inherited from their revision helper.
- INSERT request/revision: owner via creation/variation RPC.
- UPDATE revision/allocations/components: `can_edit_request_revision` and only owner; no submitted/terminal update.
- Review SELECT: anyone who can view the request, subject to historical rules.
- Review INSERT: RPC only; no update/delete.

## 17.7 Payments

- SELECT: `can_view_event(event_id)` and request visibility for allocations.
- INSERT/UPDATE/reverse: RPC only, treasurer.
- DELETE: none.

## 17.8 Invitations

- President SELECT/issue/revoke for their event.
- Invitee cannot enumerate by email; acceptance occurs through token RPC.
- Raw token never appears in a selectable row.

## 17.9 Notifications

- SELECT: `user_id = (select auth.uid())`.
- UPDATE: recipient may change only `read_at`; preferably `mark_notification_read` RPC or column-specific grant.
- INSERT: trusted RPC/trigger only.
- DELETE: optional recipient deletion is deferred; default none.

## 17.10 Activity log

- SELECT: accessible event plus visibility rule: committee entries for members; treasurer entries only for treasurer; private-owner entries for actor/owner and treasurer.
- INSERT: trusted functions only.
- UPDATE/DELETE: none.

## 17.11 Documents and Storage

- Metadata SELECT follows linked request/revision/payment visibility.
- A request owner may insert/void supporting evidence for their own writable request, including submitted and approved requests; treasurers may do so for accessible request records. Legacy revision and payment rules remain supported.
- No metadata update/delete after submission except controlled archival workflow.
- Storage object policies require authenticated event access and validate an existing `documents` metadata row. The bucket is private. Signed URLs are short lived.

# 18. Grants

RLS does not replace object privileges. Apply explicit grants:

- `anon`: no table privileges; execute only on any intentionally public bootstrap function, normally none.
- `authenticated`: SELECT on tables where RLS filters; restricted INSERT/UPDATE only on safe draft/profile tables; no DELETE on financial tables.
- `authenticated`: EXECUTE on allowlisted RPC functions only.
- revoke EXECUTE on all security-definer helpers from `public`; grant authorization helpers only as needed by policies and domain RPCs.
- revoke direct access to counter tables, activity-log writes and review/payment mutation tables.

Use `alter default privileges` for the migration owner so newly created functions/tables are not accidentally exposed.

# 19. Index catalogue

In addition to PK and unique indexes, the migration must create indexes on:

- every foreign key used for joins or RLS;
- `event_members(user_id,status,event_id)`;
- `organisation_members(user_id,status,organisation_id)`;
- `event_member_roles(event_id,role,event_member_id)`;
- all event tables beginning with `event_id` followed by common status/date filters;
- request list filters: status, owner, primary department, updated time;
- revision visibility/state fields;
- allocation department and parent IDs;
- latest snapshot and payment dates;
- unread notifications;
- activity chronology.

Avoid speculative GIN indexes until query evidence exists. Run `explain (analyze,buffers)` on dashboard and RLS-heavy queries with realistic seed volumes.

# 20. Migration order

1. Extensions and enums.
2. Profiles and Auth trigger.
3. Organisations, organisation members and events.
4. Event members, roles, departments and department members.
5. Budgets and counters.
6. Revenue.
7. Spending requests/revisions, then add cyclic revision-pointer FKs.
8. Allocations and components.
9. Reviews and payments.
10. Invitations, notifications, activity and documents.
11. Generic triggers and constraint triggers.
12. Authorization helpers.
13. Domain RPC functions.
14. Reporting views/functions.
15. Grants and RLS policies.
16. Storage bucket/policies.
17. Seed data and pgTAP/integration tests.

Never edit an applied migration. Add a new forward migration.

# 21. Required database tests

## 21.1 Constraint tests

- invalid event/department codes fail;
- cross-event composite relationships fail;
- money triples that do not reconcile fail;
- multiple active budgets fail;
- allocations/components/payments that do not reconcile fail at submission/commit;
- submitted/approved revisions cannot be edited;
- transfer cannot exceed contingency;
- payment cannot target an unapproved request component;
- duplicate reference codes cannot occur under concurrency.

## 21.2 RLS personas

Test as:

1. unauthenticated user;
2. ordinary member A and B in same event;
3. request owner;
4. treasurer;
5. president without treasurer role;
6. read-only member;
7. active member of later event viewing history;
8. member of a different organisation;
9. removed member.

Required assertions include draft isolation, treasurer draft visibility, creator-only edits, president financial denial, submitted committee visibility, historical read-only access, cross-organisation denial and notification recipient isolation.

## 21.3 Transaction tests

Inject failures midway through approval, activation and payment RPCs and prove no partial records remain. Run concurrent approval and code-generation tests. Retry an idempotent request and prove it does not create duplicate decisions/payments.

## 21.4 Reporting tests

Use a fixed fixture to verify formal/potential surplus, department splits, variation deltas, partial payments, reversals, contingency transfers, void snapshots and historical figures.

# 22. Seed fixture

Development seed data should create:

- Downing May Ball Association Ltd;
- completed 2025 and planning 2027 events;
- president-only, treasurer and two committee personas;
- default departments including Musical Ents, Security and Welfare;
- an active budget with contingency and one transfer;
- ticket types and two cumulative Ticket Tailor snapshots;
- sponsorship and college contribution;
- private draft, submitted, approved and variation-pending requests;
- a split Amazon request across departments;
- an approved multi-component act with one partial payment;
- historical data visible read-only to 2027 members.

Seed users must be local-development identities only and never migrate into production.

# 23. Deliberate deferrals

The following tables are not created in the first MVP migration unless their UI is brought forward:

- `suppliers`;
- `invoices` and `invoice_allocations`;
- `bank_accounts`;
- `bank_transactions` and matches;
- `revenue_receipts`;
- formal purchase orders.

Their future insertion points are preserved. Invoices will allocate many-to-many to requests/components. Bank transactions will reconcile to payments. Neither will replace request revisions or payment records.

# 24. Implementation decisions to preserve in AGENTS.md

The repository instructions must state:

- `event_id` is mandatory on every event-owned table.
- money is `bigint` minor units and columns end `_minor`.
- roles are event membership data, never profile flags or unverified JWT metadata.
- every exposed table has RLS plus explicit grants.
- every RLS foreign key/filter column is indexed.
- significant financial transitions use RPC functions.
- security-definer functions use empty fixed `search_path` and fully qualified names.
- submitted/approved financial records are immutable.
- no service-role key enters browser code.
- migrations, generated Supabase types and schema documentation change together.
- completion is derived from payment allocations.
- dashboard calculations come from the shared reporting layer.

# 25. Definition of database-ready

The database implementation is ready for feature development when:

- all migrations apply cleanly to an empty local Supabase project;
- reset plus seed is deterministic;
- generated TypeScript types compile;
- all tables, enums, constraints, FKs and indexes match this contract;
- RLS is enabled and tested for every table;
- no authenticated client can bypass domain RPCs for approvals, budgets or payments;
- the specified views return correct fixed-fixture totals;
- Auth signup creates a profile reliably;
- cross-event and cross-organisation isolation tests pass;
- Supabase database/security advisors show no unintended exposed tables or missing RLS;
- rollback is achieved through forward corrective migrations rather than destructive production reset.

# 26. Authoritative interpretation

Where the product specification and this database specification differ in level of detail, this document controls database implementation while the product specification controls user-visible behaviour. A schema change that weakens draft privacy, treasurer-only financial authority, immutable approval history, event isolation or payment-derived completion requires an explicit product decision and versioned amendment to both documents.

# 27. Reference basis

This design follows current Supabase guidance that the Data API is protected by both PostgreSQL grants and RLS; RLS should be enabled on exposed tables; application roles should be implemented in application data rather than as PostgreSQL login roles; policy columns should be indexed; stable Auth/helper calls can be wrapped for policy performance; Storage uses RLS; and security-definer functions must be tightly controlled with a safe `search_path`.

Primary references:

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase: RLS performance and best practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase: Database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase: User data and Auth triggers](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase: Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase: PostgreSQL roles](https://supabase.com/docs/guides/database/postgres/roles)
- [Supabase: PostgreSQL triggers](https://supabase.com/docs/guides/database/postgres/triggers)
