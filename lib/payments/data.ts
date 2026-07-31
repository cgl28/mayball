import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";

const PAYMENT_RECORD_STATUSES = ["recorded", "reversed"] as const;

export type PaymentDetail = Tables<"v_payment_details">;
export type PaymentAllocationDetail = Tables<"v_payment_allocation_details">;
export type RequestPaymentPosition = Tables<"v_request_payment_positions">;
export type ComponentPaymentPosition = Tables<"v_request_component_payment_positions">;
export type EventPaymentSummary = Tables<"v_event_payment_summaries">;
export type PaymentListRow = Pick<
  PaymentDetail,
  | "payment_id"
  | "event_id"
  | "code"
  | "payment_date"
  | "gross_minor"
  | "payee"
  | "status"
  | "request_codes"
  | "created_at"
>;
export type PaymentRequestPositionRow = Pick<
  RequestPaymentPosition,
  | "request_id"
  | "code"
  | "approved_gross_minor"
  | "paid_gross_minor"
  | "outstanding_gross_minor"
  | "payment_status"
>;

export type PaymentsData = {
  payments: PaymentListRow[];
  requestPositions: PaymentRequestPositionRow[];
  componentPositions?: ComponentPaymentPosition[];
  summary: EventPaymentSummary | null;
  payableComponentCount?: number;
  page?: number;
  pageSize?: number;
  count?: number;
  requestPage?: number;
  requestPageSize?: number;
  requestCount?: number;
};

export type PaymentDetailData = {
  payment: PaymentDetail;
  allocations: PaymentAllocationDetail[];
};

export type PaymentFormData = {
  requestPositions: RequestPaymentPosition[];
  componentPositions: ComponentPaymentPosition[];
};

export async function getPaymentsData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  options: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    requestPage?: number;
    requestPageSize?: number;
  } = {},
) {
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const requestPageSize = Math.min(Math.max(options.requestPageSize ?? 25, 1), 100);
  const requestPage = Math.max(options.requestPage ?? 1, 1);
  const requestFrom = (requestPage - 1) * requestPageSize;
  const requestTo = requestFrom + requestPageSize - 1;
  const search = normaliseSearch(options.search);

  let paymentsQuery = supabase
    .from("v_payment_details")
    .select("payment_id,event_id,code,payment_date,gross_minor,payee,status,request_codes,created_at", { count: "exact" })
    .eq("event_id", eventId);

  const status = normalisePaymentStatus(options.status);
  if (status) {
    paymentsQuery = paymentsQuery.eq("status", status);
  }
  if (search) {
    paymentsQuery = paymentsQuery.or(
      `code.ilike.%${search}%,payee.ilike.%${search}%,bank_reference.ilike.%${search}%`,
    );
  }

  const [payments, requestPositions, payableComponents, summary] = await Promise.all([
    paymentsQuery
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("v_request_payment_positions")
      .select("request_id,code,approved_gross_minor,paid_gross_minor,outstanding_gross_minor,payment_status", { count: "exact" })
      .eq("event_id", eventId)
      .neq("payment_status", "not_applicable")
      .order("code", { ascending: true })
      .range(requestFrom, requestTo),
    supabase
      .from("v_request_component_payment_positions")
      .select("request_component_id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .gt("outstanding_gross_minor", 0),
    supabase
      .from("v_event_payment_summaries")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle(),
  ]);

  if (payments.error) return { data: null, error: "Payments could not be loaded." };
  if (requestPositions.error) return { data: null, error: "Request payment positions could not be loaded." };
  if (payableComponents.error) return { data: null, error: "Payable component count could not be loaded." };
  if (summary.error) return { data: null, error: "Payment summary could not be loaded." };

  return {
    data: {
      payments: payments.data ?? [],
      requestPositions: requestPositions.data ?? [],
      summary: summary.data ?? null,
      payableComponentCount: payableComponents.count ?? 0,
      page,
      pageSize,
      count: payments.count ?? 0,
      requestPage,
      requestPageSize,
      requestCount: requestPositions.count ?? 0,
    } satisfies PaymentsData,
    error: null,
  };
}

function normalisePaymentStatus(value?: string) {
  return PAYMENT_RECORD_STATUSES.find((status) => status === value);
}

function normaliseSearch(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replaceAll("%", "\\%").replaceAll("_", "\\_").replace(/[(),]/g, " ").slice(0, 80);
}

export async function getPaymentDetailData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  paymentId: string,
) {
  const [payment, allocations] = await Promise.all([
    supabase
      .from("v_payment_details")
      .select("*")
      .eq("event_id", eventId)
      .eq("payment_id", paymentId)
      .maybeSingle(),
    supabase
      .from("v_payment_allocation_details")
      .select("*")
      .eq("event_id", eventId)
      .eq("payment_id", paymentId)
      .order("request_code", { ascending: true })
      .order("component_code", { ascending: true }),
  ]);

  if (payment.error) return { data: null, error: "Payment could not be loaded." };
  if (allocations.error) return { data: null, error: "Payment allocations could not be loaded." };
  if (!payment.data) return { data: null, error: null };

  return {
    data: {
      payment: payment.data,
      allocations: allocations.data ?? [],
    } satisfies PaymentDetailData,
    error: null,
  };
}

export async function getPaymentFormData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  requestId?: string,
) {
  const [requestPositions, componentPositions] = await Promise.all([
    supabase
      .from("v_request_payment_positions")
      .select("*")
      .eq("event_id", eventId)
      .neq("payment_status", "not_applicable")
      .order("code", { ascending: true }),
    supabase
      .from("v_request_component_payment_positions")
      .select("*")
      .eq("event_id", eventId)
      .gt("outstanding_gross_minor", 0)
      .order("request_code", { ascending: true })
      .order("component_code", { ascending: true }),
  ]);

  if (requestPositions.error) return { data: null, error: "Approved requests could not be loaded." };
  if (componentPositions.error) return { data: null, error: "Payable components could not be loaded." };

  const allComponents = componentPositions.data ?? [];
  return {
    data: {
      requestPositions: requestPositions.data ?? [],
      componentPositions: requestId
        ? allComponents.filter((component) => component.request_id === requestId)
        : allComponents,
    } satisfies PaymentFormData,
    error: null,
  };
}

export async function getRequestPaymentData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  requestId: string,
) {
  const [position, components, allocations] = await Promise.all([
    supabase
      .from("v_request_payment_positions")
      .select("*")
      .eq("event_id", eventId)
      .eq("request_id", requestId)
      .maybeSingle(),
    supabase
      .from("v_request_component_payment_positions")
      .select("*")
      .eq("event_id", eventId)
      .eq("request_id", requestId)
      .order("component_code", { ascending: true }),
    supabase
      .from("v_payment_allocation_details")
      .select("*")
      .eq("event_id", eventId)
      .eq("request_id", requestId)
      .order("payment_date", { ascending: false }),
  ]);

  if (position.error) return { data: null, error: "Request payment position could not be loaded." };
  if (components.error) return { data: null, error: "Request components could not be loaded." };
  if (allocations.error) return { data: null, error: "Request payment history could not be loaded." };
  if (!position.data) return { data: null, error: null };

  return {
    data: {
      position: position.data,
      components: components.data ?? [],
      allocations: allocations.data ?? [],
    },
    error: null,
  };
}
