# Hermes Cron Prompt Template

Hermes cron jobs run in fresh sessions. The prompt must be self-contained and the job must attach `harness-agent-kit` in the `skills` array.

```text
Use the harness-agent-kit skill for this scheduled task.

Runtime rules:
- Treat this as a fresh session with no parent chat context.
- Load and apply the harness-agent-kit principles.
- Use narrow tools.
- Return observations for every tool result.
- Do not perform external, destructive, financial, privileged, or regulated side effects without an approval record.
- Persist state to files or memory if the next run needs it.
- Include a compact handoff at the end.

Task:
[scheduled objective]

State path:
[file or memory key]

Done condition:
[measurable condition]

Output:
- Current status.
- Data inspected.
- Decisions.
- State written.
- Approval needed.
- Next scheduled expectation.
```

Example job shape:

```json
{
  "name": "Harness audit heartbeat",
  "prompt": "Use the harness-agent-kit skill for this scheduled task. Audit pending harness work and write a compact status report.",
  "skills": ["harness-agent-kit"],
  "deliver": "local"
}
```
