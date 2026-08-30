import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EvidenceStatusBadge({
  type,
  label,
  present,
  className,
}: {
  type: "invoice" | "receipt" | "expense_claim_form";
  label?: string;
  present: boolean;
  className?: string;
}) {
  const displayLabel = label ?? (type === "invoice" ? "Invoice" : type === "expense_claim_form" ? "Expense Claim Form" : "Receipt");
  const state = present ? "attached" : "not attached";
  const Icon = present ? CheckCircle2 : XCircle;

  return (
    <Badge
      variant="outline"
      title={`${displayLabel} ${state}`}
      className={cn(
        "gap-1 whitespace-nowrap px-2 py-0 text-[0.6875rem] font-semibold shadow-sm",
        present ? "border-emerald-800 bg-emerald-600 text-white" : "border-red-800 bg-red-700 text-white",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {displayLabel}
      <span className="sr-only"> {state}</span>
    </Badge>
  );
}
