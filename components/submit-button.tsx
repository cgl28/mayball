"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  variant,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
} & Omit<React.ComponentProps<typeof Button>, "type" | "variant">) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} variant={variant} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
