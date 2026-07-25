"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseMoneyToMinor } from "@/lib/money";

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
    if (/amount|allocation|budget|contingency|authorised|draft|department|positive|required|Insufficient/i.test(error.message)) {
      return error.message;
    }
  }
  return "Budget action could not be completed.";
}

async function rpcClient(returnTo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return supabase;
}

function allocationPayload(formData: FormData) {
  const departmentIds = formData.getAll("departmentId").map(String);

  return departmentIds.map((departmentId) => {
    const raw = clean(formData.get(`allocation_${departmentId}`));
    if (!raw) {
      throw new Error("Every listed department needs an allocation. Use 0.00 where needed.");
    }
    return {
      department_id: departmentId,
      original_net_minor: parseMoneyToMinor(raw),
    };
  });
}

export async function saveBudgetVersionAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const budgetVersionId = clean(formData.get("budgetVersionId"));
  const returnPath = budgetVersionId
    ? `/events/${eventId}/budget/versions/${budgetVersionId}/edit`
    : `/events/${eventId}/budget/new`;
  const supabase = await rpcClient(returnPath);

  try {
    const payload = {
      p_name: clean(formData.get("name")),
      p_effective_date: clean(formData.get("effectiveDate")) || undefined,
      p_notes: clean(formData.get("notes")) || undefined,
      p_original_contingency_minor: parseMoneyToMinor(
        clean(formData.get("contingency")),
      ),
      p_allocations: allocationPayload(formData),
    };

    if (budgetVersionId) {
      const { error } = await supabase.rpc("update_draft_budget_version", {
        p_budget_version_id: budgetVersionId,
        ...payload,
      });
      if (error) throw error;
      revalidatePath(`/events/${eventId}/budget`);
      redirect(`/events/${eventId}/budget/versions/${budgetVersionId}/edit?saved=1`);
    }

    const { data, error } = await supabase.rpc("create_budget_version", {
      p_event_id: eventId,
      ...payload,
    });
    if (error) throw error;
    revalidatePath(`/events/${eventId}/budget`);
    redirect(`/events/${eventId}/budget/versions/${data}/edit?created=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`${returnPath}?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function activateBudgetVersionAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const budgetVersionId = clean(formData.get("budgetVersionId"));
  const supabase = await rpcClient(`/events/${eventId}/budget`);

  try {
    const { error } = await supabase.rpc("activate_budget_version", {
      p_budget_version_id: budgetVersionId,
    });
    if (error) throw error;
    revalidatePath(`/events/${eventId}/budget`);
    redirect(`/events/${eventId}/budget?activated=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function transferContingencyAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const supabase = await rpcClient(`/events/${eventId}/budget`);

  try {
    const { error } = await supabase.rpc("transfer_event_contingency", {
      p_event_id: eventId,
      p_department_id: clean(formData.get("departmentId")),
      p_amount_minor: parseMoneyToMinor(clean(formData.get("amount"))),
      p_reason: clean(formData.get("reason")),
    });
    if (error) throw error;
    revalidatePath(`/events/${eventId}/budget`);
    redirect(`/events/${eventId}/budget?transferred=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`/events/${eventId}/budget?error=${encodeURIComponent(safeMessage(error))}`);
  }
}
