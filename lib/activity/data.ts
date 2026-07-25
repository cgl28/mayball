import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";

export type ActivityFeedRow = Tables<"v_event_activity_feed">;

export async function getActivityFeed(
  supabase: SupabaseClient<Database>,
  eventId: string,
  options: {
    category?: string;
    action?: string;
    actorUserId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const pageSize = Math.min(Math.max(options.pageSize ?? 30, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("v_event_activity_feed")
    .select("*", { count: "exact" })
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .order("activity_id", { ascending: false })
    .range(from, to);

  if (options.category && options.category !== "all") query = query.eq("category", options.category);
  if (options.action) query = query.ilike("action", `%${options.action}%`);
  if (options.actorUserId) query = query.eq("actor_user_id", options.actorUserId);
  if (options.fromDate) query = query.gte("created_at", `${options.fromDate}T00:00:00.000Z`);
  if (options.toDate) query = query.lte("created_at", `${options.toDate}T23:59:59.999Z`);

  const { data, error, count } = await query;
  if (error) return { data: null, error: "Activity could not be loaded." };

  return {
    data: {
      rows: data ?? [],
      count: count ?? 0,
      page,
      pageSize,
    },
    error: null,
  };
}
