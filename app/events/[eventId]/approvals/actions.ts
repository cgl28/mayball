"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Enums } from "@/src/types/database.generated";
import { createClient } from "@/lib/supabase/server";

type Decision = Enums<"review_decision">;

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
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
    if (/authorised|awaiting|decision|reason|required|editable|variation|reconcile|stale/i.test(error.message)) {
      return error.message;
    }
  }
  return "Approval action could not be completed.";
}

async function rpcClient(returnTo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  return supabase;
}

export async function decideSpendingRequestAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const requestId = clean(formData.get("requestId"));
  const revisionId = clean(formData.get("revisionId"));
  const decision = clean(formData.get("decision")) as Decision;
  const reason = clean(formData.get("reason"));
  const returnPath = `/events/${eventId}/approvals/${requestId}`;
  const supabase = await rpcClient(returnPath);

  try {
    if ((decision === "rejected" || decision === "changes_requested") && !reason) {
      throw new Error(decision === "rejected" ? "A rejection reason is required." : "Change instructions are required.");
    }
    const { error } = await supabase.rpc("decide_spending_request", {
      p_request_id: requestId,
      p_revision_id: revisionId,
      p_decision: decision,
      p_reason: reason || undefined,
    });
    if (error) throw error;
    revalidatePath(`/events/${eventId}/approvals`);
    revalidatePath(`/events/${eventId}/requests`);
    redirect(`${returnPath}?decided=${decision}`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function startVariationAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const requestId = clean(formData.get("requestId"));
  const returnPath = `/events/${eventId}/requests/${requestId}`;
  const supabase = await rpcClient(returnPath);

  try {
    const { error } = await supabase.rpc("start_request_variation", {
      p_request_id: requestId,
    });
    if (error) throw error;
    revalidatePath(`/events/${eventId}/requests`);
    redirect(`/events/${eventId}/requests/${requestId}/edit?variation=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}
