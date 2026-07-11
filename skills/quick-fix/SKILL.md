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
  - 改动**命中**某 active spec 的 covers → 提交用 `SPEC_DEV_GUARD=off git commit` 执行（该环境变量注入 commit 进程，令其 pre-commit 的提交期 `--staged` 闸放行——`--staged` 不识别 trailer，只认这个变量），并在 message 留 `Spec-Guard: off <原因>` trailer（trailer 才是 pre-push 与 CI 区间闸的放行凭证）。环境变量管本地提交期闸、trailer 管 push/CI 区间闸，二者配合、缺一不可。
- **编辑期 hook 单独处理**：装了 guardrail 编辑期 hook（`--hook`）的仓库，因 hook 只认"文件是否命中 covers"、不认"契约是否改变"，改 covers 覆盖文件在**编辑动作发生时**就会被拦——这道闸早于 commit、不被上面的 `git commit` 前缀覆盖（`--hook` 进程环境由平台在 Edit 工具调用时设定）。所以契约不变分支要让编辑期放行，实际手段是让**写文件动作本身带上 `SPEC_DEV_GUARD=off`**：优先用 Bash 侧带该变量的写入命令（如 `SPEC_DEV_GUARD=off` 前缀的重定向/脚本）落盘改动，绕开受 hook 约束的 Edit 工具；或在会话/hook 进程环境层面置该变量。被拦时向用户说明"这是契约不变的内部修复"，经确认后再继续。**不静默绕过、不伪造 spec 同步。**

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
