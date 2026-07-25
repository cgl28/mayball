import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PaymentsPanel } from "@/components/payments-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getPaymentsData } from "@/lib/payments/data";

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; recorded?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/payments`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Payment access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const payments = await getPaymentsData(session.supabase, eventId);
  if (payments.error || !payments.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{payments.error ?? "Payments could not be loaded."}</div>;
  }

  const capabilities = getEventCapabilities(eventAccess);

  return (
    <PaymentsPanel
      eventId={eventId}
      data={payments.data}
      canManage={capabilities.canManageFinance}
      readOnly={capabilities.isReadOnly}
      recorded={query.recorded === "1"}
      error={query.error}
    />
  );
}
