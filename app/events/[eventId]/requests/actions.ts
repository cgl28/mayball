"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Enums } from "@/src/types/database.generated";
import { parseMoneyToMinor } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

type VatTreatment = Enums<"vat_treatment">;

function clean(value: FormDataEntryValue | null) {
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

function safeMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (/request|draft|department|allocation|component|VAT|gross|net|authorised|editable|negative|required|reconcile/i.test(error.message)) {
      return error.message;
    }
  }
  return "Spending request action could not be completed.";
}

function isFrameworkRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function rpcClient(returnTo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  return supabase;
}

function allocationPayload(formData: FormData) {
  return formData
    .getAll("departmentId")
    .map(String)
    .map((departmentId) => ({
      department_id: departmentId,
      net_minor: optionalMoney(formData.get(`allocationNet_${departmentId}`)),
      vat_minor: optionalMoney(formData.get(`allocationVat_${departmentId}`)),
      gross_minor: optionalMoney(formData.get(`allocationGross_${departmentId}`)),
    }))
    .filter((allocation) => allocation.net_minor + allocation.vat_minor + allocation.gross_minor > 0);
}

function componentPayload(formData: FormData) {
  return [1, 2, 3]
    .map((sequence) => ({
      sequence_number: sequence,
      description: clean(formData.get(`componentDescription_${sequence}`)),
      expected_payment_date: optional(formData.get(`componentDate_${sequence}`)),
      supplier_name: optional(formData.get(`componentSupplier_${sequence}`)),
      net_minor: optionalMoney(formData.get(`componentNet_${sequence}`)),
      vat_minor: optionalMoney(formData.get(`componentVat_${sequence}`)),
      gross_minor: optionalMoney(formData.get(`componentGross_${sequence}`)),
      vat_rate: optionalRate(formData.get(`componentVatRate_${sequence}`)),
      vat_treatment: (clean(formData.get(`componentVatTreatment_${sequence}`)) || "unknown") as VatTreatment,
    }))
    .filter(
      (component) =>
        component.description ||
        component.net_minor + component.vat_minor + component.gross_minor > 0,
    );
}

export async function saveSpendingRequestDraftAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const requestId = clean(formData.get("requestId"));
  const returnPath = requestId
    ? `/events/${eventId}/requests/${requestId}/edit`
    : `/events/${eventId}/requests/new`;
  const supabase = await rpcClient(returnPath);

  try {
    const payload = {
      p_primary_department_id: clean(formData.get("primaryDepartmentId")),
      p_title: clean(formData.get("title")),
      p_description: optional(formData.get("description")),
      p_business_justification: optional(formData.get("businessJustification")),
      p_supplier_name: optional(formData.get("supplierName")),
      p_expected_payment_date: optional(formData.get("expectedPaymentDate")),
      p_net_minor: parseMoneyToMinor(clean(formData.get("net"))),
      p_vat_minor: parseMoneyToMinor(clean(formData.get("vat"))),
      p_gross_minor: parseMoneyToMinor(clean(formData.get("gross"))),
      p_vat_rate: optionalRate(formData.get("vatRate")),
      p_vat_treatment: clean(formData.get("vatTreatment")) as VatTreatment,
      p_vat_recoverable: clean(formData.get("vatRecoverable")) === "on",
      p_allocations: allocationPayload(formData),
      p_components: componentPayload(formData),
      p_change_summary: optional(formData.get("changeSummary")),
    };

    if (requestId) {
      const { error } = await supabase.rpc("update_spending_request_draft", {
        p_request_id: requestId,
        ...payload,
      });
      if (error) throw error;
      revalidatePath(`/events/${eventId}/requests`);
      redirect(`/events/${eventId}/requests/${requestId}?saved=1`);
    }

    const { p_change_summary: changeSummary, ...createPayload } = payload;
    void changeSummary;
    const { data, error } = await supabase.rpc("create_spending_request_draft", {
      p_event_id: eventId,
      ...createPayload,
    });
    if (error) throw error;
    const created = data?.[0];
    if (!created) throw new Error("Request could not be created.");
    revalidatePath(`/events/${eventId}/requests`);
    redirect(`/events/${eventId}/requests/${created.request_id}?created=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function submitSpendingRequestAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const requestId = clean(formData.get("requestId"));
  const supabase = await rpcClient(`/events/${eventId}/requests/${requestId}/review`);

  try {
    const { error } = await supabase.rpc("submit_spending_request", {
      p_request_id: requestId,
    });
    if (error) throw error;
    revalidatePath(`/events/${eventId}/requests`);
    redirect(`/events/${eventId}/requests/${requestId}?submitted=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`/events/${eventId}/requests/${requestId}/review?error=${encodeURIComponent(safeMessage(error))}`);
  }
}
