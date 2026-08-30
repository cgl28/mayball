import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function RequestComponentSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border border-violet-200 bg-violet-50/70 p-3 text-violet-950", className)} {...props} />;
}
