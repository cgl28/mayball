import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/src/types/database.generated";

export function ProductTierBadge({ tier }: { tier: Enums<"event_product_tier"> }) {
  return tier === "pro" ? (
    <Badge className="border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-50">Chiffre Pro</Badge>
  ) : (
    <Badge variant="secondary">Demo</Badge>
  );
}
