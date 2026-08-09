import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PaymentDetailPanel,
  PaymentFormPanel,
  PaymentsPanel,
  RequestPaymentsPanel,
} from "@/components/payments-panel";
import type {
  ComponentPaymentPosition,
  PaymentAllocationDetail,
  PaymentDetail,
  PaymentFormData,
  PaymentsData,
  RequestPaymentPosition,
} from "@/lib/payments/data";

const requestPosition: RequestPaymentPosition = {
  request_id: "request-a",
  event_id: "event-id",
  code: "DMB_AE_3",
  approved_revision_id: "revision-a",
  approved_revision_number: 1,
  approved_net_minor: 600000,
  approved_gross_minor: 720000,
  paid_gross_minor: 240000,
  outstanding_gross_minor: 480000,
  payment_status: "partially_paid",
};

const componentPosition: ComponentPaymentPosition = {
  event_id: "event-id",
  request_id: "request-a",
  request_code: "DMB_AE_3",
  revision_id: "revision-a",
  revision_number: 1,
  request_component_id: "component-a",
  component_code: "DMB_AE_3.1",
  description: "Staging deposit",
  expected_payment_date: "2027-05-05",
  supplier_name: "Stage Supplier",
  approved_net_minor: 600000,
  approved_vat_minor: 120000,
  approved_gross_minor: 720000,
  paid_gross_minor: 240000,
  outstanding_gross_minor: 480000,
  payment_status: "partially_paid",
};

const payment: PaymentDetail = {
  payment_id: "payment-a",
  event_id: "event-id",
  code: "PAY-2027-0001",
  payment_date: "2027-03-01",
  net_minor: null,
  vat_minor: null,
  gross_minor: 240000,
  bank_reference: "BANK-001",
  method: "bank_transfer",
  payee: "Stage Supplier",
  note: "Deposit paid",
  status: "recorded",
  entered_by: "treasurer-id",
  entered_by_display_name: "Terry Treasurer",
  reversed_at: null,
  reversed_by: null,
  reversed_by_display_name: null,
  reversal_reason: null,
  created_at: "2027-03-01T12:00:00Z",
  allocation_count: 1,
  allocated_gross_minor: 240000,
  request_codes: "DMB_AE_3",
};

const allocation: PaymentAllocationDetail = {
  payment_allocation_id: "allocation-a",
  event_id: "event-id",
  payment_id: "payment-a",
  payment_code: "PAY-2027-0001",
  payment_date: "2027-03-01",
  payment_status: "recorded",
  request_id: "request-a",
  request_code: "DMB_AE_3",
  request_component_id: "component-a",
  component_code: "DMB_AE_3.1",
  component_description: "Staging deposit",
  revision_id: "revision-a",
  revision_number: 1,
  net_minor: null,
  vat_minor: null,
  gross_minor: 240000,
  created_at: "2027-03-01T12:00:00Z",
};

const data: PaymentsData = {
  payments: [payment],
  requestPositions: [requestPosition],
  workload: [{ ...componentPosition, effective_due_date: "2027-05-05", due_date_source: "component", urgency: "future" }],
  componentPositions: [componentPosition],
  summary: {
    event_id: "event-id",
    recorded_gross_minor: 240000,
    reversed_gross_minor: 0,
    recorded_payment_count: 1,
    reversed_payment_count: 0,
  },
  operationalSummary: {
    approvedGrossMinor: 720000,
    paidGrossMinor: 240000,
    outstandingGrossMinor: 480000,
    futureOutstandingGrossMinor: 480000,
    overdueGrossMinor: 0,
    dueSoonGrossMinor: 0,
    noDueDateCount: 0,
    approvedComponentCount: 1,
  },
  workloadView: "outstanding",
  workloadPage: 1,
  workloadPageSize: 25,
  workloadCount: 1,
};

describe("Stage 7 payment panels", () => {
  it("shows derived payment positions and treasurer payment controls", () => {
    render(<PaymentsPanel eventId="event-id" data={data} canManage readOnly={false} />);

    expect(screen.getByText("Payments")).toBeInTheDocument();
    expect(screen.getAllByText("Record payment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DMB_AE_3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Partially Paid").length).toBeGreaterThan(0);
    expect(screen.getByText("Staging deposit")).toBeInTheDocument();
    expect(screen.getByText("Outstanding approved")).toBeInTheDocument();
    expect(screen.getByText("Payment workload state")).toBeInTheDocument();
    expect(screen.getByText("PAY-2027-0001")).toBeInTheDocument();
  });

  it("links workload record-payment actions to the specific component", () => {
    render(<PaymentsPanel eventId="event-id" data={data} canManage readOnly={false} />);

    const links = screen.getAllByRole("link", { name: "Record payment" });
    expect(links.some((link) => link.getAttribute("href") === "/events/event-id/requests/request-a/payments/new?componentId=component-a")).toBe(true);
  });

  it("shows workload legend and puts record-payment before history in workload actions", () => {
    render(<PaymentsPanel eventId="event-id" data={data} canManage readOnly={false} />);

    expect(screen.getByLabelText("Payment workload legend")).toBeInTheDocument();
    expect(screen.getByText("Future outstanding")).toBeInTheDocument();
    expect(screen.getByText("Due within 14 days")).toBeInTheDocument();

    const row = screen.getByText("Staging deposit").closest("tr");
    expect(row).not.toBeNull();
    const actions = within(row as HTMLElement).getAllByRole("link");
    expect(actions.map((action) => action.textContent)).toEqual(expect.arrayContaining(["Record payment", "History"]));
    expect(actions.findIndex((action) => action.textContent === "Record payment")).toBeLessThan(
      actions.findIndex((action) => action.textContent === "History"),
    );
  });

  it("uses matching static pastel colours for workload bar segments and legend cards", () => {
    const { container } = render(
      <PaymentsPanel
        eventId="event-id"
        data={{
          ...data,
          operationalSummary: {
            ...data.operationalSummary,
            approvedGrossMinor: 1000000,
            paidGrossMinor: 250000,
            outstandingGrossMinor: 750000,
            futureOutstandingGrossMinor: 250000,
            dueSoonGrossMinor: 250000,
            overdueGrossMinor: 250000,
          },
        }}
        canManage
        readOnly={false}
      />,
    );

    const paid = container.querySelectorAll('[data-workload-tone="paid"]');
    const future = container.querySelectorAll('[data-workload-tone="future"]');
    const dueSoon = container.querySelectorAll('[data-workload-tone="dueSoon"]');
    const overdue = container.querySelectorAll('[data-workload-tone="overdue"]');

    expect(paid[0]).toHaveClass("bg-emerald-200");
    expect(paid[0]).toHaveClass("h-full", "shrink-0");
    expect(paid[1]).toHaveClass("border-emerald-300", "bg-emerald-50", "text-emerald-950");
    expect(future[0]).toHaveClass("bg-sky-200");
    expect(future[1]).toHaveClass("border-sky-300", "bg-sky-50", "text-sky-950");
    expect(dueSoon[0]).toHaveClass("bg-amber-200");
    expect(dueSoon[1]).toHaveClass("border-amber-300", "bg-amber-50", "text-amber-950");
    expect(overdue[0]).toHaveClass("bg-red-200");
    expect(overdue[1]).toHaveClass("border-red-300", "bg-red-50", "text-red-950");

    expect(paid[0]).toHaveStyle({ width: "25%" });
    expect(paid[0]).toHaveStyle({ flexBasis: "25%" });
    expect(future[0]).toHaveStyle({ width: "25%" });
    expect(dueSoon[0]).toHaveStyle({ width: "25%" });
    expect(overdue[0]).toHaveStyle({ width: "25%" });
  });

  it("keeps zero-value workload segments visually zero-width while retaining the legend item", () => {
    const { container } = render(<PaymentsPanel eventId="event-id" data={data} canManage readOnly={false} />);

    const overdue = container.querySelectorAll('[data-workload-tone="overdue"]');
    expect(overdue[0]).toHaveClass("bg-red-200");
    expect(overdue[0]).toHaveStyle({ width: "0%", flexBasis: "0%" });
    expect(overdue[1]).toHaveTextContent("Overdue");
    expect(overdue[1]).toHaveTextContent("£0.00");
    expect(overdue[1]).toHaveTextContent("0.0%");
  });

  it("renders urgency help definitions in a modal with the 14-day window", () => {
    render(<PaymentsPanel eventId="event-id" data={data} canManage readOnly={false} />);

    fireEvent.click(screen.getByLabelText("Payment urgency definitions"));

    expect(screen.getByRole("dialog", { name: "Payment urgency" })).toBeInTheDocument();
    expect(screen.getByText("Payment urgency")).toBeInTheDocument();
    expect(screen.getByText("Due within the next 14 days and still has an outstanding balance.")).toBeInTheDocument();
    expect(screen.getByText("No outstanding balance remains.")).toBeInTheDocument();
    expect(screen.getByText("If a component has no explicit due date, the event date is used. Partial payment does not remove overdue or due-soon urgency while money remains outstanding.")).toBeInTheDocument();
  });

  it("hides mutation controls for ordinary committee members", () => {
    render(<PaymentsPanel eventId="event-id" data={data} canManage={false} readOnly={false} />);

    expect(screen.queryByText("Record payment")).not.toBeInTheDocument();
    expect(screen.getByText("Recorded payments")).toBeInTheDocument();
  });

  it("keeps reversed payments visible in the ledger but separates them from workload status", () => {
    render(
      <PaymentsPanel
        eventId="event-id"
        data={{ ...data, payments: [{ ...payment, status: "reversed" }] }}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText("Recorded payments")).toBeInTheDocument();
    expect(screen.getByText("reversed")).toBeInTheDocument();
    expect(screen.getAllByText("Partially Paid").length).toBeGreaterThan(0);
  });

  it("shows due-date urgency without marking paid components overdue", () => {
    render(
      <PaymentsPanel
        eventId="event-id"
        data={{
          ...data,
          workload: [
            { ...componentPosition, request_component_id: "overdue", component_code: "DMB_AE_3.1", expected_payment_date: "2026-01-01", effective_due_date: "2026-01-01", due_date_source: "component", urgency: "overdue" },
            { ...componentPosition, request_component_id: "paid", component_code: "DMB_AE_3.2", expected_payment_date: "2026-01-01", effective_due_date: "2026-01-01", due_date_source: "component", outstanding_gross_minor: 0, payment_status: "paid", urgency: "paid" },
          ],
          workloadCount: 2,
        }}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paid").length).toBeGreaterThan(0);
  });

  it("hides workload payment actions for historical read-only events", () => {
    render(<PaymentsPanel eventId="event-id" data={data} canManage readOnly />);

    expect(screen.queryByRole("link", { name: "Record payment" })).not.toBeInTheDocument();
    expect(screen.getByText("This historical event is read-only. Payment records are shown for reference.")).toBeInTheDocument();
  });

  it("shows historical read-only state without reversal controls", () => {
    render(
      <PaymentDetailPanel
        eventId="event-id"
        data={{ payment, allocations: [allocation] }}
        canManage
        readOnly
      />,
    );

    expect(screen.getByText("This historical event is read-only. Payment records are shown for reference.")).toBeInTheDocument();
    expect(screen.queryByText("Reverse payment")).not.toBeInTheDocument();
  });

  it("renders a payment form with current approved component allocations", () => {
    const formData: PaymentFormData = {
      requestPositions: [requestPosition],
      componentPositions: [componentPosition],
    };

    render(<PaymentFormPanel eventId="event-id" data={formData} />);

    expect(screen.getByLabelText("Payee")).toBeInTheDocument();
    expect(screen.getByText("DMB_AE_3 / DMB_AE_3.1")).toBeInTheDocument();
    expect(screen.getByText("Payment amount")).toBeInTheDocument();
    expect(screen.getByText("£4,800.00")).toBeInTheDocument();
    expect(screen.getByLabelText("Allocate DMB_AE_3.1")).toBeChecked();
    expect(screen.getByLabelText("Allocate now")).toHaveValue("4800.00");
    expect(screen.queryByLabelText("Gross amount")).not.toBeInTheDocument();
    expect(screen.queryByText(/idempotency/i)).not.toBeInTheDocument();
  });

  it("preselects a direct component payment and leaves sibling components unselected", () => {
    const finalComponent: ComponentPaymentPosition = {
      ...componentPosition,
      request_component_id: "component-b",
      component_code: "DMB_AE_3.2",
      description: "Final Payment",
      approved_gross_minor: 400000,
      paid_gross_minor: 0,
      outstanding_gross_minor: 400000,
      payment_status: "unpaid",
    };
    const formData: PaymentFormData = {
      requestPositions: [requestPosition],
      componentPositions: [componentPosition, finalComponent],
      selectedComponentId: "component-a",
    };

    render(<PaymentFormPanel eventId="event-id" requestId="request-a" data={formData} />);

    expect(screen.getByText("Selected component")).toBeInTheDocument();
    expect(screen.getAllByText("Staging deposit").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Allocate DMB_AE_3.1")).toBeChecked();
    expect(screen.getByLabelText("Allocate DMB_AE_3.2")).not.toBeChecked();
    const allocationInputs = screen.getAllByLabelText("Allocate now");
    expect(allocationInputs[0]).toHaveValue("4800.00");
    expect(allocationInputs[1]).toBeDisabled();
    expect(allocationInputs[0].closest("div")).toHaveClass("min-w-0");
  });

  it("keeps request-detail component selection editable and derives payment gross from checked allocations", () => {
    const finalComponent: ComponentPaymentPosition = {
      ...componentPosition,
      request_component_id: "component-b",
      component_code: "DMB_AE_3.2",
      description: "Final Payment",
      approved_gross_minor: 400000,
      paid_gross_minor: 0,
      outstanding_gross_minor: 400000,
      payment_status: "unpaid",
    };
    const formData: PaymentFormData = {
      requestPositions: [requestPosition],
      componentPositions: [componentPosition, finalComponent],
    };

    render(<PaymentFormPanel eventId="event-id" requestId="request-a" data={formData} />);

    expect(screen.getByText("£0.00")).toBeInTheDocument();
    expect(screen.getByText("Select at least one component to record a payment.")).toBeInTheDocument();
    expect(screen.getByLabelText("Allocate DMB_AE_3.1")).not.toBeChecked();
    expect(screen.getByLabelText("Allocate DMB_AE_3.2")).not.toBeChecked();

    fireEvent.click(screen.getByLabelText("Allocate DMB_AE_3.1"));
    expect(screen.getByText("£4,800.00")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Allocate DMB_AE_3.2"));
    expect(screen.getByText("£8,800.00")).toBeInTheDocument();

    const allocationInputs = screen.getAllByLabelText("Allocate now");
    fireEvent.change(allocationInputs[1], { target: { value: "2000.00" } });
    expect(screen.getByText("£6,800.00")).toBeInTheDocument();
    expect(screen.queryByLabelText("Gross amount")).not.toBeInTheDocument();
  });

  it("shows the event date as the due-date fallback when a component date is missing", () => {
    render(
      <PaymentsPanel
        eventId="event-id"
        data={{
          ...data,
          workload: [
            {
              ...componentPosition,
              expected_payment_date: null,
              effective_due_date: "2027-06-18",
              due_date_source: "event",
              urgency: "future",
            },
          ],
        }}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText("18 Jun 2027")).toBeInTheDocument();
    expect(screen.getByText("Event date")).toBeInTheDocument();
  });

  it("shows request-specific component status and immutable allocation history", () => {
    render(
      <RequestPaymentsPanel
        eventId="event-id"
        requestId="request-a"
        position={requestPosition}
        components={[componentPosition]}
        allocations={[allocation]}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText("Request payments")).toBeInTheDocument();
    expect(screen.getByText("Current approved components")).toBeInTheDocument();
    expect(screen.getByText("PAY-2027-0001")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
  });

  it("shows an empty form state when no approved unpaid components exist", () => {
    render(<PaymentFormPanel eventId="event-id" data={{ requestPositions: [], componentPositions: [] }} />);

    expect(screen.getByText("No approved unpaid components are available for this payment.")).toBeInTheDocument();
  });

  it("does not expose raw invitation or payment operation tokens in list output", () => {
    render(<PaymentsPanel eventId="event-id" data={data} canManage readOnly={false} />);

    expect(screen.queryByText(/stage7-|idempotency|token/i)).not.toBeInTheDocument();
  });
});
