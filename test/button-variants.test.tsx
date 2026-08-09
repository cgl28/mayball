import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("shared button variants", () => {
  it("renders success as a filled green action with a readable disabled state", () => {
    render(
      <Button variant="success" disabled>
        Approve
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Approve" });

    expect(button).toHaveClass("bg-emerald-700");
    expect(button).toHaveClass("text-white");
    expect(button).toHaveClass("disabled:bg-emerald-100");
    expect(button).toHaveClass("disabled:text-emerald-900");
    expect(button).toHaveClass("disabled:opacity-100");
  });

  it("keeps warning as amber and destructive as red", () => {
    render(
      <>
        <Button variant="warning">Request Changes</Button>
        <Button variant="destructive">Reject</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Request Changes" })).toHaveClass(
      "bg-amber-400",
      "text-amber-950",
    );
    expect(screen.getByRole("button", { name: "Reject" })).toHaveClass(
      "bg-destructive",
      "text-destructive-foreground",
    );
  });
});
