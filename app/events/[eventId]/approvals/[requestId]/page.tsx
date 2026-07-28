import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ApprovalReviewPanel } from "@/components/approvals-panel";
import { LockedPage } from "@/components/locked-page";
import { getApprovalReviewData } from "@/lib/approvals/data";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import {
  getApprovalReviewPageLock,
} from "@/lib/events/page-access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function ApprovalReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; requestId: string }>;
  searchParams: Promise<{ error?: string; decided?: string }>;
}) {
  await connection();
  const { eventId, requestId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/approvals/${requestId}`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Approval access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const lock = getApprovalReviewPageLock(eventAccess);
  if (lock) {
    return (
      <LockedPage
        title={lock.title}
        description={lock.description}
        requiredRole={lock.requiredRole}
        backHref={lock.backHref}
      />
    );
  }

  const capabilities = getEventCapabilities(eventAccess);

  const review = await getApprovalReviewData(session.supabase, eventId, requestId);
  if (review.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{review.error}</div>;
  }
  if (!review.data) notFound();

  return (
    <ApprovalReviewPanel
      eventId={eventId}
      data={review.data}
      canDecide={capabilities.canManageFinance}
      readOnly={capabilities.isReadOnly}
      error={query.error}
      decided={query.decided}
    />
  );
}
