import { Circle, CheckCircle2, Clock3, XCircle, AlertTriangle, Ban, CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusKind = "approval" | "payment";

const approvalStyles: Record<string, { label: string; className: string; icon: typeof Circle }> = {
  draft: { label: "Draft", className: "border-slate-300 bg-slate-200 text-slate-950", icon: Circle },
  submitted: { label: "Submitted", className: "border-sky-700 bg-sky-600 text-white", icon: Clock3 },
  changes_requested: { label: "Changes Requested", className: "border-amber-600 bg-amber-400 text-amber-950", icon: AlertTriangle },
  rejected: { label: "Rejected", className: "border-red-800 bg-red-700 text-white", icon: XCircle },
  approved: { label: "Approved", className: "border-emerald-800 bg-emerald-600 text-white", icon: CheckCircle2 },
  variation_pending: { label: "Variation Pending", className: "border-blue-800 bg-blue-700 text-white", icon: Clock3 },
  cancelled: { label: "Cancelled", className: "border-slate-700 bg-slate-600 text-white", icon: Ban },
};

const paymentStyles: Record<string, { label: string; className: string; icon: typeof CircleDollarSign }> = {
  not_applicable: { label: "Not Applicable", className: "border-slate-300 bg-slate-200 text-slate-950", icon: Circle },
  unpaid: { label: "Unpaid", className: "border-orange-700 bg-orange-500 text-slate-950", icon: CircleDollarSign },
  partially_paid: { label: "Partially Paid", className: "border-amber-700 bg-amber-400 text-amber-950", icon: Clock3 },
  paid: { label: "Paid", className: "border-emerald-800 bg-emerald-600 text-white", icon: CheckCircle2 },
  overpaid: { label: "Overpaid", className: "border-red-900 bg-red-800 text-white", icon: AlertTriangle },
};

export function statusLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not Set";
}

export function StatusBadge({
  kind,
  status,
  className,
}: {
  kind: StatusKind;
  status: string | null | undefined;
  className?: string;
}) {
  const styles = kind === "approval" ? approvalStyles : paymentStyles;
  const entry = status ? styles[status] : undefined;
  const Icon = entry?.icon ?? Circle;

  return (
    <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap font-semibold shadow-sm", entry?.className ?? "border-slate-300 bg-slate-200 text-slate-950", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {entry?.label ?? statusLabel(status)}
    </Badge>
  );
}
