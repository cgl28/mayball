import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";

export type LifecycleSummary = Tables<"v_event_lifecycle_summary">;
export type LifecycleHistoryRow = Tables<"event_lifecycle_history"> & {
  actor: Pick<Tables<"profiles">, "display_name" | "preferred_name"> | null;
};
export type CompletionReadinessItem =
  Database["public"]["Functions"]["event_completion_readiness"]["Returns"][number];

export type LifecycleData = {
  summary: LifecycleSummary | null;
  history: LifecycleHistoryRow[];
  readiness: CompletionReadinessItem[];
};

export async function getLifecycleData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  canViewReadiness: boolean,
) {
  const [summary, history, readiness] = await Promise.all([
    supabase
      .from("v_event_lifecycle_summary")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("event_lifecycle_history")
      .select("*,actor:profiles!event_lifecycle_history_actor_user_id_fkey(display_name,preferred_name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
    canViewReadiness
      ? supabase.rpc("event_completion_readiness", { p_event_id: eventId })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (summary.error) return { data: null, error: "Lifecycle status could not be loaded." };
  if (history.error) return { data: null, error: "Lifecycle history could not be loaded." };
  if (readiness.error) return { data: null, error: "Completion readiness could not be loaded." };

  return {
    data: {
      summary: summary.data,
      history: (history.data ?? []) as LifecycleHistoryRow[],
      readiness: readiness.data ?? [],
    } satisfies LifecycleData,
    error: null,
  };
}
