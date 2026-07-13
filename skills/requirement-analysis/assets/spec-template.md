# Spec 模板（`.spec-dev/YYYY-MM-DD-<feature>/spec/<feature>-design.md`）

> **Language / 语言**: Fill in the conversation language — all narrative content (background, requirements, scenarios, decisions) follows the conversation language at creation; keep structural labels (Requirement / Scenario / GIVEN / WHEN / THEN, frontmatter keys) in English. / 以对话语言填写——叙述性内容（背景、需求、场景、决策）跟随创建时对话语言；结构标签（Requirement/Scenario/GIVEN/WHEN/THEN、frontmatter 键）保持英文。

> 按需增删节：light 档几句话 + 关键决策 + 1-2 条 Requirement 即可；节的篇幅与其复杂度匹配，不为凑结构而注水。
>
> **顶部 frontmatter 是漂移守卫锚点，必须保留**：它把本 spec 与其覆盖的代码路径绑定，供 pre-commit / CI / Claude·Codex 的 PreToolUse hook 校验"改了代码却没同步 spec"。填 `feature` 与 `covers`，spec 定稿转 `status: active`；无守卫需求（如纯文档特性）可将 `covers` 留空数组，守卫即跳过。

```markdown
---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——
# covers: 本 spec 声称覆盖的代码路径 glob；这些路径被改动而本 spec 未同步时，
#         守卫（pre-commit / CI / Claude·Codex 的 PreToolUse hook）会拦截并提示。
spec_dev:
  version: 1
  feature: <feature-name>
  status: draft            # draft | active | superseded —— 仅 active 参与漂移拦截
  covers:                  # 该特性拥有的代码 glob；无代码产物时留空数组 []
    - "src/<feature>/**"
  sync_commit: null        # 最近一次"代码与本 spec 已同步"的提交 SHA；由 executing-plans
                           # 收尾在合并后写入（计划最终任务的锚定步骤）。
                           # git diff <sync_commit>..HEAD -- <covers> = 此后的代码变化
---

# [主题] 设计

## 背景与目标

[要解决什么问题、为什么现在做；1-3 句 / What problem, why now; 1-3 sentences]

**成功标准 / Success criteria**：[做到什么算完成 / What counts as done]

## 非目标

[明确不做的事——防止范围蔓延；没有可写"无" / What we explicitly will not do; write "none" if empty]

## 术语表

[阶段 3 澄清中确定的规范术语；全篇（含 Requirement/Scenario）统一使用规范名。定义只说它"是什么"，一两句为限。无术语分歧时删除本节 / Canonical terms from clarification; one-line definitions; delete this section if no ambiguity]

- **[规范术语 / canonical term]**：[一句话定义 / one-line definition]。_Avoid_：[别名 1、别名 2 / aliases]

## 影响面

[受影响的代码模块、公开 API、依赖、外部系统——为后续审查与验收划定范围；无跨模块影响可写"仅限本特性涉及的模块" / Affected modules, public APIs, dependencies, external systems]

## 已确认的关键决策

[阶段 3 澄清结论与阶段 4 方案选择：每条一行，含取舍理由。
同时满足"难以逆转、缺上下文会费解、真实取舍"三判据的决策，额外沉淀为仓库级 `.spec-dev/adr/NNNN-<slug>.md`（全项目统一目录与编号），此处保留一行摘要并链接对应 ADR / One line per decision with rationale; decisions meeting the ADR bar also land in .spec-dev/adr/ with a link here]

- [决策 1]：[选择] —— [理由]
- [决策 2]：[选择] —— [理由]（详见 `../../adr/0007-<slug>.md`）

## 行为规范（Requirements）

[系统"做什么"，用任何人都能检验的措辞表达——不写实现方式（怎么建留给方案设计节与代码）。
全新功能按下例罗列；**修改既有功能时，把本节替换为文末的"行为差量三节"**。 / Observable behaviors only, no implementation; for changes to existing behavior use the delta sections at the end]

[交付对账后，未交付的 Requirement 由 executing-plans 在其标题下原位标注（DELIVERED 不标，只标偏差），后续续作与审查一眼看清缺口 / After delivery reconciliation, executing-plans marks non-delivered Requirements in place under their title; DELIVERED stays unmarked：
`> **Delivery: DEFERRED (YYYY-MM-DD)** — 一句原因 / one-line reason；详见 ../acceptance/acceptance-report.md`]

### Requirement: [一句话命名一个行为]

[一条陈述、一个 SHALL/MUST。RFC 2119 关键词：MUST/SHALL=硬性要求；SHOULD=强建议、允许有正当理由的例外；MAY=真正可选。默认用 SHALL。行为必须**可观察**——没读过代码的测试者也能判定通过与否（"上传超过 10 MB 时 SHALL 显示错误横幅"可观察，"SHALL 优雅处理大文件"不可观察）。一条 Requirement 只说一个行为，出现三个"并且"就拆成三条。 / One statement, one SHALL; behavior must be observable to a tester who has not read the code]

#### Scenario: [具体案例名，如"拒绝过期 token"——不写"场景 2" / Concrete case name, not "scenario 2"]

- **GIVEN** [前置状态 / precondition]
- **WHEN** [触发动作 / action]
- **THEN** [可观察的结果 / observable result]

[每条 Requirement 至少 1 个真正检验它的 Scenario（复述一遍需求的 Scenario 不算数）；重点覆盖边缘与错误场景——空输入、过期凭证、重复点击、并发——不只写 happy path。定稿前自问："哪个场景坏了我最难受？"确保它有一个命名的 Scenario。 / At least one real test per Requirement; cover edge and error cases, not just the happy path]

## 方案设计

### 架构与组件

[组件划分、各自职责与接口；每个单元能回答：做什么、怎么用、依赖什么 / Components, responsibilities, interfaces]

### 数据流

[数据如何在组件间流动；关键数据结构/实体定义 / Data flow and key structures]

### 关键接口

[API 端点 / 函数签名 / 事件契约——后续任务将依赖的形态 / Endpoints, signatures, event contracts later tasks depend on]

### 错误处理

[异常路径、降级策略 / Failure paths and degradation]

## 测试与验收策略

[以**验收矩阵**表达（结构定义见 acceptance-qa skill 的 references/acceptance-matrix.md）：每个 Scenario 至少一行；
「任务内 TDD」行由 writing-plans 直接翻译为任务的失败测试（GIVEN→arrange、WHEN→act、THEN→assert）；
「验收任务」行进入计划尾部的验收任务，由 executing-plans 收尾触发 acceptance-qa 执行。
visual/a11y/perf 行仅在需求形态需要时出现；性能行必须带阈值数字——写不出数字回到澄清 / Acceptance matrix: one row per Scenario; TDD rows become failing tests, acceptance rows go to the acceptance task; perf rows need numeric thresholds]

| Scenario / 检查项 | 维度 | 执行方式 | 验收证据 |
|-------------------|------|---------|---------|
| [Scenario 名] | unit/integration | 任务内 TDD | 测试通过 |
| [关键用户流程] | e2e | 验收任务 (D) | E2E 通过 |
| [页面 LCP ≤ 2.5s（lab, 中位数）] | perf-web | 验收任务 (D) | trace 报告 |

## 风险与边缘情况

[已识别的风险、防守措施、未上升为 Scenario 的边缘观察 / Known risks, defenses, edge observations]

## 开放问题

[留给实施阶段裁决的小问题；重大未知项不允许留在这里——回到澄清 / Small questions for implementation; big unknowns go back to clarification]
```

## 行为差量三节（仅修改既有功能时，替换「行为规范」节）

改既有功能不重写全量规范，只写差量——审查者一眼看清"什么变了"：

```markdown
## ADDED Requirements

[全新行为，此前不存在——格式同上：### Requirement: + #### Scenario: / Brand-new behavior that did not exist before]

## MODIFIED Requirements

[已存在且正在变化的行为：给出**完整的新版本**（不是只写差异），
Requirement 标题后括注一句"改了什么"帮助审查 / Existing behavior that changes: give the complete new version, note what changed]

## REMOVED Requirements

[移除的行为：Requirement 标题 + 一行移除原因 / Removed behavior: title + one-line reason]
```

**分类判据**：拿不准时先看当前实现的行为——行为已存在就是 MODIFIED（把真实变更标成 ADDED 会留下两条竞争的需求），行为不存在就是 ADDED（把新行为标成 MODIFIED 则无物可替换）。只写用到的节。
