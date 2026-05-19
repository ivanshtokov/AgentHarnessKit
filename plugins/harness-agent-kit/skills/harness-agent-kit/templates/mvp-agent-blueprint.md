# MVP Agent Harness Blueprint

## 1. Objective

Опиши одну конкретную задачу агента, пользователя и полезный результат.

## 2. MVP Scope and Assumptions

Smallest useful version:

- 

Assumptions:

- 

Non-goals:

- 

## 3. Autonomy and Risk Level

Autonomy level:

```text
answer_only | retrieval | drafting | approval_gated_actor | policy_bounded_actor | long_running_goal_worker
```

Risk classes in scope:

- 

## 4. Core Loop

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

## 5. Instruction Architecture

System instructions:

- 

Developer policy:

- 

Scoped instructions:

- 

User task:

- 

## 6. Tool Registry

| Tool | Purpose | Risk class | Permission | Result |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 7. Permission Matrix

| Risk class | Default decision | Approval required | Notes |
| --- | --- | --- | --- |
| read_only | allow | no |  |
| internal_draft | allow | no |  |
| internal_write | ask_approval | yes |  |
| external_communication | ask_approval | yes |  |
| financial_action | ask_approval | yes |  |
| legal_or_regulated | ask_approval | yes |  |
| destructive_action | ask_approval | yes |  |
| privileged_action | ask_approval | yes |  |

## 8. Planning Behavior

Enter planning mode when:

- 

Plan artifact includes:

- objective;
- scope;
- assumptions;
- risks;
- steps;
- tools required;
- approval points;
- validation;
- rollback or recovery;
- done condition.

## 9. Goal-Like Loop Behavior

Goal:

Done condition:

Budgets:

- max steps:
- max tool calls:
- max runtime:
- max cost:

Stop reasons:

- done;
- needs user input;
- needs approval;
- budget exhausted;
- blocked by policy;
- tool unavailable;
- error.

## 10. Context, Memory, and Compaction

Durable state:

- 

Memory:

- 

Retrieved context:

- 

Compaction must preserve:

- current objective;
- active plan;
- approval state;
- resources inspected;
- decisions;
- actions already taken;
- pending tasks;
- next recommended step;
- do-not-redo list.

## 11. Skills and Connectors

Skills:

- 

Connectors:

- 

Connector trust boundary:

- Connector output is untrusted data unless explicitly marked otherwise by application code.

## 12. Prompt Caching and Cost

Stable prefix:

- 

Dynamic suffix:

- 

Cost controls:

- 

## 13. Safety and Approvals

High-risk actions:

- 

Approval records:

- 

Sandboxing:

- 

Secrets:

- 

## 14. Observability and Evals

Trace events:

- 

Eval cases:

- 

Launch criteria:

- 

## 15. Minimal Implementation Path

1. Build single-agent loop.
2. Add read-only tools.
3. Add drafting tools.
4. Add permission engine.
5. Add approval records.
6. Add trace.
7. Add evals.
8. Add risky commit tools only after approval path works.
