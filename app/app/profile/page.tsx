import { ProfileForm } from "@/components/profile-form";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { connection } from "next/server";
import { setPreferredOrganisationAction } from "@/app/app/profile/actions";
import { organisationContext, UserIdentityCard } from "@/components/user-identity-card";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ organisationSaved?: string; organisationError?: string }> }) {
  await connection();
  const session = await getAuthenticatedSession("/app/profile");
  const email = session.user.email ?? "No email on account";
  const query = await searchParams;
  const { data: memberships } = await session.supabase.from("organisation_members").select("organisation_id").eq("user_id", session.user.id).eq("status", "active");
  const ids = memberships?.map((membership) => membership.organisation_id) ?? [];
  const { data: organisations } = ids.length ? await session.supabase.from("organisations").select("id,name").in("id", ids).order("name") : { data: [] };
  const profileName = session.profile?.preferred_name || session.profile?.display_name || email.split("@")[0] || "User";
  const currentOrganisations = organisations ?? [];

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

      <UserIdentityCard name={profileName} email={email} organisation={organisationContext(currentOrganisations, session.profile?.preferred_organisation_id)} />

      <ProfileForm
        email={email}
        displayName={session.profile?.display_name ?? email.split("@")[0] ?? ""}
        preferredName={session.profile?.preferred_name ?? ""}
      />
      <section className="grid gap-4 rounded-md border bg-white p-5 shadow-sm">
        <div><h2 className="text-xl font-semibold tracking-normal">Organisations</h2><p className="mt-1 text-sm text-muted-foreground">Organisations are available for future event creation; they do not change your roles in existing events.</p></div>
        {query.organisationError ? <p role="alert" className="text-sm text-destructive">{query.organisationError}</p> : null}
        {query.organisationSaved ? <p role="status" className="text-sm text-emerald-800">Organisation preference saved.</p> : null}
        <div className="grid gap-3 border-t pt-4"><h3 className="font-medium">My organisations</h3>{currentOrganisations.length ? <div className="grid gap-2">{currentOrganisations.map((organisation) => <div key={organisation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"><span className="font-medium">{organisation.name}</span>{organisation.id === session.profile?.preferred_organisation_id ? <span className="text-sky-800">Preferred</span> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">You are not currently affiliated with any organisations.</p>}</div>
        <form action={setPreferredOrganisationAction} className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm"><span className="font-medium">Preferred organisation</span><select name="organisationId" defaultValue={session.profile?.preferred_organisation_id ?? ""} className="rounded-md border bg-background px-3 py-2"><option value="">No preference</option>{(organisations ?? []).map((organisation) => <option key={organisation.id} value={organisation.id}>{organisation.name}</option>)}</select></label><button className="rounded-md border px-3 py-2 text-sm font-medium">Save preference</button></form>
      </section>
    </div>
  );
}
