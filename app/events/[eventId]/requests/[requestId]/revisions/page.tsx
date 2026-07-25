import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ApprovalReviewPanel } from "@/components/approvals-panel";
import { getApprovalReviewData } from "@/lib/approvals/data";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function RequestRevisionsPage({
  params,
}: {
  params: Promise<{ eventId: string; requestId: string }>;
}) {
  await connection();
  const { eventId, requestId } = await params;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests/${requestId}/revisions`);
  const { data: eventAccess } = await getEventAccess(session.supabase, session.user.id, eventId);
  if (!eventAccess) notFound();

  const review = await getApprovalReviewData(session.supabase, eventId, requestId);
  if (review.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{review.error}</div>;
  }
  if (!review.data) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  return (
    <ApprovalReviewPanel
      eventId={eventId}
      data={review.data}
      canDecide={false}
      readOnly={capabilities.isReadOnly}
    />
  );
}
