"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, RotateCcw, Split, Wand2, X } from "lucide-react";
import { saveSpendingRequestDraftAction } from "@/app/events/[eventId]/requests/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import type { RequestComponent, RequestDepartment, SpendingRequestDetail } from "@/lib/requests/data";
import { formatMinor, minorToInput } from "@/lib/money";

const vatTreatments = ["standard", "reduced", "zero_rated", "exempt", "outside_scope", "unknown"] as const;
type VatTreatmentValue = (typeof vatTreatments)[number];
const defaultVatRates: Record<VatTreatmentValue, string> = {
  standard: "20",
  reduced: "5",
  zero_rated: "0",
  exempt: "0",
  outside_scope: "0",
  unknown: "",
};

type ComponentDraft = {
  key: number;
  description: string;
  expectedDate: string;
  supplier: string;
  net: string;
  vat: string;
  gross: string;
  vatRate: string;
  vatTreatment: string;
};

function parseInputMinor(value: string) {
  const cleaned = value.trim().replace(/^£/, "").replaceAll(",", "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const [major, minor = ""] = cleaned.split(".");
  return Number(BigInt(major) * BigInt(100) + BigInt(minor.padEnd(2, "0")));
}

function formatInputMinor(value: number) {
  return minorToInput(value);
}

function parseRateBasisPoints(value: string) {
  const cleaned = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const basisPoints = Number(BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0")));
  return basisPoints >= 0 && basisPoints <= 10000 ? basisPoints : null;
}

function roundDivide(numerator: bigint, denominator: bigint) {
  return Number((numerator + denominator / BigInt(2)) / denominator);
}

function computeFromNet(netMinor: number, rateBasisPoints: number) {
  const vatMinor = roundDivide(BigInt(netMinor) * BigInt(rateBasisPoints), BigInt(10000));
  return { net: netMinor, vat: vatMinor, gross: netMinor + vatMinor };
}

function computeFromGross(grossMinor: number, rateBasisPoints: number) {
  const divisor = BigInt(10000 + rateBasisPoints);
  const netMinor = roundDivide(BigInt(grossMinor) * BigInt(10000), divisor);
  return { net: netMinor, vat: grossMinor - netMinor, gross: grossMinor };
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function componentFromExisting(component: RequestComponent | undefined, fallback: {
  key: number;
  title: string;
  expectedDate: string;
  supplier: string;
  net: string;
  vat: string;
  gross: string;
  vatRate: string;
  vatTreatment: string;
}): ComponentDraft {
  return {
    key: fallback.key,
    description: component?.description ?? fallback.title,
    expectedDate: component?.expected_payment_date ?? fallback.expectedDate,
    supplier: component?.supplier_name ?? fallback.supplier,
    net: minorToInput(component?.net_minor ?? parseInputMinor(fallback.net) ?? 0),
    vat: minorToInput(component?.vat_minor ?? parseInputMinor(fallback.vat) ?? 0),
    gross: minorToInput(component?.gross_minor ?? parseInputMinor(fallback.gross) ?? 0),
    vatRate: component?.vat_rate?.toString() ?? fallback.vatRate,
    vatTreatment: component?.vat_treatment ?? fallback.vatTreatment,
  };
}

function splitMinor(total: number, count: number) {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index === count - 1 ? remainder : 0));
}

function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </label>
  );
}

export function SpendingRequestForm({
  eventId,
  departments,
  detail,
  defaultDepartmentId,
}: {
  eventId: string;
  departments: RequestDepartment[];
  detail?: SpendingRequestDetail;
  defaultDepartmentId?: string;
}) {
  const request = detail?.request;
  const existingComponents = detail?.components ?? [];
  const [title, setTitle] = useState(request?.title ?? "");
  const [departmentId, setDepartmentId] = useState(request?.primary_department_id ?? defaultDepartmentId ?? "");
  const [supplierName, setSupplierName] = useState(request?.supplier_name ?? "");
  const [description, setDescription] = useState(request?.description ?? "");
  const [expectedDate, setExpectedDate] = useState(request?.expected_payment_date ?? "");
  const [vatTreatment, setVatTreatment] = useState<VatTreatmentValue>(request?.vat_treatment ?? "standard");
  const [vatRate, setVatRate] = useState(request?.vat_rate?.toString() ?? defaultVatRates.standard);
  const [net, setNet] = useState(minorToInput(request?.net_minor ?? 0));
  const [vat, setVat] = useState(minorToInput(request?.vat_minor ?? 0));
  const [gross, setGross] = useState(minorToInput(request?.gross_minor ?? 0));
  const [computeMode, setComputeMode] = useState<"gross" | "net">("gross");
  const [vatRecoverable, setVatRecoverable] = useState(request?.vat_recoverable ?? true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manualVat, setManualVat] = useState(false);
  const [businessJustification, setBusinessJustification] = useState(request?.business_justification ?? "");
  const [changeSummary, setChangeSummary] = useState("");
  const [components, setComponents] = useState<ComponentDraft[]>(() => {
    const fallback = {
      key: 1,
      title: existingComponents[0]?.description ?? "Full payment",
      expectedDate: request?.expected_payment_date ?? "",
      supplier: request?.supplier_name ?? "",
      net: minorToInput(request?.net_minor ?? 0),
      vat: minorToInput(request?.vat_minor ?? 0),
      gross: minorToInput(request?.gross_minor ?? 0),
      vatRate: request?.vat_rate?.toString() ?? defaultVatRates.standard,
      vatTreatment: request?.vat_treatment ?? "standard",
    };
    return (existingComponents.length ? existingComponents : [undefined]).map((component, index) =>
      componentFromExisting(component, { ...fallback, key: index + 1 }),
    );
  });

  const multiComponent = components.length > 1;
  const requestTotals = {
    net: parseInputMinor(net),
    vat: parseInputMinor(vat),
    gross: parseInputMinor(gross),
  };
  const componentTotals = components.reduce(
    (totals, component) => ({
      net: totals.net + (parseInputMinor(component.net) ?? 0),
      vat: totals.vat + (parseInputMinor(component.vat) ?? 0),
      gross: totals.gross + (parseInputMinor(component.gross) ?? 0),
    }),
    { net: 0, vat: 0, gross: 0 },
  );
  const reconciled =
    requestTotals.net !== null &&
    requestTotals.vat !== null &&
    requestTotals.gross !== null &&
    requestTotals.net + requestTotals.vat === requestTotals.gross &&
    componentTotals.net === requestTotals.net &&
    componentTotals.vat === requestTotals.vat &&
    componentTotals.gross === requestTotals.gross;

  const computeDisabled = useMemo(() => {
    const rate = parseRateBasisPoints(vatRate);
    if (rate === null) return true;
    return computeMode === "gross" ? parseInputMinor(gross) === null : parseInputMinor(net) === null;
  }, [computeMode, gross, net, vatRate]);

  useEffect(() => {
    const defaultRate = defaultVatRates[vatTreatment];
    if (!manualVat && defaultRate !== "") {
      setVatRate(defaultRate);
    }
  }, [manualVat, vatTreatment]);

  useEffect(() => {
    if (components.length !== 1) return;
    setComponents((current) => [{
      ...current[0],
      description: current[0]?.description || "Full payment",
      expectedDate,
      supplier: supplierName,
      net,
      vat,
      gross,
      vatRate,
      vatTreatment,
    }]);
  }, [components.length, expectedDate, gross, net, supplierName, vat, vatRate, vatTreatment]);

  function computeVat() {
    const rate = parseRateBasisPoints(vatRate);
    if (rate === null) return;
    const sourceAmount = computeMode === "gross" ? parseInputMinor(gross) : parseInputMinor(net);
    if (sourceAmount === null) return;
    const computed = computeMode === "gross" ? computeFromGross(sourceAmount, rate) : computeFromNet(sourceAmount, rate);
    setNet(formatInputMinor(computed.net));
    setVat(formatInputMinor(computed.vat));
    setGross(formatInputMinor(computed.gross));
  }

  function updateComponent(key: number, update: Partial<ComponentDraft>) {
    setComponents((current) => current.map((component) => (component.key === key ? { ...component, ...update } : component)));
  }

  function addComponent() {
    setComponents((current) => [
      ...current.map((component, index) => ({
        ...component,
        description: component.description || (index === 0 ? "Full payment" : ""),
      })),
      {
        key: Math.max(...current.map((component) => component.key)) + 1,
        description: "",
        expectedDate: "",
        supplier: supplierName,
        net: "0.00",
        vat: "0.00",
        gross: "0.00",
        vatRate,
        vatTreatment,
      },
    ]);
  }

  function removeComponent(key: number) {
    setComponents((current) => current.length > 1 ? current.filter((component) => component.key !== key) : current);
  }

  function allocateRemaining(key: number) {
    if (requestTotals.net === null || requestTotals.vat === null || requestTotals.gross === null) return;
    const otherTotals = components
      .filter((component) => component.key !== key)
      .reduce(
        (totals, component) => ({
          net: totals.net + (parseInputMinor(component.net) ?? 0),
          vat: totals.vat + (parseInputMinor(component.vat) ?? 0),
          gross: totals.gross + (parseInputMinor(component.gross) ?? 0),
        }),
        { net: 0, vat: 0, gross: 0 },
      );
    updateComponent(key, {
      net: formatInputMinor(Math.max(0, requestTotals.net - otherTotals.net)),
      vat: formatInputMinor(Math.max(0, requestTotals.vat - otherTotals.vat)),
      gross: formatInputMinor(Math.max(0, requestTotals.gross - otherTotals.gross)),
    });
  }

  function splitEqually() {
    if (requestTotals.net === null || requestTotals.vat === null || requestTotals.gross === null) return;
    const netParts = splitMinor(requestTotals.net, components.length);
    const vatParts = splitMinor(requestTotals.vat, components.length);
    const grossParts = splitMinor(requestTotals.gross, components.length);
    setComponents((current) => current.map((component, index) => ({
      ...component,
      description: component.description || (index === 0 ? "Deposit" : "Balance"),
      net: formatInputMinor(netParts[index]),
      vat: formatInputMinor(vatParts[index]),
      gross: formatInputMinor(grossParts[index]),
    })));
  }

  return (
    <form action={saveSpendingRequestDraftAction} className="grid gap-6">
      <input type="hidden" name="eventId" value={eventId} />
      {request?.request_id ? <input type="hidden" name="requestId" value={request.request_id} /> : null}

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Request details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field name="title" label="Title" required value={title} onChange={setTitle} />
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Department</span>
            <select
              name="primaryDepartmentId"
              required
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Choose department</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            {!departmentId ? <span className="text-xs text-muted-foreground">Select the department responsible for this request.</span> : null}
          </label>
          <Field name="supplierName" label="Supplier or proposed supplier" value={supplierName} onChange={setSupplierName} />
          <Field name="expectedPaymentDate" label="Expected payment date" type="date" value={expectedDate} onChange={setExpectedDate} />
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium">Description</span>
            <textarea
              name="description"
              rows={3}
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
          {request && (request.revision_number ?? 1) > 1 ? (
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-medium">Change summary</span>
              <textarea
                name="changeSummary"
                rows={2}
                required
                value={changeSummary}
                onChange={(event) => setChangeSummary(event.target.value)}
                className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Request amount</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">VAT treatment</span>
            <select
              name="vatTreatment"
              required
              value={vatTreatment}
              onChange={(event) => setVatTreatment(event.target.value as VatTreatmentValue)}
              className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {vatTreatments.map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>
          </label>
          <Field name="vatRate" label="VAT rate" value={vatRate} onChange={setVatRate} />
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Calculate from</span>
            <select
              value={computeMode}
              onChange={(event) => setComputeMode(event.target.value as "gross" | "net")}
              className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="gross">Gross amount</option>
              <option value="net">Net amount</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button type="button" variant="outline" disabled={computeDisabled} onClick={computeVat}>
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Compute from {computeMode === "gross" ? "Gross" : "Net"}
            </Button>
          </div>
          <Field name="net" label="Net amount" required value={net} onChange={setNet} />
          <Field name="vat" label="VAT amount" required value={vat} onChange={setVat} />
          <Field name="gross" label="Gross amount" required value={gross} onChange={setGross} />
          <label className="flex items-center gap-2 text-sm md:self-end">
            <input name="vatRecoverable" type="checkbox" checked={vatRecoverable} onChange={(event) => setVatRecoverable(event.target.checked)} className="h-4 w-4 rounded border" />
            <span>VAT recoverable</span>
          </label>
        </div>
      </section>

      <section className="rounded-md border p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-medium">Payment Components</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use one full-payment component or add instalments when the supplier will be paid in stages.</p>
          </div>
          <Button type="button" variant="outline" onClick={addComponent}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Component
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          {components.map((component, index) => (
            <div key={component.key} className="rounded-md border p-3">
              <input type="hidden" name="componentSequence" value={component.key} />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Component {index + 1}</p>
                {components.length > 1 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeComponent(component.key)}>
                    <X className="h-4 w-4" aria-hidden="true" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Field name={`componentDescription_${component.key}`} label="Component description" required={multiComponent} value={component.description} onChange={(value) => updateComponent(component.key, { description: value })} />
                <Field name={`componentDate_${component.key}`} label="Expected date" type="date" value={component.expectedDate} onChange={(value) => updateComponent(component.key, { expectedDate: value })} />
                <Field name={`componentSupplier_${component.key}`} label="Supplier override" value={component.supplier} onChange={(value) => updateComponent(component.key, { supplier: value })} />
                <Field name={`componentNet_${component.key}`} label="Net" required value={component.net} onChange={(value) => updateComponent(component.key, { net: value })} />
                <Field name={`componentVat_${component.key}`} label="VAT" required value={component.vat} onChange={(value) => updateComponent(component.key, { vat: value })} />
                <Field name={`componentGross_${component.key}`} label="Gross" required value={component.gross} onChange={(value) => updateComponent(component.key, { gross: value })} />
                <input type="hidden" name={`componentVatRate_${component.key}`} value={component.vatRate} />
                <input type="hidden" name={`componentVatTreatment_${component.key}`} value={component.vatTreatment} />
              </div>
              {components.length > 1 ? (
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => allocateRemaining(component.key)}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Allocate Remaining
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        {components.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={splitEqually}>
              <Split className="h-4 w-4" aria-hidden="true" />
              Split Equally
            </Button>
            {components.length === 2 ? (
              <Button type="button" variant="outline" size="sm" onClick={splitEqually}>50 / 50</Button>
            ) : null}
          </div>
        ) : null}

        <div className={`mt-4 rounded-md border p-3 text-sm ${reconciled ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
          <p>Request total: {requestTotals.gross === null ? "Enter a valid gross amount" : formatMinor(requestTotals.gross)}</p>
          <p>Components total: {formatMinor(componentTotals.gross)}</p>
          {requestTotals.gross !== null && componentTotals.gross !== requestTotals.gross ? (
            <p>Remaining to allocate: {formatMinor(requestTotals.gross - componentTotals.gross)}</p>
          ) : reconciled ? (
            <p>Fully allocated</p>
          ) : (
            <p>Net, VAT and gross component totals must match the request totals.</p>
          )}
        </div>
      </section>

      <section className="rounded-md border p-5">
        <button
          type="button"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
          className="flex w-full items-center justify-between text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span>Advanced Options</span>
          <span>{advancedOpen ? "Hide" : "Show"}</span>
        </button>
        {advancedOpen ? (
          <div className="mt-4 grid gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={manualVat} onChange={(event) => setManualVat(event.target.checked)} className="h-4 w-4 rounded border" />
              <span>Custom VAT calculation or manual override</span>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Business justification</span>
              <textarea
                name="businessJustification"
                rows={3}
                value={businessJustification}
                onChange={(event) => setBusinessJustification(event.target.value)}
                className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          </div>
        ) : (
          <>
            <input type="hidden" name="businessJustification" value={businessJustification} />
          </>
        )}
      </section>

      {!reconciled ? (
        <div role="alert" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <p>Save and submission need request totals and payment components to reconcile exactly.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving draft..." disabled={!reconciled}>Save Draft</SubmitButton>
        <SubmitButton pendingLabel="Submitting request..." name="intent" value="submit" disabled={!reconciled}>
          Submit Request
        </SubmitButton>
        <Button asChild variant="outline"><Link href={request?.request_id ? `/events/${eventId}/requests/${request.request_id}` : `/events/${eventId}/requests`}>Cancel Draft</Link></Button>
      </div>
    </form>
  );
}
