import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PaymentDetailPanel } from "@/components/payments-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getPaymentDetailData } from "@/lib/payments/data";

export default async function PaymentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; paymentId: string }>;
  searchParams: Promise<{ error?: string; recorded?: string; reversed?: string }>;
}) {
  await connection();
  const { eventId, paymentId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/payments/${paymentId}`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Payment access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const data = await getPaymentDetailData(session.supabase, eventId, paymentId);
  if (data.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{data.error}</div>;
  }
  if (!data.data) notFound();

  const capabilities = getEventCapabilities(eventAccess);

  return (
    <PaymentDetailPanel
      eventId={eventId}
      data={data.data}
      canManage={capabilities.canManageFinance}
      readOnly={capabilities.isReadOnly}
      recorded={query.recorded === "1"}
      reversed={query.reversed === "1"}
      error={query.error}
    />
  );
}
