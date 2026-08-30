import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { headers } from "next/headers";
import { traceAsync } from "@/lib/perf/trace";
import type {
  Database,
  Enums,
  Tables,
} from "@/src/types/database.generated";

export type EventStatus = Enums<"event_status">;
export type EventRole = Enums<"event_role">;
export type EventRow = Pick<
  Tables<"events">,
  | "id"
  | "name"
  | "event_year"
  | "event_date"
  | "planning_start_date"
  | "status"
  | "organisation_id"
  | "code"
  | "completed_at"
  | "archived_at"
  | "reopened_at"
  | "product_tier"
  | "pro_activated_at"
  | "chiffre_owner_user_id"
>;
export type OrganisationRow = Pick<
  Tables<"organisations">,
  "id" | "name" | "legal_name" | "slug"
>;
export type EventMembershipRow = Pick<
  Tables<"event_members">,
  "id" | "event_id" | "status" | "user_id"
>;

export type EventAccess = {
  event: EventRow;
  organisation: OrganisationRow | null;
  membership: EventMembershipRow | null;
  roles: EventRole[];
  accessMode: "active" | "historical";
  isReadOnly: boolean;
  chiffreOwner: Pick<Tables<"profiles">, "id" | "display_name" | "preferred_name"> | null;
};

export function isHistoricalStatus(status: EventStatus) {
  return status === "completed" || status === "archived";
}

export function summarizeRoles(roles: EventRole[]) {
  if (roles.length === 0) {
    return "No event role";
  }

  return roles
    .map((role) => role.replaceAll("_", " "))
    .map((role) => role[0].toUpperCase() + role.slice(1))
    .join(", ");
}

export function getEventAccessMode(
  event: Pick<EventRow, "status">,
  membership: EventMembershipRow | null,
): EventAccess["accessMode"] {
  if (isHistoricalStatus(event.status) || membership?.status !== "active") {
    return "historical";
  }

  return "active";
}

export function isEventReadOnly(
  event: Pick<EventRow, "status">,
  roles: EventRole[],
  membership: EventMembershipRow | null,
) {
  if (getEventAccessMode(event, membership) === "historical") {
    return true;
  }

  return roles.length > 0 && roles.every((role) => role === "read_only");
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export const getVisibleEventAccess = cache(async function getVisibleEventAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const headerStore = await headers();
  const route = headerStore.get("x-mbf-route") ?? headerStore.get("next-url") ?? "unknown";

  return traceAsync({ route, name: "cache.execute", target: "getVisibleEventAccess" }, async () => {
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id,name,event_year,event_date,planning_start_date,status,organisation_id,code,completed_at,archived_at,reopened_at,product_tier,pro_activated_at,chiffre_owner_user_id")
      .order("event_year", { ascending: false })
      .order("name", { ascending: true });

    if (eventsError) {
      return { data: null, error: eventsError };
    }

    if (!events || events.length === 0) {
      return { data: [] satisfies EventAccess[], error: null };
    }

    const eventIds = events.map((event) => event.id);
    const organisationIds = unique(events.map((event) => event.organisation_id));
    const ownerIds = unique(events.map((event) => event.chiffre_owner_user_id).filter((id): id is string => Boolean(id)));

    const [
      { data: organisations, error: organisationsError },
      { data: memberships, error: membershipsError },
      { data: owners, error: ownersError },
    ] = await Promise.all([
      supabase
        .from("organisations")
        .select("id,name,legal_name,slug")
        .in("id", organisationIds),
      supabase
        .from("event_members")
        .select("id,event_id,status,user_id")
        .eq("user_id", userId)
        .in("event_id", eventIds),
      ownerIds.length
        ? supabase.from("profiles").select("id,display_name,preferred_name").in("id", ownerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (organisationsError) {
      return { data: null, error: organisationsError };
    }
    if (membershipsError) {
      return { data: null, error: membershipsError };
    }
    if (ownersError) return { data: null, error: ownersError };

    const activeMemberships = (memberships ?? []).filter(
      (membership) => membership.status === "active",
    );
    const membershipIds = activeMemberships.map((membership) => membership.id);
    const { data: roleRows, error: rolesError } = membershipIds.length
      ? await supabase
          .from("event_member_roles")
          .select("event_id,event_member_id,role")
          .in("event_member_id", membershipIds)
      : { data: [], error: null };

    if (rolesError) {
      return { data: null, error: rolesError };
    }

    const organisationsById = new Map(
      (organisations ?? []).map((organisation) => [organisation.id, organisation]),
    );
    const membershipsByEventId = new Map(
      activeMemberships.map((membership) => [membership.event_id, membership]),
    );
    const ownersById = new Map((owners ?? []).map((owner) => [owner.id, owner]));
    const rolesByEventId = new Map<string, EventRole[]>();

    for (const roleRow of roleRows ?? []) {
      const roles = rolesByEventId.get(roleRow.event_id) ?? [];
      roles.push(roleRow.role);
      rolesByEventId.set(roleRow.event_id, roles);
    }

    const data: EventAccess[] = events.map((event) => {
      const membership = membershipsByEventId.get(event.id) ?? null;
      const roles = rolesByEventId.get(event.id) ?? [];

      return {
        event,
        organisation: organisationsById.get(event.organisation_id) ?? null,
        membership,
        roles,
        accessMode: getEventAccessMode(event, membership),
        isReadOnly: isEventReadOnly(event, roles, membership),
        chiffreOwner: event.chiffre_owner_user_id ? ownersById.get(event.chiffre_owner_user_id) ?? null : null,
      };
    });

    return { data, error: null };
  });
});

export const getEventAccess = cache(async function getEventAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  eventId: string,
) {
  const result = await getVisibleEventAccess(supabase, userId);

  if (result.error) {
    return result;
  }

  return {
    data: result.data?.find((eventAccess) => eventAccess.event.id === eventId) ?? null,
    error: null,
  };
});
