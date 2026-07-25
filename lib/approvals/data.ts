import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";
import { getSpendingRequestDetail } from "@/lib/requests/data";
import type { SpendingRequestDetail } from "@/lib/requests/data";

export type ApprovalQueueRow = Tables<"v_approval_queue">;
export type RequestImpactRow = Tables<"v_request_department_impacts">;
export type EventApprovalContext = Tables<"v_event_approval_context">;
export type RevisionHistoryRow = Tables<"v_request_revision_history">;
export type ReviewHistoryRow = Tables<"v_request_review_history">;

export type ApprovalQueueData = {
  queue: ApprovalQueueRow[];
  departments: Pick<Tables<"departments">, "id" | "name" | "code">[];
};

export type ApprovalReviewData = {
  detail: SpendingRequestDetail;
  impacts: RequestImpactRow[];
  eventContext: EventApprovalContext | null;
  revisions: RevisionHistoryRow[];
  reviews: ReviewHistoryRow[];
};

export async function getApprovalQueueData(
  supabase: SupabaseClient<Database>,
  eventId: string,
) {
  const [queue, departments] = await Promise.all([
    supabase
      .from("v_approval_queue")
      .select("*")
      .eq("event_id", eventId)
      .order("submitted_at", { ascending: true }),
    supabase
      .from("departments")
      .select("id,name,code")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ]);

  if (queue.error) return { data: null, error: "Approval queue could not be loaded." };
  if (departments.error) return { data: null, error: "Departments could not be loaded." };

  return {
    data: {
      queue: queue.data ?? [],
      departments: departments.data ?? [],
    } satisfies ApprovalQueueData,
    error: null,
  };
}

export async function getApprovalReviewData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  requestId: string,
) {
  const detail = await getSpendingRequestDetail(supabase, eventId, requestId);
  if (detail.error) return { data: null, error: detail.error };
  if (!detail.data) return { data: null, error: null };

  const revisionId = detail.data.request.revision_id;
  const [impacts, eventContext, revisions, reviews] = await Promise.all([
    revisionId
      ? supabase
          .from("v_request_department_impacts")
          .select("*")
          .eq("event_id", eventId)
          .eq("request_id", requestId)
          .eq("revision_id", revisionId)
      : { data: [], error: null },
    supabase
      .from("v_event_approval_context")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("v_request_revision_history")
      .select("*")
      .eq("event_id", eventId)
      .eq("request_id", requestId)
      .order("revision_number", { ascending: false }),
    supabase
      .from("v_request_review_history")
      .select("*")
      .eq("event_id", eventId)
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
  ]);

  if (impacts.error) return { data: null, error: "Department impact could not be loaded." };
  if (eventContext.error) return { data: null, error: "Event approval context could not be loaded." };
  if (revisions.error) return { data: null, error: "Revision history could not be loaded." };
  if (reviews.error) return { data: null, error: "Review history could not be loaded." };

  return {
    data: {
      detail: detail.data,
      impacts: impacts.data ?? [],
      eventContext: eventContext.data ?? null,
      revisions: revisions.data ?? [],
      reviews: reviews.data ?? [],
    } satisfies ApprovalReviewData,
    error: null,
  };
}
