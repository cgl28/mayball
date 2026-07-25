import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EventSettingsPanel } from "@/components/event-settings-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function EventSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; saved?: string; created?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/settings`);
  const { data: eventAccess, error } = await getEventAccess(
    session.supabase,
    session.user.id,
    eventId,
  );

  if (error) {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">
        Event settings could not be loaded. Please refresh and try again.
      </div>
    );
  }

  if (!eventAccess) {
    notFound();
  }

  const capabilities = getEventCapabilities(eventAccess);

  return (
    <EventSettingsPanel
      eventAccess={eventAccess}
      canManage={capabilities.canManageSetup}
      error={query.error}
      saved={query.saved === "1"}
      created={query.created === "1"}
    />
  );
}
