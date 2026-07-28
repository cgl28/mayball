import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/app-sidebar";
import { makeEventAccess } from "@/test/fixtures";

let pathname = "/app";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: vi.fn(),
    },
  }),
}));

describe("authenticated sidebar", () => {
  beforeEach(() => {
    pathname = "/app";
  });

  it("renders Home before Profile and marks Home active", () => {
    render(<AppSidebar events={[makeEventAccess()]} />);

    const nav = screen.getAllByRole("navigation", { name: "Application navigation" })[0];
    const links = within(nav).getAllByRole("link");

    expect(links[0]).toHaveTextContent("Home");
    expect(links[0]).toHaveAttribute("href", "/app");
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[1]).toHaveTextContent("Profile");
    expect(links[1]).toHaveAttribute("href", "/app/profile");
  });

  it("keeps Home available and shows event navigation on event pages", () => {
    pathname = "/events/30000000-0000-0000-0000-000000000027/dashboard";

    render(<AppSidebar events={[makeEventAccess()]} />);

    expect(screen.getAllByRole("link", { name: /Home/ })[0]).toHaveAttribute("href", "/app");
    expect(screen.getAllByText("Current Event").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Dashboard/ })[0]).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("link", { name: /Budget/ })[0]).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027/budget",
    );
    expect(screen.getAllByRole("link", { name: /Finances/ })[0]).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027/finances",
    );
    expect(screen.getAllByRole("link", { name: /Committee/ })[0]).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027/committee",
    );
  });

  it("keeps approvals visible but marked locked for non-treasurers", () => {
    pathname = "/events/30000000-0000-0000-0000-000000000027/dashboard";

    render(<AppSidebar events={[makeEventAccess({ roles: ["committee_member"] })]} />);

    const approvalsLink = screen.getAllByRole("link", {
      name: /Approvals require the Treasurer role/,
    })[0];

    expect(approvalsLink).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027/approvals",
    );
  });

  it("does not mark approvals locked for treasurers", () => {
    pathname = "/events/30000000-0000-0000-0000-000000000027/dashboard";

    render(<AppSidebar events={[makeEventAccess({ roles: ["treasurer"] })]} />);

    expect(
      screen.queryByRole("link", { name: /Approvals require the Treasurer role/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Approvals$/ })[0]).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027/approvals",
    );
  });

  it("keeps lifecycle visible and unlocked for non-presidents", () => {
    pathname = "/events/30000000-0000-0000-0000-000000000027/dashboard";

    render(<AppSidebar events={[makeEventAccess({ roles: ["committee_member"] })]} />);

    expect(screen.getAllByRole("link", { name: /^Lifecycle$/ })[0]).toHaveAttribute(
      "href",
      "/events/30000000-0000-0000-0000-000000000027/settings/lifecycle",
    );
    expect(
      screen.queryByRole("link", { name: /Lifecycle.*President/ }),
    ).not.toBeInTheDocument();
  });

  it("does not render a theme toggle", () => {
    render(<AppSidebar events={[]} />);

    expect(screen.queryByRole("button", { name: /theme|dark|light|system/i })).not.toBeInTheDocument();
  });
});
