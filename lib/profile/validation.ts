export type ProfileFormState = {
  ok: boolean;
  message: string;
  fields: {
    displayName: string;
    preferredName: string;
  };
};

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateProfileForm(formData: FormData): ProfileFormState {
  const displayName = clean(formData.get("displayName"));
  const preferredName = clean(formData.get("preferredName"));

  if (displayName.length < 1 || displayName.length > 120) {
    return {
      ok: false,
      message: "Display name must be between 1 and 120 characters.",
      fields: { displayName, preferredName },
    };
  }

  if (preferredName.length > 80) {
    return {
      ok: false,
      message: "Preferred name must be 80 characters or fewer.",
      fields: { displayName, preferredName },
    };
  }

  return {
    ok: true,
    message: "",
    fields: { displayName, preferredName },
  };
}
