import { connection } from "next/server";
import { acceptInvitationAction } from "@/app/events/actions";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { SubmitButton } from "@/components/submit-button";

export default async function InvitationAcceptancePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { token } = await params;
  const query = await searchParams;
  await getAuthenticatedSession(`/invitations/${encodeURIComponent(token)}`);

  return (
    <main className="mx-auto grid min-h-svh max-w-xl content-center px-4 py-10">
      <section className="rounded-md border p-6">
        <h1 className="text-2xl font-semibold tracking-normal">Accept invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Continue only if this invitation was issued to the email address on
          your signed-in account.
        </p>
        {query.error ? (
          <div role="alert" className="mt-4 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            {query.error}
          </div>
        ) : null}
        <form action={acceptInvitationAction} className="mt-5">
          <input type="hidden" name="token" value={token} />
          <SubmitButton pendingLabel="Accepting...">Accept invitation</SubmitButton>
        </form>
      </section>
    </main>
  );
}
