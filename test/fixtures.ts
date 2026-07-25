import type {
  EventAccess,
  EventMembershipRow,
  EventRole,
  EventRow,
  OrganisationRow,
} from "@/lib/events/access";

type EventAccessFixtureOverrides = Omit<
  Partial<EventAccess>,
  "event" | "organisation" | "membership" | "roles"
> & {
  event?: Partial<EventRow>;
  organisation?: Partial<OrganisationRow> | null;
  membership?: Partial<EventMembershipRow> | null;
  roles?: EventRole[];
};

export function makeEventAccess(
  overrides: EventAccessFixtureOverrides = {},
): EventAccess {
  const event = {
    id: "30000000-0000-0000-0000-000000000027",
    name: "Downing May Ball 2027",
    event_year: 2027,
    event_date: "2027-06-19",
    planning_start_date: "2026-08-01",
    status: "planning" as const,
    organisation_id: "20000000-0000-0000-0000-000000000001",
    code: "DMB",
    completed_at: null,
    archived_at: null,
    reopened_at: null,
    ...overrides.event,
  };
  const organisation =
    overrides.organisation === null
      ? null
      : {
          id: event.organisation_id,
          name: "Downing May Ball",
          legal_name: "Downing May Ball Association Ltd",
          slug: "downing-may-ball",
          ...overrides.organisation,
        };
  const membership =
    overrides.membership === null
      ? null
      : {
          id: "31000000-0000-0000-0000-000000000002",
          event_id: event.id,
          status: "active" as const,
          user_id: "10000000-0000-0000-0000-000000000002",
          ...overrides.membership,
        };
  const roles = overrides.roles ?? ["treasurer" as const];

  return {
    event,
    organisation,
    membership,
    roles,
    accessMode: overrides.accessMode ?? "active",
    isReadOnly: overrides.isReadOnly ?? false,
  };
}
