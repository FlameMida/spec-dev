---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——
spec_dev:
  version: 1
  feature: clarifying-skill
  status: active
  covers:
    - "skills/clarifying/**"
  sync_commit: null
---

# clarifying-skill 设计

## 背景与目标

requirement-analysis 阶段 3 与 quick-fix 步骤 3 各自内嵌了几乎同一套提问纪律，且该纪律无法被用户单独调用——想把一个想法磨清楚而不进入完整流程时没有入口。本特性把提问纪律抽取为共享纪律 skill `clarifying`（地位类比 test-driven-development），既被两处引用去重，也可独立调用，磨到共识后由用户在三出口中自选去向、不强制产出。

**成功标准**：`skills/clarifying/` 落地且 Claude/Codex 双端可用；两个引用方改造后提问行为与改造前语义等价；独立调用可完整走通"逐题 → 共识 → 三出口"。

## 非目标

- 不引入 batch-grill 的 frontier 批量提问模式（与套件"一次一题"铁律冲突）；
- 不改动 exploring skill（发散/收敛互补，保持并存）；
- 不新增落盘目录（md 出口复用 `.spec-dev/explorations/` 约定）；
- 不涉及分诊路由改造与报告通道（roadmap 子项目②）、资源台账（子项目③）。

## 术语表

- **共识态**：澄清对象的所有决策支线要么已由用户裁决、要么被显式挂起为未决点，无静默假设。_Avoid_：达成一致、聊完了
- **被引用模式**：clarifying 作为纪律被其他 skill 的澄清环节遵循，流程控制权在引用方。_Avoid_：内嵌模式
- **独立会话模式**：用户直接调用 clarifying，流程控制权在本 skill，终点是共识态 + 三出口。_Avoid_：单独模式

## 影响面

- 新增：`skills/clarifying/`（SKILL.md 及按套件惯例的 agents/evals 子目录）；
- 修改：`skills/requirement-analysis/SKILL.md`（阶段 3）、`skills/requirement-analysis/references/codex-compat.md`（提问规范节）、`skills/quick-fix/SKILL.md`（步骤 3 与 Codex 映射表）；
- 发布面：`.claude-plugin` 清单、`.codex-plugin/plugin.json`（description/keywords/longDescription/defaultPrompt）、`.agents/plugins/marketplace.json`、README 双语列表、CHANGELOG 与版本号递增。

## 已确认的关键决策

- 命名 `clarifying`：与套件动名词命名风格（exploring/executing-plans）一致——用户裁决，弃 grilling（辨识度让位于风格统一）。
- md 出口复用 `.spec-dev/explorations/<topic>.md`：不新增第三种落盘目录，且 requirement-analysis 现有"explorations 笔记作阶段 1 输入"条款天然衔接。
- 单向同步锚定：纪律定义以 clarifying 为准，两个引用方各留一句锚定语，修改方向恒为"引用方跟随"。
- Codex 规范内嵌 SKILL.md 一节（跟随 quick-fix/exploring 先例），不建独立 codex-compat 文件；requirement-analysis 的 codex-compat.md 提问规范节裁剪为"逐题纪律指向 clarifying + 保留三道门呈现要求"，消除第二处重复。
- 独立会话模式轻量：不强制任务管理（TaskCreate/update_plan），落盘不强制 commit（与 exploring 一致）。

（ADR 检查：以上决策均可通过编辑文档低成本逆转，不满足"难以逆转"判据，不建 ADR。）

## ADDED Requirements

### Requirement: 独立会话逐题澄清至共识

独立调用 clarifying 时，执行者 SHALL 一次只提出一个问题并等待用户答复，沿决策树逐支下行直至共识态。

#### Scenario: 一次一题不倾泻

- **GIVEN** 当前存在三个相互独立的待澄清点
- **WHEN** 执行者发出下一条澄清消息
- **THEN** 该消息只包含一个问题，其余待澄清点留待后续轮次

#### Scenario: 上游未定不问下游

- **GIVEN** 决策树中"是否需要持久化"尚未被用户裁决
- **WHEN** 执行者选择下一个提问
- **THEN** 不提出"用什么数据库"等依赖该上游决策的下游问题

### Requirement: 事实自查不外包给用户

能由环境（代码库、文件系统、已有探索产物）回答的事实性问题，执行者 SHALL 自行查证而不询问用户。

#### Scenario: 事实不落到用户头上

- **GIVEN** 澄清对象涉及"项目当前用的是哪个测试框架"这类可由仓库文件回答的问题
- **WHEN** 该问题成为下一个待澄清点
- **THEN** 执行者读取仓库文件自行得出答案并继续，不把该问题抛给用户

### Requirement: 共识后呈现三出口且不强制产出

达到共识态后，执行者 SHALL 呈现共识摘要（达成的理解 + 挂起的未决点）并请用户在三出口中选择：转主流程、就此结束、写入 md；未经用户选择 SHALL NOT 自动落盘任何文件。

#### Scenario: 就此结束零产物

- **GIVEN** 共识摘要已呈现
- **WHEN** 用户选择"就此结束"
- **THEN** 会话结束，工作区无任何新增文件

#### Scenario: 写入 md 复用 explorations 约定

- **GIVEN** 用户选择"写入 md"
- **WHEN** 执行者落盘
- **THEN** 文件位于 `.spec-dev/explorations/<topic>.md`，结构含问题、关键结论、未决点

#### Scenario: 转主流程不重问已澄清问题

- **GIVEN** 用户选择"转主流程"且共识中已裁决"要做、且有方案取舍"
- **WHEN** 执行者建议并（经确认）进入 requirement-analysis
- **THEN** 共识结论作为其阶段 1 输入，已裁决过的问题不在其阶段 3 重复提出

### Requirement: 澄清中不实施

clarifying 会话内执行者 SHALL NOT 编写生产代码、搭建脚手架或执行任何实施动作；用户在会话中要求直接实施时，执行者 SHALL 引导走"转主流程"出口。

#### Scenario: 用户催促直接做

- **GIVEN** 澄清进行中
- **WHEN** 用户说"别问了，直接改代码吧"
- **THEN** 执行者不改代码，提议经出口①转入对应主流程 skill

### Requirement: 被引用模式不触发出口

clarifying 被 requirement-analysis 或 quick-fix 引用时，执行者 SHALL 仅遵循其提问纪律完成当前澄清环节，SHALL NOT 呈现三出口或共识摘要——流程由引用方的下一阶段接管。

#### Scenario: requirement-analysis 澄清完成后续走阶段 4

- **GIVEN** requirement-analysis 阶段 3 按 clarifying 纪律完成全部澄清
- **WHEN** 最后一个问题被用户答复
- **THEN** 流程直接进入 requirement-analysis 阶段 4，不出现三出口选择

### Requirement: Codex 环境降级可用

Codex 环境下执行者 SHALL 以对话消息逐题提问（保持一次一题、选项带推荐），并在 sequential-thinking 不可用时降级为回复内分点推演、沙箱禁网时以 `rg` + 文件阅读完成澄清前探索。

#### Scenario: 无结构化提问工具

- **GIVEN** 会话内不存在 AskUserQuestion 工具
- **WHEN** 执行者提出澄清问题
- **THEN** 以普通对话消息提问，含 2-3 个互斥选项且推荐项在首位，等待用户明确回复

## MODIFIED Requirements

### Requirement: requirement-analysis 阶段 3 引用 clarifying（改了什么：内嵌纪律条目替换为引用 + 锚定语，特有条款保留）

requirement-analysis 阶段 3 SHALL 声明提问纪律遵循 clarifying skill 并保留锚定语"纪律定义以 clarifying 为准"，同时 SHALL 保留其阶段特有条款：优先覆盖清单（目的/约束/成功标准）、视觉问题 JIT 提议 visual-preview、回补探索、术语表落盘联动、"需求已清晰无需澄清"记录；其 codex-compat.md 提问规范节 SHALL 只保留三道门（方案选定/设计批准/spec review）的对话呈现要求，逐题纪律指向 clarifying。

#### Scenario: 改造后语义等价

- **GIVEN** 改造前阶段 3 的全部纪律条目清单
- **WHEN** 逐条对照改造后的"clarifying 纪律 + 保留条款"
- **THEN** 每条改造前条目都能在改造后找到语义等价的归属，无丢失、无新增约束

### Requirement: quick-fix 步骤 3 引用 clarifying（改了什么："沿用 requirement-analysis 的提问纪律"改为指向 clarifying）

quick-fix 步骤 3 SHALL 声明提问纪律遵循 clarifying skill，三类核心确认（根因认定/修复方案/契约影响）SHALL 原样保留；其 Codex 映射表"用户澄清/确认"行 SHALL 指向 clarifying 的 Codex 规范。

#### Scenario: 三类核心确认不受影响

- **GIVEN** 改造后的 quick-fix 步骤 3
- **WHEN** 执行一次 quick-fix 澄清环节
- **THEN** 仍按序确认根因认定、修复方案、契约影响三类问题，且逐题进行

## 方案设计

### 架构与组件

- `skills/clarifying/SKILL.md`：frontmatter（name/description 双语，description 写清"未承诺的发散思考用 exploring"的分界）、语言协议块、核心纪律节（两模式共用）、独立会话模式节（含 HARD-GATE、共识态定义、三出口）、与 exploring 分界表、内嵌 Codex 规范节、Red Flags；
- `skills/clarifying/agents/`、`skills/clarifying/evals/`：对齐套件惯例，eval 用例覆盖"一次一题""事实自查""被引用不触发出口""用户催促直接做"（用例细节 plan 阶段定）；
- 引用方改动最小化：requirement-analysis 阶段 3 与 quick-fix 步骤 3 各改为"引用 + 锚定语 + 特有条款"，不动其余阶段/步骤。

### 数据流

独立会话：用户输入 → （可选轻量探索）→ 逐题循环（AskUserQuestion / Codex 对话）→ 共识摘要 → 三出口分发（requirement-analysis / quick-fix ｜ 结束 ｜ `.spec-dev/explorations/<topic>.md`；报告通道待 roadmap 子项目②落地后追加为转主流程目标）。被引用：引用方进入澄清环节 → 按 clarifying 纪律逐题 → 控制权回引用方下一阶段。

### 错误处理

- sequential-thinking 不可用 → 回复内分点推演；
- Codex 沙箱禁网 → 探索降级 `rg` + 文件阅读；沙箱 read-only 落盘失败 → 向用户说明并请其自行保存；
- 用户在独立会话中途流失（不再答复）→ 无超时机制，会话自然停在当前题，不自动落盘。

## 测试与验收策略

纯文档特性，TDD 不适用（属 test-driven-development skill 既有例外类别）；验收以文档对照审查 + eval 用例承载：

| Scenario / 检查项 | 维度 | 执行方式 | 验收证据 |
|-------------------|------|---------|---------|
| 事实不落到用户头上 / 上游未定不问下游 / 一次一题 | eval | 验收任务（skill eval 用例） | eval 通过记录 |
| 就此结束零产物 / 写入 md 复用 explorations | eval | 验收任务（skill eval 用例） | eval 通过记录 |
| 被引用不触发出口 | eval | 验收任务（skill eval 用例） | eval 通过记录 |
| 用户催促直接做（澄清中不实施） | eval | 验收任务（skill eval 用例） | eval 通过记录 |
| 转主流程不重问已澄清问题 | 文档审查 | 验收任务（对照检查） | 检查记录 |
| 改造后语义等价（两引用方） | 文档审查 | 验收任务（逐条对照清单） | 对照表 |
| 无结构化提问工具（Codex） | 文档审查 | 验收任务（规范节完备性检查） | 检查记录 |
| 发布面同步完整（双端清单/README/CHANGELOG） | 文档审查 | 验收任务 | 检查记录 |

## 风险与边缘情况

- **双向同步风险**：clarifying 后续修改可能令引用方语境失配——锚定语把同步方向定为单向（引用方跟随），plan 中为引用方检查留任务；
- **触发边界**：description 分界写不清会与 exploring 抢自动触发——eval 中加一条"发散措辞不触发 clarifying"的反例用例；
- **explorations 目录语义拉宽**：该目录原属 exploring 产物，现兼收澄清共识笔记——在 clarifying 落盘格式中沿用相同结构，消费方（requirement-analysis 阶段 1）无需区分来源。

## 开放问题

- eval 用例的具体断言形式（对话脚本 vs 检查清单）——plan 阶段按套件现有 evals 形态对齐；
- defaultPrompt 双语措辞的最终文案——plan 阶段定稿。
