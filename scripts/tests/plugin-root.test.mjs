import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");
const count = (text, needle) => text.split(needle).length - 1;
const VENDORED = ["skills/anysearch", "skills/sequential-thinking"];
const walk = (rel, out = []) => {
  for (const name of readdirSync(path.join(repoRoot, rel))) {
    const r = `${rel}/${name}`;
    if (VENDORED.some((v) => r === v || r.startsWith(`${v}/`))) continue;
    if (statSync(path.join(repoRoot, r)).isDirectory()) walk(r, out);
    else out.push(r);
  }
  return out;
};
const mdFiles = () => ["skills", "agents", "commands"].flatMap((d) => walk(d)).filter((f) => f.endsWith(".md"));
const EP = "skills/requirement-analysis/references/exploration-patterns.md";

test("Scenario: 解析序列只有一个定义点", () => {
  const hits = [...mdFiles(), "scripts/schemas/README.md", "scripts/validate-output.mjs"]
    .filter((f) => { const t = read(f); return t.includes("上两级") && t.includes("已安装插件目录"); });
  assert.deepEqual(hits, [EP], "解析序列完整陈述只能在 exploration-patterns");
  assert.ok(read(EP).includes("## 插件根解析"), "应有「插件根解析」节");
});

test("Scenario: 契约校验完整陈述唯一（定义点侧）", () => {
  const t = read(EP);
  assert.equal(count(t, "补全一次"), 1, "canonical 只出现一次");
  assert.ok(t.includes("## 输出契约与校验"), "节标题应存在");
  assert.ok(t.includes("校验器不可用") && t.includes("契约校验降级"), "应有校验器不可用降级句");
  assert.ok(t.includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" exploration-report <file>'), "命令应为双引号写法");
});

test("Scenario: 止损句单点存在", () => {
  const hits = [...mdFiles(), "scripts/schemas/README.md"].filter((f) => read(f).includes("不硬撑"));
  assert.deepEqual(hits, [EP]);
});

test("Scenario: 三级全失败不静默", () => {
  const t = read(EP);
  assert.ok(t.includes("无法定位插件根") && t.includes("不得静默跳过"), "三级失败处置句应存在");
});

export { repoRoot, read, count, VENDORED, walk, mdFiles, EP, existsSync };
