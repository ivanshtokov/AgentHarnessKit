import { runReleaseEvals } from "../src/evals/release-eval-suite.js";

const report = await runReleaseEvals();

for (const result of report.results) {
  const marker = result.status === "passed" ? "PASS" : "FAIL";
  console.log(`${marker} ${result.name} (${result.durationMs}ms)`);
  if (result.error) {
    console.log(`  ${result.error.name}: ${result.error.message}`);
  }
}

console.log(`release evals: ${report.status}`);

if (report.status !== "passed") {
  process.exitCode = 1;
}
