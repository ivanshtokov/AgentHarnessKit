export class HarnessValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "HarnessValidationError";
    this.details = details;
  }
}

export class HarnessPolicyError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "HarnessPolicyError";
    this.details = details;
  }
}

export class HarnessToolError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "HarnessToolError";
    this.details = details;
  }
}
