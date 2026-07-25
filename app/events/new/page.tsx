import { connection } from "next/server";
import { SetupForms, getPresidentOrganisations } from "@/components/setup-forms";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getVisibleEventAccess } from "@/lib/events/access";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const session = await getAuthenticatedSession("/events/new");
  const { data: events } = await getVisibleEventAccess(session.supabase, session.user.id);

  return (
    <SetupForms
      presidentOrganisations={getPresidentOrganisations(events ?? [])}
      error={params.error}
    />
  );
}
