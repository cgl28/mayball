import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DocumentsPanel } from "@/components/documents-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getVisibleDocuments } from "@/lib/documents/data";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{
    page?: string;
    category?: string;
    status?: string;
    search?: string;
    documentsError?: string;
    documentUploaded?: string;
    documentVoided?: string;
  }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/documents`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Document access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  const docs = await getVisibleDocuments(session.supabase, eventId, {
    page: Number(query.page ?? 1),
    category: query.category,
    status: query.status,
    search: query.search,
  });

  if (docs.error || !docs.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{docs.error}</div>;
  }

  return (
    <DocumentsPanel
      eventId={eventId}
      documents={docs.data.documents}
      count={docs.data.count}
      page={docs.data.page}
      pageSize={docs.data.pageSize}
      canUpload={!capabilities.isReadOnly}
      canVoid={capabilities.canManageFinance}
      readOnly={capabilities.isReadOnly}
      error={query.documentsError}
      uploaded={query.documentUploaded === "1"}
      voided={query.documentVoided === "1"}
    />
  );
}
