export type MoneyBreakdown = {
  net: number;
  vat: number;
  gross: number;
};

export type ComponentAllocationInput = MoneyBreakdown & {
  key?: number | string;
};

export type ComponentReconciliationResult<T extends ComponentAllocationInput> =
  | { ok: true; components: T[] }
  | {
      ok: false;
      reason: "incomplete" | "overallocated" | "invalid_money" | "cannot_reconcile";
      message: string;
    };

function roundDivide(numerator: bigint, denominator: bigint) {
  return Number((numerator + denominator / BigInt(2)) / denominator);
}

export function computeFromNetMinor(netMinor: number, rateBasisPoints: number): MoneyBreakdown {
  const vatMinor = roundDivide(BigInt(netMinor) * BigInt(rateBasisPoints), BigInt(10000));
  return { net: netMinor, vat: vatMinor, gross: netMinor + vatMinor };
}

export function computeFromGrossMinor(grossMinor: number, rateBasisPoints: number): MoneyBreakdown {
  const divisor = BigInt(10000 + rateBasisPoints);
  const netMinor = roundDivide(BigInt(grossMinor) * BigInt(10000), divisor);
  return { net: netMinor, vat: grossMinor - netMinor, gross: grossMinor };
}

export function isBalancedMoney(value: MoneyBreakdown) {
  return value.net >= 0 && value.vat >= 0 && value.gross > 0 && value.net + value.vat === value.gross;
}

export function reconcileComponentResidual<T extends ComponentAllocationInput>(
  parent: MoneyBreakdown,
  components: T[],
  residualIndex = components.length - 1,
): T[] {
  const result = tryReconcileComponentResidual(parent, components, residualIndex);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.components;
}

export function tryReconcileComponentResidual<T extends ComponentAllocationInput>(
  parent: MoneyBreakdown,
  components: T[],
  residualIndex = components.length - 1,
): ComponentReconciliationResult<T> {
  if (components.length === 0) {
    return {
      ok: false,
      reason: "incomplete",
      message: "At least one payment component is required.",
    };
  }
  if (!isBalancedMoney(parent)) {
    return {
      ok: false,
      reason: "invalid_money",
      message: "Request totals must be calculated before the payment schedule can be balanced.",
    };
  }
  if (components.some((component) => component.net < 0 || component.vat < 0 || component.gross < 0)) {
    return {
      ok: false,
      reason: "invalid_money",
      message: "Payment components cannot contain negative amounts.",
    };
  }
  const index = Math.max(0, Math.min(residualIndex, components.length - 1));
  const totals = components.reduce(
    (sum, component) => ({
      net: sum.net + component.net,
      vat: sum.vat + component.vat,
      gross: sum.gross + component.gross,
    }),
    { net: 0, vat: 0, gross: 0 },
  );
  const residual = {
    net: parent.net - totals.net,
    vat: parent.vat - totals.vat,
    gross: parent.gross - totals.gross,
  };

  if (residual.gross > 0) {
    return {
      ok: false,
      reason: "incomplete",
      message: "Payment schedule incomplete. Allocate the remaining gross amount before submission.",
    };
  }
  if (residual.gross < 0) {
    return {
      ok: false,
      reason: "overallocated",
      message: "Payment components exceed the request gross total.",
    };
  }

  const reconciled = components.map((component, componentIndex) => {
    if (componentIndex !== index) return component;
    const next = {
      ...component,
      net: component.net + residual.net,
      vat: component.vat + residual.vat,
      gross: component.gross + residual.gross,
    };
    if (next.net < 0 || next.vat < 0 || next.gross < 0 || next.net + next.vat !== next.gross) {
      return null;
    }
    return next;
  });

  if (reconciled.some((component) => component === null)) {
    return {
      ok: false,
      reason: "cannot_reconcile",
      message: "These component totals cannot be reconciled with the request totals. Review the VAT treatment or amounts.",
    };
  }

  return { ok: true, components: reconciled as T[] };
}

export function allocateGrossByPercentages(
  parent: MoneyBreakdown,
  rateBasisPoints: number,
  percentages: number[],
) {
  if (percentages.length === 0) return [];
  const totalPercent = percentages.reduce((total, percentage) => total + percentage, 0);
  if (totalPercent <= 0) throw new Error("Split percentages must be greater than zero.");

  let allocatedGross = 0;
  const grossParts = percentages.map((percentage, index) => {
    if (index === percentages.length - 1) return parent.gross - allocatedGross;
    const part = roundDivide(BigInt(parent.gross) * BigInt(percentage), BigInt(totalPercent));
    allocatedGross += part;
    return part;
  });

  const provisional = grossParts.map((gross) => computeFromGrossMinor(gross, rateBasisPoints));
  return reconcileComponentResidual(parent, provisional);
}
