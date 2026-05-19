# Harness Agent Kit Repo Instructions

## Scope

These instructions apply to this repository.

## Work Rules

- Keep runtime changes provider-neutral unless a provider adapter is explicitly requested.
- Preserve native Codex and Hermes layouts:
  - `.agents/skills/harness-agent-kit/`
  - `.agents/plugins/marketplace.json`
  - `plugins/harness-agent-kit/`
  - `skills/harness-agent-kit/`
- Keep `references/` aligned with the repository reference layer unless intentionally updating the source baseline.
- Run `npm test` after changing JavaScript, skill packages, plugin manifests, or integration docs.
- Do not add runtime dependencies without a clear reason.
- Risky side effects in examples must stay approval-gated.
- Delegated workers, subagents, Hermes `delegate_task`, and cron jobs must receive `templates/harness-boot-contract.md` or an equivalent self-contained boot block.
- Hermes cron jobs must attach the `harness-agent-kit` skill in their `skills` array. Do not assume cron sessions inherit chat context.
- Hermes `delegate_task` prompts must state scope, allowed tools, risk class, approval policy, and expected return format.

## Verification

Before claiming integration work is complete:

```bash
npm test
npm run verify:integrations
```
