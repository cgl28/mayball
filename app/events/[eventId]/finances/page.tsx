import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FinancesPanel } from "@/components/finances-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getFinancesData } from "@/lib/finances/data";

export default async function FinancesPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ department?: string; status?: string; payment?: string; q?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/finances`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Finances access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const finances = await getFinancesData(session.supabase, eventId, query.department);
  if (finances.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{finances.error}</div>;
  }
  if (!finances.data) notFound();

  const capabilities = getEventCapabilities(eventAccess);

  return (
    <FinancesPanel
      eventAccess={eventAccess}
      data={finances.data}
      approvalStatus={query.status ?? "all"}
      paymentStatus={query.payment ?? "all"}
      search={query.q ?? ""}
      canCreateRequest={!capabilities.isReadOnly && eventAccess.accessMode === "active"}
      canManageSetup={capabilities.canManageSetup}
    />
  );
}
