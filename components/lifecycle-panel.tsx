import Link from "next/link";
import { AlertTriangle, Archive, CheckCircle2, RotateCcw } from "lucide-react";
import {
  archiveEventAction,
  completeEventAction,
  reopenEventAction,
} from "@/app/events/[eventId]/settings/lifecycle/actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import type { EventAccess } from "@/lib/events/access";
import { isHistoricalStatus } from "@/lib/events/access";
import type { CompletionReadinessItem, LifecycleData } from "@/lib/lifecycle/data";
import { formatMinor } from "@/lib/money";

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not recorded";
}

function dateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
}

function reasonText(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "No note recorded.";
}

function readinessTitle(item: CompletionReadinessItem) {
  const titles: Record<string, string> = {
    active_invitations: "Active invitations remain",
    changes_requested_open: "Changes-requested revisions remain open",
    draft_budget_versions: "Draft budget versions remain",
    expected_other_revenue: "Other revenue remains expected",
    invalid_status: "Event cannot be completed from this status",
    missing_event_date: "Event date is missing",
    no_active_budget: "No active budget",
    no_actual_revenue_snapshot: "No recent ticket revenue snapshot",
    no_final_budget: "No final budget version",
    no_president_assigned: "No president assigned",
    no_treasurer_assigned: "No treasurer assigned",
    private_spending_drafts: "Private spending drafts remain",
    requests_awaiting_approval: "Requests await approval",
    reversed_payments: "Payments have been reversed",
    unallocated_contingency: "Unallocated contingency remains",
    unpaid_approved_requests: "Approved requests remain unpaid or partly paid",
  };
  return titles[item.code] ?? label(item.code);
}

function readinessDescription(item: CompletionReadinessItem) {
  const bits = [`${item.item_count} ${item.item_count === 1 ? "item" : "items"}`];
  if (item.amount_minor !== null) bits.push(formatMinor(item.amount_minor));
  return bits.join("; ");
}

function ReadinessList({ items }: { items: CompletionReadinessItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
        No blockers or warnings are currently reported by the database readiness check.
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.code} className="rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.blocks_completion ? "destructive" : item.severity === "warning" ? "secondary" : "outline"}>
              {item.blocks_completion ? "Blocker" : label(item.severity)}
            </Badge>
            <p className="font-medium">{readinessTitle(item)}</p>
          </div>
          <p className="mt-1 text-muted-foreground">{readinessDescription(item)}</p>
          <Link className="mt-2 inline-block font-medium underline-offset-4 hover:underline" href={`../${item.target_route}`}>
            Review {label(item.category)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LifecyclePanel({
  eventAccess,
  lifecycle,
  canManageLifecycle,
  error,
  completed,
  archived,
  reopened,
  acknowledgementRequired,
}: {
  eventAccess: EventAccess;
  lifecycle: LifecycleData;
  canManageLifecycle: boolean;
  error?: string;
  completed?: boolean;
  archived?: boolean;
  reopened?: boolean;
  acknowledgementRequired?: boolean;
}) {
  const { event, organisation } = eventAccess;
  const summary = lifecycle.summary;
  const blockers = lifecycle.readiness.filter((item) => item.blocks_completion);
  const warnings = lifecycle.readiness.filter((item) => !item.blocks_completion && item.severity === "warning");
  const info = lifecycle.readiness.filter((item) => !item.blocks_completion && item.severity !== "warning");
  const canComplete = canManageLifecycle && ["planning", "live", "reconciliation"].includes(event.status);
  const canArchive = canManageLifecycle && event.status === "completed";
  const canReopen = canManageLifecycle && isHistoricalStatus(event.status);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Event lifecycle</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Complete, archive and exceptionally reopen the event. Event completion is a lifecycle transition, not payment completion or bank reconciliation.
        </p>
      </div>

      {error ? <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{error}</div> : null}
      {acknowledgementRequired ? <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Warnings must be explicitly acknowledged before this event can be completed.</div> : null}
      {completed ? <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">Event completed. The workspace is now read-only historical data.</div> : null}
      {archived ? <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">Event archived. Data remains preserved and readable historically.</div> : null}
      {reopened ? <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">Event reopened into reconciliation. Normal permissions apply again; history was preserved.</div> : null}

      {eventAccess.isReadOnly ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Historical read-only event</p>
            <p className="mt-1">Existing records remain available. New governance, finance and payment mutations are blocked by the database.</p>
          </div>
        </div>
      ) : null}

      <section className="rounded-md border p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-medium">{event.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{organisation?.name ?? "Organisation unavailable"}; {event.event_year}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{label(event.status)}</Badge>
            <Badge variant={eventAccess.isReadOnly ? "secondary" : "outline"}>{eventAccess.isReadOnly ? "Read-only" : "Writable"}</Badge>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <div><dt className="text-muted-foreground">Completed</dt><dd>{dateTime(summary?.completed_at)}</dd></div>
          <div><dt className="text-muted-foreground">Archived</dt><dd>{dateTime(summary?.archived_at)}</dd></div>
          <div><dt className="text-muted-foreground">Last reopened</dt><dd>{dateTime(summary?.reopened_at)}</dd></div>
          <div><dt className="text-muted-foreground">Completed by</dt><dd>{summary?.completed_by_display_name ?? "Not recorded"}</dd></div>
          <div><dt className="text-muted-foreground">Archived by</dt><dd>{summary?.archived_by_display_name ?? "Not recorded"}</dd></div>
          <div><dt className="text-muted-foreground">Reopened by</dt><dd>{summary?.reopened_by_display_name ?? "Not recorded"}</dd></div>
        </dl>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Completion readiness</h2>
        {!canManageLifecycle ? (
          <p className="mt-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Lifecycle readiness details are available to authorised presidents. Historical viewers can see lifecycle status and history only.
          </p>
        ) : (
          <div className="mt-4 grid gap-5">
            {blockers.length > 0 ? <div className="grid gap-3"><h3 className="text-sm font-medium">Blockers</h3><ReadinessList items={blockers} /></div> : null}
            {warnings.length > 0 ? <div className="grid gap-3"><h3 className="text-sm font-medium">Warnings requiring acknowledgement</h3><ReadinessList items={warnings} /></div> : null}
            {info.length > 0 ? <div className="grid gap-3"><h3 className="text-sm font-medium">Information</h3><ReadinessList items={info} /></div> : null}
            {lifecycle.readiness.length === 0 ? <ReadinessList items={[]} /> : null}
          </div>
        )}
      </section>

      {canManageLifecycle ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <form action={completeEventAction} className="rounded-md border p-5">
            <input type="hidden" name="eventId" value={event.id} />
            <h2 className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Complete event</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Completion makes the event read-only. It preserves data, enables same-organisation historical access and does not certify bank reconciliation.
            </p>
            <label className="mt-4 grid gap-1 text-sm">
              <span className="font-medium">Completion note</span>
              <textarea name="reason" rows={3} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </label>
            <label className="mt-4 flex gap-2 text-sm">
              <input name="acknowledgeWarnings" type="checkbox" className="mt-1 h-4 w-4" required={warnings.length > 0} />
              <span>I understand the warnings and that completion is not bank reconciliation.</span>
            </label>
            <div className="mt-4">
              <SubmitButton pendingLabel="Completing..." variant="default">{canComplete ? "Complete event" : "Completion unavailable"}</SubmitButton>
            </div>
          </form>

          <form action={archiveEventAction} className="rounded-md border p-5">
            <input type="hidden" name="eventId" value={event.id} />
            <h2 className="flex items-center gap-2 font-medium"><Archive className="h-4 w-4" aria-hidden="true" />Archive event</h2>
            <p className="mt-3 text-sm text-muted-foreground">Archiving is a long-term historical classification. It does not delete or hide data.</p>
            <label className="mt-4 grid gap-1 text-sm">
              <span className="font-medium">Archive reason</span>
              <textarea name="reason" rows={3} required={canArchive} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </label>
            <div className="mt-4">
              <SubmitButton pendingLabel="Archiving..." variant="secondary">{canArchive ? "Archive event" : "Archive unavailable"}</SubmitButton>
            </div>
          </form>

          <form action={reopenEventAction} className="rounded-md border p-5">
            <input type="hidden" name="eventId" value={event.id} />
            <h2 className="flex items-center gap-2 font-medium"><RotateCcw className="h-4 w-4" aria-hidden="true" />Exceptional reopen</h2>
            <p className="mt-3 text-sm text-muted-foreground">Reopening returns the event to reconciliation. It does not reverse payments, reviews, snapshots or budget versions.</p>
            <label className="mt-4 grid gap-1 text-sm">
              <span className="font-medium">Reopen reason</span>
              <textarea name="reason" rows={3} required={canReopen} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </label>
            <div className="mt-4">
              <SubmitButton pendingLabel="Reopening..." variant="outline">{canReopen ? "Reopen event" : "Reopen unavailable"}</SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Lifecycle history</h2>
        {lifecycle.history.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No lifecycle transitions have been recorded yet.</p>
        ) : (
          <ol className="mt-4 grid gap-3">
            {lifecycle.history.map((item) => (
              <li key={item.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{label(item.action)}</Badge>
                  <p className="font-medium">{label(item.previous_status)} to {label(item.new_status)}</p>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {item.actor?.preferred_name ?? item.actor?.display_name ?? "Unknown actor"}; {dateTime(item.created_at)}
                </p>
                <p className="mt-2">{reasonText(item.reason)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
