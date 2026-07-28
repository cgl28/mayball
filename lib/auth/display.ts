import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/src/types/database.generated";

export function displayNameForUser(
  user: Pick<User, "email">,
  profile: Pick<Tables<"profiles">, "display_name" | "preferred_name"> | null,
) {
  const preferred = profile?.preferred_name?.trim();
  if (preferred) return preferred;

  const display = profile?.display_name?.trim();
  if (display) return display;

  const localPart = user.email?.split("@")[0]?.trim();
  return localPart || "there";
}
