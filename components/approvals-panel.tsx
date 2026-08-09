import Link from "next/link";
import { AlertCircle, CheckCircle, History, MessageSquareWarning, Scale, TriangleAlert, XCircle } from "lucide-react";
import { decideSpendingRequestAction } from "@/app/events/[eventId]/approvals/actions";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ApprovalQueueData,
  ApprovalReviewData,
  RevisionHistoryRow,
} from "@/lib/approvals/data";
import { formatMinor, sumMinor } from "@/lib/money";

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function person(row: { owner_preferred_name?: string | null; owner_display_name?: string | null }) {
  return row.owner_preferred_name ?? row.owner_display_name ?? "Committee member";
}

function dateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not submitted";
}

const decisionUi = {
  approved: {
    label: "Approve",
    heading: "Approve",
    description: "Authorise this submitted revision for spending. This does not record payment.",
    pendingLabel: "Approving...",
    buttonVariant: "success",
    cardClassName: "border-emerald-300 bg-emerald-50/70",
    iconClassName: "text-emerald-700",
    icon: CheckCircle,
  },
  changes_requested: {
    label: "Request Changes",
    heading: "Request changes",
    description: "Return this request to the requester with clear instructions for revision.",
    pendingLabel: "Requesting changes...",
    buttonVariant: "warning",
    cardClassName: "border-amber-300 bg-amber-50/80",
    iconClassName: "text-amber-700",
    icon: MessageSquareWarning,
  },
  rejected: {
    label: "Reject",
    heading: "Reject",
    description: "Decline this submitted revision. Include the reason for the audit trail.",
    pendingLabel: "Rejecting...",
    buttonVariant: "destructive",
    cardClassName: "border-red-300 bg-red-50/70",
    iconClassName: "text-red-700",
    icon: XCircle,
  },
} as const;

function Message({
  error,
  decided,
}: {
  error?: string;
  decided?: string;
}) {
  if (error) {
    return (
      <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }
  if (decided) {
    return (
      <div className="flex gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        <CheckCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>Decision recorded: {label(decided)}.</p>
      </div>
    );
  }
  return null;
}

export function ApprovalQueuePanel({
  eventId,
  data,
  departmentId,
  requestType,
}: {
  eventId: string;
  data: ApprovalQueueData;
  departmentId?: string;
  requestType?: string;
}) {
  const filtered = data.queue.filter((row) => {
    if (departmentId && row.primary_department_id !== departmentId) return false;
    if (requestType && row.request_type !== requestType) return false;
    return true;
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Approval queue</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Submitted requests and pending variations awaiting treasurer decision.
            Approval authorises spending but does not record payment.
          </p>
        </div>
        <Button asChild variant="outline"><Link href={`/events/${eventId}/requests`}>All requests</Link></Button>
      </div>

      <section className="rounded-md border p-4">
        <h2 className="font-medium">Filters</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Button asChild size="sm" variant={!departmentId && !requestType ? "default" : "outline"}><Link href={`/events/${eventId}/approvals`}>All awaiting review</Link></Button>
          <Button asChild size="sm" variant={requestType === "initial" ? "default" : "outline"}><Link href={`/events/${eventId}/approvals?type=initial`}>Initial requests</Link></Button>
          <Button asChild size="sm" variant={requestType === "variation" ? "default" : "outline"}><Link href={`/events/${eventId}/approvals?type=variation`}>Variations</Link></Button>
          {data.departments.map((department) => (
            <Button key={department.id} asChild size="sm" variant={departmentId === department.id ? "default" : "outline"}>
              <Link href={`/events/${eventId}/approvals?department=${department.id}`}>{department.code}</Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <Scale className="h-4 w-4" aria-hidden="true" />
          Awaiting decision
        </h2>
        {data.queue.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No requests are awaiting treasurer review.
          </p>
        ) : filtered.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No queue rows match those filters.
          </p>
        ) : (
          <div className="mt-4 max-w-full overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Reference</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Owner</th>
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 text-right font-medium">Gross</th>
                  <th className="py-2 pr-4 font-medium">Submitted</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={`${row.request_id}-${row.revision_id}`} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium">{row.code}</td>
                    <td className="py-3 pr-4"><Badge variant={row.request_type === "variation" ? "secondary" : "outline"}>{label(row.request_type)}</Badge></td>
                    <td className="py-3 pr-4">{row.title}</td>
                    <td className="py-3 pr-4">{person(row)}</td>
                    <td className="py-3 pr-4">{row.primary_department_code}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(row.gross_minor)}</td>
                    <td className="py-3 pr-4">{dateTime(row.submitted_at)}</td>
                    <td className="py-3">
                      <Button asChild size="sm" variant="outline"><Link href={`/events/${eventId}/approvals/${row.request_id}`}>Review</Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function ApprovalReviewPanel({
  eventId,
  data,
  canDecide,
  readOnly,
  error,
  decided,
}: {
  eventId: string;
  data: ApprovalReviewData;
  canDecide: boolean;
  readOnly: boolean;
  error?: string;
  decided?: string;
}) {
  const { detail, impacts, eventContext, revisions, reviews } = data;
  const { request, allocations, components } = detail;
  const isPending = request.revision_status === "submitted" && (request.approval_status === "submitted" || request.approval_status === "variation_pending");
  const requestType = request.current_approved_revision_id ? "variation" : "initial";
  const proposedNet = sumMinor(allocations.map((allocation) => allocation.net_minor));
  const incrementalNet = sumMinor(impacts.map((impact) => impact.incremental_net_minor));
  const showDecisionControls = canDecide && isPending && !readOnly && Boolean(request.revision_id);
  const overBudget = impacts.some((impact) => impact.over_budget);
  const approvedBaseline = revisions.find((revision) => revision.is_current_approved);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{request.code}</p>
          <h1 className="text-2xl font-semibold tracking-normal">{request.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={requestType === "variation" ? "secondary" : "outline"}>{label(requestType)}</Badge>
          <StatusBadge kind="approval" status={request.approval_status} />
          <Button asChild variant="outline"><Link href={`/events/${eventId}/approvals`}>Back to queue</Link></Button>
        </div>
      </div>
      <Message error={error} decided={decided} />
      {readOnly ? <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">This historical event is read-only. Approval decisions are not available.</div> : null}
      {overBudget ? (
        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <TriangleAlert className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <p>Approval would put at least one department over its current approved budget. This warning does not transfer contingency automatically.</p>
        </div>
      ) : null}

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Submitted proposal</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
          <div><dt className="text-muted-foreground">Owner</dt><dd>{person(request)}</dd></div>
          <div><dt className="text-muted-foreground">Revision</dt><dd>v{request.revision_number}</dd></div>
          <div><dt className="text-muted-foreground">Submitted</dt><dd>{dateTime(request.revision_submitted_at)}</dd></div>
          <div><dt className="text-muted-foreground">Supplier</dt><dd>{request.supplier_name ?? "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Expected payment</dt><dd>{request.expected_payment_date ?? "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">VAT treatment</dt><dd>{label(request.vat_treatment)}</dd></div>
          <div><dt className="text-muted-foreground">Net</dt><dd>{formatMinor(request.net_minor)}</dd></div>
          <div><dt className="text-muted-foreground">VAT</dt><dd>{formatMinor(request.vat_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Gross</dt><dd>{formatMinor(request.gross_minor)}</dd></div>
        </dl>
        {request.description ? <p className="mt-4 text-sm text-muted-foreground">{request.description}</p> : null}
      </section>

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Department impact</h2>
        {impacts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No active budget impact is available for this request.</p>
        ) : (
          <div className="mt-4 max-w-full overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Department</th>
                  <th className="py-2 pr-4 text-right font-medium">Budget</th>
                  <th className="py-2 pr-4 text-right font-medium">Approved spend</th>
                  <th className="py-2 pr-4 text-right font-medium">Baseline</th>
                  <th className="py-2 pr-4 text-right font-medium">Proposed</th>
                  <th className="py-2 pr-4 text-right font-medium">Incremental</th>
                  <th className="py-2 text-right font-medium">Potential remaining</th>
                </tr>
              </thead>
              <tbody>
                {impacts.map((impact) => (
                  <tr key={impact.department_id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">{impact.department_name} <span className="text-muted-foreground">{impact.department_code}</span></td>
                    <td className="py-3 pr-4 text-right">{formatMinor(impact.current_budget_minor)}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(impact.approved_net_minor)}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(impact.baseline_net_minor)}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(impact.proposed_net_minor)}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(impact.incremental_net_minor)}</td>
                    <td className="py-3 text-right">{formatMinor(impact.potential_remaining_after_minor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          This proposal net effect is {formatMinor(requestType === "variation" ? incrementalNet : proposedNet)}. Pending variations use only the incremental increase over the approved baseline.
        </p>
      </section>

      {approvedBaseline ? (
        <RevisionComparison current={request} baseline={approvedBaseline} />
      ) : null}

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Event approval context</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-4">
          <div><dt className="text-muted-foreground">Forecast net revenue</dt><dd>{formatMinor(eventContext?.forecast_net_revenue_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Approved net spending</dt><dd>{formatMinor(eventContext?.approved_net_spending_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Pending net exposure</dt><dd>{formatMinor(eventContext?.pending_net_spending_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Unallocated contingency</dt><dd>{formatMinor(eventContext?.unallocated_contingency_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Formal net position</dt><dd>{formatMinor(eventContext?.formal_net_position_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Potential net position</dt><dd>{formatMinor(eventContext?.potential_net_position_minor)}</dd></div>
        </dl>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Components</h2>
        <div className="mt-4 grid gap-3">
          {components.map((component) => (
            <div key={component.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-3">
                <p className="font-medium">{component.code}: {component.description}</p>
                <p>{formatMinor(component.gross_minor)} gross</p>
              </div>
              <p className="mt-1 text-muted-foreground">{component.supplier_name ?? "Supplier not set"}; expected {component.expected_payment_date ?? "date not set"}</p>
            </div>
          ))}
        </div>
      </section>

      {showDecisionControls ? (
        <section className="rounded-md border p-5">
          <h2 className="font-medium">Decision</h2>
          <p className="mt-2 text-sm text-muted-foreground">Confirm the exact submitted revision above. Approval does not mean paid.</p>
          <div data-testid="decision-action-grid" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DecisionForm eventId={eventId} requestId={request.request_id ?? ""} revisionId={request.revision_id ?? ""} decision="approved" />
            <DecisionForm eventId={eventId} requestId={request.request_id ?? ""} revisionId={request.revision_id ?? ""} decision="changes_requested" reasonLabel="Change instructions" />
            <DecisionForm eventId={eventId} requestId={request.request_id ?? ""} revisionId={request.revision_id ?? ""} decision="rejected" reasonLabel="Rejection reason" />
          </div>
        </section>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">This request is not currently awaiting an actionable treasurer decision.</div>
      )}

      <RevisionHistory revisions={revisions} />
      <ReviewHistory reviews={reviews} />
    </div>
  );
}

function RevisionComparison({
  current,
  baseline,
}: {
  current: ApprovalReviewData["detail"]["request"];
  baseline: RevisionHistoryRow;
}) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="font-medium">Revision comparison</h2>
      <div className="mt-4 max-w-full overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">Field</th>
              <th className="py-2 pr-4 font-medium">Approved baseline</th>
              <th className="py-2 pr-4 font-medium">Proposed revision</th>
              <th className="py-2 font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            <CompareText label="Title" before={baseline.title} after={current.title} />
            <CompareText label="Supplier" before={baseline.supplier_name} after={current.supplier_name} />
            <CompareText label="Expected date" before={baseline.expected_payment_date} after={current.expected_payment_date} />
            <CompareMoney label="Net" before={baseline.net_minor} after={current.net_minor} />
            <CompareMoney label="VAT" before={baseline.vat_minor} after={current.vat_minor} />
            <CompareMoney label="Gross" before={baseline.gross_minor} after={current.gross_minor} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompareText({
  label: rowLabel,
  before,
  after,
}: {
  label: string;
  before: string | null | undefined;
  after: string | null | undefined;
}) {
  const changed = (before ?? "") !== (after ?? "");
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-3 pr-4 font-medium">{rowLabel}</td>
      <td className="py-3 pr-4">{before ?? "Not set"}</td>
      <td className="py-3 pr-4">{after ?? "Not set"}</td>
      <td className="py-3">{changed ? "Changed" : "No change"}</td>
    </tr>
  );
}

function CompareMoney({
  label: rowLabel,
  before,
  after,
}: {
  label: string;
  before: number | string | bigint | null | undefined;
  after: number | string | bigint | null | undefined;
}) {
  const beforeNumber = typeof before === "bigint" ? Number(before) : Number(before ?? 0);
  const afterNumber = typeof after === "bigint" ? Number(after) : Number(after ?? 0);
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-3 pr-4 font-medium">{rowLabel}</td>
      <td className="py-3 pr-4">{formatMinor(before)}</td>
      <td className="py-3 pr-4">{formatMinor(after)}</td>
      <td className="py-3">{formatMinor(afterNumber - beforeNumber)}</td>
    </tr>
  );
}

function DecisionForm({
  eventId,
  requestId,
  revisionId,
  decision,
  reasonLabel,
}: {
  eventId: string;
  requestId: string;
  revisionId: string;
  decision: "approved" | "rejected" | "changes_requested";
  reasonLabel?: string;
}) {
  const ui = decisionUi[decision];
  const Icon = ui.icon;
  return (
    <form action={decideSpendingRequestAction} className={`grid gap-3 rounded-md border p-4 ${ui.cardClassName}`}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="decision" value={decision} />
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 ${ui.iconClassName}`} aria-hidden="true" />
        <div>
          <h3 className="font-medium">{ui.heading}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{ui.description}</p>
        </div>
      </div>
      {reasonLabel ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{reasonLabel}</span>
          <textarea name="reason" rows={3} required className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </label>
      ) : null}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" required className="mt-1 h-4 w-4 rounded border" />
        <span>I confirm this decision applies to the submitted revision shown.</span>
      </label>
      <SubmitButton pendingLabel={ui.pendingLabel} variant={ui.buttonVariant}>{ui.label}</SubmitButton>
    </form>
  );
}

function RevisionHistory({ revisions }: { revisions: RevisionHistoryRow[] }) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="flex items-center gap-2 font-medium">
        <History className="h-4 w-4" aria-hidden="true" />
        Revision history
      </h2>
      {revisions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No revision history is visible.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {revisions.map((revision) => (
            <div key={revision.revision_id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">v{revision.revision_number}: {revision.title}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{label(revision.revision_status)}</Badge>
                  {revision.is_current_approved ? <Badge>Approved baseline</Badge> : null}
                  {revision.is_pending_review ? <Badge variant="secondary">Pending review</Badge> : null}
                  {revision.is_current_draft ? <Badge variant="secondary">Editable draft</Badge> : null}
                </div>
              </div>
              <p className="mt-2 text-muted-foreground">
                {formatMinor(revision.net_minor)} net, {formatMinor(revision.gross_minor)} gross. Created {dateTime(revision.created_at)}.
              </p>
              {revision.change_summary ? <p className="mt-1 text-muted-foreground">Change summary: {revision.change_summary}</p> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewHistory({ reviews }: { reviews: ApprovalReviewData["reviews"] }) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="font-medium">Review history</h2>
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No formal review decisions have been recorded.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {reviews.map((review) => (
            <div key={review.review_id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">{label(review.decision)} on revision v{review.revision_number}</p>
                <p className="text-muted-foreground">{dateTime(review.created_at)}</p>
              </div>
              <p className="mt-1 text-muted-foreground">Reviewer: {review.reviewer_preferred_name ?? review.reviewer_display_name ?? "Treasurer"}</p>
              {review.reason ? <p className="mt-2">{review.reason}</p> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
