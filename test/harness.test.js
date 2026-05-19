import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultPermissionEngine,
  createFileStateStore,
  createHarness,
  createMemoryStateStore,
  runHarnessEvals,
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
