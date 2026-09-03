import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
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

const runCapture = (dir) => {
  try {
    execFileSync("node", [script, "plan-index", dir], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, stderr: "" };
  } catch (e) { return { status: e.status ?? 1, stderr: String(e.stderr ?? "") }; }
};

test("Scenario: 区间展开参与闭包", () => {
  const rows = ["| T01 a | — | — | a() |", "| T02 b | T01 | a | b() |", "| T03 c | T02 | b | c() |", "| T04 d | T03 | c | d() |", "| T05 e | T01-T04 | d | e() |"];
  const dir = makePlan(rows, ["T01.md", "T02.md", "T03.md", "T04.md", "T05.md"]);
  try { assert.equal(run(dir), 0); } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Scenario: 倒序区间被拦截", () => {
  const dir = makePlan(["| T01 a | — | — | a() |", "| T02 b | — | — | b() |", "| T03 c | T02-T01 | — | c() |"], ["T01.md", "T02.md", "T03.md"]);
  try {
    const r = runCapture(dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /"path": "T03\.deps"/);
    assert.match(r.stderr, /ascending range/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Scenario: 区间内缺号被拦截", () => {
  const dir = makePlan(["| T01 a | — | — | a() |", "| T02 b | — | — | b() |", "| T04 d | — | — | d() |", "| T05 e | T01-T04 | — | e() |"], ["T01.md", "T02.md", "T04.md", "T05.md"]);
  try {
    const r = runCapture(dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /dangling T03/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Scenario: 存量计划仍通过", () => {
  assert.equal(run(path.join(repoRoot, ".spec-dev/2026-08-27-01-plan-single-format/plan")), 0);
});

test("Scenario: writing-plans 导航表规则定义闭区间写法且校验命令为插件根写法", () => {
  const wp = readFileSync(path.join(repoRoot, "skills/writing-plans/SKILL.md"), "utf8");
  assert.ok(wp.includes("`T01-T06` 表示 T01 至 T06 闭区间"), "应定义闭区间写法");
  assert.ok(wp.includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index <plan目录>'), "校验命令应为插件根写法");
  assert.ok(!wp.includes("node scripts/validate-output.mjs"), "不应残留裸相对路径");
});
