import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  redirect: vi.fn((url: string) => {
    const error = new Error("NEXT_REDIRECT");
    Object.assign(error, { digest: "NEXT_REDIRECT", url });
    throw error;
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "user-id" } } })) },
    rpc: mocks.rpc,
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { recordTicketSnapshotAction } from "@/app/events/[eventId]/revenue/actions";

function snapshotFormData() {
  const formData = new FormData();
  formData.set("eventId", "event-id");
  formData.set("capturedAt", "2027-03-01T12:00");
  formData.set("ticketsSold", "15");
  formData.set("grossSales", "2500.00");
  formData.set("refunds", "0.00");
  formData.set("bookingFees", "0.00");
  formData.set("source", "manual_ticket_tailor");
  formData.append("ticketTypeId", "ticket-standard");
  formData.append("ticketTypeId", "ticket-dining");
  formData.set("quantity_ticket-standard", "10");
  formData.set("gross_ticket-standard", "1500.00");
  formData.set("quantity_ticket-dining", "5");
  formData.set("gross_ticket-dining", "1000.00");
  return formData;
}

describe("Stage 23.2 ticket snapshot action", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.redirect.mockClear();
  });

  it("accepts a complete ticket-type breakdown only when it reconciles to headline totals", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: null });

    await expect(recordTicketSnapshotAction(snapshotFormData())).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).toHaveBeenCalledWith("record_ticket_sales_snapshot", expect.objectContaining({
      p_tickets_sold_to_date: 15,
      p_gross_sales_minor: 250000,
      p_breakdown: [
        { ticket_type_id: "ticket-standard", quantity_to_date: 10, gross_sales_minor: 150000 },
        { ticket_type_id: "ticket-dining", quantity_to_date: 5, gross_sales_minor: 100000 },
      ],
    }));
    expect(mocks.redirect).toHaveBeenLastCalledWith("/events/event-id/revenue?recorded=1");
  });

  it("rejects contradictory ticket-type gross totals before calling the RPC", async () => {
    const formData = snapshotFormData();
    formData.set("gross_ticket-dining", "900.00");

    await expect(recordTicketSnapshotAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenLastCalledWith(expect.stringContaining("Ticket-type%20breakdown%20gross%20sales%20must%20equal"));
  });

  it("rejects a partial breakdown rather than storing a second conflicting source", async () => {
    const formData = snapshotFormData();
    formData.delete("gross_ticket-dining");

    await expect(recordTicketSnapshotAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenLastCalledWith(expect.stringContaining("Each%20ticket%20breakdown%20row%20needs%20both"));
  });
});
