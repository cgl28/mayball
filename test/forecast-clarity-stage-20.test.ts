import { describe, expect, it } from "vitest";
import {
  actualAsForecastPercentage,
  financialPositionLabel,
  formatPercentage,
} from "@/lib/financial-terminology";

describe("Stage 20 forecast clarity helpers", () => {
  it("reports actual income above forecast without capping the percentage", () => {
    expect(formatPercentage(actualAsForecastPercentage(120_000, 100_000)!)).toBe("120");
  });

  it("does not show a percentage when forecast income is zero", () => {
    expect(actualAsForecastPercentage(10_000, 0)).toBeNull();
  });

  it("makes surplus, deficit and break-even visible in position labels", () => {
    expect(financialPositionLabel("Forecast", 1)).toBe("Forecast surplus");
    expect(financialPositionLabel("Potential", -1)).toBe("Potential deficit");
    expect(financialPositionLabel("Forecast", 0)).toBe("Forecast break-even");
  });
});
