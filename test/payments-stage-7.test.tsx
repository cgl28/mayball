import { render, screen } from "@testing-library/react";
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
  componentPositions: [componentPosition],
  summary: {
    event_id: "event-id",
    recorded_gross_minor: 240000,
    reversed_gross_minor: 0,
    recorded_payment_count: 1,
    reversed_payment_count: 0,
  },
};

describe("Stage 7 payment panels", () => {
  it("shows derived payment positions and treasurer payment controls", () => {
    render(<PaymentsPanel eventId="event-id" data={data} canManage readOnly={false} />);

    expect(screen.getByText("Payments")).toBeInTheDocument();
    expect(screen.getByText("Record payment")).toBeInTheDocument();
    expect(screen.getAllByText("DMB_AE_3").length).toBeGreaterThan(0);
    expect(screen.getByText("Partially Paid")).toBeInTheDocument();
    expect(screen.getByText("PAY-2027-0001")).toBeInTheDocument();
  });

  it("hides mutation controls for ordinary committee members", () => {
    render(<PaymentsPanel eventId="event-id" data={data} canManage={false} readOnly={false} />);

    expect(screen.queryByText("Record payment")).not.toBeInTheDocument();
    expect(screen.getByText("Payment history")).toBeInTheDocument();
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
    expect(screen.getAllByDisplayValue("4800.00")).toHaveLength(2);
    expect(screen.queryByText(/idempotency/i)).not.toBeInTheDocument();
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
