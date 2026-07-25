import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActivityFeedRow } from "@/lib/activity/data";

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function dateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function actor(row: ActivityFeedRow) {
  return row.actor_preferred_name ?? row.actor_display_name ?? "System";
}

export function ActivityPanel({
  rows,
  count,
  page,
  pageSize,
  error,
  readOnly,
}: {
  rows: ActivityFeedRow[];
  count: number;
  page: number;
  pageSize: number;
  error?: string;
  readOnly: boolean;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal">
          <History className="h-6 w-6" aria-hidden="true" />
          Activity
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Append-only event activity filtered by your database permissions. Private draft entries remain hidden from ordinary committee members.
        </p>
      </div>
      {error ? <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</div> : null}
      {readOnly ? <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Historical event activity is read-only.</div> : null}
      <form className="grid gap-3 rounded-md border p-4 md:grid-cols-5">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Category</span>
          <select name="category" defaultValue="all" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="all">All categories</option>
            {["event","budget","revenue","request","payment","document","department","member","invitation"].map((category) => <option key={category} value={category}>{label(category)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Action contains</span>
          <input name="action" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">From</span>
          <input name="fromDate" type="date" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">To</span>
          <input name="toDate" type="date" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </label>
        <div className="self-end">
          <Button type="submit" variant="outline">Filter</Button>
        </div>
      </form>

      <section className="rounded-md border p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Event history</h2>
          <p className="text-sm text-muted-foreground">Showing {rows.length} of {count}</p>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No activity is visible for the selected filters.</p>
        ) : (
          <ol className="grid gap-3">
            {rows.map((row) => (
              <li key={row.activity_id} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <p className="font-medium">{row.summary}</p>
                  <p className="text-muted-foreground">{dateTime(row.created_at)}</p>
                </div>
                <p className="mt-1 text-muted-foreground">{actor(row)} · {label(row.action)} · {label(row.visibility)}</p>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {page > 1 ? <Button asChild variant="outline"><a href={`?page=${page - 1}`}>Previous</a></Button> : null}
          {page * pageSize < count ? <Button asChild variant="outline"><a href={`?page=${page + 1}`}>Next</a></Button> : null}
        </div>
      </section>
    </div>
  );
}
