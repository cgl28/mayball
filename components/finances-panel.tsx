import Link from "next/link";
import { AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StackedFinancialBar } from "@/components/financial-visuals";
import { responsiveMetricGridClassName } from "@/components/responsive-metric-grid";
import type { DepartmentFinanceRequest, FinancePositionSummary, FinancesData } from "@/lib/finances/data";
import { formatMinor } from "@/lib/money";
import type { EventAccess } from "@/lib/events/access";

const approvalFilters = ["all", "draft", "submitted", "changes_requested", "approved", "variation_pending", "rejected", "cancelled"] as const;
const paymentFilters = ["all", "unpaid", "partially_paid", "paid", "overpaid", "not_applicable"] as const;

function date(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "Not set";
}

function url(eventId: string, params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all") search.set(key, value);
  }
  const query = search.toString();
  return `/events/${eventId}/finances${query ? `?${query}` : ""}`;
}

function metric(label: string, value: string, basis: string, help: string) {
  return (
    <section className="min-w-0 rounded-md border bg-white p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h3 className="min-w-0 text-sm font-medium text-muted-foreground">{label}</h3>
        <Badge variant="outline" className="shrink-0">{basis}</Badge>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{help}</p>
    </section>
  );
}

function budgetUseSegments(summary: FinancePositionSummary) {
  const committed = summary.approvedPaidNetMinor + summary.approvedUnpaidNetMinor + summary.submittedNetMinor;
  const remaining = summary.budgetNetMinor === null ? 0 : Math.max(0, summary.budgetNetMinor - committed);
  return [
    {
      key: "approved-paid",
      label: "Approved and paid",
      amountMinor: summary.approvedPaidNetMinor,
      tone: "paid" as const,
      description: "net equivalent",
    },
    {
      key: "approved-unpaid",
      label: "Approved but unpaid",
      amountMinor: summary.approvedUnpaidNetMinor,
      tone: "approvedUnpaid" as const,
      description: "net outstanding",
    },
    {
      key: "submitted-potential",
      label: "Submitted exposure",
      amountMinor: summary.submittedNetMinor,
      tone: "potential" as const,
      description: "net pending",
    },
    {
      key: "remaining",
      label: "Remaining budget",
      amountMinor: remaining,
      tone: "remaining" as const,
      description: "net uncommitted",
    },
  ];
}

function BudgetUseVisual({
  title,
  description,
  summary,
}: {
  title: string;
  description: string;
  summary: FinancePositionSummary;
}) {
  if (summary.budgetNetMinor === null) {
    return (
      <section className="rounded-md border bg-white p-5">
        <h2 className="font-medium">{title}</h2>
        <p className="mt-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No active budget is available. Spending can still be reviewed, but remaining budget cannot be calculated.
        </p>
      </section>
    );
  }

  const committed = summary.approvedPaidNetMinor + summary.approvedUnpaidNetMinor + summary.submittedNetMinor;
  const overspend = Math.max(0, committed - summary.budgetNetMinor);

  return (
    <StackedFinancialBar
      title={title}
      description={description}
      basis="net budget basis"
      totalMinor={summary.budgetNetMinor}
      segments={budgetUseSegments(summary)}
      overspendMinor={overspend}
    />
  );
}

function filteredRows(rows: DepartmentFinanceRequest[], approvalStatus: string, paymentStatus: string, search: string) {
  const needle = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (approvalStatus !== "all" && row.approvalStatus !== approvalStatus) return false;
    if (paymentStatus !== "all" && row.paymentStatus !== paymentStatus) return false;
    if (!needle) return true;
    return [row.reference, row.title, row.supplier ?? ""].some((value) => value.toLowerCase().includes(needle));
  });
}

export function FinancesPanel({
  eventAccess,
  data,
  approvalStatus = "all",
  paymentStatus = "all",
  search = "",
  canCreateRequest,
  canManageSetup,
}: {
  eventAccess: EventAccess;
  data: FinancesData;
  approvalStatus?: string;
  paymentStatus?: string;
  search?: string;
  canCreateRequest: boolean;
  canManageSetup: boolean;
}) {
  const eventId = eventAccess.event.id;
  const department = data.selectedDepartment;
  const rows = filteredRows(data.requests, approvalStatus, paymentStatus, search);

  if (data.departments.length === 0 || !department?.department_id) {
    return (
      <div className="grid min-w-0 gap-6">
        <h1 className="text-2xl font-semibold tracking-normal">Finances</h1>
        <section className="rounded-md border bg-white p-5">
          <p className="text-sm text-muted-foreground">No departments have been configured for this event.</p>
          {canManageSetup ? (
            <Button asChild className="mt-4"><Link href={`/events/${eventId}/departments`}>Open Departments setup</Link></Button>
          ) : null}
        </section>
      </div>
    );
  }

  const currentBudget = department.has_active_allocation ? Number(department.current_budget_minor ?? 0) : null;
  const approvedNet = Number(department.approved_net_minor ?? 0);
  const submittedNet = Number(department.pending_net_minor ?? 0);
  const remaining = department.remaining_approved_minor;
  const potentialRemaining = department.potential_remaining_minor;
  const departmentSummary: FinancePositionSummary = {
    budgetNetMinor: currentBudget,
    approvedNetMinor: approvedNet,
    approvedPaidNetMinor: data.totals.approvedPaidNetMinor,
    approvedUnpaidNetMinor: data.totals.approvedUnpaidNetMinor,
    submittedNetMinor: submittedNet,
    remainingNetMinor: currentBudget === null ? null : currentBudget - data.totals.approvedPaidNetMinor - data.totals.approvedUnpaidNetMinor - submittedNet,
    paidGrossMinor: data.totals.paidGrossMinor,
  };

  return (
    <div className="grid min-w-0 gap-6">
      {eventAccess.isReadOnly ? (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-medium">Read-only historical finances</h2>
            <p className="mt-1 text-sm">This event is retained for historical reference. Financial records are shown without mutation controls.</p>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal">Finances</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Department-level budget, commitment and payment monitoring. Approval status and payment status are shown separately.
          </p>
        </div>
        {canCreateRequest ? (
          <Button asChild>
            <Link href={`/events/${eventId}/requests/new`}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              Create Request
            </Link>
          </Button>
        ) : null}
      </div>

      <BudgetUseVisual
        title="Whole-event budget use"
        description="Net budget position split into approved paid, approved unpaid, submitted/potential and remaining budget. Gross cash paid is shown separately below."
        summary={data.wholeEvent}
      />

      <section className={responsiveMetricGridClassName}>
        {metric("Event budget", data.wholeEvent.budgetNetMinor === null ? "Not configured" : formatMinor(data.wholeEvent.budgetNetMinor), "net", "Total current department budget across the event.")}
        {metric("Approved commitments", formatMinor(data.wholeEvent.approvedNetMinor), "net", "Approved commitments split into paid and unpaid in the bar above.")}
        {metric("Approved outstanding", formatMinor(data.wholeEvent.approvedUnpaidNetMinor), "net", "Approved commitment still unpaid on a net-equivalent basis.")}
        {metric("Submitted exposure", formatMinor(data.wholeEvent.submittedNetMinor), "net", "Submitted requests plus pending variation exposure. Potential commitments include this exposure and approved commitments.")}
        {metric("Cash paid to date", formatMinor(data.wholeEvent.paidGrossMinor), "gross cash", "Non-reversed recorded payments. Kept separate from the net budget bar.")}
        {metric("Potential remaining", data.wholeEvent.remainingNetMinor === null ? "Not available" : formatMinor(data.wholeEvent.remainingNetMinor), "net", "Budget remaining after approved and submitted exposure.")}
      </section>

      <nav role="tablist" aria-label="Departments" className="flex max-w-full gap-2 overflow-x-auto border-b pb-2">
        {data.departments.map((item) => {
          const active = item.department_id === department.department_id;
          return (
            <Link
              key={item.department_id}
              role="tab"
              aria-selected={active}
              href={url(eventId, { department: item.department_id, status: approvalStatus, payment: paymentStatus, q: search })}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))] ${active ? "bg-[hsl(var(--marketing-brand))] text-white" : "border bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {item.department_name}
            </Link>
          );
        })}
      </nav>

      <section className="min-w-0 rounded-md border bg-white p-5">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-normal">{department.department_name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {department.department_code} department. Active department position from the shared dashboard reporting view.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant={department.has_active_allocation ? "default" : "secondary"}>
              {department.has_active_allocation ? "Active budget" : "No active budget"}
            </Badge>
            {eventAccess.isReadOnly ? <Badge variant="outline">Read-only</Badge> : null}
          </div>
        </div>
      </section>

      <BudgetUseVisual
        title={`${department.department_name} budget use`}
        description="Selected department net budget position using the same categories as the whole-event view."
        summary={departmentSummary}
      />

      <section className={responsiveMetricGridClassName}>
        {metric("Current budget", currentBudget === null ? "Not configured" : formatMinor(currentBudget), "net", "Active departmental budget after transfers.")}
        {metric("Approved commitments", formatMinor(approvedNet), "net", "Approved commitments, not paid cash.")}
        {metric("Approved outstanding", formatMinor(data.totals.approvedUnpaidNetMinor), "net", "Approved department commitment still unpaid on a net-equivalent basis.")}
        {metric("Submitted exposure", formatMinor(submittedNet), "net", "Submitted requests plus positive pending variation exposure.")}
        {metric("Cash paid to date", formatMinor(data.totals.paidGrossMinor), "gross cash", "Non-reversed payments apportioned by department allocation share.")}
        {metric("Remaining budget", remaining === null ? "Not available" : formatMinor(remaining), "net", "Current budget minus approved net commitments.")}
        {metric("Potential remaining", potentialRemaining === null ? "Not available" : formatMinor(potentialRemaining), "net", "Current budget minus approved and submitted exposure.")}
        {metric("Recoverable VAT", formatMinor(data.totals.recoverableVatMinor), "VAT", "VAT on approved visible department allocations.")}
      </section>

      <section className="rounded-md border bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-medium">Department requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">Rows include requests whose current visible revision has an allocation for {department.department_name}.</p>
          </div>
          <form className="flex flex-wrap gap-2" action={`/events/${eventId}/finances`}>
            <input type="hidden" name="department" value={department.department_id} />
            <input name="q" defaultValue={search} placeholder="Search reference, title or supplier" className="h-9 min-w-60 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            <Button type="submit" variant="outline" size="sm">Search</Button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {approvalFilters.map((filter) => (
            <Button key={filter} asChild variant={approvalStatus === filter ? "default" : "outline"} size="sm">
              <Link href={url(eventId, { department: department.department_id, status: filter, payment: paymentStatus, q: search })}>{filter === "all" ? "All" : statusLabel(filter)}</Link>
            </Button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {paymentFilters.map((filter) => (
            <Button key={filter} asChild variant={paymentStatus === filter ? "default" : "outline"} size="sm">
              <Link href={url(eventId, { department: department.department_id, status: approvalStatus, payment: filter, q: search })}>{filter === "all" ? "All payments" : statusLabel(filter)}</Link>
            </Button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No spending requests have been recorded for {department.department_name} with the current filters.
          </div>
        ) : (
          <div className="mt-4 max-w-full overflow-x-auto">
            <table className="w-full min-w-[78rem] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Reference</th>
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Supplier</th>
                  <th className="py-2 pr-4 font-medium">Owner</th>
                  <th className="py-2 pr-4 font-medium">Approval</th>
                  <th className="py-2 pr-4 font-medium">Payment</th>
                  <th className="py-2 pr-4 text-right font-medium">Net</th>
                  <th className="py-2 pr-4 text-right font-medium">VAT</th>
                  <th className="py-2 pr-4 text-right font-medium">Gross</th>
                  <th className="py-2 pr-4 text-right font-medium">Paid</th>
                  <th className="py-2 pr-4 text-right font-medium">Outstanding</th>
                  <th className="py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.requestId}-${row.revisionId}`} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium">
                      <Link href={`/events/${eventId}/requests/${row.requestId}`} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                        {row.reference} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{row.title}</td>
                    <td className="py-3 pr-4">{row.supplier ?? "Not set"}</td>
                    <td className="py-3 pr-4">{row.ownerName}</td>
                    <td className="py-3 pr-4"><StatusBadge kind="approval" status={row.approvalStatus} /></td>
                    <td className="py-3 pr-4"><StatusBadge kind="payment" status={row.paymentStatus} /></td>
                    <td className="py-3 pr-4 text-right">{formatMinor(row.netMinor)}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(row.vatMinor)}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(row.grossMinor)}</td>
                    <td className="py-3 pr-4 text-right">{row.paymentStatus === "not_applicable" ? "Not applicable" : formatMinor(row.paidGrossMinor)}</td>
                    <td className="py-3 pr-4 text-right">{row.paymentStatus === "not_applicable" ? "Not applicable" : formatMinor(row.outstandingGrossMinor)}</td>
                    <td className="py-3">{date(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-md border bg-white p-5">
        <h2 className="font-medium">Department totals</h2>
        <p className="mt-1 text-sm text-muted-foreground">Core department totals use all authorised rows for {department.department_name}; table filters do not change these totals.</p>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div><dt className="text-muted-foreground">Request count</dt><dd className="font-medium">{data.totals.requestCount}</dd></div>
          <div><dt className="text-muted-foreground">Total net</dt><dd className="font-medium">{formatMinor(data.totals.totalNetMinor)}</dd></div>
          <div><dt className="text-muted-foreground">Total VAT</dt><dd className="font-medium">{formatMinor(data.totals.totalVatMinor)}</dd></div>
          <div><dt className="text-muted-foreground">Total gross</dt><dd className="font-medium">{formatMinor(data.totals.totalGrossMinor)}</dd></div>
          <div><dt className="text-muted-foreground">Approved net</dt><dd className="font-medium">{formatMinor(data.totals.approvedNetMinor)}</dd></div>
          <div><dt className="text-muted-foreground">Submitted net</dt><dd className="font-medium">{formatMinor(data.totals.submittedNetMinor)}</dd></div>
          <div><dt className="text-muted-foreground">VAT on approved spend</dt><dd className="font-medium">{formatMinor(data.totals.recoverableVatMinor)}</dd></div>
          <div><dt className="text-muted-foreground">Approved gross</dt><dd className="font-medium">{formatMinor(data.totals.approvedGrossMinor)}</dd></div>
          <div><dt className="text-muted-foreground">Paid gross</dt><dd className="font-medium">{formatMinor(data.totals.paidGrossMinor)}</dd></div>
          <div><dt className="text-muted-foreground">Outstanding gross</dt><dd className="font-medium">{formatMinor(data.totals.outstandingGrossMinor)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
