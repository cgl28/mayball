import { AlertCircle, Plus } from "lucide-react";
import { saveDepartmentAction } from "@/app/events/actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import type { Department } from "@/lib/events/governance";

export const DEFAULT_DEPARTMENT_TEMPLATE = [
  ["Aesthetics", "AE"],
  ["Drinks", "DR"],
  ["Food", "FOOD"],
  ["Graphics", "GR"],
  ["Insurance", "INS"],
  ["Launch", "LA"],
  ["Lawyers", "LAW"],
  ["Logistics", "LOG"],
  ["Musical Ents", "ME"],
  ["Non-musical Ents", "NME"],
  ["Personnel", "PER"],
  ["Production", "PROD"],
  ["Security", "SEC"],
  ["Ticketing", "TIX"],
  ["Web", "WEB"],
  ["Welfare", "WEL"],
] as const;

function Message({ error, saved }: { error?: string; saved?: boolean }) {
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

  return null;
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
      <div className="grid gap-3 md:grid-cols-[1fr_8rem_7rem]">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            name="name"
            required
            defaultValue={department?.name}
            className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Code</span>
          <input
            name="code"
            required
            defaultValue={department?.code}
            className="rounded-md border bg-background px-3 py-2 uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Order</span>
          <input
            name="displayOrder"
            type="number"
            min="0"
            defaultValue={department?.display_order ?? 0}
            className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-[10rem_1fr]">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Colour</span>
          <input
            name="colour"
            placeholder="#336699"
            defaultValue={department?.colour ?? ""}
            className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
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
}: {
  eventId: string;
  departments: Department[];
  canManage: boolean;
  readOnly: boolean;
  error?: string;
  saved?: boolean;
}) {
  const existingCodes = new Set(departments.map((department) => department.code));
  const remainingTemplate = DEFAULT_DEPARTMENT_TEMPLATE.filter(
    ([, code]) => !existingCodes.has(code),
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

      <Message error={error} saved={saved} />

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
        <div className="grid gap-3">
          {departments.map((department) => (
            <section key={department.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">{department.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {department.description || "No description"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{department.code}</Badge>
                  <Badge variant={department.is_active ? "default" : "secondary"}>
                    {department.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {canManage ? (
                <div className="mt-4">
                  <DepartmentForm eventId={eventId} department={department} />
                </div>
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
            These defaults come from the product specification and remain editable after creation.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {remainingTemplate.map(([name, code], index) => (
              <form key={code} action={saveDepartmentAction} className="rounded-md border p-3">
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="displayOrder" value={departments.length + index + 1} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{code}</p>
                  </div>
                  <SubmitButton pendingLabel="Adding..." variant="outline">
                    Add
                  </SubmitButton>
                </div>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
