import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    const error = new Error("NEXT_REDIRECT");
    Object.assign(error, { digest: "NEXT_REDIRECT", url });
    throw error;
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "treasurer-id" } } })) },
    rpc: mocks.rpc,
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { decideSpendingRequestAction } from "@/app/events/[eventId]/approvals/actions";

describe("approval server actions", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.redirect.mockClear();
  });

  it("redirects to the fresh approval detail without broad cache invalidation", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: null });
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("requestId", "request-id");
    formData.set("revisionId", "revision-id");
    formData.set("decision", "approved");

    await expect(decideSpendingRequestAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).toHaveBeenCalledWith("decide_spending_request", {
      p_request_id: "request-id",
      p_revision_id: "revision-id",
      p_decision: "approved",
      p_reason: undefined,
    });
    expect(mocks.redirect).toHaveBeenLastCalledWith("/events/event-id/approvals/request-id?decided=approved");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
