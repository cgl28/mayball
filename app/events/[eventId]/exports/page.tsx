import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ExportsPanel } from "@/components/exports-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function ExportsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const session = await getAuthenticatedSession(`/events/${eventId}/exports`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Export access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const capabilities = getEventCapabilities(eventAccess);

  return <ExportsPanel eventId={eventId} readOnly={capabilities.isReadOnly} />;
}
