import { HarnessValidationError } from "./errors.js";

export function validateJsonSchemaValue(schema, value, path = "$", details = {}) {
  if (!schema || typeof schema !== "object") {
    throw new HarnessValidationError("Schema must be an object", { path, ...details });
  }

  if (schema.type && !matchesJsonType(value, schema.type)) {
    throw new HarnessValidationError("Invalid value type", {
      path,
      expectedType: schema.type,
      actualType: jsonTypeOf(value),
      ...details
    });
  }

  if (schema.enum && !schema.enum.some((item) => Object.is(item, value))) {
    throw new HarnessValidationError("Value is not in enum", {
      path,
      allowed: schema.enum,
      actual: value,
      ...details
    });
  }

  if (typeof value === "string") {
    validateString(schema, value, path, details);
  }

  if (typeof value === "number") {
    validateNumber(schema, value, path, details);
  }

  if (Array.isArray(value)) {
    validateArray(schema, value, path, details);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    validateObject(schema, value, path, details);
  }
}

export function matchesJsonType(value, expectedType) {
  if (Array.isArray(expectedType)) {
    return expectedType.some((type) => matchesJsonType(value, type));
  }
  if (expectedType === "array") return Array.isArray(value);
  if (expectedType === "integer") return Number.isInteger(value);
  if (expectedType === "number") return typeof value === "number" && Number.isFinite(value);
  if (expectedType === "null") return value === null;
  if (expectedType === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === expectedType;
}

export function jsonTypeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function validateObject(schema, value, path, details) {
  const required = Array.isArray(schema.required) ? schema.required : [];
  const properties = schema.properties || {};
  const additionalProperties = schema.additionalProperties === true;

  for (const key of required) {
    if (!(key in value)) {
      throw new HarnessValidationError("Missing required property", {
        path: `${path}.${key}`,
        property: key,
        ...details
      });
    }
  }

  for (const [key, item] of Object.entries(value)) {
    if (!(key in properties)) {
      if (additionalProperties) continue;
      throw new HarnessValidationError("Unexpected property", {
        path: `${path}.${key}`,
        property: key,
        ...details
      });
    }
    validateJsonSchemaValue(properties[key], item, `${path}.${key}`, details);
  }
}

function validateArray(schema, value, path, details) {
  if (typeof schema.minItems === "number" && value.length < schema.minItems) {
    throw new HarnessValidationError("Array has too few items", {
      path,
      minItems: schema.minItems,
      actual: value.length,
      ...details
    });
  }
  if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
    throw new HarnessValidationError("Array has too many items", {
      path,
      maxItems: schema.maxItems,
      actual: value.length,
      ...details
    });
  }
  if (schema.items) {
    value.forEach((item, index) => {
      validateJsonSchemaValue(schema.items, item, `${path}[${index}]`, details);
    });
  }
}

function validateString(schema, value, path, details) {
  if (typeof schema.minLength === "number" && value.length < schema.minLength) {
    throw new HarnessValidationError("String is too short", {
      path,
      minLength: schema.minLength,
      actual: value.length,
      ...details
    });
  }
  if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
    throw new HarnessValidationError("String is too long", {
      path,
      maxLength: schema.maxLength,
      actual: value.length,
      ...details
    });
  }
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
    throw new HarnessValidationError("String does not match pattern", {
      path,
      pattern: schema.pattern,
      ...details
    });
  }
}

function validateNumber(schema, value, path, details) {
  if (typeof schema.minimum === "number" && value < schema.minimum) {
    throw new HarnessValidationError("Number is below minimum", {
      path,
      minimum: schema.minimum,
      actual: value,
      ...details
    });
  }
  if (typeof schema.maximum === "number" && value > schema.maximum) {
    throw new HarnessValidationError("Number is above maximum", {
      path,
      maximum: schema.maximum,
      actual: value,
      ...details
    });
  }
}
