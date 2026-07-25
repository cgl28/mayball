import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportDefinitions } from "@/lib/exports/csv";

export function ExportsPanel({
  eventId,
  readOnly,
}: {
  eventId: string;
  readOnly: boolean;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">CSV exports</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Exports are generated from RLS-filtered database tables and views. Monetary columns are labelled as minor units or exact decimal values.
        </p>
      </div>
      {readOnly ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Historical exports are read-only and do not reopen the event.
        </div>
      ) : null}
      <section className="grid gap-3">
        {exportDefinitions.map((definition) => (
          <div key={definition.slug} className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-medium">{definition.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{definition.description}</p>
              {definition.slug === "ticket-snapshot-history" ? (
                <p className="mt-1 text-sm font-medium text-amber-700">Snapshots are cumulative history rows; do not add them together.</p>
              ) : null}
            </div>
            <Button asChild variant="outline">
              <Link href={`/events/${eventId}/exports/${definition.slug}`}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </Link>
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
