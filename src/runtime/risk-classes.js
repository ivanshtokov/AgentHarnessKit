export const riskClasses = Object.freeze({
  READ_ONLY: "read_only",
  INTERNAL_DRAFT: "internal_draft",
  INTERNAL_WRITE: "internal_write",
  EXTERNAL_COMMUNICATION: "external_communication",
  FINANCIAL_ACTION: "financial_action",
  LEGAL_OR_REGULATED: "legal_or_regulated",
  DESTRUCTIVE_ACTION: "destructive_action",
  PRIVILEGED_ACTION: "privileged_action"
});

export const approvalRequiredRiskClasses = new Set([
  riskClasses.INTERNAL_WRITE,
  riskClasses.EXTERNAL_COMMUNICATION,
  riskClasses.FINANCIAL_ACTION,
  riskClasses.LEGAL_OR_REGULATED,
  riskClasses.DESTRUCTIVE_ACTION,
  riskClasses.PRIVILEGED_ACTION
]);
