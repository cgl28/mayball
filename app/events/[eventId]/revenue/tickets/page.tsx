import { notFound } from "next/navigation";
import { connection } from "next/server";
import { TicketTypesPanel } from "@/components/revenue-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getRevenueOverview } from "@/lib/revenue/data";

export default async function TicketTypesPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/revenue/tickets`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);
  if (error) return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Revenue access could not be loaded.</div>;
  if (!eventAccess) notFound();

  const revenue = await getRevenueOverview(session.supabase, eventId);
  if (revenue.error || !revenue.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{revenue.error ?? "Ticket types could not be loaded."}</div>;
  }

  const capabilities = getEventCapabilities(eventAccess);
  return (
    <TicketTypesPanel
      eventId={eventId}
      ticketTypes={revenue.data.ticketTypes}
      canManage={capabilities.canManageFinance}
      readOnly={capabilities.isReadOnly}
      error={query.error}
      saved={query.saved === "1"}
    />
  );
}
