export function createOpenAIResponsesAdapter({
  client,
  model,
  instructions = "",
  responseParser = defaultResponseParser
}) {
  if (!client?.responses?.create) {
    throw new TypeError("client.responses.create is required");
  }
  if (!model) {
    throw new TypeError("model is required");
  }

  return {
    async next(context) {
      const response = await client.responses.create({
        model,
        instructions,
        input: JSON.stringify(context),
        tools: context.stablePrefix.toolSchemas.map(toOpenAITool)
      });
      return responseParser(response);
    }
  };
}

function toOpenAITool(tool) {
  return {
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    strict: true
  };
}

export function defaultResponseParser(response) {
  const item = response.output?.find((entry) => entry.type === "function_call");
  if (item) {
    return {
      type: "tool_call",
      toolName: item.name,
      args: parseJson(item.arguments, {})
    };
  }

  const text = response.output_text || collectOutputText(response);
  return {
    type: "final",
    content: text
  };
}

function collectOutputText(response) {
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" || content.type === "text")
    .map((content) => content.text)
    .join("\n");
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
