import { AlertCircle, CheckCircle, History, ReceiptText, Tags, TrendingUp } from "lucide-react";
import {
  recordOtherRevenueReceiptAction,
  saveOtherRevenueForecastAction,
} from "@/app/events/[eventId]/revenue/actions";
import { OtherRevenueAmountFields } from "@/components/other-revenue-amount-fields";
import { SubmitButton } from "@/components/submit-button";
import { TicketSnapshotForm } from "@/components/ticket-snapshot-form";
import { NewTicketTypeForm, TicketTypeEditor } from "@/components/ticket-type-editor";
import { Badge } from "@/components/ui/badge";
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

const revenueCategories = ["sponsorship", "college_contribution", "donation", "merchandise", "interest", "other"] as const;

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

export function RevenueOverviewPanel({
  eventId,
  revenue,
  canManage,
  readOnly,
  error,
  saved,
  recorded,
}: {
  eventId: string;
  revenue: RevenueOverview;
  canManage: boolean;
  readOnly: boolean;
  error?: string;
  saved?: boolean;
  recorded?: boolean;
}) {
  const summary = revenue.summary;
  const hasSnapshot = Boolean(summary?.latest_snapshot_id);
  const forecastGross = valueNumber(summary?.total_forecast_gross_minor);
  const actualGross = valueNumber(summary?.total_actual_gross_minor);
  const comparisonTotal = Math.max(forecastGross, actualGross);
  const actualAsForecast = actualAsForecastPercentage(actualGross, forecastGross);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Revenue</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Design ticket architecture, set expected non-ticket income, then record cumulative actual income as money arrives.
        </p>
      </div>
      <Message error={error} saved={saved} recorded={recorded} />
      {readOnly ? <ReadOnlyNotice /> : null}

      <section>
        <h2 className="text-lg font-semibold tracking-normal">Forecast vs actual income</h2>
        <p className="mt-2 text-sm text-muted-foreground">All six figures below are gross amounts. Net and VAT remain available where the underlying record supplies them.</p>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Forecast ticket income"
            value={summary?.ticket_forecast_gross_minor}
            basis="gross"
            description="Ticket price multiplied by forecast sales assumptions."
          />
          <SummaryCard
            label="Forecast other income"
            value={summary?.other_forecast_gross_minor}
            basis="gross"
            description="Non-cancelled sponsorship, contributions and other expected income."
          />
          <SummaryCard
            label="Total forecast income"
            value={summary?.total_forecast_gross_minor}
            basis="gross"
            description={financialTerminology.forecastIncome}
          />
          <SummaryCard
            label="Actual ticket income"
            value={summary?.ticket_actual_gross_minor}
            basis="gross"
            description="The latest non-void cumulative ticket-sales snapshot only."
          />
          <SummaryCard
            label="Actual other income"
            value={summary?.other_actual_gross_minor}
            basis="gross"
            description="Other revenue recorded as part received or received."
          />
          <SummaryCard
            label="Total actual income"
            value={actualGross}
            basis="gross"
            description={financialTerminology.actualIncome}
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

      <TicketArchitectureSection eventId={eventId} ticketTypes={revenue.ticketTypes} canManage={canManage && !readOnly} />
      <OtherRevenueSection eventId={eventId} items={revenue.otherItems} owners={revenue.owners} canManage={canManage && !readOnly} />
      <TicketSnapshotsSection eventId={eventId} snapshots={revenue.snapshots} breakdowns={revenue.breakdowns} ticketTypes={revenue.ticketTypes} canManage={canManage && !readOnly} />
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
      <Header title="Ticket architecture" description="Set gross ticket prices, capacity and forecast sales assumptions." />
      <Message error={error} saved={saved} />
      {readOnly ? <ReadOnlyNotice /> : null}
      <TicketArchitectureSection eventId={eventId} ticketTypes={ticketTypes} canManage={canManage && !readOnly} />
    </div>
  );
}

function TicketArchitectureSection({
  eventId,
  ticketTypes,
  canManage,
}: {
  eventId: string;
  ticketTypes: TicketForecastPosition[];
  canManage: boolean;
}) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="flex items-center gap-2 font-medium"><Tags className="h-4 w-4" aria-hidden="true" />Ticket revenue</h2>
      <p className="mt-2 text-sm text-muted-foreground">Forecast sales are assumptions, not a prediction: gross ticket price × forecast sales = forecast gross ticket revenue.</p>
      {ticketTypes.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {ticketTypes.map((ticket) => <TicketTypeEditor key={ticket.ticket_type_id} eventId={eventId} ticket={ticket} canEdit={canManage} />)}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">No ticket types yet.</p>
      )}
      {canManage ? <div className="mt-4"><NewTicketTypeForm eventId={eventId} /></div> : null}
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
  return (
    <div className="grid gap-6">
      <Header title="Actual ticket sales" description="Record cumulative ticket-sales positions. The latest non-void snapshot is current." />
      <Message error={error} recorded={recorded} />
      {readOnly ? <ReadOnlyNotice /> : null}
      <TicketSnapshotsSection eventId={eventId} snapshots={snapshots} breakdowns={breakdowns} ticketTypes={ticketTypes} canManage={canManage && !readOnly} />
    </div>
  );
}

function TicketSnapshotsSection({
  eventId,
  snapshots,
  breakdowns,
  ticketTypes,
  canManage,
}: {
  eventId: string;
  snapshots: TicketSnapshot[];
  breakdowns: TicketSnapshotBreakdown[];
  ticketTypes: TicketForecastPosition[];
  canManage: boolean;
}) {
  const latestId = snapshots.find((snapshot) => !snapshot.is_void)?.id;
  const ticketById = new Map(ticketTypes.map((ticket) => [ticket.ticket_type_id, ticket]));

  return (
    <section className="rounded-md border p-5">
      <h2 className="flex items-center gap-2 font-medium"><TrendingUp className="h-4 w-4" aria-hidden="true" />Actual ticket snapshots</h2>
      <p className="mt-2 text-sm text-muted-foreground">Record cumulative ticket sales to date. The latest non-void snapshot is used as Actual Ticket Income; snapshots are never summed.</p>
      <p className="mt-2 text-sm text-muted-foreground">Booking fees are shown separately and are not deducted from gross ticket income.</p>
      {canManage ? (
        <details className="mt-4 rounded-md border p-4" open={snapshots.length === 0}>
          <summary className="cursor-pointer text-sm font-medium">Record cumulative snapshot</summary>
          <TicketSnapshotForm eventId={eventId} ticketTypes={ticketTypes} />
        </details>
      ) : null}
      <div className="mt-4">
        <h3 className="flex items-center gap-2 font-medium"><History className="h-4 w-4" aria-hidden="true" />Snapshot history</h3>
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
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No actual ticket sales recorded yet.</p>
          ) : null}
        </div>
      </div>
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
      <Header title="Other revenue" description="Record expected non-ticket income, then mark it received when funds arrive." />
      <Message error={error} saved={saved} />
      {readOnly ? <ReadOnlyNotice /> : null}
      <OtherRevenueSection eventId={eventId} items={items} owners={owners} canManage={canManage && !readOnly} />
    </div>
  );
}

function OtherRevenueSection({
  eventId,
  items,
  owners,
  canManage,
}: {
  eventId: string;
  items: OtherRevenueItem[];
  owners: RevenueOwner[];
  canManage: boolean;
}) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="flex items-center gap-2 font-medium"><ReceiptText className="h-4 w-4" aria-hidden="true" />Other revenue</h2>
      <p className="mt-2 text-sm text-muted-foreground">Record expected non-ticket income such as sponsorship or donations, then mark it received when funds arrive.</p>
        <div className="mt-4 grid gap-3">
          {items.map((item) => <OtherRevenueItemCard key={item.id} eventId={eventId} item={item} owners={owners} canManage={canManage} />)}
          {items.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No other revenue forecast yet.</p>
          ) : null}
        </div>
      {canManage ? (
        <details className="mt-4 rounded-md border p-4">
          <summary className="cursor-pointer text-sm font-medium">Add forecast revenue</summary>
          <OtherRevenueForecastForm eventId={eventId} owners={owners} />
        </details>
      ) : null}
    </section>
  );
}

function OtherRevenueForecastForm({
  eventId,
  owners,
  item,
}: {
  eventId: string;
  owners: RevenueOwner[];
  item?: OtherRevenueItem;
}) {
  const editing = Boolean(item);
  return (
    <form action={saveOtherRevenueForecastAction} className="mt-4 grid gap-4 md:grid-cols-3">
        <input type="hidden" name="eventId" value={eventId} />
        {item ? <input type="hidden" name="itemId" value={item.id} /> : null}
        <Field name="title" label="Name / description" required defaultValue={item?.title ?? ""} />
        <label className="grid gap-1 text-sm"><span className="font-medium">Category</span><select name="category" defaultValue={item?.category ?? "other"} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">{revenueCategories.map((category) => <option key={category} value={category}>{formatLabel(category)}</option>)}</select></label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Owner</span>
          <select name="ownerUserId" defaultValue={item?.owner_user_id ?? ""} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">Unassigned</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.preferred_name ?? owner.display_name}</option>)}
          </select>
        </label>
        <OtherRevenueAmountFields grossName="forecastGross" grossLabel="Forecast gross" vatTreatmentName="vatTreatment" vatRateName="vatRate" initialGross={minorToInput(item?.forecast_gross_minor ?? 0)} initialVatTreatment={item?.vat_treatment ?? "standard"} initialVatRate={item?.vat_rate === null || item?.vat_rate === undefined ? "" : String(item.vat_rate)} />
        <Field name="expectedDate" label="Expected date" type="date" defaultValue={item?.expected_date ?? ""} />
        <Field name="notes" label="Notes" defaultValue={item?.notes ?? ""} />
        <div className="md:self-end">
          <SubmitButton pendingLabel="Saving forecast...">{editing ? "Save forecast changes" : "Create forecast"}</SubmitButton>
        </div>
    </form>
  );
}

function OtherRevenueItemCard({ eventId, item, owners, canManage }: { eventId: string; item: OtherRevenueItem; owners: RevenueOwner[]; canManage: boolean }) {
  const received = item.status === "part_received" || item.status === "received";
  const editableForecast = item.status === "forecast" || item.status === "confirmed";
  return (
    <article className="rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{formatLabel(item.category)} owned by {ownerName(owners, item.owner_user_id)}</p>
        </div>
        <Badge variant={received ? "default" : "secondary"}>{formatLabel(item.status === "confirmed" ? "confirmed forecast" : item.status)}</Badge>
      </div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-muted-foreground">Forecast</dt><dd>{formatMinor(item.forecast_gross_minor)}</dd></div>
        <div><dt className="text-muted-foreground">Expected</dt><dd>{item.expected_date ?? "Not set"}</dd></div>
        {received ? <><div><dt className="text-muted-foreground">Received</dt><dd>{formatMinor(item.actual_gross_minor)}</dd></div><div><dt className="text-muted-foreground">Received date</dt><dd>{item.received_date ?? "Not set"}</dd></div></> : null}
      </dl>
      {canManage && editableForecast ? <details className="mt-4 rounded-md border p-4"><summary className="cursor-pointer text-sm font-medium">Edit forecast</summary><OtherRevenueForecastForm eventId={eventId} owners={owners} item={item} /></details> : null}
      {canManage && !received && item.status !== "cancelled" ? <details className="mt-4 rounded-md border p-4"><summary className="cursor-pointer text-sm font-medium">Mark as received</summary><p className="mt-2 text-sm text-muted-foreground">Forecast {formatMinor(item.forecast_gross_minor)} is retained. Confirm the actual amount and date received.</p><form action={recordOtherRevenueReceiptAction} className="mt-4 grid gap-4"><input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="itemId" value={item.id} /><OtherRevenueAmountFields grossName="actualGross" grossLabel="Actual received gross" vatTreatmentName="vatTreatment" vatRateName="vatRate" initialGross={minorToInput(item.forecast_gross_minor)} initialVatTreatment={item.vat_treatment ?? "standard"} initialVatRate={item.vat_rate === null ? "" : String(item.vat_rate)} taxSettingsReadOnly /><Field name="receivedDate" label="Received date" type="date" required /><div><SubmitButton pendingLabel="Recording receipt...">Confirm received</SubmitButton></div></form></details> : null}
      {canManage && received ? <details className="mt-4 rounded-md border p-4"><summary className="cursor-pointer text-sm font-medium">Amend received amount</summary><p className="mt-2 text-sm text-muted-foreground">Forecast {formatMinor(item.forecast_gross_minor)} remains unchanged.</p><form action={recordOtherRevenueReceiptAction} className="mt-4 grid gap-4"><input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="itemId" value={item.id} /><OtherRevenueAmountFields grossName="actualGross" grossLabel="Actual received gross" vatTreatmentName="vatTreatment" vatRateName="vatRate" initialGross={minorToInput(item.actual_gross_minor)} initialVatTreatment={item.vat_treatment ?? "standard"} initialVatRate={item.vat_rate === null ? "" : String(item.vat_rate)} taxSettingsReadOnly /><Field name="receivedDate" label="Received date" type="date" required defaultValue={item.received_date ?? ""} /><div><SubmitButton pendingLabel="Saving receipt...">Save received correction</SubmitButton></div></form></details> : null}
    </article>
  );
}

function Header({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
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
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
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
