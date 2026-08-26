import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "scripts/update-vendored-skill.mjs");
const run = (args) => execFileSync("node", [script, ...args], { cwd: repoRoot, encoding: "utf8" });

test("normalize 幂等：连续两次运行零 diff", () => {
  run(["--skill", "anysearch", "--normalize"]);
  const first = readFileSync(path.join(repoRoot, "skills/anysearch/SKILL.md"), "utf8");
  run(["--skill", "anysearch", "--normalize"]);
  const second = readFileSync(path.join(repoRoot, "skills/anysearch/SKILL.md"), "utf8");
  assert.equal(first, second);
});

test("normalize 注入 anysearch 增强 description（含 Use when 触发与降级句，双语）", () => {
  run(["--skill", "anysearch", "--normalize"]);
  const fm = readFileSync(path.join(repoRoot, "skills/anysearch/SKILL.md"), "utf8").split("\n---")[0];
  assert.match(fm, /Use when/, "缺 Use when 触发从句");
  assert.match(fm, /联网搜索/, "缺中文触发词");
  assert.match(fm, /WebSearch\/WebFetch/, "缺降级说明");
});

test("sequential-thinking 走 SHA 快照配置且 normalize 幂等", () => {
  run(["--skill", "sequential-thinking", "--normalize"]);
  const first = readFileSync(path.join(repoRoot, "skills/sequential-thinking/SKILL.md"), "utf8");
  run(["--skill", "sequential-thinking", "--normalize"]);
  assert.equal(first, readFileSync(path.join(repoRoot, "skills/sequential-thinking/SKILL.md"), "utf8"));
  assert.match(first, /upstream-tag: [0-9a-f]{7,40}/, "SHA pin 应记录在 metadata.upstream-tag");
});

test("未知 --skill 退出码 2 并列出可选项", () => {
  try {
    run(["--skill", "nope", "--normalize"]);
    assert.fail("应当报错退出");
  } catch (e) {
    assert.equal(e.status, 2);
    assert.match(String(e.stderr), /anysearch|sequential-thinking/);
  }
});

test("旧脚本已删除（不留兼容垫片）", () => {
  assert.ok(!existsSync(path.join(repoRoot, "scripts/update-anysearch.mjs")));
});

test("--check 只读探测：输出当前引入行、退出码 0/1 语义且不改工作区（网络不可达时同为退出码 1）", () => {
  const before = execFileSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" });
  let out = "";
  let code = 0;
  try {
    out = run(["--skill", "anysearch", "--check"]);
  } catch (e) {
    code = e.status ?? 1;
    out = (e.stdout ?? "") + (e.stderr ?? "");
  }
  // CLI 契约：无论最新与否，先打印「当前引入:…上游目标:…」；0=已最新、1=有新版或探测失败
  assert.match(out, /当前引入[:：]/);
  assert.ok(code === 0 || code === 1, `退出码应为 0/1，实际 ${code}`);
  if (code === 1) {
    // 二选一：有新版（给出同步指引）或上游不可达（doctor 归 unknown 的同一形态）
    assert.match(out, /发现新版本|无法从上游读取|Failed:/);
  }
  const after = execFileSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(after, before, "--check 不得改动工作区");
});
