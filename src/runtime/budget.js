import { HarnessPolicyError } from "./errors.js";

export function createBudgetController({
  maxSteps = 12,
  maxToolCalls = 20,
  maxRetries = 2,
  maxCostUsd = null
} = {}) {
  const usage = {
    steps: 0,
    toolCalls: 0,
    retries: 0,
    costUsd: 0
  };

  function assertWithinBudget(kind) {
    const exhausted =
      usage.steps > maxSteps ||
      usage.toolCalls > maxToolCalls ||
      usage.retries > maxRetries ||
      (typeof maxCostUsd === "number" && usage.costUsd > maxCostUsd);

    if (exhausted) {
      throw new HarnessPolicyError("Budget exhausted", {
        kind,
        usage: snapshot(),
        limits: { maxSteps, maxToolCalls, maxRetries, maxCostUsd }
      });
    }
  }

  function snapshot() {
    return {
      usage: { ...usage },
      limits: { maxSteps, maxToolCalls, maxRetries, maxCostUsd }
    };
  }

  return {
    step() {
      usage.steps += 1;
      assertWithinBudget("step");
    },

    toolCall() {
      usage.toolCalls += 1;
      assertWithinBudget("tool_call");
    },

    retry() {
      usage.retries += 1;
      assertWithinBudget("retry");
    },

    cost(amountUsd) {
      usage.costUsd += amountUsd;
      assertWithinBudget("cost");
    },

    snapshot
  };
}
