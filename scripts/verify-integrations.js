import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const repositoryUrl = "https://github.com/ivanshtokov/AgentHarnessKit";
const expectedReferences = [
  "agent-legibility-feedback-loops.md",
  "agentic-loop.md",
  "architecture.md",
  "checklists.md",
  "context-memory-compaction.md",
  "coverage-audit.md",
  "mvp-agent-blueprint.md",
  "planning-and-goals.md",
  "prompt-caching-and-cost.md",
  "provider-api-patterns.md",
  "security-evals-observability.md",
  "skills-and-connectors.md",
  "source-links.md",
  "system-prompts-instructions.md",
  "tools-and-permissions.md"
].sort();

const expectedTemplates = [
  "compaction-handoff.md",
  "delegate-task-prompt.md",
  "eval-cases.md",
  "harness-boot-contract.md",
  "hermes-cron-prompt.md",
  "mvp-agent-blueprint.md",
  "permission-matrix.md"
].sort();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function assertFile(relativePath) {
  assert.equal(fs.existsSync(path.join(root, relativePath)), true, `Missing ${relativePath}`);
}

function assertSkillPackage(relativePath, { hermes = false } = {}) {
  const skillPath = path.join(relativePath, "SKILL.md");
  assertFile(skillPath);

  const skill = fs.readFileSync(path.join(root, skillPath), "utf8");
  assert.match(skill, /^---\s*\nname:\s*harness-agent-kit/m, `${skillPath} missing name`);
  assert.match(skill, /^description:/m, `${skillPath} missing description`);

  if (hermes) {
    assert.match(skill, /^platforms:\s*\[windows, macos, linux\]/m, `${skillPath} missing Hermes platforms`);
    assert.match(skill, /metadata:\s*\n[\s\S]*hermes:/m, `${skillPath} missing metadata.hermes`);
  }
  assert.match(skill, new RegExp(repositoryUrl.replaceAll("/", "\\/")), `${skillPath} missing repository URL`);
  assert.match(skill, /Subagents, delegation, and cron/, `${skillPath} missing delegation/cron rules`);

  const refs = fs.readdirSync(path.join(root, relativePath, "references")).filter((file) => file.endsWith(".md")).sort();
  assert.deepEqual(refs, expectedReferences, `${relativePath} references mismatch`);

  const templates = fs.readdirSync(path.join(root, relativePath, "templates")).filter((file) => file.endsWith(".md")).sort();
  assert.deepEqual(templates, expectedTemplates, `${relativePath} templates mismatch`);

  assertFile(path.join(relativePath, "assets", "icon.jpeg"));
}

assertFile("AGENTS.md");
assertFile("SKILL.md");
assertFile("icon.jpeg");

const packageJson = readJson("package.json");
assert.equal(packageJson.type, "module");
assert.equal(packageJson.repository.url, "git+https://github.com/ivanshtokov/AgentHarnessKit.git");
assert.equal(packageJson.homepage, "https://github.com/ivanshtokov/AgentHarnessKit#readme");

assertSkillPackage("skills/harness-agent-kit", { hermes: true });
assertSkillPackage(".agents/skills/harness-agent-kit", { hermes: true });
assertSkillPackage("plugins/harness-agent-kit/skills/harness-agent-kit", { hermes: true });

const plugin = readJson("plugins/harness-agent-kit/.codex-plugin/plugin.json");
assert.equal(plugin.name, "harness-agent-kit");
assert.equal(plugin.skills, "./skills/");
assert.equal(plugin.repository.url, repositoryUrl);

const marketplace = readJson(".agents/plugins/marketplace.json");
assert.equal(marketplace.name, "harnesskit-local");
assert.equal(marketplace.interface.displayName, "Harness Agent Kit");
assert.equal(marketplace.plugins[0].name, "harness-agent-kit");
assert.equal(marketplace.plugins[0].source.path, "./plugins/harness-agent-kit");
assert.equal(marketplace.plugins[0].policy.installation, "AVAILABLE");
assert.equal(marketplace.plugins[0].policy.authentication, "ON_INSTALL");

console.log("integration verification passed");
