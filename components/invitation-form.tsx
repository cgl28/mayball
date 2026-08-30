"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { issueInvitationAction, type InvitationState } from "@/app/events/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import type { Department } from "@/lib/events/governance";
import type { EventRole } from "@/lib/events/access";

const INITIAL_STATE: InvitationState = { ok: false, message: "" };

const ROLE_OPTIONS: { value: EventRole; label: string }[] = [
  { value: "committee_member", label: "Committee member" },
  { value: "president", label: "President" },
  { value: "treasurer", label: "Treasurer" },
  { value: "read_only", label: "Read-only" },
];

export function InvitationLinkDisplay({ token }: { token: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const invitationPath = `/invitations/${token}`;
  const invitationLink = useMemo(
    () => (origin ? `${origin}${invitationPath}` : invitationPath),
    [invitationPath, origin],
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyLink() {
    if (!navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(invitationLink);
    setCopied(true);
  }

  return (
    <div className="mt-3 grid gap-3 rounded-md border border-emerald-200 bg-white p-3">
      <div>
        <p className="font-medium">Share this invitation link with the committee member:</p>
        <p className="mt-2 break-all font-mono text-xs">{invitationLink}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={copyLink}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy Invitation Link
        </Button>
        {copied ? <span className="text-xs">Copied.</span> : null}
      </div>
      <p className="text-xs">
        The recipient can open the link directly, or paste it into Join Event on
        their Home page.
      </p>
    </div>
  );
}

export function InvitationForm({
  eventId,
  departments,
}: {
  eventId: string;
  departments: Department[];
}) {
  const [state, action] = useActionState(issueInvitationAction, INITIAL_STATE);

  return (
    <form action={action} className="grid gap-4 rounded-md border p-4">
      <input type="hidden" name="eventId" value={eventId} />
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Email address</span>
        <input
          name="email"
          type="email"
          required
          className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Intended roles</legend>
        <p className="text-sm text-muted-foreground">Select at least one role. Committee members must also have an initial department.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLE_OPTIONS.map((role) => (
            <label key={role.value} className="flex items-center gap-2 text-sm">
              <input
                name="roles"
                type="checkbox"
                value={role.value}
                className="h-4 w-4"
              />
              {role.label}
            </label>
          ))}
        </div>
      </fieldset>
      {departments.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Initial departments</legend>
          <p className="text-sm text-muted-foreground">Required when inviting a committee member.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {departments.map((department) => (
              <label key={department.id} className="flex items-center gap-2 text-sm">
                <input
                  name="departments"
                  type="checkbox"
                  value={department.id}
                  className="h-4 w-4"
                />
                {department.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="grid gap-1 text-sm sm:max-w-40">
        <span className="font-medium">Expiry days</span>
        <input
          name="expiresInDays"
          type="number"
          min="1"
          max="90"
          defaultValue="14"
          className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>
      <SubmitButton pendingLabel="Creating invitation...">Create invitation</SubmitButton>
      {state.message ? (
        <div
          role={state.ok ? "status" : "alert"}
          className={
            state.ok
              ? "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950"
              : "rounded-md border border-destructive/40 p-3 text-sm text-destructive"
          }
        >
          <p>{state.message}</p>
          {state.token ? <InvitationLinkDisplay token={state.token} /> : null}
        </div>
      ) : null}
    </form>
  );
}
