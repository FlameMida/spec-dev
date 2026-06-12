#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const packageRoot = path.join(repoRoot, "plugins", "spec-dev");

// 受控双份：仓库根是编辑面，插件包内副本必须逐字节一致
const mirroredFiles = ["README.md", "CHANGELOG.md", ".mcp.json"];

const ignoredNames = new Set([".DS_Store"]);
const args = new Set(process.argv.slice(2));

if (args.has("--help")) {
  printUsage();
  process.exit(0);
}

for (const arg of args) {
  if (!["--fix", "--codex-validate"].includes(arg)) {
    console.error(`Unknown option: ${arg}`);
    printUsage();
    process.exit(2);
  }
}

const fix = args.has("--fix");
const codexValidate = args.has("--codex-validate");

try {
  if (fix) {
    fixMirrors();
  }

  assertMirrorsInSync();
  assertNoSymlinks(packageRoot);
  console.log("Mirrored files are in sync.");

  if (codexValidate) {
    runOfficialCodexInstallCheck();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function printUsage() {
  console.log(`Usage: node scripts/check-mirrors.mjs [--fix] [--codex-validate]

Verifies that mirrored files (${mirroredFiles.join(", ")}) are identical between
the repo root and plugins/spec-dev, and that the plugin package contains no symlinks.

Options:
  --fix              Copy mirrored files from the repo root into plugins/spec-dev before checking.
  --codex-validate   Use the official Codex CLI in a temporary CODEX_HOME to install the local marketplace package.`);
}

function fixMirrors() {
  for (const relativeFile of mirroredFiles) {
    const source = path.join(repoRoot, relativeFile);
    const target = path.join(packageRoot, relativeFile);

    if (!existsSync(source)) {
      throw new Error(`Missing mirror source: ${relativeFile}`);
    }

    copyFileSync(source, target);
    console.log(`Copied ${relativeFile} -> plugins/spec-dev/${relativeFile}`);
  }
}

function assertMirrorsInSync() {
  const issues = [];

  for (const relativeFile of mirroredFiles) {
    const source = path.join(repoRoot, relativeFile);
    const target = path.join(packageRoot, relativeFile);

    if (!existsSync(source)) {
      issues.push(`Missing mirror source: ${relativeFile}`);
      continue;
    }

    if (!existsSync(target)) {
      issues.push(`Missing mirror copy: plugins/spec-dev/${relativeFile}`);
      continue;
    }

    if (!sameFile(source, target)) {
      issues.push(`Out of sync: ${relativeFile} <-> plugins/spec-dev/${relativeFile}`);
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Mirrored files are out of sync:\n- ${issues.join("\n- ")}\n` +
        "Edit the repo root copy, then run `node scripts/check-mirrors.mjs --fix` to update plugins/spec-dev.",
    );
  }
}

function assertNoSymlinks(root) {
  for (const name of readdirSync(root).sort()) {
    if (ignoredNames.has(name)) {
      continue;
    }

    const currentPath = path.join(root, name);
    const stat = lstatSync(currentPath);

    if (stat.isSymbolicLink()) {
      throw new Error(`Plugin package must not contain symlinks: ${path.relative(repoRoot, currentPath)}`);
    }

    if (stat.isDirectory()) {
      assertNoSymlinks(currentPath);
    }
  }
}

function runOfficialCodexInstallCheck() {
  const marketplacePath = path.join(repoRoot, ".agents", "plugins", "marketplace.json");
  const pluginManifestPath = path.join(packageRoot, ".codex-plugin", "plugin.json");
  const marketplace = readJson(marketplacePath);
  const pluginManifest = readJson(pluginManifestPath);
  const marketplaceName = marketplace.name;
  const pluginName = pluginManifest.name;

  if (!marketplaceName || typeof marketplaceName !== "string") {
    throw new Error(".agents/plugins/marketplace.json must contain a string `name`");
  }
  if (!pluginName || typeof pluginName !== "string") {
    throw new Error("plugins/spec-dev/.codex-plugin/plugin.json must contain a string `name`");
  }

  const codexHome = mkdtempSync(path.join(os.tmpdir(), "spec-dev-codex-validate-"));
  try {
    runCodex(["plugin", "marketplace", "add", repoRoot], codexHome);
    runCodex(["plugin", "add", `${pluginName}@${marketplaceName}`], codexHome);
    console.log(`Official Codex CLI install check passed: ${pluginName}@${marketplaceName}`);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
}

function runCodex(codexArgs, codexHome) {
  const result = spawnSync("codex", codexArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Official Codex CLI check failed: codex ${codexArgs.join(" ")}\n${output}`);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sameFile(left, right) {
  return readFileSync(left).equals(readFileSync(right));
}
