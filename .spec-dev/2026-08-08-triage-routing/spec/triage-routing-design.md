---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——
spec_dev:
  version: 1
  feature: triage-routing
  status: active
  covers:
    - "commands/triage.md"
  sync_commit: "4bd9c86c457ca88eb66aea26502086741a35668f"
---

# triage-routing 设计

## 背景与目标

套件的分诊逻辑分布在各 skill 入口自检里，缺一个"想先看看该走哪条路"的显式入口；quick-fix 升级 requirement-analysis 时不携带已有发现，升级等于重来；已承诺的非开发交付（调研报告、方案对比）没有归宿，硬走八阶段会产出无意义的 spec。本特性新增 `/triage` 薄命令做显式分诊入口，翻转"拿不准档"的默认倾向为 quick-fix 优先并补齐升级上下文交接，为非开发交付开报告通道。

**成功标准**：`/triage` 可用且判定建议式、零落盘；quick-fix 升级时下游不重查不重问；非开发交付不再产出 spec/plan；clarifying spec 中"待子项目②追加"的注记被消除。

## 非目标

- 不把 triage 做成必经入口——各 skill 入口自检照常兜底，显式点名 skill 的请求不经 triage；
- 报告通道不独立成 skill（用户已裁决：分流出口 + 落盘约定）；
- 不改 exploring skill；不涉及资源台账（roadmap 子项目③）；
- 不为 commands/ 新建 evals 体系（无先例，行为验收落在引用方 evals）。

## 术语表

- **报告通道**：已承诺的非开发交付的处理路径——不建特性目录、不写 spec/plan，产出结论后问一次是否落盘报告。_Avoid_：报告出口、report lane
- **非开发交付**：已承诺交付、但交付物不是代码变更的任务（调研报告、方案对比、日志分析）。_Avoid_：非开发任务
- **拿不准档**：已承诺的开发请求中，无法从措辞判定"有无设计空间/是否跨模块"的档位。_Avoid_：模糊请求

## 影响面

- 新增：`commands/triage.md`；
- 修改：`skills/quick-fix/SKILL.md`（分诊三角 + 步骤 2.5）、`skills/requirement-analysis/SKILL.md`（阶段 1）、`skills/clarifying/SKILL.md`（出口 1）、`.spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md`（数据流行同步，消除"待追加"注记）；
- evals：`skills/quick-fix/evals/evals.json`、`skills/requirement-analysis/evals/evals.json` 各加 1 条；
- 发布面：README.md / README.zh-CN.md（用法区 + 目录树注释）、`.codex-plugin/plugin.json`（defaultPrompt + keywords）；CHANGELOG 与版本号递增（三处 version 字段：双端 plugin.json 与 marketplace metadata.version）由 post-commit 自动发版承载——计划不手写、不使用 SKIP_RELEASE_HOOK。

## 已确认的关键决策

- triage = 薄命令引用式：正文只列判定维度与 skill 指向，判据以各 SKILL.md 为准——防双处漂移（用户裁决"引用不复制"）。
- 报告通道 = 分流出口 + 落盘约定，权威定义唯一落在 requirement-analysis 阶段 1 的任务类型检查条目，triage 与 clarifying 引用不复制。
- 显式调用优先级最高：用户点名 skill 就直接进，triage 判定永远建议式、四出口可改选。
- 拿不准档默认 quick-fix：升级便宜、降级浪费；安全网 = 步骤 2.5 证据式升级门 + 本特性补齐的上下文交接。
- 报告落盘 `.spec-dev/reports/YYYY-MM-DD-<topic>.md`，结构从轻（问题/结论/依据来源），目录随首个报告创建。

（ADR 检查：均为可低成本逆转的文档约定，不满足"难以逆转"判据，不建 ADR。）

## ADDED Requirements

### Requirement: triage 输出建议式分诊判定

`/triage` 被调用时，执行者 SHALL 输出分诊结果（判定 + 建议路线 + 依据）并以四出口（quick-fix / requirement-analysis / exploring / 报告通道）请用户确认，判定不得自动执行。

#### Scenario: 带参数直接分诊

- **GIVEN** 用户调用 `/triage 用户列表页加个导出按钮`
- **WHEN** 命令执行
- **THEN** 直接对该需求输出判定、建议路线与依据，并请用户在四出口中确认，不先反问"要分诊什么"

#### Scenario: 无参数先问对象

- **GIVEN** 用户调用 `/triage` 未带参数
- **WHEN** 命令执行
- **THEN** 先问一句"要分诊什么需求"，得到答复后再输出判定

#### Scenario: 判定拿不准列两候选

- **GIVEN** 请求在两条路线间难以判定（如小修与设计空间边界模糊）
- **WHEN** 执行者输出分诊结果
- **THEN** 说明拿不准的原因并列出两个候选出口供用户挑选，不硬判单一路线

### Requirement: triage 确认后路由并传递上下文

用户确认出口后，执行者 SHALL 按出口类型路由：三个 skill 出口（quick-fix / requirement-analysis / exploring）调用对应 skill 并把请求原文与分诊依据作为其输入传递；报告通道出口按 requirement-analysis 阶段 1 权威定义的约定执行并传递同等上下文。triage 全程 SHALL NOT 落盘任何文件。

#### Scenario: 用户改选出口照选

- **GIVEN** triage 建议 quick-fix，用户回复选择 exploring
- **WHEN** 执行者路由
- **THEN** 进入 exploring 而非 quick-fix，不坚持原判定

#### Scenario: 路由零落盘

- **GIVEN** 一次完整的 triage 判定与路由
- **WHEN** 检查工作区
- **THEN** 无任何 triage 产生的新文件，判定只存在于对话中

### Requirement: triage 引用而不复制分诊判据

`commands/triage.md` 正文 SHALL 只列判定维度（承诺状态/任务类型/设计空间/大小拿不准）与各 skill 指向，SHALL NOT 复制各 SKILL.md 中的判据细节（如小修检查的"单点 bug、单常量"清单、升级门的三信号清单）。

#### Scenario: 判据变更不需改命令

- **GIVEN** quick-fix 升级门信号未来在其 SKILL.md 中调整
- **WHEN** 检查 commands/triage.md
- **THEN** 命令文本无需同步修改——其中不存在这些判据的副本

### Requirement: 拿不准档默认路由 quick-fix

对已承诺的开发请求，当大小/设计空间拿不准时，triage、requirement-analysis 阶段 1 小修检查与 quick-fix 分诊三角 SHALL 以同向表述记载并执行"默认先进 quick-fix（以其证据式升级门为安全网）"的倾向。

#### Scenario: 已承诺模糊请求路由 quick-fix

- **GIVEN** 请求"改一下导出逻辑"，措辞无法判定是否跨模块
- **WHEN** triage 判定
- **THEN** 建议路线为 quick-fix 起步，依据中说明"看过根因后由升级门证据式判定"

#### Scenario: 双向表述同向

- **GIVEN** 改造后的 quick-fix 分诊三角文本与 requirement-analysis 小修检查对偶句
- **WHEN** 逐句对照
- **THEN** 两处对拿不准档的默认倾向语义一致且互相印证，无一处写"先走 requirement-analysis"之类的反向表述

### Requirement: quick-fix 升级携带上下文交接

quick-fix 步骤 2.5 升级经用户同意调用 requirement-analysis 时，执行者 SHALL 把已定位的根因、spec 反查结果与已裁决的澄清答案作为其阶段 1 输入；requirement-analysis SHALL NOT 在阶段 2 重查已查证部分、SHALL NOT 在阶段 3 重问已裁决问题。

#### Scenario: 升级后不重查不重问

- **GIVEN** quick-fix 已定位根因涉及三个模块并经用户同意升级
- **WHEN** requirement-analysis 开始
- **THEN** 阶段 1 直接引用已交接的根因与 spec 反查结果，阶段 2 探索不重做该部分，阶段 3 不再询问已在 quick-fix 步骤 3 裁决过的问题

### Requirement: 非开发交付走报告通道

requirement-analysis 阶段 1 SHALL 含任务类型检查：识别出已承诺的非开发交付时建议走报告通道——不建特性目录、不写 spec/plan，需要时按 clarifying 纪律澄清，产出结论后 SHALL 问一次是否落盘 `.spec-dev/reports/YYYY-MM-DD-<topic>.md`；用户婉拒则 SHALL NOT 落盘。

#### Scenario: 调研请求不产出 spec

- **GIVEN** 用户请求"调研 A/B 两个消息队列哪个适合我们，给我结论"
- **WHEN** 进入 requirement-analysis 阶段 1
- **THEN** 任务类型检查命中非开发交付，建议报告通道，不创建特性目录、不进入八阶段 spec 流程

#### Scenario: 婉拒落盘零产物

- **GIVEN** 报告通道结论已产出并询问是否落盘
- **WHEN** 用户回复不用
- **THEN** 工作区无新增文件，结论只留在对话

#### Scenario: 调研结论要落地时回归分诊

- **GIVEN** 报告通道结论产出后用户说"就按方案 A 实现吧"
- **WHEN** 执行者响应
- **THEN** 回到正常分诊（该请求已是开发交付），不在报告通道内实施代码

## MODIFIED Requirements

### Requirement: clarifying 出口 1 目标含报告通道（改了什么：转主流程目标由两个扩为三个）

clarifying 独立会话出口 1 SHALL 按承诺状态、设计空间与任务类型建议 requirement-analysis、quick-fix 或报告通道（已承诺的非开发交付），经用户确认后进入；共识结论作为下游输入、已裁决过的问题不在下游重问。

#### Scenario: 非开发共识转报告通道

- **GIVEN** clarifying 独立会话磨清的对象是"该不该迁移到 monorepo 的调研结论"且用户确认要一份报告
- **WHEN** 用户选择出口 1
- **THEN** 执行者建议报告通道并经确认后按其约定产出，不建议 requirement-analysis

## 方案设计

### 架构与组件

- `commands/triage.md`：frontmatter 双语 description + 指令正文（输入处理 → 四维度判定[引用式] → 建议式输出 + 四出口 → 确认后路由传递 → 零落盘；显式点名 skill 不经 triage 的边界说明）；
- `skills/quick-fix/SKILL.md`：分诊三角节 + 步骤 2.5 各一句，语义与 requirement-analysis 侧同向；
- `skills/requirement-analysis/SKILL.md`：阶段 1 新增任务类型检查条目（报告通道权威定义）+ 小修检查末尾对偶句；
- `skills/clarifying/SKILL.md` + 其 spec：出口 1 目标扩展、spec 数据流行同步（同 commit）；
- 发布面：README ×2 两处、`.codex-plugin/plugin.json` defaultPrompt/keywords。

### 数据流

`/triage <需求>` → 判定（引用各 SKILL.md 判据）→ 建议 + 四出口 → 用户确认/改选 → 调用目标 skill（传原文 + 分诊依据）→ triage 退场。报告通道：任务类型检查命中 → （可选 clarifying 澄清）→ 主线程产出结论 → 问一次落盘 → `.spec-dev/reports/` 或对话终。

### 错误处理

- 判定拿不准 → 列两候选出口交用户挑；
- Codex 端 `commands/` 不随插件 `skills` 字段加载、triage 正文不可见 → 同等分诊行为由各 SKILL.md 的入口自检兜底 + defaultPrompt 提示词引导承载（与 check-mcp 仅有 defaultPrompt 条目的先例一致）；
- 报告通道被当作实施后门 → 限定"交付物不是代码变更"，结论要落地即回归分诊。

## 测试与验收策略

纯文档特性，TDD 例外沿用；验收 = 引用方 eval + 文档审查：

| Scenario / 检查项 | 维度 | 执行方式 | 验收证据 |
|-------------------|------|---------|---------|
| 升级后不重查不重问 | eval | 验收任务（quick-fix evals 新增用例） | eval 用例存在且断言一致 |
| 调研请求不产出 spec / 婉拒落盘零产物 | eval | 验收任务（requirement-analysis evals 新增用例） | eval 用例存在且断言一致 |
| 带参数直接分诊 / 无参数先问 / 改选照选 / 零落盘 / 拿不准列两候选 | 文档审查 | 验收任务（triage.md 条款覆盖检查） | 检查记录 |
| 判据变更不需改命令（引用不复制） | 文档审查 | 验收任务（grep 判据细节不在命令内） | 检查记录 |
| 拿不准档双向表述同向（quick-fix 三角 vs RA 小修检查） | 文档审查 | 验收任务（对照检查） | 对照记录 |
| 非开发共识转报告通道 + clarifying spec 注记消除 | 文档审查 | 验收任务（出口 1 文本 + spec 数据流行） | 检查记录 |
| 发布面登记（README ×2、defaultPrompt、keywords）+ CHANGELOG/版本号已随发版自动化递增 | 文档审查 | 验收任务 | 检查记录 |

## 风险与边缘情况

- **双处表述漂移**：拿不准档倾向写在 quick-fix 与 requirement-analysis 两处——spec 本节明确两处必须同向，验收矩阵含对照行；
- **报告通道语义蔓延**：可能被用来绕 HARD-GATE——"回归分诊" Scenario 把边界钉死；
- **triage 与自动触发打架**：triage 是可选显式按钮，各 skill description 的自动触发不受影响（命令不参与 description 匹配）。

## 开放问题

无。
