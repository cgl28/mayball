import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RequestDetailPanel } from "@/components/requests-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getSpendingRequestDetail } from "@/lib/requests/data";

export default async function NewVariationPage({
  params,
}: {
  params: Promise<{ eventId: string; requestId: string }>;
}) {
  await connection();
  const { eventId, requestId } = await params;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests/${requestId}/variation/new`);
  const { data: eventAccess } = await getEventAccess(session.supabase, session.user.id, eventId);
  if (!eventAccess) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  if (capabilities.isReadOnly) notFound();

  const detail = await getSpendingRequestDetail(session.supabase, eventId, requestId);
  if (detail.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{detail.error}</div>;
  }
  if (!detail.data || detail.data.request.approval_status !== "approved" || !detail.data.request.can_edit_draft) notFound();

  return (
    <RequestDetailPanel
      eventId={eventId}
      detail={detail.data}
      canEdit={false}
      readOnly={false}
      canStartVariation
    />
  );
}
