# Contributing

## Local checks

Run before opening a PR:

```bash
npm run sync:skills
npm run verify:integrations
npm test
```

## Repo rules

- Keep `SKILL.md`, `references/`, `templates/`, and `icon.jpeg` canonical at the repo root.
- Run `npm run sync:skills` after changing skill content.
- Do not edit generated skill copies directly:
  - `.agents/skills/harness-agent-kit/`
  - `skills/harness-agent-kit/`
  - `plugins/harness-agent-kit/skills/harness-agent-kit/`
- Keep examples approval-gated when they involve external writes.
- Keep provider adapters SDK-light unless the dependency is explicitly justified.

## Pull request checklist

- Tests pass.
- Integration verifier passes.
- Skill package copies are synced.
- README or docs updated when behavior changes.
- Risky runtime changes include tests.
