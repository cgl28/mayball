import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("light-mode application shell", () => {
  it("does not mount next-themes or suppress hydration for theme class changes", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");

    expect(layout).not.toContain("next-themes");
    expect(layout).not.toContain("ThemeProvider");
    expect(layout).not.toContain("suppressHydrationWarning");
    expect(layout).toContain('<html lang="en">');
  });

  it("keeps light colour scheme authoritative in global CSS", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("color-scheme: light");
    expect(css).not.toContain(".dark");
    expect(css).not.toContain("prefers-color-scheme");
  });

  it("does not keep a visible theme toggle in protected layout", () => {
    const protectedLayout = readFileSync("app/protected/layout.tsx", "utf8");

    expect(protectedLayout).not.toContain("ThemeSwitcher");
    expect(protectedLayout).not.toContain("theme-switcher");
  });
});
