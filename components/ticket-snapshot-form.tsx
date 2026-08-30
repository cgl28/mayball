"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { recordTicketSnapshotAction } from "@/app/events/[eventId]/revenue/actions";
import { FinancialField } from "@/components/financial-field";
import { SubmitButton } from "@/components/submit-button";
import { formatMinor, parseMoneyToMinor } from "@/lib/money";
import type { TicketForecastPosition } from "@/lib/revenue/data";

const snapshotSources = ["manual_ticket_tailor", "manual_other", "ticket_tailor_api", "csv_import"] as const;

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function totalMinor(values: Record<string, string>) {
  try {
    return Object.values(values).reduce((total, value) => total + (value.trim() ? parseMoneyToMinor(value) : 0), 0);
  } catch {
    return null;
  }
}

function totalQuantity(values: Record<string, string>) {
  let total = 0;
  for (const value of Object.values(values)) {
    if (!value.trim()) continue;
    if (!/^\d+$/.test(value)) return null;
    total += Number(value);
  }
  return total;
}

export function TicketSnapshotForm({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: TicketForecastPosition[];
}) {
  const [ticketsSold, setTicketsSold] = useState("");
  const [grossSales, setGrossSales] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [grossByTicket, setGrossByTicket] = useState<Record<string, string>>({});

  const breakdown = useMemo(() => {
    const quantity = totalQuantity(quantities);
    const gross = totalMinor(grossByTicket);
    const started = ticketTypes.some((ticket) => {
      const id = ticket.ticket_type_id ?? "";
      return Boolean(quantities[id]?.trim() || grossByTicket[id]?.trim());
    });
    const complete = !started || ticketTypes.every((ticket) => {
      const id = ticket.ticket_type_id ?? "";
      return Boolean(quantities[id]?.trim() && grossByTicket[id]?.trim());
    });
    let headlineGross: number | null = null;
    try {
      headlineGross = grossSales.trim() ? parseMoneyToMinor(grossSales) : null;
    } catch {
      headlineGross = null;
    }
    const headlineQuantity = /^\d+$/.test(ticketsSold) ? Number(ticketsSold) : null;
    return {
      started,
      complete,
      quantity,
      gross,
      matches: started && complete && quantity !== null && gross !== null && headlineQuantity === quantity && headlineGross === gross,
    };
  }, [grossByTicket, grossSales, quantities, ticketTypes, ticketsSold]);

  return (
    <form action={recordTicketSnapshotAction} className="mt-4 grid gap-5">
      <input type="hidden" name="eventId" value={eventId} />

      <div className="grid gap-4 md:grid-cols-3">
        <Field name="capturedAt" label="Snapshot date and time" type="datetime-local" required />
        <Field
          name="ticketsSold"
          label="Total tickets sold to date"
          type="number"
          min="0"
          value={ticketsSold}
          onChange={(event) => setTicketsSold(event.target.value)}
        />
        <FinancialField
          kind="gross"
          name="grossSales"
          label="Gross ticket income to date"
          placeholder="135000.00"
          required
          value={grossSales}
          onChange={(event) => setGrossSales(event.target.value)}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        This is a cumulative position, not an individual sale. The latest non-void snapshot becomes Actual Ticket Income; earlier snapshots are never added together.
      </p>

      <details className="rounded-md border p-4">
        <summary className="cursor-pointer text-sm font-medium">Optional ticket-type breakdown</summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep this blank for a valid total-only snapshot. If you use it, complete every row and make its totals match the headline totals above.
        </p>
        <div className="mt-4 grid gap-3">
          {ticketTypes.map((ticket) => {
            const id = ticket.ticket_type_id ?? "";
            return (
              <div key={id} className="grid min-w-0 gap-3 rounded-md bg-muted/30 p-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem] md:items-end">
                <input type="hidden" name="ticketTypeId" value={id} />
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{ticket.name}</p>
                  <p className="mt-1 text-muted-foreground">{formatMinor(ticket.gross_price_minor)} gross each · {ticket.forecast_quantity ?? 0} forecast of {ticket.maximum_quantity ?? 0} available</p>
                </div>
                <Field
                  name={`quantity_${id}`}
                  label="Cumulative quantity"
                  type="number"
                  min="0"
                  value={quantities[id] ?? ""}
                  onChange={(event) => setQuantities((current) => ({ ...current, [id]: event.target.value }))}
                />
                <FinancialField
                  kind="gross"
                  name={`gross_${id}`}
                  label="Cumulative gross"
                  placeholder="0.00"
                  value={grossByTicket[id] ?? ""}
                  onChange={(event) => setGrossByTicket((current) => ({ ...current, [id]: event.target.value }))}
                />
              </div>
            );
          })}
        </div>
        {breakdown.started ? (
          <div className="mt-4 rounded-md border bg-background p-3 text-sm">
            <p className="font-medium">Breakdown totals</p>
            <p className="mt-1 text-muted-foreground">
              {breakdown.quantity ?? "Invalid"} tickets · {breakdown.gross === null ? "Invalid gross value" : `${formatMinor(breakdown.gross)} gross`}
            </p>
            <p role={breakdown.matches ? undefined : "alert"} className={`mt-2 ${breakdown.matches ? "text-emerald-800" : "text-amber-900"}`}>
              {breakdown.matches ? "Breakdown matches the headline totals." : "Complete every row and make its totals match the headline snapshot before saving."}
            </p>
          </div>
        ) : null}
      </details>

      <details className="rounded-md border p-4">
        <summary className="cursor-pointer text-sm font-medium">Additional snapshot detail</summary>
        <p className="mt-2 text-sm text-muted-foreground">Net and VAT are optional and are not derived from aggregate gross income because ticket types can have different VAT treatments.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FinancialField kind="net" name="netSales" label="Net ticket income to date" placeholder="112500.00" />
          <FinancialField kind="vat" name="vatSales" label="VAT to date" placeholder="22500.00" />
          <Field name="refunds" label="Refunds to date" placeholder="250.00" defaultValue="0.00" />
          <Field name="bookingFees" label="Booking fees to date" placeholder="2700.00" defaultValue="0.00" />
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Source</span>
            <select name="source" defaultValue="manual_ticket_tailor" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {snapshotSources.map((source) => <option key={source} value={source}>{formatLabel(source)}</option>)}
            </select>
          </label>
          <Field name="notes" label="Notes" />
        </div>
      </details>

      <div><SubmitButton pendingLabel="Recording snapshot...">Record cumulative snapshot</SubmitButton></div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  min,
  placeholder,
  defaultValue,
  required,
  value,
  onChange,
}: {
  name: string;
  label: string;
  type?: string;
  min?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        min={min}
        placeholder={placeholder}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        required={required}
        onChange={onChange}
        className="w-full max-w-full rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1"
      />
    </label>
  );
}
