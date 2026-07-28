import { connection } from "next/server";
import { JoinEventPanel } from "@/components/join-event-panel";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { parseInvitationInput } from "@/lib/invitations/parse-invitation-input";
import { getInvitationPreview } from "@/lib/invitations/preview";

export default async function JoinEventPage({
  searchParams,
}: {
  searchParams: Promise<{ invitation?: string; token?: string; error?: string }>;
}) {
  await connection();
  const query = await searchParams;
  const session = await getAuthenticatedSession("/app/join");
  const pastedValue = query.invitation ?? query.token ?? "";
  const parsed = pastedValue ? parseInvitationInput(pastedValue) : null;
  const preview =
    parsed?.ok ? await getInvitationPreview(session.supabase, parsed.token) : null;
  const error =
    query.error ??
    (parsed && !parsed.ok ? parsed.error : null) ??
    preview?.error ??
    null;

  return (
    <JoinEventPanel
      pastedValue={pastedValue}
      token={parsed?.ok ? parsed.token : undefined}
      preview={preview?.data}
      error={error}
    />
  );
}
