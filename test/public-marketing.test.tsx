import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CallToAction,
  PublicFooter,
  PublicHeader,
  WorkflowSteps,
} from "@/components/marketing/public-layout";

describe("public marketing navigation", () => {
  it("shows public navigation and auth actions for logged-out visitors", () => {
    render(<PublicHeader isAuthenticated={false} />);

    const logo = screen.getByRole("img", { name: "May Ball Finance" });
    expect(logo).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "May Ball Finance home" })).toHaveAttribute("href", "/");
    const desktopNav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(desktopNav).getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(within(desktopNav).getByRole("link", { name: "How It Works" })).toHaveAttribute("href", "/how-it-works");
    const login = screen.getAllByRole("link", { name: "Log In" })[0];
    expect(login).toHaveAttribute("href", "/auth/login");
    expect(login).toHaveClass("text-[hsl(var(--marketing-brand-hover))]");
    expect(login).toHaveClass("bg-white");
    expect(screen.getAllByRole("link", { name: "Get Started" })[0]).toHaveAttribute("href", "/auth/sign-up");
    expect(screen.queryByRole("link", { name: "Open App" })).not.toBeInTheDocument();
  });

  it("shows Open App instead of sign-up encouragement for authenticated visitors", () => {
    render(<PublicHeader isAuthenticated />);

    expect(screen.getAllByRole("link", { name: "Open App" })[0]).toHaveAttribute("href", "/events");
    expect(screen.queryByRole("link", { name: "Get Started" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /theme|dark|light|system/i })).not.toBeInTheDocument();
  });

  it("keeps the mobile menu accessible", () => {
    render(<PublicHeader isAuthenticated={false} />);

    expect(screen.getByText("Open navigation menu")).toBeInTheDocument();
    const mobileNav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(mobileNav).getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(within(mobileNav).getByRole("link", { name: "Get Started" })).toHaveAttribute("href", "/auth/sign-up");
  });

  it("renders footer links including privacy and security placeholder", () => {
    render(<PublicFooter />);

    expect(screen.getByText("May Ball Finance")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy and Security" })).toHaveAttribute("href", "/guides#security");
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
  });
});

describe("public marketing content components", () => {
  it("renders the core workflow steps in order", () => {
    render(<WorkflowSteps steps={["Forecast", "Budget", "Request", "Approve", "Pay", "Reconcile"]} />);

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Forecast")).toBeInTheDocument();
    expect(screen.getByText("Reconcile")).toBeInTheDocument();
  });

  it("uses existing auth routes in the logged-out call to action", () => {
    render(<CallToAction isAuthenticated={false} />);

    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute("href", "/auth/sign-up");
    const login = screen.getByRole("link", { name: "Log In" });
    expect(login).toHaveAttribute("href", "/auth/login");
    expect(login).toHaveClass("text-white");
  });

  it("sends authenticated visitors to the application", () => {
    render(<CallToAction isAuthenticated />);

    expect(screen.getByRole("link", { name: "Open App" })).toHaveAttribute("href", "/events");
    expect(screen.queryByRole("link", { name: "Get Started" })).not.toBeInTheDocument();
  });
});
