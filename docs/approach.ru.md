# Подход Harness Agent Kit

## Суть

Harness Agent Kit исходит из простой границы:

```text
модель предлагает
харнесс валидирует
харнесс авторизует
харнесс выполняет
харнесс логирует
модель получает observation
```

Модель не является оператором с прямым доступом к системам. Она выбирает следующий шаг и предлагает tool call. Runtime вокруг модели решает, допустим ли этот шаг.

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

## Что делает модель

- Понимает задачу.
- Выбирает следующий шаг.
- Формирует tool call.
- Использует observations.
- Готовит финальный ответ.

## Что делает харнесс

- Собирает инструкции и контекст.
- Проверяет tool schemas.
- Проверяет аргументы tools.
- Применяет permission policy.
- Запрашивает approval.
- Выполняет tools.
- Возвращает observation.
- Хранит durable state.
- Считает бюджеты.
- Пишет trace.
- Останавливает loop.

## Уровни автономности

### Level 0: Answer-only

Модель только отвечает. Tools нет.

### Level 1: Retrieval

Агент читает источники, но ничего не меняет.

### Level 2: Drafting

Агент готовит черновики действий: письма, планы, SQL, отчеты.

### Level 3: Approval-gated actor

Агент выполняет действия только после approval.

### Level 4: Policy-bounded autonomous actor

Агент действует автономно внутри жесткой policy.

### Level 5: Long-running goal worker

Агент ведет долгую цель с бюджетами, checkpoints и resumable state.

## Практический default

Начинай с Level 2 или Level 3.

Не начинай с multi-agent, если single-agent loop еще не провалился на измеримых evals.

## Главные запреты

- Не давать broad tools вроде `execute_anything`, `write_database`, `send_message`.
- Не доверять retrieved content как инструкциям.
- Не хранить approvals только в prompt.
- Не делать внешние действия без approval.
- Не полагаться на prompt как единственную защиту.
- Не запускать бесконечный goal loop без done condition.
- Не скрывать tool failures от модели.

## Главные правила

- Каждый tool call получает observation.
- Draft и commit разделены.
- Risk меняет loop.
- State хранится вне prompt.
- Context собирается, а не сваливается.
- Budgets обязательны до автономности.
- Trace обязателен до production.
- Evals проверяют не только качество ответа, но и поведение runtime.
