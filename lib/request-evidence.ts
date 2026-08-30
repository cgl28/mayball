export type RequestEvidenceKind = "supplier_purchase" | "member_reimbursement" | null | undefined;
export type RequestEvidenceCategory = "invoice" | "receipt" | "expense_claim_form";

export type EvidenceRequirement = {
  category: RequestEvidenceCategory;
  label: string;
  badgeLabel: string;
};

const supplierEvidence: EvidenceRequirement[] = [
  { category: "invoice", label: "Invoice", badgeLabel: "Invoice" },
  { category: "receipt", label: "Receipt", badgeLabel: "Receipt" },
];

const reimbursementEvidence: EvidenceRequirement[] = [
  { category: "expense_claim_form", label: "Expense Claim Form", badgeLabel: "Claim Form" },
  { category: "receipt", label: "Receipt", badgeLabel: "Receipt" },
];

export function getRequiredEvidence(requestKind: RequestEvidenceKind): EvidenceRequirement[] {
  return requestKind === "member_reimbursement" ? reimbursementEvidence : supplierEvidence;
}

export function hasRequiredEvidence(
  requestKind: RequestEvidenceKind,
  categories: Iterable<string | null | undefined>,
) {
  const present = new Set([...categories].filter((category): category is string => Boolean(category)));
  return getRequiredEvidence(requestKind).every((requirement) => present.has(requirement.category));
}

export function reimbursementDocumentOrder(category: string | null | undefined) {
  return ({ expense_claim_form: 0, receipt: 1, invoice: 2, supporting: 3, other: 4 } as Record<string, number>)[category ?? ""] ?? 5;
}
