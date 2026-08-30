import { EvidenceStatusBadge } from "@/components/evidence-status-badge";
import { getRequiredEvidence, type RequestEvidenceKind } from "@/lib/request-evidence";

export function RequestEvidenceBadges({
  requestKind,
  presentCategories,
  className = "flex flex-wrap gap-1.5",
}: {
  requestKind: RequestEvidenceKind;
  presentCategories: Iterable<string | null | undefined>;
  className?: string;
}) {
  const present = new Set([...presentCategories].filter((category): category is string => Boolean(category)));
  return <div className={className}>{getRequiredEvidence(requestKind).map((requirement) => <EvidenceStatusBadge key={requirement.category} type={requirement.category} label={requirement.badgeLabel} present={present.has(requirement.category)} />)}</div>;
}
