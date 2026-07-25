import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";

export type EventFinancialPosition = Tables<"v_event_financial_positions">;
export type DepartmentFinancialPosition = Tables<"v_event_department_financial_positions">;
export type DashboardWarning = Tables<"v_event_dashboard_warnings">;
export type DashboardActivity = Tables<"v_event_dashboard_activity">;
export type DashboardPendingApproval = Tables<"v_event_dashboard_pending_approvals">;

export type DashboardData = {
  position: EventFinancialPosition;
  departments: DepartmentFinancialPosition[];
  warnings: DashboardWarning[];
  activity: DashboardActivity[];
  pendingApprovals: DashboardPendingApproval[];
};

export async function getDashboardData(
  supabase: SupabaseClient<Database>,
  eventId: string,
) {
  const [position, departments, warnings, activity, pendingApprovals] = await Promise.all([
    supabase
      .from("v_event_financial_positions")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("v_event_department_financial_positions")
      .select("*")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true })
      .order("department_name", { ascending: true }),
    supabase
      .from("v_event_dashboard_warnings")
      .select("*")
      .eq("event_id", eventId),
    supabase
      .from("v_event_dashboard_activity")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("v_event_dashboard_pending_approvals")
      .select("*")
      .eq("event_id", eventId)
      .order("submitted_at", { ascending: true })
      .limit(5),
  ]);

  if (position.error) return { data: null, error: "Financial position could not be loaded." };
  if (departments.error) return { data: null, error: "Department positions could not be loaded." };
  if (warnings.error) return { data: null, error: "Dashboard warnings could not be loaded." };
  if (activity.error) return { data: null, error: "Recent activity could not be loaded." };
  if (pendingApprovals.error) return { data: null, error: "Pending approvals could not be loaded." };
  if (!position.data) return { data: null, error: null };

  return {
    data: {
      position: position.data,
      departments: departments.data ?? [],
      warnings: warnings.data ?? [],
      activity: activity.data ?? [],
      pendingApprovals: pendingApprovals.data ?? [],
    } satisfies DashboardData,
    error: null,
  };
}
