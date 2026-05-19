# Harness Agent Kit

![Harness Agent Kit architecture banner](assets/harness-agent-kit-hero.png)

[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-111827)](package.json)
[![Zero dependencies](https://img.shields.io/badge/deps-zero-0f766e)](package.json)
[![License MIT](https://img.shields.io/badge/license-MIT-7c3aed)](LICENSE)

Стартовый набор для агентного харнесса: typed tools, permission engine, approval-gates, durable state, budgets, trace events, context builder, reference-layer, templates и тесты.

Автор и контакт: [@IShtokov](https://t.me/IShtokov)

Репозиторий: [ivanshtokov/AgentHarnessKit](https://github.com/ivanshtokov/AgentHarnessKit)

## Зачем

LLM не должна быть оператором с прямым доступом к системам. Она предлагает шаг. Харнесс проверяет, можно ли этот шаг выполнять.

Рабочая формула:

```text
model proposes
harness validates
harness authorizes
harness executes
harness records
model receives observation
```

Практический смысл:

- модель не отправляет письма сама;
- модель не пишет в базу сама;
- модель не деплоит сама;
- модель не решает, можно ли нарушить policy;
- runtime хранит approvals, state, budgets и trace вне prompt.

## Что уже есть

- Zero-dependency Node.js runtime.
- Tool registry со schema validation и timeouts.
- Permission engine с approval-gated risk classes и args-bound approvals.
- Memory/file state store для tasks, approvals, artifacts, checkpoints.
- Budget controller для steps, tool calls, retries, cost.
- Trace recorder без hidden reasoning.
- Context builder со stable prefix и dynamic suffix.
- Executable eval runner.
- Approval-gated пример renewal-risk агента.
- Русская документация по подходу.
- Полный reference-layer по проектированию агентных харнессов.
- Templates для MVP blueprint, permission matrix, compaction handoff, evals.
- Тесты core behavior через `node --test`.

## Быстрый старт

```bash
git clone https://github.com/ivanshtokov/AgentHarnessKit.git
cd AgentHarnessKit
npm test
npm run verify:integrations
npm run example:renewal-risk
```

Ожидаемый результат:

- тесты проходят;
- пример сначала останавливается на `needs_approval`;
- после approval record выполняет `send_customer_email`;
- trace показывает tool proposal, permission decision и execution result.
- integration verifier подтверждает Codex/Hermes package layout.

## Структура

```text
harnesskit/
  README.md
  SKILL.md
  AGENTS.md
  LICENSE
  package.json
  icon.jpeg
  .agents/
    skills/harness-agent-kit/
    plugins/marketplace.json
  plugins/
    harness-agent-kit/
      .codex-plugin/plugin.json
      skills/harness-agent-kit/
  skills/
    harness-agent-kit/
  src/
    index.js
    evals/
      eval-runner.js
    runtime/
      budget.js
      context-builder.js
      errors.js
      harness.js
      permission-engine.js
      risk-classes.js
      schema-validator.js
      state-store.js
      tool-registry.js
      trace-recorder.js
  examples/
    renewal-risk-agent.js
  docs/
    approach.ru.md
    harness-architecture.ru.md
    production-checklist.ru.md
    reference-map.ru.md
    runtime-hardening.ru.md
    tool-permission-model.ru.md
  references/
    architecture.md
    agentic-loop.md
    tools-and-permissions.md
    context-memory-compaction.md
    provider-api-patterns.md
    ...
  templates/
    compaction-handoff.md
    eval-cases.md
    mvp-agent-blueprint.md
    permission-matrix.md
  test/
    harness.test.js
```

## Базовый loop

```text
user/task
  -> instruction builder
  -> context builder
  -> model call
  -> tool/action proposal
  -> schema validation
  -> permission decision
  -> execution or approval pause
  -> structured observation
  -> context/state update
  -> repeat within budget or finish
```

## Компоненты runtime

`createHarness`

Запускает loop. Передает модели контекст, принимает `tool_call` или `final`, возвращает observations, trace и budget snapshot.

`createToolRegistry`

Регистрирует tools. Проверяет:

- имя tool в `snake_case`;
- описание;
- `riskClass`;
- `inputSchema`;
- required args;
- неизвестные args;
- типы args;
- nested objects;
- arrays;
- enum;
- string patterns;
- min/max limits.

Также применяет `timeoutMs` и возвращает timeout как observation.

`createDefaultPermissionEngine`

Решает, можно ли выполнять tool. По умолчанию разрешает только:

- `read_only`;
- `internal_draft`.

Остальное требует approval record. Approval привязан к `taskId`, `toolName`, `riskClass` и hash аргументов. Нельзя утвердить один email и отправить другой тем же approval.

`createMemoryStateStore` и `createFileStateStore`

Хранят вне prompt:

- tasks;
- approval records;
- artifacts;
- checkpoints.

File store пишет JSON на диск. Это минимум для restart/compaction сценариев.

`createBudgetController`

Останавливает loop по лимитам:

- max steps;
- max tool calls;
- max retries;
- max cost.

`createTraceRecorder`

Пишет runtime events:

- `task_started`;
- `context_built`;
- `model_output_received`;
- `tool_call_proposed`;
- `permission_decision_made`;
- `tool_execution_started`;
- `tool_execution_completed`;
- `task_paused`;
- `task_finished`.

`createContextBuilder`

Разделяет контекст на:

- stable prefix: инструкции, policy, tool schemas;
- dynamic suffix: текущая задача, memory, retrieved context, observations, state.

Retrieved context помечается как `untrusted_data`.

`runHarnessEvals`

Запускает executable eval cases. Каждый case содержит `run()` и `assert(result)`.

## Risk classes

```text
read_only
internal_draft
internal_write
external_communication
financial_action
legal_or_regulated
destructive_action
privileged_action
```

Default policy:

- `read_only` - автономно;
- `internal_draft` - автономно;
- все остальные - через approval.

## Пример tool

```js
import { createHarness, riskClasses } from "harness-agent-kit";

const harness = createHarness({
  model,
  tools: [
    {
      name: "read_customer_profile",
      description: "Read a customer profile by id.",
      riskClass: riskClasses.READ_ONLY,
      inputSchema: {
        type: "object",
        required: ["customerId"],
        properties: {
          customerId: { type: "string" }
        }
      },
      async execute({ customerId }) {
        return {
          status: "success",
          data: {
            customerId,
            segment: "enterprise"
          }
        };
      }
    }
  ]
});

const result = await harness.run({
  id: "task_001",
  objective: "Prepare a customer risk brief."
});
```

## Пример model adapter

Харнесс не привязан к OpenAI, Anthropic или локальной модели. Нужен один метод:

```js
const model = {
  async next(context) {
    return {
      type: "tool_call",
      toolName: "read_customer_profile",
      args: {
        customerId: "cus_123"
      }
    };
  }
};
```

Финальный ответ:

```js
return {
  type: "final",
  content: "Customer risk brief is ready."
};
```

## Approval flow

Если модель предлагает рискованный tool:

```js
{
  type: "tool_call",
  toolName: "send_customer_email",
  args: {
    accountId: "acc_123",
    draftId: "draft_001"
  }
}
```

Permission engine возвращает:

```json
{
  "decision": "ask_approval",
  "riskClass": "external_communication",
  "reason": "Risk class requires approval"
}
```

Харнесс не выполняет tool. Он возвращает:

```json
{
  "status": "needs_approval",
  "approvalRequest": {
    "toolName": "send_customer_email",
    "riskClass": "external_communication",
    "taskId": "task_renewal_001"
  }
}
```

После approval record тот же tool может выполниться.

## Правила проектирования

1. Начинай с single-agent MVP.
2. Делай tools узкими.
3. Разделяй draft и commit.
4. Проверяй schema до execution.
5. Решай permissions в runtime, не в prompt.
6. Возвращай observation на каждый tool call.
7. Храни approvals и state вне prompt.
8. Помечай retrieved content как untrusted.
9. Добавляй budgets до автономности.
10. Пиши trace до production.

## Reference-layer

`references/` содержит полный методологический слой по проектированию агентных харнессов:

- provider API patterns;
- prompt caching and cost;
- skills, MCP, connectors;
- system prompts and instruction hierarchy;
- security, evals, observability;
- agent legibility and feedback loops;
- coverage audit;
- source links.

`SKILL.md` делает repo совместимым с Agent Skill workflow.

## Native agent integration

Codex:

- `.agents/skills/harness-agent-kit/` подключается как repo-scoped skill;
- `.agents/plugins/marketplace.json` публикует локальный plugin marketplace;
- `plugins/harness-agent-kit/.codex-plugin/plugin.json` описывает Codex plugin;
- `AGENTS.md` задаёт project instructions для Codex.

Hermes Agent:

- `skills/harness-agent-kit/` соответствует Hermes tap layout;
- `SKILL.md` содержит `metadata.hermes`, `platforms`, `version`, `author`;
- `references/`, `templates/`, `assets/` лежат внутри skill package.

Проверка:

```bash
npm run verify:integrations
```

Документы:

- [Codex integration](docs/codex-integration.ru.md)
- [Hermes integration](docs/hermes-integration.ru.md)

## Что не входит

Сейчас это starter kit, не production SDK.

Пока нет production-обвязки:

- auth layer;
- distributed trace exporter.
- готовые OpenAI/Anthropic SDK adapters.

Provider patterns уже описаны в `references/provider-api-patterns.md`. Следующий практический шаг - добавить конкретные SDK adapters под выбранный стек.

## Документация

- [Подход](docs/approach.ru.md)
- [Архитектура харнесса](docs/harness-architecture.ru.md)
- [Tools и permissions](docs/tool-permission-model.ru.md)
- [Production checklist](docs/production-checklist.ru.md)
- [Reference map](docs/reference-map.ru.md)
- [Runtime hardening](docs/runtime-hardening.ru.md)

## Шаблоны

- [MVP Agent Blueprint](templates/mvp-agent-blueprint.md)
- [Permission Matrix](templates/permission-matrix.md)
- [Compaction Handoff](templates/compaction-handoff.md)
- [Eval Cases](templates/eval-cases.md)

## Команды

```bash
npm test
npm run verify:integrations
npm run example:renewal-risk
```

## Лицензия

MIT. См. [LICENSE](LICENSE).
