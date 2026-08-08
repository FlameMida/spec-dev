---
spec_dev:
  version: 1
  feature: test-scoping
  status: active
  covers:
    - "skills/writing-plans/SKILL.md"
    - "skills/using-git-worktrees/SKILL.md"
    - "skills/executing-plans/SKILL.md"
  sync_commit: null
---

# 测试分域执行 + 测试退役纪律（test-scoping）设计

## 背景与目标

随开发推进测试只增不减，套件现有三处全量测试触点（worktree 基线验证、writing-plans 任务 0 与最终任务）使每次开发的测试成本线性恶化。本设计引入"计划声明的相关测试范围"让基线与过程验证只跑相关测试，保留最终全量安全网；并以 Scenario 锚点为判据建立随周期的测试退役纪律。

**成功标准**：执行含「相关测试范围」节的计划时，任务 0 基线与任务间验证只跑声明范围；最终任务跑全量、含归属裁决与退役检查；改动仅涉及 covers 所列 3 个 skill 文档。

## 非目标

- 不做独立测试分组清单文件；不改 quick-fix 链路；不做快慢分层（可后补）
- 不绑定任何具体测试影响分析工具，只规定优先级次序
- 不含"spec 模板实施线索附录"（已分流为独立小特性）

## 术语表

- **相关测试范围**：计划头部声明的、与本特性改动相关的测试执行命令或清单；"范围内的测试"以路径落在声明清单/命令覆盖内为判定（机械执行，不做依赖分析）。_Avoid_：测试分组、模块测试、任务间验证
- **孤儿测试**：测试名对不上任何 active spec 的 Scenario，且对应 Requirement 已 REMOVED 或所属 spec 已 superseded 的测试。_Avoid_：过期测试、废弃测试
- **归属裁决**：全量验证中范围外测试失败时，回源分支复跑以判定"本次引入 vs 既有失败"的程序

## 影响面

`skills/writing-plans/SKILL.md`（主体）、`skills/using-git-worktrees/SKILL.md`（基线步骤）、`skills/executing-plans/SKILL.md`（消费方引用）。纯流程文档改动，无代码产物。

## 已确认的关键决策

- 测试范围确定方式：**计划声明制** —— 写计划时推导、命令级落盘、随计划被审；不做执行时动态推导（不可审）、不做独立清单文件（过期风险）
- 推导优先级：**项目已有测试影响分析工具优先**（nx affected / jest --changedSince / pytest-testmon 等，写具体命令），无工具时按 spec `covers` + 影响面推导 glob 清单兜底
- 基线验证**也分域**，全量安全网收敛到最终任务一处；范围外失败以归属裁决兜底——否则开工全量的痛点只解决一半
- 测试退役形态：**随周期退役**（最终任务步骤），不建独立审计命令；判据用 **Scenario 锚点双条件**（对不上 Scenario 且 REMOVED/superseded），非 AI 主观盘点
- quick-fix 不纳入：无计划载体、只跑复现+相关测试，痛点不成立（YAGNI）

## 行为规范（Requirements）

修改既有 skill 行为，采用差量三节。

### ADDED Requirements

### Requirement: 计划头部声明相关测试范围

writing-plans 生成计划时 SHALL 在计划头部产出「相关测试范围」节，内容为命令级测试执行声明，推导以项目测试影响分析工具优先、spec `covers` + 影响面 glob 兜底。工具存在性以项目依赖/配置清单判定（如 package.json scripts、nx.json、pytest 插件），拿不准时询问用户。

#### Scenario: 有 TIA 工具的项目

- **GIVEN** 目标项目存在 `nx affected` 等测试影响分析工具
- **WHEN** writing-plans 生成计划
- **THEN** 「相关测试范围」节声明该工具的具体命令而非 glob 清单

#### Scenario: 无工具项目的 glob 兜底

- **GIVEN** 目标项目无测试影响分析工具，spec `covers` 为 `src/export/**`
- **WHEN** writing-plans 生成计划
- **THEN** 「相关测试范围」节列出按 `covers` 与影响面推导的测试文件/目录清单

#### Scenario: 纯文档特性产出空范围

- **GIVEN** spec 无代码产物（`covers` 为空数组或全为文档路径）
- **WHEN** writing-plans 生成计划
- **THEN** 「相关测试范围」节显式声明为空并注明原因

#### Scenario: 声明命令执行失败回退全量

- **GIVEN** 计划声明的 TIA 命令在执行时报错或工具不可用
- **WHEN** 执行方运行该声明
- **THEN** 回退运行完整测试套件，并向用户注明声明已失效、建议修订计划

### Requirement: 随周期测试退役检查

最终任务在全量验证通过后、合并前 SHALL 执行测试退役检查：扫描路径落在本计划「相关测试范围」内的测试中的孤儿测试，列清单征询用户，同意后删除并计入提交；无孤儿测试时声明后跳过。"对不上 Scenario"的判定基础是 writing-plans 既有的"测试名沿用 Scenario 名"约定；不遵循该命名约定的历史测试 SHALL 不进入候选（保守豁免）。

#### Scenario: 孤儿测试双条件判定

- **GIVEN** 测试 T 对不上任何 active spec 的 Scenario，但其 Requirement 未被 REMOVED 且 spec 仍 active
- **WHEN** 执行退役检查
- **THEN** T 不进入退役候选清单（双条件缺一不可）

#### Scenario: 删除前必经用户确认

- **GIVEN** 退役检查产出非空候选清单
- **WHEN** 用户未确认
- **THEN** 不删除任何测试

### MODIFIED Requirements

### Requirement: 最终任务归属裁决

（对既有"失败 → 修复后才进入合并"无条件阻塞语义的修改。）执行最终任务全量验证时，若失败测试位于相关测试范围之外，执行方 SHALL 在主工作区的源分支检出上复跑该测试（主工作区有未提交改动则先询问用户），并按结果分流：源分支同样失败则报告用户裁决是否阻塞合并，源分支通过则视为本次引入、修复后方可合并。范围内失败仍按既有语义无条件修复。

#### Scenario: 既有失败不误算到本次

- **GIVEN** 全量验证中范围外测试 T 失败
- **WHEN** 回源分支复跑 T 亦失败
- **THEN** 报告"T 为既有失败"并请用户裁决是否阻塞合并，不自行静默忽略

#### Scenario: 范围外回归被拦截

- **GIVEN** 全量验证中范围外测试 T 失败
- **WHEN** 回源分支复跑 T 通过
- **THEN** 判定为本次引入的回归，修复并复跑通过后才进入合并

### Requirement: 基线验证按声明范围执行

worktree 基线验证（using-git-worktrees Step 3、writing-plans 任务 0 步骤 3）在计划声明了「相关测试范围」时 SHALL 只运行声明范围；失败处置（报告+询问）不变。

#### Scenario: 旧版计划回退全量

- **GIVEN** 计划无「相关测试范围」节
- **WHEN** 执行基线验证
- **THEN** 运行完整测试套件，行为与现状一致

#### Scenario: 空范围的纯文档特性

- **GIVEN** 计划声明「相关测试范围」为空
- **WHEN** 执行基线验证
- **THEN** 跳过测试执行并注明；最终任务全量验证照跑

### Requirement: executing-plans 消费声明语义

executing-plans SHALL 按计划声明的「相关测试范围」执行任务 0 基线验证，并在最终任务执行全量验证、归属裁决与退役检查；对缺该节的旧版计划 SHALL 按全量执行。（引用 writing-plans / using-git-worktrees 的判据，不复制。）

#### Scenario: 消费方不复制判据

- **GIVEN** executing-plans 文档描述新语义
- **WHEN** 审查三文件一致性
- **THEN** 判据原文仅存在于 writing-plans / using-git-worktrees，executing-plans 以引用表达

### REMOVED Requirements

无——最终任务的全量验证保留；其失败处置语义的变化已列入 MODIFIED「最终任务归属裁决」。

## 方案设计

### 数据流

```
spec (covers + 影响面)
   │ writing-plans 推导（TIA 工具优先 → glob 兜底）
   ▼
计划头部「相关测试范围」节（命令级声明，随计划被审）
   ├─→ 任务 0 基线验证：跑声明范围                ┐
   ├─→ 任务内 TDD 步骤：本就只跑各自测试（不变）  ├ 快路径
   └─→ 最终任务：全量安全网                       ┘ 慢路径×1
              ├─ 范围外失败 → 回源分支复跑 → 归属裁决
              └─ 通过 → 退役检查（孤儿测试清单征询）→ 合并
```

### 组件改动

- **writing-plans**：计划头部节模板 + 任务 0 步骤 3 措辞 + 最终任务模板（归属裁决分支、退役检查步骤）
- **using-git-worktrees**：Step 3 参数化（有声明按声明，无声明全量）
- **executing-plans**：任务 0 与最终任务描述同步引用新语义 + 旧版计划兼容句

## 测试与验收策略

纯 skill 文档改动，无可执行测试；验收为文档一致性检查：三文件对新语义表述一致、引用不复制、旧版兼容句齐备，行为规范各 Scenario 作人工/AI 验收对照。

## 风险

- 声明范围推导偏窄 → 回归延迟到最终全量暴露：接受的取舍，安全网保证不漏出合并门
- 三文件表述漂移：`covers` 已将三文件纳入漂移守卫
