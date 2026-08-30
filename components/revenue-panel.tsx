import Link from "next/link";
import { AlertCircle, CheckCircle, History, Plus, ReceiptText, Tags, TrendingUp } from "lucide-react";
import {
  recordTicketSnapshotAction,
  saveOtherRevenueAction,
  saveTicketTypeAction,
} from "@/app/events/[eventId]/revenue/actions";
import { SubmitButton } from "@/components/submit-button";
import { FinancialField, type FinancialFieldKind } from "@/components/financial-field";
import { TicketTypeForecastFields } from "@/components/ticket-type-forecast-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  actualAsForecastPercentage,
  financialTerminology,
  formatPercentage,
} from "@/lib/financial-terminology";
import type {
  OtherRevenueItem,
  RevenueOverview,
  RevenueOwner,
  TicketForecastPosition,
  TicketSnapshot,
  TicketSnapshotBreakdown,
} from "@/lib/revenue/data";
import { formatMinor, minorToInput } from "@/lib/money";

const vatTreatments = ["standard", "reduced", "zero_rated", "exempt", "outside_scope", "unknown"] as const;
const snapshotSources = ["manual_ticket_tailor", "manual_other", "ticket_tailor_api", "csv_import"] as const;
const revenueCategories = ["sponsorship", "college_contribution", "donation", "merchandise", "interest", "other"] as const;
const revenueStatuses = ["forecast", "confirmed", "part_received", "received", "cancelled"] as const;

function formatLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function dateTime(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not captured";
}

function ownerName(owners: RevenueOwner[], id: string | null | undefined) {
  if (!id) return "Unassigned";
  const owner = owners.find((profile) => profile.id === id);
  return owner?.preferred_name ?? owner?.display_name ?? "Assigned committee member";
}

function Message({
  error,
  saved,
  recorded,
}: {
  error?: string;
  saved?: boolean;
  recorded?: boolean;
}) {
  if (error) {
    return (
      <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }
  if (saved || recorded) {
    return (
      <div className="flex gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        <CheckCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{recorded ? "Ticket sales snapshot recorded." : "Revenue changes saved."}</p>
      </div>
    );
  }
  return null;
}

function MoneyStat({
  label,
  value,
}: {
  label: string;
  value: number | string | bigint | null | undefined;
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{formatMinor(value)}</dd>
    </div>
  );
}

function valueNumber(value: number | string | bigint | null | undefined) {
  return value === null || value === undefined ? 0 : Number(value);
}

function comparisonWidth(value: number, total: number) {
  if (total <= 0 || value <= 0) return 0;
  return Math.max(0, (value / total) * 100);
}

function formatSignedMinor(value: number | string | bigint | null | undefined) {
  if (value === null || value === undefined) return formatMinor(value);
  const numeric = value === null || value === undefined ? 0 : Number(value);
  if (numeric < 0) return `-${formatMinor(Math.abs(numeric))}`;
  return formatMinor(numeric);
}

function SummaryCard({
  label,
  value,
  basis,
  description,
}: {
  label: string;
  value: number | string | bigint | null | undefined;
  basis: string;
  description: string;
}) {
  return (
    <div className="rounded-md border bg-white p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-xl font-semibold">{formatSignedMinor(value)}</dd>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-cyan-800">{basis}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function RevenueNav({ eventId }: { eventId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <Link href={`/events/${eventId}/revenue`}>Overview</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={`/events/${eventId}/revenue/tickets`}>Ticket types</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={`/events/${eventId}/revenue/actual`}>Actual snapshots</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={`/events/${eventId}/revenue/other`}>Other revenue</Link>
      </Button>
    </div>
  );
}

export function RevenueOverviewPanel({
  eventId,
  revenue,
  canManage,
  readOnly,
  error,
}: {
  eventId: string;
  revenue: RevenueOverview;
  canManage: boolean;
  readOnly: boolean;
  error?: string;
}) {
  const summary = revenue.summary;
  const hasTicketTypes = revenue.ticketTypes.length > 0;
  const hasSnapshot = Boolean(summary?.latest_snapshot_id);
  const hasOther = revenue.otherItems.length > 0;
  const forecastGross = valueNumber(summary?.total_forecast_gross_minor);
  const actualGross = valueNumber(summary?.total_actual_gross_minor);
  const comparisonTotal = Math.max(forecastGross, actualGross);
  const grossVariance = actualGross - forecastGross;
  const actualAsForecast = actualAsForecastPercentage(actualGross, forecastGross);
  const hasActualIncome = actualGross !== 0;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Revenue</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ticket forecasts are editable planning assumptions. Actual ticket
            revenue is a cumulative snapshot history where the latest valid
            snapshot is the current position.
          </p>
        </div>
        <RevenueNav eventId={eventId} />
      </div>
      <Message error={error} />
      {readOnly ? <ReadOnlyNotice /> : null}

      <section>
        <h2 className="text-lg font-semibold tracking-normal">Income position</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Forecast ticket income"
            value={summary?.ticket_forecast_gross_minor}
            basis="gross"
            description="Assumption: ticket price multiplied by forecast sales."
          />
          <SummaryCard
            label="Forecast other income"
            value={summary?.other_forecast_gross_minor}
            basis="gross"
            description="Non-cancelled sponsorship, contributions and other expected income."
          />
          <SummaryCard
            label="Forecast income"
            value={summary?.total_forecast_net_minor}
            basis="net dashboard basis"
            description={financialTerminology.forecastIncome}
          />
          <SummaryCard
            label="Actual income"
            value={actualGross}
            basis="gross"
            description={hasActualIncome ? financialTerminology.actualIncome : "No actual income has been recorded yet."}
          />
          <SummaryCard
            label="Gross variance to forecast income"
            value={grossVariance}
            basis="gross comparison"
            description="Actual gross income minus forecast gross income."
          />
        </dl>
      </section>

      <section className="rounded-md border p-5">
        <h2 className="font-medium">Forecast income vs actual income</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Forecast income is assumption-based. Actual ticket income uses the latest cumulative ticket-sales snapshot plus recorded actual other income.
        </p>
        <div className="mt-4 grid gap-4">
          <ComparisonBar
            label="Forecast income"
            value={forecastGross}
            total={comparisonTotal}
            tone="bg-cyan-300"
            valueLabel={`${formatMinor(forecastGross)} gross`}
          />
          <ComparisonBar
            label="Actual income"
            value={actualGross}
            total={comparisonTotal}
            tone="bg-emerald-300"
            valueLabel={hasSnapshot ? `${formatMinor(actualGross)} gross` : "No ticket snapshot yet"}
          />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {actualAsForecast === null
            ? "No forecast income has been entered, so an actual-to-forecast percentage is not shown."
            : `${formatPercentage(actualAsForecast)}% of forecast recorded. This is recorded income, not a prediction or a measure of event completion.`}
        </p>
        <div className="mt-4 rounded-md bg-muted/40 p-4 text-sm text-muted-foreground">
          Ticket forecast income = forecast sales × gross ticket price. Forecast income includes non-cancelled other forecast income. Actual ticket income uses the latest non-void cumulative snapshot; snapshots are never added together.
        </div>
      </section>

      {!hasTicketTypes && !hasSnapshot && !hasOther ? (
        <section className="rounded-md border border-dashed p-6">
          <h2 className="font-medium">No revenue records yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A treasurer can add ticket types, cumulative ticket snapshots and
            other revenue records for this event.
          </p>
          {canManage ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild><Link href={`/events/${eventId}/revenue/tickets`}>Add ticket types</Link></Button>
              <Button asChild variant="outline"><Link href={`/events/${eventId}/revenue/other`}>Add other revenue</Link></Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <Tags className="h-4 w-4" aria-hidden="true" />
          Ticket income forecast
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ticket forecasts are assumptions: the price you expect to charge multiplied by the number of tickets you currently expect to sell.
        </p>
        {hasTicketTypes ? (
          <div className="mt-4 max-w-full overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Ticket type</th>
                  <th className="py-2 pr-4 text-right font-medium">Ticket price</th>
                  <th className="py-2 pr-4 text-right font-medium">Maximum available</th>
                  <th className="py-2 pr-4 text-right font-medium">Forecast sales</th>
                  <th className="py-2 pr-4 text-right font-medium">Forecast income</th>
                  <th className="py-2 text-right font-medium">Maximum income</th>
                </tr>
              </thead>
              <tbody>
                {revenue.ticketTypes.map((ticket) => (
                  <tr key={ticket.ticket_type_id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{ticket.name}</div>
                      <div className="text-muted-foreground">{ticket.is_active ? "Active" : "Cancelled"}</div>
                    </td>
                    <td className="py-3 pr-4 text-right">{formatMinor(ticket.gross_price_minor)}</td>
                    <td className="py-3 pr-4 text-right">{ticket.maximum_quantity}</td>
                    <td className="py-3 pr-4 text-right">{ticket.forecast_quantity}</td>
                    <td className="py-3 pr-4 text-right font-medium">{formatMinor(ticket.forecast_gross_minor)}</td>
                    <td className="py-3 text-right">{formatMinor(ticket.maximum_gross_minor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No ticket types have been configured.</p>
        )}
        {canManage && !readOnly ? (
          <div className="mt-4">
            <Button asChild>
              <Link href={`/events/${eventId}/revenue/tickets`}>Add Ticket Type</Link>
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <ReceiptText className="h-4 w-4" aria-hidden="true" />
          Other forecast income
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Sponsorship, college contributions, donations and other non-ticket income stay flexible.</p>
        {hasOther ? (
          <div className="mt-4 grid gap-3">
            {revenue.otherItems.slice(0, 4).map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground">{formatLabel(item.category)}; {formatLabel(item.status)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMinor(item.forecast_gross_minor)}</p>
                  <p className="text-muted-foreground">forecast gross</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No other revenue items have been configured.</p>
        )}
        {canManage && !readOnly ? (
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href={`/events/${eventId}/revenue/other`}>Add other forecast income</Link>
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          Actual income
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Actual ticket income uses the latest cumulative ticket-sales snapshot. The newest non-void snapshot is the current position.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hasSnapshot ? (
            <div>
              <dt className="text-sm text-muted-foreground">Latest captured</dt>
              <dd className="text-lg font-semibold">{dateTime(summary?.latest_captured_at)}</dd>
            </div>
          ) : null}
            <MoneyStat label="Latest ticket actual income" value={summary?.ticket_actual_gross_minor} />
            <MoneyStat label="Other actual income" value={summary?.other_actual_gross_minor} />
            <MoneyStat label="Total actual income recorded" value={actualGross} />
          {hasSnapshot ? (
            <>
            <MoneyStat label="Refunds to date" value={summary?.ticket_refunds_to_date_minor} />
            <MoneyStat label="Booking fees to date" value={summary?.ticket_booking_fees_to_date_minor} />
            <div>
              <dt className="text-sm text-muted-foreground">Tickets sold to date</dt>
              <dd className="text-lg font-semibold">{summary?.tickets_sold_to_date ?? "Unknown"}</dd>
            </div>
            </>
          ) : null}
        </dl>
        {!hasSnapshot ? <p className="mt-3 text-sm text-muted-foreground">No ticket-sales snapshot has been recorded. Actual other income is still included above when recorded.</p> : null}
        <p className="mt-4 text-sm text-muted-foreground">
          Booking fees are shown separately and are not deducted from May Ball gross ticket revenue.
        </p>
        {canManage && !readOnly ? (
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href={`/events/${eventId}/revenue/actual`}>Record actual ticket revenue</Link>
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ComparisonBar({
  label,
  value,
  total,
  tone,
  valueLabel,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
  valueLabel: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_10rem] sm:items-center">
      <span className="text-sm font-medium">{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${comparisonWidth(value, total)}%` }} />
      </div>
      <span className="text-sm text-muted-foreground sm:text-right">{valueLabel}</span>
    </div>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      This historical event is read-only. Revenue records are shown for reference.
    </div>
  );
}

export function TicketTypesPanel({
  eventId,
  ticketTypes,
  canManage,
  readOnly,
  error,
  saved,
}: {
  eventId: string;
  ticketTypes: TicketForecastPosition[];
  canManage: boolean;
  readOnly: boolean;
  error?: string;
  saved?: boolean;
}) {
  return (
    <div className="grid gap-6">
      <Header title="Ticket types" description="Maintain ticket prices, capacity and forecast sales assumptions." eventId={eventId} />
      <Message error={error} saved={saved} />
      {readOnly ? <ReadOnlyNotice /> : null}
      <section className="rounded-md border p-5">
        <h2 className="font-medium">Ticket forecast positions</h2>
        <div className="mt-4 max-w-full overflow-x-auto">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">VAT</th>
                <th className="py-2 pr-4 text-right font-medium">Gross price</th>
                <th className="py-2 pr-4 text-right font-medium">Net price</th>
                <th className="py-2 pr-4 text-right font-medium">Capacity</th>
                <th className="py-2 pr-4 text-right font-medium">Forecast</th>
                <th className="py-2 pr-4 text-right font-medium">Max gross</th>
                <th className="py-2 text-right font-medium">Forecast gross</th>
              </tr>
            </thead>
            <tbody>
              {ticketTypes.map((ticket) => (
                <tr key={ticket.ticket_type_id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{ticket.name}</div>
                    <div className="text-muted-foreground">{ticket.is_active ? "Active" : "Inactive"}</div>
                  </td>
                  <td className="py-3 pr-4">{formatLabel(ticket.vat_treatment)} {ticket.vat_rate !== null ? `(${ticket.vat_rate}%)` : ""}</td>
                  <td className="py-3 pr-4 text-right">{formatMinor(ticket.gross_price_minor)}</td>
                  <td className="py-3 pr-4 text-right">{formatMinor(ticket.net_price_minor)}</td>
                  <td className="py-3 pr-4 text-right">{ticket.maximum_quantity}</td>
                  <td className="py-3 pr-4 text-right">{ticket.forecast_quantity}</td>
                  <td className="py-3 pr-4 text-right">{formatMinor(ticket.maximum_gross_minor)}</td>
                  <td className="py-3 text-right">{formatMinor(ticket.forecast_gross_minor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ticketTypes.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No ticket types have been created.
          </p>
        ) : null}
      </section>

      {canManage ? <TicketTypeForm eventId={eventId} /> : null}
    </div>
  );
}

function TicketTypeForm({ eventId }: { eventId: string }) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="flex items-center gap-2 font-medium"><Plus className="h-4 w-4" aria-hidden="true" />Add or update ticket type</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Start with the modelling fields treasurers use most: ticket price, maximum available and expected sales. Net and VAT are derived from the gross price and VAT treatment when you save.
      </p>
      <form action={saveTicketTypeAction} className="mt-4 grid gap-4 md:grid-cols-3">
        <input type="hidden" name="eventId" value={eventId} />
        <TicketTypeForecastFields />
        <div className="md:self-end">
          <SubmitButton pendingLabel="Saving ticket...">Save ticket type</SubmitButton>
        </div>
      </form>
      <p className="mt-3 text-sm text-muted-foreground">
        Ticket identity is currently the event-scoped name; the database does not yet define a separate ticket code field.
      </p>
    </section>
  );
}

export function TicketSnapshotsPanel({
  eventId,
  snapshots,
  breakdowns,
  ticketTypes,
  canManage,
  readOnly,
  error,
  recorded,
}: {
  eventId: string;
  snapshots: TicketSnapshot[];
  breakdowns: TicketSnapshotBreakdown[];
  ticketTypes: TicketForecastPosition[];
  canManage: boolean;
  readOnly: boolean;
  error?: string;
  recorded?: boolean;
}) {
  const latestId = snapshots.find((snapshot) => !snapshot.is_void)?.id;
  const ticketById = new Map(ticketTypes.map((ticket) => [ticket.ticket_type_id, ticket]));

  return (
    <div className="grid gap-6">
      <Header title="Actual ticket snapshots" description="Record cumulative Ticket Tailor positions. The latest non-void snapshot is current." eventId={eventId} />
      <Message error={error} recorded={recorded} />
      {readOnly ? <ReadOnlyNotice /> : null}
      {canManage ? <SnapshotForm eventId={eventId} ticketTypes={ticketTypes} /> : null}
      <section className="rounded-md border p-5">
        <h2 className="flex items-center gap-2 font-medium"><History className="h-4 w-4" aria-hidden="true" />Snapshot history</h2>
        <div className="mt-4 grid gap-3">
          {snapshots.map((snapshot) => {
            const rows = breakdowns.filter((row) => row.snapshot_id === snapshot.id);
            return (
              <div key={snapshot.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{dateTime(snapshot.captured_at)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Gross sales to date {formatMinor(snapshot.gross_sales_minor)}; booking fees {formatMinor(snapshot.booking_fees_to_date_minor)} shown separately.</p>
                  </div>
                  <div className="flex gap-2">
                    {snapshot.id === latestId ? <Badge>Latest current position</Badge> : null}
                    {snapshot.is_void ? <Badge variant="secondary">Voided</Badge> : null}
                    {rows.length ? <Badge variant="outline">Type breakdown</Badge> : <Badge variant="outline">Total only</Badge>}
                  </div>
                </div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-muted-foreground">Tickets sold</dt><dd>{snapshot.tickets_sold_to_date ?? "Unknown"}</dd></div>
                  <div><dt className="text-muted-foreground">Refunds</dt><dd>{formatMinor(snapshot.refunds_to_date_minor)}</dd></div>
                  <div><dt className="text-muted-foreground">Source</dt><dd>{formatLabel(snapshot.source)}</dd></div>
                  <div><dt className="text-muted-foreground">VAT</dt><dd>{formatMinor(snapshot.vat_minor)}</dd></div>
                </dl>
                {rows.length ? (
                  <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
                    {rows.map((row) => (
                      <p key={row.id}>
                        {ticketById.get(row.ticket_type_id)?.name ?? "Ticket type"}: {row.quantity_to_date} sold to date, {formatMinor(row.gross_sales_minor)} gross
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          {snapshots.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No ticket snapshots have been recorded.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SnapshotForm({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketForecastPosition[] }) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="font-medium">Record cumulative snapshot</h2>
      <form action={recordTicketSnapshotAction} className="mt-4 grid gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="grid gap-4 md:grid-cols-3">
          <Field name="capturedAt" label="Captured at" type="datetime-local" required />
          <Field name="ticketsSold" label="Tickets sold to date" type="number" />
          <Select name="source" label="Source" values={snapshotSources} />
          <Field name="netSales" label="Net sales to date" placeholder="112500.00" financialKind="net" />
          <Field name="vatSales" label="VAT to date" placeholder="22500.00" financialKind="vat" />
          <Field name="grossSales" label="Gross sales to date" placeholder="135000.00" required financialKind="gross" />
          <Field name="refunds" label="Refunds to date" placeholder="250.00" defaultValue="0.00" />
          <Field name="bookingFees" label="Booking fees to date" placeholder="2700.00" defaultValue="0.00" />
          <Field name="notes" label="Notes" />
        </div>
        {ticketTypes.length ? (
          <div className="rounded-md border p-4">
            <h3 className="text-sm font-medium">Optional ticket-type breakdown</h3>
            <p className="mt-1 text-sm text-muted-foreground">Leave all rows blank for a valid total-only snapshot.</p>
            <div className="mt-3 grid gap-3">
              {ticketTypes.map((ticket) => (
                <div key={ticket.ticket_type_id} className="grid gap-3 md:grid-cols-[1fr_10rem_10rem] md:items-end">
                  <input type="hidden" name="ticketTypeId" value={ticket.ticket_type_id ?? ""} />
                  <p className="text-sm font-medium">{ticket.name}</p>
                  <Field name={`quantity_${ticket.ticket_type_id}`} label="Quantity to date" type="number" />
                  <Field name={`gross_${ticket.ticket_type_id}`} label="Gross to date" financialKind="gross" />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <SubmitButton pendingLabel="Recording snapshot...">Record immutable snapshot</SubmitButton>
        </div>
      </form>
    </section>
  );
}

export function OtherRevenuePanel({
  eventId,
  items,
  owners,
  canManage,
  readOnly,
  error,
  saved,
}: {
  eventId: string;
  items: OtherRevenueItem[];
  owners: RevenueOwner[];
  canManage: boolean;
  readOnly: boolean;
  error?: string;
  saved?: boolean;
}) {
  return (
    <div className="grid gap-6">
      <Header title="Other revenue" description="Manage sponsorship, contributions, donations and other non-ticket income." eventId={eventId} />
      <Message error={error} saved={saved} />
      {readOnly ? <ReadOnlyNotice /> : null}
      <section className="rounded-md border p-5">
        <h2 className="font-medium">Other revenue items</h2>
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatLabel(item.category)} owned by {ownerName(owners, item.owner_user_id)}</p>
                </div>
                <Badge variant={item.status === "received" ? "default" : "secondary"}>{formatLabel(item.status)}</Badge>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <div><dt className="text-muted-foreground">Forecast gross</dt><dd>{formatMinor(item.forecast_gross_minor)}</dd></div>
                <div><dt className="text-muted-foreground">Forecast VAT</dt><dd>{formatMinor(item.forecast_vat_minor)}</dd></div>
                <div><dt className="text-muted-foreground">Forecast net</dt><dd>{formatMinor(item.forecast_net_minor)}</dd></div>
                <div><dt className="text-muted-foreground">Actual gross</dt><dd>{formatMinor(item.actual_gross_minor)}</dd></div>
                <div><dt className="text-muted-foreground">Expected</dt><dd>{item.expected_date ?? "Not set"}</dd></div>
                <div><dt className="text-muted-foreground">Received</dt><dd>{item.received_date ?? "Not received"}</dd></div>
              </dl>
            </div>
          ))}
          {items.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No other revenue items have been created.</p>
          ) : null}
        </div>
      </section>
      {canManage ? <OtherRevenueForm eventId={eventId} owners={owners} items={items} /> : null}
    </div>
  );
}

function OtherRevenueForm({ eventId, owners, items }: { eventId: string; owners: RevenueOwner[]; items: OtherRevenueItem[] }) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="font-medium">Add or update other revenue</h2>
      <form action={saveOtherRevenueAction} className="mt-4 grid gap-4 md:grid-cols-3">
        <input type="hidden" name="eventId" value={eventId} />
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Existing item for update</span>
          <select name="itemId" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">Create new item</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <Field name="title" label="Title" required />
        <Select name="category" label="Category" values={revenueCategories} />
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Owner</span>
          <select name="ownerUserId" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">Unassigned</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.preferred_name ?? owner.display_name}</option>)}
          </select>
        </label>
        <Field name="forecastNet" label="Forecast net" defaultValue="0.00" required financialKind="net" />
        <Field name="forecastVat" label="Forecast VAT" defaultValue="0.00" required financialKind="vat" />
        <Field name="forecastGross" label="Forecast gross" defaultValue="0.00" required financialKind="gross" />
        <Field name="actualNet" label="Actual net" defaultValue="0.00" financialKind="net" />
        <Field name="actualVat" label="Actual VAT" defaultValue="0.00" financialKind="vat" />
        <Field name="actualGross" label="Actual gross" defaultValue="0.00" financialKind="gross" />
        <Field name="vatRate" label="VAT rate" />
        <Select name="vatTreatment" label="VAT treatment" values={vatTreatments} />
        <Select name="status" label="Status" values={revenueStatuses} />
        <Field name="expectedDate" label="Expected date" type="date" />
        <Field name="receivedDate" label="Received date" type="date" />
        <Field name="notes" label="Notes" />
        <div className="md:self-end">
          <SubmitButton pendingLabel="Saving revenue...">Save other revenue</SubmitButton>
        </div>
      </form>
    </section>
  );
}

function Header({
  title,
  description,
  eventId,
}: {
  title: string;
  description: string;
  eventId: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      <RevenueNav eventId={eventId} />
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
  defaultValue,
  financialKind,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  financialKind?: FinancialFieldKind;
}) {
  if (financialKind) {
    return <FinancialField kind={financialKind} name={name} label={label} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} />;
  }

  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={type === "number" ? "0" : undefined}
        className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </label>
  );
}

function Select<T extends readonly string[]>({
  name,
  label,
  values,
}: {
  name: string;
  label: string;
  values: T;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        {values.map((value) => (
          <option key={value} value={value}>
            {label === "VAT treatment" ? labelVat(value) : formatLabel(value)}
          </option>
        ))}
      </select>
    </label>
  );
}

function labelVat(value: string) {
  if (value === "zero_rated") return "zero rated";
  return formatLabel(value);
}

export function ticketTypeInitialValues(ticket: TicketForecastPosition) {
  return {
    netPrice: minorToInput(ticket.net_price_minor),
    vatAmount: minorToInput(ticket.vat_minor),
    grossPrice: minorToInput(ticket.gross_price_minor),
  };
}
