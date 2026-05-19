# Tools и Permission Model

## Принцип

Tool должен быть узким, typed, auditable.

Плохо:

```text
run_command(command)
send_message(channel, text)
write_database(query)
execute_anything(payload)
```

Хорошо:

```text
read_account_profile(account_id)
list_support_tickets(account_id, since)
draft_customer_email(account_id, intent, evidence_ids)
request_approval(action_type, risk_class, summary)
send_approved_email(approval_id)
```

## Обязательные поля tool

```js
{
  name: "draft_customer_email",
  description: "Draft a customer email without sending it.",
  riskClass: "internal_draft",
  inputSchema: {
    type: "object",
    required: ["customerId", "intent"],
    properties: {
      customerId: { type: "string" },
      intent: { type: "string" }
    }
  },
  async execute(args, context) {
    return {
      status: "success",
      data: { draft: "..." }
    };
  }
}
```

## Risk classes

- `read_only` — чтение данных.
- `internal_draft` — черновик без side effect.
- `internal_write` — запись во внутреннюю систему.
- `external_communication` — сообщение наружу.
- `financial_action` — деньги, инвойсы, списания.
- `legal_or_regulated` — legal, healthcare, regulated workflows.
- `destructive_action` — удаление, rollback, irreversible changes.
- `privileged_action` — security, secrets, admin, production.

## Default policy

Autonomous:

- `read_only`
- `internal_draft`

Approval required:

- `internal_write`
- `external_communication`
- `financial_action`
- `legal_or_regulated`
- `destructive_action`
- `privileged_action`

## Permission decision

```json
{
  "decision": "ask_approval",
  "riskClass": "external_communication",
  "reason": "Risk class requires approval",
  "approvalRequest": {
    "toolName": "send_customer_email",
    "riskClass": "external_communication",
    "args": {
      "customerId": "cus_123",
      "draftId": "draft_456"
    },
    "taskId": "task_001"
  }
}
```

## Draft vs commit

Разделяй подготовку и применение.

Draft:

```text
draft_email
draft_sql_migration
draft_deploy_plan
draft_contract_summary
```

Commit:

```text
send_email
apply_migration
deploy_to_production
sign_contract
```

Commit требует approval, если есть риск.

## Error handling

Любой исход возвращается модели:

- success;
- denied;
- approval_required;
- timeout;
- validation_error;
- tool_error;
- budget_exhausted.

Модель не должна угадывать, что произошло.
