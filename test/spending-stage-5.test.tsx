import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  RequestDetailPanel,
  RequestEditor,
  RequestsListPanel,
} from "@/components/requests-panel";
import type {
  RequestAllocation,
  RequestComponent,
  RequestDepartment,
  RequestSummary,
  SpendingRequestDetail,
} from "@/lib/requests/data";

const departments: RequestDepartment[] = [
  { id: "dep-ae", name: "Aesthetics", code: "AE", display_order: 1, is_active: true },
  { id: "dep-me", name: "Music", code: "ME", display_order: 2, is_active: true },
  { id: "dep-sec", name: "Security", code: "SEC", display_order: 3, is_active: true },
];

function request(overrides: Partial<RequestSummary> = {}): RequestSummary {
  return {
    request_id: "request-a",
    event_id: "event-id",
    code: "DMB_AE_1",
    owner_user_id: "member-a",
    owner_display_name: "Member A",
    owner_preferred_name: "Asha",
    primary_department_id: "dep-ae",
    primary_department_name: "Aesthetics",
    primary_department_code: "AE",
    approval_status: "draft",
    current_draft_revision_id: "revision-a",
    current_approved_revision_id: null,
    revision_id: "revision-a",
    revision_number: 1,
    revision_status: "draft",
    title: "Lighting deposit",
    description: "Initial production payment",
    business_justification: "Required to reserve supplier.",
    supplier_name: "LX Supplier",
    expected_payment_date: "2027-04-01",
    net_minor: 100000,
    vat_minor: 20000,
    gross_minor: 120000,
    vat_rate: 20,
    vat_treatment: "standard",
    vat_recoverable: true,
    request_submitted_at: null,
    request_created_at: "2026-07-18T00:00:00Z",
    request_updated_at: "2026-07-18T00:00:00Z",
    revision_submitted_at: null,
    revision_created_at: "2026-07-18T00:00:00Z",
    revision_updated_at: "2026-07-18T00:00:00Z",
    can_edit_draft: true,
    ...overrides,
  };
}

const allocations: RequestAllocation[] = [
  {
    id: "allocation-a",
    event_id: "event-id",
    revision_id: "revision-a",
    department_id: "dep-ae",
    net_minor: 70000,
    vat_minor: 14000,
    gross_minor: 84000,
  },
  {
    id: "allocation-b",
    event_id: "event-id",
    revision_id: "revision-a",
    department_id: "dep-me",
    net_minor: 30000,
    vat_minor: 6000,
    gross_minor: 36000,
  },
];

const components: RequestComponent[] = [
  {
    id: "component-a",
    event_id: "event-id",
    revision_id: "revision-a",
    sequence_number: 1,
    code: "DMB_AE_1-C1",
    description: "Deposit",
    expected_payment_date: "2027-03-01",
    supplier_name: "LX Supplier",
    net_minor: 40000,
    vat_minor: 8000,
    gross_minor: 48000,
    vat_rate: 20,
    vat_treatment: "standard",
  },
  {
    id: "component-b",
    event_id: "event-id",
    revision_id: "revision-a",
    sequence_number: 2,
    code: "DMB_AE_1-C2",
    description: "Balance",
    expected_payment_date: "2027-04-01",
    supplier_name: "LX Supplier",
    net_minor: 60000,
    vat_minor: 12000,
    gross_minor: 72000,
    vat_rate: 20,
    vat_treatment: "standard",
  },
];

function detail(overrides: Partial<RequestSummary> = {}): SpendingRequestDetail {
  return {
    request: request(overrides),
    allocations,
    components,
    departments,
  };
}

function simpleDetail(overrides: Partial<RequestSummary> = {}): SpendingRequestDetail {
  const row = request(overrides);
  return {
    request: row,
    allocations: [
      {
        id: "allocation-single",
        event_id: "event-id",
        revision_id: "revision-a",
        department_id: row.primary_department_id ?? "dep-ae",
        net_minor: row.net_minor ?? 0,
        vat_minor: row.vat_minor ?? 0,
        gross_minor: row.gross_minor ?? 0,
      },
    ],
    components: [
      {
        id: "component-single",
        event_id: "event-id",
        revision_id: "revision-a",
        sequence_number: 1,
        code: "DMB_AE_1.1",
        description: "Full payment",
        expected_payment_date: row.expected_payment_date,
        supplier_name: row.supplier_name,
        net_minor: row.net_minor ?? 0,
        vat_minor: row.vat_minor ?? 0,
        gross_minor: row.gross_minor ?? 0,
        vat_rate: row.vat_rate ?? null,
        vat_treatment: row.vat_treatment ?? "unknown",
      },
    ],
    departments,
  };
}

describe("Stage 5 spending request panels", () => {
  it("shows an empty state and a create action for active committee members", () => {
    render(
      <RequestsListPanel
        eventId="event-id"
        requests={[]}
        departments={departments}
        canCreate
        readOnly={false}
      />,
    );

    expect(screen.getByText("No spending requests are visible to you for this event.")).toBeInTheDocument();
    expect(screen.getByText("New request")).toBeInTheDocument();
  });

  it("renders only the RLS-visible request rows passed to the list", () => {
    render(
      <RequestsListPanel
        eventId="event-id"
        requests={[
          request(),
          request({
            request_id: "request-submitted",
            code: "DMB_AE_2",
            title: "Submitted supplier",
            approval_status: "submitted",
            revision_status: "submitted",
            can_edit_draft: false,
          }),
        ]}
        departments={departments}
        canCreate
        readOnly={false}
      />,
    );

    expect(screen.getByText("Lighting deposit")).toBeInTheDocument();
    expect(screen.getByText("Submitted supplier")).toBeInTheDocument();
    expect(screen.queryByText("Member B private draft")).not.toBeInTheDocument();
  });

  it("filters mine, status and department views without adding hidden records", () => {
    const rows = [
      request(),
      request({
        request_id: "request-submitted",
        code: "DMB_ME_1",
        title: "Music quote",
        primary_department_id: "dep-me",
        primary_department_name: "Music",
        primary_department_code: "ME",
        approval_status: "submitted",
        revision_status: "submitted",
        can_edit_draft: false,
      }),
    ];

    render(
      <RequestsListPanel
        eventId="event-id"
        requests={rows}
        departments={departments}
        canCreate={false}
        readOnly={false}
        status="draft"
      />,
    );

    expect(screen.getByText("Lighting deposit")).toBeInTheDocument();
    expect(screen.queryByText("Music quote")).not.toBeInTheDocument();
  });

  it("shows detail reconciliation, draft edit and review controls for the owner", () => {
    render(
      <RequestDetailPanel
        eventId="event-id"
        detail={detail()}
        canEdit
        readOnly={false}
      />,
    );

    expect(screen.getByText("Lighting deposit")).toBeInTheDocument();
    expect(screen.getByText("Allocated £1,200.00 of £1,200.00 gross.")).toBeInTheDocument();
    expect(screen.getByText("Components total £1,200.00 of £1,200.00 gross.")).toBeInTheDocument();
    expect(screen.getByText("Edit draft")).toBeInTheDocument();
    expect(screen.getByText("Review and submit")).toBeInTheDocument();
    expect(screen.getByText("Payment status")).toBeInTheDocument();
    expect(screen.getByText("Not applicable until approval")).toBeInTheDocument();
  });

  it("does not expose edit or submit controls to a treasurer viewing another member's draft", () => {
    render(
      <RequestDetailPanel
        eventId="event-id"
        detail={detail({ can_edit_draft: false })}
        canEdit={false}
        readOnly={false}
      />,
    );

    expect(screen.getByText("Lighting deposit")).toBeInTheDocument();
    expect(screen.queryByText("Edit draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Review and submit")).not.toBeInTheDocument();
  });

  it("renders submitted requests as immutable and still visible", () => {
    render(
      <RequestDetailPanel
        eventId="event-id"
        detail={detail({
          approval_status: "submitted",
          revision_status: "submitted",
          can_edit_draft: true,
        })}
        canEdit={false}
        readOnly={false}
        submitted
      />,
    );

    expect(screen.getByText("Request submitted for treasurer review.")).toBeInTheDocument();
    expect(screen.queryByText("Edit draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Review and submit")).not.toBeInTheDocument();
  });

  it("shows a read-only banner for historical spending requests", () => {
    render(
      <RequestDetailPanel
        eventId="event-id"
        detail={detail({
          approval_status: "submitted",
          revision_status: "submitted",
          can_edit_draft: false,
        })}
        canEdit={false}
        readOnly
      />,
    );

    expect(screen.getByText(/historical event is read-only/)).toBeInTheDocument();
    expect(screen.queryByText("Edit draft")).not.toBeInTheDocument();
  });

  it("renders the review-and-submit confirmation without approval language", () => {
    render(
      <RequestDetailPanel
        eventId="event-id"
        detail={detail()}
        canEdit
        readOnly={false}
        review
      />,
    );

    expect(screen.getByText(/does not approve the request/)).toBeInTheDocument();
    expect(screen.getByText("Submit for treasurer review")).toBeInTheDocument();
  });

  it("renders the simplified draft editor for a normal single-department request", () => {
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    expect(screen.getByText("Edit DMB_AE_1")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Lighting deposit");
    expect(screen.getByLabelText("Department")).toHaveValue("dep-ae");
    expect(screen.getByLabelText("Description")).toBeRequired();
    expect(screen.queryByText("Department allocations")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Business justification")).not.toBeInTheDocument();
    expect(screen.getByText("Payment Components")).toBeInTheDocument();
    expect(screen.getByText("Component 1")).toBeInTheDocument();
    expect(screen.getByText("Fully allocated")).toBeInTheDocument();
    expect(screen.getByText("Save Draft")).toBeInTheDocument();
    expect(screen.getByText("Submit Request")).toBeInTheDocument();
  });

  it("preselects the default department when one active department membership is unambiguous", () => {
    render(<RequestEditor eventId="event-id" departments={departments} defaultDepartmentId="dep-me" />);

    expect(screen.getByLabelText("Department")).toHaveValue("dep-me");
    expect(screen.queryByText("Select the department responsible for this request.")).not.toBeInTheDocument();
  });

  it("calculates VAT from gross with integer-safe displayed values", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} defaultDepartmentId="dep-ae" />);

    await user.clear(screen.getByLabelText("Gross amount"));
    await user.type(screen.getByLabelText("Gross amount"), "12000");
    await user.click(screen.getByRole("button", { name: "Compute from Gross" }));

    expect(screen.getByLabelText("Net amount")).toHaveValue("10000.00");
    expect(screen.getByLabelText("VAT amount")).toHaveValue("2000.00");
    expect(screen.getByLabelText("Gross amount")).toHaveValue("12000.00");
  });

  it("adds editable payment components and shows reconciliation status", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));

    expect(screen.getByText("Component 2")).toBeInTheDocument();
    expect(screen.getByText("Split Equally")).toBeInTheDocument();
    expect(screen.getByText("50 / 50")).toBeInTheDocument();
    expect(screen.getAllByText("Allocate Remaining")).toHaveLength(2);
  });

  it("prevents destructive editing of existing multi-department drafts", () => {
    render(<RequestEditor eventId="event-id" departments={departments} detail={detail()} />);

    expect(screen.getByText("Edit DMB_AE_1")).toBeInTheDocument();
    expect(screen.getByText("This draft uses multiple department allocations.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    expect(screen.getByText("Back to request")).toBeInTheDocument();
  });

  it("shows safe errors without raw database internals", () => {
    render(<RequestEditor eventId="event-id" departments={departments} error="Department allocations do not reconcile" />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Department allocations do not reconcile")).toBeInTheDocument();
    expect(alert).not.toHaveTextContent("SQLSTATE");
  });
});
