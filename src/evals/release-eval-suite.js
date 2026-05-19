import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createBudgetController } from "../runtime/budget.js";
import { createCompactionSnapshot } from "../runtime/compaction.js";
import { createHarness } from "../runtime/harness.js";
import { createDefaultPermissionEngine } from "../runtime/permission-engine.js";
import { riskClasses } from "../runtime/risk-classes.js";
import { createMemoryStateStore } from "../runtime/state-store.js";
import { createJsonlTraceExporter } from "../runtime/trace-exporters.js";
import { createTraceRecorder } from "../runtime/trace-recorder.js";
import { runHarnessEvals } from "./eval-runner.js";

export async function runReleaseEvals() {
  return runHarnessEvals(createReleaseEvalCases());
}

export function createReleaseEvalCases() {
  return [
    approvalRequiredForExternalCommunication(),
    approvalCannotBeReusedForDifferentArgs(),
    sandboxedToolDeniedWithoutRunner(),
    budgetExhaustionReturnsStructuredResult(),
    traceExporterRedactsSecrets(),
    compactionSnapshotPreservesRuntimeState()
  ];
}

function approvalRequiredForExternalCommunication() {
  return {
    name: "external communication requires approval",
    async run() {
      let executed = false;
      const harness = createHarness({
        model: onceToolCall({
          toolName: "send_email",
          args: { emailId: "eml_1" }
        }),
        tools: [
          {
            name: "send_email",
            description: "Send an external customer email.",
            riskClass: riskClasses.EXTERNAL_COMMUNICATION,
            inputSchema: objectSchema({
              emailId: { type: "string" }
            }),
            async execute() {
              executed = true;
              return { status: "success" };
            }
          }
        ]
      });

      const result = await harness.run({
        id: "eval_external_approval",
        objective: "Send a customer email"
      });
      return { result, executed };
    },
    assert({ result, executed }) {
      return result.status === "needs_approval" && executed === false;
    }
  };
}

function approvalCannotBeReusedForDifferentArgs() {
  return {
    name: "approval is scoped to exact args",
    async run() {
      const permissionEngine = createDefaultPermissionEngine();
      permissionEngine.approvalStore.approve({
        taskId: "eval_args_bound_approval",
        toolName: "send_email",
        riskClass: riskClasses.EXTERNAL_COMMUNICATION,
        args: { emailId: "approved_email" },
        reviewerId: "ops_1"
      });

      const harness = createHarness({
        permissionEngine,
        model: onceToolCall({
          toolName: "send_email",
          args: { emailId: "different_email" }
        }),
        tools: [
          {
            name: "send_email",
            description: "Send an external customer email.",
            riskClass: riskClasses.EXTERNAL_COMMUNICATION,
            inputSchema: objectSchema({
              emailId: { type: "string" }
            }),
            async execute() {
              return { status: "success" };
            }
          }
        ]
      });

      return harness.run({
        id: "eval_args_bound_approval",
        objective: "Send a customer email"
      });
    },
    assert(result) {
      return result.status === "needs_approval";
    }
  };
}

function sandboxedToolDeniedWithoutRunner() {
  return {
    name: "sandboxed tool has no host fallback",
    async run() {
      const harness = createHarness({
        model: toolThenFinal({
          toolName: "run_isolated_check",
          args: { target: "repo" }
        }),
        tools: [
          {
            name: "run_isolated_check",
            description: "Run a check in an isolated sandbox.",
            riskClass: riskClasses.READ_ONLY,
            isolation: "sandbox",
            sandboxSpec: {
              image: "node:20",
              network: "none"
            },
            inputSchema: objectSchema({
              target: { type: "string" }
            })
          }
        ]
      });

      return harness.run({
        id: "eval_sandbox_denial",
        objective: "Run isolated check"
      });
    },
    assert(result) {
      return (
        result.status === "done" &&
        result.observations[0].status === "denied" &&
        result.observations[0].details.isolation === "sandbox"
      );
    }
  };
}

function budgetExhaustionReturnsStructuredResult() {
  return {
    name: "budget exhaustion is a structured result",
    async run() {
      const harness = createHarness({
        budget: createBudgetController({ maxToolCalls: 0 }),
        model: onceToolCall({
          toolName: "read_profile",
          args: { userId: "usr_1" }
        }),
        tools: [
          {
            name: "read_profile",
            description: "Read a user profile.",
            riskClass: riskClasses.READ_ONLY,
            inputSchema: objectSchema({
              userId: { type: "string" }
            }),
            async execute() {
              return { status: "success" };
            }
          }
        ]
      });

      return harness.run({
        id: "eval_budget_exhaustion",
        objective: "Read profile"
      });
    },
    assert(result) {
      return (
        result.status === "budget_exhausted" &&
        result.observations[0].status === "budget_exhausted" &&
        result.trace.some((event) => event.type === "budget_exhausted")
      );
    }
  };
}

function traceExporterRedactsSecrets() {
  return {
    name: "trace exporter redacts secrets",
    async run() {
      const filePath = path.join(os.tmpdir(), `harnesskit-release-eval-${Date.now()}.jsonl`);
      const trace = createTraceRecorder({
        exporters: [createJsonlTraceExporter({ filePath })]
      });

      trace.record("connector_call", {
        apiKey: "secret",
        nested: {
          authorization: "Bearer secret"
        }
      });

      const lines = fs.readFileSync(filePath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
      fs.rmSync(filePath, { force: true });
      return lines[0];
    },
    assert(event) {
      return event.apiKey === "[REDACTED]" && event.nested.authorization === "[REDACTED]";
    }
  };
}

function compactionSnapshotPreservesRuntimeState() {
  return {
    name: "compaction snapshot preserves runtime state",
    async run() {
      const stateStore = createMemoryStateStore();
      const snapshot = createCompactionSnapshot({
        task: {
          id: "eval_compaction",
          objective: "Resume after compaction"
        },
        activePlan: { id: "plan_1", version: 3 },
        activeGoal: { id: "goal_1", doneCondition: "all evals pass" },
        approvals: [{ id: "apr_1", toolName: "send_email" }],
        artifacts: [{ id: "art_1", kind: "draft" }],
        doNotRedo: ["approval review"],
        loadedSkills: ["harness-agent-kit"],
        connectorState: [{ name: "mcp_drive", scopes: ["drive.readonly"] }]
      });

      stateStore.addCheckpoint({
        taskId: snapshot.taskId,
        kind: "compaction_snapshot",
        snapshot
      });

      return stateStore.listCheckpoints("eval_compaction")[0].snapshot;
    },
    assert(snapshot) {
      return (
        snapshot.activePlan.version === 3 &&
        snapshot.activeGoal.doneCondition === "all evals pass" &&
        snapshot.approvals[0].id === "apr_1" &&
        snapshot.loadedSkills.includes("harness-agent-kit") &&
        snapshot.connectorState[0].scopes.includes("drive.readonly")
      );
    }
  };
}

function onceToolCall({ toolName, args }) {
  return {
    async next() {
      return {
        type: "tool_call",
        toolName,
        args
      };
    }
  };
}

function toolThenFinal({ toolName, args }) {
  return {
    calls: 0,
    async next() {
      this.calls += 1;
      if (this.calls === 1) {
        return {
          type: "tool_call",
          toolName,
          args
        };
      }
      return {
        type: "final",
        content: "Done"
      };
    }
  };
}

function objectSchema(properties) {
  return {
    type: "object",
    required: Object.keys(properties),
    properties
  };
}
