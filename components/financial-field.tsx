import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type FinancialFieldKind = "net" | "vat" | "gross";

const financialFieldStyles: Record<FinancialFieldKind, { label: string; input: string }> = {
  net: { label: "text-sky-950", input: "border-sky-200 bg-sky-50/70 focus-visible:ring-sky-700" },
  vat: { label: "text-amber-950", input: "border-amber-200 bg-amber-50/70 focus-visible:ring-amber-700" },
  gross: { label: "text-emerald-950", input: "border-emerald-200 bg-emerald-50/70 focus-visible:ring-emerald-700" },
};

export function FinancialField({ kind, label, className, inputClassName, ...inputProps }: InputHTMLAttributes<HTMLInputElement> & {
  kind: FinancialFieldKind;
  label: string;
  inputClassName?: string;
}) {
  const styles = financialFieldStyles[kind];
  return (
    <label className={cn("grid min-w-0 gap-1 text-sm", className)}>
      <span className={cn("font-medium", styles.label)}>{label}</span>
      <input
        {...inputProps}
        aria-label={inputProps["aria-label"] ?? label}
        className={cn("w-full max-w-full rounded-md border px-3 py-2 focus-visible:outline-none focus-visible:ring-1 disabled:bg-muted disabled:text-muted-foreground", styles.input, inputClassName)}
      />
    </label>
  );
}
