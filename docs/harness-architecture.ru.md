# Архитектура Харнесса

## Компоненты

### Instruction Builder

Собирает стабильные инструкции:

- system rules;
- developer policy;
- scoped instructions;
- domain policy;
- tool-use rules.

### Context Builder

Собирает динамический контекст:

- user task;
- active plan;
- memory;
- retrieved documents;
- tool observations;
- approvals;
- artifacts;
- budget state.

Контекст должен быть помечен по trust boundary. Retrieved data и connector output считаются untrusted.

### Model Adapter

Один интерфейс над провайдером:

```js
const model = {
  async next(context) {
    return {
      type: "tool_call",
      toolName: "read_customer_profile",
      args: { customerId: "cus_123" }
    };
  }
};
```

Adapter может быть реализован для OpenAI, Anthropic, OpenAI-compatible API или локальной модели.

### Tool Registry

Хранит узкие typed tools:

- name;
- description;
- inputSchema;
- riskClass;
- execute.

Registry не должен содержать универсальные tools без policy wrapper.

### Schema Validator

Проверяет аргументы до исполнения:

- обязательные поля;
- неизвестные поля;
- типы;
- формат;
- локальные ограничения.

### Permission Engine

Решает:

```text
allow
deny
ask_approval
draft_only
sandbox_only
```

Модель не принимает permission decision.

### Executor

Выполняет tool только после validation и permission decision.

### Observation Formatter

Возвращает модели structured result:

```json
{
  "status": "success",
  "tool": "read_customer_profile",
  "data": {
    "customerId": "cus_123"
  },
  "metadata": {}
}
```

Denial, timeout, validation error и approval requirement тоже являются observations.

### State Store

Хранит вне prompt:

- active plan;
- approval records;
- task status;
- artifacts;
- checkpoints;
- decisions;
- tool results;
- do-not-redo list.

### Budget Controller

Контролирует:

- max steps;
- max tool calls;
- max retries;
- max runtime;
- max tokens;
- max cost.

### Trace Recorder

Пишет операционные события:

- task started;
- context built;
- model output received;
- tool call proposed;
- permission decision made;
- tool execution started;
- tool execution completed;
- task paused;
- task finished.

Trace не должен содержать hidden reasoning.

## Минимальный production-safe harness

Минимальная версия должна иметь:

- один agent loop;
- narrow tools;
- schema validation;
- permission engine;
- approval records;
- budget limits;
- structured observations;
- trace;
- evals на отказ и unsafe actions;
- compaction handoff.

## Расширение

Добавляй сложность только после измеримого провала:

- больше tools;
- больше connectors;
- memory;
- goal loop;
- autonomous actions;
- subagents.

Multi-agent не является базовым уровнем. Это оптимизация после доказанной необходимости.
