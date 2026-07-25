import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sanitizeReturnPath } from "@/lib/routes";
import type { Database, Tables } from "@/src/types/database.generated";

export type AuthenticatedSession = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  profile: Tables<"profiles"> | null;
  profileError: string | null;
};

export async function getAuthenticatedSession(
  returnTo = "/events",
): Promise<AuthenticatedSession> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(
      `/auth/login?returnTo=${encodeURIComponent(sanitizeReturnPath(returnTo))}`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,preferred_name,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile,
    profileError: profileError ? "Profile could not be loaded." : null,
  };
}

export type TypedSupabaseClient = Awaited<ReturnType<typeof createClient>>;
export type PublicSchema = Database["public"];
