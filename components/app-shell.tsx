import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { EventSwitcher } from "@/components/event-switcher";
import { LogoutButton } from "@/components/logout-button";
import type { AuthenticatedSession } from "@/lib/auth/session";
import type { EventAccess } from "@/lib/events/access";

function displayUser(session: AuthenticatedSession) {
  return (
    session.profile?.preferred_name ??
    session.profile?.display_name ??
    session.user.email ??
    "Signed-in user"
  );
}

export function AppShell({
  session,
  events,
  eventsError,
  children,
}: {
  session: AuthenticatedSession;
  events: EventAccess[];
  eventsError: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/events"
              className="text-lg font-semibold tracking-normal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              May Ball Finance
            </Link>
            <p className="text-sm text-muted-foreground">
              Event access, history and committee finance workspace
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="text-sm">
              <p className="font-medium">{displayUser(session)}</p>
              <p className="text-muted-foreground">
                {session.user.email ?? "No email on account"}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="grid gap-4">
            <section aria-labelledby="profile-heading" className="rounded-md border p-4">
              <h2 id="profile-heading" className="font-medium">
                Profile
              </h2>
              {session.profile ? (
                <dl className="mt-3 grid gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Display name</dt>
                    <dd>{session.profile.display_name || "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Preferred name</dt>
                    <dd>{session.profile.preferred_name || "Not set"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {session.profileError ?? "No accessible profile row was found."}
                </p>
              )}
            </section>

            <section aria-labelledby="events-heading" className="rounded-md border p-4">
              <h2 id="events-heading" className="font-medium">
                Events
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Visible events are filtered by Supabase RLS.
              </p>
              {eventsError ? (
                <div className="mt-3 flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                  <p>{eventsError}</p>
                </div>
              ) : (
                <div className="mt-3">
                  <EventSwitcher events={events} />
                </div>
              )}
            </section>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
