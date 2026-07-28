import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/src/types/database.generated";
import { friendlyInvitationError } from "@/lib/invitations/messages";

export type InvitationPreview = {
  event_id: string;
  event_name: string;
  event_year: number;
  event_date: string | null;
  organisation_name: string;
  invitation_status: Enums<"invitation_status">;
  expires_at: string;
  invited_email: string;
  roles: Enums<"event_role">[];
  departments: string[];
  already_member: boolean;
};

export async function getInvitationPreview(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<{ data: InvitationPreview | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_invitation_preview", {
    p_raw_token: token,
  });

  if (error) {
    return { data: null, error: friendlyInvitationError(error.message) };
  }

  const preview = data?.[0] as InvitationPreview | undefined;

  if (!preview) {
    return { data: null, error: "This invitation could not be found." };
  }

  return { data: preview, error: null };
}
