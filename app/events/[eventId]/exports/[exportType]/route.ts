import { notFound } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { buildCsvExport, exportFilename } from "@/lib/exports/csv";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; exportType: string }> },
) {
  const { eventId, exportType } = await params;
  const session = await getAuthenticatedSession(`/events/${eventId}/exports`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error || !eventAccess) notFound();

  const result = await buildCsvExport(session.supabase, exportType, eventId);
  if (result.error || !result.data) notFound();

  const filename = exportFilename(
    eventAccess.event.code,
    eventAccess.event.event_year,
    result.data.definition.filenamePart,
  );

  return new Response(result.data.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
