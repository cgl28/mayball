import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ApprovalQueuePanel } from "@/components/approvals-panel";
import { LockedPage } from "@/components/locked-page";
import { getApprovalQueueData } from "@/lib/approvals/data";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getApprovalsPageLock } from "@/lib/events/page-access";

export default async function ApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ department?: string; type?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/approvals`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Approval access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const lock = getApprovalsPageLock(eventAccess);
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

  const queue = await getApprovalQueueData(session.supabase, eventId);
  if (queue.error || !queue.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{queue.error ?? "Approval queue could not be loaded."}</div>;
  }

  return (
    <ApprovalQueuePanel
      eventId={eventId}
      data={queue.data}
      departmentId={query.department}
      requestType={query.type}
    />
  );
}
