import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventSettingsPanel } from "@/components/event-settings-panel";
import { makeEventAccess } from "@/test/fixtures";

vi.mock("@/app/events/actions", () => ({
  updateEventSettingsAction: vi.fn(),
  updateEventOrganisationAction: vi.fn(),
}));

describe("Stage 6 event settings separation", () => {
  it("keeps lifecycle mutation controls out of Settings and links to Lifecycle", () => {
    render(
      <EventSettingsPanel
        eventAccess={makeEventAccess({ organisation: null, roles: ["president"] })}
        canManage
        organisations={[{ id: "20000000-0000-0000-0000-000000000001", name: "Downing May Ball" }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Event settings" })).toBeInTheDocument();
    expect(screen.getByText("Event name")).toBeInTheDocument();
    expect(screen.getByText("Downing May Ball 2027")).toBeInTheDocument();
    expect(screen.getByText("Event code")).toBeInTheDocument();
    expect(screen.getByText("DMB")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Event name" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Event code" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Event date")).toBeInTheDocument();
    expect(screen.getByLabelText("Planning start date")).toBeInTheDocument();
    expect(screen.getAllByText("Downing May Ball", { selector: "dd" })).toHaveLength(2);
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
