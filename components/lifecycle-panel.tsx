import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle2,
  Circle,
  Clock,
  Info,
  RotateCcw,
} from "lucide-react";
import {
  archiveEventAction,
  completeEventAction,
  reopenEventAction,
} from "@/app/events/[eventId]/settings/lifecycle/actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import type { EventAccess } from "@/lib/events/access";
import { isHistoricalStatus } from "@/lib/events/access";
import type {
  CompletionReadinessItem,
  LifecycleData,
  LifecycleHistoryRow,
  LifecycleSummary,
} from "@/lib/lifecycle/data";
import { formatMinor } from "@/lib/money";
import type { Enums } from "@/src/types/database.generated";

type EventStatus = Enums<"event_status">;

const LIFECYCLE_STAGES: {
  status: EventStatus;
  label: string;
  description: string;
}[] = [
  {
    status: "setup",
    label: "Setup",
    description:
      "The event is being configured. Departments, committee access, budgets and revenue forecasts can be prepared.",
  },
  {
    status: "planning",
    label: "Planning",
    description:
      "The committee can actively plan budgets, revenue and spending requests.",
  },
  {
    status: "live",
    label: "Live",
    description:
      "The event is approaching or taking place. Financial workflows remain active.",
  },
  {
    status: "reconciliation",
    label: "Reconciliation",
    description:
      "Final payments, outstanding requests and event finances are being resolved.",
  },
  {
    status: "completed",
    label: "Completed",
    description:
      "The event is complete and normal financial records are read-only.",
  },
  {
    status: "archived",
    label: "Archived",
    description:
      "The event remains available for historical reference but is hidden from normal active-event navigation.",
  },
];

function stageLabel(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function dateTime(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not recorded";
}

function eventDate(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00Z`))
    : "Date not set";
}

function reasonText(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "No note recorded.";
}

function currentStage(status: EventStatus) {
  return (
    LIFECYCLE_STAGES.find((stage) => stage.status === status) ??
    LIFECYCLE_STAGES[0]
  );
}

function stageEntered(summary: LifecycleSummary | null, status: EventStatus) {
  if (status === "completed") {
    return {
      at: summary?.completed_at,
      by: summary?.completed_by_display_name,
    };
  }
  if (status === "archived") {
    return {
      at: summary?.archived_at,
      by: summary?.archived_by_display_name,
    };
  }
  if (status === "reconciliation" && summary?.reopened_at) {
    return {
      at: summary.reopened_at,
      by: summary.reopened_by_display_name,
    };
  }

  return { at: null, by: null };
}

function readinessTitle(item: CompletionReadinessItem) {
  const titles: Record<string, string> = {
    active_invitations: "Active invitations remain",
    changes_requested_open: "Changes-requested revisions remain open",
    draft_budget_versions: "Draft budget exists",
    expected_other_revenue: "Other revenue remains expected",
    invalid_status: "Event cannot be completed from this stage",
    missing_event_date: "Event date is missing",
    no_active_budget: "No active budget",
    no_actual_revenue_snapshot: "No recent ticket revenue snapshot",
    no_final_budget: "No final budget version",
    no_president_assigned: "No president assigned",
    no_treasurer_assigned: "No treasurer assigned",
    private_spending_drafts: "Private spending drafts remain",
    requests_awaiting_approval: "Requests are awaiting review",
    reversed_payments: "Payments have been reversed",
    unallocated_contingency: "Unallocated contingency remains",
    unpaid_approved_requests: "Approved requests remain unpaid",
  };
  return titles[item.code] ?? stageLabel(item.code);
}

function readinessDescription(item: CompletionReadinessItem) {
  const descriptions: Record<string, string> = {
    active_invitations:
      "Committee invitations are still pending and may add more members.",
    changes_requested_open:
      "Some requests have requested changes and have not been resolved.",
    draft_budget_versions:
      "A draft budget has not been activated and will not affect current reporting.",
    expected_other_revenue:
      "Some other revenue items still have expected amounts outstanding.",
    invalid_status:
      "Completion is only available from Planning, Live or Reconciliation.",
    missing_event_date:
      "The event date has not been set in event settings.",
    no_active_budget:
      "No active budget is available for current reporting.",
    no_actual_revenue_snapshot:
      "No ticket revenue snapshot has been recorded for this event.",
    no_final_budget:
      "A final budget has not been recorded before completion.",
    no_president_assigned:
      "An active event must keep at least one President.",
    no_treasurer_assigned:
      "No Treasurer is currently assigned to the event.",
    private_spending_drafts:
      "Private draft requests still exist and may not be visible to everyone.",
    requests_awaiting_approval:
      "Submitted requests still require a Treasurer decision.",
    reversed_payments:
      "Some payment records have been reversed.",
    unallocated_contingency:
      "Some contingency remains unallocated in the active budget.",
    unpaid_approved_requests:
      "Approved commitments have not yet been fully paid.",
  };
  return descriptions[item.code] ?? "The database readiness check reported this item.";
}

function readinessFacts(item: CompletionReadinessItem) {
  const facts = [`${item.item_count} ${item.item_count === 1 ? "item" : "items"}`];
  if (item.amount_minor !== null) facts.push(formatMinor(item.amount_minor));
  return facts.join("; ");
}

function warningGroup(item: CompletionReadinessItem) {
  if (item.blocks_completion) return "blocking";
  if (item.severity === "warning") return "acknowledgement";
  return "info";
}

function targetHref(eventId: string, targetRoute: string) {
  return `/events/${eventId}/${targetRoute}`;
}

function LifecycleProgress({ status }: { status: EventStatus }) {
  const currentIndex = LIFECYCLE_STAGES.findIndex(
    (stage) => stage.status === status,
  );

  return (
    <section className="rounded-md border bg-white p-5 shadow-sm">
      <h2 className="font-medium">Lifecycle progress</h2>
      <ol className="mt-5 grid gap-3 md:grid-cols-6">
        {LIFECYCLE_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = isCompleted ? CheckCircle2 : isCurrent ? Clock : Circle;
          const stateLabel = isCompleted
            ? "Completed stage"
            : isCurrent
              ? "Current stage"
              : "Future stage";

          return (
            <li
              key={stage.status}
              aria-label={`${stage.label}: ${stateLabel}`}
              className={
                isCurrent
                  ? "rounded-md border-2 border-[hsl(var(--marketing-brand))] bg-[hsl(var(--marketing-brand-soft))] p-3 text-slate-950"
                  : isCompleted
                    ? "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-emerald-950"
                    : "rounded-md border bg-slate-50 p-3 text-slate-600"
              }
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">{stage.label}</span>
              </div>
              <p className="mt-2 text-xs">{stateLabel}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function CurrentStageSummary({
  eventAccess,
  summary,
}: {
  eventAccess: EventAccess;
  summary: LifecycleSummary | null;
}) {
  const { event, organisation } = eventAccess;
  const stage = currentStage(event.status);
  const entered = stageEntered(summary, event.status);

  return (
    <section className="rounded-md border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--marketing-brand))]">
            Current stage
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">
            {stage.label}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {stage.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{stage.label}</Badge>
          <Badge variant={eventAccess.isReadOnly ? "secondary" : "outline"}>
            {eventAccess.isReadOnly ? "Read-only" : "Writable"}
          </Badge>
        </div>
      </div>
      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Event</dt>
          <dd className="font-medium">{event.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Organisation</dt>
          <dd className="font-medium">
            {organisation?.name ?? "Organisation unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Event date</dt>
          <dd className="font-medium">{eventDate(event.event_date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Stage entered</dt>
          <dd className="font-medium">
            {entered.at ? dateTime(entered.at) : "Not recorded"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last changed by</dt>
          <dd className="font-medium">{entered.by ?? "Not recorded"}</dd>
        </div>
      </dl>
    </section>
  );
}

function ReadinessCard({
  eventId,
  item,
}: {
  eventId: string;
  item: CompletionReadinessItem;
}) {
  const group = warningGroup(item);
  const Icon =
    group === "blocking" ? AlertCircle : group === "acknowledgement" ? AlertTriangle : Info;

  return (
    <li className="rounded-md border bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <Badge
          variant={
            group === "blocking"
              ? "destructive"
              : group === "acknowledgement"
                ? "secondary"
                : "outline"
          }
        >
          {group === "blocking"
            ? "Blocking issue"
            : group === "acknowledgement"
              ? "Requires acknowledgement"
              : "Informational"}
        </Badge>
        <p className="font-medium">{readinessTitle(item)}</p>
      </div>
      <p className="mt-2 text-muted-foreground">{readinessDescription(item)}</p>
      <p className="mt-2 font-medium">{readinessFacts(item)}</p>
      <Link
        className="mt-3 inline-block font-medium underline-offset-4 hover:underline"
        href={targetHref(eventId, item.target_route)}
      >
        Review {stageLabel(item.category)}
      </Link>
    </li>
  );
}

function LifecycleReadinessPanel({
  eventId,
  readiness,
  canViewReadiness,
}: {
  eventId: string;
  readiness: CompletionReadinessItem[];
  canViewReadiness: boolean;
}) {
  const blockers = readiness.filter((item) => warningGroup(item) === "blocking");
  const warnings = readiness.filter(
    (item) => warningGroup(item) === "acknowledgement",
  );
  const info = readiness.filter((item) => warningGroup(item) === "info");
  const summary =
    blockers.length > 0
      ? "Action required before completion"
      : warnings.length > 0
        ? "Completion allowed with acknowledgement"
        : "Ready for completion review";

  return (
    <section className="rounded-md border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">Readiness warnings</h2>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>
        <Badge
          variant={
            blockers.length > 0
              ? "destructive"
              : warnings.length > 0
                ? "secondary"
                : "outline"
          }
        >
          {blockers.length > 0
            ? `${blockers.length} blocking`
            : warnings.length > 0
              ? `${warnings.length} to acknowledge`
              : "No blockers"}
        </Badge>
      </div>

      {!canViewReadiness ? (
        <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Detailed completion readiness is available to event Presidents.
        </div>
      ) : readiness.length === 0 ? (
        <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
          No blockers or warnings are currently reported by the database readiness check.
        </div>
      ) : (
        <div className="mt-5 grid gap-5">
          {blockers.length > 0 ? (
            <div className="grid gap-3">
              <h3 className="text-sm font-medium">Blocking issues</h3>
              <ul className="grid gap-3">
                {blockers.map((item) => (
                  <ReadinessCard key={item.code} eventId={eventId} item={item} />
                ))}
              </ul>
            </div>
          ) : null}
          {warnings.length > 0 ? (
            <div className="grid gap-3">
              <h3 className="text-sm font-medium">Requires acknowledgement</h3>
              <ul className="grid gap-3">
                {warnings.map((item) => (
                  <ReadinessCard key={item.code} eventId={eventId} item={item} />
                ))}
              </ul>
            </div>
          ) : null}
          {info.length > 0 ? (
            <div className="grid gap-3">
              <h3 className="text-sm font-medium">Informational</h3>
              <ul className="grid gap-3">
                {info.map((item) => (
                  <ReadinessCard key={item.code} eventId={eventId} item={item} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ConfirmationSummary({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="mt-4 rounded-md border bg-slate-50 p-3">
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))]">
        {title}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function LifecycleControls({
  eventId,
  status,
  readiness,
}: {
  eventId: string;
  status: EventStatus;
  readiness: CompletionReadinessItem[];
}) {
  const blockers = readiness.filter((item) => item.blocks_completion);
  const warnings = readiness.filter(
    (item) => !item.blocks_completion && item.severity === "warning",
  );
  const canComplete = ["planning", "live", "reconciliation"].includes(status);
  const canArchive = status === "completed";
  const canReopen = isHistoricalStatus(status);

  return (
    <section className="rounded-md border bg-white p-5 shadow-sm">
      <h2 className="font-medium">Change Lifecycle Stage</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Only supported database transitions are offered here. Each change is
        confirmed before the server action calls the lifecycle RPC.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {canComplete ? (
          <article className="rounded-md border p-4">
            <h3 className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Complete Event
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Completing the event makes normal financial records read-only and
              keeps the workspace available historically.
            </p>
            {blockers.length > 0 ? (
              <div className="mt-4 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                Resolve blocking issues before completion.
              </div>
            ) : (
              <ConfirmationSummary title="Review and confirm completion">
                <form action={completeEventAction} className="grid gap-4">
                  <input type="hidden" name="eventId" value={eventId} />
                  {warnings.length > 0 ? (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                      <p className="font-medium">
                        {warnings.length} warning{warnings.length === 1 ? "" : "s"} require acknowledgement.
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {warnings.map((item) => (
                          <li key={item.code}>{readinessTitle(item)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">Completion note</span>
                    <textarea
                      name="reason"
                      rows={3}
                      className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </label>
                  <label className="flex gap-2 text-sm">
                    <input
                      name="acknowledgeWarnings"
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      required={warnings.length > 0}
                    />
                    <span>
                      I understand that unresolved financial items may remain
                      and that completion is not bank reconciliation.
                    </span>
                  </label>
                  <div>
                    <SubmitButton pendingLabel="Completing...">
                      Complete event
                    </SubmitButton>
                  </div>
                </form>
              </ConfirmationSummary>
            )}
          </article>
        ) : null}

        {canArchive ? (
          <article className="rounded-md border p-4">
            <h3 className="flex items-center gap-2 font-medium">
              <Archive className="h-4 w-4" aria-hidden="true" />
              Archive Event
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Archiving is a long-term historical classification. It does not
              delete event data.
            </p>
            <ConfirmationSummary title="Review and confirm archive">
              <form action={archiveEventAction} className="grid gap-4">
                <input type="hidden" name="eventId" value={eventId} />
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Archive reason</span>
                  <textarea
                    name="reason"
                    rows={3}
                    required
                    className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </label>
                <div>
                  <SubmitButton pendingLabel="Archiving..." variant="secondary">
                    Archive event
                  </SubmitButton>
                </div>
              </form>
            </ConfirmationSummary>
          </article>
        ) : null}

        {canReopen ? (
          <article className="rounded-md border border-amber-300 p-4">
            <h3 className="flex items-center gap-2 font-medium">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reopen for Reconciliation
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This exceptional action returns the event to Reconciliation.
              Financial permissions remain role-based.
            </p>
            <ConfirmationSummary title="Review and confirm exceptional reopening">
              <form action={reopenEventAction} className="grid gap-4">
                <input type="hidden" name="eventId" value={eventId} />
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Reopen reason</span>
                  <textarea
                    name="reason"
                    rows={3}
                    required
                    className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </label>
                <div>
                  <SubmitButton pendingLabel="Reopening..." variant="outline">
                    Reopen event
                  </SubmitButton>
                </div>
              </form>
            </ConfirmationSummary>
          </article>
        ) : null}

        {!canComplete && !canArchive && !canReopen ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground lg:col-span-3">
            No lifecycle transitions are available from {stageLabel(status)}.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function LifecycleHistory({ history }: { history: LifecycleHistoryRow[] }) {
  return (
    <section className="rounded-md border bg-white p-5 shadow-sm">
      <h2 className="font-medium">Lifecycle history</h2>
      {history.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No lifecycle transitions have been recorded yet.
        </p>
      ) : (
        <ol className="mt-4 grid gap-3">
          {history.map((item) => {
            const acknowledgedWarnings = Array.isArray(item.acknowledged_warnings)
              ? item.acknowledged_warnings.length
              : 0;
            return (
              <li key={item.id} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.action === "reopened" ? "secondary" : "outline"}>
                    {stageLabel(item.action)}
                  </Badge>
                  {item.action === "reopened" ? (
                    <Badge variant="outline">Exceptional</Badge>
                  ) : null}
                  <p className="font-medium">
                    Moved from {stageLabel(item.previous_status)} to{" "}
                    {stageLabel(item.new_status)}
                  </p>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {dateTime(item.created_at)} by{" "}
                  {item.actor?.preferred_name ??
                    item.actor?.display_name ??
                    "Unknown actor"}
                </p>
                <p className="mt-2">{reasonText(item.reason)}</p>
                {acknowledgedWarnings > 0 ? (
                  <p className="mt-2 text-muted-foreground">
                    Warnings acknowledged: {acknowledgedWarnings}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
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
  const { event } = eventAccess;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Lifecycle</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Manage the operational stage of this event.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {acknowledgementRequired ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Warnings must be explicitly acknowledged before this event can be completed.
        </div>
      ) : null}
      {completed ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
          Event completed. The workspace is now read-only historical data.
        </div>
      ) : null}
      {archived ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
          Event archived. Data remains preserved and readable historically.
        </div>
      ) : null}
      {reopened ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
          Event reopened into Reconciliation. Normal permissions apply again; history was preserved.
        </div>
      ) : null}

      {eventAccess.isReadOnly ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Historical read-only event</p>
            <p className="mt-1">
              Existing records remain available. New governance, finance and
              payment mutations are blocked by the database.
            </p>
          </div>
        </div>
      ) : null}

      <CurrentStageSummary eventAccess={eventAccess} summary={lifecycle.summary} />
      <LifecycleProgress status={event.status} />
      <LifecycleReadinessPanel
        eventId={event.id}
        readiness={lifecycle.readiness}
        canViewReadiness={canManageLifecycle}
      />

      {canManageLifecycle ? (
        <LifecycleControls
          eventId={event.id}
          status={event.status}
          readiness={lifecycle.readiness}
        />
      ) : (
        <section className="rounded-md border bg-white p-5 shadow-sm">
          <h2 className="font-medium">Lifecycle controls</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Only event Presidents can change the lifecycle stage.
          </p>
        </section>
      )}

      <LifecycleHistory history={lifecycle.history} />
    </div>
  );
}
