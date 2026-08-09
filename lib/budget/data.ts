import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";

export type BudgetVersionSummary = Tables<"v_budget_version_summaries">;
export type ActiveBudgetSummary = Tables<"v_active_budget_summaries">;
export type ActiveDepartmentPosition = Tables<"v_active_budget_department_positions">;
export type BudgetAllocation = Pick<
  Tables<"department_budget_allocations">,
  "id" | "event_id" | "budget_version_id" | "department_id" | "original_net_minor" | "original_gross_minor"
>;
export type BudgetTransfer = Pick<
  Tables<"budget_transfers">,
  | "id"
  | "event_id"
  | "budget_version_id"
  | "from_department_id"
  | "to_department_id"
  | "amount_minor"
  | "reason"
  | "effective_at"
  | "created_by"
  | "reverses_transfer_id"
  | "created_at"
>;
export type BudgetDepartment = Pick<
  Tables<"departments">,
  "id" | "name" | "code" | "colour" | "is_active" | "display_order"
>;

export type BudgetOverview = {
  activeBudget: ActiveBudgetSummary | null;
  departmentPositions: ActiveDepartmentPosition[];
  versions: BudgetVersionSummary[];
  transfers: BudgetTransfer[] | null;
  departments: BudgetDepartment[];
};

export async function getBudgetOverview(
  supabase: SupabaseClient<Database>,
  eventId: string,
  includeTransfers = false,
) {
  const [active, positions, versions, transfers, departments] = await Promise.all([
    supabase
      .from("v_active_budget_summaries")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("v_active_budget_department_positions")
      .select("*")
      .eq("event_id", eventId)
      .order("department_code", { ascending: true }),
    supabase
      .from("v_budget_version_summaries")
      .select("*")
      .eq("event_id", eventId)
      .order("version_number", { ascending: false }),
    includeTransfers
      ? supabase
          .from("budget_transfers")
          .select("id,event_id,budget_version_id,from_department_id,to_department_id,amount_minor,reason,effective_at,created_by,reverses_transfer_id,created_at")
          .eq("event_id", eventId)
          .order("effective_at", { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("departments")
      .select("id,name,code,colour,is_active,display_order")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true }),
  ]);

  if (active.error) return { data: null, error: "Active budget could not be loaded." };
  if (positions.error) return { data: null, error: "Department budget positions could not be loaded." };
  if (versions.error) return { data: null, error: "Budget versions could not be loaded." };
  if (transfers.error) return { data: null, error: "Budget transfers could not be loaded." };
  if (departments.error) return { data: null, error: "Departments could not be loaded." };

  return {
    data: {
      activeBudget: active.data,
      departmentPositions: positions.data ?? [],
      versions: versions.data ?? [],
      transfers: transfers.data,
      departments: departments.data ?? [],
    } satisfies BudgetOverview,
    error: null,
  };
}

export async function getBudgetVersionForEdit(
  supabase: SupabaseClient<Database>,
  budgetVersionId: string,
) {
  const { data: version, error: versionError } = await supabase
    .from("budget_versions")
    .select("id,event_id,version_number,name,status,effective_date,original_contingency_minor,notes")
    .eq("id", budgetVersionId)
    .maybeSingle();

  if (versionError) return { data: null, error: "Budget version could not be loaded." };
  if (!version) return { data: null, error: null };

  const { data: allocations, error: allocationsError } = await supabase
    .from("department_budget_allocations")
    .select("id,event_id,budget_version_id,department_id,original_net_minor,original_gross_minor")
    .eq("budget_version_id", budgetVersionId);

  if (allocationsError) return { data: null, error: "Budget allocations could not be loaded." };

  return { data: { version, allocations: allocations ?? [] }, error: null };
}
