#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const hooksPath = ".githooks";
const requiredHooks = ["pre-commit", "pre-push"].map((name) =>
  path.join(repoRoot, hooksPath, name)
);

for (const hook of requiredHooks) {
  if (!existsSync(hook)) {
    console.error(`Missing hook: ${path.relative(repoRoot, hook)}`);
    process.exit(1);
  }
}

runGit(["config", "core.hooksPath", hooksPath]);
console.log(`Configured git core.hooksPath=${hooksPath}`);

runGit(["config", "push.followTags", "true"]);
console.log("Configured git push.followTags=true (推送时自动带上版本 tag)");

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
