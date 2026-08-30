import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateTicketPriceBreakdown } from "@/lib/revenue/ticket-pricing";

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
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-id" } } })),
    },
    rpc: mocks.rpc,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { saveTicketTypeAction } from "@/app/events/[eventId]/revenue/actions";

describe("revenue ticket type action", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.redirect.mockClear();
  });

  it("derives reconciled net and VAT values from the simplified gross-price form", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: null });
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("name", "Standard");
    formData.set("grossPrice", "150.00");
    formData.set("maximumQuantity", "1000");
    formData.set("forecastQuantity", "800");
    formData.set("vatTreatment", "standard");
    formData.set("vatRate", "20.00");
    formData.set("isActive", "on");

    await expect(saveTicketTypeAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).toHaveBeenCalledWith("save_ticket_type", expect.objectContaining({
      p_name: "Standard",
      p_net_price_minor: 12500,
      p_vat_minor: 2500,
      p_gross_price_minor: 15000,
      p_vat_rate: 20,
      p_maximum_quantity: 1000,
      p_forecast_quantity: 800,
    }));
    expect(mocks.redirect).toHaveBeenLastCalledWith("/events/event-id/revenue?saved=1");
  });

  it("passes an existing ticket type ID to the update-capable RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: null });
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("ticketTypeId", "ticket-standard");
    formData.set("name", "Standard revised");
    formData.set("grossPrice", "180.00");
    formData.set("maximumQuantity", "1200");
    formData.set("forecastQuantity", "1100");
    formData.set("vatTreatment", "standard");
    formData.set("vatRate", "20.00");
    formData.set("isActive", "on");

    await expect(saveTicketTypeAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).toHaveBeenCalledWith("save_ticket_type", expect.objectContaining({
      p_ticket_type_id: "ticket-standard",
      p_name: "Standard revised",
      p_gross_price_minor: 18000,
    }));
  });

  it("keeps the prior net/VAT/gross mismatch out of the RPC payload", () => {
    expect(calculateTicketPriceBreakdown({
      grossMinor: 15000,
      vatRate: 20,
      vatTreatment: "standard",
    })).toEqual({
      netMinor: 12500,
      vatMinor: 2500,
      grossMinor: 15000,
      vatRate: 20,
    });
  });

  it("returns an actionable validation error before calling the RPC", async () => {
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("name", "Standard");
    formData.set("grossPrice", "150.00");
    formData.set("maximumQuantity", "100");
    formData.set("forecastQuantity", "101");
    formData.set("vatTreatment", "standard");

    await expect(saveTicketTypeAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenLastCalledWith(
      expect.stringContaining("Forecast%20sales%20cannot%20exceed%20the%20maximum%20available."),
    );
  });
});
