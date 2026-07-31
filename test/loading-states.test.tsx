import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoadingAppPage from "@/app/app/loading";
import LoadingEventPage from "@/app/events/[eventId]/loading";

describe("route loading states", () => {
  it("renders an accessible app loading state", () => {
    const { container } = render(<LoadingAppPage />);

    const loading = container.querySelector("[aria-busy='true']");
    expect(loading).toHaveAttribute("aria-live", "polite");
  });

  it("renders an accessible event page loading state", () => {
    const { container } = render(<LoadingEventPage />);

    const loading = container.querySelector("[aria-busy='true']");
    expect(loading).toHaveAttribute("aria-live", "polite");
  });
});
