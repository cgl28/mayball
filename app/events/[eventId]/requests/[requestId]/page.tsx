import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RequestDetailPanel } from "@/components/requests-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getSpendingRequestDetail } from "@/lib/requests/data";

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; requestId: string }>;
  searchParams: Promise<{
    error?: string;
    created?: string;
    saved?: string;
    submitted?: string;
    documentsError?: string;
    documentUploaded?: string;
    documentVoided?: string;
  }>;
}) {
  await connection();
  const { eventId, requestId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests/${requestId}`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Spending request access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const detail = await getSpendingRequestDetail(session.supabase, eventId, requestId);
  if (detail.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{detail.error}</div>;
  }
  if (!detail.data) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  const canEdit = Boolean(
    detail.data.request.can_edit_draft &&
      detail.data.request.current_draft_revision_id &&
      detail.data.request.revision_status === "draft" &&
      !capabilities.isReadOnly,
  );
  const canStartVariation = Boolean(
    detail.data.request.can_edit_draft &&
      detail.data.request.approval_status === "approved" &&
      !detail.data.request.current_draft_revision_id &&
      !capabilities.isReadOnly,
  );

  return (
    <RequestDetailPanel
      eventId={eventId}
      detail={detail.data}
      canEdit={canEdit}
      readOnly={capabilities.isReadOnly}
      created={query.created === "1"}
      saved={query.saved === "1"}
      submitted={query.submitted === "1"}
      error={query.error}
      canStartVariation={canStartVariation}
      canManageDocuments={capabilities.canManageFinance}
      documentUploaded={query.documentUploaded === "1"}
      documentVoided={query.documentVoided === "1"}
      documentsError={query.documentsError}
    />
  );
}
