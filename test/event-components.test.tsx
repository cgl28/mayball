import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventLanding } from "@/components/event-landing";
import { EventSelector } from "@/components/event-selector";
import { makeEventAccess } from "@/test/fixtures";

describe("event selector", () => {
  it("shows an empty state for authenticated users with no events", () => {
    render(<EventSelector events={[]} error={null} />);

    expect(screen.getByText("No accessible events")).toBeInTheDocument();
  });

  it("shows a safe error state", () => {
    render(<EventSelector events={[]} error="error" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Events could not be loaded",
    );
  });

  it("presents active and historical events distinctly", () => {
    render(
      <EventSelector
        error={null}
        events={[
          makeEventAccess(),
          makeEventAccess({
            event: {
              id: "30000000-0000-0000-0000-000000000025",
              name: "Downing May Ball 2025",
              event_year: 2025,
              event_date: "2025-06-21",
              status: "completed",
            },
            membership: null,
            roles: [],
            accessMode: "historical",
            isReadOnly: true,
          }),
        ]}
      />,
    );

    expect(screen.getByText("Downing May Ball 2027")).toBeInTheDocument();
    expect(screen.getByText("Active/current events")).toBeInTheDocument();
    expect(screen.getByText("Active access")).toBeInTheDocument();
    expect(screen.getByText("Downing May Ball 2025")).toBeInTheDocument();
    expect(screen.getByText("Completed historical events")).toBeInTheDocument();
    expect(screen.getByText("Historical/read-only")).toBeInTheDocument();
    expect(screen.getByText("Historical read-only access")).toBeInTheDocument();
  });
});

describe("event landing", () => {
  it("shows a read-only banner for historical events", () => {
    render(
      <EventLanding
        eventAccess={makeEventAccess({
          event: { status: "completed" },
          membership: null,
          roles: [],
          accessMode: "historical",
          isReadOnly: true,
        })}
      />,
    );

    expect(screen.getByText("Read-only historical event")).toBeInTheDocument();
    expect(screen.getByText(/retained for historical reference/i)).toBeInTheDocument();
  });

  it("does not show the read-only banner for active editable events", () => {
    render(<EventLanding eventAccess={makeEventAccess()} />);

    expect(screen.queryByText("Read-only historical event")).not.toBeInTheDocument();
    expect(screen.getByText("Editable shell")).toBeInTheDocument();
  });
});
