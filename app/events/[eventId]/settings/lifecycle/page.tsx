import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LifecyclePanel } from "@/components/lifecycle-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/events/access";
import { getEventCapabilities } from "@/lib/events/permissions";
import { getLifecycleData } from "@/lib/lifecycle/data";

export default async function EventLifecyclePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{
    error?: string;
    completed?: string;
    archived?: string;
    reopened?: string;
    acknowledgementRequired?: string;
  }>;
}) {
  await connection();
  const { eventId } = await params;
  const query = await searchParams;
  const session = await getAuthenticatedSession(`/events/${eventId}/settings/lifecycle`);
  const { data: eventAccess, error } = await getEventAccess(session.supabase, session.user.id, eventId);

  if (error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">Lifecycle status could not be loaded.</div>;
  }
  if (!eventAccess) notFound();

  const capabilities = getEventCapabilities(eventAccess);
  const canManageLifecycle = capabilities.isPresident;
  const lifecycle = await getLifecycleData(session.supabase, eventId, canManageLifecycle);

  if (lifecycle.error) {
    return <div role="alert" className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{lifecycle.error}</div>;
  }
  if (!lifecycle.data) notFound();

  return (
    <LifecyclePanel
      eventAccess={eventAccess}
      lifecycle={lifecycle.data}
      canManageLifecycle={canManageLifecycle}
      error={query.error}
      completed={query.completed === "1"}
      archived={query.archived === "1"}
      reopened={query.reopened === "1"}
      acknowledgementRequired={query.acknowledgementRequired === "1"}
    />
  );
}
