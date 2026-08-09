import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AllocationDonut, StackedFinancialBar } from "@/components/financial-visuals";
import { responsiveMetricGridClassName } from "@/components/responsive-metric-grid";
import type { DashboardData, DashboardWarning } from "@/lib/dashboard/data";
import { formatMinor } from "@/lib/money";
import type { EventAccess } from "@/lib/events/access";
import { isHistoricalStatus, summarizeRoles } from "@/lib/events/access";
import { cn } from "@/lib/utils";

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function dateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
}

function plainDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "Not set";
}

function moduleHref(eventId: string, module: string | null | undefined) {
  switch (module) {
    case "budget":
      return `/events/${eventId}/budget`;
    case "revenue":
      return `/events/${eventId}/revenue`;
    case "requests":
      return `/events/${eventId}/requests`;
    case "approvals":
      return `/events/${eventId}/approvals`;
    case "payments":
      return `/events/${eventId}/payments`;
    default:
      return `/events/${eventId}/dashboard`;
  }
}

function paidNetFromGross(approvedNet: number, approvedGross: number, paidGross: number) {
  if (approvedNet <= 0 || approvedGross <= 0 || paidGross <= 0) return 0;
  return Math.min(approvedNet, Math.round((approvedNet * Math.min(approvedGross, paidGross)) / approvedGross));
}

const departmentColours = ["#6AAED6", "#7CC7A2", "#F2C572", "#E99292", "#A7B4D6", "#B9A6D3", "#89C5C7", "#D8A36F"];

function Card({
  title,
  value,
  basis,
  description,
  href,
}: {
  title: string;
  value: string;
  basis: string;
  description: string;
  href?: string;
}) {
  return (
    <section className="min-w-0 rounded-md border p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
        <Badge variant="outline" className="shrink-0">{basis}</Badge>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      {href ? (
        <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline" href={href}>
          Open module <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}

function WarningItem({ warning, eventId }: { warning: DashboardWarning; eventId: string }) {
  return (
    <li className="rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={warning.severity === "warning" ? "destructive" : "secondary"}>{label(warning.severity)}</Badge>
        <p className="font-medium">{warning.title}</p>
      </div>
      <p className="mt-1 text-muted-foreground">{warning.message}</p>
      <Link className="mt-2 inline-block font-medium underline-offset-4 hover:underline" href={moduleHref(eventId, warning.target_module)}>
        Review {label(warning.target_module)}
      </Link>
    </li>
  );
}

export function DashboardPanel({
  eventAccess,
  data,
  canManageFinance,
}: {
  eventAccess: EventAccess;
  data: DashboardData;
  canManageFinance: boolean;
  canManageLifecycle?: boolean;
}) {
  const { position } = data;
  const eventId = eventAccess.event.id;
  const isReadOnly = eventAccess.isReadOnly;
  const isHistorical = isHistoricalStatus(eventAccess.event.status);
  const budgetNet = Number(position.total_current_department_budget_minor ?? 0);
  const approvedNet = Number(position.approved_net_spending_minor ?? 0);
  const pendingNet = Number(position.pending_net_spending_minor ?? 0);
  const paidNet = paidNetFromGross(
    approvedNet,
    Number(position.approved_gross_spending_minor ?? 0),
    Number(position.paid_gross_spending_minor ?? 0),
  );
  const approvedUnpaidNet = Math.max(0, approvedNet - paidNet);
  const remainingNet = Math.max(0, budgetNet - paidNet - approvedUnpaidNet - pendingNet);
  const overspendNet = Math.max(0, paidNet + approvedUnpaidNet + pendingNet - budgetNet);
  const allocationSegments = data.departments
    .filter((department) => department.has_active_allocation)
    .map((department, index) => ({
      key: department.department_id ?? `department-${index}`,
      label: department.department_name ?? "Unnamed department",
      amountMinor: Number(department.current_budget_minor ?? 0),
      colour: departmentColours[index % departmentColours.length],
    }));

  return (
    <div className="grid min-w-0 gap-6">
      {isReadOnly ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-medium">Read-only historical dashboard</h2>
            <p className="mt-1 text-sm">This event is retained for historical reference. Mutation controls are not available.</p>
          </div>
        </div>
      ) : null}

      <section className="min-w-0 rounded-md border p-5">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{eventAccess.organisation?.name ?? "Organisation unavailable"}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">{position.event_name ?? eventAccess.event.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {position.event_year} event; {plainDate(position.event_date)}. Your roles: {summarizeRoles(eventAccess.roles)}.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant={isHistorical ? "secondary" : "default"}>{label(position.event_status)}</Badge>
            <Badge variant="outline">{isReadOnly ? "Read-only" : "Active dashboard"}</Badge>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
          <div><dt className="text-muted-foreground">Active budget</dt><dd>{position.has_active_budget ? `${position.active_budget_name} v${position.active_budget_version_number}` : "Not configured"}</dd></div>
          <div><dt className="text-muted-foreground">Latest actual revenue snapshot</dt><dd>{dateTime(position.latest_captured_at)}</dd></div>
          <div><dt className="text-muted-foreground">Central contingency reserve</dt><dd>{formatMinor(position.unallocated_contingency_minor)}</dd></div>
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-normal">Financial position</h2>
        <div className={cn("mt-3", responsiveMetricGridClassName)}>
          <Card title="Forecast income" value={formatMinor(position.total_forecast_net_minor)} basis="net" description="Ticket forecast plus non-cancelled other revenue forecasts." href={`/events/${eventId}/revenue`} />
          <Card title="Actual income recorded" value={position.latest_snapshot_id ? formatMinor(position.total_actual_gross_minor) : "No snapshot"} basis="gross" description="Latest cumulative ticket snapshot plus actual other revenue." href={`/events/${eventId}/revenue`} />
          <Card title="Approved commitments" value={formatMinor(position.approved_net_spending_minor)} basis="net" description="Current approved revisions only. Approval does not imply payment." href={`/events/${eventId}/requests?status=approved`} />
          <Card title="Paid to date" value={formatMinor(position.paid_gross_spending_minor)} basis="gross cash" description="Non-reversed payment allocations only." href={`/events/${eventId}/payments`} />
          <Card title="Forecast surplus / deficit" value={formatMinor(position.formal_forecast_net_position_minor)} basis="net" description="Forecast net revenue minus approved net spending and unallocated contingency." />
          <Card title="Potential surplus / deficit" value={formatMinor(position.potential_forecast_net_position_minor)} basis="net" description="Formal forecast minus submitted and pending variation exposure. Drafts are excluded." />
        </div>
      </section>

      <StackedFinancialBar
        title="Whole-event spending position"
        description="Net budget use split between approved paid, approved unpaid, submitted/potential and remaining budget. Paid cash remains a separate gross figure above."
        basis="net budget basis"
        totalMinor={position.has_active_budget ? budgetNet : 0}
        overspendMinor={overspendNet}
        segments={[
          { key: "approved-paid", label: "Approved and paid", amountMinor: paidNet, tone: "paid", description: "net equivalent" },
          { key: "approved-unpaid", label: "Approved but unpaid", amountMinor: approvedUnpaidNet, tone: "approvedUnpaid", description: "net outstanding" },
          { key: "submitted-potential", label: "Submitted / potential", amountMinor: pendingNet, tone: "potential", description: "net pending" },
          { key: "remaining", label: "Remaining budget", amountMinor: position.has_active_budget ? remainingNet : 0, tone: "remaining", description: "net uncommitted" },
        ]}
      />

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-md border p-5">
          <h2 className="font-medium">Income and forecast position</h2>
          <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
            <div><dt className="text-muted-foreground">Formal forecast</dt><dd className="text-lg font-semibold">{formatMinor(position.formal_forecast_net_position_minor)}</dd></div>
            <div><dt className="text-muted-foreground">Pending exposure</dt><dd className="text-lg font-semibold">{formatMinor(position.pending_net_position_delta_minor)}</dd></div>
            <div><dt className="text-muted-foreground">Potential forecast</dt><dd className="text-lg font-semibold">{formatMinor(position.potential_forecast_net_position_minor)}</dd></div>
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">Formal uses approved spending only. Potential adds submitted requests and pending variation increments. Both keep unallocated contingency reserved centrally.</p>
        </div>

        <div className="min-w-0 rounded-md border p-5">
          <h2 className="font-medium">Revenue snapshot</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Ticket forecast</dt><dd>{formatMinor(position.ticket_forecast_net_minor)} net</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Other forecast</dt><dd>{formatMinor(position.other_forecast_net_minor)} net</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Latest ticket actual</dt><dd>{position.latest_snapshot_id ? `${formatMinor(position.ticket_actual_gross_minor)} gross` : "No snapshot"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Other actual</dt><dd>{formatMinor(position.other_actual_gross_minor)} gross</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Refunds to date</dt><dd>{formatMinor(position.ticket_refunds_to_date_minor)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Booking fees</dt><dd>{formatMinor(position.ticket_booking_fees_to_date_minor)} separate</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Snapshot time</dt><dd>{dateTime(position.latest_captured_at)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {data.departments.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No active departments are configured for this event.</p>
        ) : (
          <AllocationDonut
            title="Spending by department budget"
            description="Current department budget concentration from the shared reporting view."
            totalMinor={allocationSegments.reduce((sum, segment) => sum + segment.amountMinor, 0)}
            centreLabel="Department budget"
            segments={allocationSegments}
          />
        )}

        <div className="rounded-md border p-5">
          <h2 className="font-medium">Department pressure</h2>
          <div className="mt-4 grid gap-3">
            {data.departments.slice(0, 5).map((department) => (
              <Link key={department.department_id} href={`/events/${eventId}/finances?department=${department.department_id}`} className="rounded-md border p-3 text-sm underline-offset-4 hover:underline">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{department.department_name} <span className="text-muted-foreground">{department.department_code}</span></p>
                  {department.approved_over_budget ? <Badge variant="destructive">Approved over budget</Badge> : department.potential_over_budget ? <Badge variant="secondary">Potentially over budget</Badge> : <Badge variant="outline">Within budget</Badge>}
                </div>
                <p className="mt-1 text-muted-foreground">
                  {formatMinor(department.approved_net_minor)} approved; {formatMinor(department.pending_net_minor)} submitted; {department.has_active_allocation ? `${formatMinor(department.potential_remaining_minor)} potential remaining` : "No active allocation"}
                </p>
              </Link>
            ))}
            {data.departments.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No department positions are available.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-md border p-5">
          <h2 className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Attention</h2>
          {data.warnings.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No objective dashboard warnings are currently present.</p>
          ) : (
            <ul className="mt-4 grid gap-3">{data.warnings.map((warning) => <WarningItem key={`${warning.code}-${warning.target_module}`} warning={warning} eventId={eventId} />)}</ul>
          )}
        </div>

        <div className="min-w-0 rounded-md border p-5">
          <h2 className="flex items-center gap-2 font-medium"><Scale className="h-4 w-4" aria-hidden="true" />Pending approvals</h2>
          {!canManageFinance ? (
            <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">Approval queue details are available to treasurers only.</p>
          ) : data.pendingApprovals.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No requests are awaiting treasurer review.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {data.pendingApprovals.map((row) => (
                <Link key={`${row.request_id}-${row.revision_id}`} href={`/events/${eventId}/approvals/${row.request_id}`} className="rounded-md border p-3 text-sm underline-offset-4 hover:underline">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{row.request_code}: {row.title}</p>
                    <Badge variant={row.budget_warning ? "destructive" : "outline"}>{row.budget_warning ? "Budget warning" : label(row.request_type)}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{row.owner_preferred_name ?? row.owner_display_name ?? "Committee member"}; {row.primary_department_code}; {formatMinor(row.net_minor)} net / {formatMinor(row.gross_minor)} gross; submitted {dateTime(row.submitted_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium"><Activity className="h-4 w-4" aria-hidden="true" />Recent financial activity</h2>
        {data.activity.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No financial activity is visible to you yet.</p>
        ) : (
          <ol className="mt-4 grid gap-3">
            {data.activity.map((item) => (
              <li key={item.activity_id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{label(item.action)}</Badge>
                  <p className="font-medium">{item.summary}</p>
                </div>
                <p className="mt-1 text-muted-foreground">{item.actor_display_name ?? "System"}; {dateTime(item.created_at)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
