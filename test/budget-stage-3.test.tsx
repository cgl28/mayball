import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BudgetEditor } from "@/components/budget-editor";
import { BudgetPanel } from "@/components/budget-panel";
import { formatMinor, parseMoneyToMinor } from "@/lib/money";
import type { BudgetOverview } from "@/lib/budget/data";

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
});
