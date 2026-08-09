import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventSettingsPanel } from "@/components/event-settings-panel";
import { makeEventAccess } from "@/test/fixtures";

vi.mock("@/app/events/actions", () => ({
  updateEventSettingsAction: vi.fn(),
}));

describe("Stage 6 event settings separation", () => {
  it("keeps lifecycle mutation controls out of Settings and links to Lifecycle", () => {
    render(
      <EventSettingsPanel
        eventAccess={makeEventAccess({ roles: ["president"] })}
        canManage
      />,
    );

    expect(screen.getByRole("heading", { name: "Event settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Event name")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage lifecycle" })).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027/settings/lifecycle",
    );
    expect(screen.queryByText("Ready to progress?")).not.toBeInTheDocument();
    expect(screen.queryByText("Complete Event")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive Event")).not.toBeInTheDocument();
    expect(screen.queryByText("Reopen to Reconciliation")).not.toBeInTheDocument();
  });
});
