import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ActivityPanel } from "@/components/activity-panel";
import { getActivityFeed } from "@/lib/activity/data";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{
    page?: string;
    category?: string;
    action?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/activity`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Activity access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  const activity = await getActivityFeed(session.supabase, eventId, {
    page: Number(query.page ?? 1),
    category: query.category,
    action: query.action,
    fromDate: query.fromDate,
    toDate: query.toDate,
  });

  if (activity.error || !activity.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{activity.error}</div>;
  }

  return (
    <ActivityPanel
      rows={activity.data.rows}
      count={activity.data.count}
      page={activity.data.page}
      pageSize={activity.data.pageSize}
      readOnly={capabilities.isReadOnly}
    />
  );
}
