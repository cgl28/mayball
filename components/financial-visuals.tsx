import { formatMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

type Tone = "paid" | "approvedUnpaid" | "potential" | "remaining" | "reserve" | "neutral";

const segmentStyles: Record<
  Tone,
  { bar: string; card: string; swatch: string; label: string }
> = {
  paid: {
    bar: "bg-emerald-200",
    card: "border-emerald-300 bg-emerald-50 text-emerald-950",
    swatch: "border-emerald-500 bg-emerald-200",
    label: "text-emerald-900",
  },
  approvedUnpaid: {
    bar: "bg-sky-200",
    card: "border-sky-300 bg-sky-50 text-sky-950",
    swatch: "border-sky-500 bg-sky-200",
    label: "text-sky-900",
  },
  potential: {
    bar: "bg-amber-200",
    card: "border-amber-300 bg-amber-50 text-amber-950",
    swatch: "border-amber-500 bg-amber-200",
    label: "text-amber-900",
  },
  remaining: {
    bar: "bg-cyan-100",
    card: "border-cyan-200 bg-cyan-50 text-cyan-950",
    swatch: "border-cyan-400 bg-cyan-100",
    label: "text-cyan-900",
  },
  reserve: {
    bar: "bg-slate-200",
    card: "border-slate-300 bg-slate-50 text-slate-900",
    swatch: "border-slate-400 bg-slate-200",
    label: "text-slate-800",
  },
  neutral: {
    bar: "bg-slate-100",
    card: "border-slate-200 bg-white text-slate-900",
    swatch: "border-slate-300 bg-slate-100",
    label: "text-slate-700",
  },
};

export type FinancialBarSegment = {
  key: string;
  label: string;
  amountMinor: number;
  tone: Tone;
  description?: string;
};

function percentage(amount: number, total: number) {
  if (total <= 0 || amount <= 0) return 0;
  return Math.max(0, (amount / total) * 100);
}

export function StackedFinancialBar({
  title,
  description,
  basis,
  totalMinor,
  segments,
  overspendMinor = 0,
}: {
  title: string;
  description: string;
  basis: string;
  totalMinor: number;
  segments: FinancialBarSegment[];
  overspendMinor?: number;
}) {
  const denominator = Math.max(totalMinor, segments.reduce((sum, segment) => sum + Math.max(0, segment.amountMinor), 0));

  return (
    <section className="rounded-md border bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {basis}
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-full border bg-slate-100" aria-label={title}>
        <div className="flex h-4 w-full">
          {segments.map((segment) => {
            const width = percentage(segment.amountMinor, denominator);
            const styles = segmentStyles[segment.tone];
            return (
              <div
                key={segment.key}
                data-segment={segment.key}
                className={cn("h-full shrink-0", styles.bar)}
                style={{ flexBasis: `${width}%`, width: `${width}%` }}
                title={`${segment.label}: ${formatMinor(segment.amountMinor)}`}
              />
            );
          })}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 text-sm">
        {segments.map((segment) => {
          const styles = segmentStyles[segment.tone];
          return (
            <div key={segment.key} className={cn("min-w-0 rounded-md border p-3", styles.card)}>
              <dt className={cn("flex items-center gap-2", styles.label)}>
                <span className={cn("h-2.5 w-2.5 rounded-full border", styles.swatch)} aria-hidden="true" />
                {segment.label}
              </dt>
              <dd className="mt-1 font-semibold">{formatMinor(segment.amountMinor)}</dd>
              <dd className="text-xs opacity-80">
                {percentage(segment.amountMinor, denominator).toFixed(1)}%
                {segment.description ? `; ${segment.description}` : ""}
              </dd>
            </div>
          );
        })}
      </dl>
      {overspendMinor > 0 ? (
        <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          Commitments exceed the budget shown here by {formatMinor(overspendMinor)}.
        </div>
      ) : null}
    </section>
  );
}

export type DonutSegment = {
  key: string;
  label: string;
  amountMinor: number;
  colour: string;
};

function polarToCartesian(radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(radians),
    y: 50 + radius * Math.sin(radians),
  };
}

function arcPath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(38, endAngle);
  const end = polarToCartesian(38, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A 38 38 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function AllocationDonut({
  title,
  description,
  totalMinor,
  segments,
  centreLabel,
}: {
  title: string;
  description: string;
  totalMinor: number;
  segments: DonutSegment[];
  centreLabel: string;
}) {
  let cursor = 0;

  return (
    <section className="rounded-md border bg-white p-5">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-64">
          <svg viewBox="0 0 100 100" role="img" aria-label={title} className="h-full w-full">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="14" />
            {segments
              .filter((segment) => segment.amountMinor > 0 && totalMinor > 0)
              .map((segment) => {
                const start = cursor;
                const angle = (segment.amountMinor / totalMinor) * 360;
                cursor += angle;
                return (
                  <path
                    key={segment.key}
                    d={arcPath(start, cursor)}
                    fill="none"
                    stroke={segment.colour}
                    strokeWidth="14"
                    strokeLinecap="butt"
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">{centreLabel}</p>
            <p className="text-lg font-semibold">{formatMinor(totalMinor)}</p>
          </div>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {segments.map((segment) => (
            <div key={segment.key} className="flex min-w-0 items-center justify-between gap-3 rounded-md border p-3">
              <dt className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full border"
                  style={{ backgroundColor: segment.colour }}
                  aria-hidden="true"
                />
                <span className="truncate" title={segment.label}>{segment.label}</span>
              </dt>
              <dd className="shrink-0 font-medium">{formatMinor(segment.amountMinor)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
