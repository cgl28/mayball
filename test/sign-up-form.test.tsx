import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "@/app/auth/sign-up/page";
import { SignUpForm } from "@/components/sign-up-form";

const router = {
  back: vi.fn(),
  push: vi.fn(),
};
const signUp = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp,
    },
  }),
}));

describe("sign-up page controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "referrer", {
      value: "",
      configurable: true,
    });
  });

  it("renders the shared Back control on the actual sign-up page", async () => {
    render(<SignupPage />);

    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(router.push).toHaveBeenCalledWith("/");
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
  });

  it("keeps sign-up submission behaviour unchanged", async () => {
    signUp.mockResolvedValueOnce({ error: null });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText("Email"), "new@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.type(screen.getByLabelText("Repeat Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/auth/sign-up-success"));
    expect(signUp).toHaveBeenCalledWith({
      email: "new@example.test",
      password: "password123",
      options: {
        emailRedirectTo: "http://localhost:3000/protected",
      },
    });
  });
});
