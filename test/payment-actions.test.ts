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

import { recordPaymentAction } from "@/app/events/[eventId]/payments/actions";

describe("payment server actions", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.redirect.mockClear();
  });

  it("rejects a malicious payment payload whose gross does not match selected allocations", async () => {
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("paymentDate", "2027-05-01");
    formData.set("payee", "Stage Supplier");
    formData.set("method", "bank_transfer");
    formData.set("gross", "700.00");
    formData.append("componentId", "component-a");
    formData.set("selected_component-a", "on");
    formData.set("gross_component-a", "300.00");

    await expect(recordPaymentAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenLastCalledWith(
      expect.stringContaining("Allocation%20totals%20must%20equal%20the%20payment%20gross%20amount."),
    );
  });
});
