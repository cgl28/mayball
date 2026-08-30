import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RequestEditor } from "@/components/requests-panel";
import { ReimbursementForm } from "@/components/reimbursement-form";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getSpendingRequestDetail } from "@/lib/requests/data";

export default async function EditRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; requestId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { eventId, requestId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests/${requestId}/edit`);
  const { data: eventAccess } = await getEventAccess(session.supabase, session.user.id, eventId);
  if (!eventAccess) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  if (capabilities.isReadOnly) notFound();

  const detail = await getSpendingRequestDetail(session.supabase, eventId, requestId);
  if (detail.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{detail.error}</div>;
  }
  if (!detail.data || !detail.data.request.can_edit_draft || !detail.data.request.current_draft_revision_id || detail.data.request.revision_status !== "draft") {
    notFound();
  }

  if (detail.data.request.request_kind === "member_reimbursement") {
    return <div className="grid gap-6"><div><h1 className="text-2xl font-semibold tracking-normal">Edit reimbursement</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">This claim stays private until you submit it with a receipt.</p></div>{query.error ? <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{query.error}</div> : null}<ReimbursementForm eventId={eventId} departments={detail.data.departments} detail={detail.data} /></div>;
  }

  return <RequestEditor eventId={eventId} departments={detail.data.departments} detail={detail.data} error={query.error} />;
}
