import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "president-id" } } })) },
    rpc: mocks.rpc,
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { issueInvitationAction } from "@/app/events/actions";

describe("Stage 23.1 invitation validation", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.revalidatePath.mockReset();
  });

  it("rejects a browser payload with no explicitly selected role", async () => {
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("email", "invitee@example.test");

    await expect(issueInvitationAction({ ok: false, message: "" }, formData)).resolves.toEqual({
      ok: false,
      message: "Please select a role.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires a department for an intended committee member", async () => {
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("email", "invitee@example.test");
    formData.append("roles", "committee_member");

    await expect(issueInvitationAction({ ok: false, message: "" }, formData)).resolves.toEqual({
      ok: false,
      message: "Please select a department.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps a valid committee invitation on the normal RPC path", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ invitation_token: "safe-token" }],
      error: null,
    });
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("email", "invitee@example.test");
    formData.append("roles", "committee_member");
    formData.append("departments", "department-id");

    await expect(issueInvitationAction({ ok: false, message: "" }, formData)).resolves.toEqual({
      ok: true,
      message: "Invitation created. Email delivery is not configured.",
      token: "safe-token",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("issue_invitation", expect.objectContaining({
      p_roles: ["committee_member"],
      p_department_ids: ["department-id"],
    }));
  });
});
