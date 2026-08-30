"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/auth/session";
import {
  MAX_DOCUMENT_BYTES,
  allowedDocumentTypes,
  isAllowedDocumentType,
} from "@/lib/documents/validation";
import type { Database, Enums } from "@/src/types/database.generated";
import { traceAsync } from "@/lib/perf/trace";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function redirectBack(eventId: string, requestId: string | null, params: URLSearchParams, returnTo?: string): never {
  const base = requestId && returnTo === "approval"
    ? `/events/${eventId}/approvals/${requestId}`
    : requestId ? `/events/${eventId}/requests/${requestId}` : `/events/${eventId}/documents`;
  redirect(`${base}?${params.toString()}`);
}

export async function uploadDocumentAction(formData: FormData) {
  const eventId = value(formData, "eventId");
  const requestId = value(formData, "requestId") || null;
  const revisionId = value(formData, "revisionId") || null;
  const paymentId = value(formData, "paymentId") || null;
  const returnTo = value(formData, "returnTo");
  const category = (value(formData, "category") || "supporting") as Enums<"document_category">;
  const description = value(formData, "description") || null;
  const fileEntry = formData.get("file");
  const response = new URLSearchParams();

  if (!eventId || !(fileEntry instanceof File) || fileEntry.size === 0) {
    response.set("documentsError", "Choose a non-empty document to upload.");
    redirectBack(eventId, requestId, response, returnTo);
  }
  const file = fileEntry;
  if (!requestId && !paymentId) {
    response.set("documentsError", "This request must be saved before documents can be uploaded.");
    redirectBack(eventId, requestId, response, returnTo);
  }
  if (!isAllowedDocumentType(file.type)) {
    response.set("documentsError", `Unsupported file type. Allowed types: ${allowedDocumentTypes.join(", ")}.`);
    redirectBack(eventId, requestId, response, returnTo);
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    response.set("documentsError", "The document is larger than the 10 MB limit.");
    redirectBack(eventId, requestId, response, returnTo);
  }

  const session = await getAuthenticatedSession(`/events/${eventId}/documents`);
  const intentArgs = {
    p_event_id: eventId,
    p_request_id: requestId,
    p_revision_id: revisionId,
    p_payment_id: paymentId,
    p_category: category,
    p_original_filename: file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size,
    p_description: description,
  } as unknown as Database["public"]["Functions"]["begin_document_upload"]["Args"];
  const intent = await traceAsync({ route: `/events/${eventId}/documents`, name: "document.begin_upload" }, () => session.supabase.rpc("begin_document_upload", intentArgs));

  const intentRow = intent.data?.[0];
  if (intent.error || !intentRow) {
    response.set("documentsError", intent.error?.message.includes("Not authorised") ? "You do not have permission to add documents to this request." : "Document upload could not be started.");
    redirectBack(eventId, requestId, response, returnTo);
  }
  const uploadIntent = intentRow;

  const upload = await traceAsync({ route: `/events/${eventId}/documents`, name: "document.storage_upload", target: uploadIntent.bucket_id }, () => session.supabase.storage
    .from(uploadIntent.bucket_id)
    .upload(uploadIntent.object_path, file, {
      contentType: file.type,
      upsert: false,
    }));

  if (upload.error) {
    response.set("documentsError", "The file could not be uploaded. Please try again.");
    redirectBack(eventId, requestId, response, returnTo);
  }

  const finalised = await traceAsync({ route: `/events/${eventId}/documents`, name: "document.finalise_upload" }, () => session.supabase.rpc("finalise_document_upload", {
    p_document_id: uploadIntent.document_id,
    p_size_bytes: file.size,
    p_mime_type: file.type,
  }));

  if (finalised.error) {
    response.set("documentsError", "The upload was stored but could not be finalised. Please retry or ask a treasurer to review it.");
    redirectBack(eventId, requestId, response, returnTo);
  }

  // Supabase reads are uncached server reads. Redirecting fetches a fresh RSC
  // payload for the destination without clearing the entire client router cache.
  response.set("documentUploaded", "1");
  redirectBack(eventId, requestId, response, returnTo);
}

export async function voidDocumentAction(formData: FormData) {
  const eventId = value(formData, "eventId");
  const requestId = value(formData, "requestId") || null;
  const documentId = value(formData, "documentId");
  const reason = value(formData, "reason");
  const returnTo = value(formData, "returnTo");
  const response = new URLSearchParams();

  if (!eventId || !documentId || !reason) {
    response.set("documentsError", "A reason is required to void a document.");
    redirectBack(eventId, requestId, response, returnTo);
  }

  const session = await getAuthenticatedSession(`/events/${eventId}/documents`);
  const result = await traceAsync({ route: `/events/${eventId}/documents`, name: "document.void" }, () => session.supabase.rpc("void_document", {
    p_document_id: documentId,
    p_reason: reason,
  }));

  if (result.error) {
    response.set("documentsError", "Document could not be voided.");
    redirectBack(eventId, requestId, response, returnTo);
  }

  response.set("documentVoided", "1");
  redirectBack(eventId, requestId, response, returnTo);
}
