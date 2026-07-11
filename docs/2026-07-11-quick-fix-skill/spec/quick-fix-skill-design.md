---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——
spec_dev:
  version: 1
  feature: quick-fix-skill
  status: active           # draft | active | superseded —— 仅 active 参与漂移拦截
  covers:
    - "skills/quick-fix/**"
  sync_commit: null
---

# quick-fix skill 设计

## 背景与目标

spec-dev 管线对"极小 bug 修复/小调整"没有合适入口：requirement-analysis 八阶段成本过高，绕过管线直接修又会触发（或静默积累）spec 文档漂移。新增手动触发的轻量修复 skill——quick-fix，走"定位根因→逐题校对→TDD 修复→可选验收"的最短路径，以 spec 反查与契约分流保证修复不制造漂移。

**成功标准**：用户对小修复调用 quick-fix 后，能在不走八阶段的前提下完成修复与验证；所有触碰 active spec covers 的改动要么同步 spec、要么带 `Spec-Guard: off` trailer 放行，全链路守卫（若安装）无一被静默绕过；有设计空间的需求被路由回 requirement-analysis。

## 非目标

- 不做成 requirement-analysis 的执行档位（见 ADR 0002）
- 不修改 guardrail、test-driven-development、acceptance-qa 的任何代码（纯复用/消费）
- 不引入辅助脚本（spec 反查用 Grep + 读 frontmatter 即可）
- 不产出 spec/plan 文档（quick-fix 的产物就是修复提交本身）

## 术语表

- **契约变更**：修复改变了某 `status: active` spec 中 Requirement/Scenario 所描述的可观察行为。_Avoid_：行为变更（口语泛称）、breaking change（限缩为 API 语境）
- **升级门**：quick-fix 在看过代码根因后判定"应建议升级 requirement-analysis"的护栏。_Avoid_：硬门（本设计为用户裁决式，非强制终止）
- **spec 反查**：用嫌疑改动文件反查哪些 active spec 的 `covers` glob 命中它。

## 影响面

- 新增 `skills/quick-fix/`（SKILL.md、agents/openai.yaml、evals/evals.json、evals/trigger-evals.json）
- 修改 `skills/requirement-analysis/`（SKILL.md 阶段 1 小修检查 + description；agents/openai.yaml 同步）
- 修改 `skills/exploring/`（SKILL.md 分界表 + description；agents/openai.yaml 同步）
- 修改注册面：`.claude-plugin/marketplace.json`、`.claude-plugin/plugin.json`、`.codex-plugin/plugin.json`、`README.md`、`README.zh-CN.md`
- CHANGELOG 与三处版本号由 post-commit `release.mjs --auto` 自动处理

## 已确认的关键决策

- 独立 skill 手动触发，不做 requirement-analysis 档位 —— 终态相反（修复完成 vs 交接 writing-plans）、档位化会破坏 HARD-GATE 不变量并引入分诊漂移（详见 `../../adr/0002-quick-fix-as-standalone-skill.md`）
- 升级门为用户裁决式 —— 命中升级信号时呈现"升级/坚持继续"两选项，不强制终止；用户坚持继续时契约变更仍强制 spec 同步（放松流程重量，不放松漂移防护）
- 默认原地修，不建 worktree —— 与快修时间预期匹配；工作区已有无关脏改动时提醒用户（可选 stash 或切 worktree）
- 契约分流边界 —— 契约变更但局限单一 spec 覆盖范围且无新依赖：留在 quick-fix 同步 spec 小节；跨 spec 协调/跨模块/新依赖：触发升级门
- 强制 TDD —— 修复一律先写复现失败测试（遵循 test-driven-development skill 铁律与既有例外条款）
- spec 反查不硬依赖 guardrail —— 反查是 skill 指令层动作（Grep + 读 frontmatter）；目标仓库装了守卫时可调 `check-spec-drift.mjs --files` 复核，属优雅降级

## 行为规范（Requirements）

### Requirement: 入口分诊自检

quick-fix 被触发后，发现请求实为有设计空间的需求（新功能、行为设计、多方案取舍）或用户仍在犹豫期时，SHALL 在开始修复前建议改用 requirement-analysis 或 exploring，并等待用户裁决。

#### Scenario: 新功能请求被路由走

- **GIVEN** 用户以 quick-fix 触发"给导出功能加一个 PDF 格式选项"
- **WHEN** quick-fix 执行入口分诊自检
- **THEN** 指出该请求有设计空间，建议改用 requirement-analysis，不进入根因定位

#### Scenario: 小 bug 修复正常进入

- **GIVEN** 用户以 quick-fix 触发"列表分页在第 0 页时崩溃"
- **WHEN** quick-fix 执行入口分诊自检
- **THEN** 判定为无设计空间的修复，进入根因定位

### Requirement: spec 反查

quick-fix 在定位根因时 SHALL 用嫌疑改动文件反查仓库内 `status: active` spec 的 `covers` glob，反查的 spec 发现范围 SHALL 与守卫 `loadActiveSpecs` 逐字对齐（三条 glob：`docs/**/spec/*-design.md`、`docs/**/*-design.md`、`.specs/**/*.md`），把命中 spec 的相关 Requirement/Scenario 读入上下文；反查 SHALL NOT 依赖目标仓库安装过 guardrail 脚本。

#### Scenario: 命中 active spec

- **GIVEN** 嫌疑文件 `src/export/pager.ts` 被 `docs/2026-06-01-export/spec/export-design.md`（status: active，covers 含 `src/export/**`）覆盖
- **WHEN** quick-fix 执行 spec 反查
- **THEN** 该 spec 的相关小节被读入上下文，后续契约判定以其为基准

#### Scenario: 无 spec 仓库退化

- **GIVEN** 目标仓库没有任何带 `spec_dev` frontmatter 的 spec
- **WHEN** quick-fix 执行 spec 反查
- **THEN** 反查结果为空，流程继续（契约分流退化为普通提交，不留 trailer 要求）

### Requirement: 升级门（用户裁决式）

根因定位后发现修复涉及跨 spec 契约协调、跨模块改动或新依赖时，quick-fix SHALL 停下向用户呈现"升级到 requirement-analysis / 坚持在 quick-fix 继续"两个选项；用户坚持继续且修复改变契约时，SHALL 仍强制走 spec 同步分支。

#### Scenario: 跨模块根因触发升级门

- **GIVEN** 根因定位显示修复需要同时改动认证模块与会话模块
- **WHEN** 升级门判定
- **THEN** quick-fix 停下说明升级信号与继续修的风险，等待用户选择，不擅自继续

#### Scenario: 用户坚持继续仍强制同步

- **GIVEN** 升级门命中（契约变更），用户明确选择"坚持在 quick-fix 继续"
- **WHEN** 进入修复环节
- **THEN** spec 同步分支强制执行，不因用户坚持而豁免 spec 同步

### Requirement: 逐题校对

quick-fix SHALL 以一次一个问题的方式向用户确认：根因认定、修复方案（存在多个修法时）、本次修复是否改变契约；契约影响判定 SHALL 由用户裁决，不得由模型单方面认定后跳过提问。

#### Scenario: 契约影响由用户裁决

- **GIVEN** 根因与修复方案已确认，修复将改变某 active spec 描述的错误提示行为
- **WHEN** 进入契约影响校对
- **THEN** quick-fix 向用户提问"本次修复是否改变 spec 描述的行为契约"并附 spec 相关小节引用，等待用户答复后才分流

### Requirement: TDD 修复

quick-fix 的修复环节 SHALL 遵循 test-driven-development skill 铁律：先写复现 bug 的失败测试、确认红、最小实现转绿；TDD skill 的既有例外条款（配置文件、纯文案等，需用户同意）同等适用。

#### Scenario: 复现测试先红后绿

- **GIVEN** 根因与修复方案已经用户确认
- **WHEN** 进入修复实施
- **THEN** 先提交前存在一个复现 bug 的失败测试且被确认因功能缺陷而红，随后最小实现使其转绿

### Requirement: 契约分流提交

契约变更（单 spec 范围内）时，quick-fix SHALL 同步该 spec 的相关 Requirement/Scenario 小节、将 spec 增量展示给用户过目，并把 spec+代码+测试放入同一提交。契约不变时 SHALL 不改 spec；若改动文件命中某 active spec 的 covers，则提交 SHALL 以 `SPEC_DEV_GUARD=off git commit` 执行（过编辑期 `--hook` 与提交期 `--staged` 两道本地闸）并在 message 留 `Spec-Guard: off <原因>` trailer（过 pre-push 与 CI 区间闸）——环境变量与 trailer 二者配合、缺一不可；改动未命中任何 active covers 时普通提交即可，无需环境变量或 trailer。

#### Scenario: 契约变更同步提交

- **GIVEN** 用户裁决本次修复改变契约且局限单一 spec
- **WHEN** 修复完成提交
- **THEN** 被命中 spec 的相关小节已更新并经用户过目，spec、代码、测试位于同一 commit

#### Scenario: 契约不变 trailer 放行

- **GIVEN** 用户裁决本次修复不改变契约，但改动文件命中某 active spec 的 covers
- **WHEN** 修复完成提交
- **THEN** spec 未被改动，提交以 `SPEC_DEV_GUARD=off git commit` 执行且 message 含 `Spec-Guard: off <原因>` trailer

#### Scenario: 编辑期 hook 拦截交互

- **GIVEN** 目标仓库装有 guardrail 编辑期 hook，本次为契约不变修复，编辑 covers 覆盖文件被 hook 阻断
- **WHEN** quick-fix 收到守卫阻断信息
- **THEN** 向用户说明"契约不变的内部修复被编辑期守卫拦截"，经用户确认后以 `SPEC_DEV_GUARD=off` 执行编辑与提交并留 trailer，不静默绕过、不伪造 spec 同步

### Requirement: 可选自动化验收

修复提交后 quick-fix SHALL 询问用户一次是否触发 acceptance-qa；用户接受则按 spec 命中情况装配输入（命中 active spec：spec 路径+变更文件清单按变更面裁剪；未命中：由 acceptance-qa 现场生成迷你矩阵）；用户拒绝则 SHALL 至少运行受影响的测试并区分本次新增失败与既有失败。

#### Scenario: 拒绝验收仍有最低验证

- **GIVEN** 修复已提交，用户拒绝触发 acceptance-qa
- **WHEN** quick-fix 收尾
- **THEN** 受影响的测试被运行，结果（含与既有失败的区分）呈现给用户，不留"没验证"空白

#### Scenario: 接受验收传参正确

- **GIVEN** 修复命中 active spec，用户接受触发 acceptance-qa
- **WHEN** acceptance-qa 被调用
- **THEN** 输入含该 spec 路径与本次变更文件清单，验收按变更面裁剪矩阵行

### Requirement: 双向路由

requirement-analysis 阶段 1 SHALL 增加对称的"小修检查"：识别出无设计空间的 bug 修复时建议用户切换 quick-fix（建议式，不自动切换）；exploring 的分界表 SHALL 增加 quick-fix 行；exploring、quick-fix、requirement-analysis 三方 frontmatter description SHALL 互指划界。

#### Scenario: requirement-analysis 收到小修请求建议切换

- **GIVEN** 用户以 requirement-analysis 触发"修一下分页第 0 页崩溃"
- **WHEN** 阶段 1 小修检查执行
- **THEN** requirement-analysis 指出这是无设计空间的修复并建议切换 quick-fix，等待用户裁决而非自动切换

## 方案设计

### 架构与组件

单一 SKILL.md 纯文本指令承载全部流程（方案 A，与 exploring 同构，无 references/、无 scripts/）：

- `skills/quick-fix/SKILL.md`：frontmatter 双语 description + 语言协议 blockquote + 中文正文——6 步流程（接收问题 → 根因定位+spec 反查 → 升级门 → 逐题校对 → 契约分流 TDD 修复 → 可选验收）+ Codex 工具映射内联小节 + Red Flags
- `skills/quick-fix/agents/openai.yaml`：Codex 接口（6 必需键，pre-commit 强制）
- `skills/quick-fix/evals/evals.json` + `evals/trigger-evals.json`：设计意图与触发边界用例

### 数据流

问题描述 →（Grep/Read 或 1 个 code-explorer）根因 + 命中 spec 小节 → 用户逐题裁决（根因/方案/契约）→ 分支一：spec 增量+代码+测试同 commit；分支二：代码+测试 commit 带 trailer → 可选 acceptance-qa（输入：spec 路径+变更清单 或 迷你矩阵）。

### 关键接口

- 复用 test-driven-development skill：引用式（"遵循其铁律"），同 executing-plans 惯例
- 复用 acceptance-qa skill：显式触发，装配模式沿用其阶段 0 已支持的三分（有 spec 沿用矩阵/无 spec 迷你矩阵）
- 消费 guardrail 锚点：读 spec frontmatter `spec_dev.covers`/`status`；可选调用 `scripts/spec-dev/check-spec-drift.mjs --files`（存在时）
- 路由：升级门 → 提议后经用户同意调用 requirement-analysis（向更承诺方向用"调用"）；requirement-analysis/exploring → "建议切换" quick-fix（向更少承诺方向用"建议"）

### 错误处理

- 无 spec/无 guardrail 仓库：反查为空 → 契约分流退化为普通提交
- 编辑期（`--hook`）与提交期（`--staged`）守卫拦截契约不变修复：两道本地闸都不识别 trailer，统一以显式用户交互 + `SPEC_DEV_GUARD=off` + trailer 承接（见 Requirement「契约分流提交」）；注意 Edit 工具的 PreToolUse hook 环境由平台设定，环境变量实际注入点在 Bash 侧 `SPEC_DEV_GUARD=off git commit`，编辑期被拦时按守卫 stderr 指引与用户确认后继续
- 测试基线本来就红：修复前记录既有失败清单，收尾时只对"本次新增失败"负责
- code-explorer 子代理失败：缩小范围重试 1 次，再失败主线程接管（沿用插件惯例）

## 测试与验收策略

本特性为文档型 skill（无运行时代码），验收以仓库校验链与触发边界用例为主：

| Scenario / 检查项 | 维度 | 执行方式 | 验收证据 |
|-------------------|------|---------|---------|
| pre-commit 校验链全绿（check-plugin --codex-validate / validate-skills / check-openai-sync / diff --check） | integration | 任务内 TDD（每次 commit 自动执行） | hook 通过输出 |
| trigger-evals：should_trigger 覆盖小修场景、should_not_trigger 覆盖"新功能/跨模块重构/犹豫期"三类 | — | 验收任务 (A)（人工/AI 对照 description 逐条核对） | 核对记录 |
| README 双版四处注册面齐全且镜像一致 | — | 验收任务 (A) | 对照清单 |
| 三方 description 互指闭环（exploring/quick-fix/requirement-analysis） | — | 验收任务 (A) | 引用摘录 |

## 风险与边缘情况

- **后门风险**（最大）：quick-fix 被当成逃避 requirement-analysis 的捷径。防守：升级门在看过根因后判定；契约变更强制 spec 同步；trigger-evals 的 should_not_trigger 锚定边界；description 明确"无设计空间"限定
- **守卫摩擦**：装了编辑期 hook 的仓库中，契约不变分支有真实的编辑期拦截摩擦——设计选择显式用户交互承接而非粉饰（该摩擦本身是守卫按设计工作）
- **多次小修累积侵蚀**：连续多次 trailer 放行的修复可能累积成未记录的行为漂移；本期不做自动检测（YAGNI），依赖 push/CI 区间检查打印的放行计数供人工复核
- **openai.yaml 同步 tripwire**：修改 requirement-analysis/exploring 的 SKILL.md 时必须同时暂存各自 openai.yaml（description 本就要改，非额外负担）

## 开放问题

- SKILL.md 内 Codex 工具映射小节的详略（参照 acceptance-qa 专节还是 tdd 一句话）——实施时按实际用到的 Claude 专属工具数量定
- `.codex-plugin/plugin.json` 的 defaultPrompt 新增条目的措辞——实施时对齐现有 6 条风格
