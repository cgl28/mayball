"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/src/types/database.generated";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function safeMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (/authorised|blocked|acknowledge|reason|required|completed|archived|current status|lifecycle/i.test(error.message)) {
      return error.message;
    }
  }
  return "Lifecycle action could not be completed.";
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

async function lifecycleClient(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?returnTo=/events/${eventId}/settings/lifecycle`);
  }

  return supabase;
}

export async function completeEventAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const supabase = await lifecycleClient(eventId);

  try {
    const { data, error } = await supabase.rpc("complete_event", {
      p_event_id: eventId,
      p_acknowledge_warnings: formData.get("acknowledgeWarnings") === "on",
      p_reason: clean(formData.get("reason")) || undefined,
    });
    if (error) throw error;

    const completed = typeof data === "object" && data !== null && "completed" in data && data.completed === true;
    revalidatePath(`/events/${eventId}`);
    redirect(`/events/${eventId}/settings/lifecycle?${completed ? "completed=1" : "acknowledgementRequired=1"}`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`/events/${eventId}/settings/lifecycle?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function progressEventLifecycleAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const supabase = await lifecycleClient(eventId);

  try {
    const targetStatus = clean(formData.get("targetStatus")) as Enums<"event_status">;
    const { data, error } = await supabase.rpc("progress_event_lifecycle", {
      p_event_id: eventId,
      p_to_status: targetStatus,
      p_acknowledge_warnings: formData.get("acknowledgeWarnings") === "on",
      p_reason: clean(formData.get("reason")) || undefined,
    });
    if (error) throw error;

    const progressed = typeof data === "object" && data !== null && "progressed" in data && data.progressed === true;
    revalidatePath(`/events/${eventId}`);
    redirect(`/events/${eventId}/settings/lifecycle?${progressed ? "progressed=1" : "acknowledgementRequired=1"}`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`/events/${eventId}/settings/lifecycle?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function archiveEventAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const supabase = await lifecycleClient(eventId);

  try {
    const reason = clean(formData.get("reason"));
    if (!reason) throw new Error("Archive reason required.");
    const { error } = await supabase.rpc("archive_event", {
      p_event_id: eventId,
      p_reason: reason,
    });
    if (error) throw error;

    revalidatePath(`/events/${eventId}`);
    redirect(`/events/${eventId}/settings/lifecycle?archived=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`/events/${eventId}/settings/lifecycle?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function reopenEventAction(formData: FormData) {
  const eventId = clean(formData.get("eventId"));
  const supabase = await lifecycleClient(eventId);

  try {
    const reason = clean(formData.get("reason"));
    if (!reason) throw new Error("Reopen reason required.");
    const { error } = await supabase.rpc("reopen_event", {
      p_event_id: eventId,
      p_reason: reason,
    });
    if (error) throw error;

    revalidatePath(`/events/${eventId}`);
    redirect(`/events/${eventId}/settings/lifecycle?reopened=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`/events/${eventId}/settings/lifecycle?error=${encodeURIComponent(safeMessage(error))}`);
  }
}
