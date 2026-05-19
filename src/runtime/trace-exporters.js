import fs from "node:fs";
import path from "node:path";

export function createJsonlTraceExporter({ filePath, redact = redactTraceEvent } = {}) {
  if (!filePath) {
    throw new TypeError("filePath is required");
  }

  return {
    record(event) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.appendFileSync(filePath, `${JSON.stringify(redact(event))}\n`, "utf8");
    }
  };
}

export function redactTraceEvent(event) {
  return redactValue(event);
}

function redactValue(value) {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const redacted = {};
  for (const [key, item] of Object.entries(value)) {
    if (/secret|token|password|api[_-]?key|authorization/i.test(key)) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = redactValue(item);
    }
  }
  return redacted;
}
