import { describe, expect, it } from "vitest";
import {
  allocateGrossByPercentages,
  computeFromGrossMinor,
  reconcileComponentResidual,
  tryReconcileComponentResidual,
  type MoneyBreakdown,
} from "@/lib/requests/component-allocation";

function expectTotals(parent: MoneyBreakdown, components: MoneyBreakdown[]) {
  const totals = components.reduce(
    (sum, component) => ({
      net: sum.net + component.net,
      vat: sum.vat + component.vat,
      gross: sum.gross + component.gross,
    }),
    { net: 0, vat: 0, gross: 0 },
  );

  expect(totals).toEqual(parent);
  for (const component of components) {
    expect(component.net + component.vat).toBe(component.gross);
  }
}

describe("request component allocation", () => {
  it("balances the 2000 pound 50/50 VAT rounding case onto the final component", () => {
    const parent = computeFromGrossMinor(200000, 2000);
    const components = allocateGrossByPercentages(parent, 2000, [50, 50]);

    expect(parent).toEqual({ net: 166667, vat: 33333, gross: 200000 });
    expect(components).toEqual([
      { net: 83333, vat: 16667, gross: 100000 },
      { net: 83334, vat: 16666, gross: 100000 },
    ]);
    expectTotals(parent, components);
  });

  it("balances a 20/80 split exactly", () => {
    const parent = computeFromGrossMinor(200000, 2000);
    const components = allocateGrossByPercentages(parent, 2000, [20, 80]);

    expect(components.map((component) => component.gross)).toEqual([40000, 160000]);
    expectTotals(parent, components);
  });

  it("balances a 10/90 split exactly", () => {
    const parent = computeFromGrossMinor(200000, 2000);
    const components = allocateGrossByPercentages(parent, 2000, [10, 90]);

    expect(components.map((component) => component.gross)).toEqual([20000, 180000]);
    expectTotals(parent, components);
  });

  it.each([100000, 99999, 10000, 1001, 100])("balances awkward gross %i at 20 percent VAT", (gross) => {
    const parent = computeFromGrossMinor(gross, 2000);

    expectTotals(parent, allocateGrossByPercentages(parent, 2000, [50, 50]));
    expectTotals(parent, allocateGrossByPercentages(parent, 2000, [20, 80]));
    expectTotals(parent, allocateGrossByPercentages(parent, 2000, [10, 90]));
  });

  it("reconciles independently calculated components to the parent totals", () => {
    const parent = computeFromGrossMinor(200000, 2000);
    const components = reconcileComponentResidual(parent, [
      computeFromGrossMinor(100000, 2000),
      computeFromGrossMinor(100000, 2000),
    ]);

    expectTotals(parent, components);
  });

  it("returns an incomplete result instead of throwing for partial component schedules", () => {
    const parent = computeFromGrossMinor(40000, 2000);
    const result = tryReconcileComponentResidual(parent, [
      computeFromGrossMinor(10000, 2000),
      { net: 0, vat: 0, gross: 20000 },
      { net: 0, vat: 0, gross: 10000 },
    ]);

    expect(result).toEqual({
      ok: false,
      reason: "cannot_reconcile",
      message: "These component totals cannot be reconciled with the request totals. Review the VAT treatment or amounts.",
    });
  });

  it("balances a four-component uneven schedule when gross allocations are complete", () => {
    const parent = computeFromGrossMinor(40000, 2000);
    const components = reconcileComponentResidual(parent, [
      computeFromGrossMinor(5000, 2000),
      computeFromGrossMinor(7500, 2000),
      computeFromGrossMinor(12500, 2000),
      computeFromGrossMinor(15000, 2000),
    ]);

    expectTotals(parent, components);
  });
});
