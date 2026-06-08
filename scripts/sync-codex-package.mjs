#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
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

const generatedEntries = [
  { source: ".codex-plugin", target: ".codex-plugin", type: "dir" },
  { source: ".mcp.json", target: ".mcp.json", type: "file" },
  { source: "agents", target: "agents", type: "dir" },
  { source: "commands", target: "commands", type: "dir" },
  { source: "skills", target: "skills", type: "dir" },
  { source: "README.md", target: "README.md", type: "file" },
  { source: "CHANGELOG.md", target: "CHANGELOG.md", type: "file" },
];

const ignoredNames = new Set([".DS_Store"]);
const args = new Set(process.argv.slice(2));

if (args.has("--help")) {
  printUsage();
  process.exit(0);
}

for (const arg of args) {
  if (!["--check", "--codex-validate"].includes(arg)) {
    console.error(`Unknown option: ${arg}`);
    printUsage();
    process.exit(2);
  }
}

const checkOnly = args.has("--check");
const codexValidate = args.has("--codex-validate");

try {
  if (checkOnly) {
    assertPackageInSync();
    console.log("Codex marketplace package is in sync.");
  } else {
    syncPackage();
    assertPackageInSync();
    console.log("Synced Codex marketplace package: plugins/spec-dev");
  }

  if (codexValidate) {
    runOfficialCodexInstallCheck();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function printUsage() {
  console.log(`Usage: node scripts/sync-codex-package.mjs [--check] [--codex-validate]

Options:
  --check            Verify plugins/spec-dev matches the root source files without writing.
  --codex-validate   Use the official Codex CLI in a temporary CODEX_HOME to install the local marketplace package.`);
}

function syncPackage() {
  mkdirSync(packageRoot, { recursive: true });

  for (const entry of generatedEntries) {
    const source = path.join(repoRoot, entry.source);
    const target = path.join(packageRoot, entry.target);

    assertExpectedType(source, entry.type, `source ${entry.source}`);
    rmSync(target, { recursive: true, force: true });
    copyEntry(source, target);
  }
}

function assertPackageInSync() {
  const issues = [];

  for (const entry of generatedEntries) {
    const source = path.join(repoRoot, entry.source);
    const target = path.join(packageRoot, entry.target);

    if (!existsSync(target)) {
      issues.push(`Missing generated entry: plugins/spec-dev/${entry.target}`);
      continue;
    }

    assertExpectedType(source, entry.type, `source ${entry.source}`);

    const targetType = getEntryType(target);
    if (targetType !== entry.type) {
      issues.push(`Type mismatch for plugins/spec-dev/${entry.target}: expected ${entry.type}, got ${targetType}`);
      continue;
    }

    if (entry.type === "file") {
      if (!sameFile(source, target)) {
        issues.push(`Out of sync: ${entry.source} -> plugins/spec-dev/${entry.target}`);
      }
      continue;
    }

    compareDirectories(source, target, entry.target, issues);
  }

  if (issues.length > 0) {
    throw new Error(`Codex marketplace package is out of sync:\n- ${issues.join("\n- ")}`);
  }
}

function compareDirectories(sourceDir, targetDir, targetLabel, issues) {
  const sourceFiles = listFiles(sourceDir);
  const targetFiles = listFiles(targetDir);
  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);

  for (const relativeFile of sourceFiles) {
    if (!targetSet.has(relativeFile)) {
      issues.push(`Missing generated file: plugins/spec-dev/${targetLabel}/${relativeFile}`);
      continue;
    }

    const sourceFile = path.join(sourceDir, relativeFile);
    const targetFile = path.join(targetDir, relativeFile);
    if (!sameFile(sourceFile, targetFile)) {
      issues.push(`Out of sync: ${path.relative(repoRoot, sourceFile)} -> plugins/spec-dev/${targetLabel}/${relativeFile}`);
    }
  }

  for (const relativeFile of targetFiles) {
    if (!sourceSet.has(relativeFile)) {
      issues.push(`Unexpected generated file: plugins/spec-dev/${targetLabel}/${relativeFile}`);
    }
  }
}

function listFiles(root) {
  const files = [];

  function walk(currentDir, prefix) {
    for (const name of readdirSync(currentDir).sort()) {
      if (ignoredNames.has(name)) {
        continue;
      }

      const currentPath = path.join(currentDir, name);
      const relativePath = prefix ? path.join(prefix, name) : name;
      const stat = lstatSync(currentPath);

      if (stat.isSymbolicLink()) {
        throw new Error(`Refusing to package symlink: ${path.relative(repoRoot, currentPath)}`);
      }

      if (stat.isDirectory()) {
        walk(currentPath, relativePath);
        continue;
      }

      if (!stat.isFile()) {
        throw new Error(`Unsupported package entry: ${path.relative(repoRoot, currentPath)}`);
      }

      files.push(relativePath);
    }
  }

  walk(root, "");
  return files;
}

function copyEntry(source, target) {
  const stat = lstatSync(source);

  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing to package symlink: ${path.relative(repoRoot, source)}`);
  }

  if (stat.isFile()) {
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
    return;
  }

  if (!stat.isDirectory()) {
    throw new Error(`Unsupported package entry: ${path.relative(repoRoot, source)}`);
  }

  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source).sort()) {
    if (ignoredNames.has(name)) {
      continue;
    }
    copyEntry(path.join(source, name), path.join(target, name));
  }
}

function runOfficialCodexInstallCheck() {
  const marketplacePath = path.join(repoRoot, ".agents", "plugins", "marketplace.json");
  const pluginManifestPath = path.join(repoRoot, ".codex-plugin", "plugin.json");
  const marketplace = readJson(marketplacePath);
  const pluginManifest = readJson(pluginManifestPath);
  const marketplaceName = marketplace.name;
  const pluginName = pluginManifest.name;

  if (!marketplaceName || typeof marketplaceName !== "string") {
    throw new Error(".agents/plugins/marketplace.json must contain a string `name`");
  }
  if (!pluginName || typeof pluginName !== "string") {
    throw new Error(".codex-plugin/plugin.json must contain a string `name`");
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

function assertExpectedType(filePath, expectedType, label) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${path.relative(repoRoot, filePath)}`);
  }

  const actualType = getEntryType(filePath);
  if (actualType !== expectedType) {
    throw new Error(`Invalid ${label}: expected ${expectedType}, got ${actualType}`);
  }
}

function getEntryType(filePath) {
  const stat = lstatSync(filePath);
  if (stat.isDirectory()) {
    return "dir";
  }
  if (stat.isFile()) {
    return "file";
  }
  if (stat.isSymbolicLink()) {
    return "symlink";
  }
  return "other";
}

function sameFile(left, right) {
  return readFileSync(left).equals(readFileSync(right));
}
