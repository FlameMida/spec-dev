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

const DECL = "> **插件根**：`${CLAUDE_PLUGIN_ROOT}`——本 skill 正文与其 references 中的插件根命令以此为准；若上式仍为变量字面量（平台未替换），按 requirement-analysis 的 references/exploration-patterns.md「插件根解析」序列推导。";

test("Scenario: 四个 skill 都有声明行", () => {
  const withDecl = ["requirement-analysis", "writing-plans", "executing-plans", "acceptance-qa"];
  for (const s of withDecl) assert.ok(read(`skills/${s}/SKILL.md`).includes(DECL), `${s} 缺声明行或措辞不一致`);
  for (const s of readdirSync(path.join(repoRoot, "skills"))) {
    if (withDecl.includes(s) || VENDORED.includes(`skills/${s}`)) continue;
    if (!existsSync(path.join(repoRoot, "skills", s, "SKILL.md"))) continue;
    assert.ok(!read(`skills/${s}/SKILL.md`).includes("**插件根**："), `${s} 正文无插件根命令，不应有声明行`);
  }
});

test("Scenario: 变量未替换时按序列推导——SKILL 内命令为双引号写法且契约 gist 带指针", () => {
  const ep = read("skills/executing-plans/SKILL.md");
  const aq = read("skills/acceptance-qa/SKILL.md");
  assert.ok(ep.includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" review-findings <file>'));
  assert.ok(aq.includes('node "${CLAUDE_PLUGIN_ROOT}/skills/acceptance-qa/scripts/detect-env.mjs"'));
  assert.ok(!aq.includes("先定位插件安装目录"), "acceptance-qa 不应再自带降级说明");
  for (const [f, t] of [["executing-plans", ep], ["acceptance-qa", aq]]) {
    for (const line of t.split("\n")) if (line.includes("补全一次")) assert.ok(line.includes("exploration-patterns"), `${f}: 契约校验句缺指针 → ${line.trim().slice(0, 80)}`);
  }
});

export { repoRoot, read, count, VENDORED, walk, mdFiles, EP, existsSync };
