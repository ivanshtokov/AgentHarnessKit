# Hermes Agent Integration

## Что сделано

Репозиторий поддерживает Hermes-native skill layout:

```text
skills/harness-agent-kit/
  SKILL.md
  references/
  templates/
  assets/
```

Это формат для GitHub tap или direct GitHub install.

## Почему так

Свежая документация Hermes говорит:

- skill — preferred way для возможностей, которые можно описать инструкциями, shell commands и существующими tools;
- `SKILL.md` должен иметь YAML frontmatter;
- поддерживаются `references/`, `templates/`, `scripts/`, `assets/`;
- Hermes tap по умолчанию смотрит в `skills/`;
- каждый skill живёт в отдельной директории под tap root;
- `metadata.hermes.tags`, `platforms`, config settings и env vars поддерживаются в frontmatter.

## Установка из GitHub tap

После публикации repo:

```bash
hermes skills tap add ivanshtokov/AgentHarnessKit
hermes skills install ivanshtokov/AgentHarnessKit/harness-agent-kit
```

Если Hermes требует явный путь:

```bash
hermes skills install ivanshtokov/AgentHarnessKit/skills/harness-agent-kit
```

## Локальное подключение как external dir

Можно не копировать skill, а добавить repo как внешний каталог:

```yaml
skills:
  external_dirs:
    - /absolute/path/to/AgentHarnessKit/skills
```

Hermes будет сканировать его read-only. Локальная версия из `~/.hermes/skills` имеет приоритет.

## Проверка

```bash
npm run verify:integrations
```

Если Hermes установлен:

```bash
hermes skills list
hermes chat --toolsets skills -q "Use the harness-agent-kit skill to audit this agent harness"
```

## Hermes chat

Для обычного `hermes chat` нужны toolsets, которые соответствуют задаче.

Пример:

```bash
hermes chat --toolsets "skills,file,terminal,delegation,cronjob" \
  -q "Use the harness-agent-kit skill to audit this repo"
```

Hermes `hermes-cli` обычно включает skills, delegation и cronjob, но явное `--toolsets` снижает риск запуска с урезанным набором.

## delegate_task

`delegate_task` создаёт изолированного subagent. Он не обязан знать, что было в parent chat.

Правило:

- включай `templates/harness-boot-contract.md` в delegated prompt;
- указывай `toolsets`;
- задавай write scope;
- задавай risk class;
- требуй return handoff.

Минимальный prompt см. `templates/delegate-task-prompt.md`.

## Cron

Hermes cron запускает fresh session. Job не получает parent chat history.

Правило:

- добавляй `skills: ["harness-agent-kit"]`;
- делай prompt self-contained;
- сохраняй state в файл или memory, если следующий запуск должен помнить прошлый;
- не планируй clarifying questions;
- не создавай recursive cron jobs из cron run.

Минимальный prompt см. `templates/hermes-cron-prompt.md`.

## Источники

- Hermes Creating Skills: https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills
- Hermes Skills feature docs: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md
