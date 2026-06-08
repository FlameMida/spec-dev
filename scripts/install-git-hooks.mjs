#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const hooksPath = ".githooks";
const preCommitHook = path.join(repoRoot, hooksPath, "pre-commit");

if (!existsSync(preCommitHook)) {
  console.error(`Missing hook: ${path.relative(repoRoot, preCommitHook)}`);
  process.exit(1);
}

runGit(["config", "core.hooksPath", hooksPath]);
console.log(`Configured git core.hooksPath=${hooksPath}`);

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    console.error(`git ${args.join(" ")} failed\n${output}`);
    process.exit(result.status ?? 1);
  }
}
