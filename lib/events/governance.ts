import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums, Tables } from "@/src/types/database.generated";
import type { EventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export type Department = Pick<
  Tables<"departments">,
  | "id"
  | "event_id"
  | "name"
  | "code"
  | "colour"
  | "description"
  | "display_order"
  | "is_active"
>;

export type CommitteeMember = Pick<
  Tables<"event_members">,
  "id" | "event_id" | "user_id" | "status" | "joined_at"
> & {
  profile: Pick<Tables<"profiles">, "id" | "display_name" | "preferred_name"> | null;
  roles: Enums<"event_role">[];
  departments: Department[];
};

export type InvitationSummary = Pick<
  Tables<"invitations">,
  "id" | "email" | "status" | "expires_at" | "created_at"
> & {
  roles: Enums<"event_role">[];
  departments: Department[];
};

export type EventGovernance = {
  departments: Department[];
  members: CommitteeMember[];
  invitations: InvitationSummary[];
};

type GovernanceError = {
  data: null;
  error: string;
};

function byId<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

export async function getEventGovernance(
  supabase: SupabaseClient<Database>,
  eventAccess: EventAccess,
): Promise<{ data: EventGovernance; error: null } | GovernanceError> {
  const eventId = eventAccess.event.id;
  const capabilities = getEventCapabilities(eventAccess);

  const [
    departmentsResult,
    membersResult,
    rolesResult,
    departmentMembersResult,
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id,event_id,name,code,colour,description,display_order,is_active")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("event_members")
      .select("id,event_id,user_id,status,joined_at")
      .eq("event_id", eventId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("event_member_roles")
      .select("event_id,event_member_id,role")
      .eq("event_id", eventId),
    supabase
      .from("department_members")
      .select("event_id,department_id,event_member_id")
      .eq("event_id", eventId),
  ]);

  if (departmentsResult.error) {
    return { data: null, error: "Departments could not be loaded." };
  }
  if (membersResult.error) {
    return { data: null, error: "Committee members could not be loaded." };
  }
  if (rolesResult.error || departmentMembersResult.error) {
    return { data: null, error: "Committee assignments could not be loaded." };
  }

  const departments = departmentsResult.data ?? [];
  const members = membersResult.data ?? [];
  const profilesResult = members.length
    ? await supabase
        .from("profiles")
        .select("id,display_name,preferred_name")
        .in(
          "id",
          members.map((member) => member.user_id),
        )
    : { data: [], error: null };

  if (profilesResult.error) {
    return { data: null, error: "Profiles could not be loaded." };
  }

  const profilesById = byId(profilesResult.data ?? []);
  const departmentsById = byId(departments);
  const rolesByMember = new Map<string, Enums<"event_role">[]>();
  const departmentsByMember = new Map<string, Department[]>();

  for (const role of rolesResult.data ?? []) {
    const roles = rolesByMember.get(role.event_member_id) ?? [];
    roles.push(role.role);
    rolesByMember.set(role.event_member_id, roles);
  }

  for (const assignment of departmentMembersResult.data ?? []) {
    const department = departmentsById.get(assignment.department_id);
    if (!department) {
      continue;
    }
    const assigned = departmentsByMember.get(assignment.event_member_id) ?? [];
    assigned.push(department);
    departmentsByMember.set(assignment.event_member_id, assigned);
  }

  const invitationSummaries: InvitationSummary[] = [];

  if (capabilities.canManageSetup) {
    const invitationsResult = await supabase
      .from("invitations")
      .select("id,email,status,expires_at,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (invitationsResult.error) {
      return { data: null, error: "Invitations could not be loaded." };
    }

    const invitationIds = (invitationsResult.data ?? []).map(
      (invitation) => invitation.id,
    );
    const [rolesForInvitations, departmentsForInvitations] = invitationIds.length
      ? await Promise.all([
          supabase
            .from("invitation_roles")
            .select("invitation_id,role")
            .in("invitation_id", invitationIds),
          supabase
            .from("invitation_departments")
            .select("invitation_id,department_id,event_id")
            .in("invitation_id", invitationIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

    if (
      rolesForInvitations.error ||
      departmentsForInvitations.error
    ) {
      return { data: null, error: "Invitation assignments could not be loaded." };
    }

    const invitationRoles = new Map<string, Enums<"event_role">[]>();
    const invitationDepartments = new Map<string, Department[]>();

    for (const role of rolesForInvitations.data ?? []) {
      const roles = invitationRoles.get(role.invitation_id) ?? [];
      roles.push(role.role);
      invitationRoles.set(role.invitation_id, roles);
    }

    for (const assignment of departmentsForInvitations.data ?? []) {
      const department = departmentsById.get(assignment.department_id);
      if (!department) {
        continue;
      }
      const assigned = invitationDepartments.get(assignment.invitation_id) ?? [];
      assigned.push(department);
      invitationDepartments.set(assignment.invitation_id, assigned);
    }

    for (const invitation of invitationsResult.data ?? []) {
      invitationSummaries.push({
        ...invitation,
        roles: invitationRoles.get(invitation.id) ?? [],
        departments: invitationDepartments.get(invitation.id) ?? [],
      });
    }
  }

  return {
    data: {
      departments,
      members: members.map((member) => ({
        ...member,
        profile: profilesById.get(member.user_id) ?? null,
        roles: rolesByMember.get(member.id) ?? [],
        departments: departmentsByMember.get(member.id) ?? [],
      })),
      invitations: invitationSummaries,
    },
    error: null,
  };
}
