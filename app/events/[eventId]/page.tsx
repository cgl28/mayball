import { redirect } from "next/navigation";
import { connection } from "next/server";

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await connection();
  const { eventId } = await params;
  redirect(`/events/${eventId}/dashboard`);
}
