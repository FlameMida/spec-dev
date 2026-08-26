import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = path.join(repoRoot, "skills/sequential-thinking/scripts/think.mjs");
const run = (args) => execFileSync("node", [port, ...args], { encoding: "utf8" });

test("think.mjs 端口存在", () => {
  assert.ok(existsSync(port), "think.mjs missing");
});

test("reset→submit→status 行为与上游 think.ts 契约一致（无 TS 运行时）", () => {
  assert.match(run(["--reset"]), /"status": "reset"/);
  const out = run(["--thought", "t1", "--thoughtNumber", "1", "--totalThoughts", "2", "--nextThoughtNeeded", "true"]);
  assert.equal(out, "[1/2] history=1 next=true\n");
  const status = JSON.parse(run(["--status"]));
  assert.equal(status.thoughtHistoryLength, 1);
  assert.equal(status.nextThoughtNeeded, true);
  run(["--reset"]); // 清理状态文件
});
