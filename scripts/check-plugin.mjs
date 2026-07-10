#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const CODEX_TIMEOUT_MS = 120_000;

// 扁平结构：仓库根即插件根，跳过与插件分发无关的目录
const ignoredNames = new Set([".DS_Store", ".git", ".idea", "node_modules"]);
const args = new Set(process.argv.slice(2));

if (args.has("--help")) {
  printUsage();
  process.exit(0);
}

for (const arg of args) {
  if (!["--codex-validate"].includes(arg)) {
    console.error(`Unknown option: ${arg}`);
    printUsage();
    process.exit(2);
  }
}

const codexValidate = args.has("--codex-validate");

try {
  assertManifestVersionsInSync();
  assertNoSymlinks(repoRoot);
  console.log("Plugin package checks passed.");

  if (codexValidate) {
    runOfficialCodexInstallCheck();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function printUsage() {
  console.log(`Usage: node scripts/check-plugin.mjs [--codex-validate]

Verifies that the three plugin manifests share the same version and that the
plugin package contains no symlinks.

Options:
  --codex-validate   Use the official Codex CLI in a temporary CODEX_HOME to install the local marketplace package.`);
}

// 三份清单各自面向 Claude marketplace、Claude 插件、Codex 插件，版本号必须一致
function assertManifestVersionsInSync() {
  const versionSources = [
    {
      label: ".claude-plugin/marketplace.json (metadata.version)",
      version: readJson(path.join(repoRoot, ".claude-plugin", "marketplace.json")).metadata?.version,
    },
    {
      label: ".claude-plugin/plugin.json (version)",
      version: readJson(path.join(repoRoot, ".claude-plugin", "plugin.json")).version,
    },
    {
      label: ".codex-plugin/plugin.json (version)",
      version: readJson(path.join(repoRoot, ".codex-plugin", "plugin.json")).version,
    },
  ];

  const missing = versionSources.filter((s) => typeof s.version !== "string" || s.version === "");
  if (missing.length > 0) {
    throw new Error(`Manifest version missing:\n- ${missing.map((s) => s.label).join("\n- ")}`);
  }

  const versions = new Set(versionSources.map((s) => s.version));
  if (versions.size > 1) {
    throw new Error(
      `Manifest versions are out of sync:\n- ${versionSources
        .map((s) => `${s.label}: ${s.version}`)
        .join("\n- ")}`,
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
    timeout: CODEX_TIMEOUT_MS,
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
    },
  });

  if (result.error?.code === "ETIMEDOUT" || (result.signal && !result.error)) {
    throw new Error(
      `Official Codex CLI check timed out after ${CODEX_TIMEOUT_MS / 1000}s: codex ${codexArgs.join(" ")}`
    );
  }

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
