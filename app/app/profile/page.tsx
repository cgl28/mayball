import { ProfileForm } from "@/components/profile-form";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { connection } from "next/server";

export default async function ProfilePage() {
  await connection();
  const session = await getAuthenticatedSession("/app/profile");
  const email = session.user.email ?? "No email on account";

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--marketing-brand))]">Profile</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal">Your profile</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          These details are used for greetings, committee lists and activity records.
        </p>
      </div>

      {session.profileError ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-white p-4 text-sm text-destructive">
          {session.profileError}
        </div>
      ) : null}

      <ProfileForm
        email={email}
        displayName={session.profile?.display_name ?? email.split("@")[0] ?? ""}
        preferredName={session.profile?.preferred_name ?? ""}
      />
    </div>
  );
}
