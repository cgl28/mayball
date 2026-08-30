import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  revalidatePath: vi.fn(),
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
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
        })),
      })),
    })),
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  recordOtherRevenueReceiptAction,
  saveOtherRevenueForecastAction,
} from "@/app/events/[eventId]/revenue/actions";

function forecastFormData() {
  const formData = new FormData();
  formData.set("eventId", "event-id");
  formData.set("title", "Sponsor");
  formData.set("category", "sponsorship");
  formData.set("forecastGross", "120.00");
  formData.set("vatTreatment", "standard");
  formData.set("vatRate", "20");
  formData.set("expectedDate", "2027-05-01");
  return formData;
}

const existingItem = {
  id: "other-id",
  event_id: "event-id",
  title: "Sponsor",
  category: "sponsorship",
  owner_user_id: "owner-id",
  forecast_net_minor: 10000,
  forecast_vat_minor: 2000,
  forecast_gross_minor: 12000,
  vat_rate: 20,
  vat_treatment: "standard",
  expected_date: "2027-05-01",
  received_date: null,
  status: "confirmed",
  notes: "Expected",
};

describe("Stage 23.1.1 other revenue actions", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.redirect.mockClear();
  });

  it("creates other revenue as a forecast-only row with reconciled amounts", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: null });

    await expect(saveOtherRevenueForecastAction(forecastFormData())).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).toHaveBeenCalledWith("save_other_revenue_item", expect.objectContaining({
      p_forecast_net_minor: 10000,
      p_forecast_vat_minor: 2000,
      p_forecast_gross_minor: 12000,
      p_actual_net_minor: 0,
      p_actual_vat_minor: 0,
      p_actual_gross_minor: 0,
      p_received_date: undefined,
      p_status: "forecast",
    }));
    expect(mocks.redirect).toHaveBeenLastCalledWith("/events/event-id/revenue?saved=1");
  });

  it("records a receipt without changing the existing forecast or owner", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: existingItem, error: null });
    mocks.rpc.mockResolvedValueOnce({ error: null });
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("itemId", "other-id");
    formData.set("actualGross", "90.00");
    formData.set("receivedDate", "2027-05-02");

    await expect(recordOtherRevenueReceiptAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).toHaveBeenCalledWith("save_other_revenue_item", expect.objectContaining({
      p_item_id: "other-id",
      p_forecast_gross_minor: 12000,
      p_actual_net_minor: 7500,
      p_actual_vat_minor: 1500,
      p_actual_gross_minor: 9000,
      p_owner_user_id: "owner-id",
      p_received_date: "2027-05-02",
      p_status: "received",
    }));
  });

  it("keeps an already partially received item's status when amending it", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { ...existingItem, status: "part_received" }, error: null });
    mocks.rpc.mockResolvedValueOnce({ error: null });
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("itemId", "other-id");
    formData.set("actualGross", "100.00");
    formData.set("receivedDate", "2027-05-02");

    await expect(recordOtherRevenueReceiptAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).toHaveBeenCalledWith("save_other_revenue_item", expect.objectContaining({ p_status: "part_received" }));
  });
});
