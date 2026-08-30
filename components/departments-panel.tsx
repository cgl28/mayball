import { AlertCircle, Plus } from "lucide-react";
import {
  addTemplateDepartmentsAction,
  saveDepartmentAction,
} from "@/app/events/actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { missingStandardDepartments } from "@/lib/departments/templates";
import type { Department } from "@/lib/events/governance";

function Message({
  error,
  saved,
  templateAdded,
  templateExisting,
}: {
  error?: string;
  saved?: boolean;
  templateAdded?: number;
  templateExisting?: number;
}) {
  if (error) {
    return (
      <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        Department changes saved.
      </div>
    );
  }

  if (templateAdded !== undefined || templateExisting !== undefined) {
    const added = templateAdded ?? 0;
    const existing = templateExisting ?? 0;
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        {added > 0
          ? `${added} standard department${added === 1 ? "" : "s"} added.`
          : "All standard departments already exist."}
        {existing > 0 ? ` ${existing} existing department${existing === 1 ? " was" : "s were"} left unchanged.` : null}
      </div>
    );
  }

  return null;
}

function ColourMarker({ colour }: { colour: string | null }) {
  if (!colour) {
    return null;
  }

  return (
    <span
      aria-label="Department colour"
      className="h-5 w-5 rounded-full border border-slate-300"
      style={{ backgroundColor: colour }}
    />
  );
}

function DepartmentForm({
  eventId,
  department,
}: {
  eventId: string;
  department?: Department;
}) {
  return (
    <form action={saveDepartmentAction} className="grid gap-3 rounded-md border p-4">
      <input type="hidden" name="eventId" value={eventId} />
      {department ? <input type="hidden" name="departmentId" value={department.id} /> : null}
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,8rem)]">
        <label className="grid min-w-0 gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            name="name"
            required
            defaultValue={department?.name}
            className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          <span className="font-medium">Code</span>
          <input
            name="code"
            required
            defaultValue={department?.code}
            maxLength={8}
            className="min-w-0 max-w-full rounded-md border bg-background px-3 py-2 uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Description</span>
          <input
            name="description"
            defaultValue={department?.description ?? ""}
            className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
      </div>
      {department ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            name="isActive"
            type="checkbox"
            value="on"
            defaultChecked={department.is_active}
            className="h-4 w-4"
          />
          Active department
        </label>
      ) : null}
      <div>
        <SubmitButton pendingLabel={department ? "Saving..." : "Adding..."}>
          {department ? "Save department" : "Add department"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function DepartmentsPanel({
  eventId,
  departments,
  canManage,
  readOnly,
  error,
  saved,
  templateAdded,
  templateExisting,
}: {
  eventId: string;
  departments: Department[];
  canManage: boolean;
  readOnly: boolean;
  error?: string;
  saved?: boolean;
  templateAdded?: number;
  templateExisting?: number;
}) {
  const remainingTemplate = missingStandardDepartments(
    departments.map((department) => department.code),
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Departments</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Departments define event-specific responsibilities only. Budgets and
          financial allocations are deliberately separate.
        </p>
      </div>

      <Message
        error={error}
        saved={saved}
        templateAdded={templateAdded}
        templateExisting={templateExisting}
      />

      {readOnly ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          This event is read-only. Department setup cannot be changed.
        </div>
      ) : null}

      {departments.length === 0 ? (
        <div className="rounded-md border border-dashed p-6">
          <h2 className="font-medium">No departments yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add standard or custom departments before assigning committee members.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <section key={department.id} className="min-w-0 rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium">{department.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {department.description || "No description"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ColourMarker colour={department.colour} />
                  <Badge variant="outline" className="max-w-full break-all text-center">{department.code}</Badge>
                  <Badge variant={department.is_active ? "default" : "secondary"}>
                    {department.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {canManage ? (
                <details className="mt-4 rounded-md border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Edit department</summary>
                  <div className="mt-3"><DepartmentForm eventId={eventId} department={department} /></div>
                </details>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {canManage ? (
        <section className="rounded-md border p-5">
          <h2 className="flex items-center gap-2 font-medium">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add custom department
          </h2>
          <div className="mt-4">
            <DepartmentForm eventId={eventId} />
          </div>
        </section>
      ) : null}

      {canManage && remainingTemplate.length > 0 ? (
        <section className="rounded-md border p-5">
          <h2 className="font-medium">Standard department template</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add every missing standard department at once. Existing and custom departments are left unchanged.
          </p>
          <form action={addTemplateDepartmentsAction} className="mt-4">
            <input type="hidden" name="eventId" value={eventId} />
            <SubmitButton pendingLabel="Adding..." variant="outline">
              Add all missing standard departments
            </SubmitButton>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Missing: {remainingTemplate.map((department) => department.code).join(", ")}
          </p>
        </section>
      ) : null}
    </div>
  );
}
