import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnthropicMessagesAdapter,
  createOpenAICompatibleChatAdapter,
  createOpenAIResponsesAdapter
} from "../src/index.js";

const context = {
  stablePrefix: {
    toolSchemas: [
      {
        name: "read_profile",
        description: "Read profile.",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string" }
          },
          required: ["userId"]
        }
      }
    ]
  },
  dynamicSuffix: {
    task: { id: "task_1" }
  }
};

test("OpenAI Responses adapter maps function call", async () => {
  const client = {
    responses: {
      async create(request) {
        assert.equal(request.tools[0].name, "read_profile");
        return {
          output: [
            {
              type: "function_call",
              name: "read_profile",
              arguments: "{\"userId\":\"usr_1\"}"
            }
          ]
        };
      }
    }
  };

  const adapter = createOpenAIResponsesAdapter({ client, model: "gpt-test" });
  assert.deepEqual(await adapter.next(context), {
    type: "tool_call",
    toolName: "read_profile",
    args: { userId: "usr_1" }
  });
});

test("Anthropic Messages adapter maps tool use", async () => {
  const client = {
    messages: {
      async create(request) {
        assert.equal(request.tools[0].name, "read_profile");
        return {
          content: [
            {
              type: "tool_use",
              name: "read_profile",
              input: { userId: "usr_2" }
            }
          ]
        };
      }
    }
  };

  const adapter = createAnthropicMessagesAdapter({ client, model: "claude-test" });
  assert.deepEqual(await adapter.next(context), {
    type: "tool_call",
    toolName: "read_profile",
    args: { userId: "usr_2" }
  });
});

test("OpenAI-compatible chat adapter maps tool call", async () => {
  const client = {
    chat: {
      completions: {
        async create(request) {
          assert.equal(request.tools[0].function.name, "read_profile");
          return {
            choices: [
              {
                message: {
                  tool_calls: [
                    {
                      function: {
                        name: "read_profile",
                        arguments: "{\"userId\":\"usr_3\"}"
                      }
                    }
                  ]
                }
              }
            ]
          };
        }
      }
    }
  };

  const adapter = createOpenAICompatibleChatAdapter({ client, model: "compatible-test" });
  assert.deepEqual(await adapter.next(context), {
    type: "tool_call",
    toolName: "read_profile",
    args: { userId: "usr_3" }
  });
});
