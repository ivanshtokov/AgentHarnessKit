import assert from "node:assert/strict";
import test from "node:test";

import {
  createBudgetController,
  createCompactionSnapshot,
  createDefaultPermissionEngine,
  createFileStateStore,
  createHarness,
  createJsonlTraceExporter,
  createMcpToolAdapter,
  createMemoryStateStore,
  createTraceRecorder,
  createToolRegistry,
  runHarnessEvals,
  saveCompactionCheckpoint,
  riskClasses
} from "../src/index.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("runs read-only tool and returns final answer", async () => {
  const model = {
    calls: 0,
    async next() {
      this.calls += 1;
      if (this.calls === 1) {
        return {
          type: "tool_call",
          toolName: "read_profile",
          args: { userId: "usr_1" }
        };
      }
      return {
        type: "final",
        content: "Done"
      };
    }
  };

  const harness = createHarness({
    model,
    tools: [
      {
        name: "read_profile",
        description: "Read a user profile.",
        riskClass: riskClasses.READ_ONLY,
        inputSchema: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string" }
          }
        },
        async execute({ userId }) {
          return {
            status: "success",
            data: { userId }
          };
        }
      }
    ]
  });

  const result = await harness.run({
    id: "task_1",
    objective: "Read profile"
  });

  assert.equal(result.status, "done");
  assert.equal(result.final, "Done");
  assert.equal(result.observations[0].data.userId, "usr_1");
  assert.equal(result.trace[3].type, "model_output_received");
  assert.equal(result.trace[3].outputType, "tool_call");
});

test("pauses when external communication requires approval", async () => {
  const model = {
    async next() {
      return {
        type: "tool_call",
        toolName: "send_email",
        args: { emailId: "eml_1" }
      };
    }
  };

  const harness = createHarness({
    model,
    tools: [
      {
        name: "send_email",
        description: "Send a customer email.",
        riskClass: riskClasses.EXTERNAL_COMMUNICATION,
        inputSchema: {
          type: "object",
          required: ["emailId"],
          properties: {
            emailId: { type: "string" }
          }
        },
        async execute() {
          throw new Error("should not execute without approval");
        }
      }
    ]
  });

  const result = await harness.run({
    id: "task_2",
    objective: "Send customer email"
  });

  assert.equal(result.status, "needs_approval");
  assert.equal(result.approvalRequest.toolName, "send_email");
  assert.equal(result.approvalRequest.riskClass, riskClasses.EXTERNAL_COMMUNICATION);
});

test("executes approval-gated tool after approval record exists", async () => {
  const permissionEngine = createDefaultPermissionEngine();
  permissionEngine.approvalStore.approve({
    taskId: "task_3",
    toolName: "send_email",
    riskClass: riskClasses.EXTERNAL_COMMUNICATION,
    args: { emailId: "eml_1" },
    reviewerId: "ops_1"
  });

  const model = {
    calls: 0,
    async next() {
      this.calls += 1;
      if (this.calls === 1) {
        return {
          type: "tool_call",
          toolName: "send_email",
          args: { emailId: "eml_1" }
        };
      }
      return {
        type: "final",
        content: "Sent"
      };
    }
  };

  const harness = createHarness({
    model,
    permissionEngine,
    tools: [
      {
        name: "send_email",
        description: "Send a customer email.",
        riskClass: riskClasses.EXTERNAL_COMMUNICATION,
        inputSchema: {
          type: "object",
          required: ["emailId"],
          properties: {
            emailId: { type: "string" }
          }
        },
        async execute({ emailId }, context) {
          return {
            status: "success",
            data: { emailId, approvalId: context.approvalId }
          };
        }
      }
    ]
  });

  const result = await harness.run({
    id: "task_3",
    objective: "Send customer email"
  });

  assert.equal(result.status, "done");
  assert.equal(result.observations[0].data.emailId, "eml_1");
  assert.ok(result.observations[0].data.approvalId);
});

test("returns validation observation for malformed tool arguments", async () => {
  const model = {
    calls: 0,
    async next() {
      this.calls += 1;
      if (this.calls === 2) {
        return {
          type: "final",
          content: "Stopped after validation feedback"
        };
      }
      return {
        type: "tool_call",
        toolName: "read_profile",
        args: {}
      };
    }
  };

  const harness = createHarness({
    model,
    tools: [
      {
        name: "read_profile",
        description: "Read a user profile.",
        riskClass: riskClasses.READ_ONLY,
        inputSchema: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string" }
          }
        },
        async execute() {
          throw new Error("should not execute");
        }
      }
    ]
  });

  const result = await harness.run({
    id: "task_4",
    objective: "Read profile"
  });

  assert.equal(result.status, "done");
  assert.equal(result.observations[0].status, "validation_error");
  assert.equal(result.observations[0].tool, "read_profile");
});

test("serializes unlimited cost budget as null", async () => {
  const model = {
    async next() {
      return {
        type: "final",
        content: "Done"
      };
    }
  };

  const harness = createHarness({ model });
  const result = await harness.run({
    id: "task_5",
    objective: "Finish immediately"
  });

  assert.equal(result.budget.limits.maxCostUsd, null);
  assert.doesNotThrow(() => JSON.stringify(result.budget));
});

test("returns budget exhausted result when tool-call budget is exceeded", async () => {
  const model = {
    async next() {
      return {
        type: "tool_call",
        toolName: "read_profile",
        args: { userId: "usr_1" }
      };
    }
  };

  const harness = createHarness({
    model,
    budget: createBudgetController({ maxToolCalls: 0 }),
    tools: [
      {
        name: "read_profile",
        description: "Read a user profile.",
        riskClass: riskClasses.READ_ONLY,
        inputSchema: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string" }
          }
        },
        async execute() {
          throw new Error("should not execute after budget exhaustion");
        }
      }
    ]
  });

  const result = await harness.run({ id: "task_budget", objective: "Read profile" });
  assert.equal(result.status, "budget_exhausted");
  assert.equal(result.observations[0].status, "budget_exhausted");
  assert.equal(result.observations[0].tool, "read_profile");
  assert.equal(result.trace.some((event) => event.type === "budget_exhausted"), true);
});

test("does not reuse approval record for different args", async () => {
  const permissionEngine = createDefaultPermissionEngine();
  permissionEngine.approvalStore.approve({
    taskId: "task_6",
    toolName: "send_email",
    riskClass: riskClasses.EXTERNAL_COMMUNICATION,
    args: { emailId: "approved_email" }
  });

  const model = {
    async next() {
      return {
        type: "tool_call",
        toolName: "send_email",
        args: { emailId: "different_email" }
      };
    }
  };

  const harness = createHarness({
    model,
    permissionEngine,
    tools: [
      {
        name: "send_email",
        description: "Send a customer email.",
        riskClass: riskClasses.EXTERNAL_COMMUNICATION,
        inputSchema: {
          type: "object",
          required: ["emailId"],
          properties: {
            emailId: { type: "string" }
          }
        },
        async execute() {
          throw new Error("should not execute with mismatched approval args");
        }
      }
    ]
  });

  const result = await harness.run({
    id: "task_6",
    objective: "Send customer email"
  });

  assert.equal(result.status, "needs_approval");
});

test("validates nested objects, arrays, enums, and string patterns", async () => {
  const model = {
    calls: 0,
    async next() {
      this.calls += 1;
      if (this.calls === 2) return { type: "final", content: "Validation observed" };
      return {
        type: "tool_call",
        toolName: "create_ticket",
        args: {
          priority: "urgent",
          assignee: { id: "bad id" },
          tags: ["renewal"]
        }
      };
    }
  };

  const harness = createHarness({
    model,
    tools: [
      {
        name: "create_ticket",
        description: "Create an internal support ticket.",
        riskClass: riskClasses.INTERNAL_DRAFT,
        inputSchema: {
          type: "object",
          required: ["priority", "assignee", "tags"],
          properties: {
            priority: { type: "string", enum: ["low", "medium", "high"] },
            assignee: {
              type: "object",
              required: ["id"],
              properties: {
                id: { type: "string", pattern: "^usr_[a-z0-9]+$" }
              }
            },
            tags: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 2 }
            }
          }
        },
        async execute() {
          throw new Error("should not execute invalid schema");
        }
      }
    ]
  });

  const result = await harness.run({ id: "task_7", objective: "Create ticket" });
  assert.equal(result.observations[0].status, "validation_error");
  assert.equal(result.observations[0].details.path, "$.priority");
});

test("returns timeout observation for slow tools", async () => {
  const model = {
    calls: 0,
    async next() {
      this.calls += 1;
      if (this.calls === 2) return { type: "final", content: "Timeout handled" };
      return {
        type: "tool_call",
        toolName: "slow_read",
        args: {}
      };
    }
  };

  const harness = createHarness({
    model,
    tools: [
      {
        name: "slow_read",
        description: "Slow read for timeout testing.",
        riskClass: riskClasses.READ_ONLY,
        timeoutMs: 5,
        inputSchema: {
          type: "object",
          properties: {}
        },
        async execute() {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { status: "success" };
        }
      }
    ]
  });

  const result = await harness.run({ id: "task_8", objective: "Trigger timeout" });
  assert.equal(result.status, "done");
  assert.equal(result.observations[0].status, "timeout");
  assert.ok(result.trace.some((event) => event.type === "tool_timeout"));
});

test("persists task and approval state to file", async () => {
  const filePath = path.join(os.tmpdir(), `harnesskit-state-${Date.now()}.json`);
  const stateStore = createFileStateStore({ filePath });

  stateStore.upsertTask({ id: "task_9", objective: "Persist state", status: "running" });
  stateStore.approvals().approve({
    taskId: "task_9",
    toolName: "send_email",
    riskClass: riskClasses.EXTERNAL_COMMUNICATION,
    args: { emailId: "eml_9" },
    reviewerId: "ops_1"
  });

  const reopened = createFileStateStore({ filePath });
  assert.equal(reopened.getTask("task_9").status, "running");
  assert.equal(
    reopened.approvals().findApproved({
      taskId: "task_9",
      toolName: "send_email",
      riskClass: riskClasses.EXTERNAL_COMMUNICATION,
      args: { emailId: "eml_9" }
    }).reviewerId,
    "ops_1"
  );

  fs.rmSync(filePath, { force: true });
});

test("updates state store during harness run", async () => {
  const stateStore = createMemoryStateStore();
  const model = {
    async next() {
      return { type: "final", content: "Done" };
    }
  };

  const harness = createHarness({ model, stateStore });
  await harness.run({ id: "task_10", objective: "Stateful run" });

  assert.equal(stateStore.getTask("task_10").status, "done");
});

test("runs executable harness eval cases", async () => {
  const report = await runHarnessEvals([
    {
      name: "passing eval",
      async run() {
        return { status: "done" };
      },
      async assert(result) {
        return result.status === "done";
      }
    },
    {
      name: "failing eval",
      async run() {
        return { status: "needs_approval" };
      },
      async assert(result) {
        return result.status === "done";
      }
    }
  ]);

  assert.equal(report.status, "failed");
  assert.equal(report.results[0].status, "passed");
  assert.equal(report.results[1].status, "failed");
});

test("keeps full harness reference coverage", () => {
  const expectedReferences = [
    "agent-legibility-feedback-loops.md",
    "agentic-loop.md",
    "architecture.md",
    "checklists.md",
    "context-memory-compaction.md",
    "coverage-audit.md",
    "mvp-agent-blueprint.md",
    "planning-and-goals.md",
    "prompt-caching-and-cost.md",
    "provider-api-patterns.md",
    "security-evals-observability.md",
    "skills-and-connectors.md",
    "source-links.md",
    "system-prompts-instructions.md",
    "tools-and-permissions.md"
  ];

  const referenceDir = path.join(process.cwd(), "references");
  const actualReferences = fs.readdirSync(referenceDir).filter((file) => file.endsWith(".md")).sort();

  assert.deepEqual(actualReferences, expectedReferences.sort());
});

test("denies sandboxed tools when no sandbox runner is configured", async () => {
  const model = {
    calls: 0,
    async next() {
      this.calls += 1;
      if (this.calls === 2) return { type: "final", content: "Denied safely" };
      return {
        type: "tool_call",
        toolName: "run_isolated_check",
        args: { target: "repo" }
      };
    }
  };

  const harness = createHarness({
    model,
    tools: [
      {
        name: "run_isolated_check",
        description: "Run an isolated check in a sandbox.",
        riskClass: riskClasses.READ_ONLY,
        isolation: "sandbox",
        inputSchema: {
          type: "object",
          required: ["target"],
          properties: {
            target: { type: "string" }
          }
        },
        sandboxSpec: {
          image: "node:20",
          network: "none"
        }
      }
    ]
  });

  const result = await harness.run({ id: "task_11", objective: "Run isolated check" });
  assert.equal(result.status, "done");
  assert.equal(result.observations[0].status, "denied");
  assert.equal(result.observations[0].details.isolation, "sandbox");
});

test("executes sandboxed tools through configured sandbox runner", async () => {
  const registry = createToolRegistry({
    sandboxRunner: {
      async execute({ tool, args, context }) {
        assert.equal(tool.name, "run_isolated_check");
        assert.equal(args.target, "repo");
        assert.equal(context.task.id, "task_12");
        return {
          status: "success",
          data: { isolated: true }
        };
      }
    }
  });

  registry.register({
    name: "run_isolated_check",
    description: "Run an isolated check in a sandbox.",
    riskClass: riskClasses.READ_ONLY,
    isolation: "sandbox",
    inputSchema: {
      type: "object",
      required: ["target"],
      properties: {
        target: { type: "string" }
      }
    },
    sandboxSpec: {
      image: "node:20",
      network: "none"
    }
  });

  const result = await registry.execute(
    "run_isolated_check",
    { target: "repo" },
    { task: { id: "task_12" } }
  );

  assert.equal(result.status, "success");
  assert.equal(result.data.isolated, true);
});

test("exports trace events as redacted jsonl", async () => {
  const filePath = path.join(os.tmpdir(), `harnesskit-trace-${Date.now()}.jsonl`);
  const exporter = createJsonlTraceExporter({ filePath });
  const model = {
    async next() {
      return { type: "final", content: "Done" };
    }
  };

  const harness = createHarness({
    model,
    trace: createTraceRecorder({ exporters: [exporter] })
  });

  harness.trace.record("custom_event", {
    apiKey: "secret_value",
    nested: { authorization: "Bearer secret" }
  });

  await harness.run({ id: "task_13", objective: "Export trace" });
  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n").map((line) => JSON.parse(line));

  assert.equal(lines[0].apiKey, "[REDACTED]");
  assert.equal(lines[0].nested.authorization, "[REDACTED]");
  assert.equal(lines.some((line) => line.type === "task_started"), true);

  fs.rmSync(filePath, { force: true });
});

test("creates and persists compaction checkpoint snapshots", () => {
  const stateStore = createMemoryStateStore();
  const snapshot = createCompactionSnapshot({
    task: { id: "task_14", objective: "Resume later" },
    activePlan: { id: "plan_1", version: 2 },
    activeGoal: { id: "goal_1", doneCondition: "all checks pass" },
    approvals: [{ id: "apr_1" }],
    observations: [{ status: "approval_required", tool: "send_email", reason: "approval" }],
    trace: [{ id: "evt_1", type: "task_started" }],
    doNotRedo: ["npm test"]
  });

  const checkpoint = saveCompactionCheckpoint({ stateStore, snapshot });
  const saved = stateStore.listCheckpoints("task_14")[0];

  assert.equal(checkpoint.kind, "compaction_snapshot");
  assert.equal(saved.snapshot.activePlan.version, 2);
  assert.equal(saved.snapshot.observations[0].status, "approval_required");
  assert.equal(saved.snapshot.traceSummary.eventCount, 1);
});

test("wraps MCP connector tools as namespaced harness tools", async () => {
  const tool = createMcpToolAdapter({
    serverName: "Google Drive",
    toolName: "Search Files",
    description: "Search files through an MCP connector.",
    riskClass: riskClasses.READ_ONLY,
    scopes: ["drive.readonly"],
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" }
      }
    },
    async callTool({ serverName, toolName, args, scopes }) {
      assert.equal(serverName, "Google Drive");
      assert.equal(toolName, "Search Files");
      assert.equal(args.query, "contract");
      assert.deepEqual(scopes, ["drive.readonly"]);
      return [{ id: "file_1" }];
    }
  });

  assert.equal(tool.name, "mcp_google_drive_search_files");
  const result = await tool.execute({ query: "contract" }, {});
  assert.equal(result.status, "success");
  assert.equal(result.data[0].id, "file_1");
  assert.equal(result.metadata.connectorType, "mcp");
});
