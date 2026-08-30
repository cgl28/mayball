import { redirect } from "next/navigation";

export default async function TicketTypesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/revenue`);
}
