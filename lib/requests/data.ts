import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";
import type { VisibleDocument } from "@/lib/documents/data";

export type RequestSummary = Tables<"v_spending_request_current_revisions">;
export type RequestAllocation = Pick<
  Tables<"spending_request_department_allocations">,
  "id" | "event_id" | "revision_id" | "department_id" | "net_minor" | "vat_minor" | "gross_minor"
>;
export type RequestComponent = Pick<
  Tables<"request_components">,
  | "id"
  | "event_id"
  | "revision_id"
  | "sequence_number"
  | "code"
  | "description"
  | "expected_payment_date"
  | "supplier_name"
  | "net_minor"
  | "vat_minor"
  | "gross_minor"
  | "vat_rate"
  | "vat_treatment"
>;
export type RequestDepartment = Pick<
  Tables<"departments">,
  "id" | "name" | "code" | "display_order" | "is_active"
>;
export type RequestPaymentPosition = Tables<"v_request_payment_positions">;

export type SpendingRequestsData = {
  requests: RequestSummary[];
  departments: RequestDepartment[];
  paymentPositions: RequestPaymentPosition[];
  defaultDepartmentId?: string;
};

export type SpendingRequestDetail = {
  request: RequestSummary;
  allocations: RequestAllocation[];
  components: RequestComponent[];
  departments: RequestDepartment[];
  paymentPosition?: RequestPaymentPosition | null;
  documents?: VisibleDocument[];
};

export async function getSpendingRequestsData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  userId?: string,
) {
  const [requests, departments, paymentPositions, departmentMemberships] = await Promise.all([
    supabase
      .from("v_spending_request_current_revisions")
      .select("*")
      .eq("event_id", eventId)
      .order("request_updated_at", { ascending: false }),
    supabase
      .from("departments")
      .select("id,name,code,display_order,is_active")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("v_request_payment_positions")
      .select("*")
      .eq("event_id", eventId),
    getCurrentUserDepartments(supabase, eventId, userId),
  ]);

  if (requests.error) return { data: null, error: "Spending requests could not be loaded." };
  if (departments.error) return { data: null, error: "Departments could not be loaded." };
  if (paymentPositions.error) return { data: null, error: "Payment positions could not be loaded." };
  if (departmentMemberships.error) return { data: null, error: "Department memberships could not be loaded." };

  const activeDepartmentIds = new Set((departmentMemberships.data ?? []).map((row) => row.department_id));
  const defaultDepartmentId = activeDepartmentIds.size === 1 ? [...activeDepartmentIds][0] : undefined;

  return {
    data: {
      requests: requests.data ?? [],
      departments: departments.data ?? [],
      paymentPositions: paymentPositions.data ?? [],
      defaultDepartmentId,
    } satisfies SpendingRequestsData,
    error: null,
  };
}

async function getCurrentUserDepartments(
  supabase: SupabaseClient<Database>,
  eventId: string,
  userId?: string,
) {
  if (!userId) return { data: [], error: null };

  const { data: membership, error: membershipError } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    return { data: [], error: membershipError };
  }

  return supabase
    .from("department_members")
    .select("department_id")
    .eq("event_id", eventId)
    .eq("event_member_id", membership.id);
}

export async function getSpendingRequestDetail(
  supabase: SupabaseClient<Database>,
  eventId: string,
  requestId: string,
) {
  const { data: request, error: requestError } = await supabase
    .from("v_spending_request_current_revisions")
    .select("*")
    .eq("event_id", eventId)
    .eq("request_id", requestId)
    .maybeSingle();

  if (requestError) return { data: null, error: "Spending request could not be loaded." };
  if (!request?.revision_id) return { data: null, error: null };

  const [allocations, components, departments, paymentPosition, documents] = await Promise.all([
    supabase
      .from("spending_request_department_allocations")
      .select("id,event_id,revision_id,department_id,net_minor,vat_minor,gross_minor")
      .eq("revision_id", request.revision_id),
    supabase
      .from("request_components")
      .select("id,event_id,revision_id,sequence_number,code,description,expected_payment_date,supplier_name,net_minor,vat_minor,gross_minor,vat_rate,vat_treatment")
      .eq("revision_id", request.revision_id)
      .order("sequence_number", { ascending: true }),
    supabase
      .from("departments")
      .select("id,name,code,display_order,is_active")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("v_request_payment_positions")
      .select("*")
      .eq("event_id", eventId)
      .eq("request_id", requestId)
      .maybeSingle(),
    supabase
      .from("v_visible_documents")
      .select("*")
      .eq("event_id", eventId)
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
  ]);

  if (allocations.error) return { data: null, error: "Department allocations could not be loaded." };
  if (components.error) return { data: null, error: "Request components could not be loaded." };
  if (departments.error) return { data: null, error: "Departments could not be loaded." };
  if (paymentPosition.error) return { data: null, error: "Payment position could not be loaded." };
  if (documents.error) return { data: null, error: "Documents could not be loaded." };

  return {
    data: {
      request,
      allocations: allocations.data ?? [],
      components: components.data ?? [],
      departments: departments.data ?? [],
      paymentPosition: paymentPosition.data ?? null,
      documents: documents.data ?? [],
    } satisfies SpendingRequestDetail,
    error: null,
  };
}
