import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/profile-form";
import { validateProfileForm } from "@/lib/profile/validation";

vi.mock("@/app/app/profile/actions", () => ({
  updateProfileAction: vi.fn(),
}));

describe("profile validation", () => {
  it("accepts supported profile fields", () => {
    const formData = new FormData();
    formData.set("displayName", "Cameron Lackey");
    formData.set("preferredName", "Cameron");

    expect(validateProfileForm(formData)).toEqual({
      ok: true,
      message: "",
      fields: {
        displayName: "Cameron Lackey",
        preferredName: "Cameron",
      },
    });
  });

  it("requires display name and validates preferred name length", () => {
    const missingDisplayName = new FormData();
    missingDisplayName.set("displayName", " ");
    missingDisplayName.set("preferredName", "Cam");

    expect(validateProfileForm(missingDisplayName).message).toMatch(/Display name/);

    const longPreferredName = new FormData();
    longPreferredName.set("displayName", "Cameron");
    longPreferredName.set("preferredName", "x".repeat(81));

    expect(validateProfileForm(longPreferredName).message).toMatch(/Preferred name/);
  });
});

describe("ProfileForm", () => {
  it("renders profile data with read-only email", () => {
    render(
      <ProfileForm
        email="cameron@example.test"
        displayName="Cameron Lackey"
        preferredName="Cameron"
      />,
    );

    expect(screen.getByLabelText("Email")).toHaveValue("cameron@example.test");
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Display name")).toHaveValue("Cameron Lackey");
    expect(screen.getByLabelText("Preferred name")).toHaveValue("Cameron");
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeInTheDocument();
  });
});
