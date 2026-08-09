import type { Enums } from "@/src/types/database.generated";

export type TicketVatTreatment = Enums<"vat_treatment">;

const NO_VAT_TREATMENTS = new Set<TicketVatTreatment>([
  "zero_rated",
  "exempt",
  "outside_scope",
  "unknown",
]);

export function defaultTicketVatRate(treatment: TicketVatTreatment) {
  if (treatment === "standard") return 20;
  if (treatment === "reduced") return 5;
  return 0;
}

export function ticketVatRateApplies(treatment: TicketVatTreatment) {
  return !NO_VAT_TREATMENTS.has(treatment);
}

export function calculateTicketPriceBreakdown({
  grossMinor,
  vatRate,
  vatTreatment,
}: {
  grossMinor: number;
  vatRate: number;
  vatTreatment: TicketVatTreatment;
}) {
  if (!Number.isSafeInteger(grossMinor) || grossMinor < 0) {
    throw new Error("Ticket price must be a non-negative money amount.");
  }

  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
    throw new Error("VAT rate must be between 0 and 100.");
  }

  if (!ticketVatRateApplies(vatTreatment) || vatRate === 0) {
    return {
      netMinor: grossMinor,
      vatMinor: 0,
      grossMinor,
      vatRate: 0,
    };
  }

  const rateBasisPoints = BigInt(Math.round(vatRate * 100));
  const divisor = BigInt(10000) + rateBasisPoints;
  const numerator = BigInt(grossMinor) * BigInt(10000);
  const quotient = numerator / divisor;
  const remainder = numerator % divisor;
  const roundedNet = quotient + (remainder * BigInt(2) >= divisor ? BigInt(1) : BigInt(0));
  const netMinor = Number(roundedNet);

  return {
    netMinor,
    vatMinor: grossMinor - netMinor,
    grossMinor,
    vatRate,
  };
}
