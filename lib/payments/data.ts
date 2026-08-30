import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/src/types/database.generated";
import type { VisibleDocument } from "@/lib/documents/data";

const PAYMENT_RECORD_STATUSES = ["recorded", "reversed"] as const;
const WORKLOAD_VIEWS = ["outstanding", "overdue", "due_soon", "unpaid", "partially_paid", "paid", "all"] as const;
const DUE_SOON_DAYS = 14;

export type PaymentDetail = Tables<"v_payment_details">;
export type PaymentAllocationDetail = Tables<"v_payment_allocation_details">;
export type RequestPaymentPosition = Tables<"v_request_payment_positions">;
export type ComponentPaymentPosition = Tables<"v_request_component_payment_positions">;
export type EventPaymentSummary = Tables<"v_event_payment_summaries">;
export type PaymentWorkloadView = (typeof WORKLOAD_VIEWS)[number];
export type PaymentUrgency = "overdue" | "due_soon" | "future" | "no_due_date" | "paid";
export type PaymentListRow = Pick<
  PaymentDetail,
  | "payment_id"
  | "event_id"
  | "code"
  | "payment_date"
  | "gross_minor"
  | "payee"
  | "method"
  | "bank_reference"
  | "status"
  | "allocation_count"
  | "allocated_gross_minor"
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
export type PaymentWorkloadRow = Pick<
  ComponentPaymentPosition,
  | "event_id"
  | "request_id"
  | "request_code"
  | "revision_id"
  | "revision_number"
  | "request_component_id"
  | "component_code"
  | "description"
  | "expected_payment_date"
  | "supplier_name"
  | "approved_net_minor"
  | "approved_vat_minor"
  | "approved_gross_minor"
  | "paid_gross_minor"
  | "outstanding_gross_minor"
  | "payment_status"
> & {
  effective_due_date: string | null;
  due_date_source: "component" | "event" | "none";
  urgency: PaymentUrgency;
};

export type PaymentOperationalSummary = {
  approvedGrossMinor: number;
  paidGrossMinor: number;
  outstandingGrossMinor: number;
  futureOutstandingGrossMinor: number;
  overdueGrossMinor: number;
  dueSoonGrossMinor: number;
  noDueDateCount: number;
  approvedComponentCount: number;
};

export type PaymentsData = {
  payments: PaymentListRow[];
  requestPositions: PaymentRequestPositionRow[];
  workload: PaymentWorkloadRow[];
  componentPositions?: ComponentPaymentPosition[];
  summary: EventPaymentSummary | null;
  operationalSummary: PaymentOperationalSummary;
  payableComponentCount?: number;
  page?: number;
  pageSize?: number;
  count?: number;
  workloadView?: PaymentWorkloadView;
  workloadPage?: number;
  workloadPageSize?: number;
  workloadCount?: number;
};

export type PaymentDetailData = {
  payment: PaymentDetail;
  allocations: PaymentAllocationDetail[];
};

export type PaymentFormData = {
  requestPositions: RequestPaymentPosition[];
  componentPositions: ComponentPaymentPosition[];
  selectedComponentId?: string;
  eventDate?: string | null;
  requestDocuments?: VisibleDocument[];
};

export async function getPaymentsData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  options: {
    status?: string;
    search?: string;
    workloadView?: string;
    page?: number;
    pageSize?: number;
    workloadPage?: number;
    workloadPageSize?: number;
    eventDate?: string | null;
  } = {},
) {
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const workloadPageSize = Math.min(Math.max(options.workloadPageSize ?? 25, 1), 100);
  const workloadPage = Math.max(options.workloadPage ?? 1, 1);
  const workloadFrom = (workloadPage - 1) * workloadPageSize;
  const workloadTo = workloadFrom + workloadPageSize - 1;
  const search = normaliseSearch(options.search);
  const workloadView = normaliseWorkloadView(options.workloadView);
  const today = todayIso();
  const dueSoonEnd = addDaysIso(today, DUE_SOON_DAYS);
  const eventDate = options.eventDate ?? null;

  let paymentsQuery = supabase
    .from("v_payment_details")
    .select("payment_id,event_id,code,payment_date,gross_minor,payee,method,bank_reference,status,allocation_count,allocated_gross_minor,request_codes,created_at", { count: "exact" })
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

  let workloadQuery = supabase
    .from("v_request_component_payment_positions")
    .select("event_id,request_id,request_code,revision_id,revision_number,request_component_id,component_code,description,expected_payment_date,supplier_name,approved_net_minor,approved_vat_minor,approved_gross_minor,paid_gross_minor,outstanding_gross_minor,payment_status", { count: "exact" })
    .eq("event_id", eventId);

  if (search) {
    workloadQuery = workloadQuery.or(
      `request_code.ilike.%${search}%,component_code.ilike.%${search}%,description.ilike.%${search}%,supplier_name.ilike.%${search}%`,
    );
  }
  const [payments, workload, summaryComponents, summary] = await Promise.all([
    paymentsQuery
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to),
    workloadQuery
      .order("expected_payment_date", { ascending: true, nullsFirst: false })
      .order("request_code", { ascending: true })
      .order("component_code", { ascending: true }),
    supabase
      .from("v_request_component_payment_positions")
      .select("approved_gross_minor,paid_gross_minor,outstanding_gross_minor,expected_payment_date,payment_status")
      .eq("event_id", eventId),
    supabase
      .from("v_event_payment_summaries")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle(),
  ]);

  if (payments.error) return { data: null, error: "Payments could not be loaded." };
  if (workload.error) return { data: null, error: "Payment workload could not be loaded." };
  if (summaryComponents.error) return { data: null, error: "Payment workload summary could not be loaded." };
  if (summary.error) return { data: null, error: "Payment summary could not be loaded." };

  const allSummaryComponents = summaryComponents.data ?? [];
  const operationalSummary = summariseWorkload(allSummaryComponents, today, dueSoonEnd, eventDate);
  const filteredWorkload = sortWorkload(
    (workload.data ?? []).map((component) => {
      const effective = resolveEffectiveDueDate(component, eventDate);
      return {
        ...component,
        ...effective,
        urgency: classifyPaymentUrgency(component, today, dueSoonEnd, eventDate),
      };
    }).filter((component) => matchesWorkloadView(component, workloadView)),
  );

  return {
    data: {
      payments: payments.data ?? [],
      requestPositions: [],
      workload: filteredWorkload.slice(workloadFrom, workloadTo + 1),
      summary: summary.data ?? null,
      operationalSummary,
      payableComponentCount: allSummaryComponents.filter((component) => Number(component.outstanding_gross_minor ?? 0) > 0).length,
      page,
      pageSize,
      count: payments.count ?? 0,
      workloadView,
      workloadPage,
      workloadPageSize,
      workloadCount: filteredWorkload.length,
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

function normaliseWorkloadView(value?: string): PaymentWorkloadView {
  return WORKLOAD_VIEWS.find((view) => view === value) ?? "outstanding";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function matchesWorkloadView(component: PaymentWorkloadRow, view: PaymentWorkloadView) {
  const outstanding = Number(component.outstanding_gross_minor ?? 0);
  switch (view) {
    case "overdue":
      return component.urgency === "overdue";
    case "due_soon":
      return component.urgency === "due_soon";
    case "unpaid":
      return component.payment_status === "unpaid";
    case "partially_paid":
      return component.payment_status === "partially_paid";
    case "paid":
      return component.payment_status === "paid";
    case "all":
      return true;
    case "outstanding":
    default:
      return outstanding > 0;
  }
}

export function classifyPaymentUrgency(
  component: Pick<ComponentPaymentPosition, "expected_payment_date" | "outstanding_gross_minor">,
  today = todayIso(),
  dueSoonEnd = addDaysIso(today, DUE_SOON_DAYS),
  eventDate?: string | null,
): PaymentUrgency {
  if (Number(component.outstanding_gross_minor ?? 0) <= 0) return "paid";
  const dueDate = resolveEffectiveDueDate(component, eventDate).effective_due_date;
  if (!dueDate) return "no_due_date";
  if (dueDate < today) return "overdue";
  if (dueDate <= dueSoonEnd) return "due_soon";
  return "future";
}

export function summariseWorkload(
  components: Array<Pick<ComponentPaymentPosition, "approved_gross_minor" | "paid_gross_minor" | "outstanding_gross_minor" | "expected_payment_date">>,
  today = todayIso(),
  dueSoonEnd = addDaysIso(today, DUE_SOON_DAYS),
  eventDate?: string | null,
): PaymentOperationalSummary {
  return components.reduce<PaymentOperationalSummary>(
    (summary, component) => {
      const urgency = classifyPaymentUrgency(component, today, dueSoonEnd, eventDate);
      const outstanding = Number(component.outstanding_gross_minor ?? 0);
      return {
        approvedGrossMinor: summary.approvedGrossMinor + Number(component.approved_gross_minor ?? 0),
        paidGrossMinor: summary.paidGrossMinor + Number(component.paid_gross_minor ?? 0),
        outstandingGrossMinor: summary.outstandingGrossMinor + outstanding,
        futureOutstandingGrossMinor: summary.futureOutstandingGrossMinor + (urgency === "future" || urgency === "no_due_date" ? outstanding : 0),
        overdueGrossMinor: summary.overdueGrossMinor + (urgency === "overdue" ? outstanding : 0),
        dueSoonGrossMinor: summary.dueSoonGrossMinor + (urgency === "due_soon" ? outstanding : 0),
        noDueDateCount: summary.noDueDateCount + (urgency === "no_due_date" ? 1 : 0),
        approvedComponentCount: summary.approvedComponentCount + 1,
      };
    },
    {
      approvedGrossMinor: 0,
      paidGrossMinor: 0,
      outstandingGrossMinor: 0,
      futureOutstandingGrossMinor: 0,
      overdueGrossMinor: 0,
      dueSoonGrossMinor: 0,
      noDueDateCount: 0,
      approvedComponentCount: 0,
    },
  );
}

export function resolveEffectiveDueDate(
  component: Pick<ComponentPaymentPosition, "expected_payment_date">,
  eventDate?: string | null,
) {
  if (component.expected_payment_date) {
    return { effective_due_date: component.expected_payment_date, due_date_source: "component" as const };
  }
  if (eventDate) {
    return { effective_due_date: eventDate, due_date_source: "event" as const };
  }
  return { effective_due_date: null, due_date_source: "none" as const };
}

function urgencyRank(urgency: PaymentUrgency) {
  return {
    overdue: 0,
    due_soon: 1,
    future: 2,
    no_due_date: 3,
    paid: 4,
  }[urgency];
}

function sortWorkload(rows: PaymentWorkloadRow[]) {
  return [...rows].sort((a, b) => {
    const urgency = urgencyRank(a.urgency) - urgencyRank(b.urgency);
    if (urgency !== 0) return urgency;
    const aDate = a.effective_due_date ?? "9999-12-31";
    const bDate = b.effective_due_date ?? "9999-12-31";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return `${a.request_code ?? ""}${a.component_code ?? ""}`.localeCompare(`${b.request_code ?? ""}${b.component_code ?? ""}`);
  });
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
  componentId?: string,
  eventDate?: string | null,
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
  const visibleComponents = requestId
    ? allComponents.filter((component) => component.request_id === requestId)
    : allComponents;
  const selectedComponentId = visibleComponents.some((component) => component.request_component_id === componentId)
    ? componentId
    : undefined;
  const orderedComponents = selectedComponentId
    ? [
        ...visibleComponents.filter((component) => component.request_component_id === selectedComponentId),
        ...visibleComponents.filter((component) => component.request_component_id !== selectedComponentId),
      ]
    : visibleComponents;
  const requestIds = [...new Set(visibleComponents.map((component) => component.request_id).filter((id): id is string => Boolean(id)))];
  const documents = requestIds.length
    ? await supabase.from("v_visible_documents").select("*").eq("event_id", eventId).in("request_id", requestIds).order("created_at", { ascending: false })
    : { data: [] as VisibleDocument[], error: null };
  if (documents.error) return { data: null, error: "Supporting documents could not be loaded." };

  return {
    data: {
      requestPositions: requestPositions.data ?? [],
      componentPositions: orderedComponents,
      selectedComponentId,
      eventDate: eventDate ?? null,
      requestDocuments: documents.data ?? [],
    } satisfies PaymentFormData,
    error: null,
  };
}

export async function getRequestPaymentData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  requestId: string,
) {
  const [position, components, allocations, documents] = await Promise.all([
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
    supabase
      .from("v_visible_documents")
      .select("*")
      .eq("event_id", eventId)
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
  ]);

  if (position.error) return { data: null, error: "Request payment position could not be loaded." };
  if (components.error) return { data: null, error: "Request components could not be loaded." };
  if (allocations.error) return { data: null, error: "Request payment history could not be loaded." };
  if (documents.error) return { data: null, error: "Supporting documents could not be loaded." };
  if (!position.data) return { data: null, error: null };

  return {
    data: {
      position: position.data,
      components: components.data ?? [],
      allocations: allocations.data ?? [],
      documents: documents.data ?? [],
    },
    error: null,
  };
}
