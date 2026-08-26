# spec-dev 重大升级实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。步骤用复选框（`- [ ]`）语法跟踪；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：一次交付 spec-dev 的整合升级——多平台适配（Agent plugins 1.0.0 / grok / pi）、MCP 清零（sequential-thinking vendored 化）、注入链可观测、anysearch 统一搜索入口、产物编号与 roadmap 胶囊、澄清纪律披露与 exploring 漏斗、设计原则与 test-strategy 规范、plan 双形态内核。

**Spec**：`.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md`

**架构**：全部增强做在插件自有层（vendored 文件只经 normalize 通道改写）；新增 2 个 vendored/authored skill、1 个诊断命令、2 份 manifest；plan 双形态经阈值门控落在 writing-plans/executing-plans 的新增 references；行为断言靠各 skill evals + rg 结构断言 + `scripts/tests/` 下的 node:test。

**技术栈**：Node.js ≥18（node:test、node --test）、git subtree、esbuild（一次性转译）、bash、markdown skill 文本。

## 全局约束

- 版本号四处同步：`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`（metadata.version）、`.codex-plugin/plugin.json`、新增根级 `plugin.json` 与 `package.json`（任务 6 起纳入 check-plugin 校验）
- vendored 目录（`skills/anysearch/`、`skills/sequential-thinking/` 的上游文件）不得手改 SKILL.md——一切持久适配走 `update-vendored-skill.mjs` 的 normalize / 本地适配文件（openai.yaml、think.mjs、NOTICE）
- 双语同步：README.md 与 README.zh-CN.md 同步改；SKILL.md description 与 agents/openai.yaml short_description 同步（check-openai-sync 拦截）
- 根级 plugin.json 必填 `$schema` 与 `name`（Agent plugins 1.0.0）
- plan 双形态阈值参数：预估任务数 >8 或正文 >25KB（写入 references 的数值与 spec 逐字一致）
- 任何运行时/工具缺失只允许降级、不允许中断工作流（sequential-thinking 降级链、anysearch 降级链）
- 所有落盘文本跟随对话语言（中文），结构标签保持英文
- 每次 commit 会触发 pre-commit（check-plugin + validate-skills + check-openai-sync）与 post-commit 自动发版——新增 skill 的 SKILL.md 与 openai.yaml 必须在同一提交内齐备

## 相关测试范围

项目无测试影响分析工具（package.json 不存在，脚本为独立 .mjs）。按 spec covers 推导：

- `node --test scripts/tests/`（本计划新建的测试目录；任务 2 起存在）
- `node scripts/validate-skills.mjs`
- `node scripts/check-openai-sync.mjs`
- `node scripts/check-plugin.mjs`

任务 0 基线验证运行上述后三条（首次执行时 `scripts/tests/` 尚不存在，跳过第一条并注明）。

---

### 任务 0：建立隔离工作区

- [ ] **步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，跳过本任务。

- [ ] **步骤 2：建立 worktree**

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用（Codex 无原生 worktree 工具，直接走下面的手工路径）；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/plan-2026-08-26-01-major-upgrade -b plan/2026-08-26-01-major-upgrade` 并切换到该目录。

- [ ] **步骤 3：安装依赖并验证基线**

本仓库无依赖清单（纯 Node 脚本 + markdown），跳过安装。按计划头部「相关测试范围」运行基线验证：

```bash
node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs && node scripts/check-plugin.mjs
```

预期：三者全部通过（`scripts/tests/` 尚不存在，第一条声明跳过并注明）。基线失败 → 停下报告，先问再继续。

## 组一：vendored 推理与同步基建（M8）

### 任务 1：vendor sequential-thinking skill

**文件**：
- 创建：`skills/sequential-thinking/SKILL.md`、`skills/sequential-thinking/references/example-session.md`、`skills/sequential-thinking/scripts/think.ts`、`skills/sequential-thinking/LICENSE`、`skills/sequential-thinking/NOTICE`、`skills/sequential-thinking/agents/openai.yaml`、`skills/sequential-thinking/evals/evals.json`
- 修改：`.claude-plugin/marketplace.json:29`（skills 数组追加）

**接口**：
- 消费：无（首任务）
- 产出：`skills/sequential-thinking/` 目录（后续任务 2/3/4 依赖其存在）；frontmatter `metadata.upstream`/`metadata.upstream-tag`（任务 3 的 readPinnedRef 消费）；marketplace 注册项 `./skills/sequential-thinking`

- [ ] **步骤 1：写失败断言**

```bash
test -f skills/sequential-thinking/SKILL.md && echo EXISTS || echo MISSING
```

运行预期：`MISSING`（红）。

- [ ] **步骤 2：抓取上游快照（pin SHA）**

```bash
SHA=$(git ls-remote https://github.com/thedotmack/sequential-thinking-skill.git HEAD | cut -f1)
echo "PINNED_SHA=$SHA"
mkdir -p /tmp/st-vendor && curl -sL "https://github.com/thedotmack/sequential-thinking-skill/archive/${SHA}.tar.gz" | tar xz -C /tmp/st-vendor --strip-components=1
mkdir -p skills/sequential-thinking
cp -R /tmp/st-vendor/sequential-thinking/. skills/sequential-thinking/
cp /tmp/st-vendor/LICENSE skills/sequential-thinking/LICENSE
rm -rf /tmp/st-vendor
```

预期：`skills/sequential-thinking/` 下有 SKILL.md、references/example-session.md、scripts/think.ts。

- [ ] **步骤 3：写本地适配文件（上游没有，永不冲突）**

创建 `skills/sequential-thinking/NOTICE`：

```text
This directory vendors https://github.com/thedotmack/sequential-thinking-skill
(MIT License, see LICENSE). Pinned to the commit recorded in SKILL.md
frontmatter metadata.upstream-tag. Local adaptations: SKILL.md frontmatter
normalization, agents/openai.yaml, scripts/think.mjs (Node port), NOTICE.
Sync via: node scripts/update-vendored-skill.mjs --skill sequential-thinking
```

创建 `skills/sequential-thinking/agents/openai.yaml`：

```yaml
interface:
  display_name: Sequential Thinking
  short_description: Structured reasoning with branching, revision and persistent state — no MCP required. / 结构化推理：分支、修订、持久状态，无需 MCP。
  default_prompt: $sequential-thinking
  allow_implicit_invocation: true
```

创建 `skills/sequential-thinking/evals/evals.json`：

```json
{
  "skill": "sequential-thinking",
  "cases": [
    {
      "id": "st-degrade-no-runtime",
      "input": "环境无 bun/tsx/node，requirement-analysis 阶段 4 需要对承重信息做对抗验证",
      "expected_output": "不中断流程：在回复中显式分点推演（信息质询 → 冲突消解 → 方案对比）完成对抗验证，并注明工具降级原因"
    },
    {
      "id": "st-node-port-preferred",
      "input": "环境有 node 无 bun/tsx，需要记录一轮带修订的思考",
      "expected_output": "使用 scripts/think.mjs 端口执行，行为与上游 think.ts 一致；不因缺少 TS 运行时报错退出"
    }
  ]
}
```

- [ ] **步骤 4：手动首次 frontmatter 规范化并注册**

编辑 `skills/sequential-thinking/SKILL.md` frontmatter：保留上游 `name`/`description`，追加（任务 3 的 normalize 之后接管此形态，本次手动等价）：

```yaml
license: MIT
metadata:
  upstream: https://github.com/thedotmack/sequential-thinking-skill
  upstream-tag: <步骤 2 输出的 PINNED_SHA>
```

`.claude-plugin/marketplace.json` skills 数组末尾（`"./skills/anysearch"` 之后）追加一行：

```json
        "./skills/sequential-thinking"
```

- [ ] **步骤 5：运行断言确认通过并提交**

```bash
test -f skills/sequential-thinking/SKILL.md && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs
git add skills/sequential-thinking .claude-plugin/marketplace.json
git commit -m "feat(T1): vendor sequential-thinking skill（SHA 快照 + 本地适配 + 注册）"
```

预期：断言 EXISTS，两个校验通过（validate-skills 现在扫描 12 个 skill）。

### 任务 2：think.mjs 零依赖 Node 端口

**文件**：
- 创建：`skills/sequential-thinking/scripts/think.mjs`、`scripts/tests/think-port.test.mjs`

**接口**：
- 消费：任务 1 的 `scripts/think.ts`
- 产出：`skills/sequential-thinking/scripts/think.mjs`（CLI 入参与状态文件格式与 think.ts 完全一致；任务 7 doctor 的运行时链检测消费其存在性）

- [ ] **步骤 1：写失败测试**

创建 `scripts/tests/think-port.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = path.join(repoRoot, "skills/sequential-thinking/scripts/think.mjs");

test("think.mjs 端口存在", () => {
  assert.ok(existsSync(port), "think.mjs missing");
});

test("think.mjs 与 think.ts 同输入同输出（无 TS 运行时环境）", () => {
  const out = execFileSync("node", [port, "--help"], { encoding: "utf8" });
  assert.match(out, /thought/i, "help 输出应包含 thought 用法（与上游一致）");
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test scripts/tests/think-port.test.mjs`
预期：FAIL（think.mjs missing）。

- [ ] **步骤 3：最小实现（esbuild 一次性转译，不手写端口）**

```bash
npx -y esbuild skills/sequential-thinking/scripts/think.ts \
  --platform=node --format=esm \
  --outfile=skills/sequential-thinking/scripts/think.mjs
head -1 skills/sequential-thinking/scripts/think.mjs | grep -q '^#!' || \
  sed -i '' '1i\
#!/usr/bin/env node
' skills/sequential-thinking/scripts/think.mjs
chmod +x skills/sequential-thinking/scripts/think.mjs
```

若 think.ts 顶部有 `#!/usr/bin/env bun` 类 shebang 被 esbuild 保留为注释导致首行非 shebang，按上式补 node shebang。若 `--help` 不是上游支持的旗标（以 think.ts 实际 CLI 为准），把测试步骤 1 的调用与断言改为上游 README 声明的最小调用形态并在提交信息注明（小偏差）。

- [ ] **步骤 4：运行测试确认通过**

运行：`node --test scripts/tests/think-port.test.mjs`
预期：PASS ×2。

- [ ] **步骤 5：提交**

```bash
git add skills/sequential-thinking/scripts/think.mjs scripts/tests/think-port.test.mjs
git commit -m "feat(T2): think.mjs 零依赖 Node 端口（esbuild 转译 + parity 测试）"
```

### 任务 3：update-anysearch.mjs 泛化为 update-vendored-skill.mjs

**文件**：
- 创建：`scripts/update-vendored-skill.mjs`、`scripts/tests/update-vendored.test.mjs`
- 删除：`scripts/update-anysearch.mjs`（原则：删过时路径，不留转发垫片）
- 修改：`README.md`、`README.zh-CN.md` 中出现的 `update-anysearch.mjs` 引用（rg 定位逐处替换为新命令）

**接口**：
- 消费：任务 1 的 `metadata.upstream-tag`（SHA pin）；既有 `skills/anysearch/SKILL.md` frontmatter
- 产出：CLI `node scripts/update-vendored-skill.mjs --skill <anysearch|sequential-thinking> [--check|--tag vX.Y.Z|--sha <sha>|--normalize]`；导出函数 `normalizeFrontmatter(cfg, ref)`（任务 11 的 description 增强断言依赖其行为）

- [ ] **步骤 1：写失败测试**

创建 `scripts/tests/update-vendored.test.mjs`：

```js
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

test("旧脚本已删除（不留兼容垫片）", () => {
  assert.ok(!existsSync(path.join(repoRoot, "scripts/update-anysearch.mjs")));
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test scripts/tests/update-vendored.test.mjs`
预期：FAIL（script 不存在）。

- [ ] **步骤 3：实现**

`git mv scripts/update-anysearch.mjs scripts/update-vendored-skill.mjs`，然后按下述改造（原文件行号基于改名前）：

(a) 顶部常量（原 :24-30）替换为配置表：

```js
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIGS = {
  anysearch: {
    mode: "subtree",                       // tag-pinned git subtree
    upstream: "https://github.com/anysearch-ai/anysearch-skill.git",
    prefix: "skills/anysearch",
    licenseDefault: "Apache-2.0",
    refRe: /^v\d+\.\d+\.\d+$/,
    // 增强 description：normalize 每次重建，upstream 同步后自动重放
    enhancedDescription:
      "Real-time web search, vertical domain search, parallel batch search, and URL content extraction via bundled CLI (no MCP). Use when you need to search the web, look up library/framework docs or current best practices, verify time-sensitive facts, batch-research multiple topics, or extract page content. Preferred first-choice search tool; fall back to WebSearch/WebFetch only when unavailable. / 实时网页搜索、垂直领域检索、并行批量检索与 URL 正文抽取（内置 CLI、无需 MCP）。当需要联网搜索、查库/框架文档与最新实践、核实时效信息、多主题批量调研或抽取网页正文时使用；搜索首选入口，不可用时才降级 WebSearch/WebFetch。",
  },
  "sequential-thinking": {
    mode: "snapshot",                      // SHA-pinned subdir snapshot
    upstream: "https://github.com/thedotmack/sequential-thinking-skill.git",
    upstreamSubdir: "sequential-thinking", // 上游仓库中 skill 所在子目录
    prefix: "skills/sequential-thinking",
    licenseDefault: "MIT",
    refRe: /^[0-9a-f]{7,40}$/,
    localFiles: ["agents/openai.yaml", "scripts/think.mjs", "NOTICE", "evals/evals.json"],
    enhancedDescription: null,             // 上游 description 保留原文
  },
};
const cfg = CONFIGS[skillArg];             // --skill 解析，未知值退出码 2 并列出可选项
const SKILL_MD = path.join(repoRoot, cfg.prefix, "SKILL.md");
```

(b) `--skill` 旗标解析加入现有 flags 白名单（原 :38），新增 `--sha <sha>`（snapshot 模式的 pin 更新）；`--tag` 仅 subtree 模式合法、`--sha` 仅 snapshot 模式合法，用错时报错退出码 2。

(c) `normalizeFrontmatter`（原 :216-259）三处参数化：`license: Apache-2.0` 硬编码（原 :248）→ `cfg.licenseDefault`；`UPSTREAM`（原 :251）→ `cfg.upstream`；在 `ordered` 组装前加 description 覆写——

```js
if (cfg.enhancedDescription) {
  const desc = keep.find((b) => b.key === "description");
  const enhanced = [`description: >-`, `  ${cfg.enhancedDescription}`];
  if (desc) desc.lines = enhanced;
  else keep.push({ key: "description", lines: enhanced });
}
```

(d) 新增 snapshot 同步分支（main() 中 `cfg.mode === "snapshot"` 时替代 subtree pull）：

```js
function snapshotSync(targetSha) {
  if (run("git", ["status", "--porcelain"]).trim() !== "") {
    throw new Error("工作区不干净：快照同步前请先提交或暂存当前改动。");
  }
  const tmp = mkdtempSync(path.join(tmpdir(), "vendored-"));
  try {
    run("bash", ["-c",
      `curl -sL ${cfg.upstream.replace(/\.git$/, "")}/archive/${targetSha}.tar.gz | tar xz -C ${tmp} --strip-components=1`]);
    // 覆盖上游文件，保留本地适配文件
    run("bash", ["-c", `cp -R ${tmp}/${cfg.upstreamSubdir}/. ${path.join(repoRoot, cfg.prefix)}/`]);
    run("bash", ["-c", `cp ${tmp}/LICENSE ${path.join(repoRoot, cfg.prefix)}/LICENSE`]);
    for (const f of cfg.localFiles) {
      // 本地适配文件不在上游子目录中，cp -R 不会触碰；此处仅断言仍存在
      if (!existsSync(path.join(repoRoot, cfg.prefix, f))) {
        throw new Error(`本地适配文件丢失：${cfg.prefix}/${f}`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  normalizeFrontmatter(targetSha);
}
```

（import 补 `mkdtempSync, rmSync, existsSync` 与 `tmpdir`。）

(e) `latestStableTag`（原 :188-201）在 snapshot 模式改为 `git ls-remote <upstream> HEAD | cut -f1` 取远端 HEAD SHA；`--check` 比较 pinned SHA 与远端 HEAD，不同则退出码 1。`readCurrentTag`（原 :174-181）改名 `readPinnedRef`，逻辑不变（`upstream-tag` 键沿用，语义为"pinned ref"）。

(f) usage 文案（原 :299-307）更新为新 CLI 形态。README 双语中 `update-anysearch.mjs` 引用逐处替换为 `update-vendored-skill.mjs --skill anysearch`。

- [ ] **步骤 4：运行测试确认通过**

运行：`node --test scripts/tests/update-vendored.test.mjs`
预期：PASS ×4。另跑 `node scripts/update-vendored-skill.mjs --skill anysearch --check`（预期：输出当前/目标 tag，退出码视上游而定，仅确认不抛异常）。

- [ ] **步骤 5：提交**

```bash
git add scripts/update-vendored-skill.mjs scripts/tests/update-vendored.test.mjs README.md README.zh-CN.md skills/anysearch/SKILL.md skills/anysearch/agents/openai.yaml skills/sequential-thinking/SKILL.md
git commit -m "feat(T3): vendored skill 统一同步脚本（双模式 + normalize 增强注入），删除旧入口"
```

注：normalize 注入增强 description 后，anysearch 的 `agents/openai.yaml` short_description 需按增强版同步（同一提交，过 check-openai-sync）。

### 任务 4：结构化推理消费点改写（六处）

**文件**：
- 修改：`skills/requirement-analysis/SKILL.md:31,106,152`、`skills/exploring/SKILL.md:74`、`skills/quick-fix/SKILL.md:103`、`skills/clarifying/SKILL.md:61`、`skills/requirement-analysis/references/codex-compat.md:69`、`skills/requirement-analysis/evals/evals.json:12`

**接口**：
- 消费：任务 1 的 skill 名 `sequential-thinking`
- 产出：全仓（除 vendored 目录、CHANGELOG、.spec-dev）不再出现 `mcp__sequential-thinking__sequentialthinking`（任务 5 的零残留断言消费）

- [ ] **步骤 1：写失败断言**

```bash
rg -l 'mcp__sequential-thinking__sequentialthinking' skills/ --glob '!skills/anysearch/**' --glob '!skills/sequential-thinking/**' | wc -l
```

预期：`5`（红：五个文件仍引用 MCP 工具名）。

- [ ] **步骤 2：逐处改写**

| 文件:行 | 原文（定位串） | 改为 |
|---|---|---|
| requirement-analysis/SKILL.md:106 | `用 \`mcp__sequential-thinking__sequentialthinking\` 分解` | `用 sequential-thinking skill（插件内嵌）分解` |
| requirement-analysis/SKILL.md:152 | `用 \`mcp__sequential-thinking__sequentialthinking\` 结构化推进；该 MCP 不可用时降级为在回复中显式分点推演` | `用 sequential-thinking skill（插件内嵌，bun/tsx → scripts/think.mjs Node 端口自动降级）结构化推进；该 skill 及其运行时均不可用时降级为在回复中显式分点推演` |
| requirement-analysis/SKILL.md:31 | `sequential-thinking 校验信息后` | 不改（已是 skill 名语义） |
| exploring/SKILL.md:74 | `可用 \`mcp__sequential-thinking__sequentialthinking\`（不可用则直接在回复中分点推演）` | `可用 sequential-thinking skill（插件内嵌；不可用则直接在回复中分点推演）` |
| quick-fix/SKILL.md:103 | `sequential-thinking MCP 不可用时降级为回复中分点推演` | `sequential-thinking skill（插件内嵌）不可用时降级为回复中分点推演` |
| clarifying/SKILL.md:61 | `深度推演无 \`mcp__sequential-thinking__sequentialthinking\` 时降级为回复内分点推演` | `深度推演无 sequential-thinking skill（插件内嵌）时降级为回复内分点推演` |
| codex-compat.md:69 | `\`mcp__sequential-thinking__sequentialthinking\` 在 Codex 下同样通过插件 MCP 配置提供；不可用时降级为…` | `sequential-thinking skill 在 Codex 下经插件 skill 发现提供（openai.yaml 已启用隐式调用）；skill 与运行时均不可用时降级为在回复中显式分点推演（信息质询 → 冲突消解 → 方案对比），不得因工具缺失跳过分析。` |
| requirement-analysis/evals/evals.json:12 | `主线程用 sequential-thinking 先对承重信息做对抗验证` | 不改（已是 skill 名语义） |

- [ ] **步骤 3：运行断言确认通过**

```bash
rg -l 'mcp__sequential-thinking__sequentialthinking' skills/ --glob '!skills/anysearch/**' --glob '!skills/sequential-thinking/**' | wc -l
```

预期：`0`。再跑 `node scripts/validate-skills.mjs`（预期通过）。

- [ ] **步骤 4：提交**

```bash
git add skills/
git commit -m "feat(T4): 结构化推理消费点改写为内嵌 sequential-thinking skill（降级语义不变）"
```

### 任务 5：MCP 清零（配置删除 + README + check-mcp 退役）

**文件**：
- 删除：`.mcp.json`、`commands/check-mcp.md`
- 修改：`.codex-plugin/plugin.json`（删 mcpServers 键）、`README.md:21,76,205-220`、`README.zh-CN.md:21,76,205-220`、`skills/acceptance-qa/references/mcp-setup.md`（改写为 opt-in 指引开头段）

**接口**：
- 消费：任务 4 完成的消费点改写（本任务的零残留断言覆盖全仓）
- 产出：插件零 MCP 分发状态（任务 7 doctor 的检测语义、验收任务的 rg 零命中行消费）

- [ ] **步骤 1：写失败断言**

```bash
test ! -f .mcp.json && test ! -f commands/check-mcp.md && ! rg -q '"mcpServers"' .codex-plugin/plugin.json && echo CLEAN || echo DIRTY
```

预期：`DIRTY`（红）。

- [ ] **步骤 2：执行清零**

```bash
git rm .mcp.json commands/check-mcp.md
```

`.codex-plugin/plugin.json`：整块删除 `"mcpServers": { ... }` 键（保留 `"skills"` 等其余键，注意去掉悬挂逗号）。

README.md 与 README.zh-CN.md 同步改三处：
1. `:21` 的 "MCP enhancements — integrates sequential-thinking, playwright, chrome-devtools (optional, graceful degradation)" 行改为：`**Zero MCP dependency** — structured reasoning ships as a bundled skill (sequential-thinking, vendored); browser automation MCPs (playwright / chrome-devtools) are opt-in per project, see skills/acceptance-qa/references/mcp-setup.md / **零 MCP 依赖** — 结构化推理以内嵌 skill 提供（sequential-thinking, vendored）；浏览器自动化 MCP（playwright / chrome-devtools）按项目自配，见 acceptance-qa 的 mcp-setup.md`
2. `:76` Codex manifests 句中删去 "optional MCP config (sequential-thinking, playwright, chrome-devtools)" 字样，改为 "plugin UI metadata"。
3. `:205-220` 的 MCP 表与 `.mcp.json` 安装示例块整段删除，替换为两行：降级表只保留 `sequential-thinking（内嵌 skill）| 回复中显式分点推演` 一行 + 一句 "Browser automation (Tier A acceptance) requires user-configured MCPs, see mcp-setup.md / 浏览器自动化验收（Tier A）需用户自配 MCP，见 mcp-setup.md"。

`skills/acceptance-qa/references/mcp-setup.md` 开头（标题后第一段前）插入：

```markdown
> **Opt-in since MCP-zero / MCP 清零后的按需自配**：spec-dev 插件自身不再分发任何 MCP 配置。
> 需要 Tier A 浏览器自动化（playwright / chrome-devtools）时按本文在项目级自行配置；
> 未配置时 acceptance-qa 自动降级到 Tier D 工具链（Playwright CLI 等），语义不变。
```

- [ ] **步骤 3：运行断言确认通过（全仓零残留）**

```bash
test ! -f .mcp.json && test ! -f commands/check-mcp.md && ! rg -q '"mcpServers"' .codex-plugin/plugin.json && echo CLEAN
rg -n 'mcp__sequential-thinking|@modelcontextprotocol/server-sequential-thinking' --glob '!CHANGELOG.md' --glob '!.spec-dev/**' --glob '!skills/anysearch/**' --glob '!skills/sequential-thinking/**' . | wc -l
```

预期：`CLEAN` 且残留计数 `0`。`node scripts/check-plugin.mjs` 通过（若其校验 .mcp.json 存在性则按报错修正其清单，属本任务范围）。

- [ ] **步骤 4：提交**

```bash
git add -A
git commit -m "feat(T5): MCP 清零——删 .mcp.json/check-mcp，Codex manifest 与双语 README 同步，mcp-setup 转 opt-in"
```

## 组二：平台清单与诊断（M1/M2）

### 任务 6：根级 plugin.json（AP 1.0.0）+ package.json（pi）+ 版本同步扩展

**文件**：
- 创建：`plugin.json`（根级）、`package.json`（根级）、`scripts/tests/manifests.test.mjs`
- 修改：`scripts/check-plugin.mjs`（版本同步清单扩为五处）、`README.md` 与 `README.zh-CN.md`（新增"平台矩阵"小节）

**接口**：
- 消费：`.claude-plugin/plugin.json` 现有 name/version/description
- 产出：根级 `plugin.json`（含 `$schema`、`name`、`version`、`skills`）、`package.json`（含 `pi.skills`）；check-plugin 的五处版本一致性校验（release.mjs 自动发版链路消费）

- [ ] **步骤 1：写失败测试**

创建 `scripts/tests/manifests.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (p) => JSON.parse(readFileSync(path.join(repoRoot, p), "utf8"));

test("根级 plugin.json 符合 Agent plugins 1.0.0 必填项", () => {
  const m = readJson("plugin.json");
  assert.ok(typeof m.$schema === "string" && m.$schema.length > 0, "$schema 必填");
  assert.equal(m.name, "spec-dev");
});

test("package.json 声明 pi.skills 指向 skills/", () => {
  const p = readJson("package.json");
  assert.deepEqual(p.pi.skills, ["./skills"]);
});

test("五处版本号一致", () => {
  const versions = [
    readJson(".claude-plugin/plugin.json").version,
    readJson(".claude-plugin/marketplace.json").metadata.version,
    readJson(".codex-plugin/plugin.json").version,
    readJson("plugin.json").version,
    readJson("package.json").version,
  ];
  assert.equal(new Set(versions).size, 1, `版本不一致: ${versions.join(", ")}`);
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test scripts/tests/manifests.test.mjs`
预期：FAIL（根级 plugin.json 不存在）。

- [ ] **步骤 3：实现**

创建根级 `plugin.json`（`<当前版本>` 取 `.claude-plugin/plugin.json` 的 version 现值）：

```json
{
  "$schema": "https://agent-plugins.org/schema/1.0.0/plugin.json",
  "name": "spec-dev",
  "version": "<当前版本>",
  "description": "Bilingual design-plan-execute skill pipeline with all-round acceptance / 中英双语设计→计划→执行 skill 管线与全能验收",
  "license": "MIT",
  "homepage": "https://github.com/FlameMida/spec-dev",
  "skills": "./skills"
}
```

落盘后运行 `curl -sL https://agent-plugins.org/schema/1.0.0/plugin.json -o /tmp/ap-schema.json && node scripts/validate-output.mjs`——validate-output 只接受 scripts/schemas 下的 schema，故改为：把下载的官方 schema 存为 `scripts/schemas/agent-plugin-1.0.0.json`（入库），校验命令 `node scripts/validate-output.mjs agent-plugin-1.0.0 plugin.json`。官方 schema 与上述字段冲突时**以 schema 为准**修正字段并在提交信息注明（spec 已声明此裁决规则）；离线环境下载失败 → 保留上述字段形态，schema 校验挪入验收任务并注明。

创建根级 `package.json`：

```json
{
  "name": "@flamemida/spec-dev",
  "version": "<当前版本>",
  "description": "spec-dev skill suite — pi distribution manifest / pi 平台分发清单",
  "license": "MIT",
  "repository": { "type": "git", "url": "https://github.com/FlameMida/spec-dev.git" },
  "pi": { "skills": ["./skills"] }
}
```

`scripts/check-plugin.mjs`：定位其现有"三处版本同步"校验数组（rg `marketplace` 定位），追加根级 `plugin.json` 与 `package.json` 两个条目（读取方式同现有条目）。`scripts/release.mjs`：定位版本回写清单，追加同两处（保证自动发版继续五处同步）。

README 双语各加「Platform matrix / 平台矩阵」小节（安装章节之后）：

```markdown
| Platform | Skills | Agents (subagents) | Hooks | Manifest |
|---|---|---|---|---|
| Claude Code | ✅ marketplace | ✅ agents/*.md | ✅ guardrail install | .claude-plugin/ |
| Codex | ✅ auto-discovery | ⚠️ via dispatch prompts（spawn_agent 不读 agents/*.md） | ✅ codex-hooks | .codex-plugin/ |
| Grok Build | ✅ zero-config Claude-compat（官方声明） | ✅ 同 Claude Code（字段生效见验收走查） | ✅ 同 Claude Code | 复用 .claude-plugin/ |
| Pi (pi.dev) | ✅ package.json `pi.skills` | ⚠️ 需 pi-subagents 扩展 | ❌ 需 TS extension（不适配） | package.json |
| Agent plugins 1.0.0 | ✅ 根级 plugin.json + skills/ | —（不在标准便携范围） | —（同左） | plugin.json |
```

- [ ] **步骤 4：运行测试确认通过**

运行：`node --test scripts/tests/manifests.test.mjs && node scripts/check-plugin.mjs`
预期：PASS ×3 + check-plugin 通过（五处同步）。

- [ ] **步骤 5：提交**

```bash
git add plugin.json package.json scripts/ README.md README.zh-CN.md
git commit -m "feat(T6): 根级 AP 1.0.0 manifest 与 pi 分发清单，版本同步扩为五处，README 平台矩阵"
```

### 任务 7：doctor 诊断命令

**文件**：
- 创建：`scripts/doctor.mjs`、`commands/doctor.md`、`scripts/tests/doctor.test.mjs`

**接口**：
- 消费：任务 2 的 `think.mjs` 路径、任务 5 的零 MCP 状态、guardrail 既有文件（`.githooks/`、`guardrail/templates/*.snippet`、`scripts/spec-dev/check-spec-drift.mjs` 装机产物）
- 产出：CLI `node scripts/doctor.mjs [--json]`，六节输出（platform/guardrail/markers/hooks/anysearch/sequential-thinking），退出码 0=健康或仅提示、1=有需修复项；`--json` 输出机器可读结构（验收任务消费）

- [ ] **步骤 1：写失败测试**

创建 `scripts/tests/doctor.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doctor = path.join(repoRoot, "scripts/doctor.mjs");
const runIn = (cwd) => {
  try {
    return { out: execFileSync("node", [doctor, "--json"], { cwd, encoding: "utf8" }), code: 0 };
  } catch (e) {
    return { out: e.stdout ?? "", code: e.status ?? 1 };
  }
};

test("Scenario: 未安装 guardrail 的项目——明确判定与安装指引", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "doctor-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const { out } = runIn(dir);
    const r = JSON.parse(out);
    assert.equal(r.guardrail.installed, false);
    assert.match(r.guardrail.hint, /guardrail\/install\.mjs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Scenario: anysearch 双副本歧义提示", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "doctor-dup-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    // 伪造独立副本目录，配合环境变量注入探测根（避免动真实 HOME）
    mkdirSync(path.join(dir, "fake-home/.claude/skills/anysearch-skill-main"), { recursive: true });
    const out = execFileSync("node", [doctor, "--json"], {
      cwd: dir, encoding: "utf8", env: { ...process.env, DOCTOR_HOME: path.join(dir, "fake-home") },
    });
    const r = JSON.parse(out);
    assert.equal(r.anysearch.duplicates.length >= 1, true);
    assert.match(r.anysearch.hint, /独立副本|standalone/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sequential-thinking 运行时链探测有三态", () => {
  const { out } = runIn(repoRoot);
  const r = JSON.parse(out);
  assert.ok(["ts-runtime", "node-port", "prose-fallback"].includes(r.sequentialThinking.chain));
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test scripts/tests/doctor.test.mjs`
预期：FAIL（doctor.mjs 不存在）。

- [ ] **步骤 3：实现 `scripts/doctor.mjs`**

```js
#!/usr/bin/env node
// spec-dev doctor：平台 / guardrail / 注入标记 / hooks / anysearch / sequential-thinking 六域健康诊断。
// 用法：node scripts/doctor.mjs [--json]   退出码：0 健康或仅提示；1 存在需修复项。
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = process.env.DOCTOR_HOME || homedir();
const cwd = process.cwd();
const json = process.argv.includes("--json");
const report = {};
let needsFix = false;

const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", cwd, ...opts });
  return r.status === 0 ? r.stdout.trim() : null;
};

// 1. platform
report.platform = {
  claudeCode: existsSync(path.join(HOME, ".claude")),
  codex: existsSync(path.join(HOME, ".codex")),
  grok: existsSync(path.join(HOME, ".grok")),
  pi: existsSync(path.join(HOME, ".pi")),
};

// 2. guardrail 安装状态（针对 cwd 项目）
const gitRoot = sh("git", ["rev-parse", "--show-toplevel"]);
const guardScript = gitRoot && path.join(gitRoot, "scripts/spec-dev/check-spec-drift.mjs");
const hooksPath = gitRoot ? (sh("git", ["config", "--get", "core.hooksPath"]) ?? "") : "";
const installed = Boolean(gitRoot && guardScript && existsSync(guardScript));
report.guardrail = {
  gitRepo: Boolean(gitRoot),
  installed,
  hooksPathEnabled: hooksPath.replace(/^\.\//, "").replace(/\/+$/, "") === ".githooks",
  hint: installed ? "" : "未安装：在项目内运行 node <spec-dev 插件目录>/guardrail/install.mjs 完成安装（写入 CLAUDE.md/AGENTS.md 标记块并挂 SessionStart hook）。",
};
if (gitRoot && !installed) needsFix = true;

// 3. 注入标记块完整性（BEGIN/END 成对）
const markerState = (file) => {
  if (!gitRoot) return "n/a";
  const p = path.join(gitRoot, file);
  if (!existsSync(p)) return "missing";
  const text = readFileSync(p, "utf8");
  const begin = /<!-- spec-dev:begin -->/.test(text);
  const end = /<!-- spec-dev:end -->/.test(text);
  return begin && end ? "ok" : begin || end ? "broken" : "absent";
};
report.markers = { "CLAUDE.md": markerState("CLAUDE.md"), "AGENTS.md": markerState("AGENTS.md") };
if (Object.values(report.markers).includes("broken")) needsFix = true;

// 4. 会话注入决策回放（重放 session-context --explain，同输入同决策）
const explain = spawnSync("node", [path.join(pluginRoot, "guardrail/session-context.mjs"), "--explain"], {
  cwd, encoding: "utf8",
});
report.injection = { lastDecision: (explain.stdout || explain.stderr || "").trim() || "（无输出）" };

// 5. anysearch：可用性 / 双副本 / 版本
const embedded = path.join(pluginRoot, "skills/anysearch");
const duplicates = [];
for (const base of [".claude/skills", ".codex/skills"]) {
  const p = path.join(HOME, base);
  if (!existsSync(p)) continue;
  for (const d of readdirSync(p)) if (/anysearch/i.test(d)) duplicates.push(path.join(p, d));
}
report.anysearch = {
  embedded: existsSync(path.join(embedded, "SKILL.md")),
  duplicates,
  hint: duplicates.length
    ? "检测到插件内嵌版之外的独立副本（standalone），两者 description 相近会造成 skill 选择歧义；建议移除独立副本或知悉取舍。"
    : "",
};

// 6. sequential-thinking 运行时链
const has = (cmd) => spawnSync(cmd, ["--version"], { encoding: "utf8" }).status === 0;
const tsRuntime = has("bun") || spawnSync("npx", ["-y", "tsx", "--version"], { encoding: "utf8" }).status === 0;
const nodePort = existsSync(path.join(pluginRoot, "skills/sequential-thinking/scripts/think.mjs"));
report.sequentialThinking = {
  chain: tsRuntime ? "ts-runtime" : nodePort ? "node-port" : "prose-fallback",
  hint: tsRuntime || nodePort ? "" : "无可用运行时：工作流将降级为回复内分点推演（不中断）。",
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const [k, v] of Object.entries(report)) {
    console.log(`\n== ${k} ==`);
    for (const [kk, vv] of Object.entries(v)) console.log(`  ${kk}: ${typeof vv === "object" ? JSON.stringify(vv) : vv}`);
  }
}
process.exit(needsFix ? 1 : 0);
```

标记块正则 `<!-- spec-dev:begin/end -->` 若与 `guardrail/install.mjs` 实际写入的标记字面量不同（rg `begin` guardrail/install.mjs 核对），以 install.mjs 的字面量为准修正 doctor（小偏差就地修正）。

创建 `commands/doctor.md`：

```markdown
---
description: Diagnose spec-dev health — platform, guardrail install, injection markers, hooks, anysearch, sequential-thinking runtime / 诊断 spec-dev 健康态：平台、guardrail 安装、注入标记、hooks、anysearch、sequential-thinking 运行时
---

运行 `node ${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs` 并把输出原样呈现给用户，逐项解释 ✗ 的修复指引；
用户要求机器可读输出时加 `--json`。退出码 1 表示存在需修复项——引导用户按 hint 逐项修复后复跑。
```

- [ ] **步骤 4：运行测试确认通过**

运行：`node --test scripts/tests/doctor.test.mjs`
预期：PASS ×3（第二个测试依赖 `--explain`，在任务 8 前呈现"（无输出）"分支即可通过 lastDecision 断言不存在的情况——本测试不断言 injection 节，允许任务顺序）。

- [ ] **步骤 5：提交**

```bash
git add scripts/doctor.mjs commands/doctor.md scripts/tests/doctor.test.mjs
git commit -m "feat(T7): doctor 六域诊断命令（含双副本与运行时链探测）"
```

### 任务 8：注入链去静默（--explain 重放模式）

**文件**：
- 修改：`guardrail/session-context.mjs`（全部静默退出分支）、`guardrail/install.mjs`（跳过分支补打印）
- 创建：`scripts/tests/session-explain.test.mjs`

**接口**：
- 消费：任务 7 doctor 的 `--explain` 调用约定
- 产出：`node guardrail/session-context.mjs --explain` 在任何环境输出一行 `decision: <inject|skip> reason: <原因>` 后退出 0

- [ ] **步骤 1：写失败测试**

创建 `scripts/tests/session-explain.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "guardrail/session-context.mjs");

test("Scenario: 非 git 目录的静默跳过去静默化", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nogit-"));
  try {
    const out = execFileSync("node", [script, "--explain"], { cwd: dir, encoding: "utf8" });
    assert.match(out, /decision: skip/);
    assert.match(out, /非 git 仓库|not a git repo/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("git 仓库但无 spec 时给出跳过原因", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "nospec-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const out = execFileSync("node", [script, "--explain"], { cwd: dir, encoding: "utf8" });
    assert.match(out, /decision: skip/);
    assert.match(out, /无已跟踪 spec|no tracked spec/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("默认模式行为不变（非 git 静默退出 0 且零输出）", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "silent-"));
  try {
    const out = execFileSync("node", [script], { cwd: dir, encoding: "utf8" });
    assert.equal(out, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test scripts/tests/session-explain.test.mjs`
预期：前两个 FAIL（--explain 未实现，非 git 下无输出）。

- [ ] **步骤 3：实现**

`guardrail/session-context.mjs` 顶部加：

```js
const EXPLAIN = process.argv.includes("--explain");
const decide = (decision, reason) => {
  if (EXPLAIN) console.log(`decision: ${decision} reason: ${reason}`);
  process.exit(0);
};
```

逐分支替换静默退出（保持默认模式零输出语义）：
- `:27-30` catch 分支 `process.exit(0)` → `decide("skip", "非 git 仓库 / not a git repo")`
- `:32` `if (specs.length === 0) process.exit(0)` → `if (specs.length === 0) decide("skip", "无已跟踪 spec / no tracked spec under .spec-dev|docs|.specs")`
- 文件末尾正常注入路径：`console.log(...)` 之前加 `if (EXPLAIN) { console.log(\`decision: inject reason: ${specs.length} spec(s), ${statusCount.active} active${issues.length ? ", " + issues.length + " health issue(s)" : ""}\`); process.exit(0); }`

`guardrail/install.mjs`：rg 定位其所有"跳过写入"分支（标记块残缺、文件只读、非 git 等 early-return / continue），每个分支在现有行为不变的前提下补一行 `console.log("skip: <原因>")`（安装是交互过程，打印不属静默污染）。改动保持每分支一行、不改控制流。

- [ ] **步骤 4：运行测试确认通过**

运行：`node --test scripts/tests/session-explain.test.mjs`
预期：PASS ×3。复跑 `node --test scripts/tests/doctor.test.mjs` 确认 doctor 的 injection 节现在能回放决策。

- [ ] **步骤 5：提交**

```bash
git add guardrail/ scripts/tests/session-explain.test.mjs
git commit -m "feat(T8): 注入链去静默——session-context --explain 重放 + install 跳过原因打印"
```

### 任务 9：声明式 SessionStart hook 验证与接线

**文件**：
- 创建：`hooks/hooks.json`（验证可行分支）
- 修改：`.claude-plugin/plugin.json`（hooks 键，若平台 schema 支持）、`commands/doctor.md`（不可行分支的引导文案强化）、`README.md`/`README.zh-CN.md` 安装节

**接口**：
- 消费：任务 8 的 session-context.mjs（hook 目标脚本）
- 产出：二选一的落地状态——(a) 插件声明式 hook（免手动安装即注入）或 (b) doctor 引导安装路径強化；执行记录写明验证结论（验收任务消费）

- [ ] **步骤 1：写验证断言（红）**

```bash
test -f hooks/hooks.json && echo DECLARED || echo NOT-DECLARED
```

预期：`NOT-DECLARED`。

- [ ] **步骤 2：创建声明式 hook 并实测**

创建 `hooks/hooks.json`：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/guardrail/session-context.mjs\"" }
        ]
      }
    ]
  }
}
```

实测：`node scripts/check-plugin.mjs`（官方 Codex CLI 校验不报未知文件即通过打包面）；本机有 Claude Code 时，以本仓库为插件源重装一次，开新会话验证注入文本出现（`[spec-dev workflow notice]` 开头）。

- [ ] **步骤 3：按验证结果二选一收敛**

- **可行**（打包校验通过且会话注入出现）：保留 hooks/hooks.json；README 双语安装节注明"Claude Code / grok 安装插件即自动注入，guardrail install 仅为 git 闸门与 CI 所需"。
- **不可行**（校验拒绝或注入不出现）：`git rm hooks/hooks.json`；在 `commands/doctor.md` 的修复指引段与 README 安装节明确"注入依赖手动 guardrail install"；把验证失败的具体报错记入本任务提交信息。

- [ ] **步骤 4：确认与提交**

```bash
node scripts/check-plugin.mjs && node scripts/validate-skills.mjs
git add -A
git commit -m "feat(T9): 声明式 SessionStart hook 验证——<可行:插件自带注入|不可行:回退 doctor 引导>（结论见正文）"
```

## 组三：anysearch 统一（M3）

### 任务 10：子代理定义修复

**文件**：
- 修改：`agents/code-explorer.md:4`（tools 白名单）、`agents/external-resource-explorer.md:40`（加粗闭合）

**接口**：
- 消费：无
- 产出：code-explorer 可执行 Bash（anysearch CLI 物理可达）

- [ ] **步骤 1：写失败断言**

```bash
rg -q '^tools: .*Bash' agents/code-explorer.md && echo HAS-BASH || echo NO-BASH
```

预期：`NO-BASH`。

- [ ] **步骤 2：修复**

`agents/code-explorer.md:4` 的 tools 行在 `Read,` 后插入 ` Bash,`（终态形如 `tools: LSP, Glob, Grep, LS, Read, Bash, NotebookRead, WebFetch, WebSearch`）。
`agents/external-resource-explorer.md:40`：定位该行未闭合的 `**`（行内只有奇数个 `**`），补齐闭合星号。

- [ ] **步骤 3：确认**

```bash
rg -q '^tools: .*Bash' agents/code-explorer.md && echo HAS-BASH
awk 'NR==40' agents/external-resource-explorer.md | grep -o '\*\*' | wc -l
```

预期：`HAS-BASH`；第二条输出偶数。

- [ ] **步骤 4：提交**

```bash
git add agents/
git commit -m "feat(T10): code-explorer 白名单加 Bash（修 anysearch CLI 物理不可达），external-resource-explorer 排版修复"
```

### 任务 11：全 skill 统一搜索条款

**文件**：
- 修改：`skills/exploring/SKILL.md`、`skills/quick-fix/SKILL.md`、`skills/executing-plans/SKILL.md`、`skills/writing-plans/SKILL.md`、`skills/acceptance-qa/SKILL.md`、`skills/clarifying/SKILL.md`、`skills/test-driven-development/SKILL.md`、`skills/using-git-worktrees/SKILL.md`、`skills/visual-preview/SKILL.md`（九个非 vendored、非 requirement-analysis 的 skill）；`skills/requirement-analysis/SKILL.md:96`、`skills/requirement-analysis/references/codex-compat.md:28`（环境映射表补 anysearch）；`skills/requirement-analysis/references/exploration-patterns.md:86`（派发词模板段强化）
- 创建：`scripts/tests/search-clause.test.mjs`

**接口**：
- 消费：exploration-patterns.md 既有降级链定义（单一定义点不动）
- 产出：统一条款文本（九个 SKILL.md 语言协议引用块之后各一行）

- [ ] **步骤 1：写失败测试**

创建 `scripts/tests/search-clause.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SKILLS = ["exploring", "quick-fix", "executing-plans", "writing-plans", "acceptance-qa",
  "clarifying", "test-driven-development", "using-git-worktrees", "visual-preview"];

for (const s of SKILLS) {
  test(`统一搜索条款存在于 ${s}`, () => {
    const text = readFileSync(path.join(repoRoot, `skills/${s}/SKILL.md`), "utf8");
    assert.match(text, /外部搜索统一入口/, `${s} 缺统一条款`);
    assert.match(text, /anysearch/, `${s} 未提及 anysearch`);
  });
}
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test scripts/tests/search-clause.test.mjs`
预期：FAIL ×9。

- [ ] **步骤 3：实现**

九个 SKILL.md 各在「语言协议」引用块之后、正文首个 `#` 标题之前插入同一行：

```markdown
> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。
```

`skills/requirement-analysis/SKILL.md:96` 环境映射表"网页搜索"行：`WebSearch` / `内置 web 搜索` 两格均改为 `anysearch skill（内嵌）→ WebSearch 降级` / `anysearch skill（内嵌）→ 托管 web_search 降级`。`codex-compat.md:28` 同表同改。

`exploration-patterns.md:86` 派发要求第 4 条句尾追加：`；派发词模板固定携带一行「工具优先级：AnySearch 第一优先（CLI 路径见 agents/external-resource-explorer.md），WebSearch/WebFetch 兜底」，主线程复制使用、不现场重写`。

- [ ] **步骤 4：运行测试确认通过**

运行：`node --test scripts/tests/search-clause.test.mjs && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs`
预期：PASS ×9 + 两校验通过（本条款不动 description，openai.yaml 无需变）。

- [ ] **步骤 5：提交**

```bash
git add skills/ scripts/tests/search-clause.test.mjs
git commit -m "feat(T11): 九 skill 统一搜索条款 + 环境映射表纳入 anysearch + 派发词模板固定化"
```

### 任务 12：guardrail snippet 全局搜索规则

**文件**：
- 修改：`guardrail/templates/CLAUDE.md.snippet`、`guardrail/templates/AGENTS.md.snippet`

**接口**：
- 消费：任务 11 的统一条款语义
- 产出：装了 guardrail 的项目主线程全局可见的搜索优先级规则（grok/pi 经 AGENTS.md 家族同样读到）

- [ ] **步骤 1：写失败断言**

```bash
rg -l 'anysearch' guardrail/templates/*.snippet | wc -l
```

预期：`0`。

- [ ] **步骤 2：实现**

两个 snippet 文件各在其列表体末尾（保持既有条目风格）追加一条：

```markdown
- Web lookups: prefer the anysearch skill (bundled with the spec-dev plugin) for any external search — docs, best practices, time-sensitive facts; fall back to WebSearch/WebFetch only when it is unavailable. / 联网检索一律优先使用 anysearch skill（spec-dev 插件内嵌）——查资料、查文档、核时效信息；不可用时才降级 WebSearch/WebFetch。
```

- [ ] **步骤 3：确认**

```bash
rg -l 'anysearch' guardrail/templates/*.snippet | wc -l
```

预期：`2`。

- [ ] **步骤 4：提交**

```bash
git add guardrail/templates/
git commit -m "feat(T12): guardrail snippet 注入全局搜索优先级规则（AGENTS.md 家族跨平台生效）"
```

## 组四：产物组织（M4）

### 任务 13：同日顺序编号规则

**文件**：
- 修改：`skills/requirement-analysis/SKILL.md:183`（特性目录命名权威定义）、`:109`（reports 命名）、`:111`（roadmap 命名）、`skills/requirement-analysis/assets/spec-template.md:1`、`skills/requirement-analysis/assets/roadmap-template.md:1`、`skills/writing-plans/SKILL.md:20,31`、`skills/executing-plans/SKILL.md:33`、`guardrail/templates/CLAUDE.md.snippet` 与 `AGENTS.md.snippet` 中的示例路径（rg `YYYY-MM-DD` 定位）
- 创建：`scripts/tests/numbering-docs.test.mjs`

**接口**：
- 消费：无
- 产出：全套件命名规则 `YYYY-MM-DD-NN-<名称>`（任务 14 roadmap 模板、任务 23/24 引用同一规则）

- [ ] **步骤 1：写失败测试**

创建 `scripts/tests/numbering-docs.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ra = readFileSync(path.join(repoRoot, "skills/requirement-analysis/SKILL.md"), "utf8");

test("特性目录命名规则含同日序号 NN 与重扫防撞", () => {
  assert.match(ra, /YYYY-MM-DD-NN-<feature>/);
  assert.match(ra, /当日已有取最大加一|扫描当日已有/);
  assert.match(ra, /落盘前重扫/);
});

test("writing-plans 与 executing-plans 引用新命名", () => {
  for (const f of ["skills/writing-plans/SKILL.md", "skills/executing-plans/SKILL.md"]) {
    assert.match(readFileSync(path.join(repoRoot, f), "utf8"), /YYYY-MM-DD-NN-/, `${f} 未同步`);
  }
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test scripts/tests/numbering-docs.test.mjs` → FAIL。

- [ ] **步骤 3：实现**

`requirement-analysis/SKILL.md:183` 括注部分改写为：

```text
（所有 spec-dev 产物统一收纳在项目根目录 `.spec-dev/` 下；目录名 `YYYY-MM-DD-NN-<feature>`——NN 为当日两位序号：扫描 `.spec-dev/` 下当日已有目录取最大加一、01 起步，**落盘前重扫一次防并发撞号**（发现同号已被占则顺延并同步修正自引路径）；feature 取需求主题的短语义名，跟随项目语言；存量旧命名目录不改名（grandfather）……）
```

`:109` reports 与 `:111` roadmap 的路径模式同步为 `YYYY-MM-DD-NN-<topic>` / `YYYY-MM-DD-NN-<project>`（附一句"同一 NN 序列全 .spec-dev 日期前缀产物共用"）。两个模板文件标题行、writing-plans `:20`（计划路径）与 `:31`（roadmap 登记）、executing-plans `:33`（读取路径，保留旧命名兼容读取一句：「旧命名 `YYYY-MM-DD-<feature>` 目录按原样读取」）、snippet 示例路径同步替换。

- [ ] **步骤 4：运行测试确认通过**

运行：`node --test scripts/tests/numbering-docs.test.mjs && node scripts/validate-skills.mjs` → PASS。

- [ ] **步骤 5：提交**

```bash
git add skills/ guardrail/templates/ scripts/tests/numbering-docs.test.mjs
git commit -m "feat(T13): 同日顺序编号 YYYY-MM-DD-NN 全套件落地（存量 grandfather）"
```

### 任务 14：roadmap 上下文胶囊与续接改写

**文件**：
- 修改：`skills/requirement-analysis/assets/roadmap-template.md`（新增两节）、`skills/requirement-analysis/SKILL.md:111-112`（分解登记 + 续接检查）、`skills/executing-plans/SKILL.md:93,99`（交付回写 + 续接询问）
- 修改：`skills/requirement-analysis/evals/evals.json`（追加胶囊续接用例）

**接口**：
- 消费：任务 13 的命名规则
- 产出：roadmap 模板的「原始需求」节与「上下文胶囊」小节结构（executing-plans 回写行格式）

- [ ] **步骤 1：写失败断言**

```bash
rg -q '上下文胶囊' skills/requirement-analysis/assets/roadmap-template.md && echo HAS || echo MISSING
```

预期：`MISSING`。

- [ ] **步骤 2：实现**

`roadmap-template.md` 子项目表之后追加两节：

```markdown
## 原始需求

> 登记时把用户的原始需求描述**全文**引用于此（引用块原样保留，不改写不压缩）——这是所有子项目共同的最上游输入，续接时不得要求用户重新提供。

## 上下文胶囊（每子项目一小节，续接的唯一交接面）

### #N <子项目名>

- **关键裁决**：分解期与本子项目相关的澄清结论，每条一行
- **探索指针**：相关 explorations 文件、前置子项目 spec/acceptance-report 的仓库根相对路径
- **已扫范围**：分解期/前置子项目已完成的探索模态与范围（续接的 requirement-analysis 阶段 2 对已登记范围不重扫、只补缺口）
- **留给后继的注意事项**：（交付回写时由 executing-plans 追加；登记时留空）
```

`requirement-analysis/SKILL.md:111` 分解登记句追加：`；登记时同步填写「原始需求」节（用户原话全文）与每子项目「上下文胶囊」（关键裁决/探索指针/已扫范围）`。
`:112` 续接检查句改写为：

```text
**续接检查**：需求命中某 active roadmap 的既有子项目时（用户点名"继续 <项目>"，或 pending 子项目与本需求对得上）→ 载入该 roadmap 的目标/分解边界/备注，**并读取该子项目上下文胶囊指向的前置产物**（前置子项目 spec 的「背景与目标」与验收报告结论、探索指针文件），以此为阶段 1-2 输入直接走本流程、不重新分解、**不要求用户重新提供原始需求**；阶段 2 探索对胶囊「已扫范围」登记过的模态不重扫、只补缺口；依赖的前置子项目未交付时先向用户指出。roadmap 目录不存在或无命中 → 本条零动作。
```

`executing-plans/SKILL.md:93` 回写句追加：`；同时在该子项目的上下文胶囊追加一行「留给后继的注意事项」（交付摘要、接口变化、给下一子项目的提醒）`。`:99` 续接询问句追加：`（询问时引用下一子项目的胶囊要点，不只报名字）`。

`requirement-analysis/evals/evals.json` cases 数组追加两条：

```json
{
  "id": "ra-roadmap-capsule-continuation",
  "input": "用户说：继续 roadmap 里的第二个子项目。该 roadmap 含原始需求全文节与 #2 的上下文胶囊（关键裁决、探索指针、已扫范围）",
  "expected_output": "不要求用户重新提供原始需求；读取胶囊指针指向的前置 spec 与验收报告作为输入；阶段 2 只对胶囊未登记的探索缺口派发子代理，已扫范围不重扫"
},
{
  "id": "ra-same-day-numbering",
  "input": ".spec-dev/ 下已存在 2026-08-26-01-foo，同日再创建一个特性目录；另一并行会话可能也在建目录",
  "expected_output": "新目录命名 2026-08-26-02-<语义名>（扫描当日已有取最大加一）；落盘前重扫一次，发现 02 已被占则顺延 03 并同步修正自引路径；存量旧命名目录不改名"
}
```

- [ ] **步骤 3：确认**

```bash
rg -q '上下文胶囊' skills/requirement-analysis/assets/roadmap-template.md && rg -q '不要求用户重新提供原始需求' skills/requirement-analysis/SKILL.md && rg -q '留给后继的注意事项' skills/executing-plans/SKILL.md && echo OK
node scripts/validate-skills.mjs
```

预期：`OK` + 校验通过。

- [ ] **步骤 4：提交**

```bash
git add skills/
git commit -m "feat(T14): roadmap 上下文胶囊（原始需求全文+裁决+指针+已扫范围）与续接免重扫"
```

### 任务 15：visual-preview 产物归位特性目录

**文件**：
- 修改：`skills/visual-preview/scripts/start-server.sh:126-134`（SESSION_DIR 计算）与其参数解析段、`skills/visual-preview/SKILL.md:36,39,55,70`、`skills/visual-preview/references/preview-guide.md:142`
- 创建：`scripts/tests/visual-path.test.sh`

**接口**：
- 消费：任务 13 命名规则（特性目录名形态）
- 产出：`start-server.sh --feature-dir <path>` 参数；产物路径 `<feature-dir>/visual/<session-id>/`；回退路径不变

- [ ] **步骤 1：写失败测试**

创建 `scripts/tests/visual-path.test.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Scenario: 特性上下文中的产物落位——只验证路径计算（--dry-run 不起服务器）
out=$(bash skills/visual-preview/scripts/start-server.sh --project-dir /tmp/vp-proj \
      --feature-dir /tmp/vp-proj/.spec-dev/2026-08-26-01-demo --dry-run 2>&1)
echo "$out" | grep -q "/tmp/vp-proj/.spec-dev/2026-08-26-01-demo/visual/" || { echo "FAIL: 特性目录未生效"; exit 1; }
# Scenario: 无特性上下文回退
out=$(bash skills/visual-preview/scripts/start-server.sh --project-dir /tmp/vp-proj --dry-run 2>&1)
echo "$out" | grep -q "/tmp/vp-proj/.spec-dev/visual/" || { echo "FAIL: 回退路径不对"; exit 1; }
echo PASS
```

`chmod +x scripts/tests/visual-path.test.sh`

- [ ] **步骤 2：运行测试确认失败**

运行：`bash scripts/tests/visual-path.test.sh`
预期：FAIL（--feature-dir 与 --dry-run 均未实现）。

- [ ] **步骤 3：实现**

`start-server.sh` 参数解析段（现有 `--project-dir` 旁）新增 `--feature-dir <path>`（导出 `FEATURE_DIR`）与 `--dry-run`（计算并打印 `SESSION_DIR=<路径>` 后 exit 0，不起服务）。SESSION_DIR 计算（:126-134）改为：

```bash
if [[ -n "${FEATURE_DIR:-}" ]]; then
  SESSION_DIR="${FEATURE_DIR}/visual/${SESSION_ID}"
  export BRAINSTORM_PORT_FILE="${PROJECT_DIR}/.spec-dev/visual/.last-port"
  export BRAINSTORM_TOKEN_FILE="${PROJECT_DIR}/.spec-dev/visual/.last-token"
elif [[ -n "$PROJECT_DIR" ]]; then
  SESSION_DIR="${PROJECT_DIR}/.spec-dev/visual/${SESSION_ID}"
  export BRAINSTORM_PORT_FILE="${PROJECT_DIR}/.spec-dev/visual/.last-port"
  export BRAINSTORM_TOKEN_FILE="${PROJECT_DIR}/.spec-dev/visual/.last-token"
else
  SESSION_DIR="/tmp/brainstorm-${SESSION_ID}"
fi
[[ "${DRY_RUN:-0}" == "1" ]] && { echo "SESSION_DIR=${SESSION_DIR}"; exit 0; }
```

（port/token 记忆文件固定留 `.spec-dev/visual/` 根——跨特性共享端口。）

`SKILL.md` 同步四处：`:36` 启动命令示例加"当前处于特性上下文（本次会话正在做某特性的需求设计/计划）时**必须**传 `--feature-dir .spec-dev/<当日特性目录>`"；`:39` gitignore 建议改为"把 `.spec-dev/visual/` 与 `.spec-dev/*/visual/` 加入 .gitignore（不要忽略整个 .spec-dev/）"；`:55` 产物路径描述同步双形态；`:70` 清理语义补"特性目录下的 visual/ 会话与 .spec-dev/visual/ 同规则：/tmp 会话删、项目内会话留"。追加一句归档约定："被设计采纳的定稿 mockup 复制为特性目录 `spec/assets/<名称>.html` 入库（这是唯一入 git 的 visual 产物）"。`preview-guide.md:142` 连接信息查找路径描述同步两种路径。

- [ ] **步骤 4：运行测试确认通过**

运行：`bash scripts/tests/visual-path.test.sh` → `PASS`。`stop-server.sh` 无需改（其删除逻辑只认 /tmp 前缀，特性目录会话自然保留）。

- [ ] **步骤 5：提交**

```bash
git add skills/visual-preview/ scripts/tests/visual-path.test.sh
git commit -m "feat(T15): visual-preview 产物归位特性目录（--feature-dir + 回退不变 + 归档约定）"
```

## 组五：澄清纪律（M5）

### 任务 16：clarifying 第 0 条自我披露

**文件**：
- 修改：`skills/clarifying/SKILL.md`（核心纪律节 :23-30、Codex 规范节 :58-64、Red Flags :66-73）、`skills/clarifying/evals/evals.json`

**接口**：
- 消费：无
- 产出：核心纪律第 0 条文本（任务 17 引用方锚定语、任务 18 exploring 开场披露消费）

- [ ] **步骤 1：写失败断言**

```bash
rg -q '提问前自我披露' skills/clarifying/SKILL.md && echo HAS || echo MISSING
```

预期：`MISSING`。

- [ ] **步骤 2：实现**

核心纪律节（:23-30）在"一次只问一个问题"条目之前插入：

```markdown
- **第 0 条·提问前自我披露**：开出第一题之前，先用三小段向用户披露——(a) 我默认了哪些未说出口的假设；(b) 哪些信息一旦提供会显著改变我的答案或方案；(c) 处理这类问题最容易犯什么错。披露基于已完成的探索事实、不编造；披露后才进入逐题澄清，且披露内容随澄清进展可修订。两种角色（独立会话/被引用）均适用。
```

Codex 规范节补一行：`- 自我披露以一条对话消息完成（三段合一条），不拆多条`。
Red Flags 补一条：`- "背景我都懂，直接开问吧" → 披露先行：三段披露是第一题的前置，不可跳过`。

`evals/evals.json` cases 追加：

```json
{
  "id": "cl-disclosure-before-first-question",
  "input": "quick-fix 步骤 3 以被引用模式进入澄清，存在两个待确认点",
  "expected_output": "第一题之前先输出三段自我披露（默认假设/关键信息缺口/易犯错误），随后一次一题逐题确认；不呈现三出口（被引用模式）"
}
```

- [ ] **步骤 3：确认**

```bash
rg -q '提问前自我披露' skills/clarifying/SKILL.md && node scripts/validate-skills.mjs && echo OK
```

预期：`OK`。

- [ ] **步骤 4：提交**

```bash
git add skills/clarifying/
git commit -m "feat(T16): clarifying 核心纪律第 0 条——提问前自我披露（假设/关键信息/易犯错）"
```

### 任务 17：引用方锚定语同步

**文件**：
- 修改：`skills/requirement-analysis/SKILL.md:139`（阶段 3 锚定语）、`skills/quick-fix/SKILL.md:52`（步骤 3 锚定语）

**接口**：
- 消费：任务 16 的第 0 条
- 产出：两处锚定语列举含披露条（与 clarifying:14 单向同步锚一致）

- [ ] **步骤 1：写失败断言**

```bash
rg -c '自我披露' skills/requirement-analysis/SKILL.md skills/quick-fix/SKILL.md
```

预期：两文件计数均为 `0`（rg 无匹配退出码 1 即红）。

- [ ] **步骤 2：实现**

`requirement-analysis/SKILL.md:139` 的列举 `一次只问一个问题、选择题优先且推荐项放首位（Claude Code 用 \`AskUserQuestion\`）、事实自查决策交用户、按决策依赖排序、术语挑战、不编造问题` 之前插入 `提问前自我披露（假设/关键信息/易犯错三段先行）、`。
`quick-fix/SKILL.md:52` 的列举 `一次一题、选择题优先且推荐项放首位（Claude Code 用 \`AskUserQuestion\`）、事实自查决策交用户` 之前插入 `提问前自我披露、`。

- [ ] **步骤 3：确认**

```bash
rg -c '自我披露' skills/requirement-analysis/SKILL.md skills/quick-fix/SKILL.md
```

预期：各 ≥1。

- [ ] **步骤 4：提交**

```bash
git add skills/requirement-analysis/SKILL.md skills/quick-fix/SKILL.md
git commit -m "feat(T17): 引用方锚定语同步披露条（requirement-analysis 阶段3 / quick-fix 步骤3）"
```

### 任务 18：exploring 全套接入（开场披露 + 关键分岔转漏斗）

**文件**：
- 修改：`skills/exploring/SKILL.md`（:20-26 姿态、:28-37 可做/不必做、:47-56 对应 clarifying 分界内容、:76-82 Red Flags——行号以当前文件 rg 定位为准）、`skills/clarifying/SKILL.md:47-56`（与 exploring 分界表）、`skills/exploring/evals/evals.json`

**接口**：
- 消费：任务 16 的披露条、clarifying 被引用模式既有定义
- 产出：「关键分岔」三条件判定文本（spec 术语表同名）

- [ ] **步骤 1：写失败断言**

```bash
rg -q '关键分岔' skills/exploring/SKILL.md && echo HAS || echo MISSING
```

预期：`MISSING`。

- [ ] **步骤 2：实现**

`exploring/SKILL.md` 姿态节（:20-26）：
- `:22` "问题从对话中自然涌现，不照脚本提问" 保留；
- `:23` "开支线而非审讯……刻意相反" 改为：`开支线而非审讯——**非分岔不审讯**：日常探索保持发散、不逐题逼近；仅当浮现**关键分岔**（三条件同时满足：选项互斥、不可同时探、用户不裁决则探索无法继续）时，切入 clarifying 被引用模式跑一轮逐题澄清（选择题优先、推荐首位），用户裁决后回到发散。`
- 姿态节首条前新增：`**开场自我披露**：进入探索时先按 clarifying 核心纪律第 0 条披露三段（默认假设/关键信息缺口/易犯错误），再开始陪伴式探索。`

可做/不必做（:28-37）："照脚本提问"条目改为"非分岔时照脚本提问"。Red Flag :80 "把探索变成一串审讯式提问" 改为 "在没有关键分岔时把探索变成一串审讯式提问（分岔漏斗完成后不回发散同罪）"。

`clarifying/SKILL.md:47-56` 分界表表头下补一行说明：`分界是嵌套而非对立：exploring 默认发散，但其开场披露与关键分岔漏斗以被引用模式复用本 skill 纪律；分岔漏斗结束即归还控制权回发散。`（表格行按此语义微调"刻意相反"措辞。）

`exploring/evals/evals.json` cases 追加两条：

```json
{
  "id": "ex-fork-funnel",
  "input": "探索中浮现两种互斥的存储方案（本地 SQLite vs 远端 PG），方向不定则后续探索无法继续",
  "expected_output": "识别为关键分岔（互斥/不可同时探/不裁决则阻塞），切入逐题澄清：单题、选择题带推荐首位；用户裁决后回到发散探索"
},
{
  "id": "ex-no-fork-no-funnel",
  "input": "用户开放地聊一个尚无分岔的想法：'我在想这个模块为什么这么乱'",
  "expected_output": "保持发散陪伴（读代码、画结构、开支线），不出现连续追问式逐题澄清；开场有三段自我披露"
}
```

- [ ] **步骤 3：确认**

```bash
rg -q '关键分岔' skills/exploring/SKILL.md && rg -q '嵌套而非对立' skills/clarifying/SKILL.md && node scripts/validate-skills.mjs && echo OK
```

预期：`OK`。

- [ ] **步骤 4：提交**

```bash
git add skills/exploring/ skills/clarifying/
git commit -m "feat(T18): exploring 全套接入澄清——开场披露 + 关键分岔转漏斗，分界改嵌套"
```

## 组六：规范载体（M6）

### 任务 19：design-principles.md 与三个消费点

**文件**：
- 创建：`skills/writing-plans/references/design-principles.md`
- 修改：`skills/writing-plans/SKILL.md`（「文件结构先行」节前引用 + 计划头部模板加「设计原则」块）、`skills/requirement-analysis/SKILL.md`（阶段 4 :164 评价维度、阶段 5 :177 设计要求、Key Principles）

**接口**：
- 消费：无
- 产出：`design-principles.md`（任务 23 的 index 头部模板、验收任务 rg 断言消费）；计划头部「设计原则」块模板

- [ ] **步骤 1：写失败断言**

```bash
test -f skills/writing-plans/references/design-principles.md && echo HAS || echo MISSING
```

预期：`MISSING`。

- [ ] **步骤 2：创建 `skills/writing-plans/references/design-principles.md`**

```markdown
# 设计原则（方案取舍与计划编写共同遵循）

> **阅读时机**：requirement-analysis 阶段 4（方案对比）与阶段 5（设计展示）、writing-plans 编写计划头部时加载；executing-plans 执行者经计划头部「设计原则」块间接获得。

八条原则（方案评价维度与任务分解检查项）：

1. **默认不保留向后兼容性**。删除过时路径，而不是添加兼容层、回退垫片或仅用于兼容性的数据迁移。常规的前向模式迁移仍然是必需的。仅保留产品和部署规则中明确记录的当前合同。
2. **选择能完全满足当前需求的最简单实现**。避免推测性的抽象、配置和间接层。
3. **分层构建系统**。从能够端到端工作的最小版本开始，然后基于运行中的产品逐步添加各项能力。
4. **绝不用未完成的复杂性换取可工作的产品**。
5. **保持组件模块化，关注点清晰分离**。
6. **优先使用成熟且维护良好的库**，前提是它们能降低整体复杂性或提高可靠性；没有充分理由不重新实现通用功能。
7. **优先使用项目中已有的依赖**；判断某依赖缺少某能力之前，先查阅其文档和类型定义。
8. **做出长期性的架构决策**。不接受打算日后替换的权宜之计。

## spec-dev 语境注解

- 第 1 条管**实现层**：不写兼容层/垫片/仅兼容性迁移。在 spec-dev 里，active spec 就是"明确记录的当前合同"——删除旧行为路径的前提是经取代分流**显式取代**旧 spec（supersede 机制），而非绕开它；读取历史落盘产物（如旧格式 plan）属于读历史数据，不是兼容垫片。
- 第 1 条与阶段 1「契约姿态判定」的关系：姿态判定的默认值不变（旧 active spec 默认硬约束），本原则要求的是**取代要走正门、实现不留垫片**。
- 第 6/7 条的既有呼应：收尾审查维度 C「优先使用项目已有工具与模式」；ADR 三判据承载第 8 条的"长期决策"沉淀。
```

- [ ] **步骤 3：接线三个消费点**

`writing-plans/SKILL.md`「文件结构先行」节标题前插入一行：`任务分解与方案形态遵循 [design-principles.md](references/design-principles.md) 八条设计原则——分解时逐条对照，违反即重划。`
计划头部模板（:68-99 的 markdown 块）在「技术栈」行之后插入：

```markdown
**设计原则**：本计划遵循 spec-dev 设计原则（不留向后兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策）；任务与代码不得违反，冲突时停下向计划作者确认。
```

`requirement-analysis/SKILL.md:164` 方案评价维度句 `核心思路、与现有模式的契合度、改动半径、风险、成本` 追加 `、设计原则符合度（对照 writing-plans/references/design-principles.md 八条——尤其"是否引入投机抽象""是否留兼容垫片""是否权宜之计"三问）`；`:177` 设计要求句尾追加 `；整体设计对照 design-principles.md 八条自检`；Key Principles 节追加一条 `- **原则先于偏好**——方案对比与设计定稿以 design-principles.md 为共同裁决维度`。

- [ ] **步骤 4：确认**

```bash
test -f skills/writing-plans/references/design-principles.md && rg -q 'design-principles' skills/requirement-analysis/SKILL.md && rg -q '设计原则' skills/writing-plans/SKILL.md && node scripts/validate-skills.mjs && echo OK
```

预期：`OK`。

- [ ] **步骤 5：提交**

```bash
git add skills/writing-plans/ skills/requirement-analysis/SKILL.md
git commit -m "feat(T19): 设计原则 reference 落盘并接线阶段4/5与计划头部声明块"
```

### 任务 20：test-strategy skill 本体

**文件**：
- 创建：`skills/test-strategy/SKILL.md`、`skills/test-strategy/agents/openai.yaml`、`skills/test-strategy/evals/evals.json`、`skills/test-strategy/evals/trigger-evals.json`
- 修改：`.claude-plugin/marketplace.json`（skills 数组追加 `./skills/test-strategy`）

**接口**：
- 消费：无
- 产出：test-strategy skill（任务 21 references、任务 22 挂载点消费）；三 Lane 术语（fast/PR/nightly）

- [ ] **步骤 1：写失败断言**

```bash
test -f skills/test-strategy/SKILL.md && echo HAS || echo MISSING
```

预期：`MISSING`。

- [ ] **步骤 2：创建 `skills/test-strategy/SKILL.md`**

```markdown
---
name: test-strategy
description: >-
  Test strategy discipline - three-lane scheduling by IO type (fast/PR/nightly), governance order flaky→duration→selection, AI-agent model-boundary testing skeleton, and acceptance-matrix integration. Use when designing a spec's test & acceptance strategy, translating an acceptance matrix into plan tasks, or setting up test lanes for a project. / 测试策略纪律——按 IO 类型的三 Lane 调度（fast/PR/nightly）、治理顺序 flaky→时长→选择、AI Agent 模型边界测试骨架、验收矩阵对接。为 spec 设计测试与验收策略、把验收矩阵翻译为计划任务、或为项目搭测试分层时使用。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction takes precedence, then recent messages; default to English. Deliverables follow the conversation language at creation. / 以对话语言输出；落盘产物以创建时对话语言为准。

> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。

# 测试策略纪律

普适纪律在本文；栈特定处方按需加载 references（阅读时机见各文件头）。

## 三 Lane 模型（调度维度是 IO 类型，不是业务模块）

| Lane | 时机/预算 | 内容 | 判据 |
|---|---|---|---|
| **fast** | 保存/提交时 < 1 min | 纯内存：mock IO、mock 模型、组件+mock 网络 | 不碰任何真实 IO（含 LLM） |
| **PR** | 目标 < 10 min | 编译/静态先行 + fast 全量 + 集成（真实容器/库）+ 主干 E2E 3-5 条 | 每套件一容器 + 模板克隆 |
| **nightly** | 夜间/手动 | 全量含慢测试：并发锁、迁移演练、全 E2E、Agent 完整 eval | 概率性/长耗时永不阻塞 PR |

小团队（1-5 人）fast lane 全量跑全部模块——不建按模块的测试选择系统；选择/分片只在触发条件满足时引入（>15-20 人或 PR lane >15min，先榨干单机并行）。

## 治理顺序铁律：flaky → 时长 → 选择

反序必翻车——一条 flaky 的必需检查会拖垮整条流水线的信任。先清 flaky，再治时长（拓扑>磁盘>并行），最后才考虑选择系统。

## AI Agent 测试骨架（模型边界是唯一不可逆决策）

一根窄接口隔离模型，模型是它之外唯一的依赖；边界以下全确定性：

- L0 静态 + 工具 JSON Schema 校验（schema 漂移是工具类头号故障）
- L1 harness 单测（fast）：fake model 按序弹响应；测循环控制、路由、重试、预算、护栏
- L1.5 prompt 快照（fast）：快照装配后的最终 prompt（确定性），不是模型输出
- L2 工具契约（fast）：工具=普通函数单测
- L3 回放（fast/PR）：录制回放（脱敏），周期性重录
- L4 廉价模型冒烟（PR，仅 agent 相关变更）：小模型 + 严格 schema 断言
- L5 完整 eval（nightly）：真实模型、多 trial、pass^k、按维度隔离 judge

断言纪律：`temperature=0` 不是确定性——断言面向结构与 schema，永不面向精确文本；评结果不评路径（精确工具序列断言脆弱）。

## 与验收矩阵的对接（上游分工链的一环）

- **requirement-analysis 写矩阵时**：每行标注 Lane 归属（fast/PR/nightly）——unit/docs 行默认 fast，integration 行默认 PR，perf/eval 行默认 nightly；性能行必须带阈值数字。
- **writing-plans 翻译时**：任务的失败测试步骤继承该行 Lane 归属并写明运行命令所属 lane；DB/容器类测试步骤引用 references/db-testing.md 处方（模板克隆、两速隔离），不得每测试起容器。
- **acceptance-qa 执行时**：阶段 0 装配按 Lane 选择执行窗口；nightly 行在验收报告中标注"非阻塞"。

## Red Flags

- 每测试/每文件一个容器；每测试重放迁移 → 读 db-testing.md 处方
- 用 mock 测出来的绿当集成信心 → mock 只属 fast lane，集成信心来自 PR lane 真实容器
- eval 分数波动就改断言阈值 → 先查 flaky 治理顺序，eval 属 nightly 不阻塞
- 为测试选择系统引缝 → 缝跟着真实交付边界走，1-5 人先全量
```

- [ ] **步骤 3：配套文件**

`skills/test-strategy/agents/openai.yaml`：

```yaml
interface:
  display_name: Test Strategy
  short_description: Three-lane test scheduling, flaky→duration→selection governance, AI-agent testing skeleton, acceptance-matrix integration. / 三 Lane 测试调度、flaky→时长→选择治理、AI Agent 测试骨架、验收矩阵对接。
  default_prompt: $test-strategy
  allow_implicit_invocation: true
```

`skills/test-strategy/evals/evals.json`：

```json
{
  "skill": "test-strategy",
  "cases": [
    {
      "id": "ts-lane-annotation",
      "input": "spec 验收矩阵有一行 integration 维度的 DB 回归检查，项目用 PostgreSQL",
      "expected_output": "该行标注 PR lane；writing-plans 翻译的测试步骤引用 db-testing 处方（job 级一容器 + 模板克隆/事务回滚），运行命令归入 PR lane；不出现每测试一容器"
    },
    {
      "id": "ts-governance-order",
      "input": "用户抱怨 CI 又慢又经常无关红，想先上测试选择系统",
      "expected_output": "按治理顺序 flaky→时长→选择劝阻：先清 flaky 再治时长（拓扑/磁盘/并行），选择系统仅在人数/时长触发条件满足后引入"
    }
  ]
}
```

`skills/test-strategy/evals/trigger-evals.json`：

```json
{
  "skill": "test-strategy",
  "cases": [
    { "id": "tst-pos-1", "input": "帮我给这个 monorepo 设计一套测试分层，DB 测试太慢了", "should_trigger": true },
    { "id": "tst-pos-2", "input": "spec 的测试与验收策略这节怎么写测试 lane？", "should_trigger": true },
    { "id": "tst-neg-1", "input": "跑一下现有测试看看红没红", "should_trigger": false },
    { "id": "tst-neg-2", "input": "帮我修这个失败的单测", "should_trigger": false }
  ]
}
```

`.claude-plugin/marketplace.json` skills 数组 `"./skills/sequential-thinking"` 之后追加 `"./skills/test-strategy"`。

- [ ] **步骤 4：确认**

```bash
node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs && node scripts/check-plugin.mjs
```

预期：全部通过（13 个 skill）。

- [ ] **步骤 5：提交**

```bash
git add skills/test-strategy/ .claude-plugin/marketplace.json
git commit -m "feat(T20): test-strategy skill 本体（三 Lane/治理顺序/Agent 骨架/矩阵对接）"
```

### 任务 21：test-strategy 栈特定 references

**文件**：
- 创建：`skills/test-strategy/references/db-testing.md`、`skills/test-strategy/references/frontend-testing.md`、`skills/test-strategy/references/ai-agent-testing.md`

**接口**：
- 消费：任务 20 的 SKILL.md 引用锚
- 产出：三份处方文件（writing-plans 翻译 DB/前端/Agent 测试步骤时引用）

- [ ] **步骤 1：写失败断言**

```bash
ls skills/test-strategy/references/ 2>/dev/null | wc -l
```

预期：`0`。

- [ ] **步骤 2：创建三份 references**

`db-testing.md`（阅读时机头 + 内容要点，全文落盘）：

```markdown
# DB 测试处方（PostgreSQL 为主，原则通用）

> **阅读时机**：spec 验收矩阵含 DB 集成行、或计划任务要写 DB 测试步骤时加载；纯内存项目无需读。

## 病因算术（为什么慢）

每测试一容器 1.6-2.9s、每测试重放迁移 ~100ms、TRUNCATE 全表 40-60ms 且强制串行、模板库克隆 87-100ms（tmpfs）、事务回滚 2-4ms。拓扑错误时调优收益甚微——**先拓扑，再磁盘，后并行**。

## 五步改造（按杠杆排序）

1. **拓扑：job 级一个容器**（每包各起容器是隐形坑）：容器带 `--tmpfs` 数据目录 + `POSTGRES_INITDB_ARGS="--nosync --no-data-checksums"`（PG18 默认开 checksums，一次性容器纯浪费）。
2. **迁移一次进模板库**：`CREATE DATABASE tpl_migrated` 跑全部迁移 → `ALTER DATABASE tpl_migrated IS_TEMPLATE TRUE ALLOW_CONNECTIONS FALSE`。
3. **两速隔离**：速1 事务回滚（BEGIN...ROLLBACK，~80% 测试）；速2 模板克隆（`CREATE DATABASE test_x TEMPLATE tpl_migrated` + advisory lock 串行化）。速1 四硬限：序列不回滚（断言关系不断言绝对 ID）、测试内 COMMIT 会逃逸（用速2）、多连接看不到未提交行、CONCURRENTLY/CREATE DATABASE 不能进事务块。
4. **磁盘与服务器**：tmpfs > `fsync=off synchronous_commit=off full_page_writes=off` > initdb --nosync；`autovacuum=off max_connections=1000`。
5. **连接预算**：并发进程 × 每池连接 < max_connections；2 核 CI runner 加线程不如加 matrix job。

## 反模式清单

每测试/每文件一容器；每测试重放迁移；TRUNCATE 当唯一隔离；未串行化并发克隆；CI 开容器 reuse；克隆时模板库仍有连接。

来源证据：Storj 基准、pgtestdb、maragu（33s→9.9s）、miry（60→10min）、gajus（克隆 23x）——详见特性 spec 引用的原始探索文档证据索引。
```

`frontend-testing.md`：

```markdown
# 前端测试处方（Vitest/MSW/Playwright 为主，原则通用）

> **阅读时机**：spec 验收矩阵含前端 unit/e2e 行、或计划任务要写前端测试步骤时加载。

- 分层：tsc/静态 → 组件测试 + mock 网络（fast）→ 主干 E2E 3-5 条（PR）→ 全 E2E（nightly）。
- **mock 网络必须 fail-closed**：MSW `server.listen({ onUnhandledRequest: 'error' })`——默认 'warn' 会把未 mock 的请求发到真实网络（假绿之源）；`afterEach(() => server.resetHandlers())`。
- mock 的类型来自契约生成（如 openapi-typescript）：契约变 → 调用点与 mock 同次类型检查一起红。
- E2E 选择器面向语义（role/label），不面向样式类名；E2E 只覆盖主干流程，边缘走组件层。
- 异步断言前显式等待框架刷新（如 Vue `flushPromises`），不用固定 sleep。
```

`ai-agent-testing.md`：

```markdown
# AI Agent 测试处方（eval 分级细则）

> **阅读时机**：被测系统含 LLM/Agent 行为、spec 验收矩阵含 eval 行时加载。

- **grader 分级**：确定性优先（end-state 断言、工具调用形状、直接跑测试套件）→ LLM judge 只兜主观余量（每维度独立 judge、给 Unknown 出口、与人工标注校准）→ 评结果不评路径。
- **pass@k vs pass^k**：一次成功即可（生成类）用 pass@k；一致性要求（k 次全过）用 pass^k——单次 75% 时 pass^3≈42%，单跑 eval 全是噪声，20-50 任务起步。
- **golden 数据集是代码**：文件化进仓库走 PR；回归套件（应近 100%）与能力套件（应从低分爬坡）分开维护。
- **确定性纪律**：断言结构与 schema、永不断言精确文本；快照只快照装配后的 prompt。
- **Lane 归属**：L0-L2 fast、L3 fast/PR、L4 PR（仅 agent 变更触发）、L5 nightly 永不阻塞 PR。
```

- [ ] **步骤 3：确认**

```bash
ls skills/test-strategy/references/ | wc -l && node scripts/validate-skills.mjs
```

预期：`3` + 校验通过。

- [ ] **步骤 4：提交**

```bash
git add skills/test-strategy/references/
git commit -m "feat(T21): test-strategy 栈特定处方三件（DB/前端/Agent eval）"
```

### 任务 22：test-strategy 挂载接线

**文件**：
- 修改：`skills/writing-plans/SKILL.md:60`（Scenario 直译段后）、`skills/acceptance-qa/SKILL.md`（阶段 0 装配段 :59-69 与参考资料节 :182-191）、`skills/acceptance-qa/references/acceptance-matrix.md:29-47`（上游分工链）、`skills/requirement-analysis/assets/spec-template.md:108-111`（矩阵节提示）

**接口**：
- 消费：任务 20/21 的 skill 与 references
- 产出：四处挂载文本（验收任务 rg 断言消费）

- [ ] **步骤 1：写失败断言**

```bash
rg -l 'test-strategy' skills/writing-plans/SKILL.md skills/acceptance-qa/ skills/requirement-analysis/assets/spec-template.md | wc -l
```

预期：`0`。

- [ ] **步骤 2：接线**

`writing-plans/SKILL.md:60`（「Scenario 直译为测试」段落）句尾追加：`测试步骤的 Lane 归属与 DB/前端/Agent 处方遵循 test-strategy skill（矩阵行标注的 lane 直接继承；DB 类步骤对照其 references/db-testing.md，不得出现每测试一容器）。`

`acceptance-qa/SKILL.md` 阶段 0 装配段追加一句：`执行窗口按矩阵行的 Lane 归属选择（fast/PR 行随验收即时执行，nightly 行标注"非阻塞"）——Lane 语义定义见 test-strategy skill。`；参考资料节追加一行：`- test-strategy skill：三 Lane 调度、治理顺序、Agent 测试骨架（矩阵行 Lane 归属的定义方）`。

`acceptance-matrix.md` 上游分工链（:29-47）在"requirement-analysis 写矩阵"级追加：`每行标注 Lane 归属（fast/PR/nightly，语义见 test-strategy skill），性能行必须带阈值数字`；在"writing-plans 翻译"级追加：`翻译时继承 Lane 归属并对照 test-strategy 的栈处方`。

`spec-template.md:108-111` 矩阵节说明追加一句：`每行可标注 Lane 归属（fast/PR/nightly，见 test-strategy skill）；含 DB/LLM 的行按其处方写执行方式`。

- [ ] **步骤 3：确认**

```bash
rg -l 'test-strategy' skills/writing-plans/SKILL.md skills/acceptance-qa/ skills/requirement-analysis/assets/spec-template.md | wc -l
node scripts/validate-skills.mjs
```

预期：`≥4` + 校验通过。

- [ ] **步骤 4：提交**

```bash
git add skills/
git commit -m "feat(T22): test-strategy 挂载接线（writing-plans 翻译层 / acceptance-qa / 矩阵分工链 / spec 模板）"
```

## 组七：plan 双形态（M7）

### 任务 23：progressive-plan-format.md 与 writing-plans 阈值分流

**文件**：
- 创建：`skills/writing-plans/references/progressive-plan-format.md`
- 修改：`skills/writing-plans/SKILL.md:20`（保存路径段后加分流条款）

**接口**：
- 消费：任务 13 命名规则、任务 19 设计原则块（index 头部复用计划头部模板）
- 产出：分文件形态规范——`plan/index.md` 导航表列契约（`任务 | 依赖 | 消费接口 | 产出接口`）、`plan/tasks/TNN.md`、`plan/progress.yaml` 键结构（任务 24/25 消费）

- [ ] **步骤 1：写失败断言**

```bash
test -f skills/writing-plans/references/progressive-plan-format.md && echo HAS || echo MISSING
```

预期：`MISSING`。

- [ ] **步骤 2：创建 `skills/writing-plans/references/progressive-plan-format.md`**

```markdown
# 分文件计划形态（阈值门控）

> **阅读时机**：预估任务数 >8 或计划正文预估 >25KB 时加载并采用本形态；低于阈值维持单文件形态、无需读本文。

## 结构

```
.spec-dev/<特性目录>/plan/
├── index.md        # 头部 + 全局约束 + 相关测试范围 + 设计原则块 + 任务导航表；不复制任务正文
├── tasks/T01.md …  # 每任务一文件，正文结构与单文件形态的任务模板逐字一致（文件块/接口块/TDD 五步）
└── progress.yaml   # 唯一运行时状态；本形态不使用复选框跟踪（index 与 tasks 内的复选框仅为模板残留时须删除）
```

## index.md 任务导航表（机器可校验的调度依据）

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T01 <名称> | — | — | `funcA(x: string): Y` |
| T02 <名称> | T01 | `funcA` | `TypeB` |

规则：任务 ID 形如 `T\d\d` 全局唯一且与 tasks/ 文件名一一对应；依赖只引用表内 ID；禁止环；接口列写精确签名（执行者只读自己的任务文件 + 依赖行的产出接口，不读其它任务正文）。

## progress.yaml 键结构

```yaml
format_version: 1
current: T03            # 当前指针（null=未开始）
tasks:
  T01: { status: completed, commit: <sha>, tests: pass }
  T02: { status: completed, commit: <sha>, tests: pass, deviations: ["路径笔误就地修正"] }
  T03: { status: in_progress }
resources:              # 资源台账（本形态唯一登记处；最终任务清理步骤遍历此清单）
  - "worktree: .worktrees/<分支> —— git worktree remove …"
notes: []               # 偏差与备注，append-only
```

状态枚举：pending | in_progress | completed | blocked。写入纪律：每任务完成后原子更新（整文件重写）并随任务提交；worktree 合并不携带本文件冲突——它是执行档案，最终任务把它随特性目录归档。

## 生成规则（writing-plans 侧）

1. 阈值判定：分解出任务清单后统计——任务数 >8 或按单文件预估正文 >25KB → 本形态。
2. index.md 头部 = 单文件形态的计划文档头部（含设计原则块）+「全局约束」+「相关测试范围」+ 导航表；任务 0 与最终任务同样是 tasks/ 下的文件（T00、以及最大号）。
3. 生成后运行 `node scripts/validate-output.mjs plan-index <plan目录>`（结构校验：文件↔导航表一致、依赖存在、无环），失败不得交付执行。
4. Self-Review 三查对本形态逐任务文件执行，另加第 4 查：导航表接口列与任务文件接口块逐条一致。
```

- [ ] **步骤 3：SKILL.md 分流条款**

`writing-plans/SKILL.md:20`（计划保存路径段）之后新增一段：

```markdown
**形态分流（阈值门控）**：分解出任务清单后判定——预估任务数 >8 或正文预估 >25KB 时按 [progressive-plan-format.md](references/progressive-plan-format.md) 产出分文件形态（`plan/index.md` + `plan/tasks/TNN.md` + `plan/progress.yaml`，复选框停用、progress.yaml 是唯一状态源）；低于阈值维持本文默认的单文件形态。两形态的任务内部结构与质量门完全一致。
```

- [ ] **步骤 4：确认**

```bash
rg -q '形态分流' skills/writing-plans/SKILL.md && test -f skills/writing-plans/references/progressive-plan-format.md && node scripts/validate-skills.mjs && echo OK
```

预期：`OK`。

- [ ] **步骤 5：提交**

```bash
git add skills/writing-plans/
git commit -m "feat(T23): plan 分文件形态规范（阈值门控 + index 导航表 + progress.yaml 单一状态源）"
```

### 任务 24：progressive-execution.md 与 executing-plans 接线

**文件**：
- 创建：`skills/executing-plans/references/progressive-execution.md`
- 修改：`skills/executing-plans/SKILL.md:33`（读取分流）、`:55`（完成勾选分流）、`:57`（资源登记分流）、新增「恢复执行」小节（阶段 1 之后）

**接口**：
- 消费：任务 23 的形态规范与 progress.yaml 键结构
- 产出：渐进执行与 resume 规程（验收任务 A 行消费）

- [ ] **步骤 1：写失败断言**

```bash
test -f skills/executing-plans/references/progressive-execution.md && echo HAS || echo MISSING
```

预期：`MISSING`。

- [ ] **步骤 2：创建 `skills/executing-plans/references/progressive-execution.md`**

```markdown
# 分文件计划的渐进执行与恢复

> **阅读时机**：计划目录存在 `plan/tasks/` 子目录（分文件形态）时加载；单文件计划无需读本文。

## 渐进加载纪律

- 启动只读：`index.md` + `progress.yaml`（+ 同特性目录 spec）。**不读任何 tasks/ 正文**。
- 执行 TN 时只读：`tasks/TN.md` + 导航表中 TN 依赖行的「产出接口」列。不提前读无关后继任务正文。
- 任务完成条件（全部满足才置 completed）：依赖全 completed、TDD 步骤完成、测试通过、commit 可解析、接口块与导航表一致、progress.yaml 已原子更新并随任务提交。
- 资源登记：创建计划未预登记的持久资源时**当场**写入 progress.yaml 的 resources（计划任务文件不编辑）；最终任务清理步骤遍历 resources 清单。
- 偏差处理沿用主文件三级纪律；契约级偏差冻结受影响后继（导航表依赖闭包），修订 index 接口行与相关任务文件后再继续。

## 恢复执行（resume）

检测到 `progress.yaml` 存在且有非 completed 任务时：
1. 校验一致性：worktree/分支存在、`current`/completed 各任务的 commit 可 `git cat-file -e` 解析、progress 引用的任务文件都存在。任一不成立 → 停下向用户报告不一致，不猜测继续。
2. 从下一 ready 任务（依赖全 completed 的最小编号 pending）续跑；同前只读该任务文件与依赖接口行。
3. 恢复不重跑已 completed 任务的测试（最终任务的全量验证是安全网）。

## 单文件形态的轻量恢复（对照）

单文件计划无 progress.yaml：按复选框判读——首个含未勾选步骤的任务即续跑点；勾选状态与 git log 的 `feat(TN)` 提交对照，不一致时以提交为准并报告。
```

- [ ] **步骤 3：SKILL.md 接线**

`:33` 读取句改为分流：`读取计划：`plan/tasks/` 存在 → 分文件形态，按 [progressive-execution.md](references/progressive-execution.md) 渐进加载（启动只读 index + progress + spec）；否则单文件形态，一次性读取计划全文与 spec。`
`:55` 勾选句追加：`（分文件形态改为原子更新 progress.yaml 并随任务提交，不使用复选框）`。
`:57` 资源登记句追加：`（分文件形态登记进 progress.yaml 的 resources 键，计划任务文件不编辑）`。
阶段 1 末尾新增一行：`**恢复入口**：会话开始即发现未完成的 progress.yaml（或单文件计划有未勾选步骤）且用户要求继续 → 走 progressive-execution.md 的恢复流程（校验一致性 → ready 任务续跑），不从任务 0 重来。`

- [ ] **步骤 4：确认**

```bash
rg -q 'progressive-execution' skills/executing-plans/SKILL.md && node scripts/validate-skills.mjs && echo OK
```

预期：`OK`。

- [ ] **步骤 5：提交**

```bash
git add skills/executing-plans/
git commit -m "feat(T24): executing-plans 渐进执行与断点恢复接线（分文件形态 + 单文件轻量恢复）"
```

### 任务 25：validate-output 的 plan-index 结构校验

**文件**：
- 修改：`scripts/validate-output.mjs`（新增 plan-index 模式分支）
- 创建：`scripts/tests/plan-index.test.mjs`

**接口**：
- 消费：任务 23 的导航表列契约与目录结构
- 产出：CLI `node scripts/validate-output.mjs plan-index <plan目录>`（成功 `{ok:true}` 退出 0；失败 `{ok:false, errors:[…]}` 退出 1）

- [ ] **步骤 1：写失败测试**

创建 `scripts/tests/plan-index.test.mjs`：

```js
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
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test scripts/tests/plan-index.test.mjs`
预期：FAIL（plan-index 模式不存在——现有脚本把 "plan-index" 当 schema 名找不到文件而 exit 1，第一个用例即红）。

- [ ] **步骤 3：实现**

`scripts/validate-output.mjs` 在参数解析（:12-17）之后插入模式分支：

```js
if (schemaName === "plan-index") {
  validatePlanIndex(jsonFile);   // jsonFile 参数位复用为 plan 目录
}

function validatePlanIndex(planDir) {
  const errors = [];
  const indexPath = path.join(planDir, "index.md");
  const tasksDir = path.join(planDir, "tasks");
  if (!existsSync(indexPath)) errors.push({ path: "index.md", expected: "present", actual: "missing" });
  if (!existsSync(tasksDir)) errors.push({ path: "tasks/", expected: "present", actual: "missing" });
  if (errors.length) failAndExit();

  const rows = readFileSync(indexPath, "utf8").split("\n")
    .map((l) => l.match(/^\|\s*(T\d\d)\b[^|]*\|\s*([^|]*)\|/))
    .filter(Boolean)
    .map((m) => ({ id: m[1], deps: (m[2].match(/T\d\d/g) ?? []) }));
  const ids = rows.map((r) => r.id);
  const files = readdirSync(tasksDir).filter((f) => /^T\d\d.*\.md$/.test(f)).map((f) => f.match(/^T\d\d/)[0]);

  if (new Set(ids).size !== ids.length) errors.push({ path: "index.md", expected: "unique task ids", actual: "duplicates" });
  for (const id of ids) if (!files.includes(id)) errors.push({ path: `tasks/${id}.md`, expected: "file for table row", actual: "missing" });
  for (const f of files) if (!ids.includes(f)) errors.push({ path: `index.md#${f}`, expected: "table row for file", actual: "missing" });
  for (const r of rows) for (const d of r.deps) if (!ids.includes(d)) errors.push({ path: `${r.id}.deps`, expected: "existing task", actual: `dangling ${d}` });

  // 环检测（DFS 三色）
  const color = new Map(ids.map((id) => [id, 0]));
  const adj = new Map(rows.map((r) => [r.id, r.deps.filter((d) => ids.includes(d))]));
  const dfs = (u) => {
    color.set(u, 1);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === 1) { errors.push({ path: u, expected: "acyclic deps", actual: `cycle via ${v}` }); return; }
      if (color.get(v) === 0) dfs(v);
    }
    color.set(u, 2);
  };
  for (const id of ids) if (color.get(id) === 0) dfs(id);

  function failAndExit() {
    console.error(JSON.stringify({ ok: false, schema: "plan-index", file: planDir, errors }, null, 2));
    process.exit(1);
  }
  if (errors.length) failAndExit();
  console.log(JSON.stringify({ ok: true, schema: "plan-index", file: planDir }, null, 2));
  process.exit(0);
}
```

（import 补 `readdirSync`；usage 文案补一行 plan-index 模式说明。）

- [ ] **步骤 4：运行测试确认通过**

运行：`node --test scripts/tests/plan-index.test.mjs`
预期：PASS ×4。全量：`node --test scripts/tests/` 预期全绿。

- [ ] **步骤 5：提交**

```bash
git add scripts/
git commit -m "feat(T25): validate-output 新增 plan-index 结构校验（一致性/悬空/环）"
```

## 收尾

### 任务 26：验收（acceptance-qa）

> 本任务由 executing-plans 收尾审查阶段触发 acceptance-qa 按下表执行，
> 不参与逐任务连续执行；报告与证据落盘特性目录 `acceptance/` 子目录。

| Scenario / 检查项 | 维度 | 执行方式 | 目标 | 阈值/预期 | 验收证据 |
|-------------------|------|---------|------|----------|---------|
| 既有平台装载不回归 | integration | 验收任务 (D) | Claude Code 重装本插件 + Codex `codex plugin` 校验链 | skill 数与升级前一致（13 个） | 安装日志 |
| 官方 AP schema 校验（任务 6 离线时挪此） | integration | 验收任务 (D) | `node scripts/validate-output.mjs agent-plugin-1.0.0 plugin.json` | ok:true | 命令输出 |
| pi 装载发现 skills / grok 兼容清单走查 | integration | 验收任务 (A) | pi/grok 环境或官方文档清单 | 有环境实测；无环境按文档走查并标注证据等级 | 走查记录 |
| MCP 残留引用为零 | integration | 验收任务 (D) | `rg 'mcp__sequential-thinking|mcpServers|check-mcp' --glob '!CHANGELOG.md' --glob '!.spec-dev/**' --glob '!skills/anysearch/**' --glob '!skills/sequential-thinking/**' --glob '!skills/acceptance-qa/references/mcp-setup.md' .` | 零命中 | rg 输出 |
| validate-skills / check-openai-sync / check-plugin / node --test 全绿 | integration | 验收任务 (D) | 四条命令 | 全部退出码 0 | CI 输出 |
| 双语 README 与 description 同步 | docs | 验收任务 (D) | check-openai-sync + README 平台矩阵双语对照 | 通过 | 命令输出 + diff |
| 全运行时缺失降级不中断 | docs | 验收任务 (A) | sequential-thinking evals st-degrade-no-runtime | eval 断言成立 | eval 记录 |
| 无 MCP 环境的对抗验证（消费点改写） | docs | 验收任务 (A) | requirement-analysis 阶段 4 演练（无 MCP 配置环境） | 分点推演完成、不中断 | 演练记录 |
| Lane 归属翻译 / 原则裁决行 | docs | 验收任务 (A) | test-strategy evals ts-lane-annotation + 阶段 4 演练 | eval 断言成立 | eval 记录 |
| 胶囊续接不重扫 / 交付回写追加注意事项 | docs | 验收任务 (A) | requirement-analysis evals ra-roadmap-capsule-continuation | eval 断言成立 | eval 记录 |
| 披露继承 / 分岔转漏斗 / near-miss | docs | 验收任务 (A) | clarifying + exploring evals（cl-disclosure…/ex-fork-funnel/ex-no-fork-no-funnel） | eval 断言成立 | eval 记录 |
| 单文件/分文件登记纪律两场景 | docs | 验收任务 (A) | progressive-execution.md 演练（模拟创建资源） | 登记落点正确（台账行 vs progress.resources） | 演练记录 |
| 新会话恢复 + 不一致停下 | integration | 验收任务 (A) | 用临时目录构造 progress.yaml（完成 T01-T04）演练恢复 | 从 T05 续跑、缺文件时停下报告 | 演练记录 |

### 任务 27：合并与清理

**资源台账**（清理依据；写计划时预登记已知资源，执行中创建即追加；行格式 `- [ ] <类型>: <标识> —— <清理命令>`）：

- [ ] worktree: .worktrees/plan-2026-08-26-01-major-upgrade —— `git worktree remove .worktrees/plan-2026-08-26-01-major-upgrade && git branch -d plan/2026-08-26-01-major-upgrade`

台账总则：**清理只遍历本台账、台账外一律不动**（可疑残留只报告不删）；共享缓存默认保留；台账限定持久资源，worktree 内构建产物随 worktree 删除自然回收、不入账。

- [ ] **步骤 1：全量验证（安全网）与归属裁决**

在 worktree 内运行：`node --test scripts/tests/ && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs && node scripts/check-plugin.mjs && bash scripts/tests/visual-path.test.sh`
- 全绿 → 进入步骤 2。
- 失败在相关测试范围内 → 修复复跑。
- 失败在范围外 → 归属裁决：源分支检出上复跑；既有失败报用户裁决，本次引入的回归修复后继续。

- [ ] **步骤 2：测试退役检查**

扫描「相关测试范围」内测试找孤儿（测试名对不上任何 active spec 现行 Scenario 且对应 Requirement 已 REMOVED/被 Superseded 标注/所属 spec superseded，双条件缺一不可）。本计划为全新增测试，预期声明"无孤儿测试"后跳过；resource-ledger 被取代两条 Requirement 的既有 Scenario 若有同名测试（rg 按 Scenario 名核对），列清单征询用户。

- [ ] **步骤 3：取代回写（本 spec `supersedes` 非空）**

按 spec「取代与共存」节执行部分取代：
- `.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md` 的「Requirement: 执行中创建即登记」与「Requirement: writing-plans 最终任务模板含资源台账（改了什么：清理步骤由固定 worktree 命令扩为台账遍历，新增台账小节）」两条标题下各插入：
  `> **Superseded (2026-08-26)** — by .spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md#资源登记纪律按计划形态分流；原文保留仅作历史参考。`
- H1 下的 `Superseded-pending (2026-08-26)` 行移除。
- 分面共存的四份 spec 零回写；提交命中其 covers 时按双声明规则同步或 `Spec-Guard: off` trailer 放行。

- [ ] **步骤 4：合并回来源分支**

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"
git merge plan/2026-08-26-01-major-upgrade
```

合并冲突、或主工作区有未提交改动 → 停下向计划作者确认，不强行合并。

- [ ] **步骤 5：清理（按资源台账逐条执行）**

逐条执行台账各行清理命令并勾选。失败行保留未勾选并报告；已不存在的资源勾选注明。

- [ ] **步骤 6：sync_commit 锚定**

```bash
SYNC=$(git rev-parse HEAD)
# 把 spec frontmatter 的 sync_commit: null 更新为 $SYNC
git add .spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md
git commit -m "chore(spec): sync_commit 锚定 ${SYNC:0:7}"
```
