import Link from "next/link";
import { AlertCircle, CheckCircle, Eye, FileText, Plus } from "lucide-react";
import {
  saveSpendingRequestDraftAction,
  submitSpendingRequestAction,
} from "@/app/events/[eventId]/requests/actions";
import { startVariationAction } from "@/app/events/[eventId]/approvals/actions";
import { RequestDocumentsSection } from "@/components/documents-panel";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  RequestDepartment,
  RequestPaymentPosition,
  RequestSummary,
  SpendingRequestDetail,
} from "@/lib/requests/data";
import { formatMinor, minorToInput, sumMinor } from "@/lib/money";

const vatTreatments = ["standard", "reduced", "zero_rated", "exempt", "outside_scope", "unknown"] as const;

function formatLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function ownerName(request: RequestSummary) {
  return request.owner_preferred_name ?? request.owner_display_name ?? "Committee member";
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
  canCreate,
  readOnly,
  mine,
  status,
  departmentId,
}: {
  eventId: string;
  requests: RequestSummary[];
  departments: RequestDepartment[];
  paymentPositions?: RequestPaymentPosition[];
  canCreate: boolean;
  readOnly: boolean;
  mine?: boolean;
  status?: string;
  departmentId?: string;
}) {
  const filtered = requests.filter((request) => {
    if (mine && !request.can_edit_draft) return false;
    if (status && request.approval_status !== status) return false;
    if (departmentId && request.primary_department_id !== departmentId) return false;
    return true;
  });
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
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Button asChild variant={!mine && !status && !departmentId ? "default" : "outline"} size="sm"><Link href={`/events/${eventId}/requests`}>All visible</Link></Button>
          <Button asChild variant={mine ? "default" : "outline"} size="sm"><Link href={`/events/${eventId}/requests?mine=1`}>Mine</Link></Button>
          <Button asChild variant={status === "draft" ? "default" : "outline"} size="sm"><Link href={`/events/${eventId}/requests?status=draft`}>Draft</Link></Button>
          <Button asChild variant={status === "submitted" ? "default" : "outline"} size="sm"><Link href={`/events/${eventId}/requests?status=submitted`}>Submitted</Link></Button>
          {departments.map((department) => (
            <Button key={department.id} asChild variant={departmentId === department.id ? "default" : "outline"} size="sm">
              <Link href={`/events/${eventId}/requests?department=${department.id}`}>{department.code}</Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Visible requests
        </h2>
        {requests.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No spending requests are visible to you for this event.
          </p>
        ) : filtered.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No visible requests match those filters.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
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
                    <td className="py-3 pr-4"><Badge variant={request.approval_status === "draft" ? "secondary" : "default"}>{formatLabel(request.approval_status)}</Badge></td>
                    <td className="py-3 pr-4">
                      {paymentByRequestId.get(request.request_id)?.payment_status ? (
                        <Badge variant={paymentByRequestId.get(request.request_id)?.payment_status === "paid" ? "default" : "outline"}>
                          {formatLabel(paymentByRequestId.get(request.request_id)?.payment_status)}
                        </Badge>
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
          <Badge variant={request.approval_status === "draft" ? "secondary" : "default"}>{formatLabel(request.approval_status)}</Badge>
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
  error,
}: {
  eventId: string;
  departments: RequestDepartment[];
  detail?: SpendingRequestDetail;
  error?: string;
}) {
  const request = detail?.request;
  const allocationByDepartment = new Map((detail?.allocations ?? []).map((allocation) => [allocation.department_id, allocation]));
  const components = detail?.components ?? [];
  const editable = !request || request.approval_status === "draft";

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
      ) : (
        <form action={saveSpendingRequestDraftAction} className="grid gap-6">
          <input type="hidden" name="eventId" value={eventId} />
          {request?.request_id ? <input type="hidden" name="requestId" value={request.request_id} /> : null}
          <section className="rounded-md border p-5">
            <h2 className="font-medium">Request information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field name="title" label="Title" required defaultValue={request?.title ?? ""} />
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Primary department</span>
                <select name="primaryDepartmentId" required defaultValue={request?.primary_department_id ?? ""} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Choose department</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </label>
              <Field name="supplierName" label="Supplier or proposed supplier" defaultValue={request?.supplier_name ?? ""} />
              <Field name="expectedPaymentDate" label="Expected payment date" type="date" defaultValue={request?.expected_payment_date ?? ""} />
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-medium">Description</span>
                <textarea name="description" rows={3} defaultValue={request?.description ?? ""} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-medium">Business justification</span>
                <textarea name="businessJustification" rows={3} defaultValue={request?.business_justification ?? ""} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </label>
              {request && (request.revision_number ?? 1) > 1 ? (
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="font-medium">Change summary</span>
                  <textarea name="changeSummary" rows={2} required defaultValue="" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </label>
              ) : null}
            </div>
          </section>

          <section className="rounded-md border p-5">
            <h2 className="font-medium">Totals and VAT</h2>
            <p className="mt-1 text-sm text-muted-foreground">Enter net plus VAT explicitly. The database requires net plus VAT to equal gross.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <Field name="net" label="Net" required defaultValue={minorToInput(request?.net_minor ?? 0)} />
              <Field name="vat" label="VAT" required defaultValue={minorToInput(request?.vat_minor ?? 0)} />
              <Field name="gross" label="Gross" required defaultValue={minorToInput(request?.gross_minor ?? 0)} />
              <Field name="vatRate" label="VAT rate" defaultValue={request?.vat_rate?.toString() ?? ""} />
              <Select name="vatTreatment" label="VAT treatment" defaultValue={request?.vat_treatment ?? "standard"} />
              <label className="flex items-center gap-2 text-sm md:self-end">
                <input name="vatRecoverable" type="checkbox" defaultChecked={request?.vat_recoverable ?? true} className="h-4 w-4 rounded border" />
                <span>VAT recoverable</span>
              </label>
            </div>
          </section>

          <section className="rounded-md border p-5">
            <h2 className="font-medium">Department allocations</h2>
            <div className="mt-4 grid gap-3">
              {departments.map((department) => {
                const allocation = allocationByDepartment.get(department.id);
                return (
                  <div key={department.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_9rem_9rem_9rem] md:items-end">
                    <input type="hidden" name="departmentId" value={department.id} />
                    <p className="text-sm font-medium">{department.name} <span className="text-muted-foreground">{department.code}</span></p>
                    <Field name={`allocationNet_${department.id}`} label="Net" defaultValue={minorToInput(allocation?.net_minor ?? 0)} />
                    <Field name={`allocationVat_${department.id}`} label="VAT" defaultValue={minorToInput(allocation?.vat_minor ?? 0)} />
                    <Field name={`allocationGross_${department.id}`} label="Gross" defaultValue={minorToInput(allocation?.gross_minor ?? 0)} />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-md border p-5">
            <h2 className="font-medium">Components</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use one row for a simple request or multiple rows for instalments.</p>
            <div className="mt-4 grid gap-4">
              {[1, 2, 3].map((sequence) => {
                const component = components.find((item) => item.sequence_number === sequence);
                return (
                  <div key={sequence} className="rounded-md border p-3">
                    <p className="text-sm font-medium">Component {sequence}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <Field name={`componentDescription_${sequence}`} label="Description" defaultValue={component?.description ?? (sequence === 1 ? request?.title ?? "" : "")} />
                      <Field name={`componentSupplier_${sequence}`} label="Supplier" defaultValue={component?.supplier_name ?? request?.supplier_name ?? ""} />
                      <Field name={`componentDate_${sequence}`} label="Expected date" type="date" defaultValue={component?.expected_payment_date ?? request?.expected_payment_date ?? ""} />
                      <Field name={`componentNet_${sequence}`} label="Net" defaultValue={minorToInput(component?.net_minor ?? (sequence === 1 ? request?.net_minor ?? 0 : 0))} />
                      <Field name={`componentVat_${sequence}`} label="VAT" defaultValue={minorToInput(component?.vat_minor ?? (sequence === 1 ? request?.vat_minor ?? 0 : 0))} />
                      <Field name={`componentGross_${sequence}`} label="Gross" defaultValue={minorToInput(component?.gross_minor ?? (sequence === 1 ? request?.gross_minor ?? 0 : 0))} />
                      <Field name={`componentVatRate_${sequence}`} label="VAT rate" defaultValue={component?.vat_rate?.toString() ?? request?.vat_rate?.toString() ?? ""} />
                      <Select name={`componentVatTreatment_${sequence}`} label="VAT treatment" defaultValue={component?.vat_treatment ?? request?.vat_treatment ?? "standard"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingLabel="Saving draft...">Save draft</SubmitButton>
            <Button asChild variant="outline"><Link href={request?.request_id ? `/events/${eventId}/requests/${request.request_id}` : `/events/${eventId}/requests`}>Cancel</Link></Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} min={type === "number" ? "0" : undefined} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
    </label>
  );
}

function Select({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} defaultValue={defaultValue} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        {vatTreatments.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
      </select>
    </label>
  );
}
