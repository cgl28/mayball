import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BudgetEditor } from "@/components/budget-editor";
import { BudgetPanel } from "@/components/budget-panel";
import { formatMinor, parseMoneyToMinor } from "@/lib/money";
import type { BudgetOverview } from "@/lib/budget/data";
import { compareAllocation } from "@/lib/budget/allocation-comparison";

const departments = [
  { id: "dep-a", name: "Aesthetics", code: "AE", colour: "#6AAED6", is_active: true, display_order: 1 },
  { id: "dep-s", name: "Security", code: "SEC", colour: "#E99292", is_active: true, display_order: 2 },
];

const budget: BudgetOverview = {
  activeBudget: {
    budget_version_id: "budget-id",
    event_id: "event-id",
    version_number: 1,
    name: "Original budget",
    status: "active",
    effective_date: "2026-08-01",
    original_contingency_minor: 150000,
    total_department_original_minor: 300000,
    total_cost_budget_minor: 450000,
    unallocated_contingency_minor: 125000,
  },
  departmentPositions: [
    {
      event_id: "event-id",
      budget_version_id: "budget-id",
      version_number: 1,
      department_id: "dep-a",
      department_name: "Aesthetics",
      department_code: "AE",
      original_allocation_minor: 200000,
      transfers_received_minor: 25000,
      transfers_released_minor: 0,
      current_budget_minor: 225000,
    },
  ],
  versions: [
    {
      budget_version_id: "budget-id",
      event_id: "event-id",
      version_number: 1,
      name: "Original budget",
      status: "active",
      effective_date: "2026-08-01",
      original_contingency_minor: 150000,
      notes: null,
      created_by: "user-id",
      activated_by: "user-id",
      activated_at: "2026-08-01T00:00:00Z",
      created_at: "2026-07-18T00:00:00Z",
      updated_at: "2026-07-18T00:00:00Z",
      total_department_original_minor: 300000,
      total_cost_budget_minor: 450000,
    },
  ],
  transfers: [
    {
      id: "transfer-id",
      event_id: "event-id",
      budget_version_id: "budget-id",
      from_department_id: null,
      to_department_id: "dep-a",
      amount_minor: 25000,
      reason: "Extra build",
      effective_at: "2026-09-01T00:00:00Z",
      created_by: "user-id",
      reverses_transfer_id: null,
      created_at: "2026-09-01T00:00:00Z",
    },
  ],
  departments,
  departmentFinancialPositions: [
    {
      event_id: "event-id",
      department_id: "dep-a",
      department_name: "Aesthetics",
      department_code: "AE",
      display_order: 1,
      budget_version_id: "budget-id",
      active_budget_version_number: 1,
      has_active_allocation: true,
      original_allocation_minor: 200000,
      transfers_received_minor: 25000,
      transfers_released_minor: 0,
      current_budget_minor: 225000,
      approved_net_minor: 150000,
      approved_gross_minor: 180000,
      pending_net_minor: 50000,
      pending_gross_minor: 60000,
      visible_draft_net_minor: 0,
      visible_draft_gross_minor: 0,
      visible_draft_request_count: 0,
      remaining_approved_minor: 75000,
      potential_remaining_minor: 25000,
      approved_over_budget: false,
      potential_over_budget: false,
    },
  ],
};

describe("money utilities", () => {
  it("parses and formats money without floating point multiplication", () => {
    expect(parseMoneyToMinor("£1,000.50")).toBe(100050);
    expect(parseMoneyToMinor("1000")).toBe(100000);
    expect(formatMinor(100050)).toBe("£1,000.50");
  });

  it("rejects invalid money input", () => {
    expect(() => parseMoneyToMinor("1.234")).toThrow(/two decimal/);
    expect(() => parseMoneyToMinor("-1")).toThrow(/non-negative/);
    expect(() => parseMoneyToMinor("nope")).toThrow(/non-negative/);
  });
});

describe("budget panel", () => {
  it("shows no-active-budget empty state", () => {
    render(
      <BudgetPanel
        eventId="event-id"
        budget={{ ...budget, activeBudget: null, departmentPositions: [], transfers: null }}
        canManage={false}
        readOnly={false}
      />,
    );

    expect(screen.getByText("No active budget")).toBeInTheDocument();
    expect(screen.queryByText("Transfer contingency")).not.toBeInTheDocument();
  });

  it("shows active budget summary and original/current department budgets", () => {
    render(<BudgetPanel eventId="event-id" budget={budget} canManage readOnly={false} />);

    expect(screen.getByText("Active budget v1: Original budget")).toBeInTheDocument();
    expect(screen.getByText("Original allocation")).toBeInTheDocument();
    expect(screen.getByText("Current budget")).toBeInTheDocument();
    expect(screen.getByText("Budget allocation by department")).toBeInTheDocument();
    expect(screen.getAllByText("Unallocated contingency").length).toBeGreaterThan(1);
    expect(screen.getByText("Transfer contingency")).toBeInTheDocument();
    expect(screen.getByText("View transfer history")).toBeInTheDocument();
    expect(screen.queryByText("Extra build")).not.toBeInTheDocument();
  });

  it("shows authoritative department budget use with an explicit Finances link", () => {
    render(<BudgetPanel eventId="event-id" budget={budget} canManage readOnly={false} />);

    expect(screen.getByText("Department allocation and budget use")).toBeInTheDocument();
    expect(screen.getByText("Approved commitments")).toBeInTheDocument();
    expect(screen.getByText("Submitted exposure")).toBeInTheDocument();
    expect(screen.getByText("Remaining budget")).toBeInTheDocument();
    expect(screen.getByText(/Approved commitments include paid and unpaid/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View in Finances" })).toHaveAttribute("href", "/events/event-id/finances?department=dep-a");
  });

  it("renders nullable department position amounts safely", () => {
    render(
      <BudgetPanel
        eventId="event-id"
        budget={{
          ...budget,
          departmentFinancialPositions: budget.departmentFinancialPositions.map((position) => ({
            ...position,
            current_budget_minor: null,
            approved_net_minor: null,
            pending_net_minor: null,
            potential_remaining_minor: null,
          })),
        }}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText("Current allocation £0.00 net")).toBeInTheDocument();
    expect(screen.getAllByText("£0.00").length).toBeGreaterThanOrEqual(3);
  });

  it("shows transfer history only when requested", () => {
    render(<BudgetPanel eventId="event-id" budget={budget} canManage readOnly={false} transferHistoryLoaded />);

    expect(screen.getByText("Extra build")).toBeInTheDocument();
    expect(screen.queryByText("View transfer history")).not.toBeInTheDocument();
  });

  it("hides mutation controls from president without treasurer", () => {
    render(<BudgetPanel eventId="event-id" budget={budget} canManage={false} readOnly={false} />);

    expect(screen.queryByText("New draft budget")).not.toBeInTheDocument();
    expect(screen.queryByText("Transfer contingency")).not.toBeInTheDocument();
  });
});

describe("budget editor", () => {
  it("renders department allocation fields", () => {
    render(<BudgetEditor eventId="event-id" departments={departments} />);

    expect(screen.getByText("Create draft budget")).toBeInTheDocument();
    expect(screen.getByText("Aesthetics")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByLabelText("Event contingency")).toHaveValue("0.00");
  });

  it("shows immutable status for non-draft versions", () => {
    render(
      <BudgetEditor
        eventId="event-id"
        departments={departments}
        version={{
          id: "budget-id",
          event_id: "event-id",
          version_number: 1,
          name: "Original budget",
          status: "active",
          effective_date: "2026-08-01",
          original_contingency_minor: 1000,
          notes: null,
        }}
      />,
    );

    expect(screen.getByText(/cannot be edited/)).toBeInTheDocument();
    expect(screen.queryByText("Save draft")).not.toBeInTheDocument();
  });

  it("shows a prior allocation beside the proposed net allocation", () => {
    render(
      <BudgetEditor
        eventId="event-id"
        departments={departments}
        allocations={[{ id: "allocation-a", event_id: "event-id", budget_version_id: "budget-id", department_id: "dep-a", original_net_minor: 125000, original_gross_minor: null }]}
        previousBudget={{
          versionNumber: 1,
          name: "Original budget",
          allocations: [{ id: "prior-a", event_id: "event-id", budget_version_id: "prior-budget", department_id: "dep-a", original_net_minor: 100000, original_gross_minor: null }],
        }}
      />,
    );

    expect(screen.getByText(/Compare each proposed net allocation with v1/)).toBeInTheDocument();
    expect(screen.getByText("£1,000.00")).toBeInTheDocument();
    expect(screen.getByText("+£250.00 (+25.0%)")).toBeInTheDocument();
    expect(screen.getByText("New department")).toBeInTheDocument();
  });
});

describe("allocation comparisons", () => {
  it("handles unchanged, increased, decreased and zero prior allocations", () => {
    expect(compareAllocation(100000, 100000)).toMatchObject({ changeMinor: 0, percentageChange: "0.0%" });
    expect(compareAllocation(100000, 125000)).toMatchObject({ changeMinor: 25000, percentageChange: "25.0%" });
    expect(compareAllocation(100000, 75000)).toMatchObject({ changeMinor: -25000, percentageChange: "25.0%" });
    expect(compareAllocation(0, 100000)).toMatchObject({ changeMinor: 100000, percentageChange: null });
  });

  it("does not infer a comparison for a department without an earlier allocation", () => {
    expect(compareAllocation(null, 100000)).toMatchObject({ previousMinor: null, changeMinor: null, percentageChange: null });
  });
});
