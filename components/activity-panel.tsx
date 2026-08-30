import Link from "next/link";
import { Banknote, CalendarClock, CreditCard, FileText, History, Landmark, Paperclip, TrendingUp } from "lucide-react";
import { InitialsAvatar } from "@/components/initials-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMinor } from "@/lib/money";
import { auditCategories, auditCategoryForAction, type ActivityFeedRow, type AuditActivityCategory, type AuditCategory } from "@/lib/activity/data";

function dateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function actor(row: ActivityFeedRow) {
  return row.actor_preferred_name ?? row.actor_display_name ?? "System";
}

function words(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not set";
}

function actionText(row: ActivityFeedRow) {
  if (row.action === "document.finalised" && row.context?.document?.category === "expense_claim_form") {
    return "uploaded an Expense Claim Form";
  }
  if (row.action === "document.voided" && row.context?.document?.category === "expense_claim_form") {
    return "voided an Expense Claim Form";
  }
  const reimbursement = row.context?.request?.requestKind === "member_reimbursement";
  if (reimbursement) {
    const reimbursementActions: Record<string, string> = {
      "request.changes_requested": "requested changes to a reimbursement claim",
      "request.approved": "approved a reimbursement claim",
      "request.rejected": "rejected a reimbursement claim",
      "request.variation_started": "started a reimbursement variation",
      "request.variation_submitted": "submitted a reimbursement variation",
      "request.variation_approved": "approved a reimbursement variation",
      "request.variation_rejected": "rejected a reimbursement variation",
      "request.variation_changes_requested": "requested changes to a reimbursement variation",
    };
    if (row.action && reimbursementActions[row.action]) return reimbursementActions[row.action];
  }
  const actions: Record<string, string> = {
    "request.created": "created a spending request",
    "request.reimbursement_created": "created a reimbursement claim",
    "request.updated": "updated a draft request",
    "request.submitted": "submitted a spending request",
    "request.reimbursement_submitted": "submitted a reimbursement claim",
    "request.changes_requested": "requested changes to a spending request",
    "request.approved": "approved a spending request",
    "request.rejected": "rejected a spending request",
    "request.variation_started": "started a request variation",
    "request.variation_submitted": "submitted a request variation",
    "request.variation_approved": "approved a request variation",
    "request.variation_rejected": "rejected a request variation",
    "request.variation_changes_requested": "requested changes to a request variation",
    "payment.recorded": "recorded a payment",
    "payment.reversed": "reversed a payment",
    "budget.created": "created a budget version",
    "budget.updated": "updated a budget draft",
    "budget.activated": "published a budget version",
    "budget.transferred": "moved contingency",
    "revenue.ticket_type.created": "created a ticket type",
    "revenue.ticket_type.updated": "updated a ticket type",
    "revenue.ticket_snapshot.recorded": "recorded a ticket-sales snapshot",
    "revenue.ticket_snapshot.voided": "voided a ticket-sales snapshot",
    "revenue.other.created": "added other revenue",
    "revenue.other.updated": "updated other revenue",
    "document.finalised": "uploaded a document",
    "document.voided": "voided a document",
    "event.lifecycle_progressed": "progressed the event lifecycle",
    "event.completed": "completed the event",
    "event.archived": "archived the event",
    "event.reopened": "reopened the event",
    "event.created": "created the event",
    "event.organisation_updated": "updated the event organisation",
    "role.removed": "removed an event role",
    "member.status_changed": "changed a member status",
  };
  return row.action ? actions[row.action] ?? row.summary ?? "recorded an event update" : row.summary ?? "recorded an event update";
}

function categoryDetails(category: AuditActivityCategory) {
  const details = {
    requests: { label: "Request", icon: FileText, className: "border-sky-700 bg-sky-600 text-white" },
    payments: { label: "Payment", icon: CreditCard, className: "border-emerald-800 bg-emerald-600 text-white" },
    budget: { label: "Budget", icon: Banknote, className: "border-violet-800 bg-violet-700 text-white" },
    revenue: { label: "Revenue", icon: TrendingUp, className: "border-emerald-800 bg-emerald-600 text-white" },
    documents: { label: "Document", icon: Paperclip, className: "border-slate-700 bg-slate-600 text-white" },
    lifecycle: { label: "Lifecycle", icon: CalendarClock, className: "border-amber-700 bg-amber-400 text-amber-950" },
    governance: { label: "Governance", icon: Landmark, className: "border-slate-700 bg-slate-600 text-white" },
  } as const;
  return details[category];
}

function entryLink(eventId: string, row: ActivityFeedRow) {
  if (row.context?.request && row.entity_id) return `/events/${eventId}/requests/${row.entity_id}`;
  if (row.context?.payment && row.entity_id) return `/events/${eventId}/payments/${row.entity_id}`;
  if (row.context?.budgetTransfer) return `/events/${eventId}/budget`;
  if (row.context?.document?.requestId) return `/events/${eventId}/requests/${row.context.document.requestId}`;
  if (row.auditCategory === "documents") return `/events/${eventId}/documents`;
  if (row.auditCategory === "revenue") return `/events/${eventId}/revenue`;
  if (row.auditCategory === "lifecycle") return `/events/${eventId}/settings/lifecycle`;
  if (row.auditCategory === "budget") return `/events/${eventId}/budget`;
  return undefined;
}

function objectLabel(row: ActivityFeedRow) {
  if (row.context?.request) {
    const request = row.context.request;
    return [request.code, request.title].filter(Boolean).join(" — ") || null;
  }
  if (row.context?.payment) return [row.context.payment.code, row.context.payment.payee].filter(Boolean).join(" — ") || null;
  if (row.context?.document) return [row.context.document.category ? words(row.context.document.category) : null, row.context.document.filename].filter(Boolean).join(" — ") || row.context.document.requestCode || null;
  if (row.context?.budgetTransfer) {
    const { fromDepartment, toDepartment } = row.context.budgetTransfer;
    return `${fromDepartment ?? "Contingency"} → ${toDepartment ?? "Contingency"}`;
  }
  return null;
}

function financialDetail(row: ActivityFeedRow) {
  if (row.context?.payment?.grossMinor !== null && typeof row.context?.payment?.grossMinor !== "undefined") {
    return `${formatMinor(row.context.payment.grossMinor)} cash payment`;
  }
  if (row.context?.budgetTransfer) return `${formatMinor(row.context.budgetTransfer.amountMinor)} net transfer`;
  return null;
}

function lifecycleDetail(row: ActivityFeedRow) {
  const lifecycle = row.context?.lifecycle;
  if (!lifecycle?.fromStatus && !lifecycle?.toStatus) return null;
  return [lifecycle.fromStatus ? words(lifecycle.fromStatus) : null, lifecycle.toStatus ? words(lifecycle.toStatus) : null].filter(Boolean).join(" → ");
}

function auditHref({ page, category, fromDate, toDate }: { page?: number; category: AuditCategory; fromDate?: string; toDate?: string }) {
  const params = new URLSearchParams();
  if (page && page > 1) params.set("page", String(page));
  if (category !== "all") params.set("category", category);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  const search = params.toString();
  return search ? `?${search}` : "?";
}

export function ActivityPanel({
  eventId,
  rows,
  count,
  page,
  pageSize,
  category = "all",
  fromDate,
  toDate,
  error,
  readOnly,
}: {
  eventId: string;
  rows: ActivityFeedRow[];
  count: number;
  page: number;
  pageSize: number;
  category?: AuditCategory;
  fromDate?: string;
  toDate?: string;
  error?: string;
  readOnly: boolean;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal">
          <History className="h-6 w-6" aria-hidden="true" />
          Audit
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Financially meaningful event activity, based on durable records and filtered by your database permissions. Private draft activity remains hidden from ordinary committee members.
        </p>
      </div>
      {error ? <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</div> : null}
      {readOnly ? <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Historical event audit is read-only.</div> : null}
      <form className="grid gap-3 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Activity type</span>
          <select name="category" defaultValue={category} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {auditCategories.map((value) => <option key={value} value={value}>{value === "all" ? "All activity" : words(value)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">From</span>
          <input name="fromDate" type="date" defaultValue={fromDate} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">To</span>
          <input name="toDate" type="date" defaultValue={toDate} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="submit" variant="outline">Filter</Button>
          {category !== "all" || fromDate || toDate ? <Button asChild variant="ghost"><Link href="?">Clear</Link></Button> : null}
        </div>
      </form>

      <section className="rounded-md border p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Recent financial activity</h2>
          <p className="text-sm text-muted-foreground">Showing {rows.length} of {count}</p>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No financial activity has been recorded yet.</p>
        ) : (
          <ol className="grid gap-3">
            {rows.map((row) => {
              const categoryDetailsForRow = categoryDetails(row.auditCategory ?? auditCategoryForAction(row.action));
              const Icon = categoryDetailsForRow.icon;
              const target = objectLabel(row);
              const href = entryLink(eventId, row);
              const amount = financialDetail(row);
              const lifecycle = lifecycleDetail(row);
              const name = actor(row);
              return (
                <li key={row.activity_id} className="rounded-md border p-4 text-sm">
                  <div className="flex gap-3">
                    <InitialsAvatar name={name === "System" ? null : name} className="h-8 w-8 bg-sky-100 text-[0.6875rem]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium"><span>{name} </span>{actionText(row)}</p>
                          {target ? href ? <Link href={href} className="mt-1 block break-words text-sm font-medium text-foreground underline-offset-4 hover:underline">{target}</Link> : <p className="mt-1 break-words text-sm font-medium">{target}</p> : null}
                        </div>
                        <Badge variant="outline" className={`shrink-0 gap-1.5 whitespace-nowrap font-semibold shadow-sm ${categoryDetailsForRow.className}`}><Icon className="h-3 w-3" aria-hidden="true" />{categoryDetailsForRow.label}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                        {amount ? <span>{amount}</span> : null}
                        {row.context?.request?.departmentName ? <span>{row.context.request.departmentName}</span> : null}
                        {lifecycle ? <span>{lifecycle}</span> : null}
                        <span>{dateTime(row.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {page > 1 ? <Button asChild variant="outline"><Link href={auditHref({ page: page - 1, category, fromDate, toDate })}>Previous</Link></Button> : null}
          {page * pageSize < count ? <Button asChild variant="outline"><Link href={auditHref({ page: page + 1, category, fromDate, toDate })}>Next</Link></Button> : null}
        </div>
      </section>
    </div>
  );
}
