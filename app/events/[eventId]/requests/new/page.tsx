import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RequestEditor } from "@/components/requests-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getSpendingRequestsData } from "@/lib/requests/data";

export default async function NewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests/new`);
  const { data: eventAccess } = await getEventAccess(session.supabase, session.user.id, eventId);
  if (!eventAccess) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  if (capabilities.isReadOnly || eventAccess.accessMode !== "active") notFound();

  const data = await getSpendingRequestsData(session.supabase, eventId);
  if (data.error || !data.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{data.error ?? "Departments could not be loaded."}</div>;
  }

  return <RequestEditor eventId={eventId} departments={data.data.departments} error={query.error} />;
}
