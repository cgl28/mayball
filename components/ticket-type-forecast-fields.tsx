"use client";

import { useMemo, useState } from "react";
import { FinancialField } from "@/components/financial-field";
import { formatMinor, parseMoneyToMinor } from "@/lib/money";
import {
  calculateTicketPriceBreakdown,
  defaultTicketVatRate,
  ticketVatRateApplies,
  type TicketVatTreatment,
} from "@/lib/revenue/ticket-pricing";

const vatTreatments = ["standard", "reduced", "zero_rated", "exempt", "outside_scope", "unknown"] as const;

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function parseWholeNumber(value: string) {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

function parseOptionalRate(value: string, treatment: TicketVatTreatment) {
  const text = value.trim();
  if (!ticketVatRateApplies(treatment)) return 0;
  if (!text) return defaultTicketVatRate(treatment);
  return /^\d+(?:\.\d{1,2})?$/.test(text) ? Number(text) : null;
}

export type TicketTypeForecastInitialValues = {
  name?: string;
  description?: string | null;
  grossPrice?: string;
  maximumQuantity?: string;
  forecastQuantity?: string;
  vatTreatment?: TicketVatTreatment;
  vatRate?: string;
  complimentaryQuantity?: string;
  displayOrder?: string;
  isActive?: boolean;
};

export function TicketTypeForecastFields({ initial = {} }: { initial?: TicketTypeForecastInitialValues }) {
  const [grossPrice, setGrossPrice] = useState(initial.grossPrice ?? "");
  const [maximumQuantity, setMaximumQuantity] = useState(initial.maximumQuantity ?? "");
  const [forecastQuantity, setForecastQuantity] = useState(initial.forecastQuantity ?? "");
  const [vatTreatment, setVatTreatment] = useState<TicketVatTreatment>(initial.vatTreatment ?? "standard");
  const [vatRate, setVatRate] = useState(initial.vatRate ?? "20.00");

  const preview = useMemo(() => {
    try {
      const grossMinor = grossPrice.trim() ? parseMoneyToMinor(grossPrice) : 0;
      const forecast = parseWholeNumber(forecastQuantity) ?? 0;
      const maximum = parseWholeNumber(maximumQuantity) ?? 0;
      const rate = parseOptionalRate(vatRate, vatTreatment);
      if (rate === null) return { error: "Enter a valid VAT rate.", forecastMinor: 0, maximumMinor: 0, netMinor: 0, vatMinor: 0 };
      const price = calculateTicketPriceBreakdown({ grossMinor, vatRate: rate, vatTreatment });
      return {
        error: forecast > maximum && maximum > 0 ? "Forecast sales cannot exceed maximum available." : null,
        forecastMinor: price.grossMinor * forecast,
        maximumMinor: price.grossMinor * maximum,
        netMinor: price.netMinor,
        vatMinor: price.vatMinor,
      };
    } catch {
      return { error: "Enter a valid gross ticket price.", forecastMinor: 0, maximumMinor: 0, netMinor: 0, vatMinor: 0 };
    }
  }, [forecastQuantity, grossPrice, maximumQuantity, vatRate, vatTreatment]);

  return (
    <>
      <Field name="name" label="Ticket type name" required defaultValue={initial.name} />
      <FinancialField
        kind="gross"
        name="grossPrice"
        label="Ticket price (gross)"
        placeholder="150.00"
        required
        value={grossPrice}
        onChange={(event) => setGrossPrice(event.target.value)}
      />
      <Field
        name="maximumQuantity"
        label="Maximum available"
        description="The most tickets that could be sold."
        type="number"
        required
        value={maximumQuantity}
        onChange={setMaximumQuantity}
      />
      <Field
        name="forecastQuantity"
        label="Forecast sales"
        description="How many tickets you currently expect to sell."
        type="number"
        required
        value={forecastQuantity}
        onChange={setForecastQuantity}
      />
      <label className="grid gap-1 text-sm">
        <span className="font-medium">VAT treatment</span>
        <select
          name="vatTreatment"
          value={vatTreatment}
          onChange={(event) => {
            const next = event.target.value as TicketVatTreatment;
            setVatTreatment(next);
            setVatRate(defaultTicketVatRate(next).toFixed(2));
          }}
          className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {vatTreatments.map((value) => (
            <option key={value} value={value}>{formatLabel(value)}</option>
          ))}
        </select>
      </label>
      <div className="rounded-md border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 md:col-span-2">
        <h3 className="font-medium">Forecast preview</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-cyan-800">Forecast income</dt><dd className="text-lg font-semibold">{formatMinor(preview.forecastMinor)}</dd></div>
          <div><dt className="text-cyan-800">Maximum possible income</dt><dd className="text-lg font-semibold">{formatMinor(preview.maximumMinor)}</dd></div>
          <div><dt className="text-cyan-800">Net per ticket</dt><dd>{formatMinor(preview.netMinor)}</dd></div>
          <div><dt className="text-cyan-800">VAT per ticket</dt><dd>{formatMinor(preview.vatMinor)}</dd></div>
        </dl>
        <p className="mt-3 text-cyan-900">
          Forecast income is the ticket price multiplied by your forecast-sales assumption. The database still checks the final values when you save.
        </p>
        {preview.error ? <p role="alert" className="mt-2 font-medium text-amber-900">{preview.error}</p> : null}
      </div>
      <details className="rounded-md border p-4 md:col-span-3">
        <summary className="cursor-pointer text-sm font-medium">Advanced ticket settings</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field name="description" label="Description" defaultValue={initial.description ?? ""} />
          <Field
            name="vatRate"
            label="VAT rate"
            value={vatRate}
            onChange={setVatRate}
            disabled={!ticketVatRateApplies(vatTreatment)}
          />
          <Field name="complimentaryQuantity" label="Complimentary allocation" type="number" defaultValue={initial.complimentaryQuantity ?? "0"} />
          <Field name="displayOrder" label="Display order" type="number" defaultValue={initial.displayOrder ?? "0"} />
          <label className="flex items-center gap-2 text-sm md:self-end">
            <input name="isActive" type="checkbox" defaultChecked={initial.isActive ?? true} className="h-4 w-4 rounded border" />
            <span>Active</span>
          </label>
        </div>
      </details>
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
  defaultValue,
  value,
  disabled,
  description,
  onChange,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  description?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        aria-label={label}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        disabled={disabled}
        min={type === "number" ? "0" : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:bg-muted"
      />
      {description ? <span className="text-muted-foreground">{description}</span> : null}
    </label>
  );
}
