import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PaymentFormPanel } from "@/components/payments-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getPaymentFormData } from "@/lib/payments/data";

export default async function NewRequestPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; requestId: string }>;
  searchParams: Promise<{ error?: string; componentId?: string }>;
}) {
  await connection();
  const { eventId, requestId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/requests/${requestId}/payments/new`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Payment access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  if (!capabilities.canManageFinance) redirect(`/events/${eventId}/requests/${requestId}/payments`);

  const data = await getPaymentFormData(session.supabase, eventId, requestId, query.componentId, eventAccess.event.event_date);
  if (data.error || !data.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{data.error ?? "Payment form could not be loaded."}</div>;
  }

  return <PaymentFormPanel eventId={eventId} requestId={requestId} data={data.data} error={query.error} />;
}
