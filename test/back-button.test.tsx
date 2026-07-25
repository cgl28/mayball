import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackButton } from "@/components/back-button";

const router = {
  back: vi.fn(),
  push: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

describe("BackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "referrer", {
      value: "",
      configurable: true,
    });
  });

  it("falls back to the public homepage when there is no safe referrer", async () => {
    render(<BackButton />);

    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(router.push).toHaveBeenCalledWith("/");
    expect(router.back).not.toHaveBeenCalled();
  });

  it("uses browser history when the referrer is same-origin", async () => {
    Object.defineProperty(document, "referrer", {
      value: `${window.location.origin}/features`,
      configurable: true,
    });
    window.history.pushState({}, "", "/auth/login");
    render(<BackButton />);

    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(router.back).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
