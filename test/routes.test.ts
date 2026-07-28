import { describe, expect, it } from "vitest";
import { loginPathForReturnTo, sanitizeReturnPath } from "@/lib/routes";

describe("return path safety", () => {
  it("keeps safe internal paths", () => {
    expect(sanitizeReturnPath("/events/abc?tab=people")).toBe(
      "/events/abc?tab=people",
    );
  });

  it("rejects external and protocol-relative paths", () => {
    expect(sanitizeReturnPath("https://example.com/events")).toBe("/app");
    expect(sanitizeReturnPath("//example.com/events")).toBe("/app");
  });

  it("avoids redirecting back to login", () => {
    expect(sanitizeReturnPath("/auth/login?returnTo=/events")).toBe("/app");
  });

  it("builds encoded login redirects for protected routes", () => {
    expect(loginPathForReturnTo("/events/abc", "?from=test")).toBe(
      "/auth/login?returnTo=%2Fevents%2Fabc%3Ffrom%3Dtest",
    );
  });
});
