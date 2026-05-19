import { riskClasses } from "../runtime/risk-classes.js";

export function createMcpToolAdapter({
  serverName,
  toolName,
  description,
  inputSchema,
  riskClass = riskClasses.READ_ONLY,
  scopes = [],
  timeoutMs,
  callTool
} = {}) {
  if (!serverName || typeof serverName !== "string") {
    throw new TypeError("serverName is required");
  }
  if (!toolName || typeof toolName !== "string") {
    throw new TypeError("toolName is required");
  }
  if (!description || typeof description !== "string") {
    throw new TypeError("description is required");
  }
  if (!inputSchema || typeof inputSchema !== "object") {
    throw new TypeError("inputSchema is required");
  }
  if (typeof callTool !== "function") {
    throw new TypeError("callTool is required");
  }

  return {
    name: `mcp_${toSnakeCase(serverName)}_${toSnakeCase(toolName)}`,
    description,
    riskClass,
    inputSchema,
    timeoutMs,
    metadata: {
      connectorType: "mcp",
      serverName,
      toolName,
      scopes
    },
    async execute(args, context) {
      const result = await callTool({
        serverName,
        toolName,
        args,
        scopes,
        signal: context.signal
      });

      return {
        status: "success",
        data: result,
        metadata: {
          connectorType: "mcp",
          serverName,
          toolName
        }
      };
    }
  };
}

function toSnakeCase(value) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
