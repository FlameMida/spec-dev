# quick-fix skill 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。步骤用复选框（`- [ ]`）语法跟踪；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：为 spec-dev 插件新增 quick-fix skill（轻量 bug 修复工作流），并接入 exploring/requirement-analysis 双向路由与全部注册面。

**Spec**：`.spec-dev/2026-07-11-quick-fix-skill/spec/quick-fix-skill-design.md`

**架构**：方案 A——单一 SKILL.md 纯文本指令承载 6 步流程（与 exploring 同构，无 references/、无 scripts/）+ Codex 接口文件 openai.yaml + evals 双件；再修改 requirement-analysis/exploring 两 skill 的分界措辞及各自 openai.yaml，同步三处清单与 README 双版。

**技术栈**：Markdown（SKILL.md）、YAML（openai.yaml）、JSON（evals、清单）；校验脚本 Node.js（`.githooks/pre-commit` 链）。

## 全局约束

- **双语惯例**：SKILL.md frontmatter description、openai.yaml short_description/default_prompt、两份 plugin.json 的 description/interface 字段——一律「English 描述 / 中文描述」以 ` / ` 分隔；SKILL.md frontmatter 后紧跟的「Language Protocol / 语言协议」blockquote 逐字复制现有 skill（两行，英文行 + 中文行）；SKILL.md 指令正文纯中文不翻译（依据 ADR-0001）。
- **openai.yaml 同步 tripwire**（`scripts/check-openai-sync.mjs`）：任何 skill 的 SKILL.md 被暂存时，必须同时暂存该 skill 的 `agents/openai.yaml`，否则 pre-commit 失败——凡改 SKILL.md 的任务，同一提交必须带上对应 openai.yaml。
- **openai.yaml 6 必需键**：`interface.display_name`、`interface.short_description`、`interface.default_prompt`、`policy.allow_implicit_invocation`（校验见 `scripts/check-openai-sync.mjs:16-23`）。
- **版本号与 CHANGELOG 自动**：三处版本号（两份 plugin.json + marketplace.json 的 metadata.version，当前 7.5.3）与 CHANGELOG.md 条目由 post-commit `release.mjs --auto` 生成，**本计划不手动改版本号、不手写 CHANGELOG**。
- **不碰的组件**：不修改 `guardrail/`、`test-driven-development`、`acceptance-qa` 任何代码（纯复用/消费）；不建辅助脚本。
- **pre-commit 校验链必须全绿**：`check-plugin.mjs --codex-validate`、`validate-skills.mjs`、`check-openai-sync.mjs`、`git diff --cached --check`。

---

### 任务 0：建立隔离工作区

- [ ] **步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，跳过本任务。

- [ ] **步骤 2：建立 worktree**

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用（Codex 无原生 worktree 工具，直接走下面的手工路径）；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/plan-2026-07-11-quick-fix-skill -b plan/2026-07-11-quick-fix-skill` 并切换到该目录。

- [ ] **步骤 3：安装依赖并验证基线**

本仓库为 Node.js 工具链。运行：
```bash
git config core.hooksPath .githooks   # 启用版本化 hooks（新 worktree 需重设本地 config）
node scripts/check-plugin.mjs && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs
```
预期：三个校验脚本全部通过（基线干净）。任一失败 → 停下报告，先问再继续。

> 说明：本仓库无 `package.json` 依赖需 `npm install`；校验脚本零依赖。`core.hooksPath` 在新 worktree 里需重新指向 `.githooks`，否则 pre-commit 不生效。

---

## 新增 quick-fix skill

### 任务 1：写入 quick-fix SKILL.md

**文件**：
- 创建：`skills/quick-fix/SKILL.md`

**接口**：
- 产出：skill 名 `quick-fix`；frontmatter description 双语；正文 6 步流程。任务 3/4 的分界措辞、任务 5/6 的清单与 README 都引用此 skill 名。

- [ ] **步骤 1：写失败测试（校验缺失即红）**

运行：`test -f skills/quick-fix/SKILL.md && echo EXISTS || echo MISSING`
预期：`MISSING`（文件尚未创建，作为"红"基线）。

- [ ] **步骤 2：创建 SKILL.md，写入以下完整内容**

创建 `skills/quick-fix/SKILL.md`，内容为：

````markdown
---
name: quick-fix
description: >-
  Lightweight bug-fix workflow - for fixes already decided on with no design space (small bugs, minor adjustments, post-plan tweaks): locate root cause with spec back-lookup, confirm one question at a time, fix under TDD, optional acceptance. Splits on contract impact to avoid spec drift; escalates to requirement-analysis on contract-crossing / cross-module / new-dependency signals. Not for new features or anything with design space (use requirement-analysis), nor for undecided ideas (use exploring). / 轻量 bug 修复工作流——已决定要修、无设计空间的小修复（小 bug、小调整、计划执行后的小问题）时使用：定位根因（含 spec 反查）、逐题校对、TDD 修复、可选验收。按契约影响分流以规避 spec 漂移；根因涉及跨 spec 契约/跨模块/新依赖时建议升级 requirement-analysis。不适用于新功能或任何有设计空间的需求（用 requirement-analysis），也不适用于尚未决定要不要做的想法（用 exploring）。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

# 轻量修复（Quick-Fix）

处理"已决定要修、无设计空间"的小 bug 修复与小调整，走"定位根因 → 逐题校对 → TDD 修复 → 可选验收"的最短路径；以 spec 反查与契约分流保证修复不制造文档漂移。

**开始时声明**：「我正在使用 quick-fix skill 修复这个问题。」

**这是最短路径，不是免设计的后门。** 一旦根因触及行为契约的跨模块改动或新依赖，就把控制权交还用户、建议升级 requirement-analysis——放松的是流程重量，不是漂移防护。

## 定位：分诊三角里的位置

| skill | 承诺状态 | 设计空间 | 终态 |
|-------|---------|---------|------|
| exploring | 未承诺（还在想要不要做） | — | 交接 requirement-analysis |
| **quick-fix** | **已承诺 + 无设计空间**（小 bug、小调整） | **无** | **修复完成并验证** |
| requirement-analysis | 已承诺 + 有设计空间 | 有 | 交接 writing-plans |

## 流程（6 步）

### 步骤 1：接收问题 + 入口分诊自检

理解要修的 bug/调整。**入口分诊自检**：若发现这其实不是"无设计空间的小修"——请求措辞是新功能、涉及多个子系统、或用户还在犹豫要不要做——立即建议改用 requirement-analysis（有设计空间）或 exploring（未承诺），等待用户裁决，不硬留在 quick-fix。

### 步骤 2：定位根因 + spec 反查

- **根因定位**：轻量场景主线程直查（Grep/Glob/Read）；根因不明朗时可派 1 个 `code-explorer` 子代理只读追踪（失败则缩小范围重试 1 次，再失败主线程接管）。
- **spec 反查**（防漂移的第一道视野拉入）：用嫌疑改动文件反查哪些 spec 拥有它。发现范围**必须与守卫逐字对齐**——Grep 这三条 glob：`docs/**/spec/*-design.md`、`docs/**/*-design.md`、`.specs/**/*.md`，解析各文件 frontmatter，筛出 `spec_dev.status: active` 且 `covers` glob 命中嫌疑文件的 spec，把其相关 Requirement/Scenario 读入上下文。这一步同时服务根因分析（spec 写着预期行为，帮判断是"实现偏离 spec"还是"spec 本身写错了"）。
- **不硬依赖 guardrail**：反查是本 skill 的指令层动作（纯 Grep + 读 frontmatter），不要求目标仓库装过 `check-spec-drift.mjs`；若恰好装了（`scripts/spec-dev/check-spec-drift.mjs` 存在），可顺带 `node scripts/spec-dev/check-spec-drift.mjs --files <改动文件>` 复核，属优雅降级。

### 步骤 2.5：升级门（用户裁决式护栏）

基于**看过代码根因之后**的事实判定——比分诊时拍脑袋准。命中以下任一即停下：

- **行为契约变更且跨越单一 spec 覆盖范围**（改动会改变多个 spec 描述的行为，或需在多个 spec 间协调）；
- **跨模块改动**（根因修复需要动多个模块、牵连面超出单点）；
- **引入新依赖**（需要新第三方库/框架）。

命中时向用户呈现两个选项：**升级到 requirement-analysis** / **明确坚持在 quick-fix 继续**。不自动切换、不强制终止。**若用户坚持继续且修复改变契约，仍强制走步骤 5a 的 spec 同步分支**——护栏放松的是流程重量，不是漂移防护。升级经用户同意后调用 requirement-analysis skill。

### 步骤 3：逐题校对（一次一个问题）

沿用 requirement-analysis 的提问纪律（Claude Code 用 `AskUserQuestion`，Codex 用对话消息；一次一个、选择题优先、先查后问）。核心确认三类：

1. **根因认定**对不对；
2. **修复方案**选哪个（有多个修法时）；
3. **本次修复是否改变 spec 描述的行为契约**——这题机器判不了，必须问人，是步骤 4 分流的依据（附命中 spec 的相关小节引用供用户判断）。

### 步骤 4：契约影响判定（分流点）

依据步骤 3 第 3 问的答案分流。判定"改变契约"= 修复改变了某 active spec 中 Requirement/Scenario 所描述的可观察行为。改变 → 5a；不变 → 5b。

### 步骤 5a：TDD 修复 + 同步 spec 小节（契约改变，单 spec 内）

- **强制 TDD**：先写复现 bug 的失败测试 → 确认红（失败原因是功能缺陷而非拼写）→ 最小实现转绿 → 重构。遵循 test-driven-development skill 铁律；仅配置文件/纯文案/一次性原型等 TDD 既有例外适用（需用户同意）。
- **同步 spec**：修改命中 spec 的对应 Requirement/Scenario 小节，使其与新行为一致（不重写设计，只改被影响的那几行）。
- **spec 增量提交前给用户过目**：把 spec 小节改动展示给用户确认。
- **提交**：spec + 代码 + 测试同一 commit，天然通过 `--staged`/`--push`/CI 守卫（spec 与代码同步）。

### 步骤 5b：TDD 修复 + trailer 放行（契约不变）

- **强制 TDD** 同 5a。
- **不改 spec**（契约没变，spec 没说谎）。
- **提交按守卫安装情况分两种**：
  - 改动**未命中**任何 active spec 的 covers → 普通提交即可，无需环境变量或 trailer。
  - 改动**命中**某 active spec 的 covers → 提交必须以 `SPEC_DEV_GUARD=off git commit` 执行（过编辑期 `--hook` 与提交期 `--staged` 两道本地闸，二者都不识别 trailer），并在 message 留 `Spec-Guard: off <原因>` trailer（过 pre-push 与 CI 区间闸）——环境变量与 trailer 二者配合、缺一不可。
- **编辑期拦截交互**：装了 guardrail 编辑期 hook 的仓库，因 hook 只认"文件是否命中 covers"、不认"契约是否改变"，改 covers 覆盖文件在**编辑时**就会被拦。此时向用户说明"这是契约不变的内部修复"，经用户确认后以 `SPEC_DEV_GUARD=off` 执行编辑与提交并留 trailer（环境变量实际注入点在 Bash 侧 `git commit`）。**不静默绕过、不伪造 spec 同步。**

### 步骤 6：可选自动化验收

询问用户一次是否触发 acceptance-qa（选择题）：

- **要** → 触发 acceptance-qa skill。输入按 spec 命中情况装配：命中 active spec 则传 spec 路径 + 变更文件清单（acceptance-qa 按变更面裁剪矩阵）；未命中则由 acceptance-qa 现场生成迷你矩阵。无需改动 acceptance-qa。
- **不要** → 至少运行受影响的测试文件作为最低验证，区分"本次新增失败"与"既有失败"，结果呈现给用户，不留"没验证"空白。

## 与 guardrail 的关系

skill 体系与守卫此前的唯一连接是 requirement-analysis 写 spec frontmatter 锚点。quick-fix 是第二个连接点：**消费**这些锚点（反查 covers/status）驱动修复决策，并在两分支上分别用"同步 spec"和"trailer 放行"与守卫协作。quick-fix 不改 guardrail 任何代码，是纯消费方 + 优雅降级。

## 执行环境兼容性

| 用途 | Claude Code | Codex |
|------|-------------|-------|
| 用户澄清/确认 | `AskUserQuestion`（单题带选项） | 对话消息提问并等待回复 |
| 根因探索子代理 | `Agent`（subagent_type: code-explorer） | `spawn_agent`（`fork_turns: "none"`）+ `wait_agent` |
| 复用 TDD/验收 | 引用 test-driven-development、触发 acceptance-qa | 同左（skill 通用） |

sequential-thinking MCP 不可用时降级为回复中分点推演。Codex 沙箱下 `SPEC_DEV_GUARD=off git commit` 与守卫交互同 Claude；沙箱禁止 commit 时请用户在沙箱外执行。

## Red Flags

- "这个新功能顺手在 quick-fix 里做了吧" → 有设计空间就升级 requirement-analysis，quick-fix 不是免设计后门
- "契约变了但我 trailer 放行更快" → 契约变更强制走 5a 同步 spec，trailer 只给契约不变的修复
- "先改代码再补测试" → 强制 TDD，先写复现失败测试
- "编辑被守卫拦了就偷偷 spec 改一行糊弄过去" → 契约不变就走 SPEC_DEV_GUARD=off + trailer，不伪造 spec 同步
- "跨了三个模块但应该算小修吧" → 跨模块命中升级门，交用户裁决
- "反查 glob 少写一条无所谓" → 必须与守卫三条逐字对齐，否则分流与守卫拦截面错位
````

- [ ] **步骤 3：运行校验确认通过**

运行：
```bash
test -f skills/quick-fix/SKILL.md && echo EXISTS
node scripts/validate-skills.mjs
```
预期：`EXISTS`；`validate-skills.mjs` 对 quick-fix 的 frontmatter 校验通过（name + description 齐全）。

> 注意：此时 `check-openai-sync.mjs` 尚未通过（openai.yaml 未建），故本任务**不单独提交**——与任务 2 合并为一个提交，见任务 2 步骤 5。

---

### 任务 2：写入 quick-fix 的 openai.yaml 与 evals

**文件**：
- 创建：`skills/quick-fix/agents/openai.yaml`
- 创建：`skills/quick-fix/evals/evals.json`
- 创建：`skills/quick-fix/evals/trigger-evals.json`

**接口**：
- 消费：任务 1 的 skill 名 `quick-fix` 与 description（openai.yaml 的 short_description 与之语义一致）。
- 产出：Codex 接口文件 + evals；让 pre-commit 的 `check-openai-sync.mjs` 通过。

- [ ] **步骤 1：写失败测试（同步校验即红）**

运行：`node scripts/check-openai-sync.mjs 2>&1 | tail -3 || true`
预期：报 quick-fix 缺 openai.yaml（红基线）。若脚本仅校验暂存区未报，改运行 `test -f skills/quick-fix/agents/openai.yaml && echo EXISTS || echo MISSING` 预期 `MISSING`。

- [ ] **步骤 2：创建 agents/openai.yaml**

创建 `skills/quick-fix/agents/openai.yaml`，内容为：

```yaml
interface:
  display_name: "Quick Fix"
  short_description: "Lightweight bug-fix workflow - for fixes already decided on with no design space (small bugs, minor adjustments): root cause with spec back-lookup, one-question-at-a-time confirmation, TDD fix, optional acceptance; splits on contract impact to avoid spec drift, escalates to requirement-analysis on contract-crossing / cross-module / new-dependency signals. Not for new features or design-space work (use requirement-analysis), nor undecided ideas (use exploring). / 轻量 bug 修复工作流：已决定要修、无设计空间的小修复——定位根因（含 spec 反查）、逐题校对、TDD 修复、可选验收；按契约影响分流规避 spec 漂移，涉及跨 spec 契约/跨模块/新依赖时升级 requirement-analysis。不适用于新功能或有设计空间的需求（用 requirement-analysis），也不适用于尚未决定要不要做的想法（用 exploring）。"
  default_prompt: "Use $quick-fix to fix this small bug or adjustment end-to-end without the full design workflow. / 用 $quick-fix 直接修掉这个小 bug 或小调整，不走完整设计流程。"

policy:
  allow_implicit_invocation: true
```

- [ ] **步骤 3：创建 evals/evals.json**

创建 `skills/quick-fix/evals/evals.json`，内容为：

```json
{
  "skill_name": "quick-fix",
  "evals": [
    {
      "id": "qf-small-bug-triggers",
      "prompt": "修一下这个 bug：列表分页翻到第 0 页会崩溃",
      "expected_output": "进入 quick-fix：入口分诊判定为无设计空间的小修，定位根因并对嫌疑文件做 spec 反查（三条 glob 对齐守卫）；逐题确认根因/方案/是否改变契约；强制 TDD 先写复现失败测试再修；按契约影响分流提交；收尾询问是否触发 acceptance-qa"
    },
    {
      "id": "qf-escalate-cross-module",
      "prompt": "（quick-fix 中）根因定位发现要同时改认证模块和会话模块才能修",
      "expected_output": "升级门命中（跨模块）：停下向用户说明升级信号与继续修的风险，呈现『升级 requirement-analysis / 坚持在 quick-fix 继续』两选项，不擅自继续；用户坚持继续且契约变更时仍强制 spec 同步"
    },
    {
      "id": "qf-contract-change-syncs-spec",
      "prompt": "（quick-fix 中）用户确认这次修复会改变导出 spec 描述的错误提示行为，且只涉及该 spec",
      "expected_output": "走 5a 分支：TDD 修复 + 同步该 spec 的对应 Requirement/Scenario 小节，spec 增量展示给用户过目，spec+代码+测试同一提交"
    },
    {
      "id": "qf-contract-stable-trailer",
      "prompt": "（quick-fix 中）用户确认修复不改变契约，但改动文件命中某 active spec 的 covers",
      "expected_output": "走 5b 分支：不改 spec，以 SPEC_DEV_GUARD=off git commit 提交并留 Spec-Guard: off <原因> trailer（环境变量过本地闸、trailer 过 push/CI 闸，二者配合）；装了编辑期 hook 被拦时向用户说明后经确认继续，不伪造 spec 同步"
    },
    {
      "id": "qf-new-feature-routes-away",
      "prompt": "用 quick-fix 给导出功能加一个 PDF 格式选项",
      "expected_output": "入口分诊自检判定该请求有设计空间（新功能），建议改用 requirement-analysis，不进入根因定位"
    }
  ]
}
```

- [ ] **步骤 4：创建 evals/trigger-evals.json**

创建 `skills/quick-fix/evals/trigger-evals.json`，内容为：

```json
{
  "skill_name": "quick-fix",
  "description_under_test": "见 SKILL.md frontmatter",
  "should_trigger": [
    { "id": "t1", "prompt": "修一下这个 bug：列表分页翻到第 0 页会崩溃" },
    { "id": "t2", "prompt": "刚跑完计划开发，发现导出的文件名少了时间戳，帮我调一下" },
    { "id": "t3", "prompt": "这个报错提示文案写错了，改成正确的" },
    { "id": "t4", "prompt": "登录超时时间从 30 分钟改成 60 分钟，就一个常量" },
    { "id": "t5", "prompt": "fix a small bug: the total count is off by one on the cart page" },
    { "id": "t6", "prompt": "这个函数边界情况没处理，空数组会抛异常，修一下" }
  ],
  "should_not_trigger": [
    { "id": "n1", "prompt": "给系统加一个用户权限管理功能" },
    { "id": "n2", "prompt": "重构一下整个订单模块，拆成多个服务" },
    { "id": "n3", "prompt": "我在想要不要把缓存层换成 Redis，帮我想想" },
    { "id": "n4", "prompt": "基于已批准的 spec 编写实施计划" },
    { "id": "n5", "prompt": "设计一个新的通知系统" },
    { "id": "n6", "prompt": "这个函数在哪里定义的？" },
    { "id": "n7", "prompt": "add a user permission management feature to the system" },
    { "id": "n8", "prompt": "not sure if we should adopt event sourcing - can we talk it through?" }
  ],
  "notes": "t1-t6 共同信号：已决定要修、无设计空间的小修（单点 bug、单常量、单文案、边界补全、计划后小调整）。n1/n2/n5 有设计空间（requirement-analysis 领地——新功能/跨模块重构/新系统设计）；n3 还在犹豫期（exploring 领地）；n4 属 writing-plans；n6 是单点事实问答（直接回答）。n2 特别用于检验『跨模块重构』被路由走——即使用户口语说『重构一下』，牵连多模块即超出 quick-fix。n7 英文新功能（requirement-analysis）、n8 英文犹豫期（exploring），检验英文侧双向互斥边界。这些 near-miss 检验 description 中『无设计空间 vs 有设计空间』与『已承诺 vs 未承诺』的双重边界。"
}
```

- [ ] **步骤 5：运行校验并提交（任务 1+2 合并提交）**

运行：
```bash
node scripts/check-openai-sync.mjs
node scripts/validate-skills.mjs
node scripts/check-plugin.mjs
```
预期：三者全部通过（quick-fix 现有 SKILL.md + openai.yaml，同步校验过；plugin 结构校验过）。

提交：
```bash
git add skills/quick-fix/
git commit -m "feat(T1-T2): 新增 quick-fix skill（SKILL.md + openai.yaml + evals）"
```

> 说明：quick-fix 的 covers 是 `skills/quick-fix/**`，本次新建的正是这些文件且 spec 已随之落盘（spec 与代码同一特性周期），不构成漂移；若本地装了编辑期 hook 对 skills/quick-fix/** 报拦截，说明 spec 未在工作区——确认 spec 已提交即可，必要时 `SPEC_DEV_GUARD=off` 提交并留 trailer。

---

## 接入双向路由

### 任务 3：requirement-analysis 加"小修检查" + description 互指

**文件**：
- 修改：`skills/requirement-analysis/SKILL.md`（阶段 1 意图承诺检查处 + frontmatter description）
- 修改：`skills/requirement-analysis/agents/openai.yaml`（short_description 同步）

**接口**：
- 消费：quick-fix skill 名（任务 1）。
- 产出：requirement-analysis → quick-fix 的"建议切换"路由（向更少承诺方向用建议式）。

- [ ] **步骤 1：写失败测试（grep 断言当前无 quick-fix 引用即红）**

运行：`grep -c "quick-fix" skills/requirement-analysis/SKILL.md`
预期：`0`（当前未提及，作为红基线）。

- [ ] **步骤 2：在阶段 1 意图承诺检查后补"小修检查"**

编辑 `skills/requirement-analysis/SKILL.md`，在"意图承诺检查"那一行（`- **意图承诺检查**：...` 结尾）之后、"范围分解检查"之前，新增一行：

```markdown
- **小修检查**：需求其实是"已决定要修、无设计空间"的小 bug 修复/小调整（单点 bug、单常量、单文案，无方案取舍、不跨模块、不引入新依赖）→ 建议切换 quick-fix skill，不硬拉八阶段；这是意图承诺检查的对偶——那边挡"还没决定要不要做"，这边挡"决定了但不值得走完整设计"。建议式（不自动切换），由用户裁决
```

- [ ] **步骤 3：更新 frontmatter description 与 openai.yaml，点名 quick-fix**

编辑 `skills/requirement-analysis/SKILL.md` frontmatter description，把中文侧结尾的"不适用于纯问答、跑测试、修复单行明显笔误等无设计空间的任务。"改为：

```
不适用于纯问答、跑测试、无设计空间的小 bug 修复/小调整（用 quick-fix）；想法尚未定型、还没决定要不要做时先用 exploring。
```

英文侧结尾的"not for pure Q&A, test runs or trivial one-line fixes."改为：

```
not for pure Q&A, test runs, or no-design-space small fixes (use quick-fix); use exploring first while the idea is unsettled.
```

同步修改 `skills/requirement-analysis/agents/openai.yaml` 的 `interface.short_description`，使其中文侧结尾与英文侧结尾与上面 SKILL.md 的改法一致（该字段是 SKILL.md description 的手工副本，两处必须语义一致）。

- [ ] **步骤 4：运行校验确认通过**

运行：
```bash
grep -c "quick-fix" skills/requirement-analysis/SKILL.md
node scripts/check-openai-sync.mjs
node scripts/validate-skills.mjs
```
预期：grep ≥ 2（正文小修检查 + description）；同步校验通过（SKILL.md 与 openai.yaml 同批修改）；skill 校验通过。

- [ ] **步骤 5：提交**

```bash
git add skills/requirement-analysis/SKILL.md skills/requirement-analysis/agents/openai.yaml
git commit -m "feat(T3): requirement-analysis 阶段 1 加小修检查 + description 点名 quick-fix"
```

> 说明：requirement-analysis 自身无 spec_dev 锚点覆盖（它是插件源码不是被 spec 覆盖的产品代码），本仓库对 skills/ 的漂移守卫锚点仅 quick-fix-skill spec 的 `skills/quick-fix/**`，本任务改的是 requirement-analysis 目录，不命中该 covers，普通提交即可。

---

### 任务 4：exploring 分界表加 quick-fix 行 + description 互指

**文件**：
- 修改：`skills/exploring/SKILL.md`（"与相邻 skill 的分界"表 + frontmatter description）
- 修改：`skills/exploring/agents/openai.yaml`（short_description 同步）

**接口**：
- 消费：quick-fix skill 名（任务 1）。
- 产出：exploring 分界表纳入 quick-fix，形成三方 description 互指闭环。

- [ ] **步骤 1：写失败测试（grep 断言当前无 quick-fix 引用即红）**

运行：`grep -c "quick-fix" skills/exploring/SKILL.md`
预期：`0`（红基线）。

- [ ] **步骤 2：分界表新增 quick-fix 行**

编辑 `skills/exploring/SKILL.md` 的"## 与相邻 skill 的分界"表格，在 `| "执行这份计划" | executing-plans |` 行之后新增一行：

```markdown
| "修一下这个 bug / 改一下这个小地方"（已决定、无设计空间） | quick-fix |
```

- [ ] **步骤 3：更新 frontmatter description 与 openai.yaml**

编辑 `skills/exploring/SKILL.md` frontmatter description，把中文侧结尾"单点事实问答（如"这个函数在哪定义"）也不适用。"改为：

```
单点事实问答（如"这个函数在哪定义"）也不适用；已决定要修的无设计空间小 bug/小调整用 quick-fix。
```

英文侧"Not for committed deliverables or single-fact lookups."改为：

```
Not for committed deliverables or single-fact lookups; for already-decided small fixes with no design space use quick-fix.
```

同步修改 `skills/exploring/agents/openai.yaml` 的 `interface.short_description` 结尾，与上面 SKILL.md 改法语义一致。

- [ ] **步骤 4：运行校验确认通过**

运行：
```bash
grep -c "quick-fix" skills/exploring/SKILL.md
node scripts/check-openai-sync.mjs
node scripts/validate-skills.mjs
```
预期：grep ≥ 2；同步校验通过；skill 校验通过。

- [ ] **步骤 5：提交**

```bash
git add skills/exploring/SKILL.md skills/exploring/agents/openai.yaml
git commit -m "feat(T4): exploring 分界表加 quick-fix 行 + description 互指"
```

---

## 注册面与文档

### 任务 5：三处清单登记 quick-fix

**文件**：
- 修改：`.claude-plugin/marketplace.json`（plugins[0].skills 数组）
- 修改：`.claude-plugin/plugin.json`（description + keywords）
- 修改：`.codex-plugin/plugin.json`（description + keywords + interface.longDescription + interface.defaultPrompt）

**接口**：
- 消费：quick-fix skill 名。
- 产出：三处清单含 quick-fix，`check-plugin.mjs` 通过。

- [ ] **步骤 1：写失败测试（断言清单未登记即红）**

运行：`grep -l "quick-fix" .claude-plugin/marketplace.json .claude-plugin/plugin.json .codex-plugin/plugin.json 2>/dev/null | wc -l`
预期：`0`（三处均未登记，红基线）。

- [ ] **步骤 2：marketplace.json 追加 skill 条目**

编辑 `.claude-plugin/marketplace.json`，在 `plugins[0].skills` 数组末尾（`"./skills/acceptance-qa"` 之后）追加，注意前一行补逗号：

```json
        "./skills/acceptance-qa",
        "./skills/quick-fix"
```

- [ ] **步骤 3：.claude-plugin/plugin.json 更新 description + keywords**

编辑 `.claude-plugin/plugin.json`：
- `description` 字段：在英文侧 "acceptance-qa (all-round acceptance)." 之前或之后自然并入 quick-fix（改为 "... test-driven-development (engineering discipline), acceptance-qa (all-round acceptance), quick-fix (lightweight bug-fix workflow)."），中文侧对应加 "、quick-fix 轻量修复"（在"acceptance-qa 全能验收"之后）。
- `keywords` 数组：在 `"requirements"` 之后追加 `"quick-fix"`（注意前一行补逗号）。

- [ ] **步骤 4：.codex-plugin/plugin.json 更新四处**

编辑 `.codex-plugin/plugin.json`：
- `description`：同任务 5 步骤 3 的 `.claude-plugin/plugin.json` description 改法（两份 plugin.json 的 description 一致）。
- `keywords`：在 `"requirements"` 后追加 `"quick-fix"`。
- `interface.longDescription`：在英文侧 "executing-plans executes ..." 句尾自然补一句 quick-fix 定位（如 "; quick-fix handles small already-decided fixes with no design space via a spec-back-lookup + contract-split fast path."），中文侧对应补 "；quick-fix 通过 spec 反查 + 契约分流的快路径处理已决定、无设计空间的小修复。"。
- `interface.defaultPrompt` 数组：在 acceptance-qa 那条之后、check MCP 那条之前，插入一条：
  ```json
      "Use quick-fix to fix a small bug without the full design workflow / 使用 quick-fix 直接修小 bug，不走完整设计流程",
  ```

- [ ] **步骤 5：运行校验确认通过**

运行：
```bash
node scripts/check-plugin.mjs
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json')); JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json')); JSON.parse(require('fs').readFileSync('.codex-plugin/plugin.json')); console.log('JSON OK')"
grep -l "quick-fix" .claude-plugin/marketplace.json .claude-plugin/plugin.json .codex-plugin/plugin.json | wc -l
```
预期：`check-plugin.mjs` 通过（三处版本仍一致、skills 结构合法）；`JSON OK`；grep 命中 `3`。

- [ ] **步骤 6：提交**

```bash
git add .claude-plugin/marketplace.json .claude-plugin/plugin.json .codex-plugin/plugin.json
git commit -m "feat(T5): 三处清单登记 quick-fix skill"
```

---

### 任务 6：README 双版登记 quick-fix

**文件**：
- 修改：`README.md`（Skill Pipeline 图、Codex skills 清单行、新增 `## Using quick-fix` 段、Directory Layout 树）
- 修改：`README.zh-CN.md`（对应四处镜像）

**接口**：
- 消费：quick-fix skill 名与定位。
- 产出：README 双版四处含 quick-fix，双版镜像一致。

- [ ] **步骤 1：写失败测试（断言双版未提及即红）**

运行：`grep -c "quick-fix" README.md README.zh-CN.md`
预期：两文件均 `0`（红基线）。

- [ ] **步骤 2：README.md 四处更新**

编辑 `README.md`：

(a) **Skill Pipeline 代码块**（约 line 24-37）：在 `executing-plans (...)` 分支之后、代码块闭合前补一行，表明 quick-fix 是旁路快车道：
```
quick-fix (already-decided small fix, no design space → root cause + spec back-lookup + contract split)
```

(b) **Standalone 段**（约 line 39，"Each skill also works standalone: ..."）：句尾补 "; quick-fix handles small already-decided fixes without the full design workflow."。

(c) **Codex skills 清单行**（约 line 57，`- \`skills/\`: \`exploring\`, ...`）：在 `\`acceptance-qa\`` 后追加 `, \`quick-fix\``。

(d) **新增 `## Using quick-fix` 段**：在现有各 `## Using <name>` 段落区（Using acceptance-qa 之后）插入：
```markdown
## Using quick-fix

For a bug or small adjustment you've already decided to make and that has no design space, invoke quick-fix instead of the full requirement-analysis workflow:

> Use quick-fix to fix this small bug end-to-end.

It locates the root cause (with a spec back-lookup aligned to the drift guard's `covers`), confirms root cause / fix / contract impact one question at a time, fixes under TDD, and splits on contract impact — syncing the owning spec when behavior changes, or committing with a `Spec-Guard: off` trailer when it does not — then optionally runs acceptance-qa. If the root cause turns out to cross a behavior contract across specs, span multiple modules, or need a new dependency, quick-fix stops and offers to escalate to requirement-analysis.
```

(e) **Directory Layout 树**（约 line 282-290）：在 skills 树的 `acceptance-qa/` 条目后补一行，注释风格对齐：
```
│   └── quick-fix/            # Lightweight bug-fix workflow
```
（注意调整前一条目的树线符号 `├──`/`└──`，使 quick-fix 成为最后一条 `└──`，原 acceptance-qa 改回 `├──`。）

- [ ] **步骤 3：README.zh-CN.md 四处镜像更新**

编辑 `README.zh-CN.md`，对应四处做中文镜像：

(a) Skill Pipeline 代码块补：`quick-fix（已决定、无设计空间的小修复 → 根因 + spec 反查 + 契约分流）`。

(b) Standalone 段句尾补 "；quick-fix 处理已决定、无设计空间的小修复，不走完整设计流程。"。

(c) Codex skills 清单行 `acceptance-qa` 后追加 `、quick-fix`。

(d) 新增 `## 使用 quick-fix` 段（措辞与英文版对应）：
```markdown
## 使用 quick-fix

对于已经决定要修、且没有设计空间的 bug 或小调整，调用 quick-fix，而不是走完整的 requirement-analysis 流程：

> 用 quick-fix 直接把这个小 bug 修好。

它会定位根因（含与漂移守卫 `covers` 对齐的 spec 反查），逐题确认根因/修复方案/契约影响，在 TDD 下修复，并按契约影响分流——行为改变则同步对应 spec，不变则以 `Spec-Guard: off` trailer 提交——最后可选触发 acceptance-qa。若根因涉及跨 spec 的行为契约、跨多个模块或需要新依赖，quick-fix 会停下并提议升级到 requirement-analysis。
```

(e) Directory Layout 树补 `quick-fix/` 条目（中文注释"轻量 bug 修复工作流"），同样调整树线符号。

- [ ] **步骤 4：运行校验确认通过**

运行：
```bash
grep -c "quick-fix" README.md README.zh-CN.md
```
预期：两文件均 ≥ 4（四处更新各至少一次命中）。人工快速核对双版四处结构镜像一致。

- [ ] **步骤 5：提交**

```bash
git add README.md README.zh-CN.md
git commit -m "docs(T6): README 双版登记 quick-fix skill"
```

---

### 任务 7：验收（acceptance-qa）

> 本任务由 executing-plans 收尾审查阶段触发 acceptance-qa 按下表执行，不参与逐任务连续执行；报告与证据落盘特性目录 `acceptance/` 子目录。因本特性为文档型交付（无运行时代码、无浏览器/性能维度），验收以 AI 自主核对（Tier A）为主。

| Scenario / 检查项 | 维度 | 执行方式 | 目标 | 阈值/预期 | 验收证据 |
|-------------------|------|---------|------|----------|---------|
| pre-commit 校验链全绿 | integration | 验收任务 (D) | `.githooks/pre-commit` 全链 | check-plugin --codex-validate / validate-skills / check-openai-sync / diff --check 全部退出 0 | 命令输出 |
| trigger-evals：should_trigger 覆盖小修场景、should_not_trigger 覆盖"新功能/跨模块重构/犹豫期/写计划/事实问答"五类且能被 description 正确区分 | — | 验收任务 (A) | `skills/quick-fix/evals/trigger-evals.json` 逐条对照 SKILL.md description | 每条 near-miss 判定与预期一致 | 核对记录 |
| README 双版四处注册面齐全且镜像一致 | — | 验收任务 (A) | README.md / README.zh-CN.md | Skill Pipeline、清单行、Using 段、Directory Layout 四处双版对齐 | 对照清单 |
| 三方 description 互指闭环（exploring/quick-fix/requirement-analysis 各自点名相邻 skill 划界） | — | 验收任务 (A) | 三 skill 的 frontmatter description | 三方边界措辞无缺口、无矛盾 | 引用摘录 |

- [ ] 验收执行：由 executing-plans 收尾触发 acceptance-qa，输入 = 本 spec 路径 + 本次变更文件清单 + 证据目录 `.spec-dev/2026-07-11-quick-fix-skill/acceptance/`。

---

### 任务 8：合并与清理

- [ ] **步骤 1：全量验证**

在 worktree 内运行完整校验链，确认全绿：
```bash
node scripts/check-plugin.mjs --codex-validate
node scripts/validate-skills.mjs
node scripts/check-openai-sync.mjs
```
失败 → 修复后才进入合并。

- [ ] **步骤 2：合并回来源分支**

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"   # 回到主工作区
git merge plan/2026-07-11-quick-fix-skill
```
合并冲突、或主工作区有未提交改动 → 停下向计划作者确认，不强行合并。

- [ ] **步骤 3：清理**

```bash
git worktree remove .worktrees/plan-2026-07-11-quick-fix-skill
git branch -d plan/2026-07-11-quick-fix-skill
```

> 任务 0 未由本计划建立 worktree（此前已在隔离环境、原生工具建立、或降级原地执行）→ 只执行步骤 1，步骤 2-3 交回原有隔离机制收尾并注明。
