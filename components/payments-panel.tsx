import Link from "next/link";
import { AlertCircle, CalendarClock, CheckCircle, CreditCard, History, RotateCcw } from "lucide-react";
import { reversePaymentAction } from "@/app/events/[eventId]/payments/actions";
import { PaymentFormClient } from "@/components/payment-form-client";
import { RequestEvidenceList } from "@/components/documents-panel";
import { PaymentUrgencyDialog } from "@/components/payment-urgency-dialog";
import { RequestComponentSurface } from "@/components/request-component-surface";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ComponentPaymentPosition,
  PaymentAllocationDetail,
  PaymentDetailData,
  PaymentFormData,
  PaymentListRow,
  PaymentsData,
  PaymentUrgency,
  PaymentWorkloadView,
  RequestPaymentPosition,
} from "@/lib/payments/data";
import type { VisibleDocument } from "@/lib/documents/data";
import { formatMinor } from "@/lib/money";

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function date(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "Not set";
}

function dateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function paymentsHref(
  eventId: string,
  params: {
    status?: string;
    search?: string;
    view?: string;
    page?: number;
    pageSize?: number;
    workloadPage?: number;
    workloadPageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.view && params.view !== "outstanding") query.set("view", params.view);
  if (params.search?.trim()) query.set("q", params.search.trim());
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.pageSize && params.pageSize !== 25) query.set("pageSize", String(params.pageSize));
  if (params.workloadPage && params.workloadPage > 1) query.set("workloadPage", String(params.workloadPage));
  if (params.workloadPageSize && params.workloadPageSize !== 25) query.set("workloadPageSize", String(params.workloadPageSize));
  const suffix = query.toString();
  return `/events/${eventId}/payments${suffix ? `?${suffix}` : ""}`;
}

const workloadFilters: Array<{ value: PaymentWorkloadView; label: string }> = [
  { value: "outstanding", label: "Outstanding" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due soon" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "all", label: "All" },
];

function Message({
  error,
  recorded,
  reversed,
}: {
  error?: string;
  recorded?: boolean;
  reversed?: boolean;
}) {
  if (error) {
    return (
      <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }
  if (recorded || reversed) {
    return (
      <div className="flex gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        <CheckCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{recorded ? "Payment recorded." : "Payment reversed. The history row is preserved."}</p>
      </div>
    );
  }
  return null;
}

function ReadOnlyNotice() {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      This historical event is read-only. Payment records are shown for reference.
    </div>
  );
}

function urgencyLabel(value: PaymentUrgency) {
  switch (value) {
    case "overdue":
      return "Overdue";
    case "due_soon":
      return "Due soon";
    case "future":
      return "Future";
    case "no_due_date":
      return "No due date";
    case "paid":
      return "Paid";
  }
}

function UrgencyBadge({ urgency }: { urgency: PaymentUrgency }) {
  const className = {
    overdue: "border-red-800 bg-red-50 text-red-900",
    due_soon: "border-amber-600 bg-amber-50 text-amber-950",
    future: "border-slate-300 bg-slate-100 text-slate-800",
    no_due_date: "border-slate-400 bg-slate-50 text-slate-800",
    paid: "border-green-900 bg-green-50 text-green-950",
  }[urgency];

  return <Badge variant="outline" className={className}>{urgencyLabel(urgency)}</Badge>;
}

function percentage(amount: number, total: number) {
  if (total <= 0 || amount <= 0) return 0;
  return Math.max(0, Math.min(100, (amount / total) * 100));
}

const paymentWorkloadStyles = {
  paid: {
    bar: "bg-emerald-200",
    card: "border-emerald-300 bg-emerald-50 text-emerald-950",
    label: "text-emerald-900",
    swatch: "border-emerald-500 bg-emerald-200",
  },
  future: {
    bar: "bg-sky-200",
    card: "border-sky-300 bg-sky-50 text-sky-950",
    label: "text-sky-900",
    swatch: "border-sky-500 bg-sky-200",
  },
  dueSoon: {
    bar: "bg-amber-200",
    card: "border-amber-300 bg-amber-50 text-amber-950",
    label: "text-amber-900",
    swatch: "border-amber-500 bg-amber-200",
  },
  overdue: {
    bar: "bg-red-200",
    card: "border-red-300 bg-red-50 text-red-950",
    label: "text-red-900",
    swatch: "border-red-500 bg-red-200",
  },
} as const;

function WorkloadStatusBar({ summary }: { summary: PaymentsData["operationalSummary"] }) {
  const total = Math.max(summary.approvedGrossMinor, summary.paidGrossMinor + summary.outstandingGrossMinor);
  const segments = [
    { key: "paid", label: "Paid", amount: summary.paidGrossMinor, styles: paymentWorkloadStyles.paid },
    { key: "future", label: "Future outstanding", amount: summary.futureOutstandingGrossMinor, styles: paymentWorkloadStyles.future },
    { key: "dueSoon", label: "Due within 14 days", amount: summary.dueSoonGrossMinor, styles: paymentWorkloadStyles.dueSoon },
    { key: "overdue", label: "Overdue", amount: summary.overdueGrossMinor, styles: paymentWorkloadStyles.overdue },
  ];

  return (
    <section className="rounded-md border bg-white p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">Payment workload state</h2>
        <p className="text-sm text-muted-foreground">
          Paid gross plus outstanding gross by urgency. Segments reconcile to approved gross unless an overpayment exists.
        </p>
      </div>
      <div className="mt-4 overflow-hidden rounded-full border bg-slate-100" aria-label="Approved payment workload state">
        <div className="flex h-3 w-full">
          {segments.map((segment) => (
            <div
              key={segment.label}
              data-workload-tone={segment.key}
              className={`h-full shrink-0 ${segment.styles.bar}`}
              style={{
                flexBasis: `${percentage(segment.amount, total)}%`,
                width: `${percentage(segment.amount, total)}%`,
              }}
              title={`${segment.label}: ${formatMinor(segment.amount)}`}
            />
          ))}
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="Payment workload legend">
        {segments.map((segment) => (
          <div key={segment.label} data-workload-tone={segment.key} className={`min-w-0 rounded-md border p-3 ${segment.styles.card}`}>
            <dt className={`flex items-center gap-2 ${segment.styles.label}`}>
              <span className={`h-2.5 w-2.5 rounded-full border ${segment.styles.swatch}`} aria-hidden="true" />
              {segment.label}
            </dt>
            <dd className="mt-1 font-semibold">{formatMinor(segment.amount)}</dd>
            <dd className="text-xs opacity-80">{percentage(segment.amount, total).toFixed(1)}%</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PaymentsPanel({
  eventId,
  data,
  canManage,
  readOnly,
  recorded,
  error,
  status,
  search,
}: {
  eventId: string;
  data: PaymentsData;
  canManage: boolean;
  readOnly: boolean;
  recorded?: boolean;
  error?: string;
  status?: string;
  search?: string;
}) {
  const activeWorkloadView = data.workloadView ?? "outstanding";
  const workloadPage = data.workloadPage ?? 1;
  const workloadPageSize = data.workloadPageSize ?? 25;
  const workloadCount = data.workloadCount ?? data.workload.length;
  const workloadTotalPages = Math.max(1, Math.ceil(workloadCount / workloadPageSize));
  const hasPreviousWorkload = workloadPage > 1;
  const hasNextWorkload = workloadPage < workloadTotalPages;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track approved payment components, due dates and recorded outgoing payments.
            Approved commitments, recorded payments and future bank reconciliation are distinct records.
          </p>
        </div>
        {canManage && !readOnly ? (
          <Button asChild>
            <Link href={`/events/${eventId}/payments/new`}>
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Record payment
            </Link>
          </Button>
        ) : null}
      </div>
      <Message error={error} recorded={recorded} />
      {readOnly ? <ReadOnlyNotice /> : null}

      <section className="grid gap-3 md:grid-cols-5">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Approved commitments</p>
          <p className="mt-1 text-xl font-semibold">{formatMinor(data.operationalSummary.approvedGrossMinor)}</p>
          <p className="mt-1 text-xs text-muted-foreground">gross</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Outstanding approved</p>
          <p className="mt-1 text-xl font-semibold">{formatMinor(data.operationalSummary.outstandingGrossMinor)}</p>
          <p className="mt-1 text-xs text-muted-foreground">gross</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="mt-1 text-xl font-semibold">{formatMinor(data.operationalSummary.overdueGrossMinor)}</p>
          <p className="mt-1 text-xs text-muted-foreground">outstanding gross</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Due in 14 days</p>
          <p className="mt-1 text-xl font-semibold">{formatMinor(data.operationalSummary.dueSoonGrossMinor)}</p>
          <p className="mt-1 text-xs text-muted-foreground">outstanding gross</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Cash paid to date</p>
          <p className="mt-1 text-xl font-semibold">{formatMinor(data.operationalSummary.paidGrossMinor)}</p>
          <p className="mt-1 text-xs text-muted-foreground">non-reversed gross</p>
        </div>
      </section>
      {data.operationalSummary.noDueDateCount > 0 ? (
        <div className="flex gap-2 rounded-md border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800">
          <CalendarClock className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <p>{data.operationalSummary.noDueDateCount} outstanding components have no due date.</p>
        </div>
      ) : null}

      <WorkloadStatusBar summary={data.operationalSummary} />

      <section className="rounded-md border p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-medium">Payment workload</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Current approved request components. Paid amounts come from non-reversed payment allocations.
            </p>
          </div>
        </div>
        <form action={`/events/${eventId}/payments`} className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {activeWorkloadView !== "outstanding" ? <input type="hidden" name="view" value={activeWorkloadView} /> : null}
          <label className="grid flex-1 gap-1 text-sm">
            <span className="sr-only">Search payment workload</span>
            <input
              type="search"
              name="q"
              defaultValue={search ?? ""}
              placeholder="Search request, component or supplier"
              className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" variant="outline" size="sm">Search</Button>
          {search ? <Button asChild variant="ghost" size="sm"><Link href={paymentsHref(eventId, { status, view: activeWorkloadView })}>Clear</Link></Button> : null}
        </form>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {workloadFilters.map((filter) => (
            <Button key={filter.value} asChild variant={activeWorkloadView === filter.value ? "default" : "outline"} size="sm">
              <Link href={paymentsHref(eventId, { status, search, view: filter.value })}>{filter.label}</Link>
            </Button>
          ))}
        </div>
        {workloadCount === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {activeWorkloadView === "outstanding"
              ? "All approved payment components are fully paid."
              : "No approved payment components match those filters."}
          </p>
        ) : (
          <div className="mt-4 grid gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {data.workload.length} of {workloadCount} approved payment components. Page {workloadPage} of {workloadTotalPages}.
            </p>
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[74rem] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Due</th>
                    <th className="py-2 pr-4 font-medium">Request</th>
                    <th className="py-2 pr-4 font-medium">Component</th>
                    <th className="py-2 pr-4 font-medium">Supplier</th>
                    <th className="py-2 pr-4 text-right font-medium">Approved gross</th>
                    <th className="py-2 pr-4 text-right font-medium">Paid</th>
                    <th className="py-2 pr-4 text-right font-medium">Outstanding</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">
                      <span className="inline-flex items-center gap-1">
                        Urgency
                        <PaymentUrgencyDialog />
                      </span>
                    </th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workload.map((component) => (
                    <tr key={component.request_component_id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <p>{date(component.effective_due_date)}</p>
                        {component.due_date_source === "event" ? <p className="text-xs text-muted-foreground">Event date</p> : null}
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        <Link className="underline-offset-4 hover:underline" href={`/events/${eventId}/requests/${component.request_id}`}>
                          {component.request_code}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{component.description}</p>
                        <p className="text-xs text-muted-foreground">{component.component_code}</p>
                      </td>
                      <td className="py-3 pr-4">{component.supplier_name ?? "Supplier not set"}</td>
                      <td className="py-3 pr-4 text-right">{formatMinor(component.approved_gross_minor)}</td>
                      <td className="py-3 pr-4 text-right">{formatMinor(component.paid_gross_minor)}</td>
                      <td className="py-3 pr-4 text-right">{formatMinor(component.outstanding_gross_minor)}</td>
                      <td className="py-3 pr-4"><StatusBadge kind="payment" status={component.payment_status} /></td>
                      <td className="py-3 pr-4"><UrgencyBadge urgency={component.urgency} /></td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {canManage && !readOnly && Number(component.outstanding_gross_minor ?? 0) > 0 ? (
                            <Button asChild variant="outline" size="sm"><Link href={`/events/${eventId}/requests/${component.request_id}/payments/new?componentId=${component.request_component_id}`}>Record payment</Link></Button>
                          ) : null}
                          <Button asChild variant="outline" size="sm"><Link href={`/events/${eventId}/requests/${component.request_id}/payments`}>History</Link></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button asChild variant="outline" size="sm" aria-disabled={!hasPreviousWorkload}>
                <Link
                  aria-disabled={!hasPreviousWorkload}
                  tabIndex={hasPreviousWorkload ? undefined : -1}
                  href={hasPreviousWorkload ? paymentsHref(eventId, { status, search, view: activeWorkloadView, workloadPage: workloadPage - 1, workloadPageSize, page: data.page, pageSize: data.pageSize }) : paymentsHref(eventId, { status, search, view: activeWorkloadView, workloadPage, workloadPageSize, page: data.page, pageSize: data.pageSize })}
                >
                  Previous
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">Page {workloadPage} of {workloadTotalPages}</span>
              <Button asChild variant="outline" size="sm" aria-disabled={!hasNextWorkload}>
                <Link
                  aria-disabled={!hasNextWorkload}
                  tabIndex={hasNextWorkload ? undefined : -1}
                  href={hasNextWorkload ? paymentsHref(eventId, { status, search, view: activeWorkloadView, workloadPage: workloadPage + 1, workloadPageSize, page: data.page, pageSize: data.pageSize }) : paymentsHref(eventId, { status, search, view: activeWorkloadView, workloadPage, workloadPageSize, page: data.page, pageSize: data.pageSize })}
                >
                  Next
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      <PaymentHistory eventId={eventId} payments={data.payments} page={data.page ?? 1} pageSize={data.pageSize ?? 25} count={data.count ?? data.payments.length} status={status} search={search} />
    </div>
  );
}

function PaymentHistory({
  eventId,
  payments,
  page,
  pageSize,
  count,
  status,
  search,
}: {
  eventId: string;
  payments: PaymentListRow[];
  page: number;
  pageSize: number;
  count: number;
  status?: string;
  search?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <section className="rounded-md border p-5">
      <h2 className="flex items-center gap-2 font-medium">
        <History className="h-4 w-4" aria-hidden="true" />
        Recorded payments
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Payments recorded as having been made. These records may later be reconciled against bank transactions.
      </p>
      <form action={`/events/${eventId}/payments`} className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label className="grid flex-1 gap-1 text-sm">
          <span className="sr-only">Search payment history</span>
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search reference, payee or bank reference"
            className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
        <Button type="submit" variant="outline" size="sm">Search</Button>
        {search ? <Button asChild variant="ghost" size="sm"><Link href={paymentsHref(eventId, { status })}>Clear</Link></Button> : null}
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Button asChild variant={!status ? "default" : "outline"} size="sm"><Link href={paymentsHref(eventId, { search })}>All payments</Link></Button>
        <Button asChild variant={status === "recorded" ? "default" : "outline"} size="sm"><Link href={paymentsHref(eventId, { status: "recorded", search })}>Recorded</Link></Button>
        <Button asChild variant={status === "reversed" ? "default" : "outline"} size="sm"><Link href={paymentsHref(eventId, { status: "reversed", search })}>Reversed</Link></Button>
      </div>
      {count === 0 ? (
        <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {status || search ? "No payments match those filters." : "No payments have been recorded for this event."}
        </p>
      ) : (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {payments.length} of {count} payments. Page {page} of {totalPages}.
          </p>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[62rem] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Reference</th>
                  <th className="py-2 pr-4 font-medium">Payee</th>
                  <th className="py-2 pr-4 text-right font-medium">Gross</th>
                  <th className="py-2 pr-4 font-medium">Method</th>
                  <th className="py-2 pr-4 font-medium">Allocated to</th>
                  <th className="py-2 pr-4 font-medium">Bank reference</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.payment_id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">{date(payment.payment_date)}</td>
                    <td className="py-3 pr-4 font-medium">{payment.code}</td>
                    <td className="py-3 pr-4">{payment.payee}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(payment.gross_minor)}</td>
                    <td className="py-3 pr-4">{label(payment.method)}</td>
                    <td className="py-3 pr-4">
                      <p>{payment.request_codes ?? "Not allocated"}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(payment.allocation_count ?? 0) === 1 ? "1 component" : `${payment.allocation_count ?? 0} components`}
                      </p>
                    </td>
                    <td className="py-3 pr-4">{payment.bank_reference ?? "Not set"}</td>
                    <td className="py-3 pr-4"><Badge variant={payment.status === "reversed" ? "secondary" : "default"}>{label(payment.status)}</Badge></td>
                    <td className="py-3">
                      <Button asChild variant="outline" size="sm"><Link href={`/events/${eventId}/payments/${payment.payment_id}`}>Open</Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm" aria-disabled={!hasPrevious}>
              <Link
                aria-disabled={!hasPrevious}
                tabIndex={hasPrevious ? undefined : -1}
                href={hasPrevious ? paymentsHref(eventId, { status, search, page: page - 1, pageSize }) : paymentsHref(eventId, { status, search, page, pageSize })}
              >
                Previous
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button asChild variant="outline" size="sm" aria-disabled={!hasNext}>
              <Link
                aria-disabled={!hasNext}
                tabIndex={hasNext ? undefined : -1}
                href={hasNext ? paymentsHref(eventId, { status, search, page: page + 1, pageSize }) : paymentsHref(eventId, { status, search, page, pageSize })}
              >
                Next
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export function PaymentFormPanel({
  eventId,
  requestId,
  data,
  error,
}: {
  eventId: string;
  requestId?: string;
  data: PaymentFormData;
  error?: string;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Record payment</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Allocate the gross payment total across current approved components.
          Revisions and components already paid remain preserved in history.
        </p>
      </div>
      <Message error={error} />
      {data.componentPositions.length === 0 ? (
        <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
          No approved unpaid components are available for this payment.
        </div>
      ) : (
        <>
          {requestId ? <RequestEvidenceList eventId={eventId} documents={data.requestDocuments ?? []} heading="Supporting documents for this request" /> : null}
          <PaymentFormClient eventId={eventId} requestId={requestId} data={data} />
        </>
      )}
    </div>
  );
}

export function PaymentDetailPanel({
  eventId,
  data,
  canManage,
  readOnly,
  recorded,
  reversed,
  error,
}: {
  eventId: string;
  data: PaymentDetailData;
  canManage: boolean;
  readOnly: boolean;
  recorded?: boolean;
  reversed?: boolean;
  error?: string;
}) {
  const { payment, allocations } = data;
  const canReverse = canManage && payment.status === "recorded" && !readOnly;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{payment.code}</p>
          <h1 className="text-2xl font-semibold tracking-normal">{payment.payee}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={payment.status === "reversed" ? "secondary" : "default"}>{label(payment.status)}</Badge>
          <Button asChild variant="outline"><Link href={`/events/${eventId}/payments`}>Back to payments</Link></Button>
        </div>
      </div>
      <Message error={error} recorded={recorded} reversed={reversed} />
      {readOnly ? <ReadOnlyNotice /> : null}

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Payment record</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
          <div><dt className="text-muted-foreground">Payment date</dt><dd>{date(payment.payment_date)}</dd></div>
          <div><dt className="text-muted-foreground">Gross</dt><dd>{formatMinor(payment.gross_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Allocated</dt><dd>{formatMinor(payment.allocated_gross_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Method</dt><dd>{label(payment.method)}</dd></div>
          <div><dt className="text-muted-foreground">Bank reference</dt><dd>{payment.bank_reference ?? "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Entered by</dt><dd>{payment.entered_by_display_name ?? "Treasurer"}</dd></div>
          <div><dt className="text-muted-foreground">Created</dt><dd>{dateTime(payment.created_at)}</dd></div>
          <div><dt className="text-muted-foreground">Reversed</dt><dd>{dateTime(payment.reversed_at)}</dd></div>
          <div><dt className="text-muted-foreground">Reversed by</dt><dd>{payment.reversed_by_display_name ?? "Not reversed"}</dd></div>
        </dl>
        {payment.note ? <p className="mt-4 text-sm text-muted-foreground">{payment.note}</p> : null}
        {payment.reversal_reason ? <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Reversal reason: {payment.reversal_reason}</p> : null}
      </section>

      <PaymentAllocationsTable eventId={eventId} allocations={allocations} />

      {canReverse ? (
        <section className="rounded-md border p-5">
          <h2 className="flex items-center gap-2 font-medium">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reverse payment
          </h2>
          <form action={reversePaymentAction} className="mt-4 grid gap-3">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="paymentId" value={payment.payment_id ?? ""} />
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Reason</span>
              <textarea name="reason" rows={2} required className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </label>
            <div><SubmitButton pendingLabel="Reversing...">Reverse payment</SubmitButton></div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

export function RequestPaymentsPanel({
  eventId,
  requestId,
  position,
  components,
  allocations,
  documents = [],
  canManage,
  readOnly,
}: {
  eventId: string;
  requestId: string;
  position: RequestPaymentPosition;
  components: ComponentPaymentPosition[];
  allocations: PaymentAllocationDetail[];
  documents?: VisibleDocument[];
  canManage: boolean;
  readOnly: boolean;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{position.code}</p>
          <h1 className="text-2xl font-semibold tracking-normal">Request payments</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge kind="payment" status={position.payment_status} />
          <Button asChild variant="outline"><Link href={`/events/${eventId}/requests/${requestId}`}>Back to request</Link></Button>
          {canManage && Number(position.outstanding_gross_minor ?? 0) > 0 ? <Button asChild><Link href={`/events/${eventId}/requests/${requestId}/payments/new`}>Record payment</Link></Button> : null}
        </div>
      </div>
      {readOnly ? <ReadOnlyNotice /> : null}
      <section className="rounded-md border p-5">
        <h2 className="font-medium">Payment position</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-4">
          <div><dt className="text-muted-foreground">Approved gross</dt><dd>{formatMinor(position.approved_gross_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Paid gross</dt><dd>{formatMinor(position.paid_gross_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Outstanding</dt><dd>{formatMinor(position.outstanding_gross_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd>{label(position.payment_status)}</dd></div>
        </dl>
      </section>
      <section className="rounded-md border p-5">
        <h2 className="font-medium">Current approved components</h2>
        <div className="mt-4 grid gap-3">
          {components.map((component) => (
            <RequestComponentSurface key={component.request_component_id} className="text-sm">
              <div className="flex flex-wrap justify-between gap-3">
                <p className="font-medium">{component.component_code}: {component.description}</p>
                <StatusBadge kind="payment" status={component.payment_status} />
              </div>
              <p className="mt-1 text-muted-foreground">Approved {formatMinor(component.approved_gross_minor)}; paid {formatMinor(component.paid_gross_minor)}; outstanding {formatMinor(component.outstanding_gross_minor)}</p>
            </RequestComponentSurface>
          ))}
        </div>
      </section>
      <RequestEvidenceList eventId={eventId} documents={documents} heading="Supporting documents for this request" />
      <PaymentAllocationsTable eventId={eventId} allocations={allocations} />
    </div>
  );
}

function PaymentAllocationsTable({
  eventId,
  allocations,
}: {
  eventId: string;
  allocations: PaymentAllocationDetail[];
}) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="font-medium">Allocations</h2>
      {allocations.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No allocations have been recorded.
        </p>
      ) : (
        <div className="mt-4 max-w-full overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Payment</th>
                <th className="py-2 pr-4 font-medium">Request</th>
                <th className="py-2 pr-4 font-medium">Component</th>
                <th className="py-2 pr-4 font-medium">Revision</th>
                <th className="py-2 pr-4 text-right font-medium">Gross</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((allocation) => (
                <tr key={allocation.payment_allocation_id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 font-medium">
                    <Link className="underline-offset-4 hover:underline" href={`/events/${eventId}/payments/${allocation.payment_id}`}>{allocation.payment_code}</Link>
                  </td>
                  <td className="py-3 pr-4">{allocation.request_code}</td>
                  <td className="py-3 pr-4">{allocation.component_code}: {allocation.component_description}</td>
                  <td className="py-3 pr-4">v{allocation.revision_number}</td>
                  <td className="py-3 pr-4 text-right">{formatMinor(allocation.gross_minor)}</td>
                  <td className="py-3 pr-4"><Badge variant={allocation.payment_status === "reversed" ? "secondary" : "default"}>{label(allocation.payment_status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
