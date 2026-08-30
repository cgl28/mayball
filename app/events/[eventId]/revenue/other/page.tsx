import { redirect } from "next/navigation";

export default async function OtherRevenuePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/revenue`);
}
