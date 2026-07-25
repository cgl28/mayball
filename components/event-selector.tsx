import Link from "next/link";
import { Archive, CalendarDays, Lock, Plus, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EventAccess } from "@/lib/events/access";
import { isHistoricalStatus, summarizeRoles } from "@/lib/events/access";

function formatDate(date: string | null) {
  if (!date) {
    return "Date not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function eventGroupLabel(status: string, readOnly: boolean) {
  if (status === "archived") return "Archived historical events";
  if (status === "completed") return "Completed historical events";
  if (readOnly) return "Historical read-only events";
  if (status === "setup") return "Setup events";
  return "Active/current events";
}

export function EventSelector({
  events,
  error,
}: {
  events: EventAccess[];
  error: string | null;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Choose an event</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Select an active event to continue planning, or open a completed event
              for historical reference.
            </p>
          </div>
          <Link
            href="/events/new"
            className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New setup
          </Link>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 p-4 text-sm text-destructive"
        >
          Events could not be loaded. Please refresh and try again.
        </div>
      ) : null}

      {!error && events.length === 0 ? (
        <div className="rounded-md border border-dashed p-8">
          <h2 className="font-medium">No accessible events</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is signed in, but it does not currently have access to
            any May Ball events.
          </p>
          <Link
            href="/events/new"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Create first organisation and event
          </Link>
        </div>
      ) : null}

      {!error && events.length > 0 ? (
        <div className="grid gap-6">
          {Object.entries(
            events.reduce<Record<string, EventAccess[]>>((groups, eventAccess) => {
              const group = eventGroupLabel(eventAccess.event.status, eventAccess.isReadOnly);
              groups[group] = [...(groups[group] ?? []), eventAccess];
              return groups;
            }, {}),
          ).map(([group, groupEvents]) => (
            <section key={group} className="grid gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">{group}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {groupEvents.map(({ event, organisation, roles, accessMode, isReadOnly }) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="rounded-md border p-5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-semibold">{event.name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {organisation?.name ?? "Organisation unavailable"}
                        </p>
                      </div>
                      {isReadOnly ? (
                        <Lock aria-label="Read-only event" className="h-5 w-5" />
                      ) : (
                        <Unlock aria-label="Editable event" className="h-5 w-5" />
                      )}
                    </div>

              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Event date</dt>
                  <dd>{formatDate(event.event_date)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Your roles</dt>
                  <dd>{accessMode === "historical" && roles.length === 0 ? "Historical read-only access" : summarizeRoles(roles)}</dd>
                </div>
                {event.completed_at ? (
                  <div>
                    <dt className="text-muted-foreground">Completed</dt>
                    <dd>{formatDateTime(event.completed_at)}</dd>
                  </div>
                ) : null}
                {event.archived_at ? (
                  <div>
                    <dt className="text-muted-foreground">Archived</dt>
                    <dd>{formatDateTime(event.archived_at)}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  {isHistoricalStatus(event.status) ? (
                    <Archive className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  )}
                  {event.status.replaceAll("_", " ")}
                </Badge>
                <Badge variant={accessMode === "historical" ? "secondary" : "default"}>
                  {accessMode === "historical"
                    ? "Historical/read-only"
                    : "Active access"}
                </Badge>
              </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
