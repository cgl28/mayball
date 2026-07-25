export const DOCUMENT_BUCKET = "event-documents";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const allowedDocumentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function isAllowedDocumentType(type: string) {
  return allowedDocumentTypes.includes(type as (typeof allowedDocumentTypes)[number]);
}

export function safeDownloadFilename(name: string) {
  const cleaned = name
    .replace(/[^\w .()'-]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "document";
}
