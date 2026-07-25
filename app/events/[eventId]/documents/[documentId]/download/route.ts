import { notFound, redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getDocumentForDownload } from "@/lib/documents/data";
import { safeDownloadFilename } from "@/lib/documents/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; documentId: string }> },
) {
  const { eventId, documentId } = await params;
  const session = await getAuthenticatedSession(`/events/${eventId}/documents`);
  const document = await getDocumentForDownload(session.supabase, eventId, documentId);

  if (document.error || !document.data) {
    notFound();
  }

  const signed = await session.supabase.storage
    .from(document.data.bucket_id)
    .createSignedUrl(document.data.object_path, 60, {
      download: safeDownloadFilename(document.data.original_filename),
    });

  if (signed.error || !signed.data?.signedUrl) {
    notFound();
  }

  redirect(signed.data.signedUrl);
}
