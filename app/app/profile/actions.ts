"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { validateProfileForm, type ProfileFormState } from "@/lib/profile/validation";

export async function updateProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const validation = validateProfileForm(formData);
  if (!validation.ok) return validation;

  const session = await getAuthenticatedSession("/app/profile");
  const { error } = await session.supabase
    .from("profiles")
    .update({
      display_name: validation.fields.displayName,
      preferred_name: validation.fields.preferredName || null,
    })
    .eq("id", session.user.id);

  if (error) {
    return {
      ok: false,
      message: "Profile could not be saved.",
      fields: validation.fields,
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/profile");
  revalidatePath("/events");

  return {
    ok: true,
    message: "Profile saved.",
    fields: validation.fields,
  };
}

export async function setPreferredOrganisationAction(formData: FormData) {
  const session = await getAuthenticatedSession("/app/profile");
  const organisationId = String(formData.get("organisationId") ?? "").trim() || null;
  const { error } = await session.supabase.rpc("set_preferred_organisation", organisationId ? { p_organisation_id: organisationId } : {});
  if (error) redirect(`/app/profile?organisationError=${encodeURIComponent(error.message)}`);
  revalidatePath("/app/profile");
  redirect("/app/profile?organisationSaved=1");
}
