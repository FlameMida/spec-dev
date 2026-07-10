#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const skillRoots = [
  path.join(repoRoot, "skills"),
];
const args = new Set(process.argv.slice(2));

if (args.has("--help")) {
  printUsage();
  process.exit(0);
}

for (const arg of args) {
  if (arg !== "--help") {
    console.error(`Unknown option: ${arg}`);
    printUsage();
    process.exit(2);
  }
}

try {
  const quickValidate = findQuickValidate();
  const python = resolvePython();
  const skills = findSkills();

  for (const skillPath of skills) {
    const label = path.relative(repoRoot, skillPath);
    const result = spawnSync(python, [quickValidate, skillPath], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    if (result.status !== 0) {
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
      throw new Error(`Skill validation failed for ${label}\n${output}`);
    }

    const message = result.stdout.trim();
    console.log(`Skill validation passed: ${label}${message ? ` (${message})` : ""}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function printUsage() {
  console.log(`Usage: node scripts/validate-skills.mjs

Validates all plugin skills (skills/) with skill-creator/scripts/quick_validate.py.

Environment:
  SKILL_CREATOR_QUICK_VALIDATE   Absolute path to quick_validate.py.
  SKILL_CREATOR_HOME             Skill creator directory containing scripts/quick_validate.py.
  PYTHON                         Python executable to use; defaults to python3.`);
}

function findSkills() {
  const skills = [];

  for (const root of skillRoots) {
    if (!existsSync(root)) {
      throw new Error(`Missing skills directory: ${path.relative(repoRoot, root)}`);
    }

    for (const name of readdirSync(root).sort()) {
      if (name === ".DS_Store") {
        continue;
      }

      const skillPath = path.join(root, name);
      if (existsSync(path.join(skillPath, "SKILL.md"))) {
        skills.push(skillPath);
      }
    }
  }

  if (skills.length === 0) {
    throw new Error("No skills found to validate.");
  }

  return skills;
}

function findQuickValidate() {
  const candidates = [];

  if (process.env.SKILL_CREATOR_QUICK_VALIDATE) {
    candidates.push(process.env.SKILL_CREATOR_QUICK_VALIDATE);
  }

  if (process.env.SKILL_CREATOR_HOME) {
    candidates.push(path.join(process.env.SKILL_CREATOR_HOME, "scripts", "quick_validate.py"));
  }

  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  candidates.push(path.join(codexHome, "skills", ".system", "skill-creator", "scripts", "quick_validate.py"));
  candidates.push(path.join(os.homedir(), ".codex", "skills", ".system", "skill-creator", "scripts", "quick_validate.py"));
  candidates.push(path.join(os.homedir(), ".cc-switch", "skills", "skill-creator", "scripts", "quick_validate.py"));

  for (const candidate of [...new Set(candidates.map((item) => path.resolve(item)))]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Cannot find skill-creator quick_validate.py. Set SKILL_CREATOR_QUICK_VALIDATE or SKILL_CREATOR_HOME.",
  );
}

function resolvePython() {
  const directPython = process.env.PYTHON || "python3";
  const directCheck = spawnSync(directPython, ["-c", "import yaml"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (directCheck.status === 0) {
    return directPython;
  }

  const venvDir = path.join(os.tmpdir(), "spec-dev-skill-validate-venv");
  const venvPython = path.join(venvDir, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");

  if (!existsSync(venvPython)) {
    // 并行运行防踩踏：先在唯一临时目录建好 venv，再 rename 到共享路径；
    // rename 失败说明另一进程已就位，用它的即可
    const staging = mkdtempSync(path.join(os.tmpdir(), "spec-dev-skill-venv-"));
    run(directPython, ["-m", "venv", staging], "create skill validation venv");
    try {
      rmSync(venvDir, { recursive: true, force: true });
      renameSync(staging, venvDir);
    } catch {
      rmSync(staging, { recursive: true, force: true });
    }
  }

  const venvCheck = spawnSync(venvPython, ["-c", "import yaml"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (venvCheck.status !== 0) {
    run(venvPython, ["-m", "pip", "install", "--quiet", "PyYAML"], "install PyYAML for skill validation");
  }

  return venvPython;
}

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Failed to ${label}: ${command} ${args.join(" ")}\n${output}`);
  }
}
