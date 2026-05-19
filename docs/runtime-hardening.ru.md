# Runtime Hardening

Этот документ фиксирует, что в `Harness Agent Kit` уже стало runtime-поведением, а не только правилом в README.

## Approval records

Approval хранит:

- `taskId`;
- `toolName`;
- `riskClass`;
- `argsHash`;
- `argsSnapshot`;
- `reviewerId`, если передан;
- `expiresAt`, если передан.

Харнесс не переиспользует approval для других аргументов. Если человек утвердил `emailId=eml_1`, tool call с `emailId=eml_2` снова уйдёт в `needs_approval`.

## State store

Есть два store:

- `createMemoryStateStore`;
- `createFileStateStore`.

Они хранят:

- tasks;
- approvals;
- artifacts;
- checkpoints.

File store пишет JSON. Этого хватает для локального restart, compaction handoff и audit review. Для production нужен adapter к базе или event log.

## Schema validation

Tool registry проверяет:

- root object;
- required properties;
- unknown properties;
- nested objects;
- arrays;
- enum;
- string length;
- string pattern;
- number min/max.

Цель: tool не должен исполняться, если модель прислала неверные args.

## Tool timeouts

У tool может быть `timeoutMs`.

Если tool не успел:

- executor прерывает ожидание;
- trace пишет `tool_timeout`;
- модель получает observation со статусом `timeout`;
- loop может продолжить или остановиться по policy.

## Tool isolation

Tool может объявить:

```js
{
  name: "run_isolated_check",
  isolation: "sandbox",
  sandboxSpec: {
    image: "node:20",
    network: "none"
  }
}
```

`Harness Agent Kit` не притворяется встроенным sandbox. Если tool требует `isolation: "sandbox"`, registry выполняет его только через переданный `sandboxRunner`.

Если runner не настроен:

- tool не исполняется;
- trace пишет `tool_policy_denied`;
- модель получает observation `denied`;
- runtime не падает и не делает host execution fallback.

Это контрактная точка для Docker, Firecracker, Vercel Sandbox, isolated worker или другого process/container boundary.

## Trace export

`createTraceRecorder` пишет events в памяти. Для audit trail можно подключить exporter:

```js
import { createJsonlTraceExporter, createTraceRecorder } from "harness-agent-kit";

const trace = createTraceRecorder({
  exporters: [
    createJsonlTraceExporter({ filePath: ".harnesskit/trace.jsonl" })
  ]
});
```

JSONL exporter redacts поля вида `secret`, `token`, `password`, `apiKey`, `authorization`. Он нужен для local incident review и CI artifacts. Для production backend оставь отдельный exporter поверх OpenTelemetry, SIEM или event log.

## Compaction snapshots

`createCompactionSnapshot` сохраняет рабочее состояние, а не пересказ чата:

- active plan;
- active goal;
- approvals;
- artifacts;
- do-not-redo list;
- loaded skills;
- connector state;
- observation summaries;
- trace summary.

`saveCompactionCheckpoint` пишет snapshot в `stateStore.addCheckpoint`. Это минимальный runtime bridge между compaction handoff template и исполняемым state store.

## MCP/connector adapter skeleton

`createMcpToolAdapter` оборачивает connector tool в обычный harness tool:

- имя получает namespace `mcp_<server>_<tool>`;
- schema остается narrow и валидируется registry;
- risk class задается явно;
- scopes хранятся в metadata;
- connector output возвращается как structured observation.

Auth connector-а не равен authorization runtime-а. Approval по-прежнему принимает permission engine.

## Evals

`runHarnessEvals` запускает executable checks:

```js
const report = await runHarnessEvals([
  {
    name: "approval required for external send",
    async run() {
      return harness.run(task);
    },
    async assert(result) {
      return result.status === "needs_approval";
    }
  }
]);
```

Это не заменяет полноценный eval framework, но убирает разрыв между checklist и исполняемой проверкой.

## Что ещё нужно для production

- База или append-only event log для state.
- Distributed trace exporter.
- SDK adapters для конкретных провайдеров.
- Реальный process/container sandbox за `sandboxRunner`.
- Auth/authz слой поверх identity пользователя.
- Eval dataset под домен.
