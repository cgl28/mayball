import Link from "next/link";
import { Archive, CalendarDays, LinkIcon, Lock, Plus, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventAccess } from "@/lib/events/access";
import { isHistoricalStatus, summarizeRoles } from "@/lib/events/access";
import { ProductTierBadge } from "@/components/product-tier-badge";

function formatDate(date: string | null) {
  if (!date) return "Date not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function EventCard({
  eventAccess,
}: {
  eventAccess: EventAccess;
}) {
  const { event, organisation, roles, accessMode, isReadOnly, chiffreOwner } = eventAccess;

  return (
    <article className="rounded-md border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-normal">{event.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {organisation?.name ?? "Organisation unavailable"}
          </p>
        </div>
        {isReadOnly ? (
          <Lock aria-label="Read-only event" className="h-5 w-5 text-slate-600" />
        ) : (
          <Unlock aria-label="Editable event" className="h-5 w-5 text-[hsl(var(--marketing-brand))]" />
        )}
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Organisation</dt><dd>{organisation?.name ?? "No organisation set"}</dd></div>
        <div><dt className="text-muted-foreground">Chiffre owner</dt><dd>{chiffreOwner?.preferred_name ?? chiffreOwner?.display_name ?? "Not assigned"}</dd></div>
        <div>
          <dt className="text-muted-foreground">Date</dt>
          <dd>{formatDate(event.event_date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Year</dt>
          <dd>{event.event_year}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{event.status.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Your roles</dt>
          <dd>{accessMode === "historical" && roles.length === 0 ? "Historical read-only access" : summarizeRoles(roles)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <ProductTierBadge tier={event.product_tier} />
        <Badge variant="outline" className="gap-1">
          {isHistoricalStatus(event.status) ? (
            <Archive className="h-3 w-3" aria-hidden="true" />
          ) : (
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
          )}
          {event.status.replaceAll("_", " ")}
        </Badge>
        <Badge variant={accessMode === "historical" ? "secondary" : "default"}>
          {accessMode === "historical" ? "Read-only" : "Active access"}
        </Badge>
      </div>
      <Button asChild className="mt-5 bg-[hsl(var(--marketing-brand))] text-white hover:bg-[hsl(var(--marketing-brand-hover))]">
        <Link href={`/events/${event.id}`}>Open Event</Link>
      </Button>
    </article>
  );
}

export function AppHome({
  displayName,
  events,
  eventsError,
  joinedEventId,
}: {
  displayName: string;
  events: EventAccess[];
  eventsError: string | null;
  joinedEventId?: string | null;
}) {
  const joinedEvent = joinedEventId
    ? events.find((eventAccess) => eventAccess.event.id === joinedEventId)
    : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-md border bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--marketing-brand))]">Home</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">Welcome {displayName}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose an event to continue committee work, or create a new event setup.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/app/join">
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              Join Event
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/events/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Event
            </Link>
          </Button>
        </div>
      </div>

      {joinedEvent ? (
        <div role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-medium">You have joined {joinedEvent.event.name}.</p>
          <Button asChild className="mt-3 bg-[hsl(var(--marketing-brand))] text-white hover:bg-[hsl(var(--marketing-brand-hover))]">
            <Link href={`/events/${joinedEvent.event.id}`}>Open Event</Link>
          </Button>
        </div>
      ) : null}

      {eventsError ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-white p-4 text-sm text-destructive">
          Events could not be loaded. Please refresh and try again.
        </div>
      ) : null}

      {!eventsError && events.length === 0 ? (
        <section className="rounded-md border border-dashed bg-white p-8">
          <h3 className="text-lg font-semibold tracking-normal">You do not have access to any events yet.</h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create a new event to get started, or join an event with an invitation link from your president.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/app/join">Join Event</Link>
            </Button>
            <Button asChild className="bg-[hsl(var(--marketing-brand))] text-white hover:bg-[hsl(var(--marketing-brand-hover))]">
              <Link href="/events/new">Create Event</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {!eventsError && events.length > 0 ? (
        <div className="grid gap-6">
          {[
            { label: "Active events", events: events.filter((eventAccess) => !isHistoricalStatus(eventAccess.event.status)) },
            { label: "Historical events", events: events.filter((eventAccess) => isHistoricalStatus(eventAccess.event.status)) },
          ].map((group) => group.events.length ? (
            <section key={group.label} className="grid gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
              {group.label === "Historical events" ? <p className="text-sm text-muted-foreground">Completed and archived events remain available for historical reference.</p> : null}
              <div className="grid gap-4 xl:grid-cols-2">
                {group.events.map((eventAccess) => <EventCard key={eventAccess.event.id} eventAccess={eventAccess} />)}
              </div>
            </section>
          ) : null)}
        </div>
      ) : null}
    </div>
  );
}
