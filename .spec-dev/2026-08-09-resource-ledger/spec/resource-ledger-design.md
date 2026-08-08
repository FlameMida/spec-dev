---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——
spec_dev:
  version: 1
  feature: resource-ledger
  status: draft
  covers: []
  sync_commit: null
---

# resource-ledger 设计

## 背景与目标

套件的收尾清理只覆盖 worktree/分支与 visual-preview 服务器，执行与验收过程创建的容器、测试库表、临时目录没有登记与清理机制；acceptance-qa 环境检测也没有"复用已有服务实例"的策略——要么盲目新建、要么冒险共用。本特性建立**资源台账**纪律（创建即登记、清理只遍历台账）与 acceptance-qa 的**隔离复用判定**，quick-fix 等无计划流程以对话记账兜底。

**成功标准**：writing-plans 生成的计划最终任务含资源台账节；executing-plans 执行中创建资源即登记、收尾按台账清理；acceptance-qa 对已有服务实例按"能隔离才复用、无法隔离新建兜底"判定并登记；quick-fix 收尾展示清理清单经确认执行；共享缓存默认保留贯穿全部路径。

## 非目标

- 不做机器可读台账文件（resources.json）——用户已裁决载体为 plan 清理清单动态追加；
- 不做清理 dry-run 脚本、不建独立资源纪律 skill；
- 不动 using-git-worktrees（worktree 清理已有归属，且该文件属子项目④ covers）；
- README 不登记（内部纪律不进用户门面）；
- 不涉及测试分域与退役（子项目④，并行进行中）。

## 术语表

- **资源台账**：计划最终任务内的清理依据清单，每行 `- [ ] <类型>: <标识> —— <清理命令>`，执行中动态追加。_Avoid_：资源清单、cleanup list
- **持久资源**：流程创建的、不随进程退出自动消失的资源（容器、测试库/表、临时目录、后台服务）。_Avoid_：临时资源
- **隔离复用**：在已有共享服务实例内创建专属隔离单元（独立 database/schema/唯一前缀表/命名空间）供测试使用。_Avoid_：直接复用

## 影响面

- 修改：`skills/writing-plans/SKILL.md`（最终任务模板 + 任务结构说明）、`skills/executing-plans/SKILL.md`（阶段 3 登记纪律 + 阶段 6 核对括注）、`skills/acceptance-qa/SKILL.md`（阶段 1 复用判定段）、`skills/quick-fix/SKILL.md`（步骤 6 尾部）；
- evals：`skills/acceptance-qa/evals/evals.json`、`skills/quick-fix/evals/evals.json` 各加 1 条；
- 发布面：CHANGELOG 与版本号由 post-commit 自动发版承载，无手写项。

## 已确认的关键决策

- 台账载体 = plan 最终任务清理清单动态追加，无 plan 流程对话内记账——用户裁决（roadmap 备注）。
- 台账权威定义唯一落在 writing-plans 最终任务模板，其余三处（executing-plans / acceptance-qa / quick-fix）引用不复制——与报告通道同款的"权威定义唯一"模式。
- 复用前提 = 能隔离（独立 database/schema/唯一前缀/命名空间）；无法隔离则新建专用实例兜底；复用决定向用户声明——用户裁决。
- 共享缓存（~/.cargo、pnpm store、npm cache 等）默认保留，仅用户显式要求时清理并单独登记——用户裁决。
- `covers: []`：本特性无新增文件，且 writing-plans/executing-plans 已被子项目④的 active spec 声明拥有，留空规避双 spec 抢占。

（ADR 检查：均为可低成本逆转的文档约定，不建 ADR。）

## ADDED Requirements

### Requirement: 执行中创建即登记

executing-plans 执行任务期间创建计划未预登记的持久资源时，执行者 SHALL 当场向计划最终任务的资源台账追加对应行（就地编辑计划文件），不延迟到收尾补记。

#### Scenario: 验收期新建容器入账

- **GIVEN** 阶段 4 验收需要临时启动一个数据库容器
- **WHEN** 执行者创建该容器
- **THEN** 计划最终任务的资源台账即刻多出一行，含容器标识与对应的删除命令

### Requirement: 清理只遍历台账

最终任务清理步骤执行时，执行者 SHALL 逐条执行资源台账中的清理命令并勾选，SHALL NOT 删除台账之外的任何文件、容器或数据；共享缓存默认保留、不得出现在默认清理范围内。

#### Scenario: 台账外目录不删

- **GIVEN** 工作区存在一个来源不明的 `tmp-data/` 目录，台账中无对应行
- **WHEN** 执行最终任务清理步骤
- **THEN** 该目录原样保留，清理仅覆盖台账行；如执行者认为它可疑，仅向用户报告、不擅自删除

#### Scenario: 共享缓存默认保留

- **GIVEN** 本次构建向 pnpm store 写入了新包缓存
- **WHEN** 执行最终任务清理步骤
- **THEN** pnpm store 不被触碰——用户未显式要求清理时共享缓存不入台账、不清理

### Requirement: acceptance-qa 隔离复用判定

acceptance-qa 环境检测发现运行中的可复用服务实例时，执行者 SHALL 按序判定：能创建隔离单元则复用该实例并仅登记自建隔离单元；无法隔离则新建专用实例并整体登记；两种决定均 SHALL 向用户声明一句；登记目标按载体分流——由 executing-plans 触发时写入计划资源台账，独立触发（无计划）时对话内记账并在验收报告结尾附清理清单；对共享实例 SHALL NOT 执行破坏性操作（DROP DATABASE、清空数据卷、停止/重启非自建容器）。

#### Scenario: 已有 PG 容器隔离复用

- **GIVEN** 环境检测发现一个运行中的 PostgreSQL 容器且当前凭证可建 schema
- **WHEN** 验收需要数据库
- **THEN** 在该实例内创建唯一前缀的专属 schema 并复用，台账只登记该 schema（清理命令为 DROP SCHEMA 该前缀），不登记也不触碰容器本身

#### Scenario: 无建库权限新建兜底

- **GIVEN** 已有数据库实例存在但当前凭证无权创建 database/schema
- **WHEN** 验收需要数据库
- **THEN** 新建专用容器并整体登记（清理命令为删除该容器），不在共享实例上强行写入

#### Scenario: 独立触发对话记账

- **GIVEN** acceptance-qa 由用户直接触发、无计划载体
- **WHEN** 验收过程创建了隔离 schema 与一个临时容器
- **THEN** 资源在对话内记账，验收报告结尾附"本次创建资源清理清单"供用户处置

### Requirement: quick-fix 收尾清单式清理

quick-fix 步骤 6 完成验证后，执行者 SHALL 展示本次修复过程创建的持久资源清单（对话内记账所得）并请用户确认；确认后逐条清理，用户婉拒则 SHALL 保留资源并说明其位置；无创建资源时声明"无待清理资源"。

#### Scenario: 修复后确认清理

- **GIVEN** 修复过程为复现 bug 创建了两张唯一前缀的测试表
- **WHEN** 步骤 6 验证完成
- **THEN** 展示两行清单（表名 + DROP 命令），用户确认后执行并报告结果

#### Scenario: 用户婉拒保留

- **GIVEN** 清理清单已展示
- **WHEN** 用户回复"先留着"
- **THEN** 零删除，回复中说明资源位置与后续手动清理方式

## MODIFIED Requirements

### Requirement: writing-plans 最终任务模板含资源台账（改了什么：清理步骤由固定 worktree 命令扩为台账遍历，新增台账小节）

writing-plans 生成的每份计划最终任务 SHALL 含资源台账小节（初始至少含 worktree 行；写计划时可预登记已知资源）与"按台账逐条清理"的清理步骤；任务结构说明 SHALL 提示创建持久资源的任务预登记台账行。

#### Scenario: 生成的计划自带台账

- **GIVEN** writing-plans 为一个含数据库验收的 spec 生成计划
- **WHEN** 检查计划最终任务
- **THEN** 存在资源台账小节，含 worktree 行与预登记的数据库资源行，清理步骤表述为逐条执行台账命令

## 方案设计

### 架构与组件

- `writing-plans/SKILL.md`：最终任务模板加"资源台账"小节（**权威定义**：行格式、只遍历台账、共享缓存默认保留三条总则）+ 步骤 3 改写 + 任务结构说明一句；
- `executing-plans/SKILL.md`：阶段 3 纪律句（创建即登记）+ 阶段 6 括注（合并前核对台账全勾）；
- `acceptance-qa/SKILL.md`：阶段 1"缺件处置"段后新增"已有服务复用判定"段（三分支 + 禁令 + 登记目标分流：计划台账 / 对话记账+报告清单）；
- `quick-fix/SKILL.md`：步骤 6 尾部加收尾清理段；
- 四处中后三处对台账规则仅引用"以 writing-plans 最终任务模板的资源台账定义为准"。

### 数据流

创建资源（执行任务 / 验收环境）→ 登记（计划台账 或 对话记账）→ 收尾（最终任务清理步骤 / quick-fix 确认清单 / 验收报告清理清单）→ 逐条执行清理命令并勾选 → 台账外零触碰。

### 错误处理

- 清理命令执行失败 → 保留该行未勾选、报告用户，不静默跳过；
- 台账行标识已不存在（资源被外部清理）→ 勾选并注明"已不存在"；
- 复用判定信息不足（无法确认隔离能力）→ 按无法隔离处理，新建兜底。

## 测试与验收策略

纯文档特性，TDD 例外沿用；验收 = 引用方 eval + 文档审查：

| Scenario / 检查项 | 维度 | 执行方式 | 验收证据 |
|-------------------|------|---------|---------|
| 已有 PG 容器隔离复用 / 无建库权限新建兜底 | eval | 验收任务（acceptance-qa evals 新增用例） | eval 用例存在且断言一致 |
| 修复后确认清理 / 用户婉拒保留 | eval | 验收任务（quick-fix evals 新增用例） | eval 用例存在且断言一致 |
| 生成的计划自带台账 / 清理只遍历台账 / 共享缓存默认保留 | 文档审查 | 验收任务（writing-plans 模板条款检查） | 检查记录 |
| 创建即登记（executing-plans 阶段 3 纪律句存在） | 文档审查 | 验收任务 | 检查记录 |
| 台账权威定义唯一（其余三处引用不复制） | 文档审查 | 验收任务（grep 行格式定义仅一处） | grep 记录 |
| 破坏性操作禁令与独立触发对话记账（acceptance-qa 段完备） | 文档审查 | 验收任务 | 检查记录 |
| CHANGELOG/版本号随发版自动化递增 | 文档审查 | 验收任务（合并后核） | 检查记录 |

## 风险与边缘情况

- **与子项目④的合并冲突**：④（并行会话，active spec 拥有 writing-plans/executing-plans）改最终任务步骤 1/头部/退役步骤，③ 改步骤 3 与台账小节——语义正交、文本相邻；实施前先同步 main 最新，插入以"步骤 3：清理"锚点定位，冲突时两者内容并存；
- **台账遗漏**（执行者创建资源忘登记）→ 清理只保证台账内资源，遗漏项由"台账外零触碰 + 可疑项报告用户"兜底，不做扫描推断；
- **登记通胀**（琐碎临时文件全入账）→ 台账限定持久资源（术语表定义），进程内/worktree 内产物随 worktree 删除自然回收、不入账。

## 开放问题

无。
