import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { organisationContext, UserIdentityCard } from "@/components/user-identity-card";

describe("user identity card", () => {
  it("uses the preferred organisation, then a single organisation, without choosing arbitrarily", () => {
    const organisations = [{ id: "a", name: "Downing College" }, { id: "b", name: "Trinity College" }];
    expect(organisationContext(organisations, "b")).toBe("Trinity College");
    expect(organisationContext([organisations[0]], null)).toBe("Downing College");
    expect(organisationContext(organisations, null)).toBe("Multiple organisations");
  });

  it("renders a compact authorised identity preview safely", () => {
    render(<UserIdentityCard compact name="Cameron Lackey" organisation="Downing College" email="cameron@example.com" />);
    expect(screen.getByRole("img", { name: "Cameron Lackey initials" })).toHaveTextContent("CL");
    expect(screen.getByText("Downing College")).toBeInTheDocument();
  });
});
