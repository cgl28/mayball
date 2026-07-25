import { createClient } from "@/lib/supabase/server";

export async function isMarketingVisitorAuthenticated() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user);
}
