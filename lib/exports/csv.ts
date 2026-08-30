import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.generated";

type CsvValue = string | number | boolean | null | undefined;

export type CsvColumn<T extends Record<string, unknown>> = {
  key: keyof T | string;
  header: string;
  kind?: "text" | "number" | "money_minor" | "date";
  value?: (row: T) => CsvValue;
};

export type ExportDefinition = {
  slug: string;
  title: string;
  description: string;
  filenamePart: string;
  permission: "event_visible" | "financial_rls";
};

export const exportDefinitions: ExportDefinition[] = [
  { slug: "department-budget-positions", title: "Department budget positions", description: "Active department budget, contingency and spending positions from the dashboard view.", filenamePart: "department-budget-positions", permission: "financial_rls" },
  { slug: "budget-version-history", title: "Budget-version history", description: "Budget versions and their lifecycle state.", filenamePart: "budget-version-history", permission: "financial_rls" },
  { slug: "budget-transfers", title: "Budget transfers", description: "Contingency transfers and reversals in minor units.", filenamePart: "budget-transfers", permission: "financial_rls" },
  { slug: "ticket-forecast", title: "Ticket income forecast", description: "Editable ticket-sales assumptions, not actual sales or a prediction.", filenamePart: "ticket-forecast", permission: "financial_rls" },
  { slug: "ticket-snapshot-history", title: "Ticket-sales snapshot history", description: "Immutable cumulative snapshots. Rows are history and must not be summed together.", filenamePart: "ticket-snapshot-history", permission: "financial_rls" },
  { slug: "other-revenue", title: "Other income", description: "Forecast and recorded actual non-ticket income items.", filenamePart: "other-revenue", permission: "financial_rls" },
  { slug: "spending-requests", title: "Spending requests", description: "RLS-visible current request/revision records.", filenamePart: "spending-requests", permission: "financial_rls" },
  { slug: "request-allocations", title: "Request department allocations", description: "RLS-visible allocations tied to request revisions.", filenamePart: "request-allocations", permission: "financial_rls" },
  { slug: "request-components", title: "Request components", description: "RLS-visible component lines tied to request revisions.", filenamePart: "request-components", permission: "financial_rls" },
  { slug: "approval-history", title: "Approval and revision history", description: "RLS-visible revision and treasurer decision history.", filenamePart: "approval-history", permission: "financial_rls" },
  { slug: "payments", title: "Payments", description: "Payment records including reversal state; reversed payments remain labelled.", filenamePart: "payments", permission: "financial_rls" },
  { slug: "payment-allocations", title: "Payment allocations", description: "Payment allocation lines against approved components.", filenamePart: "payment-allocations", permission: "financial_rls" },
  { slug: "activity-log", title: "Activity log", description: "Permission-aware append-only activity feed without raw metadata.", filenamePart: "activity-log", permission: "event_visible" },
];

function rawValue<T extends Record<string, unknown>>(row: T, column: CsvColumn<T>) {
  return column.value ? column.value(row) : (row[column.key as keyof T] as CsvValue);
}

export function moneyMinorToDecimal(value: CsvValue) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = BigInt(String(value));
  const zero = BigInt(0);
  const oneHundred = BigInt(100);
  const sign = numeric < zero ? "-" : "";
  const absolute = numeric < zero ? -numeric : numeric;
  return `${sign}${absolute / oneHundred}.${(absolute % oneHundred).toString().padStart(2, "0")}`;
}

export function escapeCsvValue(value: CsvValue, kind: CsvColumn<Record<string, unknown>>["kind"] = "text") {
  let text = value === null || value === undefined ? "" : String(value);

  if (kind === "money_minor") {
    text = moneyMinorToDecimal(text);
  }

  if (kind !== "number" && kind !== "money_minor" && /^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: CsvColumn<T>[]) {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(rawValue(row, column), column.kind)).join(","),
  );
  return [header, ...body].join("\r\n");
}

const allColumns = [{ key: "__generated_at", header: "generated_at", value: () => new Date().toISOString() }];

function column<T extends Record<string, unknown>>(key: keyof T | string, header?: string, kind?: CsvColumn<T>["kind"]): CsvColumn<T> {
  return { key, header: header ?? String(key), kind };
}

async function fetchRows(
  supabase: SupabaseClient<Database>,
  slug: string,
  eventId: string,
) {
  switch (slug) {
    case "department-budget-positions":
      return supabase.from("v_event_department_financial_positions").select("*").eq("event_id", eventId).order("display_order", { ascending: true });
    case "budget-version-history":
      return supabase.from("v_budget_version_summaries").select("*").eq("event_id", eventId).order("version_number", { ascending: false });
    case "budget-transfers":
      return supabase.from("budget_transfers").select("*").eq("event_id", eventId).order("effective_at", { ascending: false });
    case "ticket-forecast":
      return supabase.from("v_ticket_type_forecast_positions").select("*").eq("event_id", eventId).order("display_order", { ascending: true });
    case "ticket-snapshot-history":
      return supabase.from("ticket_sales_snapshots").select("*").eq("event_id", eventId).order("captured_at", { ascending: false });
    case "other-revenue":
      return supabase.from("other_revenue_items").select("*").eq("event_id", eventId).order("expected_date", { ascending: true, nullsFirst: false });
    case "spending-requests":
      return supabase.from("v_spending_request_current_revisions").select("*").eq("event_id", eventId).order("request_updated_at", { ascending: false });
    case "request-allocations":
      return supabase.from("spending_request_department_allocations").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
    case "request-components":
      return supabase.from("request_components").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
    case "approval-history":
      return supabase.from("v_request_revision_history").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
    case "payments":
      return supabase.from("v_payment_details").select("*").eq("event_id", eventId).order("payment_date", { ascending: false });
    case "payment-allocations":
      return supabase.from("v_payment_allocation_details").select("*").eq("event_id", eventId).order("payment_date", { ascending: false });
    case "activity-log":
      return supabase.from("v_event_activity_feed").select("*").eq("event_id", eventId).order("created_at", { ascending: false }).order("activity_id", { ascending: false });
    default:
      return { data: null, error: new Error("Unknown export") };
  }
}

export function columnsFor(slug: string): CsvColumn<Record<string, unknown>>[] {
  const money = (key: string, header?: string) => column(key, header ?? `${key}_decimal`, "money_minor") as CsvColumn<Record<string, unknown>>;
  const common = allColumns as CsvColumn<Record<string, unknown>>[];

  switch (slug) {
    case "department-budget-positions":
      return [...common, column("department_code"), column("department_name"), money("current_budget_minor"), money("approved_net_minor"), money("approved_gross_minor"), money("pending_net_minor"), money("potential_remaining_minor"), column("approved_over_budget"), column("potential_over_budget")];
    case "budget-version-history":
      return [...common, column("version_number"), column("name"), column("status"), column("effective_date"), money("original_contingency_minor"), money("allocated_budget_minor"), money("unallocated_contingency_minor"), column("created_at"), column("activated_at")];
    case "budget-transfers":
      return [...common, column("id"), column("budget_version_id"), column("from_department_id"), column("to_department_id"), money("amount_minor"), column("reason"), column("effective_at"), column("created_at")];
    case "ticket-forecast":
      return [...common, column("name"), column("description"), money("net_price_minor"), money("vat_minor"), money("gross_price_minor"), column("maximum_quantity"), column("forecast_quantity"), money("forecast_net_minor"), money("forecast_gross_minor"), column("is_active")];
    case "ticket-snapshot-history":
      return [...common, column("id"), column("captured_at"), column("tickets_sold_to_date"), money("net_sales_minor"), money("vat_minor"), money("gross_sales_minor"), money("refunds_to_date_minor"), money("booking_fees_to_date_minor"), column("source"), column("is_void"), column("void_reason"), column("notes")];
    case "other-revenue":
      return [...common, column("title"), column("category"), money("forecast_net_minor"), money("forecast_vat_minor"), money("forecast_gross_minor"), money("actual_net_minor"), money("actual_vat_minor"), money("actual_gross_minor"), column("status"), column("expected_date"), column("received_date"), column("notes")];
    case "spending-requests":
      return [...common, column("code"), column("title"), column("approval_status"), column("revision_status"), column("owner_display_name"), column("primary_department_code"), money("net_minor"), money("vat_minor"), money("gross_minor"), column("request_submitted_at"), column("revision_updated_at")];
    case "request-allocations":
      return [...common, column("revision_id"), column("department_id"), money("net_minor"), money("vat_minor"), money("gross_minor"), column("created_at")];
    case "request-components":
      return [...common, column("revision_id"), column("code"), column("description"), column("supplier_name"), money("net_minor"), money("vat_minor"), money("gross_minor"), column("expected_payment_date"), column("created_at")];
    case "approval-history":
      return [...common, column("request_code"), column("revision_number"), column("status"), column("title"), money("net_minor"), money("gross_minor"), column("submitted_at"), column("decided_at"), column("created_at")];
    case "payments":
      return [...common, column("code"), column("payment_date"), column("payee"), money("net_minor"), money("vat_minor"), money("gross_minor"), column("status"), column("bank_reference"), column("request_codes"), column("reversal_reason"), column("created_at")];
    case "payment-allocations":
      return [...common, column("payment_code"), column("request_code"), column("component_code"), money("gross_minor"), column("payment_status"), column("payment_date"), column("payee")];
    case "activity-log":
      return [...common, column("activity_id"), column("created_at"), column("actor_display_name"), column("action"), column("category"), column("entity_type"), column("summary"), column("visibility")];
    default:
      return common;
  }
}

export async function buildCsvExport(
  supabase: SupabaseClient<Database>,
  slug: string,
  eventId: string,
) {
  const definition = exportDefinitions.find((item) => item.slug === slug);
  if (!definition) return { data: null, error: "Unknown export." };

  const result = await fetchRows(supabase, slug, eventId);
  if (result.error) return { data: null, error: "Export data could not be loaded." };

  const rows = (result.data ?? []) as Record<string, unknown>[];
  return {
    data: {
      definition,
      csv: toCsv(rows, columnsFor(slug)),
      rowCount: rows.length,
    },
    error: null,
  };
}

export function exportFilename(eventCode: string, eventYear: number | null, filenamePart: string) {
  const date = new Date().toISOString().slice(0, 10);
  const safeCode = eventCode.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safeCode || "event"}-${eventYear ?? "unknown"}-${filenamePart}-${date}.csv`;
}
