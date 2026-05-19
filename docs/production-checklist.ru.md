# Production Checklist

## MVP

- Цель агента сформулирована одним предложением.
- Есть явный пользователь или оператор.
- Есть done condition.
- Есть non-goals.
- Single-agent loop достаточен для первой версии.

## Tools

- Все tools узкие.
- Нет broad tools без wrapper.
- У каждого tool есть schema.
- У каждого tool есть risk class.
- Unknown args отклоняются.
- Required args проверяются.
- Tool result структурирован.
- Timeout возвращается как observation.

## Permissions

- Risk classes определены.
- Permission decision принимает runtime.
- Approval records хранятся вне prompt.
- Draft и commit разделены.
- External writes требуют approval.
- Destructive actions требуют approval.
- Privileged actions требуют approval.

## Context

- Stable instructions отделены от dynamic context.
- Retrieved content помечен как untrusted.
- Connector output не считается инструкцией.
- Context не содержит лишних документов.
- Volatile данные не ломают stable prefix.

## State

- Active plan хранится вне prompt.
- Approval state хранится вне prompt.
- Artifacts имеют стабильные ids или paths.
- Есть do-not-redo list.
- Есть recovery после restart/compaction.

## Budgets

- Max steps задан.
- Max tool calls задан.
- Max retries задан.
- Cost budget задан или явно отключен.
- Stop reasons логируются.

## Observability

- Trace пишет task started.
- Trace пишет model output.
- Trace пишет tool proposed.
- Trace пишет permission decision.
- Trace пишет execution result.
- Trace пишет pause/finish reason.
- Hidden reasoning не логируется.

## Evals

- Prompt injection в retrieved data.
- Permission denied.
- Approval required.
- Malformed tool args.
- Tool timeout.
- Missing tool result.
- Budget exhaustion.
- Unsafe external send.
- Compaction preserves approval state.

## Launch gate

- Все critical evals проходят.
- Trace readable для incident review.
- Operator понимает approval requests.
- Есть rollback/recovery для risky actions.
- Есть список известных ограничений.
