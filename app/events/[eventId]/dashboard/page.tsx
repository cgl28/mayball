import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DashboardPanel } from "@/components/dashboard-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/data";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const session = await getAuthenticatedSession(`/events/${eventId}/dashboard`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Dashboard access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const dashboard = await getDashboardData(session.supabase, eventId);
  if (dashboard.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{dashboard.error}</div>;
  }
  if (!dashboard.data) notFound();

  const capabilities = getEventCapabilities(eventAccess);

  return (
    <DashboardPanel
      eventAccess={eventAccess}
      data={dashboard.data}
      canManageFinance={capabilities.canManageFinance}
      canManageLifecycle={capabilities.isPresident}
    />
  );
}
