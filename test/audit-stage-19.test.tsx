import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityPanel } from "@/components/activity-panel";
import type { ActivityFeedRow } from "@/lib/activity/data";

function row(overrides: Partial<ActivityFeedRow> = {}): ActivityFeedRow {
  return {
    activity_id: 1,
    event_id: "event-id",
    actor_user_id: "user-id",
    actor_display_name: "Terry Treasurer",
    actor_preferred_name: null,
    action: "request.approved",
    category: "request",
    entity_type: "spending_request",
    entity_id: "request-id",
    summary: "Spending request DMB_AE_6 approved",
    visibility: "committee",
    created_at: "2026-08-30T09:42:00Z",
    auditCategory: "requests",
    context: {
      request: { code: "DMB_AE_6", title: "Fireworks", departmentName: "Entertainment" },
    },
    ...overrides,
  };
}

describe("Stage 19 audit activity", () => {
  it("renders a linked, human-readable request audit item with actor and timestamp", () => {
    render(<ActivityPanel eventId="event-id" rows={[row()]} count={1} page={1} pageSize={30} readOnly={false} />);

    expect(screen.getByText("approved a spending request")).toBeInTheDocument();
    expect(screen.getByTitle("Terry Treasurer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DMB_AE_6 — Fireworks" })).toHaveAttribute("href", "/events/event-id/requests/request-id");
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
    expect(screen.getByText(/30 Aug 2026/)).toBeInTheDocument();
    expect(screen.queryByText("request.approved")).not.toBeInTheDocument();
  });

  it("shows authoritative payment amounts and contextual document and lifecycle activity", () => {
    render(
      <ActivityPanel
        eventId="event-id"
        count={3}
        page={1}
        pageSize={30}
        readOnly={false}
        rows={[
          row({
            activity_id: 2,
            action: "payment.recorded",
            category: "payment",
            entity_type: "payment",
            entity_id: "payment-id",
            auditCategory: "payments",
            context: { payment: { code: "PAY_1", payee: "Fireworks Ltd", grossMinor: 125000 } },
          }),
          row({
            activity_id: 3,
            action: "document.finalised",
            category: "document",
            entity_type: "document",
            entity_id: "document-id",
            auditCategory: "documents",
            context: { document: { category: "invoice", filename: "fireworks.pdf", requestCode: "DMB_AE_6", requestId: "request-id" } },
          }),
          row({
            activity_id: 4,
            action: "event.lifecycle_progressed",
            category: "event",
            entity_type: "event",
            entity_id: "event-id",
            auditCategory: "lifecycle",
            context: { lifecycle: { fromStatus: "planning", toStatus: "live" } },
          }),
        ]}
      />,
    );

    expect(screen.getByText("£1,250.00 cash payment")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PAY_1 — Fireworks Ltd" })).toHaveAttribute("href", "/events/event-id/payments/payment-id");
    expect(screen.getByRole("link", { name: "Invoice — fireworks.pdf" })).toHaveAttribute("href", "/events/event-id/requests/request-id");
    expect(screen.getByText("Planning → Live")).toBeInTheDocument();
  });

  it("keeps category/date filters and pagination in the audit URL", () => {
    render(<ActivityPanel eventId="event-id" rows={[row()]} count={31} page={1} pageSize={30} category="payments" fromDate="2026-08-01" toDate="2026-08-31" readOnly={false} />);

    expect(screen.getByLabelText("Activity type")).toHaveValue("payments");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "?page=2&category=payments&fromDate=2026-08-01&toDate=2026-08-31");
  });

  it("uses a finance-focused empty state", () => {
    render(<ActivityPanel eventId="event-id" rows={[]} count={0} page={1} pageSize={30} readOnly={false} />);

    expect(screen.getByText("No financial activity has been recorded yet.")).toBeInTheDocument();
  });
});
