import {
  createDefaultPermissionEngine,
  createHarness,
  riskClasses
} from "../src/index.js";

const task = {
  id: "task_renewal_001",
  objective:
    "Prepare a renewal-risk brief for account acc_123 and draft next actions without sending external messages."
};

const scriptedModel = {
  calls: 0,
  async next(context) {
    this.calls += 1;

    if (this.calls === 1) {
      return {
        type: "tool_call",
        toolName: "read_account_profile",
        args: { accountId: "acc_123" }
      };
    }

    if (this.calls === 2) {
      return {
        type: "tool_call",
        toolName: "fetch_usage_summary",
        args: { accountId: "acc_123", period: "last_90_days" }
      };
    }

    if (this.calls === 3) {
      return {
        type: "tool_call",
        toolName: "draft_customer_email",
        args: {
          accountId: "acc_123",
          intent: "schedule renewal risk review"
        }
      };
    }

    if (this.calls === 4) {
      return {
        type: "tool_call",
        toolName: "send_customer_email",
        args: {
          accountId: "acc_123",
          draftId: "draft_001"
        }
      };
    }

    return {
      type: "final",
      content: "Renewal-risk brief prepared."
    };
  }
};

const approvedSendModel = {
  calls: 0,
  async next() {
    this.calls += 1;

    if (this.calls === 1) {
      return {
        type: "tool_call",
        toolName: "send_customer_email",
        args: {
          accountId: "acc_123",
          draftId: "draft_001"
        }
      };
    }

    return {
      type: "final",
      content: "Approved customer email sent."
    };
  }
};

const tools = [
  {
    name: "read_account_profile",
    description: "Read account profile and renewal metadata.",
    riskClass: riskClasses.READ_ONLY,
    inputSchema: {
      type: "object",
      required: ["accountId"],
      properties: {
        accountId: { type: "string" }
      }
    },
    async execute({ accountId }) {
      return {
        status: "success",
        data: {
          accountId,
          customerName: "Northwind Manufacturing",
          renewalDate: "2026-07-01",
          owner: "account_owner@example.com",
          plan: "Enterprise"
        }
      };
    }
  },
  {
    name: "fetch_usage_summary",
    description: "Fetch product usage summary for an account.",
    riskClass: riskClasses.READ_ONLY,
    inputSchema: {
      type: "object",
      required: ["accountId", "period"],
      properties: {
        accountId: { type: "string" },
        period: { type: "string" }
      }
    },
    async execute({ accountId, period }) {
      return {
        status: "success",
        data: {
          accountId,
          period,
          activeUsersChange: "-32%",
          supportTickets: 9,
          riskSignals: [
            "Admin activity decreased",
            "Three unresolved priority tickets",
            "Champion has not logged in for 21 days"
          ]
        }
      };
    }
  },
  {
    name: "draft_customer_email",
    description: "Draft a customer email without sending it.",
    riskClass: riskClasses.INTERNAL_DRAFT,
    inputSchema: {
      type: "object",
      required: ["accountId", "intent"],
      properties: {
        accountId: { type: "string" },
        intent: { type: "string" }
      }
    },
    async execute({ accountId, intent }) {
      return {
        status: "success",
        data: {
          draftId: "draft_001",
          accountId,
          intent,
          subject: "Renewal planning review",
          body:
            "Hi, I would like to schedule a renewal planning review and make sure the open support items are resolved before the renewal date."
        }
      };
    }
  },
  {
    name: "send_customer_email",
    description: "Send an approved customer email.",
    riskClass: riskClasses.EXTERNAL_COMMUNICATION,
    inputSchema: {
      type: "object",
      required: ["accountId", "draftId"],
      properties: {
        accountId: { type: "string" },
        draftId: { type: "string" }
      }
    },
    async execute({ accountId, draftId }, context) {
      return {
        status: "success",
        data: {
          sent: true,
          accountId,
          draftId,
          approvalId: context.approvalId
        }
      };
    }
  }
];

const permissionEngine = createDefaultPermissionEngine();
const harness = createHarness({
  model: scriptedModel,
  tools,
  permissionEngine
});

const firstRun = await harness.run(task);
console.log(JSON.stringify(firstRun, null, 2));

if (firstRun.status === "needs_approval") {
  permissionEngine.approvalStore.approve({
    ...firstRun.approvalRequest,
    id: "apr_send_email_001"
  });

  const resumeHarness = createHarness({
    model: approvedSendModel,
    tools,
    permissionEngine
  });
  const secondRun = await resumeHarness.run(task);
  console.log(JSON.stringify(secondRun, null, 2));
}
