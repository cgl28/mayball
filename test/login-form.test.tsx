import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/auth/login/page";
import { LoginForm } from "@/components/login-form";

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
};
const signInWithPassword = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  redirect: vi.fn(),
}));

vi.mock("next/server", () => ({
  connection: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword,
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
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

  it("renders the Home control and logo on the actual login page", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("img", { name: "May Ball Finance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
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

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/app"));
  });

  it("defaults successful login to the authenticated home", async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("Email"), "treasurer@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/app"));
  });
});
