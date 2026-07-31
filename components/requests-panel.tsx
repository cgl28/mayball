import Link from "next/link";
import { AlertCircle, CheckCircle, Eye, FileText, Plus } from "lucide-react";
import {
  submitSpendingRequestAction,
} from "@/app/events/[eventId]/requests/actions";
import { startVariationAction } from "@/app/events/[eventId]/approvals/actions";
import { RequestDocumentsSection } from "@/components/documents-panel";
import { SpendingRequestForm } from "@/components/spending-request-form";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import type {
  RequestDepartment,
  RequestListPaymentPosition,
  RequestListRow,
  RequestSummary,
  SpendingRequestDetail,
} from "@/lib/requests/data";
import { formatMinor, sumMinor } from "@/lib/money";

function formatLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function ownerName(request: Pick<RequestSummary, "owner_preferred_name" | "owner_display_name">) {
  return request.owner_preferred_name ?? request.owner_display_name ?? "Committee member";
}

function requestListHref(
  eventId: string,
  params: {
    mine?: boolean;
    status?: string;
    departmentId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.mine) query.set("mine", "1");
  if (params.status) query.set("status", params.status);
  if (params.departmentId) query.set("department", params.departmentId);
  if (params.search?.trim()) query.set("q", params.search.trim());
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.pageSize && params.pageSize !== 25) query.set("pageSize", String(params.pageSize));
  const suffix = query.toString();
  return `/events/${eventId}/requests${suffix ? `?${suffix}` : ""}`;
}

function Message({
  error,
  created,
  saved,
  submitted,
}: {
  error?: string;
  created?: boolean;
  saved?: boolean;
  submitted?: boolean;
}) {
  if (error) {
    return (
      <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }
  if (created || saved || submitted) {
    return (
      <div className="flex gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        <CheckCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{submitted ? "Request submitted for treasurer review." : created ? "Draft request created." : "Draft request saved."}</p>
      </div>
    );
  }
  return null;
}

function ReadOnlyNotice() {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      This historical event is read-only. Spending requests are shown for reference.
    </div>
  );
}

export function RequestsListPanel({
  eventId,
  requests,
  departments,
  paymentPositions = [],
  page = 1,
  pageSize = 25,
  count,
  canCreate,
  readOnly,
  mine,
  status,
  departmentId,
  search,
}: {
  eventId: string;
  requests: RequestListRow[];
  departments: RequestDepartment[];
  paymentPositions?: RequestListPaymentPosition[];
  page?: number;
  pageSize?: number;
  count?: number;
  canCreate: boolean;
  readOnly: boolean;
  mine?: boolean;
  status?: string;
  departmentId?: string;
  search?: string;
}) {
  const filtered = requests.filter((request) => {
    if (mine && !request.can_edit_draft) return false;
    if (status && request.approval_status !== status) return false;
    if (departmentId && request.primary_department_id !== departmentId) return false;
    return true;
  });
  const totalCount = count ?? filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  const paymentByRequestId = new Map(paymentPositions.map((position) => [position.request_id, position]));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Spending requests</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Drafts stay private to their creator and event treasurers. Submitted
            requests are visible to active committee members but are not approved
            or paid.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href={`/events/${eventId}/requests/new`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New request
            </Link>
          </Button>
        ) : null}
      </div>
      {readOnly ? <ReadOnlyNotice /> : null}

      <section className="rounded-md border p-4">
        <h2 className="font-medium">Filters</h2>
        <form action={`/events/${eventId}/requests`} className="mt-3 flex max-w-xl flex-col gap-2 sm:flex-row">
          {mine ? <input type="hidden" name="mine" value="1" /> : null}
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {departmentId ? <input type="hidden" name="department" value={departmentId} /> : null}
          <label className="grid flex-1 gap-1 text-sm">
            <span className="sr-only">Search spending requests</span>
            <input
              type="search"
              name="q"
              defaultValue={search ?? ""}
              placeholder="Search reference, title or supplier"
              className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" variant="outline" size="sm">Search</Button>
          {search ? <Button asChild variant="ghost" size="sm"><Link href={requestListHref(eventId, { mine, status, departmentId })}>Clear</Link></Button> : null}
        </form>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Button asChild variant={!mine && !status && !departmentId ? "default" : "outline"} size="sm"><Link href={requestListHref(eventId, { search })}>All visible</Link></Button>
          <Button asChild variant={mine ? "default" : "outline"} size="sm"><Link href={requestListHref(eventId, { mine: true, search })}>Mine</Link></Button>
          <Button asChild variant={status === "draft" ? "default" : "outline"} size="sm"><Link href={requestListHref(eventId, { status: "draft", search })}>Draft</Link></Button>
          <Button asChild variant={status === "submitted" ? "default" : "outline"} size="sm"><Link href={requestListHref(eventId, { status: "submitted", search })}>Submitted</Link></Button>
          {departments.map((department) => (
            <Button key={department.id} asChild variant={departmentId === department.id ? "default" : "outline"} size="sm">
              <Link href={requestListHref(eventId, { departmentId: department.id, search })}>{department.code}</Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Visible requests
        </h2>
        {totalCount === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {mine || status || departmentId || search
              ? "No visible requests match those filters."
              : "No spending requests are visible to you for this event."}
          </p>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {filtered.length} of {totalCount} visible requests. Page {page} of {totalPages}.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Reference</th>
                    <th className="py-2 pr-4 font-medium">Title</th>
                    <th className="py-2 pr-4 font-medium">Owner</th>
                    <th className="py-2 pr-4 font-medium">Department</th>
                    <th className="py-2 pr-4 text-right font-medium">Gross</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Payment</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((request) => (
                    <tr key={request.request_id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium">{request.code}</td>
                      <td className="py-3 pr-4">{request.title}</td>
                      <td className="py-3 pr-4">{ownerName(request)}</td>
                      <td className="py-3 pr-4">{request.primary_department_code}</td>
                      <td className="py-3 pr-4 text-right">{formatMinor(request.gross_minor)}</td>
                      <td className="py-3 pr-4"><StatusBadge kind="approval" status={request.approval_status} /></td>
                      <td className="py-3 pr-4">
                        {paymentByRequestId.get(request.request_id)?.payment_status ? (
                          <StatusBadge kind="payment" status={paymentByRequestId.get(request.request_id)?.payment_status} />
                        ) : (
                          <span className="text-muted-foreground">Not applicable</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/events/${eventId}/requests/${request.request_id}`}>
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              Open
                            </Link>
                          </Button>
                          {paymentByRequestId.get(request.request_id)?.payment_status !== "not_applicable" ? (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/events/${eventId}/requests/${request.request_id}/payments`}>
                                Payments
                              </Link>
                            </Button>
                          ) : null}
                        </div>
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
                  href={hasPrevious ? requestListHref(eventId, { mine, status, departmentId, search, page: page - 1, pageSize }) : requestListHref(eventId, { mine, status, departmentId, search, page, pageSize })}
                >
                  Previous
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button asChild variant="outline" size="sm" aria-disabled={!hasNext}>
                <Link
                  aria-disabled={!hasNext}
                  tabIndex={hasNext ? undefined : -1}
                  href={hasNext ? requestListHref(eventId, { mine, status, departmentId, search, page: page + 1, pageSize }) : requestListHref(eventId, { mine, status, departmentId, search, page, pageSize })}
                >
                  Next
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function RequestDetailPanel({
  eventId,
  detail,
  canEdit,
  readOnly,
  created,
  saved,
  submitted,
  error,
  review = false,
  canStartVariation = false,
  canManageDocuments = false,
  documentUploaded,
  documentVoided,
  documentsError,
}: {
  eventId: string;
  detail: SpendingRequestDetail;
  canEdit: boolean;
  readOnly: boolean;
  created?: boolean;
  saved?: boolean;
  submitted?: boolean;
  error?: string;
  review?: boolean;
  canStartVariation?: boolean;
  canManageDocuments?: boolean;
  documentUploaded?: boolean;
  documentVoided?: boolean;
  documentsError?: string;
}) {
  const { request, allocations, components, departments } = detail;
  const departmentById = new Map(departments.map((department) => [department.id, department]));
  const allocationGross = sumMinor(allocations.map((allocation) => allocation.gross_minor));
  const componentGross = sumMinor(components.map((component) => component.gross_minor));
  const canSubmit = canEdit && request.revision_status === "draft" && Boolean(request.current_draft_revision_id) && !readOnly;
  const paymentPosition = detail.paymentPosition;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{request.code}</p>
          <h1 className="text-2xl font-semibold tracking-normal">{request.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge kind="approval" status={request.approval_status} />
          <Button asChild variant="outline"><Link href={`/events/${eventId}/requests`}>Back to requests</Link></Button>
        </div>
      </div>
      <Message error={error} created={created} saved={saved} submitted={submitted} />
      {readOnly ? <ReadOnlyNotice /> : null}
      {review ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Submission makes this request visible to the active committee and locks
          the submitted revision. It does not approve the request and does not
          mean it has been paid.
        </div>
      ) : null}

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Request details</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
          <div><dt className="text-muted-foreground">Owner</dt><dd>{ownerName(request)}</dd></div>
          <div><dt className="text-muted-foreground">Primary department</dt><dd>{request.primary_department_name}</dd></div>
          <div><dt className="text-muted-foreground">Expected payment</dt><dd>{request.expected_payment_date ?? "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Supplier</dt><dd>{request.supplier_name ?? "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Net</dt><dd>{formatMinor(request.net_minor)}</dd></div>
          <div><dt className="text-muted-foreground">VAT</dt><dd>{formatMinor(request.vat_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Gross</dt><dd>{formatMinor(request.gross_minor)}</dd></div>
          <div><dt className="text-muted-foreground">VAT treatment</dt><dd>{formatLabel(request.vat_treatment)}</dd></div>
          <div><dt className="text-muted-foreground">Payment status</dt><dd>{paymentPosition?.payment_status && paymentPosition.payment_status !== "not_applicable" ? formatLabel(paymentPosition.payment_status) : "Not applicable until approval"}</dd></div>
          <div><dt className="text-muted-foreground">Paid gross</dt><dd>{formatMinor(paymentPosition?.paid_gross_minor)}</dd></div>
          <div><dt className="text-muted-foreground">Outstanding</dt><dd>{formatMinor(paymentPosition?.outstanding_gross_minor)}</dd></div>
        </dl>
        {request.description ? <p className="mt-4 text-sm text-muted-foreground">{request.description}</p> : null}
      </section>

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Department allocations</h2>
        <div className="mt-4 grid gap-3">
          {allocations.map((allocation) => (
            <div key={allocation.id} className="flex flex-wrap justify-between gap-3 rounded-md border p-3 text-sm">
              <p>{departmentById.get(allocation.department_id)?.name ?? "Department"}</p>
              <p>{formatMinor(allocation.gross_minor)} gross</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Allocated {formatMinor(allocationGross)} of {formatMinor(request.gross_minor)} gross.</p>
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
        <p className="mt-3 text-sm text-muted-foreground">Components total {formatMinor(componentGross)} of {formatMinor(request.gross_minor)} gross.</p>
      </section>

      <RequestDocumentsSection
        eventId={eventId}
        requestId={request.request_id ?? ""}
        revisionId={request.revision_id}
        documents={detail.documents ?? []}
        canUpload={Boolean(request.revision_id && (canEdit || canManageDocuments))}
        canVoid={Boolean(!readOnly && (canEdit || canManageDocuments))}
        readOnly={readOnly}
        error={documentsError}
        uploaded={documentUploaded}
        voided={documentVoided}
      />

      <div className="flex flex-wrap gap-2">
        {canEdit && !review ? <Button asChild><Link href={`/events/${eventId}/requests/${request.request_id}/edit`}>Edit draft</Link></Button> : null}
        {canSubmit && !review ? <Button asChild variant="outline"><Link href={`/events/${eventId}/requests/${request.request_id}/review`}>Review and submit</Link></Button> : null}
        {canStartVariation && !review ? (
          <form action={startVariationAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="requestId" value={request.request_id ?? ""} />
            <SubmitButton pendingLabel="Starting variation...">Propose variation</SubmitButton>
          </form>
        ) : null}
        {paymentPosition?.payment_status !== "not_applicable" ? (
          <Button asChild variant="outline"><Link href={`/events/${eventId}/requests/${request.request_id}/payments`}>Payment history</Link></Button>
        ) : null}
        {canSubmit && review ? (
          <form action={submitSpendingRequestAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="requestId" value={request.request_id ?? ""} />
            <SubmitButton pendingLabel="Submitting...">Submit for treasurer review</SubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export function RequestEditor({
  eventId,
  departments,
  detail,
  defaultDepartmentId,
  error,
}: {
  eventId: string;
  departments: RequestDepartment[];
  detail?: SpendingRequestDetail;
  defaultDepartmentId?: string;
  error?: string;
}) {
  const request = detail?.request;
  const editable = !request || request.approval_status === "draft";
  const hasComplexDraftAllocations = Boolean(request && (detail?.allocations.length ?? 0) > 1);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{request ? `Edit ${request.code}` : "Create spending request"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Save drafts explicitly. Submit only after allocations and components reconcile with the request total.
        </p>
      </div>
      <Message error={error} />
      {!editable ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Submitted requests cannot be edited.</div>
      ) : hasComplexDraftAllocations ? (
        <div className="grid gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">This draft uses multiple department allocations.</p>
          <p>
            The simplified editor now creates one allocation for the selected department. To avoid silently collapsing existing allocation data, this draft remains read-only in the editor.
          </p>
          <div>
            <Button asChild variant="outline"><Link href={`/events/${eventId}/requests/${request?.request_id}`}>Back to request</Link></Button>
          </div>
        </div>
      ) : (
        <SpendingRequestForm eventId={eventId} departments={departments} detail={detail} defaultDepartmentId={defaultDepartmentId} />
      )}
    </div>
  );
}
