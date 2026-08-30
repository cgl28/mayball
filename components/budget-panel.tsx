import Link from "next/link";
import { AlertCircle, CheckCircle, History, Plus } from "lucide-react";
import { activateBudgetVersionAction, transferContingencyAction } from "@/app/events/[eventId]/budget/actions";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AllocationDonut } from "@/components/financial-visuals";
import type { BudgetOverview } from "@/lib/budget/data";
import { formatMinor } from "@/lib/money";

function DepartmentBudgetUse({
  eventId,
  position,
}: {
  eventId: string;
  position: BudgetOverview["departmentFinancialPositions"][number];
}) {
  const allocation = Number(position.current_budget_minor ?? 0);
  const approved = Number(position.approved_net_minor ?? 0);
  const submitted = Number(position.pending_net_minor ?? 0);
  const remaining = Math.max(0, Number(position.potential_remaining_minor ?? 0));
  const overBudget = Math.max(0, -Number(position.potential_remaining_minor ?? 0));
  const barTotal = Math.max(allocation, approved + submitted, 1);
  const segments = [
    { label: "Approved commitments", amount: approved, className: "bg-emerald-500" },
    { label: "Submitted / potential", amount: submitted, className: "bg-amber-400" },
    { label: "Remaining budget", amount: remaining, className: "bg-slate-300" },
  ].filter((segment) => segment.amount > 0);

  return (
    <div className="rounded-md border bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{position.department_name} <span className="text-muted-foreground">{position.department_code}</span></h3>
          <p className="mt-1 text-sm text-muted-foreground">Current allocation {formatMinor(allocation)} net</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/events/${eventId}/finances?department=${position.department_id}`}>View in Finances</Link>
        </Button>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200" aria-label={`${position.department_name} budget use`}>
        <div className="flex h-full min-w-full">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className={segment.className}
              style={{ width: `${(segment.amount / barTotal) * 100}%` }}
              title={`${segment.label}: ${formatMinor(segment.amount)}`}
            />
          ))}
          {overBudget > 0 ? <div className="bg-red-500" style={{ width: `${(overBudget / barTotal) * 100}%` }} title={`Potential over-budget: ${formatMinor(overBudget)}`} /> : null}
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div><dt className="text-muted-foreground">Approved commitments</dt><dd className="font-medium text-emerald-800">{formatMinor(approved)}</dd></div>
        <div><dt className="text-muted-foreground">Submitted / potential</dt><dd className="font-medium text-amber-800">{formatMinor(submitted)}</dd></div>
        <div><dt className="text-muted-foreground">Remaining budget</dt><dd className="font-medium">{formatMinor(remaining)}</dd></div>
        {overBudget > 0 ? <div><dt className="text-red-700">Potential over-budget</dt><dd className="font-medium text-red-800">{formatMinor(overBudget)}</dd></div> : null}
      </dl>
    </div>
  );
}

function Message({
  error,
  activated,
  transferred,
}: {
  error?: string;
  activated?: boolean;
  transferred?: boolean;
}) {
  if (error) {
    return (
      <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }
  if (activated || transferred) {
    return (
      <div className="flex gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        <CheckCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{activated ? "Budget activated." : "Contingency transfer recorded."}</p>
      </div>
    );
  }
  return null;
}

export function BudgetPanel({
  eventId,
  budget,
  canManage,
  readOnly,
  error,
  activated,
  transferred,
  transferHistoryLoaded,
}: {
  eventId: string;
  budget: BudgetOverview;
  canManage: boolean;
  readOnly: boolean;
  error?: string;
  activated?: boolean;
  transferred?: boolean;
  transferHistoryLoaded?: boolean;
}) {
  const active = budget.activeBudget;
  const departmentById = new Map(budget.departments.map((department) => [department.id, department]));
  const departmentColours = new Map(budget.departments.map((department) => [department.id, department.colour]));
  const fallbackColours = ["#6AAED6", "#7CC7A2", "#F2C572", "#E99292", "#A7B4D6", "#B9A6D3", "#89C5C7", "#D8A36F"];
  const allocationSegments = active
    ? [
        ...budget.departmentPositions.map((position, index) => ({
          key: position.department_id ?? `department-${index}`,
          label: position.department_name ?? "Unnamed department",
          amountMinor: Number(position.current_budget_minor ?? 0),
          colour:
            (position.department_id ? departmentColours.get(position.department_id) : null) ??
            fallbackColours[index % fallbackColours.length],
        })),
        {
          key: "contingency",
          label: "Unallocated contingency",
          amountMinor: Number(active.unallocated_contingency_minor ?? 0),
          colour: "#cbd5e1",
        },
      ]
    : [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Budget and contingency</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage budget versions, original department allocations and
            contingency transfers. Spending and revenue are not included here.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href={`/events/${eventId}/budget/new`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New draft budget
            </Link>
          </Button>
        ) : null}
      </div>

      <Message error={error} activated={activated} transferred={transferred} />

      {readOnly ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          This historical event is read-only. Budget records are shown for reference.
        </div>
      ) : null}

      {!active ? (
        <section className="rounded-md border border-dashed p-6">
          <h2 className="font-medium">No active budget</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A treasurer must create and activate a budget before committee
            members see active budget totals.
          </p>
          {canManage ? (
            <Button asChild className="mt-4">
              <Link href={`/events/${eventId}/budget/new`}>Create draft budget</Link>
            </Button>
          ) : null}
        </section>
      ) : (
        <>
          <section className="rounded-md border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">
                  Active budget v{active.version_number}: {active.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Effective {active.effective_date ?? "date not set"}
                </p>
              </div>
              <Badge>{active.status}</Badge>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm text-muted-foreground">Original departments</dt>
                <dd className="text-lg font-semibold">{formatMinor(active.total_department_original_minor)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Original contingency</dt>
                <dd className="text-lg font-semibold">{formatMinor(active.original_contingency_minor)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Unallocated contingency</dt>
                <dd className="text-lg font-semibold">{formatMinor(active.unallocated_contingency_minor)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Total cost budget</dt>
                <dd className="text-lg font-semibold">{formatMinor(active.total_cost_budget_minor)}</dd>
              </div>
            </dl>
          </section>

          <AllocationDonut
            title="Budget allocation by department"
            description="Current active net budget split across departments, with unallocated contingency kept as a reserve."
            totalMinor={Number(active.total_cost_budget_minor ?? 0)}
            centreLabel="Total event budget"
            segments={allocationSegments}
          />

          <section className="rounded-md border p-5">
            <h2 className="font-medium">Department budgets</h2>
            <div className="mt-4 max-w-full overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Department</th>
                    <th className="py-2 pr-4 font-medium">Code</th>
                    <th className="py-2 pr-4 text-right font-medium">Original allocation</th>
                    <th className="py-2 pr-4 text-right font-medium">Transfers received</th>
                    <th className="py-2 pr-4 text-right font-medium">Transfers released</th>
                    <th className="py-2 text-right font-medium">Current budget</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.departmentPositions.map((position) => (
                    <tr key={position.department_id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">{position.department_name}</td>
                      <td className="py-3 pr-4">{position.department_code}</td>
                      <td className="py-3 pr-4 text-right">{formatMinor(position.original_allocation_minor)}</td>
                      <td className="py-3 pr-4 text-right">{formatMinor(position.transfers_received_minor)}</td>
                      <td className="py-3 pr-4 text-right">{formatMinor(position.transfers_released_minor)}</td>
                      <td className="py-3 text-right font-medium">{formatMinor(position.current_budget_minor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-md border p-5">
            <h2 className="font-medium">Department allocation and budget use</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Net basis. Approved commitments include paid and unpaid amounts; use Finances for the payment split.
            </p>
            <div className="mt-4 grid gap-3">
              {budget.departmentFinancialPositions.filter((position) => position.has_active_allocation).map((position) => (
                <DepartmentBudgetUse key={position.department_id} eventId={eventId} position={position} />
              ))}
              {budget.departmentFinancialPositions.every((position) => !position.has_active_allocation) ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No department has an active allocation yet.</p>
              ) : null}
            </div>
          </section>
        </>
      )}

      {canManage && active ? (
        <section className="rounded-md border p-5">
          <h2 className="font-medium">Transfer contingency</h2>
          <form action={transferContingencyAction} className="mt-4 grid gap-4 md:grid-cols-[1fr_10rem_1fr_auto] md:items-end">
            <input type="hidden" name="eventId" value={eventId} />
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Destination department</span>
              <select name="departmentId" required className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {budget.departmentPositions.map((position) => (
                  <option key={position.department_id} value={position.department_id ?? ""}>
                    {position.department_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Amount</span>
              <input name="amount" required placeholder="1000.00" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Reason</span>
              <input name="reason" required className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </label>
            <SubmitButton pendingLabel="Transferring...">Record transfer</SubmitButton>
          </form>
        </section>
      ) : null}

      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <History className="h-4 w-4" aria-hidden="true" />
          Budget versions
        </h2>
        <div className="mt-4 grid gap-3">
          {budget.versions.map((version) => (
            <div key={version.budget_version_id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">v{version.version_number}: {version.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Total {formatMinor(version.total_cost_budget_minor)} including {formatMinor(version.original_contingency_minor)} contingency
                  </p>
                </div>
                <Badge variant={version.status === "active" ? "default" : "secondary"}>{version.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {canManage && version.status === "draft" ? (
                  <Button asChild variant="outline">
                    <Link href={`/events/${eventId}/budget/versions/${version.budget_version_id}/edit`}>Edit draft</Link>
                  </Button>
                ) : null}
                {canManage && version.status === "draft" ? (
                  <form action={activateBudgetVersionAction}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="budgetVersionId" value={version.budget_version_id ?? ""} />
                    <SubmitButton pendingLabel="Activating..." variant="outline">Activate</SubmitButton>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
          {budget.versions.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No budget versions have been created.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Transfer history</h2>
        {!transferHistoryLoaded ? (
          <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <p>Transfer history is loaded on request so the Budget page opens quickly.</p>
            <Button asChild variant="outline" className="mt-3">
              <Link href={`/events/${eventId}/budget?transfers=1`}>View transfer history</Link>
            </Button>
          </div>
        ) : (
        <div className="mt-4 grid gap-3">
          {(budget.transfers ?? []).map((transfer) => {
            const destination = transfer.to_department_id ? departmentById.get(transfer.to_department_id) : null;
            return (
              <div key={transfer.id} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <p className="font-medium">{formatMinor(transfer.amount_minor)} to {destination?.name ?? "Event contingency"}</p>
                  <p className="text-muted-foreground">{new Intl.DateTimeFormat("en-GB").format(new Date(transfer.effective_at))}</p>
                </div>
                <p className="mt-1 text-muted-foreground">{transfer.reason}</p>
              </div>
            );
          })}
          {(budget.transfers ?? []).length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No contingency transfers have been recorded.
            </p>
          ) : null}
        </div>
        )}
      </section>
    </div>
  );
}
