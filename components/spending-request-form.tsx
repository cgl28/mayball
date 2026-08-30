"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, RotateCcw, Split, Wand2, X } from "lucide-react";
import { saveSpendingRequestDraftAction } from "@/app/events/[eventId]/requests/actions";
import { FinancialField, type FinancialFieldKind } from "@/components/financial-field";
import { RequestComponentSurface } from "@/components/request-component-surface";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  allocateGrossByPercentages,
  computeFromGrossMinor,
  computeFromNetMinor,
  isBalancedMoney,
  type MoneyBreakdown,
} from "@/lib/requests/component-allocation";
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
  legacySupplier: boolean;
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

function label(value: string) {
  return value.replaceAll("_", " ");
}

function defaultComponentName(position: number) {
  if (position === 1) return "Full payment";
  if (position === 2) return "Final Payment";
  return `Instalment ${position}`;
}

function isUntouchedSinglePaymentName(value: string) {
  return value.trim() === "" || value.trim().toLowerCase() === "full payment";
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
    legacySupplier: Boolean(component?.supplier_name && component.supplier_name !== fallback.supplier),
    supplier: component?.supplier_name ?? fallback.supplier,
    net: minorToInput(component?.net_minor ?? parseInputMinor(fallback.net) ?? 0),
    vat: minorToInput(component?.vat_minor ?? parseInputMinor(fallback.vat) ?? 0),
    gross: minorToInput(component?.gross_minor ?? parseInputMinor(fallback.gross) ?? 0),
    vatRate: component?.vat_rate?.toString() ?? fallback.vatRate,
    vatTreatment: component?.vat_treatment ?? fallback.vatTreatment,
  };
}

function componentMoney(component: ComponentDraft): MoneyBreakdown | null {
  const net = parseInputMinor(component.net);
  const vat = parseInputMinor(component.vat);
  const gross = parseInputMinor(component.gross);
  if (net === null || vat === null || gross === null) return null;
  return { net, vat, gross };
}

function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  required,
  financialKind,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  financialKind?: FinancialFieldKind;
}) {
  if (financialKind) {
    return <FinancialField kind={financialKind} name={name} label={label} value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} />;
  }

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
  const [changeSummary, setChangeSummary] = useState(detail?.currentRevisionChangeSummary ?? detail?.latestChangeRequestReview?.reason ?? "");
  const [components, setComponents] = useState<ComponentDraft[]>(() => {
    const fallback = {
      key: 1,
      title: existingComponents[0]?.description ?? "Full payment",
      expectedDate: existingComponents[0]?.expected_payment_date ?? request?.expected_payment_date ?? "",
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
  const componentBalance = {
    net: requestTotals.net === null ? null : requestTotals.net - componentTotals.net,
    vat: requestTotals.vat === null ? null : requestTotals.vat - componentTotals.vat,
    gross: requestTotals.gross === null ? null : requestTotals.gross - componentTotals.gross,
  };
  const componentsOverAllocated = [componentBalance.net, componentBalance.vat, componentBalance.gross]
    .some((value) => value !== null && value < 0);
  const parentTotals: MoneyBreakdown | null = requestTotals.net !== null && requestTotals.vat !== null && requestTotals.gross !== null
    ? { net: requestTotals.net, vat: requestTotals.vat, gross: requestTotals.gross }
    : null;
  const parentTotalsValid = parentTotals !== null && isBalancedMoney(parentTotals);
  const reconciled =
    parentTotalsValid &&
    componentTotals.net === requestTotals.net &&
    componentTotals.vat === requestTotals.vat &&
    componentTotals.gross === requestTotals.gross;
  const validationIssues = [
    !title.trim() ? "Request title is required." : null,
    !departmentId ? "Choose the department responsible for this request." : null,
    !description.trim() ? "Describe what this spending request is for." : null,
    parentTotals === null ? "Enter valid request amounts using pounds and pence." : null,
    parentTotals !== null && parentTotals.gross <= 0 ? "Request gross must be greater than zero." : null,
    parentTotals !== null && parentTotals.net + parentTotals.vat !== parentTotals.gross ? "Request totals have not been calculated. Use Compute from Gross before creating the payment schedule." : null,
    parentTotalsValid && components.some((component) => {
      const money = componentMoney(component);
      return money === null || money.net + money.vat !== money.gross;
    }) ? "Each payment component must have net plus VAT equal to gross." : null,
    parentTotalsValid && componentTotals.net !== requestTotals.net ? `Payment components are ${formatMinor(Math.abs((requestTotals.net ?? 0) - componentTotals.net))} ${componentTotals.net > (requestTotals.net ?? 0) ? "over" : "short of"} the request net total.` : null,
    parentTotalsValid && componentTotals.vat !== requestTotals.vat ? `Payment components are ${formatMinor(Math.abs((requestTotals.vat ?? 0) - componentTotals.vat))} ${componentTotals.vat > (requestTotals.vat ?? 0) ? "over" : "short of"} the request VAT total.` : null,
    parentTotalsValid && componentTotals.gross !== requestTotals.gross ? `Payment components are ${formatMinor(Math.abs((requestTotals.gross ?? 0) - componentTotals.gross))} ${componentTotals.gross > (requestTotals.gross ?? 0) ? "over" : "short of"} the request gross total.` : null,
  ].filter((issue): issue is string => Boolean(issue));

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
      supplier: current[0]?.legacySupplier ? current[0].supplier : supplierName,
      net,
      vat,
      gross,
      vatRate,
      vatTreatment,
    }]);
  }, [components.length, gross, net, supplierName, vat, vatRate, vatTreatment]);

  function computeVat() {
    const rate = parseRateBasisPoints(vatRate);
    if (rate === null) return;
    const sourceAmount = computeMode === "gross" ? parseInputMinor(gross) : parseInputMinor(net);
    if (sourceAmount === null) return;
    const computed = computeMode === "gross" ? computeFromGrossMinor(sourceAmount, rate) : computeFromNetMinor(sourceAmount, rate);
    setNet(formatInputMinor(computed.net));
    setVat(formatInputMinor(computed.vat));
    setGross(formatInputMinor(computed.gross));
  }

  function updateComponent(key: number, update: Partial<ComponentDraft>) {
    setComponents((current) => current.map((component) => (component.key === key ? { ...component, ...update } : component)));
  }

  function addComponent() {
    if (!parentTotalsValid) return;
    setComponents((current) => {
      const nextPosition = current.length + 1;
      const nextName = defaultComponentName(nextPosition);
      return [
        ...current.map((component, index) => ({
          ...component,
          description: index === 0 && current.length === 1 && isUntouchedSinglePaymentName(component.description)
            ? "Deposit"
            : component.description || defaultComponentName(index + 1),
        })),
        {
          key: Math.max(...current.map((component) => component.key)) + 1,
          description: nextName,
          expectedDate: "",
          legacySupplier: false,
          supplier: supplierName,
          net: "0.00",
          vat: "0.00",
          gross: "0.00",
          vatRate,
          vatTreatment,
        },
      ];
    });
  }

  function removeComponent(key: number) {
    setComponents((current) => current.length > 1 ? current.filter((component) => component.key !== key) : current);
  }

  function allocateRemaining(key: number) {
    if (!parentTotalsValid || parentTotals === null) return;
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
    const remaining = {
      net: parentTotals.net - otherTotals.net,
      vat: parentTotals.vat - otherTotals.vat,
      gross: parentTotals.gross - otherTotals.gross,
    };
    if (remaining.net < 0 || remaining.vat < 0 || remaining.gross < 0) return;
    updateComponent(key, {
      net: formatInputMinor(remaining.net),
      vat: formatInputMinor(remaining.vat),
      gross: formatInputMinor(remaining.gross),
    });
  }

  function computeComponentFromGross(key: number) {
    setComponents((current) => current.map((component) => {
      if (component.key !== key) return component;
      const rate = parseRateBasisPoints(component.vatRate);
      const grossMinor = parseInputMinor(component.gross);
      if (rate === null || grossMinor === null) return component;
      const computed = computeFromGrossMinor(grossMinor, rate);
      return {
        ...component,
        net: formatInputMinor(computed.net),
        vat: formatInputMinor(computed.vat),
        gross: formatInputMinor(computed.gross),
      };
    }));
  }

  function applyTwoWaySplit(firstPercentage: number, secondPercentage: number) {
    const rate = parseRateBasisPoints(vatRate);
    if (!parentTotalsValid || parentTotals === null || rate === null || components.length !== 2) return;
    const parts = allocateGrossByPercentages(parentTotals, rate, [firstPercentage, secondPercentage]);
    setComponents((current) => current.map((component, index) => ({
      ...component,
      description: component.description || (index === 0 ? "Deposit" : "Balance"),
      net: formatInputMinor(parts[index].net),
      vat: formatInputMinor(parts[index].vat),
      gross: formatInputMinor(parts[index].gross),
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
            <Button
              type="button"
              variant="outline"
              disabled={computeDisabled}
              onClick={computeVat}
              className="border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950"
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Compute from {computeMode === "gross" ? "Gross" : "Net"}
            </Button>
          </div>
          <Field name="net" label="Net amount" required value={net} onChange={setNet} financialKind="net" />
          <Field name="vat" label="VAT amount" required value={vat} onChange={setVat} financialKind="vat" />
          <Field name="gross" label="Gross amount" required value={gross} onChange={setGross} financialKind="gross" />
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
            <p className="mt-1 text-sm text-muted-foreground">Use one full-payment component or add instalments when the supplier will be paid in stages. Component due dates are the payment schedule.</p>
          </div>
          <Button type="button" variant="outline" onClick={addComponent} disabled={!parentTotalsValid}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Component
          </Button>
        </div>

        {!parentTotalsValid ? (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">Complete the request totals above before creating the payment schedule.</p>
            <p className="mt-1">Enter the gross amount and VAT treatment, then use Compute from Gross.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3">
              {components.map((component, index) => {
                const legacySupplier = component.legacySupplier && component.supplier;
                return (
                  <RequestComponentSurface key={component.key}>
                    <input type="hidden" name="componentSequence" value={component.key} />
                    <input type="hidden" name={`componentSupplier_${component.key}`} value={component.supplier || supplierName} />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Component {index + 1}{component.description ? ` - ${component.description}` : ""}</p>
                      {components.length > 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeComponent(component.key)}>
                          <X className="h-4 w-4" aria-hidden="true" />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Field name={`componentDescription_${component.key}`} label="Component name" required={multiComponent} value={component.description} onChange={(value) => updateComponent(component.key, { description: value })} />
                      <Field name={`componentDate_${component.key}`} label="Due date" type="date" value={component.expectedDate} onChange={(value) => updateComponent(component.key, { expectedDate: value })} />
                      <Field name={`componentGross_${component.key}`} label="Gross" required value={component.gross} onChange={(value) => updateComponent(component.key, { gross: value })} financialKind="gross" />
                      <label className="grid gap-1 text-sm">
                        <span className="font-medium">VAT treatment</span>
                        <select
                          name={`componentVatTreatment_${component.key}`}
                          required
                          value={component.vatTreatment}
                          onChange={(event) => {
                            const nextTreatment = event.target.value as VatTreatmentValue;
                            updateComponent(component.key, {
                              vatTreatment: nextTreatment,
                              vatRate: defaultVatRates[nextTreatment] || component.vatRate,
                            });
                          }}
                          className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {vatTreatments.map((value) => <option key={value} value={value}>{label(value)}</option>)}
                        </select>
                      </label>
                      <Field name={`componentVatRate_${component.key}`} label="VAT rate" value={component.vatRate} onChange={(value) => updateComponent(component.key, { vatRate: value })} />
                      <Field name={`componentVat_${component.key}`} label="VAT" required value={component.vat} onChange={(value) => updateComponent(component.key, { vat: value })} financialKind="vat" />
                      <Field name={`componentNet_${component.key}`} label="Net" required value={component.net} onChange={(value) => updateComponent(component.key, { net: value })} financialKind="net" />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={parseRateBasisPoints(component.vatRate) === null || parseInputMinor(component.gross) === null}
                          onClick={() => computeComponentFromGross(component.key)}
                          className="border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950"
                        >
                          <Wand2 className="h-4 w-4" aria-hidden="true" />
                          Compute from Gross
                        </Button>
                      </div>
                    </div>
                    {legacySupplier ? (
                      <p className="mt-3 rounded-md border bg-slate-50 p-3 text-xs text-muted-foreground">
                        This legacy component keeps its stored supplier value for compatibility.
                      </p>
                    ) : null}
                    {components.length > 1 ? (
                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => allocateRemaining(component.key)}>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Allocate Remaining
                      </Button>
                    ) : null}
                  </RequestComponentSurface>
                );
              })}
            </div>

            {components.length === 2 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => applyTwoWaySplit(50, 50)}>
                  <Split className="h-4 w-4" aria-hidden="true" />
                  50 / 50
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyTwoWaySplit(20, 80)}>20 / 80</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyTwoWaySplit(10, 90)}>10 / 90</Button>
              </div>
            ) : null}

            <div className={`mt-4 rounded-md border p-3 text-sm ${reconciled ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
              <dl className="grid gap-2 sm:grid-cols-3">
                <div><dt className="font-medium">Request net</dt><dd>{formatMinor(requestTotals.net)}</dd></div>
                <div><dt className="font-medium">Components net</dt><dd>{formatMinor(componentTotals.net)}</dd></div>
                <div><dt className="font-medium">Remaining net</dt><dd>{componentBalance.net === null ? "Not available" : formatMinor(componentBalance.net)}</dd></div>
                <div><dt className="font-medium">Request VAT</dt><dd>{formatMinor(requestTotals.vat)}</dd></div>
                <div><dt className="font-medium">Components VAT</dt><dd>{formatMinor(componentTotals.vat)}</dd></div>
                <div><dt className="font-medium">Remaining VAT</dt><dd>{componentBalance.vat === null ? "Not available" : formatMinor(componentBalance.vat)}</dd></div>
                <div><dt className="font-medium">Request gross</dt><dd>{formatMinor(requestTotals.gross)}</dd></div>
                <div><dt className="font-medium">Components gross</dt><dd>{formatMinor(componentTotals.gross)}</dd></div>
                <div><dt className="font-medium">Remaining gross</dt><dd>{componentBalance.gross === null ? "Not available" : formatMinor(componentBalance.gross)}</dd></div>
              </dl>
              {componentsOverAllocated ? (
                <p className="mt-3">Components exceed the request total. Reduce component amounts before saving or submitting.</p>
              ) : reconciled ? (
                <p className="mt-3">Fully allocated</p>
              ) : (
                <p className="mt-3">Net, VAT and gross component totals must match the request totals.</p>
              )}
            </div>
          </>
        )}
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

      {validationIssues.length > 0 ? (
        <div role="alert" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <div>
            <p className="font-medium">This request cannot be submitted yet:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {validationIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving draft..." disabled={!reconciled}>Save Draft</SubmitButton>
        <SubmitButton pendingLabel="Submitting request..." name="intent" value="submit" disabled={!reconciled}>
          Submit Request
        </SubmitButton>
        <Button asChild variant="outline"><Link href={request?.request_id ? `/events/${eventId}/requests/${request.request_id}` : `/events/${eventId}/requests`}>Cancel Draft</Link></Button>
      </div>
      {!request ? <p className="text-sm text-muted-foreground">Save the draft first, then add supporting documents from the request page.</p> : null}
    </form>
  );
}
