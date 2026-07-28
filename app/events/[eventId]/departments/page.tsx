import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DepartmentsPanel } from "@/components/departments-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventGovernance } from "@/lib/events/governance";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function DepartmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    templateAdded?: string;
    templateExisting?: string;
  }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/departments`);
  const { data: eventAccess, error } = await getEventAccess(
    session.supabase,
    session.user.id,
    eventId,
  );

  if (error) {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">
        Departments could not be loaded. Please refresh and try again.
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
      <DepartmentsPanel
        eventId={eventId}
        departments={[]}
        canManage={false}
        readOnly={capabilities.isReadOnly}
        error={governance.error ?? "Departments could not be loaded."}
      />
    );
  }

  const governanceData = governance.data;

  return (
    <DepartmentsPanel
      eventId={eventId}
      departments={governanceData.departments}
      canManage={capabilities.canManageSetup}
      readOnly={capabilities.isReadOnly}
      error={query.error}
      saved={query.saved === "1"}
      templateAdded={
        query.templateAdded ? Number(query.templateAdded) : undefined
      }
      templateExisting={
        query.templateExisting ? Number(query.templateExisting) : undefined
      }
    />
  );
}
