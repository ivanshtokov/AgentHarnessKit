# Permission Matrix

| Risk class | Examples | Default decision | Approval source | Notes |
| --- | --- | --- | --- | --- |
| read_only | read profile, list tickets, fetch usage | allow | none | Scope reads by task and identity. |
| internal_draft | draft email, draft SQL, draft plan | allow | none | Draft must not create side effects. |
| internal_write | create issue, update CRM field | ask_approval | human operator or policy record | Use idempotency keys. |
| external_communication | send email, post customer message | ask_approval | human operator | Show exact content before approval. |
| financial_action | refund, charge, invoice change | ask_approval | financial approver | Store audit record. |
| legal_or_regulated | legal notice, healthcare update | ask_approval | authorized reviewer | Keep evidence and reviewer id. |
| destructive_action | delete record, rollback, revoke access | ask_approval | owner/admin | Require explicit target ids. |
| privileged_action | secrets, production deploy, admin change | ask_approval | privileged operator | Use sandbox or dry-run first. |

## Decision Object

```json
{
  "decision": "ask_approval",
  "riskClass": "external_communication",
  "reason": "External customer email requires approval",
  "approvalRequest": {
    "toolName": "send_customer_email",
    "taskId": "task_001",
    "args": {
      "customerId": "cus_123",
      "draftId": "draft_456"
    }
  }
}
```
