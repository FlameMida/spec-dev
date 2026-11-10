import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");
const VENDORED = ["skills/anysearch"];
const walk = (rel, out = []) => {
  for (const name of readdirSync(path.join(repoRoot, rel))) {
    const r = `${rel}/${name}`;
    if (VENDORED.some((v) => r === v || r.startsWith(`${v}/`))) continue;
    if (statSync(path.join(repoRoot, r)).isDirectory()) walk(r, out);
    else out.push(r);
  }
  return out;
};
const mdFiles = () => ["skills", "commands"].flatMap((d) => walk(d)).filter((f) => f.endsWith(".md"));
const RUNTIME = "skills/requirement-analysis/references/plugin-root.md";
const HOST_COMPAT = "skills/requirement-analysis/references/host-compat.md";
// 受检文档全集：skills/commands 的 .md + schemas 说明（单点定义，新增受检文件只改这里）
const docFiles = () => [...mdFiles(), "scripts/schemas/README.md"];
const ownSkills = () => readdirSync(path.join(repoRoot, "skills"))
  .filter((s) => !VENDORED.includes(`skills/${s}`) && existsSync(path.join(repoRoot, "skills", s, "SKILL.md")));

test("Scenario: 解析序列只有一个定义点", () => {
  const hits = [...docFiles(), "scripts/validate-output.mjs"]
    .filter((f) => { const t = read(f); return t.includes("上两级") && t.includes("已安装插件目录"); });
  assert.deepEqual(hits, [RUNTIME], "解析序列应只有一个完整权威");
  assert.ok(read(RUNTIME).includes("## 插件根解析"), "应有「插件根解析」节");
  assert.match(read(RUNTIME), /阅读时机/);
  assert.ok(read(HOST_COMPAT).includes("](plugin-root.md)"), "host-compat 应指向插件根定义");
});

test("Scenario: 三级全失败不静默", () => {
  const t = read(RUNTIME);
  assert.ok(t.includes("无法定位插件根") && t.includes("不得静默跳过"), "三级失败处置句应存在");
});

test("Scenario: skill 不需要插件根，只用自己的目录", () => {
  for (const s of ownSkills()) assert.ok(!read(`skills/${s}/SKILL.md`).includes("**插件根**："), `${s} 不应有插件根声明行`);
  assert.ok(read("skills/acceptance-qa/SKILL.md").includes('node "${CLAUDE_SKILL_DIR}/scripts/detect-env.mjs"'));
  assert.ok(existsSync(path.join(repoRoot, "skills/acceptance-qa/scripts/detect-env.mjs")));
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

// 裸路径：可选 ./ 前缀与引号包裹都算；变量：无引号或单引号（单引号会阻止 shell 展开）都算未正确包裹
const BARE = /(^|[\s`(])(node|bash|python3?|bun)\s+["']?(\.\/)?(scripts|skills|agents|guardrail)\//;
const UNQUOTED = /(node|bash|python3?|bun)\s+'?\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/;
// 受检文本全集（含各 skill 的 Codex 接口文件 openai.yaml，防止命令形态从 description 漂进去）
const textFiles = () => ["skills", "commands"].flatMap((d) => walk(d)).filter((f) => /\.(md|yaml)$/.test(f)).concat(["scripts/schemas/README.md"]);
const PLACEHOLDER = /<插件根>|<plugin-root>|<skill-base-directory>/;

test("Scenario: 零裸路径与零自造占位符", () => {
  // 裸路径规则的范围是 skills/ commands/；scripts/schemas/README.md 是插件仓库内的开发文档，
  // 其 `node scripts/validate-output.mjs agent-plugin-1.0.0 plugin.json` 在插件根运行属合法，只查双引号与占位符
  for (const f of textFiles()) {
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
  for (const f of docFiles()) {
    const t = read(f);
    assert.ok(!t.includes("先定位插件安装目录再以其为根解析路径"), `${f} 仍有降级复述`);
    assert.ok(!t.includes("先找插件安装目录"), `${f} 仍有降级复述`);
  }
  assert.ok(read("commands/doctor.md").includes("未替换时按插件根解析序列推导"), "doctor 缺固定回退句");
});

test("Scenario: 子代理失败处置措辞一致", () => {
  const gist = "失败先缩小范围重试 1 次，再失败主线程接管";
  for (const f of ["skills/requirement-analysis/SKILL.md", "skills/quick-fix/SKILL.md"]) assert.ok(read(f).includes(gist), `${f} 缺失败处置句`);
  for (const f of docFiles()) assert.ok(!read(f).includes("主进程接管"), `${f} 仍有措辞分化"主进程接管"`);
});

test("Scenario: S24 单点迁移及旧断言处置", () => {
  const qf = read("skills/quick-fix/SKILL.md");
  const tdd = read("skills/test-driven-development/SKILL.md");
  assert.ok(qf.includes("例外清单以 test-driven-development skill 为准"));
  assert.doesNotMatch(qf, /quick-fix 另视纯文案|自有纯文案例外/);
  assert.match(tdd, /例外清单[\s\S]*纯文案/);
  assert.match(tdd, /授权/);
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
  for (const t of [en, zh]) {
    const line = t.split("\n").find((l) => l.includes("`trigger-evals.json`"));
    const listed=[...line.matchAll(/`([a-z][a-z-]+)`/g)].map(m=>m[1]).sort();
    assert.deepEqual(listed,[...triggers].sort());
  }
  assert.ok(!en.includes("four skills") && !zh.includes("四个 skill"));
  const schemaFiles=readdirSync(path.join(repoRoot,"scripts/schemas")).filter(f=>f.endsWith(".json"));
  const contractTable=read("scripts/schemas/README.md").split("## 契约清单")[1].split("## 新增 schema")[0];
  const documented=[...contractTable.matchAll(/^\| `([^`]+)` \|/gm)].map(m=>m[1]).sort();
  assert.deepEqual(documented,schemaFiles.map(f=>f.slice(0,-5)).sort());
});

test("Scenario: 插件布局不变量——skill 目录上两级即插件根", () => {
  for (const s of ownSkills()) {
    assert.equal(path.resolve(repoRoot, "skills", s, "..", ".."), repoRoot, `${s} 的 base directory 上两级应为插件根`);
  }
  assert.ok(existsSync(path.join(repoRoot, "scripts/validate-output.mjs")), "插件根下应有校验器");
});
