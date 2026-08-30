import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequestsListPanel } from "@/components/requests-panel";
import { ReimbursementForm } from "@/components/reimbursement-form";
import type { RequestDepartment, RequestDocumentEvidence, RequestListRow } from "@/lib/requests/data";

const departments: RequestDepartment[] = [{ id: "dept", name: "Food", code: "FOOD", display_order: 1, is_active: true }];
const reimbursement: RequestListRow = {
  request_id: "request", event_id: "event", code: "DMB_FOOD_1", title: "Emergency supplies", owner_display_name: "Cameron", owner_preferred_name: null,
  primary_department_id: "dept", primary_department_name: "Food", primary_department_code: "FOOD", approval_status: "draft", gross_minor: 8450,
  request_kind: "member_reimbursement", request_updated_at: "2026-08-30T12:00:00Z", revision_status: "draft", can_edit_draft: true,
};

describe("Stage 21 reimbursements", () => {
  it("offers a dedicated expense entry point and labels reimbursement rows", () => {
    render(<RequestsListPanel eventId="event" requests={[reimbursement]} departments={departments} canCreate readOnly={false} />);
    expect(screen.getByRole("link", { name: "Submit expense" })).toHaveAttribute("href", "/events/event/requests/reimbursement/new");
    expect(screen.getByText("REIMBURSEMENT")).toBeInTheDocument();
  });

  it("keeps the reimbursement form to claim fields and explains the evidence requirements", () => {
    render(<ReimbursementForm eventId="event" departments={departments} />);
    expect(screen.getByLabelText("Expense description")).toBeInTheDocument();
    expect(screen.getByLabelText("Expense date")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount paid (gross)")).toBeInTheDocument();
    expect(screen.getByText(/expense claim form and at least one receipt are required before submission/i)).toBeInTheDocument();
    expect(screen.queryByText(/supplier or proposed supplier/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/add instalment/i)).not.toBeInTheDocument();
  });

  it("uses claim-form and receipt evidence badges instead of an invoice requirement", () => {
    const evidence: RequestDocumentEvidence = { request_id: "request", claimFormPresent: true, receiptPresent: true, invoicePresent: false };
    render(<RequestsListPanel eventId="event" requests={[reimbursement]} departments={departments} documentEvidence={[evidence]} canCreate readOnly={false} />);
    expect(screen.getByTitle("Claim Form attached")).toBeInTheDocument();
    expect(screen.getByTitle("Receipt attached")).toBeInTheDocument();
    expect(screen.queryByTitle("Invoice not attached")).not.toBeInTheDocument();
  });
});
