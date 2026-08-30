export const financialTerminology = {
  forecastIncome:
    "Based on forecast ticket sales and non-cancelled other forecast income currently entered for this event.",
  actualIncome:
    "Latest cumulative ticket-sales snapshot plus recorded actual other income.",
  approvedCommitments:
    "Current approved revisions only. Approval does not imply payment.",
  potentialPosition:
    "Forecast net income less approved commitments, submitted requests, pending variation increases and unallocated contingency. Drafts are excluded.",
} as const;

export type FinancialPositionState = "surplus" | "deficit" | "break-even";

export function financialPositionState(value: number): FinancialPositionState {
  if (value > 0) return "surplus";
  if (value < 0) return "deficit";
  return "break-even";
}

export function financialPositionLabel(prefix: "Forecast" | "Potential", value: number) {
  const state = financialPositionState(value);
  if (state === "break-even") return `${prefix} break-even`;
  return `${prefix} ${state}`;
}

export function actualAsForecastPercentage(actualMinor: number, forecastMinor: number) {
  if (forecastMinor <= 0) return null;
  return (actualMinor / forecastMinor) * 100;
}

export function formatPercentage(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);
}
