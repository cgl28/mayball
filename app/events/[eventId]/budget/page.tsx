import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BudgetPanel } from "@/components/budget-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getBudgetOverview } from "@/lib/budget/data";

export default async function BudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; activated?: string; transferred?: string; transfers?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/budget`);
  const { data: eventAccess, error } = await getEventAccess(
    session.supabase,
    session.user.id,
    eventId,
  );

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Budget access could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const budget = await getBudgetOverview(session.supabase, eventId, query.transfers === "1");
  const capabilities = getEventCapabilities(eventAccess);

  if (budget.error || !budget.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{budget.error ?? "Budget could not be loaded."}</div>;
  }

  return (
    <BudgetPanel
      eventId={eventId}
      budget={budget.data}
      canManage={capabilities.canManageFinance}
      readOnly={capabilities.isReadOnly}
      error={query.error}
      activated={query.activated === "1"}
      transferred={query.transferred === "1"}
      transferHistoryLoaded={query.transfers === "1"}
    />
  );
}
