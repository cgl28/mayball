import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinancialField } from "@/components/financial-field";
import { initialsForName, InitialsAvatar } from "@/components/initials-avatar";
import { RequestComponentSurface } from "@/components/request-component-surface";
import { StatusBadge } from "@/components/status-badge";

describe("Stage 14 shared visual primitives", () => {
  it("keeps explicit financial labels while applying semantic field treatments", () => {
    render(
      <>
        <FinancialField kind="net" name="net" label="Net" />
        <FinancialField kind="vat" name="vat" label="VAT" />
        <FinancialField kind="gross" name="gross" label="Gross" />
      </>,
    );

    expect(screen.getByLabelText("Net")).toHaveClass("bg-sky-50/70");
    expect(screen.getByLabelText("VAT")).toHaveClass("bg-amber-50/70");
    expect(screen.getByLabelText("Gross")).toHaveClass("bg-emerald-50/70");
  });

  it("renders component blocks with the shared pale-purple surface", () => {
    render(<RequestComponentSurface>Deposit</RequestComponentSurface>);

    expect(screen.getByText("Deposit")).toHaveClass("bg-violet-50/70");
    expect(screen.getByText("Deposit")).toHaveClass("border-violet-200");
  });

  it("uses blue for submitted progression and green for paid completion", () => {
    render(
      <>
        <StatusBadge kind="approval" status="submitted" />
        <StatusBadge kind="payment" status="paid" />
      </>,
    );

    expect(screen.getByText("Submitted")).toHaveClass("bg-sky-600");
    expect(screen.getByText("Paid")).toHaveClass("bg-emerald-600");
  });

  it("derives deterministic initials without storing a profile image", () => {
    expect(initialsForName("Alex Aesthetics")).toBe("AA");
    expect(initialsForName("Treasurer")).toBe("TR");

    render(<InitialsAvatar name="Alex Aesthetics" />);
    expect(screen.getByRole("img", { name: "Alex Aesthetics initials" })).toHaveTextContent("AA");
  });
});
