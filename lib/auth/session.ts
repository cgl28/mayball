import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { traceAsync } from "@/lib/perf/trace";
import { createClient } from "@/lib/supabase/server";
import { sanitizeReturnPath } from "@/lib/routes";
import type { Database, Tables } from "@/src/types/database.generated";

export type AuthenticatedSession = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  profile: Tables<"profiles"> | null;
  profileError: string | null;
};

const loadAuthenticatedSession = cache(async () => {
  const headerStore = await headers();
  const route = headerStore.get("x-mbf-route") ?? headerStore.get("next-url") ?? "unknown";

  return traceAsync({ route, name: "cache.execute", target: "loadAuthenticatedSession" }, async () => {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { supabase, user: null, profile: null, profileError: null };
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
  });
});

export async function getAuthenticatedSession(
  returnTo = "/app",
): Promise<AuthenticatedSession> {
  const session = await loadAuthenticatedSession();

  if (!session.user) {
    redirect(
      `/auth/login?returnTo=${encodeURIComponent(sanitizeReturnPath(returnTo))}`,
    );
  }

  return {
    supabase: session.supabase,
    user: session.user,
    profile: session.profile,
    profileError: session.profileError,
  };
}

export type TypedSupabaseClient = Awaited<ReturnType<typeof createClient>>;
export type PublicSchema = Database["public"];
