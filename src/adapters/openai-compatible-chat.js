export function createOpenAICompatibleChatAdapter({
  client,
  model,
  system = "",
  responseParser = defaultChatParser
}) {
  if (!client?.chat?.completions?.create) {
    throw new TypeError("client.chat.completions.create is required");
  }
  if (!model) {
    throw new TypeError("model is required");
  }

  return {
    async next(context) {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(context) }
        ],
        tools: context.stablePrefix.toolSchemas.map(toChatTool),
        tool_choice: "auto"
      });
      return responseParser(response);
    }
  };
}

function toChatTool(tool) {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  };
}

export function defaultChatParser(response) {
  const message = response.choices?.[0]?.message || {};
  const call = message.tool_calls?.[0];

  if (call?.function) {
    return {
      type: "tool_call",
      toolName: call.function.name,
      args: parseJson(call.function.arguments, {})
    };
  }

  return {
    type: "final",
    content: message.content || ""
  };
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
