import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "scripts/validate-output.mjs");

const makePlan = (rows, files) => {
  const dir = mkdtempSync(path.join(tmpdir(), "plan-"));
  mkdirSync(path.join(dir, "tasks"));
  writeFileSync(path.join(dir, "index.md"),
    `# demo\n\n| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n${rows.join("\n")}\n`);
  for (const f of files) writeFileSync(path.join(dir, "tasks", f), "# task\n");
  writeFileSync(path.join(dir, "progress.yaml"), "format_version: 1\ncurrent: null\ntasks: {}\nresources: []\nnotes: []\n");
  return dir;
};
const run = (dir) => {
  try { execFileSync("node", [script, "plan-index", dir], { encoding: "utf8" }); return 0; }
  catch (e) { return e.status ?? 1; }
};

test("Scenario: 大计划分文件且校验通过", () => {
  const dir = makePlan(["| T01 a | — | — | f() |", "| T02 b | T01 | f | g() |"], ["T01.md", "T02.md"]);
  try { assert.equal(run(dir), 0); } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Scenario: 悬空依赖被拦截", () => {
  const dir = makePlan(["| T01 a | T99 | — | f() |"], ["T01.md"]);
  try { assert.equal(run(dir), 1); } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("环被拦截", () => {
  const dir = makePlan(["| T01 a | T02 | — | f() |", "| T02 b | T01 | — | g() |"], ["T01.md", "T02.md"]);
  try { assert.equal(run(dir), 1); } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("导航表与 tasks/ 文件不一致被拦截", () => {
  const dir = makePlan(["| T01 a | — | — | f() |"], ["T01.md", "T02.md"]);
  try { assert.equal(run(dir), 1); } finally { rmSync(dir, { recursive: true, force: true }); }
});
