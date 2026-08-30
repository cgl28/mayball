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

function label(value: string) {
  return value.replaceAll("_", " ");
}

function parseRate(value: string, treatment: TicketVatTreatment) {
  if (!ticketVatRateApplies(treatment)) return 0;
  if (!value.trim()) return defaultTicketVatRate(treatment);
  return /^\d+(?:\.\d{1,2})?$/.test(value.trim()) ? Number(value) : null;
}

export function OtherRevenueAmountFields({
  grossName,
  grossLabel,
  vatTreatmentName,
  vatRateName,
  initialGross,
  initialVatTreatment = "standard",
  initialVatRate = "20.00",
  taxSettingsReadOnly = false,
}: {
  grossName: string;
  grossLabel: string;
  vatTreatmentName: string;
  vatRateName: string;
  initialGross: string;
  initialVatTreatment?: TicketVatTreatment;
  initialVatRate?: string;
  taxSettingsReadOnly?: boolean;
}) {
  const [gross, setGross] = useState(initialGross);
  const [treatment, setTreatment] = useState<TicketVatTreatment>(initialVatTreatment);
  const [rate, setRate] = useState(initialVatRate);
  const price = useMemo(() => {
    try {
      const vatRate = parseRate(rate, treatment);
      if (vatRate === null) return null;
      return calculateTicketPriceBreakdown({
        grossMinor: gross.trim() ? parseMoneyToMinor(gross) : 0,
        vatRate,
        vatTreatment: treatment,
      });
    } catch {
      return null;
    }
  }, [gross, rate, treatment]);

  return (
    <div className="grid gap-4 md:col-span-3">
      <div className="grid gap-4 md:grid-cols-3">
        <FinancialField kind="net" label="Net" value={price ? formatMinor(price.netMinor) : "Enter a valid gross amount"} disabled />
        <FinancialField kind="vat" label="VAT" value={price ? formatMinor(price.vatMinor) : "Enter a valid gross amount"} disabled />
        <FinancialField
          kind="gross"
          name={grossName}
          label={grossLabel}
          placeholder="5000.00"
          required
          value={gross}
          onChange={(event) => setGross(event.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">VAT treatment</span>
          <select
            name={vatTreatmentName}
            value={treatment}
            disabled={taxSettingsReadOnly}
            onChange={(event) => {
              const next = event.target.value as TicketVatTreatment;
              setTreatment(next);
              setRate(defaultTicketVatRate(next).toFixed(2));
            }}
            className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {vatTreatments.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">VAT rate</span>
          <input
            name={vatRateName}
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            disabled={taxSettingsReadOnly || !ticketVatRateApplies(treatment)}
            className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:bg-muted"
          />
        </label>
      </div>
      <p className="text-sm text-muted-foreground">Net and VAT are computed from the gross amount and VAT treatment; the database verifies the final minor-unit values.</p>
    </div>
  );
}
