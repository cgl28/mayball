"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { saveBudgetVersionAction } from "@/app/events/[eventId]/budget/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import type { BudgetAllocation, BudgetDepartment, PreviousBudgetContext } from "@/lib/budget/data";
import { compareAllocation } from "@/lib/budget/allocation-comparison";
import { minorToInput, sumMinor, formatMinor, parseMoneyToMinor } from "@/lib/money";

type EditableVersion = {
  id: string;
  event_id: string;
  version_number: number;
  name: string;
  status: string;
  effective_date: string | null;
  original_contingency_minor: number;
  notes: string | null;
};

export function BudgetEditor({
  eventId,
  departments,
  version,
  allocations,
  previousBudget,
  error,
  saved,
  created,
}: {
  eventId: string;
  departments: BudgetDepartment[];
  version?: EditableVersion;
  allocations?: BudgetAllocation[];
  previousBudget?: PreviousBudgetContext | null;
  error?: string;
  saved?: boolean;
  created?: boolean;
}) {
  const allocationByDepartment = new Map(
    (allocations ?? []).map((allocation) => [allocation.department_id, allocation]),
  );
  const previousAllocationByDepartment = new Map(
    previousBudget?.allocations.map((allocation) => [allocation.department_id, allocation]) ?? [],
  );
  const initialTotal = sumMinor(
    departments.map(
      (department) => allocationByDepartment.get(department.id)?.original_net_minor ?? 0,
    ),
  );
  const contingency = BigInt(version?.original_contingency_minor ?? 0);
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>(() => Object.fromEntries(
    departments.map((department) => [department.id, minorToInput(allocationByDepartment.get(department.id)?.original_net_minor ?? 0)]),
  ));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">
          {version ? `Edit draft budget v${version.version_number}` : "Create draft budget"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Draft budgets can be saved without activation. Activation is a separate
          treasurer confirmation step from the budget overview.
        </p>
      </div>

      {error ? (
        <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}
      {saved || created ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
          {created ? "Draft budget created." : "Draft budget saved."}
        </div>
      ) : null}

      {version && version.status !== "draft" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          This budget version is {version.status} and cannot be edited.
        </div>
      ) : (
        <form action={saveBudgetVersionAction} className="grid gap-6">
          <input type="hidden" name="eventId" value={eventId} />
          {version ? <input type="hidden" name="budgetVersionId" value={version.id} /> : null}

          <section className="rounded-md border p-5">
            <h2 className="font-medium">Version details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Budget name</span>
                <input name="name" required defaultValue={version?.name ?? ""} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Effective date</span>
                <input name="effectiveDate" type="date" defaultValue={version?.effective_date ?? ""} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Event contingency</span>
                <input name="contingency" required defaultValue={minorToInput(version?.original_contingency_minor ?? 0)} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-medium">Notes</span>
                <textarea name="notes" defaultValue={version?.notes ?? ""} rows={3} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </label>
            </div>
          </section>

          <section className="rounded-md border p-5">
            <h2 className="font-medium">Department allocations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {previousBudget
                ? `Compare each proposed net allocation with v${previousBudget.versionNumber}: ${previousBudget.name}.`
                : "This is the first budget version. Use 0.00 for departments that intentionally have no allocation."}
            </p>
            <div className="mt-4 grid gap-3">
              {departments.map((department) => {
                const previousAllocation = previousAllocationByDepartment.get(department.id);
                const proposedValue = allocationInputs[department.id] ?? "0.00";
                let proposedMinor: number | null = null;
                try {
                  proposedMinor = parseMoneyToMinor(proposedValue);
                } catch {
                  proposedMinor = null;
                }
                const previousMinor = previousAllocation?.original_net_minor ?? null;
                const comparison = proposedMinor === null ? null : compareAllocation(previousMinor, proposedMinor);
                return (
                  <div key={department.id} className="grid gap-3 rounded-md border bg-slate-50/70 p-3 text-sm lg:grid-cols-[minmax(10rem,1fr)_minmax(9rem,0.8fr)_12rem_minmax(10rem,0.9fr)] lg:items-center">
                    <div>
                      <p className="font-medium">{department.name} <span className="text-muted-foreground">{department.code}</span></p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Previous</p>
                      <p className="mt-1 font-medium">
                        {previousMinor === null ? (previousBudget ? "New department" : "No earlier budget") : formatMinor(previousMinor)}
                      </p>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-sky-900">Proposed net</span>
                      <input type="hidden" name="departmentId" value={department.id} />
                      <input
                        name={`allocation_${department.id}`}
                        required
                        value={proposedValue}
                        onChange={(event) => setAllocationInputs((current) => ({ ...current, [department.id]: event.target.value }))}
                        className="w-full rounded-md border border-sky-200 bg-sky-50/70 px-3 py-2 text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-700"
                      />
                    </label>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Change</p>
                      {comparison === null ? (
                        <p className="mt-1 text-muted-foreground">Enter a valid amount</p>
                      ) : comparison.changeMinor === null ? (
                        <p className="mt-1 text-muted-foreground">No prior allocation</p>
                      ) : comparison.changeMinor === 0 ? (
                        <p className="mt-1 text-muted-foreground">No change</p>
                      ) : (
                        <p className="mt-1 font-medium text-slate-800">
                          {comparison.changeMinor > 0 ? "+" : "−"}{formatMinor(Math.abs(comparison.changeMinor))}
                          {comparison.percentageChange ? ` (${comparison.changeMinor > 0 ? "+" : "−"}${comparison.percentageChange})` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {departments.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Create departments before creating a budget.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-md border p-5">
            <h2 className="font-medium">Review totals</h2>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Current saved department total</dt>
                <dd className="font-medium">{formatMinor(initialTotal)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Current saved contingency</dt>
                <dd className="font-medium">{formatMinor(contingency)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Current saved total budget</dt>
                <dd className="font-medium">{formatMinor(initialTotal + contingency)}</dd>
              </div>
            </dl>
          </section>

          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingLabel="Saving draft...">Save draft</SubmitButton>
            <Button asChild variant="outline">
              <Link href={`/events/${eventId}/budget`}>Cancel</Link>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
