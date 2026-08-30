"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEventHandler } from "react";
import { recordPaymentAction } from "@/app/events/[eventId]/payments/actions";
import { FinancialField } from "@/components/financial-field";
import { RequestComponentSurface } from "@/components/request-component-surface";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import type { ComponentPaymentPosition, PaymentFormData } from "@/lib/payments/data";
import { resolveEffectiveDueDate } from "@/lib/payments/data";
import { formatMinor, minorToInput, parseMoneyToMinor } from "@/lib/money";

const paymentMethods = ["bank_transfer", "card", "cash", "direct_debit", "other"] as const;

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function date(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "Not set";
}

function selectedInitialState(components: ComponentPaymentPosition[], selectedComponentId?: string) {
  if (selectedComponentId) {
    return Object.fromEntries(components.map((component) => [component.request_component_id ?? "", component.request_component_id === selectedComponentId]));
  }
  if (components.length === 1) {
    return { [components[0].request_component_id ?? ""]: true };
  }
  return Object.fromEntries(components.map((component) => [component.request_component_id ?? "", false]));
}

function allocationInitialState(components: ComponentPaymentPosition[]) {
  return Object.fromEntries(
    components.map((component) => [component.request_component_id ?? "", minorToInput(Number(component.outstanding_gross_minor ?? 0))]),
  );
}

function parseAllocationInput(value: string) {
  try {
    return parseMoneyToMinor(value || "0");
  } catch {
    return 0;
  }
}

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PaymentFormClient({
  eventId,
  requestId,
  data,
}: {
  eventId: string;
  requestId?: string;
  data: PaymentFormData;
}) {
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [selected, setSelected] = useState(() => selectedInitialState(data.componentPositions, data.selectedComponentId));
  const [allocations, setAllocations] = useState(() => allocationInitialState(data.componentPositions));

  const selectedComponents = data.componentPositions.filter((component) => selected[component.request_component_id ?? ""]);
  const totalMinor = useMemo(() => (
    data.componentPositions.reduce((total, component) => {
      const componentId = component.request_component_id ?? "";
      if (!selected[componentId]) return total;
      return total + parseAllocationInput(allocations[componentId] ?? "0");
    }, 0)
  ), [allocations, data.componentPositions, selected]);
  const selectedComponent = data.componentPositions.find((component) => component.request_component_id === data.selectedComponentId);
  const canSubmit = selectedComponents.length > 0 && totalMinor > 0;

  return (
    <form action={recordPaymentAction} className="grid gap-6">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="gross" value={minorToInput(totalMinor)} />
      {data.selectedComponentId ? <input type="hidden" name="contextComponentId" value={data.selectedComponentId} /> : null}
      {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
      {selectedComponent ? <SelectedComponentSummary component={selectedComponent} eventDate={data.eventDate} /> : null}

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Payment information</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field name="paymentDate" label="Payment date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          <Field name="payee" label="Payee" required />
          <div className="rounded-md border bg-slate-50 p-3 text-sm">
            <p className="text-muted-foreground">Payment amount</p>
            <p className="mt-1 text-lg font-semibold">{formatMinor(totalMinor)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Calculated from selected component allocations.</p>
          </div>
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
        <p className="mt-1 text-sm text-muted-foreground">Select one or more current approved components. Payment amount is calculated from the selected allocations.</p>
        {!canSubmit ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Select at least one component to record a payment.</p>
        ) : null}
        <div className="mt-4 grid gap-3">
          {data.componentPositions.map((component) => (
            <ComponentAllocationRow
              key={component.request_component_id}
              component={component}
              checked={Boolean(selected[component.request_component_id ?? ""])}
              value={allocations[component.request_component_id ?? ""] ?? ""}
              onCheckedChange={(checked) => setSelected((current) => ({ ...current, [component.request_component_id ?? ""]: checked }))}
              onValueChange={(value) => setAllocations((current) => ({ ...current, [component.request_component_id ?? ""]: value }))}
            />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Recording payment..." disabled={!canSubmit}>Record payment</SubmitButton>
        <Button asChild variant="outline"><Link href={requestId ? `/events/${eventId}/requests/${requestId}/payments` : `/events/${eventId}/payments`}>Cancel</Link></Button>
      </div>
    </form>
  );
}

function SelectedComponentSummary({
  component,
  eventDate,
}: {
  component: ComponentPaymentPosition;
  eventDate?: string | null;
}) {
  const dueDate = resolveEffectiveDueDate(component, eventDate);
  return (
    <section className="rounded-md border border-[hsl(var(--marketing-brand))]/30 bg-[hsl(var(--marketing-brand-soft))] p-5">
      <h2 className="font-medium">Selected component</h2>
      <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
        <div><dt className="text-muted-foreground">Request</dt><dd className="font-medium">{component.request_code}</dd></div>
        <div><dt className="text-muted-foreground">Component</dt><dd className="font-medium">{component.description}</dd></div>
        <div><dt className="text-muted-foreground">Supplier</dt><dd>{component.supplier_name ?? "Supplier not set"}</dd></div>
        <div>
          <dt className="text-muted-foreground">Due date</dt>
          <dd>{date(dueDate.effective_due_date)}</dd>
          {dueDate.due_date_source === "event" ? <dd className="text-xs text-muted-foreground">Event date</dd> : null}
        </div>
        <div><dt className="text-muted-foreground">Approved gross</dt><dd>{formatMinor(component.approved_gross_minor)}</dd></div>
        <div><dt className="text-muted-foreground">Outstanding</dt><dd>{formatMinor(component.outstanding_gross_minor)}</dd></div>
      </dl>
    </section>
  );
}

function ComponentAllocationRow({
  component,
  checked,
  value,
  onCheckedChange,
  onValueChange,
}: {
  component: ComponentPaymentPosition;
  checked: boolean;
  value: string;
  onCheckedChange: (checked: boolean) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <RequestComponentSurface className="grid min-w-0 gap-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(8rem,10rem)] md:items-end">
      <input type="hidden" name="componentId" value={component.request_component_id ?? ""} />
      <input name={`selected_${component.request_component_id}`} type="checkbox" checked={checked} onChange={(event) => onCheckedChange(event.currentTarget.checked)} className="h-4 w-4 rounded border md:mb-3" aria-label={`Allocate ${component.component_code}`} />
      <div className="min-w-0 text-sm">
        <p className="break-words font-medium">{component.request_code} / {component.component_code}</p>
        <p>{component.description}</p>
        <p className="text-muted-foreground">Approved {formatMinor(component.approved_gross_minor)}; paid {formatMinor(component.paid_gross_minor)}; outstanding {formatMinor(component.outstanding_gross_minor)}</p>
      </div>
      <FinancialField kind="gross" name={`gross_${component.request_component_id}`} label="Allocate now" value={value} onChange={(event) => onValueChange(event.currentTarget.value)} disabled={!checked} />
    </RequestComponentSurface>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} value={value} onChange={onChange} disabled={disabled} className="w-full max-w-full rounded-md border bg-background px-3 py-2 disabled:bg-muted disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
    </label>
  );
}
