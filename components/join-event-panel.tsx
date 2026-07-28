import Link from "next/link";
import { acceptInvitationAction } from "@/app/events/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { summarizeRoles } from "@/lib/events/access";
import type { InvitationPreview } from "@/lib/invitations/preview";

function formatDate(date: string | null) {
  if (!date) return "Date not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function JoinEventPanel({
  pastedValue,
  token,
  preview,
  error,
}: {
  pastedValue: string;
  token?: string;
  preview?: InvitationPreview | null;
  error?: string | null;
}) {
  return (
    <div className="grid gap-6">
      <div className="rounded-md border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--marketing-brand))]">
          Invitation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Join an Event</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Paste the invitation link provided by your event president.
        </p>
      </div>

      <section className="rounded-md border bg-white p-5 shadow-sm">
        <form method="get" action="/app/join" className="grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Invitation link or code</span>
            <input
              name="invitation"
              defaultValue={pastedValue}
              placeholder="/invitations/..."
              required
              className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-describedby={error ? "join-event-error" : undefined}
            />
          </label>
          {error ? (
            <div
              id="join-event-error"
              role="alert"
              className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingLabel="Checking...">Continue</SubmitButton>
            <Button asChild variant="outline">
              <Link href="/app">Cancel</Link>
            </Button>
          </div>
        </form>
      </section>

      {token && preview ? (
        <section className="rounded-md border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold tracking-normal">
            Join {preview.event_name}?
          </h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Organisation</dt>
              <dd className="font-medium">{preview.organisation_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Event date</dt>
              <dd className="font-medium">{formatDate(preview.event_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Event year</dt>
              <dd className="font-medium">{preview.event_year}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Roles</dt>
              <dd className="font-medium">{summarizeRoles(preview.roles)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Departments</dt>
              <dd className="font-medium">
                {preview.departments.length
                  ? preview.departments.join(", ")
                  : "None assigned"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Invitation expires</dt>
              <dd className="font-medium">{formatDateTime(preview.expires_at)}</dd>
            </div>
          </dl>

          {preview.already_member ? (
            <div className="mt-5 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
              <p>You already have access to this event.</p>
              <Button asChild className="mt-3 bg-[hsl(var(--marketing-brand))] text-white hover:bg-[hsl(var(--marketing-brand-hover))]">
                <Link href={`/events/${preview.event_id}`}>Open Event</Link>
              </Button>
            </div>
          ) : (
            <form action={acceptInvitationAction} className="mt-5 flex flex-wrap gap-2">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="source" value="join" />
              <SubmitButton pendingLabel="Joining...">Join Event</SubmitButton>
              <Button asChild variant="outline">
                <Link href="/app">Cancel</Link>
              </Button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
