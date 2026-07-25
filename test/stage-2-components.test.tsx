import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommitteePanel } from "@/components/committee-panel";
import { DepartmentsPanel } from "@/components/departments-panel";
import { SetupForms, getPresidentOrganisations } from "@/components/setup-forms";
import { getEventCapabilities } from "@/lib/events/permissions";
import { makeEventAccess } from "@/test/fixtures";

const department = {
  id: "department-id",
  event_id: "event-id",
  name: "Security",
  code: "SEC",
  colour: null,
  description: null,
  display_order: 1,
  is_active: true,
};

const member = {
  id: "member-id",
  event_id: "event-id",
  user_id: "user-id",
  status: "active" as const,
  joined_at: "2026-07-18T12:00:00Z",
  profile: {
    id: "user-id",
    display_name: "Alex Aesthetics",
    preferred_name: null,
  },
  roles: ["committee_member" as const, "treasurer" as const],
  departments: [department],
};

describe("Stage 2 capability helpers", () => {
  it("separates president setup power from treasurer finance power", () => {
    expect(
      getEventCapabilities(makeEventAccess({ roles: ["president"] })),
    ).toMatchObject({
      canManageSetup: true,
      canManageFinance: false,
      isPresident: true,
      isTreasurer: false,
    });

    expect(
      getEventCapabilities(makeEventAccess({ roles: ["treasurer"] })),
    ).toMatchObject({
      canManageSetup: false,
      canManageFinance: true,
    });
  });

  it("removes all mutation capability for read-only historical events", () => {
    expect(
      getEventCapabilities(
        makeEventAccess({
          roles: ["president", "treasurer"],
          isReadOnly: true,
          accessMode: "historical",
          event: { status: "completed" },
        }),
      ),
    ).toMatchObject({
      canManageSetup: false,
      canManageFinance: false,
      isReadOnly: true,
    });
  });
});

describe("setup forms", () => {
  it("shows recurring event setup only for president organisations", () => {
    const organisations = getPresidentOrganisations([
      makeEventAccess({ roles: ["president"] }),
      makeEventAccess({
        organisation: { id: "other-org", name: "Other Org" },
        roles: ["committee_member"],
      }),
    ]);

    expect(organisations).toEqual([
      { id: "20000000-0000-0000-0000-000000000001", name: "Downing May Ball" },
    ]);
  });

  it("renders validation-ready setup fields and error state", () => {
    render(<SetupForms presidentOrganisations={[]} error="Invalid event code" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid event code");
    expect(screen.getByLabelText("Organisation name")).toBeRequired();
    expect(screen.getByLabelText("Event code")).toBeRequired();
    expect(screen.getByText("You are not president of an active organisation event yet.")).toBeInTheDocument();
  });
});

describe("department panel", () => {
  it("shows empty and read-only states without mutation forms", () => {
    render(
      <DepartmentsPanel
        eventId="event-id"
        departments={[]}
        canManage={false}
        readOnly
      />,
    );

    expect(screen.getByText("No departments yet")).toBeInTheDocument();
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.queryByText("Add custom department")).not.toBeInTheDocument();
  });

  it("shows custom and standard department controls for presidents", () => {
    render(
      <DepartmentsPanel
        eventId="event-id"
        departments={[department]}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Add custom department")).toBeInTheDocument();
    expect(screen.getByText("Standard department template")).toBeInTheDocument();
  });
});

describe("committee panel", () => {
  it("shows committee structure to ordinary members without management controls", () => {
    render(
      <CommitteePanel
        eventId="event-id"
        members={[member]}
        departments={[department]}
        invitations={[]}
        canManage={false}
        readOnly={false}
      />,
    );

    expect(screen.getByText("Alex Aesthetics")).toBeInTheDocument();
    expect(screen.getByText(/Committee member, Treasurer/)).toBeInTheDocument();
    expect(screen.queryByText("Create invitation")).not.toBeInTheDocument();
    expect(screen.queryByText("Update status")).not.toBeInTheDocument();
  });

  it("shows invitation status without leaking stored token hashes", () => {
    render(
      <CommitteePanel
        eventId="event-id"
        members={[member]}
        departments={[department]}
        invitations={[
          {
            id: "invitation-id",
            email: "invitee@example.test",
            status: "pending",
            expires_at: "2026-08-01T00:00:00Z",
            created_at: "2026-07-18T00:00:00Z",
            roles: ["committee_member"],
            departments: [department],
          },
        ]}
        canManage
        readOnly={false}
      />,
    );

    expect(screen.getByText("invitee@example.test")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.queryByText(/token_hash/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/[a-f0-9]{64}/i)).not.toBeInTheDocument();
  });
});
