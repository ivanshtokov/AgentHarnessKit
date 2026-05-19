export async function runHarnessEvals(cases) {
  const results = [];

  for (const evalCase of cases) {
    const startedAt = Date.now();
    try {
      const result = await evalCase.run();
      const passed = await evalCase.assert(result);
      results.push({
        name: evalCase.name,
        status: passed ? "passed" : "failed",
        durationMs: Date.now() - startedAt,
        result
      });
    } catch (error) {
      results.push({
        name: evalCase.name,
        status: "failed",
        durationMs: Date.now() - startedAt,
        error: {
          name: error.name,
          message: error.message
        }
      });
    }
  }

  return {
    status: results.every((result) => result.status === "passed") ? "passed" : "failed",
    results
  };
}
