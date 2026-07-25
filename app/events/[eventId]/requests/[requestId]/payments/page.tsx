import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RequestPaymentsPanel } from "@/components/payments-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getRequestPaymentData } from "@/lib/payments/data";

export default async function RequestPaymentsPage({
  params,
}: {
  params: Promise<{ eventId: string; requestId: string }>;
}) {
  await connection();
  const { eventId, requestId } = await params;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests/${requestId}/payments`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Payment access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const data = await getRequestPaymentData(session.supabase, eventId, requestId);
  if (data.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{data.error}</div>;
  }
  if (!data.data) notFound();

  const capabilities = getEventCapabilities(eventAccess);

  return (
    <RequestPaymentsPanel
      eventId={eventId}
      requestId={requestId}
      position={data.data.position}
      components={data.data.components}
      allocations={data.data.allocations}
      canManage={capabilities.canManageFinance}
      readOnly={capabilities.isReadOnly}
    />
  );
}
