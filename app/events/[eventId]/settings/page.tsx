import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EventSettingsPanel } from "@/components/event-settings-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";

export default async function EventSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; saved?: string; created?: string; organisationSaved?: string }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/settings`);
  const { data: eventAccess, error } = await getEventAccess(
    session.supabase,
    session.user.id,
    eventId,
  );

  if (error) {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">
        Event settings could not be loaded. Please refresh and try again.
      </div>
    );
  }

  if (!eventAccess) {
    notFound();
  }

  const capabilities = getEventCapabilities(eventAccess);
  const { data: memberships } = await session.supabase.from("organisation_members").select("organisation_id").eq("user_id", session.user.id).eq("status", "active");
  const organisationIds = memberships?.map((membership) => membership.organisation_id) ?? [];
  const { data: organisations } = organisationIds.length ? await session.supabase.from("organisations").select("id,name,legal_name,slug").in("id", organisationIds).order("name") : { data: [] };
  const eventOrganisation = eventAccess.organisation ?? (organisations ?? []).find((organisation) => organisation.id === eventAccess.event.organisation_id) ?? null;

  return (
    <EventSettingsPanel
      eventAccess={{ ...eventAccess, organisation: eventOrganisation }}
      canManage={capabilities.canManageSetup}
      error={query.error}
      saved={query.saved === "1"}
      created={query.created === "1"}
      organisationSaved={query.organisationSaved === "1"}
      organisations={organisations ?? []}
    />
  );
}
