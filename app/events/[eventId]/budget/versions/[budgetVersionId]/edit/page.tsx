import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BudgetEditor } from "@/components/budget-editor";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getBudgetOverview, getBudgetVersionForEdit, getPreviousBudgetContext } from "@/lib/budget/data";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function EditBudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; budgetVersionId: string }>;
  searchParams: Promise<{ error?: string; saved?: string; created?: string }>;
}) {
  await connection();
  const { eventId, budgetVersionId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(
    `/events/${eventId}/budget/versions/${budgetVersionId}/edit`,
  );
  const { data: eventAccess } = await getEventAccess(session.supabase, session.user.id, eventId);
  if (!eventAccess) notFound();
  const capabilities = getEventCapabilities(eventAccess);
  if (!capabilities.canManageFinance) notFound();

  const [budget, editable] = await Promise.all([
    getBudgetOverview(session.supabase, eventId),
    getBudgetVersionForEdit(session.supabase, budgetVersionId),
  ]);
  if (budget.error || !budget.data) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{budget.error ?? "Budget could not be loaded."}</div>;
  }
  if (editable.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{editable.error}</div>;
  }
  if (!editable.data || editable.data.version.event_id !== eventId) notFound();
  const previous = await getPreviousBudgetContext(session.supabase, eventId, editable.data.version.version_number);
  if (previous.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{previous.error}</div>;
  }

  return (
    <BudgetEditor
      eventId={eventId}
      departments={budget.data.departments.filter((department) => department.is_active)}
      version={editable.data.version}
      allocations={editable.data.allocations}
      previousBudget={previous.data}
      error={query.error}
      saved={query.saved === "1"}
      created={query.created === "1"}
    />
  );
}
