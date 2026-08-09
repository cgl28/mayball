import {
  revokeInvitationAction,
  updateDepartmentMembershipAction,
  updateMemberStatusAction,
  updateRoleAction,
} from "@/app/events/actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { InvitationForm } from "@/components/invitation-form";
import type {
  CommitteeMember,
  Department,
  InvitationSummary,
} from "@/lib/events/governance";
import { summarizeRoles, type EventRole } from "@/lib/events/access";

const ROLE_OPTIONS: EventRole[] = [
  "president",
  "treasurer",
  "committee_member",
  "read_only",
];

function displayMember(member: CommitteeMember) {
  return (
    member.profile?.preferred_name ??
    member.profile?.display_name ??
    "Committee member"
  );
}

function Message({ error, saved, revoked }: { error?: string; saved?: boolean; revoked?: boolean }) {
  if (error) {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (saved || revoked) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        {revoked ? "Invitation revoked." : "Committee changes saved."}
      </div>
    );
  }
  return null;
}

function RoleControls({
  eventId,
  member,
  isOnlyActivePresident,
}: {
  eventId: string;
  member: CommitteeMember;
  isOnlyActivePresident: boolean;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium text-muted-foreground">Roles</p>
      <div className="flex flex-wrap gap-2">
        {ROLE_OPTIONS.map((role) => {
          const hasRole = member.roles.includes(role);
          const protectedPresidentRemoval =
            role === "president" && hasRole && isOnlyActivePresident;
          return (
            <form key={role} action={updateRoleAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="eventMemberId" value={member.id} />
              <input type="hidden" name="role" value={role} />
              <input type="hidden" name="intent" value={hasRole ? "remove" : "assign"} />
              <SubmitButton
                variant={hasRole ? "default" : "outline"}
                pendingLabel="Saving..."
                disabled={protectedPresidentRemoval}
                aria-describedby={protectedPresidentRemoval ? `only-president-${member.id}` : undefined}
              >
                {role.replaceAll("_", " ")}
              </SubmitButton>
            </form>
          );
        })}
      </div>
      {isOnlyActivePresident ? (
        <p id={`only-president-${member.id}`} className="text-sm text-muted-foreground">
          This is the event&apos;s only active President. Assign another President before removing this role.
        </p>
      ) : null}
    </div>
  );
}

function DepartmentControls({
  eventId,
  member,
  departments,
}: {
  eventId: string;
  member: CommitteeMember;
  departments: Department[];
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium text-muted-foreground">Departments</p>
      {departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Create departments first.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {departments.map((department) => {
            const assigned = member.departments.some(
              (memberDepartment) => memberDepartment.id === department.id,
            );
            return (
              <form key={department.id} action={updateDepartmentMembershipAction}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="eventMemberId" value={member.id} />
                <input type="hidden" name="departmentId" value={department.id} />
                <input type="hidden" name="intent" value={assigned ? "remove" : "assign"} />
                <SubmitButton variant={assigned ? "default" : "outline"} pendingLabel="Saving...">
                  {department.code}
                </SubmitButton>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusControl({
  eventId,
  member,
  isOnlyActivePresident,
}: {
  eventId: string;
  member: CommitteeMember;
  isOnlyActivePresident: boolean;
}) {
  if (isOnlyActivePresident) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        This member cannot be suspended, marked as left or removed while they are the event&apos;s only active President.
      </div>
    );
  }

  return (
    <form action={updateMemberStatusAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="eventMemberId" value={member.id} />
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Status</span>
        <select
          name="status"
          defaultValue={member.status}
          className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="left">Left</option>
          <option value="removed">Removed</option>
        </select>
      </label>
      <SubmitButton pendingLabel="Saving...">Update status</SubmitButton>
    </form>
  );
}

function InvitationList({
  eventId,
  invitations,
}: {
  eventId: string;
  invitations: InvitationSummary[];
}) {
  if (invitations.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No invitations have been created for this event.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {invitations.map((invitation) => (
        <section key={invitation.id} className="rounded-md border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{invitation.email}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Expires {new Intl.DateTimeFormat("en-GB").format(new Date(invitation.expires_at))}
              </p>
            </div>
            <Badge variant={invitation.status === "pending" ? "default" : "secondary"}>
              {invitation.status}
            </Badge>
          </div>
          <p className="mt-3 text-sm">Roles: {summarizeRoles(invitation.roles)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Departments:{" "}
            {invitation.departments.length
              ? invitation.departments.map((department) => department.name).join(", ")
              : "None assigned"}
          </p>
          {invitation.status === "pending" ? (
            <form action={revokeInvitationAction} className="mt-3">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="invitationId" value={invitation.id} />
              <SubmitButton variant="outline" pendingLabel="Revoking...">
                Revoke invitation
              </SubmitButton>
            </form>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export function CommitteePanel({
  eventId,
  members,
  departments,
  invitations,
  canManage,
  readOnly,
  error,
  saved,
  revoked,
}: {
  eventId: string;
  members: CommitteeMember[];
  departments: Department[];
  invitations: InvitationSummary[];
  canManage: boolean;
  readOnly: boolean;
  error?: string;
  saved?: boolean;
  revoked?: boolean;
}) {
  const activePresidentIds = members
    .filter((member) => member.status === "active" && member.roles.includes("president"))
    .map((member) => member.id);
  const onlyActivePresidentId =
    activePresidentIds.length === 1 ? activePresidentIds[0] : null;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Committee</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          View event membership, event-scoped roles and department assignments.
        </p>
      </div>

      <Message error={error} saved={saved} revoked={revoked} />

      {readOnly ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          This historical event is read-only. Committee records are shown for reference.
        </div>
      ) : null}

      {members.length === 0 ? (
        <div className="rounded-md border border-dashed p-6">
          <h2 className="font-medium">No active committee records</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Accepted event members will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {members.map((member) => (
            <section key={member.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">{displayMember(member)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Roles: {summarizeRoles(member.roles)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Departments:{" "}
                    {member.departments.length
                      ? member.departments.map((department) => department.name).join(", ")
                      : "None"}
                  </p>
                </div>
                <Badge variant={member.status === "active" ? "default" : "secondary"}>
                  {member.status}
                </Badge>
              </div>
              {canManage ? (
                <div className="mt-4 grid gap-4">
                  <RoleControls
                    eventId={eventId}
                    member={member}
                    isOnlyActivePresident={member.id === onlyActivePresidentId}
                  />
                  <DepartmentControls
                    eventId={eventId}
                    member={member}
                    departments={departments}
                  />
                  <StatusControl
                    eventId={eventId}
                    member={member}
                    isOnlyActivePresident={member.id === onlyActivePresidentId}
                  />
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {canManage ? (
        <section className="rounded-md border p-5">
          <h2 className="font-medium">Create invitation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This creates a secure local invitation record. Email delivery is not
            implemented in Stage 2.
          </p>
          <div className="mt-4">
            <InvitationForm eventId={eventId} departments={departments} />
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="rounded-md border p-5">
          <h2 className="font-medium">Invitations</h2>
          <div className="mt-4">
            <InvitationList eventId={eventId} invitations={invitations} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
