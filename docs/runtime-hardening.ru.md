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
- Trace exporter.
- SDK adapters для конкретных провайдеров.
- Tool sandbox.
- Auth/authz слой поверх identity пользователя.
- Eval dataset под домен.
