import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinancesPanel } from "@/components/finances-panel";
import type { FinancesData } from "@/lib/finances/data";
import { makeEventAccess } from "@/test/fixtures";

const data: FinancesData = {
  departments: [
    {
      event_id: "event-id",
      department_id: "dep-food",
      department_name: "Food",
      department_code: "FOOD",
      display_order: 1,
      budget_version_id: "budget-id",
      active_budget_version_number: 1,
      original_allocation_minor: 4200000,
      transfers_received_minor: 0,
      transfers_released_minor: 0,
      current_budget_minor: 4200000,
      has_active_allocation: true,
      approved_net_minor: 2840000,
      approved_gross_minor: 3408000,
      pending_net_minor: 335000,
      pending_gross_minor: 402000,
      visible_draft_request_count: 1,
      visible_draft_net_minor: 100000,
      visible_draft_gross_minor: 120000,
      remaining_approved_minor: 1360000,
      potential_remaining_minor: 1025000,
      approved_over_budget: false,
      potential_over_budget: false,
    },
    {
      event_id: "event-id",
      department_id: "dep-drinks",
      department_name: "Drinks",
      department_code: "DRINKS",
      display_order: 2,
      budget_version_id: "budget-id",
      active_budget_version_number: 1,
      original_allocation_minor: 2000000,
      transfers_received_minor: 0,
      transfers_released_minor: 0,
      current_budget_minor: 2000000,
      has_active_allocation: true,
      approved_net_minor: 0,
      approved_gross_minor: 0,
      pending_net_minor: 0,
      pending_gross_minor: 0,
      visible_draft_request_count: 0,
      visible_draft_net_minor: 0,
      visible_draft_gross_minor: 0,
      remaining_approved_minor: 2000000,
      potential_remaining_minor: 2000000,
      approved_over_budget: false,
      potential_over_budget: false,
    },
  ],
  selectedDepartment: null,
  wholeEvent: {
    budgetNetMinor: 6200000,
    approvedNetMinor: 2840000,
    approvedPaidNetMinor: 1000000,
    approvedUnpaidNetMinor: 1840000,
    submittedNetMinor: 335000,
    remainingNetMinor: 3025000,
    paidGrossMinor: 1200000,
  },
  requests: [
    {
      requestId: "request-approved",
      revisionId: "revision-approved",
      reference: "DMB_FOOD_1",
      title: "Dinner supplier",
      supplier: "Cambridge Catering",
      ownerName: "Alex Food",
      approvalStatus: "approved",
      paymentStatus: "partially_paid",
      netMinor: 2840000,
      vatMinor: 568000,
      grossMinor: 3408000,
      paidGrossMinor: 1200000,
      outstandingGrossMinor: 2208000,
      updatedAt: "2027-02-01T12:00:00Z",
      isDraft: false,
      vatRecoverable: true,
    },
    {
      requestId: "request-submitted",
      revisionId: "revision-submitted",
      reference: "DMB_FOOD_2",
      title: "Late night snacks",
      supplier: null,
      ownerName: "Sam Snacks",
      approvalStatus: "submitted",
      paymentStatus: "not_applicable",
      netMinor: 335000,
      vatMinor: 67000,
      grossMinor: 402000,
      paidGrossMinor: 0,
      outstandingGrossMinor: 0,
      updatedAt: "2027-02-03T12:00:00Z",
      isDraft: false,
      vatRecoverable: true,
    },
  ],
  totals: {
    requestCount: 2,
    totalNetMinor: 3175000,
    totalVatMinor: 635000,
    totalGrossMinor: 3810000,
    approvedNetMinor: 2840000,
    submittedNetMinor: 335000,
    recoverableVatMinor: 568000,
    approvedGrossMinor: 3408000,
    paidGrossMinor: 1200000,
    outstandingGrossMinor: 2208000,
    approvedPaidNetMinor: 1000000,
    approvedUnpaidNetMinor: 1840000,
  },
};

const selectedData: FinancesData = {
  ...data,
  selectedDepartment: data.departments[0],
};

describe("FinancesPanel", () => {
  it("renders department tabs with the selected department active", () => {
    render(<FinancesPanel eventAccess={makeEventAccess()} data={selectedData} canCreateRequest canManageSetup approvalStatus="all" paymentStatus="all" />);

    const tabs = screen.getByRole("tablist", { name: "Departments" });
    expect(within(tabs).getByRole("tab", { name: "Food" })).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "Drinks" })).toHaveAttribute("aria-selected", "false");
  });

  it("shows distinct net, VAT, gross, paid and remaining metrics", () => {
    render(<FinancesPanel eventAccess={makeEventAccess()} data={selectedData} canCreateRequest canManageSetup approvalStatus="all" paymentStatus="all" />);

    expect(screen.getByText("Current budget")).toBeInTheDocument();
    expect(screen.getByText("Whole-event budget use")).toBeInTheDocument();
    expect(screen.getByText("Food budget use")).toBeInTheDocument();
    expect(screen.getAllByText("Approved and paid").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Approved but unpaid").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Submitted exposure").length).toBeGreaterThan(1);
    expect(screen.getByText("£42,000.00")).toBeInTheDocument();
    expect(screen.getAllByText("Approved commitments").length).toBeGreaterThan(1);
    expect(screen.getAllByText("£28,400.00").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Approved outstanding").length).toBeGreaterThan(1);
    expect(screen.getAllByText("£18,400.00").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Submitted exposure").length).toBeGreaterThan(1);
    expect(screen.getByText("Recoverable VAT")).toBeInTheDocument();
    expect(screen.getAllByText("£5,680.00").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Cash paid to date").length).toBeGreaterThan(1);
    expect(screen.getAllByText("£12,000.00").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/net budget basis/).length).toBeGreaterThan(1);
  });

  it("renders request rows with separate approval and payment badges", () => {
    render(<FinancesPanel eventAccess={makeEventAccess()} data={selectedData} canCreateRequest canManageSetup approvalStatus="all" paymentStatus="all" />);

    expect(screen.getByText("DMB_FOOD_1")).toBeInTheDocument();
    expect(screen.getByText("Dinner supplier")).toBeInTheDocument();
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Partially Paid").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Submitted").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Not Applicable").length).toBeGreaterThan(1);
  });

  it("filters request rows by approval status", () => {
    render(<FinancesPanel eventAccess={makeEventAccess()} data={selectedData} canCreateRequest canManageSetup approvalStatus="submitted" paymentStatus="all" />);

    expect(screen.queryByText("Dinner supplier")).not.toBeInTheDocument();
    expect(screen.getByText("Late night snacks")).toBeInTheDocument();
  });

  it("shows the historical read-only banner", () => {
    render(
      <FinancesPanel
        eventAccess={makeEventAccess({ event: { status: "completed" }, accessMode: "historical", isReadOnly: true })}
        data={selectedData}
        canCreateRequest={false}
        canManageSetup={false}
      />,
    );

    expect(screen.getByText("Read-only historical finances")).toBeInTheDocument();
    expect(screen.queryByText("Create Request")).not.toBeInTheDocument();
  });

  it("handles no departments with setup link for presidents", () => {
    render(<FinancesPanel eventAccess={makeEventAccess({ roles: ["president"] })} data={{ ...selectedData, departments: [], selectedDepartment: null, requests: [] }} canCreateRequest canManageSetup />);

    expect(screen.getByText("No departments have been configured for this event.")).toBeInTheDocument();
    expect(screen.getByText("Open Departments setup")).toBeInTheDocument();
  });
});
