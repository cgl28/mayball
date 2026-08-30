import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ReimbursementForm } from "@/components/reimbursement-form";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getSpendingRequestsData } from "@/lib/requests/data";

export default async function NewReimbursementPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ error?: string }> }) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests/reimbursement/new`);
  const { data: access } = await getEventAccess(session.supabase, session.user.id, eventId);
  if (!access || getEventCapabilities(access).isReadOnly || access.accessMode !== "active") notFound();
  const data = await getSpendingRequestsData(session.supabase, eventId, session.user.id);
  if (data.error || !data.data) return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{data.error ?? "Departments could not be loaded."}</div>;
  return <div className="grid gap-6"><div><h1 className="text-2xl font-semibold tracking-normal">Submit expense / reimbursement</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Save the claim first, upload an expense claim form and receipt to its stable request record, then submit it for Treasurer review.</p></div>{query.error ? <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{query.error}</div> : null}<ReimbursementForm eventId={eventId} departments={data.data.departments} defaultDepartmentId={data.data.defaultDepartmentId} /></div>;
}
