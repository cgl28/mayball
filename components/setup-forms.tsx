import type { EventAccess } from "@/lib/events/access";
import {
  createOrganisationAndEventAction,
  createRecurringEventAction,
} from "@/app/events/actions";
import { SubmitButton } from "@/components/submit-button";
import { AlertCircle } from "lucide-react";

type PresidentOrganisation = {
  id: string;
  name: string;
};

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </label>
  );
}

function StatusSelect() {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">Initial status</span>
      <select
        name="initialStatus"
        defaultValue="setup"
        className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="setup">Setup</option>
        <option value="planning">Planning</option>
      </select>
    </label>
  );
}

export function getPresidentOrganisations(events: EventAccess[]) {
  const organisations = new Map<string, PresidentOrganisation>();

  for (const eventAccess of events) {
    if (
      eventAccess.organisation &&
      eventAccess.roles.includes("president") &&
      !eventAccess.isReadOnly
    ) {
      organisations.set(eventAccess.organisation.id, {
        id: eventAccess.organisation.id,
        name: eventAccess.organisation.name,
      });
    }
  }

  return [...organisations.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function SetupForms({
  presidentOrganisations,
  error,
}: {
  presidentOrganisations: PresidentOrganisation[];
  error?: string;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Create event setup</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Start a new organisation with its first event, or create a recurring
          event inside an organisation where you are president.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex gap-2 rounded-md border border-destructive/40 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="rounded-md border p-5">
        <h2 className="font-medium">New organisation and first event</h2>
        <form action={createOrganisationAndEventAction} className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Organisation name" name="organisationName" required />
            <Field label="Organisation slug" name="organisationSlug" required placeholder="clare-may-ball" />
            <Field label="Legal name" name="legalName" />
            <Field label="Event name" name="eventName" required />
            <Field label="Event code" name="eventCode" required placeholder="CMB" />
            <Field label="Event year" name="eventYear" type="number" required />
            <Field label="Event date" name="eventDate" type="date" />
            <Field label="Planning start date" name="planningStartDate" type="date" />
            <StatusSelect />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input name="assignTreasurer" type="checkbox" className="h-4 w-4" />
            Also assign me treasurer for this first event
          </label>
          <SubmitButton pendingLabel="Creating...">Create organisation and event</SubmitButton>
        </form>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="font-medium">New recurring event</h2>
        {presidentOrganisations.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            You are not president of an active organisation event yet.
          </p>
        ) : (
          <form action={createRecurringEventAction} className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Organisation</span>
              <select
                name="organisationId"
                required
                className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {presidentOrganisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Event name" name="eventName" required />
              <Field label="Event code" name="eventCode" required placeholder="DMB" />
              <Field label="Event year" name="eventYear" type="number" required />
              <Field label="Event date" name="eventDate" type="date" />
              <Field label="Planning start date" name="planningStartDate" type="date" />
              <StatusSelect />
            </div>
            <SubmitButton pendingLabel="Creating...">Create recurring event</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
