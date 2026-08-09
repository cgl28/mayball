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
    currentRevisionChangeSummary: null,
    latestChangeRequestReview: null,
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
    currentRevisionChangeSummary: null,
    latestChangeRequestReview: null,
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

  it("surfaces a returned request and lets the owner continue editing the cloned draft", () => {
    render(
      <RequestDetailPanel
        eventId="event-id"
        detail={{
          ...simpleDetail({
            approval_status: "changes_requested",
            current_draft_revision_id: "revision-returned",
            revision_id: "revision-returned",
            revision_number: 2,
            revision_status: "draft",
            can_edit_draft: true,
          }),
          latestChangeRequestReview: {
            reason: "Please confirm the final supplier quote.",
            reviewer_display_name: "Terry Treasurer",
            reviewer_preferred_name: null,
            created_at: "2027-02-02T12:00:00Z",
          },
        }}
        canEdit
        readOnly={false}
      />,
    );

    expect(screen.getByText("Changes requested")).toBeInTheDocument();
    expect(screen.getByText("The Treasurer has requested changes before this request can be approved.")).toBeInTheDocument();
    expect(screen.getByText("Please confirm the final supplier quote.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit returned request" })).toHaveAttribute(
      "href",
      "/events/event-id/requests/request-a/edit",
    );
    expect(screen.getByRole("link", { name: "Review and submit" })).toBeInTheDocument();
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
    expect(screen.getByText(/Component 1/)).toBeInTheDocument();
    expect(screen.getByText("Fully allocated")).toBeInTheDocument();
    expect(screen.getByText("Save Draft")).toBeInTheDocument();
    expect(screen.getByText("Submit Request")).toBeInTheDocument();
  });

  it("renders the returned changes-requested draft editor with treasurer instructions prefilled", () => {
    render(
      <RequestEditor
        eventId="event-id"
        departments={departments}
        detail={{
          ...simpleDetail({
            approval_status: "changes_requested",
            current_draft_revision_id: "revision-returned",
            revision_id: "revision-returned",
            revision_number: 2,
            revision_status: "draft",
            can_edit_draft: true,
          }),
          currentRevisionChangeSummary: "Please confirm the final supplier quote.",
          latestChangeRequestReview: {
            reason: "Please confirm the final supplier quote.",
            reviewer_display_name: "Terry Treasurer",
            reviewer_preferred_name: null,
            created_at: "2027-02-02T12:00:00Z",
          },
        }}
      />,
    );

    expect(screen.getByText("Changes requested")).toBeInTheDocument();
    expect(screen.getAllByText("Please confirm the final supplier quote.").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Title")).toHaveValue("Lighting deposit");
    expect(screen.getByLabelText("Change summary")).toHaveValue("Please confirm the final supplier quote.");
    expect(screen.getByText("Save Draft")).toBeInTheDocument();
    expect(screen.getByText("Submit Request")).toBeInTheDocument();
  });

  it("keeps approved-request variation drafts editable without using the changes-requested path", () => {
    render(
      <RequestEditor
        eventId="event-id"
        departments={departments}
        detail={{
          ...simpleDetail({
            approval_status: "approved",
            current_draft_revision_id: "revision-variation",
            current_approved_revision_id: "revision-approved",
            revision_id: "revision-variation",
            revision_number: 2,
            revision_status: "draft",
            can_edit_draft: true,
          }),
          currentRevisionChangeSummary: "Variation proposed",
        }}
      />,
    );

    expect(screen.queryByText("Changes requested")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Lighting deposit");
    expect(screen.getByLabelText("Change summary")).toHaveValue("Variation proposed");
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
    await user.click(screen.getAllByRole("button", { name: "Compute from Gross" })[0]);

    expect(screen.getByLabelText("Net amount")).toHaveValue("10000.00");
    expect(screen.getByLabelText("VAT amount")).toHaveValue("2000.00");
    expect(screen.getByLabelText("Gross amount")).toHaveValue("12000.00");
  });

  it("adds editable payment components and shows reconciliation status", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));

    expect(screen.getByText(/Component 2/)).toBeInTheDocument();
    expect(screen.getByText("50 / 50")).toBeInTheDocument();
    expect(screen.getByText("20 / 80")).toBeInTheDocument();
    expect(screen.getByText("10 / 90")).toBeInTheDocument();
    expect(screen.getAllByText("Allocate Remaining")).toHaveLength(2);
  });

  it("starts new requests with one full-payment component and a clear due date field", () => {
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    expect(screen.getByText(/Component 1 - Full payment/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Full payment")).toHaveAttribute("name", "componentDescription_1");
    expect(screen.getByLabelText("Due date")).toBeInTheDocument();
    expect(screen.queryByLabelText("Expected payment date")).not.toBeInTheDocument();
  });

  it("gates payment components until parent request totals reconcile", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} defaultDepartmentId="dep-ae" />);

    await user.clear(screen.getByLabelText("Gross amount"));
    await user.type(screen.getByLabelText("Gross amount"), "2000.00");

    expect(screen.getByText("Complete the request totals above before creating the payment schedule.")).toBeInTheDocument();
    expect(screen.queryByText(/Component 1 - Full payment/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Component" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Compute from Gross" }));

    expect(screen.getByText(/Component 1 - Full payment/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Component" })).toBeEnabled();
  });

  it("renames an untouched full-payment component to deposit when adding a final payment", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));

    expect(screen.getByDisplayValue("Deposit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Final Payment")).toBeInTheDocument();
  });

  it("preserves a custom first component name when adding the final payment", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    const firstName = screen.getByDisplayValue("Full payment");
    await user.clear(firstName);
    await user.type(firstName, "Venue booking fee");
    await user.click(screen.getByRole("button", { name: "Add Component" }));

    expect(screen.getByDisplayValue("Venue booking fee")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Final Payment")).toBeInTheDocument();
  });

  it("adds a third component with an instalment name", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));
    await user.click(screen.getByRole("button", { name: "Add Component" }));

    expect(screen.getByDisplayValue("Instalment 3")).toBeInTheDocument();
  });

  it("computes individual component VAT from gross using the component VAT rate", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} defaultDepartmentId="dep-ae" />);

    await user.clear(screen.getByLabelText("Gross amount"));
    await user.type(screen.getByLabelText("Gross amount"), "120.00");
    await user.click(screen.getByRole("button", { name: "Compute from Gross" }));
    const componentGross = screen.getByLabelText("Gross");
    await user.clear(componentGross);
    await user.type(componentGross, "120.00");
    await user.click(screen.getAllByRole("button", { name: "Compute from Gross" })[1]);

    expect(screen.getByLabelText("Net")).toHaveValue("100.00");
    expect(screen.getByLabelText("VAT")).toHaveValue("20.00");
    expect(componentGross).toHaveValue("120.00");
  });

  it("uses zero VAT treatment defaults for component gross computation", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail({ net_minor: 12000, vat_minor: 0, gross_minor: 12000, vat_treatment: "zero_rated", vat_rate: 0 })} />);

    await user.selectOptions(screen.getAllByLabelText("VAT treatment")[1], "zero_rated");
    const componentGross = screen.getByLabelText("Gross");
    await user.clear(componentGross);
    await user.type(componentGross, "120.00");
    await user.click(screen.getAllByRole("button", { name: "Compute from Gross" })[1]);

    expect(screen.getByLabelText("Net")).toHaveValue("120.00");
    expect(screen.getByLabelText("VAT")).toHaveValue("0.00");
  });

  it("does not render component supplier override controls in the normal workflow", () => {
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    expect(screen.queryByLabelText("Component supplier")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Use a different supplier for this component")).not.toBeInTheDocument();
  });

  it("shows a compatibility note when an existing component has a legacy supplier override", () => {
    render(<RequestEditor eventId="event-id" departments={departments} detail={{
      ...simpleDetail(),
      components: [
        {
          ...simpleDetail().components[0],
          supplier_name: "Legacy component supplier",
        },
      ],
    }} />);

    expect(screen.getAllByText("This legacy component keeps its stored supplier value for compatibility.").length).toBeGreaterThan(0);
  });

  it("allocates the remaining request amount to the selected instalment", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    await user.clear(screen.getByLabelText("Net amount"));
    await user.type(screen.getByLabelText("Net amount"), "1000.00");
    await user.clear(screen.getByLabelText("VAT amount"));
    await user.type(screen.getByLabelText("VAT amount"), "200.00");
    await user.clear(screen.getByLabelText("Gross amount"));
    await user.type(screen.getByLabelText("Gross amount"), "1200.00");
    await user.click(screen.getByRole("button", { name: "Add Component" }));

    const componentNet = screen.getAllByLabelText("Net");
    const componentVat = screen.getAllByLabelText("VAT");
    const componentGross = screen.getAllByLabelText("Gross");
    await user.clear(componentNet[0]);
    await user.type(componentNet[0], "250.00");
    await user.clear(componentVat[0]);
    await user.type(componentVat[0], "50.00");
    await user.clear(componentGross[0]);
    await user.type(componentGross[0], "300.00");

    await user.click(screen.getAllByRole("button", { name: "Allocate Remaining" })[1]);

    expect(componentNet[1]).toHaveValue("750.00");
    expect(componentVat[1]).toHaveValue("150.00");
    expect(componentGross[1]).toHaveValue("900.00");
    expect(screen.getByText("Fully allocated")).toBeInTheDocument();
  });

  it("applies 50/50 with exact component net, VAT and gross reconciliation", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail({ net_minor: 166667, vat_minor: 33333, gross_minor: 200000 })} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));
    await user.click(screen.getByRole("button", { name: "50 / 50" }));

    expect(screen.getAllByLabelText("Gross").map((input) => (input as HTMLInputElement).value)).toEqual(["1000.00", "1000.00"]);
    expect(screen.getAllByLabelText("Net").map((input) => (input as HTMLInputElement).value)).toEqual(["833.33", "833.34"]);
    expect(screen.getAllByLabelText("VAT").map((input) => (input as HTMLInputElement).value)).toEqual(["166.67", "166.66"]);
    expect(screen.getByText("Fully allocated")).toBeInTheDocument();
  });

  it("applies 20/80 and 10/90 split presets from parent totals", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail({ net_minor: 166667, vat_minor: 33333, gross_minor: 200000 })} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));
    await user.click(screen.getByRole("button", { name: "20 / 80" }));

    expect(screen.getAllByLabelText("Gross").map((input) => (input as HTMLInputElement).value)).toEqual(["400.00", "1600.00"]);
    expect(screen.getByText("Fully allocated")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "10 / 90" }));

    expect(screen.getAllByLabelText("Gross").map((input) => (input as HTMLInputElement).value)).toEqual(["200.00", "1800.00"]);
    expect(screen.getByText("Fully allocated")).toBeInTheDocument();
  });

  it("hides two-way split presets when there are three components", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));
    expect(screen.getByRole("button", { name: "50 / 50" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Component" }));

    expect(screen.queryByRole("button", { name: "50 / 50" })).not.toBeInTheDocument();
  });

  it("does not crash when computing one component in the reported three-component split", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail({ net_minor: 33333, vat_minor: 6667, gross_minor: 40000 })} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));
    await user.click(screen.getByRole("button", { name: "Add Component" }));

    const grossInputs = screen.getAllByLabelText("Gross");
    await user.clear(grossInputs[0]);
    await user.type(grossInputs[0], "100.00");
    await user.clear(grossInputs[1]);
    await user.type(grossInputs[1], "200.00");
    await user.clear(grossInputs[2]);
    await user.type(grossInputs[2], "100.00");

    await user.click(screen.getAllByRole("button", { name: "Compute from Gross" })[1]);

    expect(screen.getAllByLabelText("Net").map((input) => (input as HTMLInputElement).value)[0]).toBe("83.33");
    expect(screen.getAllByLabelText("VAT").map((input) => (input as HTMLInputElement).value)[0]).toBe("16.67");
    expect(screen.getByText("Net, VAT and gross component totals must match the request totals.")).toBeInTheDocument();
  });

  it("supports sequential three-component computation without intermediate crashes", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail({ net_minor: 33333, vat_minor: 6667, gross_minor: 40000 })} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));
    await user.click(screen.getByRole("button", { name: "Add Component" }));

    const grossInputs = screen.getAllByLabelText("Gross");
    await user.clear(grossInputs[0]);
    await user.type(grossInputs[0], "100.00");
    await user.clear(grossInputs[1]);
    await user.type(grossInputs[1], "200.00");
    await user.clear(grossInputs[2]);
    await user.type(grossInputs[2], "100.00");

    const computeButtons = screen.getAllByRole("button", { name: "Compute from Gross" });
    await user.click(computeButtons[1]);
    await user.click(computeButtons[2]);
    await user.click(computeButtons[3]);

    expect(screen.getAllByLabelText("Net").map((input) => (input as HTMLInputElement).value)).toEqual(["83.33", "166.67", "83.33"]);
    expect(screen.getAllByLabelText("VAT").map((input) => (input as HTMLInputElement).value)).toEqual(["16.67", "33.33", "16.67"]);
    expect(screen.getByText("Fully allocated")).toBeInTheDocument();
  });

  it("supports reverse-order three-component computation", async () => {
    const user = userEvent.setup();
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail({ net_minor: 33333, vat_minor: 6667, gross_minor: 40000 })} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));
    await user.click(screen.getByRole("button", { name: "Add Component" }));

    const grossInputs = screen.getAllByLabelText("Gross");
    await user.clear(grossInputs[0]);
    await user.type(grossInputs[0], "100.00");
    await user.clear(grossInputs[1]);
    await user.type(grossInputs[1], "200.00");
    await user.clear(grossInputs[2]);
    await user.type(grossInputs[2], "100.00");

    const computeButtons = screen.getAllByRole("button", { name: "Compute from Gross" });
    await user.click(computeButtons[3]);
    await user.click(computeButtons[1]);
    await user.click(computeButtons[2]);

    expect(screen.getAllByLabelText("Net").map((input) => (input as HTMLInputElement).value)).toEqual(["83.33", "166.67", "83.33"]);
    expect(screen.getAllByLabelText("VAT").map((input) => (input as HTMLInputElement).value)).toEqual(["16.67", "33.33", "16.67"]);
    expect(screen.getByText("Fully allocated")).toBeInTheDocument();
  });

  it("reports overallocated and underallocated component states without crashing", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail({ net_minor: 33333, vat_minor: 6667, gross_minor: 40000 })} />);

    await user.click(screen.getByRole("button", { name: "Add Component" }));
    const grossInputs = screen.getAllByLabelText("Gross");
    await user.clear(grossInputs[0]);
    await user.type(grossInputs[0], "100.00");
    await user.clear(grossInputs[1]);
    await user.type(grossInputs[1], "350.00");

    expect(screen.getByText("Components exceed the request total. Reduce component amounts before saving or submitting.")).toBeInTheDocument();

    rerender(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail({ net_minor: 33333, vat_minor: 6667, gross_minor: 40000 })} />);
    await user.click(screen.getByRole("button", { name: "Add Component" }));
    const nextGrossInputs = screen.getAllByLabelText("Gross");
    await user.clear(nextGrossInputs[0]);
    await user.type(nextGrossInputs[0], "100.00");
    await user.clear(nextGrossInputs[1]);
    await user.type(nextGrossInputs[1], "250.00");

    expect(screen.getByText("Payment components are £50.00 short of the request gross total.")).toBeInTheDocument();
  });

  it("uses a light green compute button treatment", () => {
    render(<RequestEditor eventId="event-id" departments={departments} detail={simpleDetail()} />);

    expect(screen.getAllByRole("button", { name: "Compute from Gross" })[0]).toHaveClass("bg-emerald-50");
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

    const alert = screen.getAllByRole("alert")[0];
    expect(within(alert).getByText("Department allocations do not reconcile")).toBeInTheDocument();
    expect(alert).not.toHaveTextContent("SQLSTATE");
  });
});
