export function createAnthropicMessagesAdapter({
  client,
  model,
  system = "",
  maxTokens = 4096,
  responseParser = defaultAnthropicParser
}) {
  if (!client?.messages?.create) {
    throw new TypeError("client.messages.create is required");
  }
  if (!model) {
    throw new TypeError("model is required");
  }

  return {
    async next(context) {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        tools: context.stablePrefix.toolSchemas.map(toAnthropicTool),
        messages: [
          {
            role: "user",
            content: JSON.stringify(context)
          }
        ]
      });
      return responseParser(response);
    }
  };
}

function toAnthropicTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema
  };
}

export function defaultAnthropicParser(response) {
  const use = response.content?.find((item) => item.type === "tool_use");
  if (use) {
    return {
      type: "tool_call",
      toolName: use.name,
      args: use.input || {}
    };
  }

  return {
    type: "final",
    content: (response.content || [])
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n")
  };
}
