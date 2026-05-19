import { createBudgetController } from "./budget.js";
import { createContextBuilder } from "./context-builder.js";
import { HarnessPolicyError, HarnessToolError, HarnessValidationError } from "./errors.js";
import { createDefaultPermissionEngine } from "./permission-engine.js";
import { createTraceRecorder } from "./trace-recorder.js";
import { createToolRegistry } from "./tool-registry.js";

export { HarnessPolicyError, HarnessToolError, HarnessValidationError };

export function createHarness({
  model,
  tools = [],
  permissionEngine = createDefaultPermissionEngine(),
  contextBuilder = createContextBuilder(),
  budget = createBudgetController(),
  trace = createTraceRecorder(),
  stateStore = null,
  toolRegistry = createToolRegistry()
} = {}) {
  if (!model || typeof model.next !== "function") {
    throw new HarnessValidationError("Harness requires model.next(context)");
  }

  for (const tool of tools) {
    toolRegistry.register(tool);
  }

  return {
    toolRegistry,
    permissionEngine,
    trace,
    budget,
    stateStore,

    async run(task, { state = {}, maxSteps } = {}) {
      validateTask(task);
      const observations = [];
      const stepLimit = maxSteps ?? budget.snapshot().limits.maxSteps;

      stateStore?.upsertTask?.({
        id: task.id,
        objective: task.objective,
        status: "running"
      });
      trace.record("task_started", { taskId: task.id, objective: task.objective });

      for (let step = 1; step <= stepLimit; step += 1) {
        try {
          budget.step();
        } catch (error) {
          if (error instanceof HarnessPolicyError) {
            return stopForBudgetExhaustion({ error, task, observations, trace, budget, stateStore });
          }
          throw error;
        }
        trace.record("step_started", { taskId: task.id, step });

        const context = contextBuilder.build({
          task,
          tools: toolRegistry.listForModel(),
          state,
          observations
        });
        trace.record("context_built", {
          taskId: task.id,
          step,
          toolCount: context.stablePrefix.toolSchemas.length,
          observationCount: observations.length
        });

        const modelOutput = await model.next(context);
        trace.record("model_output_received", {
          taskId: task.id,
          step,
          outputType: modelOutput.type
        });

        if (modelOutput.type === "final") {
          trace.record("task_finished", {
            taskId: task.id,
            reason: "done",
            step
          });
          stateStore?.upsertTask?.({
            id: task.id,
            status: "done",
            finishedAt: new Date().toISOString()
          });
          return {
            status: "done",
            final: modelOutput.content,
            observations,
            trace: trace.all(),
            budget: budget.snapshot()
          };
        }

        if (modelOutput.type !== "tool_call") {
          throw new HarnessValidationError("Model output type is invalid", { modelOutput });
        }

        const observation = await handleToolCall({
          toolRegistry,
          permissionEngine,
          budget,
          trace,
          task,
          modelOutput
        });

        observations.push(observation);

        if (observation.status === "budget_exhausted") {
          return stopForBudgetExhaustion({
            details: observation.details,
            task,
            observations,
            trace,
            budget,
            stateStore
          });
        }

        if (observation.status === "validation_error" || observation.status === "tool_error") {
          continue;
        }

        if (observation.status === "approval_required") {
          trace.record("task_paused", {
            taskId: task.id,
            reason: "needs_approval",
            tool: observation.tool
          });
          stateStore?.upsertTask?.({
            id: task.id,
            status: "needs_approval",
            pendingApproval: observation.approvalRequest
          });
          return {
            status: "needs_approval",
            approvalRequest: observation.approvalRequest,
            observations,
            trace: trace.all(),
            budget: budget.snapshot()
          };
        }
      }

      trace.record("task_stopped", { taskId: task.id, reason: "step_limit" });
      stateStore?.upsertTask?.({
        id: task.id,
        status: "budget_exhausted",
        stopReason: "step_limit"
      });
      return {
        status: "budget_exhausted",
        reason: "step_limit",
        observations,
        trace: trace.all(),
        budget: budget.snapshot()
      };
    }
  };
}

async function handleToolCall({
  toolRegistry,
  permissionEngine,
  budget,
  trace,
  task,
  modelOutput
}) {
  const { toolName, args = {} } = modelOutput;
  try {
    budget.toolCall();
  } catch (error) {
    if (error instanceof HarnessPolicyError) {
      trace.record("budget_exhausted", {
        taskId: task.id,
        toolName,
        reason: error.message,
        details: error.details || {}
      });
      return {
        status: "budget_exhausted",
        tool: toolName,
        reason: error.message,
        details: error.details || {}
      };
    }
    throw error;
  }
  trace.record("tool_call_proposed", { taskId: task.id, toolName, args: redact(args) });

  let tool;
  try {
    tool = toolRegistry.get(toolName);
  } catch (error) {
    trace.record("tool_validation_failed", {
      taskId: task.id,
      toolName,
      reason: error.message
    });
    return {
      status: "validation_error",
      tool: toolName,
      reason: error.message,
      details: error.details || {}
    };
  }

  const decision = permissionEngine.decide({ tool, args, task });
  trace.record("permission_decision_made", {
    taskId: task.id,
    toolName,
    decision: decision.decision,
    riskClass: decision.riskClass,
    reason: decision.reason
  });

  if (decision.decision === "deny") {
    return {
      status: "denied",
      tool: toolName,
      reason: decision.reason
    };
  }

  if (decision.decision === "ask_approval") {
    return {
      status: "approval_required",
      tool: toolName,
      reason: decision.reason,
      approvalRequest: decision.approvalRequest
    };
  }

  trace.record("tool_execution_started", { taskId: task.id, toolName });
  let result;
  try {
    result = await toolRegistry.execute(toolName, args, {
      task,
      approvalId: decision.approvalId
    });
  } catch (error) {
    if (error instanceof HarnessValidationError) {
      trace.record("tool_validation_failed", {
        taskId: task.id,
        toolName,
        reason: error.message
      });
      return {
        status: "validation_error",
        tool: toolName,
        reason: error.message,
        details: error.details || {}
      };
    }

    if (error instanceof HarnessPolicyError) {
      trace.record("tool_policy_denied", {
        taskId: task.id,
        toolName,
        reason: error.message
      });
      return {
        status: "denied",
        tool: toolName,
        reason: error.message,
        details: error.details || {}
      };
    }

    trace.record("tool_execution_failed", {
      taskId: task.id,
      toolName,
      reason: error.message
    });
    if (error.details?.code === "timeout") {
      trace.record("tool_timeout", {
        taskId: task.id,
        toolName,
        timeoutMs: error.details.timeoutMs
      });
      return {
        status: "timeout",
        tool: toolName,
        reason: error.message,
        details: error.details || {}
      };
    }
    return {
      status: "tool_error",
      tool: toolName,
      reason: error.message,
      details: error.details || {}
    };
  }
  trace.record("tool_execution_completed", {
    taskId: task.id,
    toolName,
    status: result.status
  });
  return result;
}

function validateTask(task) {
  if (!task || typeof task !== "object") {
    throw new HarnessValidationError("Task must be an object");
  }
  if (!task.id || typeof task.id !== "string") {
    throw new HarnessValidationError("Task id is required");
  }
  if (!task.objective || typeof task.objective !== "string") {
    throw new HarnessValidationError("Task objective is required");
  }
}

function stopForBudgetExhaustion({ error = null, details = null, task, observations, trace, budget, stateStore }) {
  trace.record("task_stopped", {
    taskId: task.id,
    reason: "budget_exhausted",
    details: details || error?.details || {}
  });
  stateStore?.upsertTask?.({
    id: task.id,
    status: "budget_exhausted",
    stopReason: "budget_exhausted"
  });
  return {
    status: "budget_exhausted",
    reason: "budget_exhausted",
    observations,
    trace: trace.all(),
    budget: budget.snapshot()
  };
}

function redact(value) {
  if (!value || typeof value !== "object") return value;
  const redacted = Array.isArray(value) ? [] : {};
  for (const [key, item] of Object.entries(value)) {
    if (/secret|token|password|key/i.test(key)) {
      redacted[key] = "[REDACTED]";
    } else if (item && typeof item === "object") {
      redacted[key] = redact(item);
    } else {
      redacted[key] = item;
    }
  }
  return redacted;
}
