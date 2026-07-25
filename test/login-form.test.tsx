import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/login-form";

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
};
const signInWithPassword = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword,
    },
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates missing fields before calling Supabase", async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Enter your email and password.")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("shows a safe failed-login message", async () => {
    signInWithPassword.mockResolvedValueOnce({
      error: new Error("Invalid login credentials"),
    });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("Email"), "missing@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "bad-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("We could not sign you in with those details."),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("redirects successful login to a sanitized internal return path", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    render(<LoginForm returnTo="/events/abc" />);

    await userEvent.type(screen.getByLabelText("Email"), "treasurer@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/events/abc"));
    expect(router.refresh).toHaveBeenCalled();
  });

  it("rejects external return paths", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    render(<LoginForm returnTo="https://example.com/steal" />);

    await userEvent.type(screen.getByLabelText("Email"), "treasurer@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/events"));
  });
});
