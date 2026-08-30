"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveTicketTypeAction } from "@/app/events/[eventId]/revenue/actions";
import { SubmitButton } from "@/components/submit-button";
import { TicketTypeForecastFields, type TicketTypeForecastInitialValues } from "@/components/ticket-type-forecast-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMinor, minorToInput } from "@/lib/money";
import type { TicketForecastPosition } from "@/lib/revenue/data";

function TicketTypeForm({
  eventId,
  ticket,
  onCancel,
}: {
  eventId: string;
  ticket?: TicketForecastPosition;
  onCancel?: () => void;
}) {
  const editing = Boolean(ticket);
  const initial: TicketTypeForecastInitialValues | undefined = ticket ? {
    name: ticket.name ?? "",
    description: ticket.description ?? undefined,
    grossPrice: minorToInput(ticket.gross_price_minor),
    maximumQuantity: String(ticket.maximum_quantity ?? 0),
    forecastQuantity: String(ticket.forecast_quantity ?? 0),
    vatTreatment: ticket.vat_treatment ?? undefined,
    vatRate: ticket.vat_rate === null ? "" : String(ticket.vat_rate),
    complimentaryQuantity: String(ticket.complimentary_quantity ?? 0),
    displayOrder: String(ticket.display_order ?? 0),
    isActive: ticket.is_active ?? true,
  } : undefined;

  return (
    <form action={saveTicketTypeAction} className="mt-4 grid gap-4 md:grid-cols-3">
      <input type="hidden" name="eventId" value={eventId} />
      {ticket?.ticket_type_id ? <input type="hidden" name="ticketTypeId" value={ticket.ticket_type_id} /> : null}
      <TicketTypeForecastFields initial={initial} />
      <div className="flex flex-wrap gap-2 md:self-end">
        <SubmitButton pendingLabel="Saving ticket...">{editing ? "Save ticket changes" : "Save ticket type"}</SubmitButton>
        {onCancel ? <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button> : null}
      </div>
    </form>
  );
}

export function TicketTypeEditor({
  eventId,
  ticket,
  canEdit = true,
}: {
  eventId: string;
  ticket: TicketForecastPosition;
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-md border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{ticket.name ?? "Ticket type"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gross {formatMinor(ticket.gross_price_minor)} · {ticket.forecast_quantity ?? 0} forecast of {ticket.maximum_quantity ?? 0} available
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.vat_treatment?.replaceAll("_", " ") ?? "VAT not set"} · Forecast revenue {formatMinor(ticket.forecast_gross_minor)} gross</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ticket.is_active ? "default" : "secondary"}>{ticket.is_active ? "Active" : "Inactive"}</Badge>
          {canEdit && !editing ? <Button type="button" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button> : null}
        </div>
      </div>
      {canEdit && editing ? <TicketTypeForm eventId={eventId} ticket={ticket} onCancel={() => setEditing(false)} /> : null}
    </section>
  );
}

export function NewTicketTypeForm({ eventId }: { eventId: string }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="rounded-md border p-5">
      {!adding ? (
        <Button type="button" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add ticket type
        </Button>
      ) : (
        <>
          <h3 className="flex items-center gap-2 font-medium"><Plus className="h-4 w-4" aria-hidden="true" />Add ticket type</h3>
          <p className="mt-2 text-sm text-muted-foreground">Enter the current price, capacity and forecast. Net and VAT are derived from gross when you save.</p>
          <TicketTypeForm eventId={eventId} onCancel={() => setAdding(false)} />
        </>
      )}
    </section>
  );
}
