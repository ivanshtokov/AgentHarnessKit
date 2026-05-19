---
name: harness-agent-kit
description: "Use this skill when designing, implementing, auditing, testing, or hardening an agent harness. Covers runnable provider-neutral harness architecture: typed tools, permission engines, approval records, budgets, trace events, context and compaction, provider adapters, skills, MCP/connectors, evals, and production readiness."
version: 0.2.0
author: IShtokov
license: MIT
platforms: [windows, macos, linux]
metadata:
  version: "0.2.0"
  scope: "provider-neutral-agent-harness-kit"
  runtime: "node>=20"
  repository: "https://github.com/ivanshtokov/AgentHarnessKit"
  hermes:
    tags: [Agents, Harness, Runtime, Tools, Evals]
    related_skills: []
    config:
      - key: harnesskit.state_path
        description: Optional path for local file-backed harness state.
        default: "./.harnesskit/state.json"
        prompt: Harness state file path
---

# Harness Agent Kit

Use this skill when the user wants to build, package, audit, refactor, or explain an agentic harness. This repository combines a runnable Node.js harness skeleton with a complete reference layer for agent-harness design.

## Core stance

The model proposes actions. The harness validates, authorizes, executes, records, summarizes, and returns observations.

Default loop:

```text
user/task
  -> instruction and context builder
  -> model call
  -> tool/action proposal
  -> schema validation
  -> permission decision
  -> execution or approval pause
  -> structured observation
  -> context/state update
  -> repeat within budget or finish
```

## When to activate

Use this skill for prompts involving:

- agent harness design or implementation;
- typed tool design;
- permission policy and approval gates;
- provider-neutral OpenAI, Anthropic, or compatible API adapters;
- planning mode or long-running goals;
- context, memory, retrieval, and compaction;
- Agent Skills, MCP, connectors, and deferred tool loading;
- observability, evals, trace grading, launch gates, and incident review;
- prompt caching and cost controls;
- hardening an existing agent runtime.

Do not use it for ordinary writing, translation, or single-turn Q&A unless the user asks about an agent that performs those tasks.

## How to use

1. Identify domain, autonomy level, risk level, state duration, tool surface, and validation signal.
2. Prefer the runnable runtime under `src/runtime/` when the user wants code.
3. Prefer `templates/mvp-agent-blueprint.md` when the user wants a first agent design.
4. Load reference files only as needed.
5. For risky actions, separate draft from commit and require approval records outside the prompt.
6. Add evals before claiming production readiness.

## Subagents, delegation, and cron

Do not assume isolated workers inherit this session.

For Codex subagents, Hermes `delegate_task`, cron sessions, or any isolated worker:

1. Include `templates/harness-boot-contract.md` or an equivalent boot block in the delegated prompt.
2. State the task scope, allowed tools, write boundaries, risk class, approval policy, and expected return format.
3. Tell the worker where to find `AGENTS.md`, `SKILL.md`, and relevant references.
4. Require observations for failed, denied, timed-out, and approval-gated tool calls.
5. Require a compact handoff with inspected resources, changed artifacts, decisions, blockers, and next step.

Hermes cron jobs run in fresh sessions. Attach this skill in the cron job's `skills` array and make the prompt self-contained.

Hermes `delegate_task` workers are isolated subagents. Pass the harness boot contract explicitly; do not rely on parent chat memory.

## Reference map

- `references/mvp-agent-blueprint.md`: first file for new domain-specific agent designs.
- `references/architecture.md`: component boundaries and harness maturity levels.
- `references/agentic-loop.md`: loop invariants, budgets, retries, stopping rules.
- `references/tools-and-permissions.md`: typed tools, risk taxonomy, approvals, sandboxing.
- `references/context-memory-compaction.md`: context tiers, memory, retrieval, compaction, handoff.
- `references/prompt-caching-and-cost.md`: stable prefix, dynamic suffix, provider cache notes.
- `references/planning-and-goals.md`: planning mode, goal loops, checkpoints, done conditions.
- `references/skills-and-connectors.md`: Agent Skills, MCP, connectors, tool search, governance.
- `references/system-prompts-instructions.md`: instruction hierarchy and prompt templates.
- `references/provider-api-patterns.md`: OpenAI, Anthropic, and compatible API patterns.
- `references/security-evals-observability.md`: threat model, guardrails, trace, evals, launch gates.
- `references/agent-legibility-feedback-loops.md`: agent-readable environments and feedback loops.
- `references/checklists.md`: condensed implementation and audit checklist.
- `references/coverage-audit.md`: coverage verification.
- `references/source-links.md`: official references and further reading.

## Runtime map

- `src/runtime/harness.js`: model-tool-observation loop.
- `src/runtime/tool-registry.js`: typed tool registration, schema validation, timeouts.
- `src/runtime/permission-engine.js`: risk-based permission decisions and approval lookup.
- `src/runtime/state-store.js`: durable task, approval, artifact, and checkpoint state.
- `src/runtime/context-builder.js`: stable prefix and dynamic suffix assembly.
- `src/runtime/budget.js`: step, tool-call, retry, and cost budgets.
- `src/runtime/trace-recorder.js`: operational trace events.
- `src/runtime/trace-exporters.js`: JSONL trace export with secret redaction.
- `src/runtime/compaction.js`: compaction snapshots and checkpoint persistence.
- `src/connectors/mcp-tool-adapter.js`: MCP connector tools wrapped as namespaced harness tools.
- `src/evals/eval-runner.js`: executable harness eval runner.
- `src/evals/release-eval-suite.js`: built-in launch gate for approval, sandbox, budget, trace, and compaction behavior.
- `templates/harness-boot-contract.md`: minimal instructions for isolated workers.
- `templates/delegate-task-prompt.md`: prompt template for subagents and `delegate_task`.
- `templates/hermes-cron-prompt.md`: prompt template for Hermes cron jobs.

## Output default

When advising, produce concrete architecture:

1. MVP boundary.
2. Harness boundary.
3. Loop.
4. Instructions.
5. Tools.
6. Context and compaction.
7. Planning and goals.
8. Skills and connectors.
9. Safety and approvals.
10. Observability and evals.
11. Rollout.

When implementing, keep the change runnable, tested, and traceable.

## Non-negotiables

- The model does not execute actions directly.
- Every tool call receives an observation.
- Risky side effects require runtime policy outside the model.
- Draft and commit are separate.
- Tool schemas are narrow, typed, validated, and auditable.
- Context is tight, trust-labeled, and cache-aware.
- Compaction preserves working state, not chat prose.
- Long-running goals need budgets and done conditions.
- Trace runtime events, not hidden reasoning.
- Repeated failures become validators, tools, docs, evals, or policy.
