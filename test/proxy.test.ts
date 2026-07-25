import { describe, expect, it, vi } from "vitest";

describe("Supabase proxy session handling", () => {
  async function loadProxyWithUser(user: { id: string } | null) {
    vi.resetModules();
    vi.doMock("@supabase/ssr", () => ({
      createServerClient: () => ({
        auth: {
          getUser: async () => ({ data: { user }, error: null }),
        },
      }),
    }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

    const [{ updateSession }, { NextRequest }] = await Promise.all([
      import("@/lib/supabase/proxy"),
      import("next/server"),
    ]);

    return { updateSession, NextRequest };
  }

  it("redirects unauthenticated protected routes to login with a safe return path", async () => {
    const { updateSession, NextRequest } = await loadProxyWithUser(null);
    const response = await updateSession(
      new NextRequest("http://localhost:3000/events/abc?panel=overview"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/auth/login?returnTo=%2Fevents%2Fabc%3Fpanel%3Doverview",
    );
  });

  it("allows authenticated protected routes to continue", async () => {
    const { updateSession, NextRequest } = await loadProxyWithUser({
      id: "10000000-0000-0000-0000-000000000002",
    });
    const response = await updateSession(
      new NextRequest("http://localhost:3000/events"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
