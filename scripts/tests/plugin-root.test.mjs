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

test("Scenario: 提醒句更新", () => {
  const vp = read("skills/visual-preview/SKILL.md");
  assert.doesNotMatch(vp, /加入 `\.gitignore`/, "不应再要求用户手动加 gitignore");
  assert.ok(vp.includes("脚本自建"), "应说明脚本自建 .gitignore");
  assert.ok(vp.includes("不要忽略整个 `.spec-dev/`"), "应保留不要忽略整个 .spec-dev 提醒");
  assert.ok(!vp.includes("<skill-base-directory>"), "自造占位符应消失");
  assert.ok(vp.includes('bash "${CLAUDE_SKILL_DIR}/scripts/start-server.sh"'), "启动命令应用官方 CLAUDE_SKILL_DIR");
  assert.ok(vp.includes('bash "${CLAUDE_SKILL_DIR}/scripts/stop-server.sh"'), "停止命令应用官方 CLAUDE_SKILL_DIR");
  assert.ok(vp.includes("保留供日后查看"), "回看设计应保留");
});

const BARE = /(^|[\s`(])(node|bash|python3?|bun)\s+(scripts|skills|agents|guardrail)\//;
const UNQUOTED = /(node|bash|python3?|bun)\s+\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/;
const PLACEHOLDER = /<插件根>|<plugin-root>|<skill-base-directory>/;

test("Scenario: 零裸路径与零自造占位符", () => {
  // 裸路径规则的范围是 skills/ agents/ commands/（spec 原文）；scripts/schemas/README.md 是插件仓库内的开发文档，
  // 其 `node scripts/validate-output.mjs agent-plugin-1.0.0 plugin.json` 在插件根运行属合法，只查双引号与占位符
  for (const f of [...mdFiles(), "scripts/schemas/README.md"]) {
    const text = read(f);
    const bareScope = !f.startsWith("scripts/");
    for (const line of text.split("\n")) {
      if (line.includes("scripts/spec-dev/") || line.includes("update-vendored-skill")) continue; // 目标仓库路径 / 仓库开发期维护提示
      if (bareScope) assert.ok(!BARE.test(line), `${f}: 裸路径命令 → ${line.trim().slice(0, 100)}`);
      assert.ok(!UNQUOTED.test(line), `${f}: 变量未加双引号 → ${line.trim().slice(0, 100)}`);
    }
    assert.ok(!PLACEHOLDER.test(text), `${f}: 自造占位符`);
  }
});

test("Scenario: 降级说明不再各处复述", () => {
  for (const f of [...mdFiles(), "scripts/schemas/README.md"]) {
    const t = read(f);
    assert.ok(!t.includes("先定位插件安装目录再以其为根解析路径"), `${f} 仍有降级复述`);
    assert.ok(!t.includes("先找插件安装目录"), `${f} 仍有降级复述`);
  }
  for (const f of ["agents/code-explorer.md", "agents/external-resource-explorer.md", "commands/doctor.md"]) {
    assert.ok(read(f).includes("未替换时按插件根解析序列推导"), `${f} 缺固定回退句`);
  }
});

const GIST_FI = "失败先缩小范围重试 1 次，再失败主线程接管（定义见 exploration-patterns「派发要求与失败隔离」）";
const GIST_CV = "校验失败发回补全一次，再失败主线程接管（定义见 exploration-patterns「输出契约与校验」）";

test("Scenario: 四处 gist 与 canonical 字面一致", () => {
  for (const f of ["skills/requirement-analysis/SKILL.md", "skills/quick-fix/SKILL.md", "skills/requirement-analysis/references/codex-compat.md", "skills/executing-plans/references/review-orchestration.md"]) {
    assert.ok(read(f).includes(GIST_FI), `${f} 缺失败隔离 gist 或措辞不一致`);
  }
  assert.equal(count(read(EP), "缩小该主题范围重试 1 次"), 1, "canonical 只在 exploration-patterns 出现一次");
  for (const f of [...mdFiles(), "scripts/schemas/README.md"]) assert.ok(!read(f).includes("主进程接管"), `${f} 仍有措辞分化"主进程接管"`);
});

test("Scenario: 契约校验完整陈述唯一（引用侧）", () => {
  for (const f of ["skills/executing-plans/SKILL.md", "skills/executing-plans/references/review-orchestration.md", "scripts/schemas/README.md"]) {
    assert.ok(read(f).includes(GIST_CV), `${f} 缺契约校验 gist 或措辞不一致`);
  }
  for (const f of [...mdFiles(), "scripts/schemas/README.md"]) {
    if (f === EP) continue;
    for (const line of read(f).split("\n")) {
      if (line.includes("补全一次")) assert.ok(line.includes("exploration-patterns"), `${f}: "补全一次"同行缺指针 → ${line.trim().slice(0, 100)}`);
    }
  }
});

test("Scenario: 有意变体被标注", () => {
  const ai = read("skills/acceptance-qa/references/ai-acceptance.md");
  assert.match(ai, /再失败将缺失项标记 unverified[^\n]*acceptance-qa 有意变体[^\n]*exploration-patterns/, "ai-acceptance 应保留 unverified 结局并标注为变体、指向定义点");
});

test("Scenario: 通用映射行只在一处", () => {
  const row = "| 进度跟踪 | `TaskCreate` / `TaskUpdate` | `update_plan` |";
  const hits = [...mdFiles(), "scripts/schemas/README.md"].filter((f) => read(f).includes(row));
  assert.deepEqual(hits, ["skills/requirement-analysis/references/codex-compat.md"], "通用映射表只能在 codex-compat");
  assert.ok(read("skills/requirement-analysis/SKILL.md").includes("codex-compat.md"), "RA 应保留指针");
  assert.ok(read("skills/requirement-analysis/references/codex-compat.md").includes("全 skill 共用"), "codex-compat 前言应声明全 skill 共用");
});

test("Scenario: quick-fix 自有行保留", () => {
  const qf = read("skills/quick-fix/SKILL.md");
  assert.ok(qf.includes('`spawn_agent`（`fork_turns: "none"`）+ `wait_agent`'), "自有行应保留");
  assert.ok(qf.includes("codex-compat.md"), "应有指向总表的指针");
  assert.ok(!qf.includes("| 用户澄清/确认 |"), "通用行不应复述");
});

test("Scenario: 清单不再复述", () => {
  const qf = read("skills/quick-fix/SKILL.md");
  assert.doesNotMatch(qf, /配置文件\/纯文案\/一次性原型/, "不应并列复述 TDD 例外清单");
  assert.ok(qf.includes("例外清单以 test-driven-development skill 为准"), "应改为引用 TDD 清单");
  assert.ok(qf.includes("纯文案"), "quick-fix 自有例外应显式保留");
});

test("Scenario: 双语表存在且分级一致", () => {
  const en = read("README.md");
  const zh = read("README.zh-CN.md");
  assert.ok(en.includes("### Runtime dependencies"));
  assert.ok(zh.includes("### 运行时依赖"));
  const rows = (t) => t.split("\n").filter((l) => /^\| (hard|soft) \|/.test(l));
  const er = rows(en);
  const zr = rows(zh);
  assert.equal(er.length, zr.length, "双语表行数应相同");
  assert.equal(er.filter((l) => l.startsWith("| hard |")).length, 2, "hard 行应为 git 与 Node.js");
  for (const t of [en, zh]) {
    assert.match(t, /\| hard \| `git` \|/);
    assert.match(t, /\| hard \| Node\.js ≥ 18 \|/);
    assert.ok(t.includes("exploration-patterns.md"), "校验器降级应指向定义点");
  }
  for (const l of [...er, ...zr].filter((l) => l.startsWith("| soft |"))) assert.ok(l.split("|")[4].trim().length > 0, `soft 行缺降级链: ${l}`);
});

test("Scenario: 分区约定可读且不误导", () => {
  const en = read("README.md");
  const zh = read("README.zh-CN.md");
  assert.ok(en.includes("### Maturity tiers and release discipline"));
  assert.ok(zh.includes("### 成熟度分区与发布纪律"));
  for (const t of [en, zh]) {
    assert.ok(t.includes("skills-in-progress/"), "应说明实验 skill 位置");
    assert.ok(t.includes("check-plugin"), "应说明双向校验");
    assert.match(t, /marketplace\.json/);
  }
  assert.match(en, /explicit `skills\[\]`/);
  assert.match(zh, /显式/);
});

test("Scenario: 计数与磁盘一致", () => {
  const en = read("README.md");
  const zh = read("README.zh-CN.md");
  const skillsDir = path.join(repoRoot, "skills");
  const skills = readdirSync(skillsDir).filter((s) => existsSync(path.join(skillsDir, s, "SKILL.md")));
  const layout = (t) => t.slice(Math.max(t.indexOf("## Directory Layout"), t.indexOf("## 目录结构")));
  for (const t of [en, zh]) {
    for (const s of skills) assert.ok(layout(t).includes(`${s}/`), `目录结构缺 ${s}/`);
    for (const f of ["doctor.mjs", "update-vendored-skill.mjs"]) assert.ok(layout(t).includes(f), `目录结构缺 ${f}`);
  }
  const triggers = skills.filter((s) => existsSync(path.join(skillsDir, s, "evals/trigger-evals.json")));
  assert.equal(triggers.length, 6);
  for (const t of [en, zh]) {
    const line = t.split("\n").find((l) => l.includes("`trigger-evals.json`"));
    for (const s of triggers) assert.ok(line.includes(s), `trigger-evals 行缺 ${s}`);
  }
  assert.ok(!en.includes("four skills") && !zh.includes("四个 skill"));
  assert.equal(readdirSync(path.join(repoRoot, "scripts/schemas")).filter((f) => f.endsWith(".json")).length, 4);
  assert.ok(en.includes("3 output contract schemas + 1 vendored manifest schema"));
  assert.ok(zh.includes("3 类输出契约 schema + 1 个 vendored manifest schema"));
  assert.match(en, /four-way self-review \(spec coverage \/ placeholders \/ type consistency \/ navigation table/);
  assert.match(zh, /四查（spec 覆盖\/占位符\/类型一致\/导航表与任务文件一致）/);
});

test("Scenario: 变量未替换时按序列推导——skill base directory 上两级即插件根（布局不变量）", () => {
  for (const s of ["requirement-analysis", "writing-plans", "executing-plans", "acceptance-qa"]) {
    const root = path.resolve(repoRoot, "skills", s, "..", "..");
    assert.equal(root, repoRoot, `${s} 的 base directory 上两级应为插件根`);
    assert.ok(existsSync(path.join(root, "scripts/validate-output.mjs")), "插件根下应有校验器");
    assert.ok(existsSync(path.join(root, "skills/acceptance-qa/scripts/detect-env.mjs")), "插件根下应有 detect-env.mjs");
  }
});

export { repoRoot, read, count, VENDORED, walk, mdFiles, EP, existsSync };
