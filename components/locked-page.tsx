import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function LockedPage({
  title = "Access restricted",
  description,
  requiredRole,
  backHref,
}: {
  title?: string;
  description: string;
  requiredRole?: string;
  backHref: string;
}) {
  return (
    <div className="rounded-md border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          {requiredRole ? (
            <p className="mt-3 text-sm font-medium text-slate-800">
              Required role: {requiredRole}
            </p>
          ) : null}
          <Link
            href={backHref}
            className="mt-5 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketing-brand))]"
          >
            Back to event
          </Link>
        </div>
      </div>
    </div>
  );
}
