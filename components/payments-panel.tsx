import Link from "next/link";
import { AlertCircle, CheckCircle, CreditCard, History, RotateCcw } from "lucide-react";
import { recordPaymentAction, reversePaymentAction } from "@/app/events/[eventId]/payments/actions";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ComponentPaymentPosition,
  PaymentAllocationDetail,
  PaymentDetailData,
  PaymentFormData,
  PaymentsData,
  RequestPaymentPosition,
} from "@/lib/payments/data";
import { formatMinor, minorToInput } from "@/lib/money";

const paymentMethods = ["bank_transfer", "card", "cash", "direct_debit", "other"] as const;

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function date(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "Not set";
}

function dateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

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

export function PaymentsPanel({
  eventId,
  data,
  canManage,
  readOnly,
  recorded,
  error,
}: {
  eventId: string;
  data: PaymentsData;
  canManage: boolean;
  readOnly: boolean;
  recorded?: boolean;
  error?: string;
}) {
  const payableCount = data.componentPositions.filter((component) => Number(component.outstanding_gross_minor ?? 0) > 0).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Payments record money leaving the event bank account. Paid status is
            derived from non-reversed allocations and is separate from approval.
          </p>
        </div>
        {canManage ? (
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

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Recorded payments</p>
          <p className="mt-1 text-xl font-semibold">{data.summary?.recorded_payment_count ?? 0}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Recorded gross</p>
          <p className="mt-1 text-xl font-semibold">{formatMinor(data.summary?.recorded_gross_minor)}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Reversed gross</p>
          <p className="mt-1 text-xl font-semibold">{formatMinor(data.summary?.reversed_gross_minor)}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Payable components</p>
          <p className="mt-1 text-xl font-semibold">{payableCount}</p>
        </div>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Approved request positions</h2>
        {data.requestPositions.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No approved requests are currently visible for payment tracking.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Request</th>
                  <th className="py-2 pr-4 text-right font-medium">Approved</th>
                  <th className="py-2 pr-4 text-right font-medium">Paid</th>
                  <th className="py-2 pr-4 text-right font-medium">Outstanding</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.requestPositions.map((position) => (
                  <tr key={position.request_id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium">{position.code}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(position.approved_gross_minor)}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(position.paid_gross_minor)}</td>
                    <td className="py-3 pr-4 text-right">{formatMinor(position.outstanding_gross_minor)}</td>
                    <td className="py-3 pr-4"><StatusBadge kind="payment" status={position.payment_status} /></td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm"><Link href={`/events/${eventId}/requests/${position.request_id}/payments`}>History</Link></Button>
                        {canManage && Number(position.outstanding_gross_minor ?? 0) > 0 ? (
                          <Button asChild variant="outline" size="sm"><Link href={`/events/${eventId}/requests/${position.request_id}/payments/new`}>Pay</Link></Button>
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

      <PaymentHistory eventId={eventId} payments={data.payments} />
    </div>
  );
}

function PaymentHistory({ eventId, payments }: { eventId: string; payments: PaymentDetailData["payment"][] }) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="flex items-center gap-2 font-medium">
        <History className="h-4 w-4" aria-hidden="true" />
        Payment history
      </h2>
      {payments.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No payments have been recorded for this event.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[62rem] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Reference</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Payee</th>
                <th className="py-2 pr-4 text-right font-medium">Gross</th>
                <th className="py-2 pr-4 font-medium">Requests</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.payment_id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 font-medium">{payment.code}</td>
                  <td className="py-3 pr-4">{date(payment.payment_date)}</td>
                  <td className="py-3 pr-4">{payment.payee}</td>
                  <td className="py-3 pr-4 text-right">{formatMinor(payment.gross_minor)}</td>
                  <td className="py-3 pr-4">{payment.request_codes ?? "Not allocated"}</td>
                  <td className="py-3 pr-4"><Badge variant={payment.status === "reversed" ? "secondary" : "default"}>{label(payment.status)}</Badge></td>
                  <td className="py-3">
                    <Button asChild variant="outline" size="sm"><Link href={`/events/${eventId}/payments/${payment.payment_id}`}>Open</Link></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const idempotencyKey = crypto.randomUUID();
  const suggestedGross = data.componentPositions.reduce((total, component) => total + Number(component.outstanding_gross_minor ?? 0), 0);

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
        <form action={recordPaymentAction} className="grid gap-6">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
          <section className="rounded-md border p-5">
            <h2 className="font-medium">Payment information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field name="paymentDate" label="Payment date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              <Field name="payee" label="Payee" required />
              <Field name="gross" label="Gross amount" required defaultValue={minorToInput(suggestedGross)} />
              <Field name="bankReference" label="Bank reference" />
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Method</span>
                <select name="method" defaultValue="bank_transfer" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {paymentMethods.map((method) => <option key={method} value={method}>{label(method)}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-medium">Note</span>
                <textarea name="note" rows={2} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </label>
            </div>
          </section>

          <section className="rounded-md border p-5">
            <h2 className="font-medium">Allocations</h2>
            <p className="mt-1 text-sm text-muted-foreground">Allocation totals must equal the payment gross amount.</p>
            <div className="mt-4 grid gap-3">
              {data.componentPositions.map((component) => (
                <ComponentAllocationRow key={component.request_component_id} component={component} />
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingLabel="Recording payment...">Record payment</SubmitButton>
            <Button asChild variant="outline"><Link href={requestId ? `/events/${eventId}/requests/${requestId}/payments` : `/events/${eventId}/payments`}>Cancel</Link></Button>
          </div>
        </form>
      )}
    </div>
  );
}

function ComponentAllocationRow({ component }: { component: ComponentPaymentPosition }) {
  const outstanding = Number(component.outstanding_gross_minor ?? 0);
  return (
    <div className="grid gap-3 rounded-md border p-3 md:grid-cols-[1.5rem_1fr_10rem] md:items-end">
      <input type="hidden" name="componentId" value={component.request_component_id ?? ""} />
      <input name={`selected_${component.request_component_id}`} type="checkbox" defaultChecked={outstanding > 0} className="h-4 w-4 rounded border md:mb-3" aria-label={`Allocate ${component.component_code}`} />
      <div className="text-sm">
        <p className="font-medium">{component.request_code} / {component.component_code}</p>
        <p>{component.description}</p>
        <p className="text-muted-foreground">Approved {formatMinor(component.approved_gross_minor)}; paid {formatMinor(component.paid_gross_minor)}; outstanding {formatMinor(component.outstanding_gross_minor)}</p>
      </div>
      <Field name={`gross_${component.request_component_id}`} label="Allocation" defaultValue={minorToInput(outstanding)} />
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
  canManage,
  readOnly,
}: {
  eventId: string;
  requestId: string;
  position: RequestPaymentPosition;
  components: ComponentPaymentPosition[];
  allocations: PaymentAllocationDetail[];
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
            <div key={component.request_component_id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-3">
                <p className="font-medium">{component.component_code}: {component.description}</p>
                <StatusBadge kind="payment" status={component.payment_status} />
              </div>
              <p className="mt-1 text-muted-foreground">Approved {formatMinor(component.approved_gross_minor)}; paid {formatMinor(component.paid_gross_minor)}; outstanding {formatMinor(component.outstanding_gross_minor)}</p>
            </div>
          ))}
        </div>
      </section>
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
        <div className="mt-4 overflow-x-auto">
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
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
    </label>
  );
}
