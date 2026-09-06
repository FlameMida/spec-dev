# 可选并发执行实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境从 T00 起按序执行至最终任务。任务状态由 plan/progress.yaml 跟踪（唯一状态源）；任务文件无复选框。脱离项目时连同特性目录及 spec 整体携带。
>
> **偏差处理**：路径笔误或意图明确的小遗漏就地修正并记录；接口、数据结构、授权和状态机等契约级偏差停止相关工作向计划作者确认，不猜改。

**目标**：交付显式选择的并发执行 skill，在独立 worktree 实现任务、可靠集成与恢复，启动时用终端表声明模型和思考强度。

**Spec**：[concurrent-execution-design.md](../spec/concurrent-execution-design.md)（active；14 Requirements / 30 Scenarios）。

**架构**：writing-plans 定义可选 index 声明和 progress 扩展；校验模块只处理确定性声明/路径/Git 结果检查；并发 skill 负责主线程编排，implementer 只实现一票。串行/并发复用全局审查与双交付 reference。

**技术栈**：Node.js ≥18、git、现有 JSON Schema 子集、Markdown/YAML；无新增 npm 依赖。

**设计原则**：不留向后兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策。这里的存量只读兼容是已批准契约，不添加新迁移垫片；不扩展成通用调度服务。

## 全局约束

- 本计划采用现有串行执行 skill 开发并发 skill，不用尚未验收的产物调度自身。因此不生成 parallel 声明；具备独立任务拓扑不等于本计划已选择并发。
- format_version: 1；不新增第四个计划文件；四列导航、当前任务渐进加载、单一 progress 状态保持。
- 新增语言协议与元数据描述中文；不清理无关历史语言文本。模型标识/思考强度来自运行平台，未知如实标注，不硬编码当前会话模型。
- 子代理 writes 为精确仓库根相对文件，不含 .git/.spec-dev、目录或 glob；共用 Git refs、端口、数据库与钩子不因 worktree 隔离自动安全。
- TDD 例外不撤销；例外票/空基线票主线程排空在途工作后串行处理，不伪造 pass。
- 默认本地交付，不新增远端发布授权；代码/状态分开记录提交，completed 指已验证集成 SHA，文档锚定不自引用。
- 场景全部转成测试或完整行为评估输入；文档静态评估、真实 Git 和真实模型证据分别记账。无模型 runner 的 eval JSON 不称为已执行模型测试。

## 文件职责映射

| 路径 | 职责 / 任务 |
|---|---|
| scripts/lib/parallel-plan.mjs；validate-output.mjs | 受限声明/路径/真实 Git 结果核验（T01/T02） |
| scripts/schemas/implementation-result.json；schemas/README.md | 输出结构与登记（T02） |
| scripts/tests/parallel-plan.test.mjs；parallel-integration.test.mjs；plan-index.test.mjs；plugin-root.test.mjs | 确定性回归、Git 边界与分发集合（T01/T02/T05） |
| skills/writing-plans/{SKILL.md,agents/openai.yaml,evals/evals.json} | 写集合、progress、资源台账定义点（T03） |
| agents/implementer.md；skills/executing-plans/references/delivery-channels.md | 单票实现协议；共用交付判据（T04） |
| skills/executing-plans-parallel/{SKILL.md,agents/openai.yaml,evals/evals.json,evals/trigger-evals.json} | 正式并发工作流、模型表、切换与恢复（T04/T05） |
| .claude-plugin/marketplace.json；README.md；README.zh-CN.md | 正式登记与双语介绍（T02/T05） |
| skills/executing-plans/{SKILL.md,agents/openai.yaml,evals/evals.json,references/review-orchestration.md} | 默认串行与并发委托、完整审查（T06） |
| skills/requirement-analysis/references/codex-compat.md；guardrail/templates/{AGENTS.md.snippet,CLAUDE.md.snippet}；guardrail/README{,.zh-CN}.md | 工具绑定与追溯说明（T06） |
| 本特性 acceptance/、spec/、progress；旧 spec 两份；roadmap | 验收/取代/交付记录（T07/T08） |

## 相关测试范围

仓库无测试影响分析工具；由 covers 和现有调用方推导。T00 只运行已存在的测试文件：

```bash
rtk proxy node --test scripts/tests/plan-index.test.mjs scripts/tests/plugin-root.test.mjs scripts/tests/validate-keywords.test.mjs scripts/tests/plan-single-format.test.mjs scripts/tests/resource-ledger-split.test.mjs scripts/tests/manifests.test.mjs scripts/tests/search-clause.test.mjs
rtk proxy node scripts/check-plugin.mjs
rtk proxy node scripts/validate-skills.mjs
rtk proxy node scripts/check-openai-sync.mjs
```

T01/T02 创建后新增相关范围：`scripts/tests/parallel-plan.test.mjs`、`scripts/tests/parallel-integration.test.mjs`。最终全量安全网：

```bash
rtk proxy node --test scripts/tests/*.test.mjs
rtk proxy bash scripts/tests/visual-path.test.sh
rtk proxy node scripts/check-plugin.mjs
rtk proxy node scripts/validate-skills.mjs
rtk proxy node scripts/check-openai-sync.mjs
rtk proxy node scripts/validate-output.mjs agent-plugin-1.0.0 plugin.json
```

## 提交纪律

每个实施任务都保留独立核验与提交。窄暂存任务文件；SKILL/openai.yaml 同改同暂存；先更新当前 spec 的真实「实施核对记录」并记录实际命令/结果，再修改其覆盖代码，不能伪造行为变更或测试结论来绕过守卫。代码提交正常发版，由钩子统一维护版本/CHANGELOG；仅文档、请求和状态 checkpoint 用已批准的 SKIP_RELEASE_HOOK=1。提交信息使用实施 worktree 内 `.spec-dev-commit-message`，提交后删除；通过文件传递，不拼接 shell 转义；Spec trailer 只作追溯。

每次手工运行 `rtk proxy node guardrail/check-spec-drift.mjs --staged`，检查每个命中。已批准分面共存为 major-upgrade、supersede-lifecycle、test-scoping、resource-ledger；部分取代的 plan-single-format 与 portability-hygiene 在交付前仍 active/pending，按新 spec 的取代/共存范围解释。只有这些已核验的分面命中可以在提交正文如实写 Spec-Guard off 原因；未知命中先处理，不使用全局环境变量或吞退出码放行。最终旧 spec 回写只修改指定 Requirement，其他现行合同保留。

progress 原子重写；实现提交先产生真实 SHA，再用状态提交记录，不能把计划中的 SHA 示例写成事实。所有测试失败、SKIP、BLOCKED、UNVERIFIED 区分记录。

## 任务导航

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 [建立隔离工作区](tasks/T00.md) | — | 来源分支 main、已提交计划与 index 的相关测试范围。 | 经核验的隔离 worktree、原始 base_commit 与基线结果。 |
| T01 [解析并发声明与写集合](tasks/T01.md) | T00 | `validatePlanIndex(planDir)` 已有 rows/ids/errors 与闭区间展开。 | `parseParallelBlock(markdown, taskIds): {tasks} / null`；`normalizeWrite(value): string`；`resolveWrite(root,value): string`；`conflicting(a,b): boolean`，非法输入抛 Error。 |
| T02 [核验实现结果与真实 Git 写边界](tasks/T02.md) | T01 | `resolveWrite(root,value)` 与既有 JSON Schema if/then/else 子集。 | `verifyResult(report, claim, writes): string[]`；`claim` 含 task_id/key/worktree/branch/base_commit；schema 名 `implementation-result`。 |
| T03 [定义计划声明与恢复字段](tasks/T03.md) | T01 | parseParallelBlock(markdown, taskIds): {tasks} / null；normalizeWrite(value): string。 | writing-plans 的 parallel 声明、progress.execution/tasks.claim/notes/resources 规范。 |
| T04 [定义 implementer 单票协议](tasks/T04.md) | T02,T03 | implementation-result schema；writing-plans 的声明与资源台账。 | implementer 的绑定、TDD、自检与结构化回报协议；delivery-channels 的 local/pr 完成判据。 |
| T05 [注册并发 skill 与完整编排流程](tasks/T05.md) | T01-T04 | writing-plans 声明/progress；implementer 协议；parseParallelBlock/resolveWrite/conflicting/verifyResult。 | executing-plans-parallel 的入口、模型表、独占/切换/恢复、派发/集成、全局收尾协议。 |
| T06 [接通串行入口、共享交付与平台映射](tasks/T06.md) | T05 | executing-plans-parallel 入口/恢复协议；delivery-channels local/pr 完成判据。 | executing-plans 的 opt-in 委托、边界切换、恢复路由与共同交付入口。 |
| T07 [矩阵验收与真实 Git 中断演练](tasks/T07.md) | T01-T06 | 全部实施产物、S01—S30 评估输入、原始 base_commit 到集成 HEAD 的完整 diff。 | acceptance/ 的逐 Scenario 证据与 DELIVERED/BLOCKED/UNVERIFIED 对账。 |
| T08 [全量验证、取代回写、合并与清理](tasks/T08.md) | T07 | 已审查的完整特性 diff、T07 证据、资源台账与来源/原始基线。 | 来源 main 上可核验交付、sync_commit 锚点、已清理台账与 roadmap #2 delivered。 |

## Scenario 覆盖索引

| 场景 | 实现与失败输入 | 验收 |
|---|---|---|
| S01/S02/S09/S10 | T01 解析/path/CLI 反例；T02 Git diff；T05 行为输入 | T07 fast/PR |
| S03/S04/S11/S12/S15/S16 | T02 实际 Git 核验；T05 恢复/集成完整输入 | T07 中断、竞争锁、幂等、失败 tip |
| S05/S13/S14/S22 | T02 schema/Git；T03/T04/T05 资源、绑定、例外输入 | T07 资源零创建、真实红绿、主线程分流 |
| S08 | T05 双 worktree 并发输入 | T07 受控执行者时间重叠、逐票集成与后继解锁 |
| S06 | T02/T05 动态集合与同步校验 | T07 分发检查 |
| S07/S17/S21 | T05/T06 触发、探索偏差、完整审查输入 | T07 静态走查与全局审查 |
| S18/S19/S20 | T04 delivery 规则；T05/T06 通道输入 | T07 受控 PR 回放（不冒充真实远端） |
| S23/S24/S25/S26/S27 | T03 progress；T05/T06 切换/恢复输入 | T07 三个激活断点、请求早存、回执窗口 |
| S28/S29/S30 | T03 声明引用；T05 模型三列表及完整输入 | T07 多配置/未知/恢复夹具与声明追溯 |

## 计划自审与当前状态

计划阶段只创建三件套；所有任务 pending，未建立实施 worktree。交付前逐项做 spec 覆盖、占位符、接口一致、导航一致四查，并运行本仓库绝对路径 plan-index。当前内容中的实现源码、命令和验收处方均为执行输入，不能当已交付证据。

2026-09-06 计划四查结果：14 条 Requirement 均有任务定位，30 个 Scenario 均有完整输入及验收定位；占位符扫描无待补实现；接口与导航一致；plan-index exit 0。内嵌 11 个 JavaScript 块通过 node --check，6 个 JSON 块可解析，1 个 Python 修改脚本可编译。这些是计划质量检查，功能仍未实施、未运行实现测试。
