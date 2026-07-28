"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/app/profile/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileFormState } from "@/lib/profile/validation";

export function ProfileForm({
  email,
  displayName,
  preferredName,
}: {
  email: string;
  displayName: string;
  preferredName: string;
}) {
  const initialState: ProfileFormState = {
    ok: false,
    message: "",
    fields: { displayName, preferredName },
  };
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const values = state.message ? state.fields : initialState.fields;

  return (
    <form action={formAction} className="grid gap-5 rounded-md border bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold tracking-normal">Profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Update the profile details shown inside the application.
        </p>
      </div>

      {state.message ? (
        <div
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950" : "rounded-md border border-destructive/40 p-3 text-sm text-destructive"}
        >
          {state.message}
        </div>
      ) : null}

      <label className="grid gap-2 text-sm">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} readOnly />
        <span className="text-xs text-muted-foreground">Email changes are handled by the authentication provider.</span>
      </label>

      <label className="grid gap-2 text-sm">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          name="displayName"
          required
          maxLength={120}
          defaultValue={values.displayName}
          aria-describedby={state.ok || !state.message ? undefined : "profile-message"}
        />
      </label>

      <label className="grid gap-2 text-sm">
        <Label htmlFor="preferred-name">Preferred name</Label>
        <Input
          id="preferred-name"
          name="preferredName"
          maxLength={80}
          defaultValue={values.preferredName}
          aria-describedby={state.ok || !state.message ? undefined : "profile-message"}
        />
      </label>

      {!state.ok && state.message ? <span id="profile-message" className="sr-only">{state.message}</span> : null}

      <div>
        <SubmitButton pendingLabel="Saving...">Save Profile</SubmitButton>
      </div>
    </form>
  );
}
