export const documentCategoryOptions = ["quote", "contract", "invoice", "receipt", "expense_claim_form", "supporting", "other"] as const;

export function documentCategoryLabel(value: string | null | undefined) {
  if (value === "expense_claim_form") return "Expense Claim Form";
  const text = value?.replaceAll("_", " ");
  return text ? text[0].toUpperCase() + text.slice(1) : "Not set";
}

export function documentCategoriesForRequest(requestKind: string | null | undefined) {
  if (requestKind === "member_reimbursement") {
    return ["expense_claim_form", "receipt", "supporting", "invoice", "other"] as const;
  }
  return documentCategoryOptions;
}
