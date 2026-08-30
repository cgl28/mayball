"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildDraftPayload, buildReimbursementPayload, clean } from "@/lib/requests/form";
import { createClient } from "@/lib/supabase/server";

function safeMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (/request|draft|department|allocation|component|VAT|gross|net|authorised|editable|negative|required|reconcile|describe|choose|receipt|reimbursement|expense/i.test(error.message)) {
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

export async function saveSpendingRequestDraftAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const requestId = clean(formData.get("requestId"));
  const intent = clean(formData.get("intent"));
  const returnPath = requestId
    ? `/events/${eventId}/requests/${requestId}/edit`
    : `/events/${eventId}/requests/new`;
  const supabase = await rpcClient(returnPath);

  try {
    const payload = buildDraftPayload(formData);

    if (requestId) {
      const { error } = await supabase.rpc("update_spending_request_draft", {
        p_request_id: requestId,
        ...payload,
      });
      if (error) throw error;
      if (intent === "submit") {
        const { error: submitError } = await supabase.rpc("submit_spending_request", {
          p_request_id: requestId,
        });
        if (submitError) throw submitError;
        revalidatePath(`/events/${eventId}/requests`);
        redirect(`/events/${eventId}/requests/${requestId}?submitted=1`);
      }
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
    if (intent === "submit") {
      const { error: submitError } = await supabase.rpc("submit_spending_request", {
        p_request_id: created.request_id,
      });
      if (submitError) throw submitError;
      revalidatePath(`/events/${eventId}/requests`);
      redirect(`/events/${eventId}/requests/${created.request_id}?submitted=1`);
    }
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

export async function saveReimbursementDraftAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const requestId = clean(formData.get("requestId"));
  const intent = clean(formData.get("intent"));
  const returnPath = requestId
    ? `/events/${eventId}/requests/${requestId}/edit`
    : `/events/${eventId}/requests/reimbursement/new`;
  const supabase = await rpcClient(returnPath);

  try {
    const payload = buildReimbursementPayload(formData);
    if (requestId) {
      const { error } = await supabase.rpc("update_member_reimbursement_draft", { p_request_id: requestId, ...payload });
      if (error) throw error;
      if (intent === "submit") {
        const { error: submitError } = await supabase.rpc("submit_spending_request", { p_request_id: requestId });
        if (submitError) throw submitError;
        revalidatePath(`/events/${eventId}/requests`);
        redirect(`/events/${eventId}/requests/${requestId}?submitted=1`);
      }
      revalidatePath(`/events/${eventId}/requests`);
      redirect(`/events/${eventId}/requests/${requestId}?saved=1`);
    }

    const { data, error } = await supabase.rpc("create_member_reimbursement_draft", { p_event_id: eventId, ...payload });
    if (error) throw error;
    const created = data?.[0];
    if (!created) throw new Error("Reimbursement draft could not be created.");
    revalidatePath(`/events/${eventId}/requests`);
    redirect(`/events/${eventId}/requests/${created.request_id}?created=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}
