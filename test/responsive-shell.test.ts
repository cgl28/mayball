import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("authenticated responsive shell", () => {
  it("lets the authenticated main column shrink beside the sidebar", () => {
    const shell = readFileSync("components/app-shell.tsx", "utf8");

    expect(shell).toContain("lg:grid-cols-[18rem_minmax(0,1fr)]");
    expect(shell).toContain("min-w-0");
    expect(shell).toContain("max-w-full");
    expect(shell).not.toContain("lg:pl-72");
    expect(shell).not.toContain("w-screen");
  });

  it("contains wide tables in local horizontal scroll wrappers", () => {
    const finances = readFileSync("components/finances-panel.tsx", "utf8");
    const requests = readFileSync("components/requests-panel.tsx", "utf8");
    const payments = readFileSync("components/payments-panel.tsx", "utf8");

    for (const source of [finances, requests, payments]) {
      expect(source).toContain("max-w-full overflow-x-auto");
    }

    const dashboard = readFileSync("components/dashboard-panel.tsx", "utf8");
    expect(dashboard).toContain("AllocationDonut");
    expect(dashboard).toContain("StackedFinancialBar");
    expect(dashboard).toContain("xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]");
  });

  it("uses container-responsive metric grids on Dashboard and Finances", () => {
    const helper = readFileSync("components/responsive-metric-grid.ts", "utf8");
    const dashboard = readFileSync("components/dashboard-panel.tsx", "utf8");
    const finances = readFileSync("components/finances-panel.tsx", "utf8");

    expect(helper).toContain("repeat(auto-fit,minmax(min(100%,14rem),1fr))");
    expect(dashboard).toContain("responsiveMetricGridClassName");
    expect(finances).toContain("responsiveMetricGridClassName");
    expect(dashboard).not.toContain("md:grid-cols-2 xl:grid-cols-4");
    expect(finances).not.toContain("md:grid-cols-2 xl:grid-cols-4");

    const visuals = readFileSync("components/financial-visuals.tsx", "utf8");
    expect(visuals).toContain("repeat(auto-fit,minmax(min(100%,12rem),1fr))");
    expect(visuals).toContain("xl:grid-cols-[18rem_minmax(0,1fr)]");
  });
});
