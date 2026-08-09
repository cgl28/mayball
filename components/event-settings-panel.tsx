import Link from "next/link";
import { AlertCircle, GitBranch } from "lucide-react";
import { updateEventSettingsAction } from "@/app/events/actions";
import { SubmitButton } from "@/components/submit-button";
import type { EventAccess } from "@/lib/events/access";

function stageLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function EventSettingsPanel({
  eventAccess,
  canManage,
  error,
  saved,
  created,
}: {
  eventAccess: EventAccess;
  canManage: boolean;
  error?: string;
  saved?: boolean;
  created?: boolean;
}) {
  const { event, organisation } = eventAccess;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Event settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Configure event identity and operational settings. Lifecycle stage
          changes and history are managed on the separate Lifecycle page.
        </p>
      </div>

      {error ? (
        <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}
      {saved || created ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
          {created ? "Event created." : "Event settings saved."}
        </div>
      ) : null}

      {eventAccess.isReadOnly ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          This event is read-only. Settings cannot be edited.
        </div>
      ) : null}

      <section className="rounded-md border p-5">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Organisation</dt>
            <dd>{organisation?.name ?? "Organisation unavailable"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{event.status}</dd>
          </div>
        </dl>

        {canManage ? (
          <form action={updateEventSettingsAction} className="mt-5 grid gap-4">
            <input type="hidden" name="eventId" value={event.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Event name</span>
                <input
                  name="eventName"
                  required
                  defaultValue={event.name}
                  className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Event code</span>
                <input
                  name="eventCode"
                  required
                  defaultValue={event.code}
                  className="rounded-md border bg-background px-3 py-2 uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Event year</span>
                <input
                  name="eventYear"
                  type="number"
                  min="2000"
                  max="2200"
                  required
                  defaultValue={event.event_year}
                  className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Event date</span>
                <input
                  name="eventDate"
                  type="date"
                  defaultValue={event.event_date ?? ""}
                  className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Planning start date</span>
                <input
                  name="planningStartDate"
                  type="date"
                  defaultValue={event.planning_start_date ?? ""}
                  className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
            </div>
            <SubmitButton pendingLabel="Saving...">Save event settings</SubmitButton>
          </form>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            Only a president of an active event can edit these settings.
          </p>
        )}
      </section>

      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          Lifecycle
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Current stage: {stageLabel(event.status)}. Review stage progression,
          readiness and lifecycle history separately.
        </p>
        <Link
          href={`/events/${event.id}/settings/lifecycle`}
          className="mt-4 inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Manage lifecycle
        </Link>
      </section>
    </div>
  );
}
