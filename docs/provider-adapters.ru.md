# Provider Adapters

Harness Agent Kit keeps provider SDKs outside the core package.

The runtime needs one interface:

```js
const model = {
  async next(context) {
    return {
      type: "tool_call",
      toolName: "read_profile",
      args: { userId: "usr_1" }
    };
  }
};
```

## Included adapters

- `createOpenAIResponsesAdapter`
- `createAnthropicMessagesAdapter`
- `createOpenAICompatibleChatAdapter`

These adapters accept already-created SDK clients. The package does not install provider SDKs.

## OpenAI Responses

```js
import OpenAI from "openai";
import { createOpenAIResponsesAdapter } from "harness-agent-kit";

const client = new OpenAI();
const model = createOpenAIResponsesAdapter({
  client,
  model: "gpt-5.1"
});
```

## Anthropic Messages

```js
import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicMessagesAdapter } from "harness-agent-kit";

const client = new Anthropic();
const model = createAnthropicMessagesAdapter({
  client,
  model: "claude-sonnet-4-5"
});
```

## OpenAI-compatible chat completions

```js
import OpenAI from "openai";
import { createOpenAICompatibleChatAdapter } from "harness-agent-kit";

const client = new OpenAI({
  baseURL: "https://your-compatible-provider.example/v1",
  apiKey: process.env.PROVIDER_API_KEY
});

const model = createOpenAICompatibleChatAdapter({
  client,
  model: "provider-model-name"
});
```

## Limitations

- Streaming is not implemented yet.
- Hosted tools are not bridged into the harness loop yet.
- Token/cost telemetry is provider-specific and must be added per adapter.
- Tool result continuation is intentionally left to the harness loop.
