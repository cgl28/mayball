import { redirect } from "next/navigation";

export default async function ActualTicketRevenuePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/revenue`);
}
