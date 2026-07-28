import { AppHome } from "@/components/app-home";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { displayNameForUser } from "@/lib/auth/display";
import { getVisibleEventAccess } from "@/lib/events/access";
import { connection } from "next/server";

export default async function AppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ joinedEventId?: string }>;
}) {
  await connection();
  const query = await searchParams;
  const session = await getAuthenticatedSession("/app");
  const { data: events, error } = await getVisibleEventAccess(
    session.supabase,
    session.user.id,
  );

  return (
    <AppHome
      displayName={displayNameForUser(session.user, session.profile)}
      events={events ?? []}
      eventsError={error ? "error" : null}
      joinedEventId={query.joinedEventId}
    />
  );
}
