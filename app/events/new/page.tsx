import { connection } from "next/server";
import { SetupForms } from "@/components/setup-forms";
import { getAuthenticatedSession } from "@/lib/auth/session";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const session = await getAuthenticatedSession("/events/new");
  const { data: memberships } = await session.supabase.from("organisation_members").select("organisation_id").eq("user_id", session.user.id).eq("status", "active");
  const ids = memberships?.map((membership) => membership.organisation_id) ?? [];
  const { data: organisations } = ids.length ? await session.supabase.from("organisations").select("id,name").in("id", ids).order("name") : { data: [] };

  return (
    <SetupForms
      presidentOrganisations={organisations ?? []}
      error={params.error}
    />
  );
}
