# Codex Integration

## Что сделано

Репозиторий поддерживает два нативных способа подключения в Codex:

- repo-scoped skill: `.agents/skills/harness-agent-kit/`;
- repo-scoped plugin marketplace: `.agents/plugins/marketplace.json` -> `plugins/harness-agent-kit/`.

## Почему так

Свежая документация Codex говорит:

- skill — это директория с `SKILL.md` и опциональными `scripts/`, `references/`, `assets/`;
- `SKILL.md` должен содержать `name` и `description`;
- Codex ищет repo skills в `.agents/skills`;
- plugin должен иметь `.codex-plugin/plugin.json`;
- repo marketplace живёт в `.agents/plugins/marketplace.json`;
- plugin entry должен указывать `source.path` на plugin directory.

## Локальное использование skill

Открой Codex в корне repo. Codex должен увидеть:

```text
.agents/skills/harness-agent-kit/SKILL.md
```

Явный вызов:

```text
$harness-agent-kit спроектируй approval-gated агента для renewal risk
```

## Локальное использование plugin

Marketplace уже лежит здесь:

```text
.agents/plugins/marketplace.json
```

Plugin лежит здесь:

```text
plugins/harness-agent-kit/.codex-plugin/plugin.json
```

После изменения plugin перезапусти Codex. В plugin directory должен появиться marketplace `Harness Agent Kit`.

## Git-backed marketplace entry

Для marketplace в другом repo можно ссылаться на GitHub:

```json
{
  "name": "harness-agent-kit",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/ivanshtokov/AgentHarnessKit.git",
    "path": "./plugins/harness-agent-kit",
    "ref": "main"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Engineering"
}
```

## Проверка

```bash
npm run verify:integrations
```

Проверяется:

- repo skill path;
- plugin manifest;
- marketplace entry;
- bundled skill inside plugin;
- references/templates/assets inside skill package.

## Subagents и cron-like сессии

Codex subagents и automation/cron-like сессии нельзя считать обычным продолжением текущего чата.

Правило:

- передавай в subagent `templates/harness-boot-contract.md`;
- указывай task scope, write boundaries, risk class, allowed tools;
- требуй handoff с inspected resources, changes, observations, risks, next step;
- для workspace jobs держи `AGENTS.md`, `SKILL.md`, `.agents/skills/harness-agent-kit/` в repo.

Шаблон:

```text
Use templates/harness-boot-contract.md.
Read AGENTS.md and SKILL.md.
Task: [bounded task]
Write scope: [paths or none]
Risk class: [risk class]
Return: findings, changes, validation, observations, risks, next step.
```

## Источники

- Codex Agent Skills: https://developers.openai.com/codex/skills
- Codex AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- Codex Plugins: https://developers.openai.com/codex/plugins
- Build Codex plugins: https://developers.openai.com/codex/plugins/build
