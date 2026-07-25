import { EventSelector } from "@/components/event-selector";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getVisibleEventAccess } from "@/lib/events/access";
import { connection } from "next/server";

export default async function EventsPage() {
  await connection();
  const session = await getAuthenticatedSession("/events");
  const { data: events, error } = await getVisibleEventAccess(
    session.supabase,
    session.user.id,
  );

  return <EventSelector events={events ?? []} error={error ? "error" : null} />;
}
