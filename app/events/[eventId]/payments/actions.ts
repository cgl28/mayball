"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import type { Enums } from "@/src/types/database.generated";
import { parseMoneyToMinor } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { traceAsync } from "@/lib/perf/trace";

type PaymentMethod = Enums<"payment_method">;

const paymentMethods: PaymentMethod[] = ["bank_transfer", "card", "cash", "direct_debit", "other"];

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: FormDataEntryValue | null) {
  const text = clean(value);
  return text || undefined;
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

function safeMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (/authorised|payment|allocation|component|approved|gross|VAT|net|payee|date|duplicate|reconcile|amount|required|below/i.test(error.message)) {
      return error.message;
    }
  }
  return "Payment action could not be completed.";
}

async function rpcClient(returnTo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  return supabase;
}

function allocationRows(formData: FormData) {
  const componentIds = formData.getAll("componentId").map(String);
  return componentIds.flatMap((componentId) => {
    const selected = clean(formData.get(`selected_${componentId}`)) === "on";
    const grossText = clean(formData.get(`gross_${componentId}`));
    if (!selected && !grossText) return [];
    if (!selected) throw new Error("Select each component that has an allocation amount.");
    const gross = parseMoneyToMinor(grossText);
    if (gross <= 0) throw new Error("Allocation amounts must be greater than zero.");
    return [{ component_id: componentId, gross_minor: gross }];
  });
}

export async function recordPaymentAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const requestId = optional(formData.get("requestId"));
  const contextComponentId = optional(formData.get("contextComponentId"));
  const contextQuery = contextComponentId ? `?componentId=${encodeURIComponent(contextComponentId)}` : "";
  const returnPath = requestId
    ? `/events/${eventId}/requests/${requestId}/payments/new${contextQuery}`
    : `/events/${eventId}/payments/new${contextQuery}`;
  const supabase = await rpcClient(returnPath);

  try {
    const method = clean(formData.get("method")) as PaymentMethod;
    if (!paymentMethods.includes(method)) throw new Error("Choose a valid payment method.");
    const allocations = allocationRows(formData);
    const gross = parseMoneyToMinor(clean(formData.get("gross")));
    const allocationTotal = allocations.reduce((total, item) => total + item.gross_minor, 0);
    if (allocations.length === 0) throw new Error("Choose at least one approved component to pay.");
    if (allocationTotal !== gross) throw new Error("Allocation totals must equal the payment gross amount.");

    const componentIds = allocations.map((allocation) => allocation.component_id);
    const { data: selectedComponents, error: selectedError } = await supabase
      .from("v_request_component_payment_positions")
      .select("request_component_id,request_kind,claimant_display_name,claimant_preferred_name")
      .eq("event_id", eventId)
      .in("request_component_id", componentIds);
    if (selectedError || selectedComponents?.length !== componentIds.length) throw new Error("Selected payment components are no longer available.");
    const reimbursement = selectedComponents?.length === 1 && selectedComponents[0].request_kind === "member_reimbursement"
      ? selectedComponents[0]
      : null;
    const payee = reimbursement
      ? reimbursement.claimant_preferred_name ?? reimbursement.claimant_display_name ?? "Committee member"
      : clean(formData.get("payee"));

    const { data, error } = await traceAsync({ route: `/events/${eventId}/payments`, name: "payment.record" }, () => supabase.rpc("record_component_payment", {
      p_event_id: eventId,
      p_payment_date: clean(formData.get("paymentDate")),
      p_payee: payee,
      p_gross_minor: gross,
      p_bank_reference: clean(formData.get("bankReference")),
      p_method: method,
      p_note: clean(formData.get("note")),
      p_allocations: allocations,
      p_idempotency_key: clean(formData.get("idempotencyKey")) || randomUUID(),
    }));
    if (error) throw error;

    // The redirect below reloads the payment detail from uncached Supabase data.
    // Avoid revalidatePath in a Server Action: it clears the whole client router cache.
    redirect(`/events/${eventId}/payments/${data}?recorded=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function reversePaymentAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const paymentId = clean(formData.get("paymentId"));
  const returnPath = `/events/${eventId}/payments/${paymentId}`;
  const supabase = await rpcClient(returnPath);

  try {
    const reason = clean(formData.get("reason"));
    if (!reason) throw new Error("A reversal reason is required.");
    const { error } = await traceAsync({ route: `/events/${eventId}/payments`, name: "payment.reverse" }, () => supabase.rpc("reverse_payment", {
      p_payment_id: paymentId,
      p_reason: reason,
    }));
    if (error) throw error;
    redirect(`${returnPath}?reversed=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}
