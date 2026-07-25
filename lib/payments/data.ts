import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";

export type PaymentDetail = Tables<"v_payment_details">;
export type PaymentAllocationDetail = Tables<"v_payment_allocation_details">;
export type RequestPaymentPosition = Tables<"v_request_payment_positions">;
export type ComponentPaymentPosition = Tables<"v_request_component_payment_positions">;
export type EventPaymentSummary = Tables<"v_event_payment_summaries">;

export type PaymentsData = {
  payments: PaymentDetail[];
  requestPositions: RequestPaymentPosition[];
  componentPositions: ComponentPaymentPosition[];
  summary: EventPaymentSummary | null;
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
) {
  const [payments, requestPositions, componentPositions, summary] = await Promise.all([
    supabase
      .from("v_payment_details")
      .select("*")
      .eq("event_id", eventId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
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
      .order("request_code", { ascending: true })
      .order("component_code", { ascending: true }),
    supabase
      .from("v_event_payment_summaries")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle(),
  ]);

  if (payments.error) return { data: null, error: "Payments could not be loaded." };
  if (requestPositions.error) return { data: null, error: "Request payment positions could not be loaded." };
  if (componentPositions.error) return { data: null, error: "Component payment positions could not be loaded." };
  if (summary.error) return { data: null, error: "Payment summary could not be loaded." };

  return {
    data: {
      payments: payments.data ?? [],
      requestPositions: requestPositions.data ?? [],
      componentPositions: componentPositions.data ?? [],
      summary: summary.data ?? null,
    } satisfies PaymentsData,
    error: null,
  };
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
