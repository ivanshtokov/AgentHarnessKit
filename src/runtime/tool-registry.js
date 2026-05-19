import { HarnessToolError, HarnessValidationError } from "./errors.js";
import { riskClasses } from "./risk-classes.js";
import { validateJsonSchemaValue } from "./schema-validator.js";

const validRiskClasses = new Set(Object.values(riskClasses));

export function createToolRegistry({ defaultTimeoutMs = 30000 } = {}) {
  const tools = new Map();

  return {
    register(tool) {
      validateToolDefinition(tool);
      if (tools.has(tool.name)) {
        throw new HarnessValidationError(`Tool already registered: ${tool.name}`);
      }
      tools.set(tool.name, Object.freeze({ ...tool }));
      return this;
    },

    get(name) {
      const tool = tools.get(name);
      if (!tool) {
        throw new HarnessValidationError(`Unknown tool: ${name}`, { toolName: name });
      }
      return tool;
    },

    listForModel() {
      return [...tools.values()].map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        riskClass: tool.riskClass
      }));
    },

    async execute(name, args, context) {
      const tool = this.get(name);
      validateArgs(tool, args);

      try {
        const result = await runWithTimeout({
          timeoutMs: tool.timeoutMs ?? defaultTimeoutMs,
          run: (signal) => tool.execute(args, { ...context, signal })
        });
        return normalizeToolResult(tool.name, result);
      } catch (error) {
        if (error.name === "AbortError") {
          throw new HarnessToolError(`Tool timed out: ${tool.name}`, {
            code: "timeout",
            toolName: tool.name,
            timeoutMs: tool.timeoutMs ?? defaultTimeoutMs
          });
        }
        throw new HarnessToolError(`Tool failed: ${tool.name}`, {
          toolName: tool.name,
          message: error.message
        });
      }
    }
  };
}

function validateToolDefinition(tool) {
  if (!tool || typeof tool !== "object") {
    throw new HarnessValidationError("Tool definition must be an object");
  }
  if (!tool.name || typeof tool.name !== "string") {
    throw new HarnessValidationError("Tool name is required");
  }
  if (!/^[a-z][a-z0-9_]*$/.test(tool.name)) {
    throw new HarnessValidationError("Tool name must be snake_case", { toolName: tool.name });
  }
  if (!tool.description || typeof tool.description !== "string") {
    throw new HarnessValidationError("Tool description is required", { toolName: tool.name });
  }
  if (!validRiskClasses.has(tool.riskClass)) {
    throw new HarnessValidationError("Tool riskClass is invalid", {
      toolName: tool.name,
      riskClass: tool.riskClass
    });
  }
  if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
    throw new HarnessValidationError("Tool inputSchema is required", { toolName: tool.name });
  }
  if (typeof tool.execute !== "function") {
    throw new HarnessValidationError("Tool execute function is required", { toolName: tool.name });
  }
  if (tool.timeoutMs !== undefined && (!Number.isInteger(tool.timeoutMs) || tool.timeoutMs <= 0)) {
    throw new HarnessValidationError("Tool timeoutMs must be a positive integer", {
      toolName: tool.name,
      timeoutMs: tool.timeoutMs
    });
  }
}

function validateArgs(tool, args) {
  validateJsonSchemaValue(tool.inputSchema, args || {}, "$", { toolName: tool.name });
}

function normalizeToolResult(toolName, result) {
  if (!result || typeof result !== "object") {
    return {
      status: "success",
      tool: toolName,
      data: result
    };
  }

  return {
    status: result.status || "success",
    tool: result.tool || toolName,
    data: result.data ?? null,
    metadata: result.metadata || {}
  };
}

async function runWithTimeout({ timeoutMs, run }) {
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      const error = new Error("Operation timed out");
      error.name = "AbortError";
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}
