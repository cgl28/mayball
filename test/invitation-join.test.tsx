import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InvitationLinkDisplay } from "@/components/invitation-form";
import { JoinEventPanel } from "@/components/join-event-panel";
import {
  invitationPathForToken,
  parseInvitationInput,
} from "@/lib/invitations/parse-invitation-input";
import type { InvitationPreview } from "@/lib/invitations/preview";

const token = "e658fd6eb82cfa6d7db7ed7d2615a9ba96435b8a6297865a36f50fae5cb9b6e4";

const preview: InvitationPreview = {
  event_id: "30000000-0000-0000-0000-000000000027",
  event_name: "Downing May Ball 2027",
  event_year: 2027,
  event_date: "2027-06-20",
  organisation_name: "Downing May Ball",
  invitation_status: "pending",
  expires_at: "2026-10-31T12:00:00Z",
  invited_email: "invitee@example.test",
  roles: ["committee_member", "treasurer"],
  departments: ["Food", "Drinks"],
  already_member: false,
};

describe("invitation input parser", () => {
  it("accepts raw tokens, relative paths, absolute URLs and trailing slashes", () => {
    expect(parseInvitationInput(token)).toEqual({ ok: true, token });
    expect(parseInvitationInput(` /invitations/${token} `)).toEqual({ ok: true, token });
    expect(parseInvitationInput(`https://mayball.vercel.app/invitations/${token}`)).toEqual({
      ok: true,
      token,
    });
    expect(parseInvitationInput(`http://localhost:3000/invitations/${token}/`)).toEqual({
      ok: true,
      token,
    });
  });

  it("rejects unrelated URLs, malformed tokens and unexpected path segments", () => {
    expect(parseInvitationInput("https://example.com/not-an-invitation").ok).toBe(false);
    expect(parseInvitationInput(`/invitations/${token}/extra`).ok).toBe(false);
    expect(parseInvitationInput("not-a-token").ok).toBe(false);
    expect(parseInvitationInput("").ok).toBe(false);
  });

  it("does not fetch pasted URLs", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    parseInvitationInput(`https://mayball.vercel.app/invitations/${token}`);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("builds only safe internal invitation paths", () => {
    expect(invitationPathForToken(token)).toBe(`/invitations/${token}`);
    expect(() => invitationPathForToken("https://example.com")).toThrow(
      "Enter a valid May Ball Finance invitation link.",
    );
  });
});

describe("JoinEventPanel", () => {
  it("renders the protected join form and cancel link", () => {
    render(<JoinEventPanel pastedValue="" />);

    expect(screen.getByRole("heading", { name: "Join an Event" })).toBeInTheDocument();
    expect(screen.getByLabelText("Invitation link or code")).toBeRequired();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/app");
  });

  it("displays a confirmation summary without raw tokens or UUIDs", () => {
    render(<JoinEventPanel pastedValue={`/invitations/${token}`} token={token} preview={preview} />);

    expect(screen.getByRole("heading", { name: "Join Downing May Ball 2027?" })).toBeInTheDocument();
    expect(screen.getByText("Downing May Ball")).toBeInTheDocument();
    expect(screen.getByText("Committee member, Treasurer")).toBeInTheDocument();
    expect(screen.getByText("Food, Drinks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join Event" })).toBeInTheDocument();
    expect(screen.queryByText(token)).not.toBeInTheDocument();
    expect(screen.queryByText("30000000-0000-0000-0000-000000000027")).not.toBeInTheDocument();
  });

  it("shows existing members an open event action instead of accepting again", () => {
    render(
      <JoinEventPanel
        pastedValue={token}
        token={token}
        preview={{ ...preview, already_member: true }}
      />,
    );

    expect(screen.getByText("You already have access to this event.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Event" })).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027",
    );
    expect(screen.queryByRole("button", { name: "Join Event" })).not.toBeInTheDocument();
  });

  it("shows safe validation errors", () => {
    render(
      <JoinEventPanel
        pastedValue="bad"
        error="Enter a valid May Ball Finance invitation link."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid May Ball Finance invitation link.",
    );
  });
});

describe("InvitationLinkDisplay", () => {
  it("shows and copies the generated invitation link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<InvitationLinkDisplay token={token} />);

    expect(screen.getByText(/Share this invitation link/)).toBeInTheDocument();
    expect(screen.getByText(/paste it into Join Event/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Copy Invitation Link" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`http://localhost:3000/invitations/${token}`),
    );
    expect(screen.getByText("Copied.")).toBeInTheDocument();
  });
});
