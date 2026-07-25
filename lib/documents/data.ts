import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums, Tables } from "@/src/types/database.generated";

export type VisibleDocument = Tables<"v_visible_documents">;

export async function getVisibleDocuments(
  supabase: SupabaseClient<Database>,
  eventId: string,
  options: {
    requestId?: string;
    category?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("v_visible_documents")
    .select("*", { count: "exact" })
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .order("document_id", { ascending: false })
    .range(from, to);

  if (options.requestId) {
    query = query.eq("request_id", options.requestId);
  }
  if (options.category && options.category !== "all") {
    query = query.eq("category", options.category as Enums<"document_category">);
  }
  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status as Enums<"document_upload_status">);
  }
  if (options.search) {
    query = query.ilike("original_filename", `%${options.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: "Documents could not be loaded." };
  }

  return {
    data: {
      documents: data ?? [],
      count: count ?? 0,
      page,
      pageSize,
    },
    error: null,
  };
}

export async function getDocumentForDownload(
  supabase: SupabaseClient<Database>,
  eventId: string,
  documentId: string,
) {
  const visible = await supabase
    .from("v_visible_documents")
    .select("document_id,event_id,original_filename,mime_type,status")
    .eq("event_id", eventId)
    .eq("document_id", documentId)
    .maybeSingle();

  if (visible.error) return { data: null, error: "Document could not be loaded." };
  if (!visible.data) return { data: null, error: null };

  const metadata = await supabase
    .from("documents")
    .select("id,bucket_id,object_path,original_filename,mime_type,status")
    .eq("event_id", eventId)
    .eq("id", documentId)
    .maybeSingle();

  if (metadata.error) return { data: null, error: "Document could not be loaded." };
  if (!metadata.data) return { data: null, error: null };

  return { data: metadata.data, error: null };
}
