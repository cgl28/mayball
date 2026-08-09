import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardPanel } from "@/components/dashboard-panel";
import type { DashboardData, EventFinancialPosition } from "@/lib/dashboard/data";
import { makeEventAccess } from "@/test/fixtures";

const position: EventFinancialPosition = {
  event_id: "event-id",
  event_name: "Downing May Ball 2027",
  event_year: 2027,
  event_date: "2027-06-19",
  event_status: "planning",
  organisation_id: "org-id",
  active_budget_version_id: "budget-id",
  active_budget_version_number: 1,
  active_budget_name: "Original budget",
  active_budget_effective_date: "2026-08-01",
  has_active_budget: true,
  total_current_department_budget_minor: 8300000,
  original_contingency_minor: 1500000,
  unallocated_contingency_minor: 1500000,
  active_ticket_type_count: 3,
  ticket_forecast_net_minor: 19208430,
  ticket_forecast_gross_minor: 23050000,
  other_forecast_net_minor: 1500000,
  other_forecast_gross_minor: 1700000,
  total_forecast_net_minor: 20708430,
  total_forecast_gross_minor: 24750000,
  latest_snapshot_id: "snapshot-id",
  latest_captured_at: "2027-01-01T10:00:00Z",
  tickets_sold_to_date: 800,
  ticket_actual_net_minor: 10000000,
  ticket_actual_gross_minor: 12000000,
  ticket_refunds_to_date_minor: 20000,
  ticket_booking_fees_to_date_minor: 240000,
  other_actual_net_minor: 500000,
  other_actual_gross_minor: 500000,
  total_actual_gross_minor: 12500000,
  approved_request_count: 2,
  approved_net_spending_minor: 900000,
  approved_gross_spending_minor: 1080000,
  pending_request_count: 2,
  pending_net_spending_minor: 520000,
  pending_gross_spending_minor: 624000,
  pending_net_position_delta_minor: 520000,
  visible_draft_request_count: 4,
  visible_draft_net_minor: 1180000,
  visible_draft_gross_minor: 1416000,
  draft_scope: "event_drafts",
  unpaid_request_count: 2,
  partially_paid_request_count: 0,
  paid_request_count: 0,
  approved_payable_gross_minor: 1080000,
  paid_gross_spending_minor: 0,
  unpaid_approved_gross_minor: 1080000,
  recorded_payment_gross_minor: 0,
  reversed_payment_gross_minor: 0,
  recorded_payment_count: 0,
  reversed_payment_count: 0,
  formal_forecast_net_position_minor: 18308430,
  potential_forecast_net_position_minor: 17788430,
  recorded_gross_cash_movement_minor: 12500000,
};

const data: DashboardData = {
  position,
  departments: [
    {
      event_id: "event-id",
      department_id: "dep-ae",
      department_name: "Aesthetics",
      department_code: "AE",
      display_order: 1,
      budget_version_id: "budget-id",
      active_budget_version_number: 1,
      original_allocation_minor: 2500000,
      transfers_received_minor: 0,
      transfers_released_minor: 0,
      current_budget_minor: 2500000,
      has_active_allocation: true,
      approved_net_minor: 900000,
      approved_gross_minor: 1080000,
      pending_net_minor: 520000,
      pending_gross_minor: 624000,
      visible_draft_request_count: 1,
      visible_draft_net_minor: 350000,
      visible_draft_gross_minor: 420000,
      remaining_approved_minor: 1600000,
      potential_remaining_minor: 1080000,
      approved_over_budget: false,
      potential_over_budget: false,
    },
    {
      event_id: "event-id",
      department_id: "dep-unb",
      department_name: "Unbudgeted",
      department_code: "UNB",
      display_order: 2,
      budget_version_id: null,
      active_budget_version_number: null,
      original_allocation_minor: null,
      transfers_received_minor: null,
      transfers_released_minor: null,
      current_budget_minor: null,
      has_active_allocation: false,
      approved_net_minor: 10000,
      approved_gross_minor: 12000,
      pending_net_minor: 0,
      pending_gross_minor: 0,
      visible_draft_request_count: 0,
      visible_draft_net_minor: 0,
      visible_draft_gross_minor: 0,
      remaining_approved_minor: null,
      potential_remaining_minor: null,
      approved_over_budget: false,
      potential_over_budget: false,
    },
  ],
  warnings: [
    {
      event_id: "event-id",
      code: "pending_approvals",
      severity: "info",
      title: "Pending approvals awaiting review",
      message: "Submitted requests or variations are awaiting treasurer review.",
      target_module: "approvals",
    },
  ],
  activity: [
    {
      activity_id: 1,
      event_id: "event-id",
      actor_user_id: "user-id",
      actor_display_name: "Terry Treasurer",
      action: "request.approved",
      entity_type: "spending_request",
      entity_id: "request-id",
      summary: "Spending request DMB_AE_3 approved",
      visibility: "committee",
      created_at: "2027-02-01T12:00:00Z",
    },
  ],
  pendingApprovals: [
    {
      event_id: "event-id",
      request_id: "request-id",
      revision_id: "revision-id",
      request_code: "DMB_AE_2",
      title: "Floral arch",
      owner_display_name: "Alex Aesthetics",
      owner_preferred_name: null,
      primary_department_id: "dep-ae",
      primary_department_name: "Aesthetics",
      primary_department_code: "AE",
      net_minor: 400000,
      gross_minor: 480000,
      submitted_at: "2027-02-01T12:00:00Z",
      request_type: "initial",
      budget_warning: false,
    },
  ],
};

describe("Stage 8 dashboard panel", () => {
  it("renders populated headline cards with net and gross labels", () => {
    render(<DashboardPanel eventAccess={makeEventAccess()} data={data} canManageFinance />);

    expect(screen.getByText("Forecast income")).toBeInTheDocument();
    expect(screen.getByText("£207,084.30")).toBeInTheDocument();
    expect(screen.getByText("Actual income recorded")).toBeInTheDocument();
    expect(screen.getByText("£125,000.00")).toBeInTheDocument();
    expect(screen.getByText("Approved commitments")).toBeInTheDocument();
    expect(screen.getByText("Paid to date")).toBeInTheDocument();
    expect(screen.getAllByText("net").length).toBeGreaterThan(3);
    expect(screen.getAllByText(/gross/).length).toBeGreaterThan(2);
  });

  it("removes legacy dashboard shortcut navigation while preserving contextual links", () => {
    render(<DashboardPanel eventAccess={makeEventAccess()} data={data} canManageFinance canManageLifecycle />);

    expect(screen.queryByRole("link", { name: /^Budget$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Revenue$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Requests$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Approvals$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Payments$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Lifecycle$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review approvals" })).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027/approvals",
    );
    expect(screen.getAllByRole("link", { name: /Open module/ }).length).toBeGreaterThan(0);
  });

  it("distinguishes formal and potential positions and explains pending exposure", () => {
    render(<DashboardPanel eventAccess={makeEventAccess()} data={data} canManageFinance />);

    expect(screen.getByText("Formal forecast")).toBeInTheDocument();
    expect(screen.getAllByText(/Potential/).length).toBeGreaterThan(1);
    expect(screen.getAllByText("£183,084.30").length).toBeGreaterThan(1);
    expect(screen.getAllByText("£177,884.30").length).toBeGreaterThan(1);
    expect(screen.getByText(/Potential adds submitted requests and pending variation increments/)).toBeInTheDocument();
  });

  it("shows department positions including missing allocation state", () => {
    render(<DashboardPanel eventAccess={makeEventAccess()} data={data} canManageFinance />);

    expect(screen.getByText("Whole-event spending position")).toBeInTheDocument();
    expect(screen.getByText("Spending by department budget")).toBeInTheDocument();
    expect(screen.getByText("Department pressure")).toBeInTheDocument();
    expect(screen.getByText("Approved but unpaid")).toBeInTheDocument();
    expect(screen.getAllByText("Aesthetics").length).toBeGreaterThan(1);
    expect(screen.getByText(/No active allocation/)).toBeInTheDocument();
  });

  it("shows revenue snapshot details and keeps booking fees separate", () => {
    render(<DashboardPanel eventAccess={makeEventAccess()} data={data} canManageFinance />);

    expect(screen.getByText("Revenue snapshot")).toBeInTheDocument();
    expect(screen.getByText("£2,400.00 separate")).toBeInTheDocument();
    expect(screen.getByText("£200.00")).toBeInTheDocument();
  });

  it("shows treasurer-only pending approval widget", () => {
    render(<DashboardPanel eventAccess={makeEventAccess()} data={data} canManageFinance />);

    expect(screen.getByText("DMB_AE_2: Floral arch")).toBeInTheDocument();
    expect(screen.getByText(/£4,000.00 net/)).toBeInTheDocument();
  });

  it("hides actionable approval details from non-treasurers and labels draft privacy", () => {
    render(
      <DashboardPanel
        eventAccess={makeEventAccess({ roles: ["committee_member"] })}
        data={{ ...data, position: { ...position, draft_scope: "my_visible_drafts", visible_draft_request_count: 2 } }}
        canManageFinance={false}
      />,
    );

    expect(screen.queryByText("My visible drafts")).not.toBeInTheDocument();
    expect(screen.getByText("Approval queue details are available to treasurers only.")).toBeInTheDocument();
    expect(screen.queryByText("DMB_AE_2: Floral arch")).not.toBeInTheDocument();
  });

  it("shows historical read-only dashboard state", () => {
    render(
      <DashboardPanel
        eventAccess={makeEventAccess({ event: { status: "completed" }, accessMode: "historical", isReadOnly: true })}
        data={{ ...data, position: { ...position, event_status: "completed" } }}
        canManageFinance={false}
      />,
    );

    expect(screen.getByText("Read-only historical dashboard")).toBeInTheDocument();
  });

  it("renders missing budget and missing snapshot honestly", () => {
    render(
      <DashboardPanel
        eventAccess={makeEventAccess()}
        data={{
          ...data,
          position: {
            ...position,
            has_active_budget: false,
            active_budget_name: null,
            active_budget_version_number: null,
            latest_snapshot_id: null,
            latest_captured_at: null,
            recorded_gross_cash_movement_minor: null,
          },
        }}
        canManageFinance
      />,
    );

    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(screen.getAllByText("No snapshot").length).toBeGreaterThan(1);
  });
});
