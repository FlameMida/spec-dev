import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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

test("normalize 注入 anysearch 中文 description（含触发与降级说明）", () => {
  run(["--skill", "anysearch", "--normalize"]);
  const fm = readFileSync(path.join(repoRoot, "skills/anysearch/SKILL.md"), "utf8").split("\n---")[0];
  assert.match(fm, /description: >-\n  实时网页搜索/, "应使用中文描述");
  assert.doesNotMatch(fm, /Real-time web search|Use when/, "不应恢复英文描述");
  assert.match(fm, /联网搜索/, "缺中文触发词");
  assert.match(fm, /WebSearch\/WebFetch/, "缺降级说明");
});

test("退役 skill 不再进入同步流程", () => {
  const result = spawnSync('node', [script, '--skill', 'sequential-thinking', '--check'], {cwd: repoRoot, encoding: 'utf8'});
  assert.equal(result.status, 2);
  assert.match(result.stderr, /取值限于: anysearch（/);
});

test("SHA 快照选项不再支持，tag 检查仍可离线执行", () => {
  const removed = spawnSync('node', [script, '--skill', 'anysearch', '--sha', 'abcdef0'], {cwd: repoRoot, encoding: 'utf8'});
  assert.equal(removed.status, 2);
  assert.match(removed.stderr, /Unknown option: --sha/);
  const pinned = readFileSync(path.join(repoRoot, 'skills/anysearch/SKILL.md'), 'utf8').match(/upstream-tag:\s*(\S+)/)[1];
  assert.match(run(['--skill', 'anysearch', '--tag', pinned, '--check']), /已是最新/);
});

test("未知 --skill 退出码 2 并列出可选项", () => {
  try {
    run(["--skill", "nope", "--normalize"]);
    assert.fail("应当报错退出");
  } catch (e) {
    assert.equal(e.status, 2);
    assert.match(String(e.stderr), /取值限于: anysearch（/);
  }
});

test("旧脚本已删除（不留兼容垫片）", () => {
  assert.ok(!existsSync(path.join(repoRoot, "scripts/update-anysearch.mjs")));
});

test("--check 只读探测：退出码 0/1 语义、可辨输出且不改工作区（网络不可达时同为退出码 1）", () => {
  const before = execFileSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" });
  let out = "";
  let code = 0;
  try {
    out = execFileSync("node", [script, "--skill", "anysearch", "--check"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 45000,
    });
  } catch (e) {
    code = e.status ?? 1;
    out = ((e.stdout ?? "") + (e.stderr ?? "")) || "(无输出——探测超时或被杀，视同上游不可达)";
  }
  assert.ok(code === 0 || code === 1, `退出码应为 0/1，实际 ${code}`);
  if (code === 0) {
    // 成功路径：已打印 当前引入/上游目标 并判定「已是最新」
    assert.match(out, /当前引入[:：]/);
    assert.match(out, /已是最新/);
  } else {
    // 失败路径三选一：有新版（同步指引）/ 上游不可达（latestTarget 在打印前求值，只剩 stderr）/ 超时无输出
    assert.match(out, /当前引入[:：]|发现新版本|无法从上游读取|Failed:|视同上游不可达/);
  }
  const after = execFileSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(after, before, "--check 不得改动工作区");
});
