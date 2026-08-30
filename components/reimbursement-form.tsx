"use client";

import { useMemo, useState } from "react";
import { Wand2 } from "lucide-react";
import { saveReimbursementDraftAction } from "@/app/events/[eventId]/requests/actions";
import { FinancialField } from "@/components/financial-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { computeFromGrossMinor } from "@/lib/requests/component-allocation";
import type { RequestDepartment, SpendingRequestDetail } from "@/lib/requests/data";
import { minorToInput } from "@/lib/money";

const treatments = ["unknown", "standard", "reduced", "zero_rated", "exempt", "outside_scope"] as const;

function parseMinor(value: string) {
  const match = value.trim().replace(/^£/, "").replaceAll(",", "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return Number(BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0")));
}

export function ReimbursementForm({ eventId, departments, detail, defaultDepartmentId }: {
  eventId: string;
  departments: RequestDepartment[];
  detail?: SpendingRequestDetail;
  defaultDepartmentId?: string;
}) {
  const request = detail?.request;
  const [title, setTitle] = useState(request?.title ?? "");
  const [description, setDescription] = useState(request?.description ?? "");
  const [department, setDepartment] = useState(request?.primary_department_id ?? defaultDepartmentId ?? "");
  const [expenseDate, setExpenseDate] = useState(request?.expense_date ?? "");
  const [gross, setGross] = useState(minorToInput(request?.gross_minor ?? 0));
  const [net, setNet] = useState(minorToInput(request?.net_minor ?? 0));
  const [vat, setVat] = useState(minorToInput(request?.vat_minor ?? 0));
  const [vatTreatment, setVatTreatment] = useState(request?.vat_treatment ?? "unknown");
  const [vatRate, setVatRate] = useState(request?.vat_rate?.toString() ?? "");
  const [vatRecoverable, setVatRecoverable] = useState(Boolean(request?.vat_recoverable));
  const [changeSummary, setChangeSummary] = useState(detail?.currentRevisionChangeSummary ?? detail?.latestChangeRequestReview?.reason ?? "");
  const canCalculate = useMemo(() => parseMinor(gross) !== null && /^\d+(?:\.\d{1,2})?$/.test(vatRate), [gross, vatRate]);

  function calculateVat() {
    const grossMinor = parseMinor(gross);
    if (grossMinor === null) return;
    const [whole, fraction = ""] = vatRate.split(".");
    const rate = Number(BigInt(whole || "0") * BigInt(100) + BigInt(fraction.padEnd(2, "0")));
    const amount = computeFromGrossMinor(grossMinor, rate);
    setNet(minorToInput(amount.net));
    setVat(minorToInput(amount.vat));
    setGross(minorToInput(amount.gross));
  }

  return (
    <form action={saveReimbursementDraftAction} className="grid gap-6">
      <input type="hidden" name="eventId" value={eventId} />
      {request?.request_id ? <input type="hidden" name="requestId" value={request.request_id} /> : null}
      <section className="rounded-md border p-5">
        <h2 className="font-medium">Expense claim</h2>
        <p className="mt-1 text-sm text-muted-foreground">Record money you have already paid personally for the event. An expense claim form and at least one receipt are required before submission.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field name="title" label="Expense description" value={title} onChange={setTitle} required />
          <label className="grid gap-1 text-sm"><span className="font-medium">Department</span><select name="primaryDepartmentId" required value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-md border bg-background px-3 py-2"><option value="">Choose department</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <Field name="expenseDate" label="Expense date" type="date" value={expenseDate} onChange={setExpenseDate} required />
          <label className="grid gap-1 text-sm md:col-span-2"><span className="font-medium">Notes (optional)</span><textarea name="description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
          {request && (request.revision_number ?? 1) > 1 ? <label className="grid gap-1 text-sm md:col-span-2"><span className="font-medium">Change summary</span><textarea name="changeSummary" required rows={2} value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label> : null}
        </div>
      </section>
      <section className="rounded-md border p-5">
        <h2 className="font-medium">Amount paid</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter the gross amount on the receipt. VAT is optional; choose “unknown” when it is not separately recorded.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="grid gap-1 text-sm"><span className="font-medium">VAT treatment</span><select name="vatTreatment" value={vatTreatment} onChange={(event) => setVatTreatment(event.target.value as typeof treatments[number])} className="rounded-md border bg-background px-3 py-2">{treatments.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
          <Field name="vatRate" label="VAT rate (if known)" value={vatRate} onChange={setVatRate} />
          <div className="flex items-end"><Button type="button" variant="outline" disabled={!canCalculate} onClick={calculateVat}><Wand2 className="h-4 w-4" />Calculate VAT</Button></div>
          <label className="flex items-end gap-2 text-sm"><input name="vatRecoverable" type="checkbox" checked={vatRecoverable} onChange={(event) => setVatRecoverable(event.target.checked)} />VAT recoverable</label>
          <FinancialField kind="gross" name="gross" label="Amount paid (gross)" value={gross} onChange={(event) => setGross(event.target.value)} required />
          <FinancialField kind="net" name="net" label="Net amount" value={net} onChange={(event) => setNet(event.target.value)} required />
          <FinancialField kind="vat" name="vat" label="VAT amount" value={vat} onChange={(event) => setVat(event.target.value)} required />
        </div>
      </section>
      <div className="flex flex-wrap gap-2"><SubmitButton name="intent" value="save" pendingLabel="Saving claim...">Save expense claim</SubmitButton></div>
    </form>
  );
}

function Field({ name, label, type = "text", value, onChange, required = false }: { name: string; label: string; type?: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="grid gap-1 text-sm"><span className="font-medium">{label}</span><input name={name} type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>;
}
