begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.organisation_status as enum ('active','inactive');
create type public.event_status as enum ('setup','planning','live','reconciliation','completed','archived');
create type public.membership_status as enum ('invited','active','suspended','left','removed');
create type public.event_role as enum ('president','treasurer','committee_member','read_only');
create type public.budget_version_status as enum ('draft','active','superseded','final');
create type public.vat_treatment as enum ('standard','reduced','zero_rated','exempt','outside_scope','unknown');
create type public.revenue_item_category as enum ('sponsorship','college_contribution','donation','merchandise','interest','other');
create type public.revenue_item_status as enum ('forecast','confirmed','part_received','received','cancelled');
create type public.snapshot_source as enum ('manual_ticket_tailor','manual_other','ticket_tailor_api','csv_import');
create type public.request_approval_status as enum ('draft','submitted','changes_requested','approved','variation_pending','rejected','cancelled');
create type public.revision_status as enum ('draft','submitted','approved','changes_requested','rejected','superseded','cancelled');
create type public.review_decision as enum ('approved','changes_requested','rejected','cancelled');
create type public.payment_method as enum ('bank_transfer','card','cash','direct_debit','other');
create type public.payment_record_status as enum ('recorded','reversed');
create type public.invitation_status as enum ('pending','accepted','revoked','expired');
create type public.notification_type as enum ('invitation','request_submitted','changes_requested','request_approved','request_rejected','variation_submitted','variation_decided','payment_recorded','role_changed','event_status_changed');
create type public.document_category as enum ('quote','contract','invoice','receipt','supporting','other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  preferred_name text check (preferred_name is null or char_length(btrim(preferred_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  legal_name text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.organisation_status not null default 'active',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.organisation_members (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict, status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(), left_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organisation_id,user_id), unique (organisation_id,id),
  check ((status in ('left','removed') and left_at is not null) or (status not in ('left','removed') and left_at is null))
);

create table public.events (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 160), event_year smallint not null check (event_year between 2000 and 2200),
  event_date date, planning_start_date date, code text not null check (code ~ '^[A-Z][A-Z0-9]{1,9}$'),
  currency char(3) not null default 'GBP' check (currency ~ '^[A-Z]{3}$'), is_vat_registered boolean not null default true,
  default_vat_rate numeric(5,2) not null default 20 check (default_vat_rate between 0 and 100), status public.event_status not null default 'setup',
  created_by uuid not null references public.profiles(id) on delete restrict, completed_at timestamptz, archived_at timestamptz, reopened_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organisation_id,event_year,code), unique (id,organisation_id), unique (id,currency),
  check (planning_start_date is null or event_date is null or planning_start_date <= event_date),
  check ((status in ('completed','archived')) = (completed_at is not null)),
  check ((status = 'archived') = (archived_at is not null))
);

create table public.event_members (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict, status public.membership_status not null default 'active',
  invited_by uuid references public.profiles(id) on delete set null, joined_at timestamptz not null default now(), left_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(event_id,user_id), unique(event_id,id),
  check ((status in ('left','removed') and left_at is not null) or (status not in ('left','removed') and left_at is null))
);

create table public.event_member_roles (
  event_id uuid not null, event_member_id uuid not null, role public.event_role not null,
  assigned_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  primary key(event_member_id,role), foreign key(event_id,event_member_id) references public.event_members(event_id,id) on delete restrict
);

create table public.departments (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 100), code text not null check (code ~ '^[A-Z][A-Z0-9]{0,7}$'),
  colour text check (colour is null or colour ~ '^#[0-9A-Fa-f]{6}$'), description text check (description is null or char_length(description)<=1000),
  display_order smallint not null default 0 check(display_order>=0), is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(event_id,code), unique(event_id,id)
);
create unique index departments_event_lower_name_uidx on public.departments(event_id,lower(name));

create table public.department_members (
  event_id uuid not null, department_id uuid not null, event_member_id uuid not null,
  assigned_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  primary key(department_id,event_member_id), foreign key(event_id,department_id) references public.departments(event_id,id),
  foreign key(event_id,event_member_id) references public.event_members(event_id,id)
);

create table public.budget_versions (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), version_number integer not null check(version_number>0),
  name text not null check(char_length(btrim(name)) between 1 and 120), status public.budget_version_status not null default 'draft', effective_date date,
  original_contingency_minor bigint not null default 0 check(original_contingency_minor>=0), notes text check(notes is null or char_length(notes)<=4000),
  created_by uuid not null references public.profiles(id), activated_by uuid references public.profiles(id), activated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(event_id,version_number), unique(event_id,id),
  check ((status='draft' and activated_at is null and activated_by is null) or (status<>'draft' and activated_at is not null and activated_by is not null))
);
create unique index one_active_budget_per_event on public.budget_versions(event_id) where status='active';

create table public.department_budget_allocations (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, budget_version_id uuid not null, department_id uuid not null,
  original_net_minor bigint not null check(original_net_minor>=0), original_gross_minor bigint check(original_gross_minor is null or original_gross_minor>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(budget_version_id,department_id),
  foreign key(event_id,budget_version_id) references public.budget_versions(event_id,id), foreign key(event_id,department_id) references public.departments(event_id,id)
);

create table public.budget_transfers (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, budget_version_id uuid not null,
  from_department_id uuid, to_department_id uuid, amount_minor bigint not null check(amount_minor>0), reason text not null check(char_length(btrim(reason)) between 1 and 1000),
  effective_at timestamptz not null default now(), created_by uuid not null references public.profiles(id), reverses_transfer_id uuid unique,
  created_at timestamptz not null default now(), foreign key(event_id,budget_version_id) references public.budget_versions(event_id,id),
  foreign key(event_id,from_department_id) references public.departments(event_id,id), foreign key(event_id,to_department_id) references public.departments(event_id,id),
  foreign key(reverses_transfer_id) references public.budget_transfers(id),
  check (not (from_department_id is null and to_department_id is null)), check(from_department_id is distinct from to_department_id)
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), name text not null, description text,
  net_price_minor bigint not null check(net_price_minor>=0), vat_minor bigint not null check(vat_minor>=0), gross_price_minor bigint not null check(gross_price_minor>=0),
  vat_rate numeric(5,2) check(vat_rate is null or vat_rate between 0 and 100), vat_treatment public.vat_treatment not null default 'standard',
  maximum_quantity integer not null check(maximum_quantity>=0), forecast_quantity integer not null check(forecast_quantity>=0), complimentary_quantity integer not null default 0 check(complimentary_quantity>=0),
  display_order smallint not null default 0 check(display_order>=0), is_active boolean not null default true, created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(net_price_minor+vat_minor=gross_price_minor), check(forecast_quantity+complimentary_quantity<=maximum_quantity)
);
create unique index ticket_types_event_lower_name_uidx on public.ticket_types(event_id,lower(name));

create table public.ticket_sales_snapshots (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), captured_at timestamptz not null,
  tickets_sold_to_date integer check(tickets_sold_to_date is null or tickets_sold_to_date>=0), net_sales_minor bigint, vat_minor bigint,
  gross_sales_minor bigint not null check(gross_sales_minor>=0), refunds_to_date_minor bigint not null default 0 check(refunds_to_date_minor>=0),
  booking_fees_to_date_minor bigint not null default 0 check(booking_fees_to_date_minor>=0), source public.snapshot_source not null, notes text,
  entered_by uuid not null references public.profiles(id), is_void boolean not null default false, void_reason text, voided_by uuid references public.profiles(id), voided_at timestamptz,
  created_at timestamptz not null default now(),
  check ((net_sales_minor is null and vat_minor is null) or (net_sales_minor>=0 and vat_minor>=0 and net_sales_minor+vat_minor=gross_sales_minor)),
  check ((not is_void and void_reason is null and voided_by is null and voided_at is null) or (is_void and char_length(btrim(void_reason))>0 and voided_by is not null and voided_at is not null))
);

create table public.ticket_type_sales_snapshots (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, snapshot_id uuid not null, ticket_type_id uuid not null,
  quantity_to_date integer not null check(quantity_to_date>=0), gross_sales_minor bigint not null check(gross_sales_minor>=0), created_at timestamptz not null default now(),
  unique(snapshot_id,ticket_type_id), foreign key(snapshot_id) references public.ticket_sales_snapshots(id), foreign key(ticket_type_id) references public.ticket_types(id)
);

create table public.other_revenue_items (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), title text not null, category public.revenue_item_category not null,
  owner_user_id uuid references public.profiles(id), forecast_net_minor bigint not null check(forecast_net_minor>=0), forecast_vat_minor bigint not null check(forecast_vat_minor>=0),
  forecast_gross_minor bigint not null check(forecast_gross_minor>=0), actual_net_minor bigint not null default 0 check(actual_net_minor>=0), actual_vat_minor bigint not null default 0 check(actual_vat_minor>=0),
  actual_gross_minor bigint not null default 0 check(actual_gross_minor>=0), vat_rate numeric(5,2) check(vat_rate is null or vat_rate between 0 and 100),
  vat_treatment public.vat_treatment not null, expected_date date, received_date date, status public.revenue_item_status not null default 'forecast', notes text,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(forecast_net_minor+forecast_vat_minor=forecast_gross_minor), check(actual_net_minor+actual_vat_minor=actual_gross_minor)
);

create table public.spending_requests (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), code text not null,
  owner_user_id uuid not null references public.profiles(id), primary_department_id uuid not null,
  approval_status public.request_approval_status not null default 'draft', current_draft_revision_id uuid, current_approved_revision_id uuid,
  submitted_at timestamptz, approved_at timestamptz, cancelled_at timestamptz, cancelled_by uuid references public.profiles(id), cancellation_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(event_id,code), unique(event_id,id),
  foreign key(event_id,primary_department_id) references public.departments(event_id,id)
);

create table public.spending_request_revisions (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, request_id uuid not null, revision_number integer not null check(revision_number>0),
  status public.revision_status not null default 'draft', title text not null check(char_length(btrim(title)) between 1 and 200), description text check(description is null or char_length(description)<=10000),
  business_justification text check(business_justification is null or char_length(business_justification)<=10000), supplier_name text check(supplier_name is null or char_length(supplier_name)<=200),
  expected_payment_date date, net_minor bigint not null check(net_minor>=0), vat_minor bigint not null check(vat_minor>=0), gross_minor bigint not null check(gross_minor>=0),
  vat_rate numeric(5,2) check(vat_rate is null or vat_rate between 0 and 100), vat_treatment public.vat_treatment not null, vat_recoverable boolean,
  calculation_overridden boolean not null default false, calculation_override_reason text, change_summary text, created_by uuid not null references public.profiles(id),
  submitted_at timestamptz, decided_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(request_id,revision_number), unique(event_id,id), unique(event_id,request_id,id), foreign key(event_id,request_id) references public.spending_requests(event_id,id),
  check(net_minor+vat_minor=gross_minor), check((not calculation_overridden and calculation_override_reason is null) or (calculation_overridden and char_length(btrim(calculation_override_reason))>0))
);
alter table public.spending_requests add constraint spending_requests_draft_revision_fk foreign key(event_id,id,current_draft_revision_id)
  references public.spending_request_revisions(event_id,request_id,id) deferrable initially deferred;
alter table public.spending_requests add constraint spending_requests_approved_revision_fk foreign key(event_id,id,current_approved_revision_id)
  references public.spending_request_revisions(event_id,request_id,id) deferrable initially deferred;

create table public.spending_request_department_allocations (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, revision_id uuid not null, department_id uuid not null,
  net_minor bigint not null check(net_minor>=0), vat_minor bigint not null check(vat_minor>=0), gross_minor bigint not null check(gross_minor>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(revision_id,department_id),
  foreign key(event_id,revision_id) references public.spending_request_revisions(event_id,id), foreign key(event_id,department_id) references public.departments(event_id,id),
  check(net_minor+vat_minor=gross_minor)
);

create table public.request_components (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, revision_id uuid not null, sequence_number integer not null check(sequence_number>0),
  code text not null, description text not null check(char_length(btrim(description)) between 1 and 500), expected_payment_date date, supplier_name text,
  net_minor bigint not null check(net_minor>=0), vat_minor bigint not null check(vat_minor>=0), gross_minor bigint not null check(gross_minor>=0),
  vat_rate numeric(5,2) check(vat_rate is null or vat_rate between 0 and 100), vat_treatment public.vat_treatment not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(revision_id,sequence_number), unique(event_id,code), unique(event_id,id),
  foreign key(event_id,revision_id) references public.spending_request_revisions(event_id,id), check(net_minor+vat_minor=gross_minor)
);

create table public.request_reviews (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, request_id uuid not null, revision_id uuid not null,
  reviewer_user_id uuid not null references public.profiles(id), decision public.review_decision not null, reason text, created_at timestamptz not null default now(),
  unique(revision_id), foreign key(event_id,request_id,revision_id) references public.spending_request_revisions(event_id,request_id,id),
  check(decision='approved' or char_length(btrim(reason))>0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), code text not null, payment_date date not null,
  net_minor bigint, vat_minor bigint, gross_minor bigint not null check(gross_minor>0), bank_reference text, method public.payment_method not null default 'bank_transfer',
  payee text not null check(char_length(btrim(payee)) between 1 and 200), note text, status public.payment_record_status not null default 'recorded',
  entered_by uuid not null references public.profiles(id), reversed_at timestamptz, reversed_by uuid references public.profiles(id), reversal_reason text,
  created_at timestamptz not null default now(), unique(event_id,code), unique(event_id,id),
  check((net_minor is null and vat_minor is null) or (net_minor>=0 and vat_minor>=0 and net_minor+vat_minor=gross_minor)),
  check((status='recorded' and reversed_at is null and reversed_by is null and reversal_reason is null) or (status='reversed' and reversed_at is not null and reversed_by is not null and char_length(btrim(reversal_reason))>0))
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, payment_id uuid not null, request_id uuid not null, request_component_id uuid not null,
  net_minor bigint, vat_minor bigint, gross_minor bigint not null check(gross_minor>0), created_at timestamptz not null default now(), unique(payment_id,request_component_id),
  foreign key(event_id,payment_id) references public.payments(event_id,id), foreign key(event_id,request_id) references public.spending_requests(event_id,id),
  foreign key(event_id,request_component_id) references public.request_components(event_id,id),
  check((net_minor is null and vat_minor is null) or (net_minor>=0 and vat_minor>=0 and net_minor+vat_minor=gross_minor))
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(), organisation_id uuid not null, event_id uuid not null, email extensions.citext not null, token_hash text not null unique,
  status public.invitation_status not null default 'pending', expires_at timestamptz not null, invited_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id), accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(event_id,organisation_id) references public.events(id,organisation_id)
);
create unique index invitations_pending_event_email_uidx on public.invitations(event_id,email) where status='pending';
create table public.invitation_roles (invitation_id uuid not null references public.invitations(id) on delete cascade, role public.event_role not null, primary key(invitation_id,role));
create table public.invitation_departments (
  invitation_id uuid not null references public.invitations(id) on delete cascade, event_id uuid not null, department_id uuid not null,
  primary key(invitation_id,department_id), foreign key(event_id,department_id) references public.departments(event_id,id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), event_id uuid not null references public.events(id),
  type public.notification_type not null, entity_type text, entity_id uuid, title text not null, body text not null, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.activity_log (
  id bigint generated always as identity primary key, event_id uuid not null references public.events(id), actor_user_id uuid references public.profiles(id),
  action text not null, entity_type text not null, entity_id uuid, summary text not null, metadata jsonb not null default '{}'::jsonb,
  visibility text not null default 'committee' check(visibility in ('treasurer','committee','private_owner')), created_at timestamptz not null default now(),
  check(jsonb_typeof(metadata)='object')
);
create table public.documents (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id), uploaded_by uuid not null references public.profiles(id),
  request_id uuid, revision_id uuid, payment_id uuid, category public.document_category not null, bucket_id text not null default 'event-documents',
  object_path text not null, original_filename text not null, mime_type text not null, size_bytes bigint not null check(size_bytes>0), sha256 text,
  created_at timestamptz not null default now(), unique(bucket_id,object_path),
  foreign key(event_id,request_id) references public.spending_requests(event_id,id), foreign key(event_id,revision_id) references public.spending_request_revisions(event_id,id),
  foreign key(event_id,payment_id) references public.payments(event_id,id), check(request_id is not null or revision_id is not null or payment_id is not null)
);

create table public.event_reference_counters (event_id uuid primary key references public.events(id), next_payment_number integer not null default 1 check(next_payment_number>0), updated_at timestamptz not null default now());
create table public.department_reference_counters (
  event_id uuid not null, department_id uuid not null, next_request_number integer not null default 1 check(next_request_number>0), updated_at timestamptz not null default now(),
  primary key(event_id,department_id), foreign key(event_id,department_id) references public.departments(event_id,id)
);

-- Foreign-key and policy/query indexes.
create index organisation_members_user_status_idx on public.organisation_members(user_id,status,organisation_id);
create index events_org_status_year_idx on public.events(organisation_id,status,event_year desc);
create index event_members_user_status_idx on public.event_members(user_id,status,event_id);
create index event_members_event_status_idx on public.event_members(event_id,status);
create index event_member_roles_event_role_idx on public.event_member_roles(event_id,role,event_member_id);
create index departments_event_active_order_idx on public.departments(event_id,is_active,display_order);
create index department_members_member_idx on public.department_members(event_member_id);
create index budget_versions_event_status_idx on public.budget_versions(event_id,status,version_number desc);
create index department_budget_department_idx on public.department_budget_allocations(event_id,department_id);
create index budget_transfers_version_idx on public.budget_transfers(budget_version_id,effective_at);
create index ticket_types_event_idx on public.ticket_types(event_id,is_active,display_order);
create index ticket_snapshots_latest_idx on public.ticket_sales_snapshots(event_id,captured_at desc,created_at desc) where not is_void;
create index other_revenue_event_idx on public.other_revenue_items(event_id,status,expected_date);
create index requests_status_idx on public.spending_requests(event_id,approval_status,updated_at desc);
create index requests_owner_idx on public.spending_requests(event_id,owner_user_id,approval_status);
create index requests_department_idx on public.spending_requests(event_id,primary_department_id,approval_status);
create index revisions_request_idx on public.spending_request_revisions(event_id,request_id,revision_number desc);
create index revisions_status_idx on public.spending_request_revisions(event_id,status,submitted_at);
create index request_allocations_department_idx on public.spending_request_department_allocations(event_id,department_id,revision_id);
create index components_revision_idx on public.request_components(event_id,revision_id,sequence_number);
create index payments_event_date_idx on public.payments(event_id,payment_date desc,created_at desc);
create index payment_allocations_request_idx on public.payment_allocations(event_id,request_id);
create index notifications_unread_idx on public.notifications(user_id,created_at desc) where read_at is null;
create index activity_event_time_idx on public.activity_log(event_id,created_at desc,id desc);
create index activity_entity_idx on public.activity_log(event_id,entity_type,entity_id,created_at desc);

commit;
