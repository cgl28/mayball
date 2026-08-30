import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityPanel } from "@/components/activity-panel";
import { DocumentsPanel, RequestDocumentsSection, RequestEvidenceList } from "@/components/documents-panel";
import { ExportsPanel } from "@/components/exports-panel";
import type { ActivityFeedRow } from "@/lib/activity/data";
import type { VisibleDocument } from "@/lib/documents/data";
import { escapeCsvValue, moneyMinorToDecimal, toCsv } from "@/lib/exports/csv";

function document(overrides: Partial<VisibleDocument> = {}): VisibleDocument {
  return {
    document_id: "document-id",
    event_id: "event-id",
    request_id: "request-id",
    request_code: "DMB_AE_1",
    revision_id: "revision-id",
    revision_number: 1,
    revision_status: "draft",
    payment_id: null,
    payment_code: null,
    original_filename: "quote.pdf",
    mime_type: "application/pdf",
    size_bytes: 12345,
    category: "quote",
    status: "finalised",
    visibility_scope: "private_draft",
    description: "Supplier quote",
    uploaded_by: "user-id",
    uploaded_by_display_name: "Pat President",
    uploaded_by_preferred_name: null,
    created_at: "2027-01-01T10:00:00Z",
    finalized_at: "2027-01-01T10:01:00Z",
    voided_at: null,
    voided_by: null,
    voided_by_display_name: null,
    void_reason: null,
    ...overrides,
  };
}

const activity: ActivityFeedRow = {
  activity_id: 1,
  event_id: "event-id",
  actor_user_id: "user-id",
  actor_display_name: "Terry Treasurer",
  actor_preferred_name: null,
  action: "document.finalised",
  category: "document",
  entity_type: "document",
  entity_id: "document-id",
  summary: "Document uploaded for DMB_AE_1",
  visibility: "private_owner",
  created_at: "2027-01-01T10:01:00Z",
};

describe("Stage 10 documents, activity and exports", () => {
  it("lists document metadata without exposing private object paths", () => {
    render(
      <DocumentsPanel
        eventId="event-id"
        documents={[document()]}
        count={1}
        page={1}
        pageSize={25}
        canUpload
        canVoid
        readOnly={false}
      />,
    );

    expect(screen.getByText("quote.pdf")).toBeInTheDocument();
    expect(screen.getByText("Supplier quote")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.queryByText("application/pdf")).not.toBeInTheDocument();
    expect(screen.getByText("Private draft")).toBeInTheDocument();
    expect(screen.getByText(/short-lived signed access/i)).toBeInTheDocument();
    expect(screen.queryByText(/object_path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/documents\//i)).not.toBeInTheDocument();
  });

  it("shows request upload controls for stable request evidence", () => {
    render(
      <RequestDocumentsSection
        eventId="event-id"
        requestId="request-id"
        documents={[document()]}
        canUpload
        canVoid
        readOnly={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Upload document" })).toBeInTheDocument();
    expect(screen.getByText("Void document")).toBeInTheDocument();
    expect(screen.getByText("Quote · PDF · 13 KB")).toBeInTheDocument();
    expect(screen.queryByText("Parent")).not.toBeInTheDocument();
    expect(screen.getByText(/remains available across revisions/)).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("request-id").some((element) => element.getAttribute("name") === "requestId")).toBe(true);
    expect(screen.queryByDisplayValue("revision-id")).not.toBeInTheDocument();
  });

  it("keeps historical and voided documents visible but read-only", () => {
    render(
      <RequestDocumentsSection
        eventId="event-id"
        requestId="request-id"
        documents={[document({ status: "voided", void_reason: "Duplicate upload" })]}
        canUpload={false}
        canVoid={false}
        readOnly
      />,
    );

    expect(screen.getByText(/Existing documents can be downloaded/)).toBeInTheDocument();
    expect(screen.getByText("Voided: Duplicate upload")).toBeInTheDocument();
    expect(screen.queryByText("Upload document")).not.toBeInTheDocument();
    expect(screen.queryByText("Void document")).not.toBeInTheDocument();
  });

  it("presents stable request evidence with an on-demand open action", () => {
    render(<RequestEvidenceList eventId="event-id" documents={[document({ revision_id: null, revision_number: null })]} />);

    expect(screen.getByText("Supporting documents")).toBeInTheDocument();
    expect(screen.getByText(/quote.pdf/)).toBeInTheDocument();
    expect(screen.getByText("Quote · PDF · 13 KB")).toBeInTheDocument();
    expect(screen.queryByText("application/pdf")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open quote.pdf" })).toHaveAttribute("href", "/events/event-id/documents/document-id/download");
  });

  it("renders activity feed entries without raw metadata leakage", () => {
    render(<ActivityPanel eventId="event-id" rows={[activity]} count={1} page={1} pageSize={30} readOnly={false} />);

    expect(screen.getByText(/uploaded a document/)).toBeInTheDocument();
    expect(screen.getByTitle("Terry Treasurer")).toBeInTheDocument();
    expect(screen.queryByText(/object_path/i)).not.toBeInTheDocument();
  });

  it("labels exports and warns that ticket snapshots are cumulative history rows", () => {
    render(<ExportsPanel eventId="event-id" readOnly />);

    expect(screen.getByText("Ticket-sales snapshot history")).toBeInTheDocument();
    expect(screen.getByText(/do not add them together/i)).toBeInTheDocument();
    expect(screen.getAllByText("Download").length).toBeGreaterThan(5);
    expect(screen.getByText(/Historical exports are read-only/)).toBeInTheDocument();
  });

  it("escapes CSV values and formats money without JavaScript floating point arithmetic", () => {
    const csv = toCsv(
      [{ title: "@hidden", amount_minor: -12345, note: "Line\nbreak" }],
      [
        { key: "title", header: "Title" },
        { key: "amount_minor", header: "Amount", kind: "money_minor" },
        { key: "note", header: "Note" },
      ],
    );

    expect(moneyMinorToDecimal(-12345)).toBe("-123.45");
    expect(escapeCsvValue("@hidden")).toBe('"\'@hidden"');
    expect(csv).toContain('"\'@hidden"');
    expect(csv).toContain('"-123.45"');
    expect(csv).toContain('"Line\nbreak"');
  });
});
