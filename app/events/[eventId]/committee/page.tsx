import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CommitteePanel } from "@/components/committee-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventGovernance } from "@/lib/events/governance";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function CommitteePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; saved?: string; revoked?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/committee`);
  const { data: eventAccess, error } = await getEventAccess(
    session.supabase,
    session.user.id,
    eventId,
  );

  if (error) {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">
        Committee details could not be loaded. Please refresh and try again.
      </div>
    );
  }

  if (!eventAccess) {
    notFound();
  }

  const capabilities = getEventCapabilities(eventAccess);
  const governance = await getEventGovernance(session.supabase, eventAccess);

  if (governance.error || !governance.data) {
    return (
      <CommitteePanel
        eventId={eventId}
        members={[]}
        departments={[]}
        invitations={[]}
        canManage={false}
        readOnly={capabilities.isReadOnly}
        error={governance.error ?? "Committee details could not be loaded."}
      />
    );
  }

  const governanceData = governance.data;

  return (
    <CommitteePanel
      eventId={eventId}
      members={governanceData.members}
      departments={governanceData.departments}
      invitations={governanceData.invitations}
      canManage={capabilities.canManageSetup}
      readOnly={capabilities.isReadOnly}
      error={query.error}
      saved={query.saved === "1"}
      revoked={query.revoked === "1"}
    />
  );
}
