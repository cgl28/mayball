import { AppShell } from "@/components/app-shell";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getVisibleEventAccess } from "@/lib/events/access";
import { connection } from "next/server";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await getAuthenticatedSession("/app");
  const { data: events, error } = await getVisibleEventAccess(
    session.supabase,
    session.user.id,
  );

  return (
    <AppShell
      session={session}
      events={events ?? []}
      eventsError={error ? "Events could not be loaded." : null}
    >
      {children}
    </AppShell>
  );
}
