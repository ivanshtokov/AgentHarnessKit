import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const packages = [
  "skills/harness-agent-kit",
  ".agents/skills/harness-agent-kit",
  "plugins/harness-agent-kit/skills/harness-agent-kit"
];

test("packaged skill copies match canonical files", () => {
  const canonicalSkill = fs.readFileSync(path.join(root, "SKILL.md"), "utf8");
  const canonicalReferences = listFiles("references");
  const canonicalTemplates = listFiles("templates");

  for (const packagePath of packages) {
    assert.equal(
      fs.readFileSync(path.join(root, packagePath, "SKILL.md"), "utf8"),
      canonicalSkill,
      `${packagePath}/SKILL.md drifted`
    );
    assert.deepEqual(listFiles(path.join(packagePath, "references")), canonicalReferences);
    assert.deepEqual(listFiles(path.join(packagePath, "templates")), canonicalTemplates);
    assert.equal(fs.existsSync(path.join(root, packagePath, "assets", "icon.jpeg")), true);
  }
});

function listFiles(relativeDir) {
  return fs.readdirSync(path.join(root, relativeDir)).filter((file) => file.endsWith(".md")).sort();
}
