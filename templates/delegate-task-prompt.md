# Delegate Task Prompt Template

Use this when calling Hermes `delegate_task`, Codex subagents, or another isolated worker.

```text
Use the harness-agent-kit skill/principles.

Context:
- Repository: https://github.com/ivanshtokov/AgentHarnessKit
- Skill/package path if available: skills/harness-agent-kit
- Project instructions: AGENTS.md
- Boot rules: templates/harness-boot-contract.md

Task:
[one bounded task]

Scope:
- Read: [paths/resources]
- Write: [paths/resources, or "none"]
- Tools allowed: [toolsets/tools]
- Risk class: [read_only/internal_draft/internal_write/external_communication/financial_action/legal_or_regulated/destructive_action/privileged_action]

Approval:
- Do not perform high-risk side effects.
- If the task requires a risky action, return an approval_request instead of executing it.

Return:
- Findings or patch summary.
- Files changed.
- Validation run.
- Observations for failed/denied/timed-out tool calls.
- Remaining risks.
```
