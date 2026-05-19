import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packages = [
  "skills/harness-agent-kit",
  ".agents/skills/harness-agent-kit",
  "plugins/harness-agent-kit/skills/harness-agent-kit"
];

const copiedDirs = ["references", "templates"];

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(sourceDir, targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(source, target);
    } else if (entry.isFile()) {
      copyFile(source, target);
    }
  }
}

for (const packagePath of packages) {
  const target = path.join(root, packagePath);
  fs.mkdirSync(target, { recursive: true });
  copyFile(path.join(root, "SKILL.md"), path.join(target, "SKILL.md"));

  for (const dir of copiedDirs) {
    copyDirectory(path.join(root, dir), path.join(target, dir));
  }

  copyFile(path.join(root, "icon.jpeg"), path.join(target, "assets", "icon.jpeg"));
}

console.log(`synced ${packages.length} skill packages`);
