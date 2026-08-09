import type { Enums } from "@/src/types/database.generated";
import { parseMoneyToMinor } from "@/lib/money";

export type VatTreatment = Enums<"vat_treatment">;

export type DraftPayload = {
  p_primary_department_id: string;
  p_title: string;
  p_description: string;
  p_business_justification?: string;
  p_supplier_name?: string;
  p_expected_payment_date?: string;
  p_net_minor: number;
  p_vat_minor: number;
  p_gross_minor: number;
  p_vat_rate?: number;
  p_vat_treatment: VatTreatment;
  p_vat_recoverable: boolean;
  p_allocations: Array<{
    department_id: string;
    net_minor: number;
    vat_minor: number;
    gross_minor: number;
  }>;
  p_components: Array<{
    sequence_number: number;
    description: string;
    expected_payment_date?: string;
    supplier_name?: string;
    net_minor: number;
    vat_minor: number;
    gross_minor: number;
    vat_rate?: number;
    vat_treatment: VatTreatment;
  }>;
  p_change_summary?: string;
};

export function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: FormDataEntryValue | null) {
  const text = clean(value);
  return text || undefined;
}

function optionalMoney(value: FormDataEntryValue | null) {
  const text = clean(value);
  return text ? parseMoneyToMinor(text) : 0;
}

function optionalRate(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error("VAT rate must be a percentage with no more than two decimal places.");
  }
  const parsed = Number(text);
  if (parsed < 0 || parsed > 100) throw new Error("VAT rate must be between 0 and 100.");
  return parsed;
}

function requireText(value: FormDataEntryValue | null, message: string) {
  const text = clean(value);
  if (!text) throw new Error(message);
  return text;
}

export function buildSingleDepartmentAllocation(formData: FormData) {
  const departmentId = requireText(formData.get("primaryDepartmentId"), "Choose the department responsible for this request.");
  return [
    {
      department_id: departmentId,
      net_minor: parseMoneyToMinor(clean(formData.get("net"))),
      vat_minor: parseMoneyToMinor(clean(formData.get("vat"))),
      gross_minor: parseMoneyToMinor(clean(formData.get("gross"))),
    },
  ];
}

export function buildComponentPayload(formData: FormData) {
  const sequences = formData
    .getAll("componentSequence")
    .map((value) => Number(String(value)))
    .filter((value) => Number.isInteger(value) && value > 0);

  const uniqueSequences = [...new Set(sequences)].sort((a, b) => a - b);
  if (uniqueSequences.length === 0) {
    throw new Error("At least one payment component is required.");
  }

  return uniqueSequences.map((sequence, index) => {
    const description = clean(formData.get(`componentDescription_${sequence}`)) || (index === 0 ? "Full payment" : "");
    if (!description) {
      throw new Error(`Component ${index + 1} needs a description.`);
    }

    return {
      sequence_number: index + 1,
      description,
      expected_payment_date: optional(formData.get(`componentDate_${sequence}`)),
      supplier_name: optional(formData.get(`componentSupplier_${sequence}`)),
      net_minor: optionalMoney(formData.get(`componentNet_${sequence}`)),
      vat_minor: optionalMoney(formData.get(`componentVat_${sequence}`)),
      gross_minor: optionalMoney(formData.get(`componentGross_${sequence}`)),
      vat_rate: optionalRate(formData.get(`componentVatRate_${sequence}`)),
      vat_treatment: (clean(formData.get(`componentVatTreatment_${sequence}`)) || clean(formData.get("vatTreatment")) || "unknown") as VatTreatment,
    };
  });
}

function assertComponentsReconcile(payload: DraftPayload) {
  for (const [index, component] of payload.p_components.entries()) {
    if (component.net_minor + component.vat_minor !== component.gross_minor) {
      throw new Error(`Component ${index + 1} net and VAT must equal gross.`);
    }
  }

  const componentTotals = payload.p_components.reduce(
    (totals, component) => ({
      net: totals.net + component.net_minor,
      vat: totals.vat + component.vat_minor,
      gross: totals.gross + component.gross_minor,
    }),
    { net: 0, vat: 0, gross: 0 },
  );

  if (
    componentTotals.net !== payload.p_net_minor ||
    componentTotals.vat !== payload.p_vat_minor ||
    componentTotals.gross !== payload.p_gross_minor
  ) {
    throw new Error("Payment components must reconcile with the request net, VAT and gross amounts.");
  }
}

function earliestComponentDate(components: DraftPayload["p_components"]) {
  return components
    .map((component) => component.expected_payment_date)
    .filter((date): date is string => Boolean(date))
    .sort()[0];
}

export function buildDraftPayload(formData: FormData): DraftPayload {
  const title = requireText(formData.get("title"), "Request title is required.");
  const description = requireText(formData.get("description"), "Describe what this spending request is for.");
  const netMinor = parseMoneyToMinor(clean(formData.get("net")));
  const vatMinor = parseMoneyToMinor(clean(formData.get("vat")));
  const grossMinor = parseMoneyToMinor(clean(formData.get("gross")));
  if (netMinor + vatMinor !== grossMinor) {
    throw new Error("Request net and VAT must equal gross.");
  }

  const components = buildComponentPayload(formData);
  const payload = {
    p_primary_department_id: requireText(formData.get("primaryDepartmentId"), "Choose the department responsible for this request."),
    p_title: title,
    p_description: description,
    p_business_justification: optional(formData.get("businessJustification")),
    p_supplier_name: optional(formData.get("supplierName")),
    p_expected_payment_date: earliestComponentDate(components),
    p_net_minor: netMinor,
    p_vat_minor: vatMinor,
    p_gross_minor: grossMinor,
    p_vat_rate: optionalRate(formData.get("vatRate")),
    p_vat_treatment: requireText(formData.get("vatTreatment"), "Choose a VAT treatment.") as VatTreatment,
    p_vat_recoverable: clean(formData.get("vatRecoverable")) === "on",
    p_allocations: buildSingleDepartmentAllocation(formData),
    p_components: components,
    p_change_summary: optional(formData.get("changeSummary")),
  };

  assertComponentsReconcile(payload);
  return payload;
}
