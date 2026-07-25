import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RequestsListPanel } from "@/components/requests-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getSpendingRequestsData } from "@/lib/requests/data";

export default async function RequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ mine?: string; status?: string; department?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests`);
  const { data: eventAccess, error } = await getEventAccess(
    session.supabase,
    session.user.id,
    eventId,
  );

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Spending request access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const data = await getSpendingRequestsData(session.supabase, eventId);
  if (data.error || !data.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{data.error ?? "Spending requests could not be loaded."}</div>;
  }

  const capabilities = getEventCapabilities(eventAccess);

  return (
    <RequestsListPanel
      eventId={eventId}
      requests={data.data.requests}
      departments={data.data.departments}
      paymentPositions={data.data.paymentPositions}
      canCreate={!capabilities.isReadOnly && eventAccess.accessMode === "active"}
      readOnly={capabilities.isReadOnly}
      mine={query.mine === "1"}
      status={query.status}
      departmentId={query.department}
    />
  );
}
