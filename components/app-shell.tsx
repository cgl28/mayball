import { AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import type { AuthenticatedSession } from "@/lib/auth/session";
import type { EventAccess } from "@/lib/events/access";
import { displayNameForUser } from "@/lib/auth/display";

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
    <div className="min-h-svh bg-[hsl(var(--marketing-surface))] text-slate-950">
      <AppSidebar events={events} />
      <div className="lg:pl-72">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h1 className="text-lg font-semibold tracking-normal">
                {displayNameForUser(session.user, session.profile)}
              </h1>
              <p className="text-sm text-muted-foreground">{session.user.email ?? "No email on account"}</p>
            </div>
            {eventsError ? (
              <div role="alert" className="mt-3 flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                <p>{eventsError}</p>
              </div>
            ) : null}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
