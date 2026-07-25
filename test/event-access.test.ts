import { describe, expect, it } from "vitest";
import {
  getEventAccessMode,
  isEventReadOnly,
  isHistoricalStatus,
  summarizeRoles,
} from "@/lib/events/access";

describe("event access helpers", () => {
  it("recognises completed and archived statuses as historical", () => {
    expect(isHistoricalStatus("completed")).toBe(true);
    expect(isHistoricalStatus("archived")).toBe(true);
    expect(isHistoricalStatus("planning")).toBe(false);
  });

  it("treats active current membership as active access", () => {
    expect(
      getEventAccessMode(
        { status: "planning" },
        {
          id: "member-id",
          event_id: "event-id",
          status: "active",
          user_id: "user-id",
        },
      ),
    ).toBe("active");
  });

  it("treats completed events as read-only even with roles", () => {
    expect(
      isEventReadOnly(
        { status: "completed" },
        ["treasurer"],
        {
          id: "member-id",
          event_id: "event-id",
          status: "active",
          user_id: "user-id",
        },
      ),
    ).toBe(true);
  });

  it("treats read-only role as read-only in an active event", () => {
    expect(
      isEventReadOnly(
        { status: "planning" },
        ["read_only"],
        {
          id: "member-id",
          event_id: "event-id",
          status: "active",
          user_id: "user-id",
        },
      ),
    ).toBe(true);
  });

  it("summarises roles for display", () => {
    expect(summarizeRoles(["committee_member", "treasurer"])).toBe(
      "Committee member, Treasurer",
    );
    expect(summarizeRoles([])).toBe("No event role");
  });
});
