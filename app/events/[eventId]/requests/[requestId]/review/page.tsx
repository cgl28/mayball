import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RequestDetailPanel } from "@/components/requests-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getSpendingRequestDetail } from "@/lib/requests/data";

export default async function ReviewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; requestId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { eventId, requestId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests/${requestId}/review`);
  const { data: eventAccess } = await getEventAccess(session.supabase, session.user.id, eventId);
  if (!eventAccess) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  if (capabilities.isReadOnly) notFound();

  const detail = await getSpendingRequestDetail(session.supabase, eventId, requestId);
  if (detail.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{detail.error}</div>;
  }
  if (!detail.data || !detail.data.request.can_edit_draft || !detail.data.request.current_draft_revision_id || detail.data.request.revision_status !== "draft") {
    notFound();
  }

  return (
    <RequestDetailPanel
      eventId={eventId}
      detail={detail.data}
      canEdit
      readOnly={capabilities.isReadOnly}
      error={query.error}
      review
    />
  );
}
