import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApprovalQueuePanel, ApprovalReviewPanel } from "@/components/approvals-panel";
import type {
  ApprovalQueueData,
  ApprovalReviewData,
  ApprovalQueueRow,
} from "@/lib/approvals/data";
import type { SpendingRequestDetail } from "@/lib/requests/data";

const queueRow: ApprovalQueueRow = {
  request_id: "request-id",
  event_id: "event-id",
  code: "DMB_AE_2",
  owner_user_id: "member-a",
  owner_display_name: "Alex Aesthetics",
  owner_preferred_name: null,
  primary_department_id: "dep-ae",
  primary_department_name: "Aesthetics",
  primary_department_code: "AE",
  approval_status: "submitted",
  revision_id: "revision-id",
  revision_number: 1,
  title: "Floral arch",
  supplier_name: "Cambridge Florals",
  net_minor: 400000,
  vat_minor: 80000,
  gross_minor: 480000,
  submitted_at: "2027-02-01T12:00:00Z",
  request_type: "initial",
  can_decide: true,
};

const queueData: ApprovalQueueData = {
  queue: [
    queueRow,
    {
      ...queueRow,
      request_id: "variation-id",
      revision_id: "variation-revision",
      code: "DMB_AE_3",
      title: "Expanded arch",
      approval_status: "variation_pending",
      request_type: "variation",
      gross_minor: 600000,
    },
  ],
  departments: [{ id: "dep-ae", name: "Aesthetics", code: "AE" }],
};

const detail: SpendingRequestDetail = {
  request: {
    request_id: "request-id",
    event_id: "event-id",
    code: "DMB_AE_2",
    owner_user_id: "member-a",
    owner_display_name: "Alex Aesthetics",
    owner_preferred_name: null,
    primary_department_id: "dep-ae",
    primary_department_name: "Aesthetics",
    primary_department_code: "AE",
    approval_status: "submitted",
    current_draft_revision_id: null,
    current_approved_revision_id: null,
    request_submitted_at: "2027-02-01T12:00:00Z",
    request_created_at: "2027-01-01T12:00:00Z",
    request_updated_at: "2027-02-01T12:00:00Z",
    revision_id: "revision-id",
    revision_number: 1,
    revision_status: "submitted",
    title: "Floral arch",
    description: "Entrance florals",
    business_justification: "Sets entrance identity",
    supplier_name: "Cambridge Florals",
    expected_payment_date: "2027-05-20",
    net_minor: 400000,
    vat_minor: 80000,
    gross_minor: 480000,
    vat_rate: 20,
    vat_treatment: "standard",
    vat_recoverable: true,
    revision_submitted_at: "2027-02-01T12:00:00Z",
    revision_created_at: "2027-01-01T12:00:00Z",
    revision_updated_at: "2027-02-01T12:00:00Z",
    can_edit_draft: false,
  },
  allocations: [
    {
      id: "allocation-id",
      event_id: "event-id",
      revision_id: "revision-id",
      department_id: "dep-ae",
      net_minor: 400000,
      vat_minor: 80000,
      gross_minor: 480000,
    },
  ],
  components: [
    {
      id: "component-id",
      event_id: "event-id",
      revision_id: "revision-id",
      sequence_number: 1,
      code: "DMB_AE_2.1",
      description: "Floral arch",
      expected_payment_date: "2027-05-20",
      supplier_name: "Cambridge Florals",
      net_minor: 400000,
      vat_minor: 80000,
      gross_minor: 480000,
      vat_rate: 20,
      vat_treatment: "standard",
    },
  ],
  departments: [{ id: "dep-ae", name: "Aesthetics", code: "AE", display_order: 1, is_active: true }],
};

const reviewData: ApprovalReviewData = {
  detail,
  impacts: [
    {
      event_id: "event-id",
      request_id: "request-id",
      revision_id: "revision-id",
      request_type: "initial",
      department_id: "dep-ae",
      department_name: "Aesthetics",
      department_code: "AE",
      current_budget_minor: 2500000,
      approved_net_minor: 2000000,
      baseline_net_minor: 0,
      proposed_net_minor: 400000,
      incremental_net_minor: 400000,
      potential_remaining_after_minor: 100000,
      over_budget: false,
    },
  ],
  eventContext: {
    event_id: "event-id",
    forecast_net_revenue_minor: 20000000,
    total_cost_budget_minor: 9800000,
    unallocated_contingency_minor: 1500000,
    approved_net_spending_minor: 2000000,
    pending_net_spending_minor: 400000,
    formal_net_position_minor: 18000000,
    potential_net_position_minor: 17600000,
  },
  revisions: [
    {
      request_id: "request-id",
      event_id: "event-id",
      request_code: "DMB_AE_2",
      current_draft_revision_id: null,
      current_approved_revision_id: null,
      approval_status: "submitted",
      revision_id: "revision-id",
      revision_number: 1,
      revision_status: "submitted",
      title: "Floral arch",
      description: "Entrance florals",
      business_justification: "Sets entrance identity",
      supplier_name: "Cambridge Florals",
      expected_payment_date: "2027-05-20",
      net_minor: 400000,
      vat_minor: 80000,
      gross_minor: 480000,
      vat_treatment: "standard",
      change_summary: null,
      created_by: "member-a",
      created_by_display_name: "Alex Aesthetics",
      created_by_preferred_name: null,
      created_at: "2027-01-01T12:00:00Z",
      submitted_at: "2027-02-01T12:00:00Z",
      decided_at: null,
      is_current_draft: false,
      is_current_approved: false,
      is_pending_review: true,
    },
  ],
  reviews: [],
};

describe("Stage 6 approval panels", () => {
  it("shows populated approval queue and initial versus variation labels", () => {
    render(<ApprovalQueuePanel eventId="event-id" data={queueData} />);

    expect(screen.getByText("Approval queue")).toBeInTheDocument();
    expect(screen.getByText("Floral arch")).toBeInTheDocument();
    expect(screen.getByText("Expanded arch")).toBeInTheDocument();
    expect(screen.getByText("initial")).toBeInTheDocument();
    expect(screen.getByText("variation")).toBeInTheDocument();
  });

  it("shows empty queue state", () => {
    render(<ApprovalQueuePanel eventId="event-id" data={{ ...queueData, queue: [] }} />);

    expect(screen.getByText("No requests are awaiting treasurer review.")).toBeInTheDocument();
  });

  it("filters the queue by variation type", () => {
    render(<ApprovalQueuePanel eventId="event-id" data={queueData} requestType="variation" />);

    expect(screen.getByText("Expanded arch")).toBeInTheDocument();
    expect(screen.queryByText("Floral arch")).not.toBeInTheDocument();
  });

  it("shows review detail, department impact and decision controls for treasurer", () => {
    render(<ApprovalReviewPanel eventId="event-id" data={reviewData} canDecide readOnly={false} />);

    expect(screen.getByText("Submitted proposal")).toBeInTheDocument();
    expect(screen.getByText("Department impact")).toBeInTheDocument();
    expect(screen.getByText("Event approval context")).toBeInTheDocument();
    expect(screen.getByText("Formal net position")).toBeInTheDocument();
    expect(screen.getAllByText("approved").length).toBeGreaterThan(1);
    expect(screen.getAllByText("rejected").length).toBeGreaterThan(1);
    expect(screen.getAllByText("changes requested").length).toBeGreaterThan(1);
    expect(screen.getByText(/Approval does not mean paid/)).toBeInTheDocument();
  });

  it("shows over-budget warning with text, not colour alone", () => {
    render(
      <ApprovalReviewPanel
        eventId="event-id"
        data={{
          ...reviewData,
          impacts: [{ ...reviewData.impacts[0], over_budget: true, potential_remaining_after_minor: -1000 }],
        }}
        canDecide
        readOnly={false}
      />,
    );

    expect(screen.getByText(/over its current approved budget/)).toBeInTheDocument();
    expect(screen.getByText(/does not transfer contingency automatically/)).toBeInTheDocument();
  });

  it("hides decision controls for historical read-only views", () => {
    render(<ApprovalReviewPanel eventId="event-id" data={reviewData} canDecide={false} readOnly />);

    expect(screen.getByText(/historical event is read-only/)).toBeInTheDocument();
    expect(screen.queryByText("Decision")).not.toBeInTheDocument();
  });

  it("shows variation incremental effect", () => {
    render(
      <ApprovalReviewPanel
        eventId="event-id"
        data={{
          ...reviewData,
          detail: {
            ...detail,
            request: {
              ...detail.request,
              approval_status: "variation_pending",
              current_approved_revision_id: "approved-revision",
              revision_number: 2,
            },
          },
          impacts: [{ ...reviewData.impacts[0], request_type: "variation", baseline_net_minor: 300000, proposed_net_minor: 400000, incremental_net_minor: 100000 }],
          revisions: [
            {
              ...reviewData.revisions[0],
              revision_id: "approved-revision",
              revision_number: 1,
              revision_status: "approved",
              title: "Original arch",
              net_minor: 300000,
              vat_minor: 60000,
              gross_minor: 360000,
              is_current_approved: true,
              is_pending_review: false,
            },
            {
              ...reviewData.revisions[0],
              revision_number: 2,
              approval_status: "variation_pending",
              current_approved_revision_id: "approved-revision",
            },
          ],
        }}
        canDecide
        readOnly={false}
      />,
    );

    expect(screen.getByText("variation")).toBeInTheDocument();
    expect(screen.getByText("Revision comparison")).toBeInTheDocument();
    expect(screen.getByText(/incremental increase over the approved baseline/)).toBeInTheDocument();
  });

  it("renders review history and safe success/error messages", () => {
    render(
      <ApprovalReviewPanel
        eventId="event-id"
        data={{
          ...reviewData,
          reviews: [
            {
              review_id: "review-id",
              event_id: "event-id",
              request_id: "request-id",
              revision_id: "revision-id",
              revision_number: 1,
              reviewer_user_id: "treasurer-id",
              reviewer_display_name: "Terry Treasurer",
              reviewer_preferred_name: null,
              decision: "changes_requested",
              reason: "Please add another quote",
              created_at: "2027-02-02T12:00:00Z",
            },
          ],
        }}
        canDecide={false}
        readOnly={false}
        decided="changes_requested"
      />,
    );

    expect(screen.getByText("Decision recorded: changes requested.")).toBeInTheDocument();
    expect(screen.getByText("Please add another quote")).toBeInTheDocument();
  });
});
