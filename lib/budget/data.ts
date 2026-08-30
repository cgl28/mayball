import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";

export type BudgetVersionSummary = Tables<"v_budget_version_summaries">;
export type ActiveBudgetSummary = Tables<"v_active_budget_summaries">;
export type ActiveDepartmentPosition = Tables<"v_active_budget_department_positions">;
export type DepartmentFinancialPosition = Tables<"v_event_department_financial_positions">;
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
  departmentFinancialPositions: DepartmentFinancialPosition[];
};

export type PreviousBudgetContext = {
  versionNumber: number;
  name: string;
  allocations: BudgetAllocation[];
};

export async function getBudgetOverview(
  supabase: SupabaseClient<Database>,
  eventId: string,
  includeTransfers = false,
) {
  const [active, positions, versions, transfers, departments, departmentFinancialPositions] = await Promise.all([
    supabase
      .from("v_active_budget_summaries")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("v_active_budget_department_positions")
      .select("*")
      .eq("event_id", eventId),
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
    supabase
      .from("v_event_department_financial_positions")
      .select("*")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true })
      .order("department_name", { ascending: true }),
  ]);

  if (active.error) return { data: null, error: "Active budget could not be loaded." };
  if (positions.error) return { data: null, error: "Department budget positions could not be loaded." };
  if (versions.error) return { data: null, error: "Budget versions could not be loaded." };
  if (transfers.error) return { data: null, error: "Budget transfers could not be loaded." };
  if (departments.error) return { data: null, error: "Departments could not be loaded." };
  if (departmentFinancialPositions.error) return { data: null, error: "Department financial positions could not be loaded." };

  // This view intentionally exposes only budget-position fields, not a department
  // display order. Reapply the system-managed order from the departments query.
  const displayOrderByDepartmentId = new Map(
    (departments.data ?? []).map((department) => [department.id, department.display_order]),
  );
  const departmentPositions = [...(positions.data ?? [])].sort((left, right) => {
    const leftOrder = displayOrderByDepartmentId.get(left.department_id ?? "") ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = displayOrderByDepartmentId.get(right.department_id ?? "") ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || (left.department_name ?? "").localeCompare(right.department_name ?? "");
  });

  return {
    data: {
      activeBudget: active.data,
      departmentPositions,
      versions: versions.data ?? [],
      transfers: transfers.data,
      departments: departments.data ?? [],
      departmentFinancialPositions: departmentFinancialPositions.data ?? [],
    } satisfies BudgetOverview,
    error: null,
  };
}

export async function getPreviousBudgetContext(
  supabase: SupabaseClient<Database>,
  eventId: string,
  beforeVersionNumber?: number,
) {
  let query = supabase
    .from("budget_versions")
    .select("id,version_number,name")
    .eq("event_id", eventId)
    .order("version_number", { ascending: false })
    .limit(1);
  if (beforeVersionNumber !== undefined) query = query.lt("version_number", beforeVersionNumber);

  const { data: version, error: versionError } = await query.maybeSingle();
  if (versionError) return { data: null, error: "Previous budget could not be loaded." };
  if (!version) return { data: null, error: null };

  const { data: allocations, error: allocationsError } = await supabase
    .from("department_budget_allocations")
    .select("id,event_id,budget_version_id,department_id,original_net_minor,original_gross_minor")
    .eq("budget_version_id", version.id);
  if (allocationsError) return { data: null, error: "Previous budget allocations could not be loaded." };

  return {
    data: {
      versionNumber: version.version_number,
      name: version.name,
      allocations: allocations ?? [],
    } satisfies PreviousBudgetContext,
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
