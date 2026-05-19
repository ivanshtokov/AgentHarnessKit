import { approvalRequiredRiskClasses, riskClasses } from "./risk-classes.js";
import { createMemoryApprovalStore } from "./state-store.js";

export function createDefaultPermissionEngine({
  approvalStore = createMemoryApprovalStore(),
  autonomousRiskClasses = [riskClasses.READ_ONLY, riskClasses.INTERNAL_DRAFT]
} = {}) {
  const autonomous = new Set(autonomousRiskClasses);

  return {
    approvalStore,

    decide({ tool, args, task }) {
      if (autonomous.has(tool.riskClass)) {
        return allowDecision(tool, "Risk class is allowed autonomously");
      }

      if (approvalRequiredRiskClasses.has(tool.riskClass)) {
        const approval = approvalStore.findApproved({
          toolName: tool.name,
          riskClass: tool.riskClass,
          args,
          taskId: task.id
        });

        if (approval) {
          return {
            decision: "allow",
            riskClass: tool.riskClass,
            reason: "Matching approval record found",
            approvalId: approval.id
          };
        }

        return {
          decision: "ask_approval",
          riskClass: tool.riskClass,
          reason: "Risk class requires approval",
          approvalRequest: {
            toolName: tool.name,
            riskClass: tool.riskClass,
            args,
            taskId: task.id
          }
        };
      }

      return {
        decision: "deny",
        riskClass: tool.riskClass,
        reason: "Risk class is not allowed by policy"
      };
    }
  };
}

export { createMemoryApprovalStore };

function allowDecision(tool, reason) {
  return {
    decision: "allow",
    riskClass: tool.riskClass,
    reason
  };
}
