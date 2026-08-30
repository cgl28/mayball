import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/src/types/database.generated";

export const auditCategories = ["all", "requests", "payments", "budget", "revenue", "documents", "lifecycle"] as const;
export type AuditCategory = (typeof auditCategories)[number];
export type AuditActivityCategory = Exclude<AuditCategory, "all"> | "governance";

type AuditContext = {
  request?: { code: string | null; title: string | null; departmentName: string | null };
  payment?: { code: string | null; payee: string | null; grossMinor: number | null };
  budgetTransfer?: { amountMinor: number; fromDepartment: string | null; toDepartment: string | null };
  document?: { category: string | null; filename: string | null; requestCode: string | null; requestId: string | null };
  lifecycle?: { fromStatus: string | null; toStatus: string | null };
};

export type ActivityFeedRow = Tables<"v_event_activity_feed"> & {
  auditCategory?: AuditActivityCategory;
  context?: AuditContext;
};

const lifecycleActions = [
  "event.lifecycle_progressed",
  "event.completed",
  "event.archived",
  "event.reopened",
];

export function normaliseAuditCategory(value?: string): AuditCategory {
  return auditCategories.includes(value as AuditCategory) ? value as AuditCategory : "all";
}

export function auditCategoryForAction(action: string | null | undefined): AuditActivityCategory {
  if (action?.startsWith("request.")) return "requests";
  if (action?.startsWith("payment.")) return "payments";
  if (action?.startsWith("budget.")) return "budget";
  if (action?.startsWith("revenue.")) return "revenue";
  if (action?.startsWith("document.")) return "documents";
  if (action && lifecycleActions.includes(action)) return "lifecycle";
  return "governance";
}

function metadataString(metadata: Json, key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") return null;
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

export async function getActivityFeed(
  supabase: SupabaseClient<Database>,
  eventId: string,
  options: {
    category?: string;
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
  const category = normaliseAuditCategory(options.category);

  let query = supabase
    .from("v_event_activity_feed")
    .select("*", { count: "exact" })
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .order("activity_id", { ascending: false })
    .range(from, to);

  if (category === "lifecycle") query = query.in("action", lifecycleActions);
  else if (category !== "all") query = query.eq("category", category.slice(0, -1));
  if (options.fromDate) query = query.gte("created_at", `${options.fromDate}T00:00:00.000Z`);
  if (options.toDate) query = query.lte("created_at", `${options.toDate}T23:59:59.999Z`);

  const { data, error, count } = await query;
  if (error) return { data: null, error: "Audit activity could not be loaded." };

  const rows = data ?? [];
  const activityIds = rows.flatMap((row) => typeof row.activity_id === "number" ? [row.activity_id] : []);
  const requestIds = rows.flatMap((row) => row.entity_type === "spending_request" && row.entity_id ? [row.entity_id] : []);
  const paymentIds = rows.flatMap((row) => row.entity_type === "payment" && row.entity_id ? [row.entity_id] : []);
  const transferIds = rows.flatMap((row) => row.entity_type === "budget_transfer" && row.entity_id ? [row.entity_id] : []);
  const documentIds = rows.flatMap((row) => row.entity_type === "document" && row.entity_id ? [row.entity_id] : []);

  const [metadataRows, requestRows, paymentRows, transferRows, documentRows, departmentRows] = await Promise.all([
    activityIds.length
      ? supabase.from("activity_log").select("id,metadata").eq("event_id", eventId).in("id", activityIds)
      : Promise.resolve({ data: [], error: null }),
    requestIds.length
      ? supabase.from("v_spending_request_current_revisions").select("request_id,code,title,primary_department_name").eq("event_id", eventId).in("request_id", requestIds)
      : Promise.resolve({ data: [], error: null }),
    paymentIds.length
      ? supabase.from("payments").select("id,code,payee,gross_minor").eq("event_id", eventId).in("id", paymentIds)
      : Promise.resolve({ data: [], error: null }),
    transferIds.length
      ? supabase.from("budget_transfers").select("id,amount_minor,from_department_id,to_department_id").eq("event_id", eventId).in("id", transferIds)
      : Promise.resolve({ data: [], error: null }),
    documentIds.length
      ? supabase.from("v_visible_documents").select("document_id,category,original_filename,request_code,request_id").eq("event_id", eventId).in("document_id", documentIds)
      : Promise.resolve({ data: [], error: null }),
    transferIds.length
      ? supabase.from("departments").select("id,name").eq("event_id", eventId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const metadataById = new Map((metadataRows.data ?? []).map((row) => [row.id, row.metadata]));
  const requestById = new Map((requestRows.data ?? []).map((row) => [row.request_id, row]));
  const paymentById = new Map((paymentRows.data ?? []).map((row) => [row.id, row]));
  const transferById = new Map((transferRows.data ?? []).map((row) => [row.id, row]));
  const documentById = new Map((documentRows.data ?? []).map((row) => [row.document_id, row]));
  const departmentById = new Map((departmentRows.data ?? []).map((row) => [row.id, row.name]));
  const enrichedRows: ActivityFeedRow[] = rows.map((row) => {
    const metadata = typeof row.activity_id === "number" ? metadataById.get(row.activity_id) : undefined;
    const request = row.entity_type === "spending_request" && row.entity_id ? requestById.get(row.entity_id) : undefined;
    const payment = row.entity_type === "payment" && row.entity_id ? paymentById.get(row.entity_id) : undefined;
    const transfer = row.entity_type === "budget_transfer" && row.entity_id ? transferById.get(row.entity_id) : undefined;
    const document = row.entity_type === "document" && row.entity_id ? documentById.get(row.entity_id) : undefined;

    return {
      ...row,
      auditCategory: auditCategoryForAction(row.action),
      context: {
        request: request ? { code: request.code, title: request.title, departmentName: request.primary_department_name } : undefined,
        payment: payment ? { code: payment.code, payee: payment.payee, grossMinor: payment.gross_minor } : undefined,
        budgetTransfer: transfer ? {
          amountMinor: transfer.amount_minor,
          fromDepartment: transfer.from_department_id ? departmentById.get(transfer.from_department_id) ?? null : null,
          toDepartment: transfer.to_department_id ? departmentById.get(transfer.to_department_id) ?? null : null,
        } : undefined,
        document: document ? {
          category: document.category,
          filename: document.original_filename,
          requestCode: document.request_code,
          requestId: document.request_id,
        } : undefined,
        lifecycle: metadata ? {
          fromStatus: metadataString(metadata, "from") ?? metadataString(metadata, "source_status"),
          toStatus: metadataString(metadata, "to"),
        } : undefined,
      },
    };
  });

  return {
    data: {
      rows: enrichedRows,
      count: count ?? 0,
      page,
      pageSize,
      category,
      fromDate: options.fromDate,
      toDate: options.toDate,
    },
    error: null,
  };
}
