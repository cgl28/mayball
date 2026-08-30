import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge, statusLabel } from "@/components/status-badge";

describe("StatusBadge", () => {
  const approvalCases = [
    ["draft", "Draft", "bg-slate-200", "text-slate-950"],
    ["submitted", "Submitted", "bg-sky-600", "text-white"],
    ["changes_requested", "Changes Requested", "bg-amber-400", "text-amber-950"],
    ["rejected", "Rejected", "bg-red-700", "text-white"],
    ["approved", "Approved", "bg-emerald-600", "text-white"],
    ["variation_pending", "Variation Pending", "bg-blue-700", "text-white"],
    ["cancelled", "Cancelled", "bg-slate-600", "text-white"],
  ] as const;

  const paymentCases = [
    ["unpaid", "Unpaid", "bg-orange-500", "text-slate-950"],
    ["partially_paid", "Partially Paid", "bg-amber-400", "text-amber-950"],
    ["paid", "Paid", "bg-emerald-600", "text-white"],
    ["overpaid", "Overpaid", "bg-red-800", "text-white"],
    ["not_applicable", "Not Applicable", "bg-slate-200", "text-slate-950"],
  ] as const;

  it("renders human-readable approval labels", () => {
    render(<StatusBadge kind="approval" status="variation_pending" />);

    expect(screen.getByText("Variation Pending")).toBeInTheDocument();
    expect(screen.queryByText("variation_pending")).not.toBeInTheDocument();
  });

  it("renders human-readable payment labels", () => {
    render(<StatusBadge kind="payment" status="partially_paid" />);

    expect(screen.getByText("Partially Paid")).toBeInTheDocument();
  });

  it("formats unknown enum-like strings consistently", () => {
    expect(statusLabel("changes_requested")).toBe("Changes Requested");
  });

  it.each(approvalCases)("uses filled readable approval styling for %s", (status, label, background, foreground) => {
    render(<StatusBadge kind="approval" status={status} />);

    const badge = screen.getByText(label).closest("div");
    expect(badge).toHaveClass(background);
    expect(badge).toHaveClass(foreground);
    expect(badge?.className).not.toContain("dark:");
  });

  it.each(paymentCases)("uses filled readable payment styling for %s", (status, label, background, foreground) => {
    render(<StatusBadge kind="payment" status={status} />);

    const badge = screen.getByText(label).closest("div");
    expect(badge).toHaveClass(background);
    expect(badge).toHaveClass(foreground);
    expect(badge?.className).not.toContain("dark:");
  });

  it("keeps approval and payment badges visually separate", () => {
    render(
      <div>
        <StatusBadge kind="approval" status="approved" />
        <StatusBadge kind="payment" status="paid" />
      </div>,
    );

    expect(screen.getByText("Approved").closest("div")).toHaveClass("bg-emerald-600");
    expect(screen.getByText("Paid").closest("div")).toHaveClass("bg-emerald-600");
  });
});
