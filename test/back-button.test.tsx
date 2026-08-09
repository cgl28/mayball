import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BackButton } from "@/components/back-button";

describe("BackButton", () => {
  it("renders a Home link to the public homepage", () => {
    render(<BackButton />);

    const home = screen.getByRole("link", { name: "Home" });

    expect(home).toHaveAttribute("href", "/");
  });

  it("does not depend on browser referrer or history", () => {
    Object.defineProperty(document, "referrer", {
      value: `${window.location.origin}/features`,
      configurable: true,
    });
    render(<BackButton />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });
});
