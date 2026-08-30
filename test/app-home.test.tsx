import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppHome } from "@/components/app-home";
import { displayNameForUser } from "@/lib/auth/display";
import { makeEventAccess } from "@/test/fixtures";

describe("authenticated home", () => {
  it("greets the user with the best available profile name", () => {
    expect(
      displayNameForUser(
        { email: "treasurer@example.test" },
        { preferred_name: "Terry", display_name: "Terry Treasurer" },
      ),
    ).toBe("Terry");
    expect(
      displayNameForUser(
        { email: "treasurer@example.test" },
        { preferred_name: null, display_name: "Terry Treasurer" },
      ),
    ).toBe("Terry Treasurer");
    expect(displayNameForUser({ email: "treasurer@example.test" }, null)).toBe("treasurer");
  });

  it("shows accessible events with open links and create action", () => {
    render(<AppHome displayName="Terry" events={[makeEventAccess()]} eventsError={null} />);

    expect(screen.getByText("Welcome Terry")).toBeInTheDocument();
    expect(screen.getByText("Downing May Ball 2027")).toBeInTheDocument();
    expect(screen.getAllByText("Downing May Ball").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open Event" })).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027",
    );
    expect(screen.getByRole("link", { name: "Create Event" })).toHaveAttribute("href", "/events/new");
    expect(screen.getByRole("link", { name: "Join Event" })).toHaveAttribute("href", "/app/join");
  });

  it("shows an empty state when no events are available", () => {
    render(<AppHome displayName="Noah" events={[]} eventsError={null} />);

    expect(screen.getByText("You do not have access to any events yet.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Create Event" })[0]).toHaveAttribute("href", "/events/new");
    expect(screen.getAllByRole("link", { name: "Join Event" })[0]).toHaveAttribute("href", "/app/join");
  });

  it("shows a joined-event success action when redirected from invitation acceptance", () => {
    render(
      <AppHome
        displayName="Terry"
        events={[makeEventAccess()]}
        eventsError={null}
        joinedEventId="30000000-0000-0000-0000-000000000027"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("You have joined Downing May Ball 2027.");
    expect(screen.getAllByRole("link", { name: "Open Event" })[0]).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027",
    );
  });

  it("places completed and archived events below active events", () => {
    render(
      <AppHome
        displayName="Terry"
        events={[
          makeEventAccess({
            event: {
              id: "30000000-0000-0000-0000-000000000025",
              status: "completed",
              name: "Downing May Ball 2025",
            },
            membership: null,
            roles: [],
            accessMode: "historical",
            isReadOnly: true,
          }),
          makeEventAccess({ event: { status: "setup", name: "Downing Setup" } }),
        ]}
        eventsError={null}
      />,
    );

    const activeHeading = screen.getByText("Active events");
    const historicalHeading = screen.getByText("Historical events");
    expect(activeHeading.compareDocumentPosition(historicalHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Completed and archived events remain available/)).toBeInTheDocument();
    expect(screen.getByText("Historical read-only access")).toBeInTheDocument();
  });
});
