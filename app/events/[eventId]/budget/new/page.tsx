import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BudgetEditor } from "@/components/budget-editor";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getBudgetOverview } from "@/lib/budget/data";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function NewBudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/budget/new`);
  const { data: eventAccess } = await getEventAccess(session.supabase, session.user.id, eventId);
  if (!eventAccess) notFound();
  const capabilities = getEventCapabilities(eventAccess);
  if (!capabilities.canManageFinance) notFound();
  const budget = await getBudgetOverview(session.supabase, eventId);
  if (budget.error || !budget.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{budget.error ?? "Budget could not be loaded."}</div>;
  }
  return <BudgetEditor eventId={eventId} departments={budget.data.departments.filter((department) => department.is_active)} error={query.error} />;
}
