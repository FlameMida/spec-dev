# 多 worktree 状态概览实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 从T00逐任务串行执行；无技能环境按本计划完整步骤执行。任务状态由 plan/progress.yaml 唯一跟踪，任务文件不用复选框；脱离项目携带时保留整个特性目录。
>
> **偏差处理**：路径/唯一锚点机械漂移核对后修正并留痕；公共接口、语法范围、只读边界或必需证据变化回设计，不猜着改、不削弱THEN。

**目标**：交付skill-ecosystem-absorption roadmap第8/8项中AB-34的独立状态CLI，只展示同仓库所有worktree的记录与来源。

**Spec**：[status-overview-design.md](../spec/status-overview-design.md)，active；13 Requirement / 26 Scenario；[设计审查](../spec/design-review.md)两项修订后Approved，用户已通过review并同意编写计划，激活提交7d8d4a87。

**架构**：parse模块负责有界文本语法和状态投影；status模块发现/采集/分组及渲染；CLI管理参数和退出码。commands、manifest提示和README复用同一脚本。不改变既有guardrail或执行协议。

**技术栈**：Node内置模块、node:test、Git、Python3治理/验收记录与现有Claude CLI。零新增运行时依赖；无package scripts/typecheck，不安装空依赖。

**设计原则**：不留兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策。共同判据见skills/writing-plans/references/design-principles.md；读取历史计划是现行合同，不是新迁移层。

## 文件结构与职责

| 路径 | 职责 | 任务 |
|---|---|---|
| scripts/lib/status-parse.mjs | 元数据/v1/旧格式语法及v2结构投影 | T01、T02 |
| scripts/lib/status.mjs | worktree发现、稳定采集、来源与分歧、文本渲染 | T03、T04 |
| scripts/status.mjs | 参数与stdout/stderr/exit | T04 |
| commands/status.md、.codex-plugin/plugin.json、README双语 | 实际CLI入口指引与公开边界 | T05 |
| scripts/tests/status-{parse,plan,collect,cli,entry}.test.mjs | 纯行为与真实FS/Git/CLI回归 | T01—T05 |
| 本特性execution/{state.py,record.py,commit.py,qa.mjs,model.py} | 主线程治理与特性验收材料，不作为产品分发 | T00、T06 |
| 本特性acceptance/、progress、spec、roadmap | 真实证据、恢复与交付 | T06、T07 |

## 全局约束

- 普通v1计划、默认串行；本产品支持v2不代表本计划要用v2。无parallel/integration声明，无前置重构阻碍，不制造T01空重构票。
- 工作目录始终是T00实际binding.worktree；T07实际合并后切到binding.source。来源/分支/base/SHA运行时核验，不能从git-common-dir父目录推断来源。
- Spec明确只读记录；不查真实提交/证据、不输出ready、不写缓存/锁/进度，不调用doctor/网络。schema_version是status输出版本，不是progress格式版本。
- 所有shell命令前缀rtk；Python/Node通过参数数组启动子进程，不把JSON.stringify当shell quoting。
- 每个代码块都是计划中的候选完整内容，实施时先有目标业务红再加入相应行为。新入口的导入/启动错误归invocation；无行为入口壳只用于把测试运行到业务断言，不作为功能完成或绿色证明。对已有函数不得覆盖成空壳造红。
- 只有主线程写progress；每次变化原子保存且单独提交。实现/验证SHA须已经存在；测试完成不等于全矩阵完成。
- 所有本计划提交使用SKIP_RELEASE_HOOK=1，保留本轮本地交付、不push/发布的边界，不让版本自动amend混入文档或任务提交。任何临时Spec-Guard放行都保留原输出且仅限已双向声明的共存切面；未知命中仍阻塞。
- 持久资源先登记后创建，T00独占fixture scope；测试例自身finally清理，失败残留保留并在T07归档后只清自有资源。禁止修改既有脏工作、全局凭据/客户端模型设置或清理共享缓存。

## 公共seam与相关技能

产品公共seam：`node <plugin>/scripts/status.mjs [--repo PATH] [--json]` 的进程结果及项目不变性；`collectStatus(repoPath, io?)` 为公开采集入口。允许替换的外部边界仅FS/Git/时钟，不能替换被测解析与分组算法。T01/T02的纯文本测试只贡献局部证明，T06补齐公开查询。

| 技能 | 用途/位置 |
|---|---|
| executing-plans | skills/executing-plans/SKILL.md：执行、审查和恢复 |
| using-git-worktrees | skills/using-git-worktrees/SKILL.md：T00隔离与来源 |
| test-driven-development | skills/test-driven-development/SKILL.md：有效红/纯重构/例外边界 |
| test-strategy | skills/test-strategy/SKILL.md：fast纯内存、PR真实IO、nightly非阻塞 |
| acceptance-qa | skills/acceptance-qa/SKILL.md：T06全矩阵与独立判读 |

## 相关测试范围

按本spec covers及实际复用入口推导。T00只运行已经存在的相关测试，不能调用尚未创建的status测试：

```bash
rtk proxy node --test scripts/tests/integration-plan.test.mjs scripts/tests/parallel-plan.test.mjs scripts/tests/plan-state.test.mjs scripts/tests/plan-single-format.test.mjs scripts/tests/plugin-root.test.mjs
rtk proxy node scripts/check-plugin.mjs --codex-validate
rtk proxy node scripts/validate-skills.mjs
rtk proxy node scripts/check-openai-sync.mjs
```

各票新测试创建后纳入对应GREEN命令。无测试影响分析工具、无适用typecheck，不新增依赖。声明路径/工具失效才回退全库并记失效原因；真实测试失败不能用回退替代修复。最终安全网：

```bash
rtk proxy node --test scripts/tests/*.test.mjs
```

## 任务导航表

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 隔离与基线 | — | 已提交active spec/plan；实际Git来源 | binding；state.py TASK STATUS；record.py TASK LABEL COMMAND；commit.py TASK start/finish；相关基线 |
| T01 文档与语法解析 | T00 | T00绑定/记录工具；parseUniqueJson(text) | parseRecord(text)；parseMeta(text,kind)；parseRoadmap(text)；outsideFences(text)；fault(code,message) |
| T02 计划状态投影 | T01 | T01解析；readNavigation/validateStateShape/parseParallelBlock | parsePlanFiles({index,progress,taskNames,legacy})：Plan或null |
| T03 多工作区采集与分组 | T02 | T02计划投影、T01文档解析；T00资源scope | collectStatus(repoPath,io?)：Promise<Snapshot>；groupSources(sources)；parseWorktrees(raw) |
| T04 CLI与输出 | T03 | T03 Snapshot/collectStatus | scripts/status.mjs argv/stdout/stderr/exit；renderStatus(snapshot) |
| T05 公开入口 | T04 | T04实际CLI及结果边界 | commands/status.md、manifest提示、双语使用说明；S26真实输入 |
| T06 验收与审查 | T05 | 完整候选、26Scenario、实际红绿与入口 | qa.mjs RUN、model.py RUN CASE；逐场景报告/独立判读/资源/哈希；必需验收通过 |
| T07 本地交付 | T06 | T06验收与审查；T00实际绑定及所有权 | 真实合并/归档/清理回执、sync_commit、AB-34交付、全部completed |

依赖理由：语法消费记录工具；计划投影消费语法；采集消费文档/计划协议；CLI消费采集；入口消费实际CLI；验收冻结全部产品；交付消费验收和资源归属。无仅为限制并发而添加的无依据边。

## Requirement / Scenario 覆盖与验收归属

| Requirement | Scenario | 实现/任务内验证 | 收尾必需证明 |
|---|---|---|---|
| R01 | S01、S02 | T03/T04公共入口与参数测试 | T06 qa S01/S02 |
| R02 | S03、S04 | T03多worktree、T04失效来源 | T06 qa S03/S04 |
| R03 | S05、S06 | T03深夹具与旧位置/链接 | T06 qa S05/S06 |
| R04 | S07、S08 | T01元数据、T03关联/非法状态 | T06 qa S07/S08 |
| R05 | S09、S10、S11 | T01/T02语法、并发/合法v2；T03采集 | T06 qa S09/S10/S11 |
| R06 | S12、S13 | T01围栏/T02旧格式、T04CLI | T06 qa S12/S13 |
| R07 | S14、S15 | T02非法结构/T03发现/T04部分结果 | T06 qa S14/S15 |
| R08 | S16、S17、S18 | T03分组/差异/单来源 | T06 qa S16/S17/S18 |
| R09 | S19、S20 | T04JSON/文本/排序 | T06 qa S19/S20 |
| R10 | S21、S22 | T04真实退出码与部分结果 | T06 qa S21/S22 |
| R11 | S23 | T03IO轨迹/T04真实文件与Git前后 | T06 qa S23、模型只读核对 |
| R12 | S24、S25 | T03真实FS受控写者、公开collectStatus | T06 qa S24/S25；非事务边界明确 |
| R13 | S26 | T05入口回归 | T06真实模型normal/divergent/partial三例及独立判读 |

fast：T01/T02纯解析/分组；PR：实际文件/Git/CLI、发布检查、全部必需模型三例；nightly：S26多trial补充，未执行写not_run。所有26Scenario有固定命名入口，任何子断言缺证据不能只因case exit0填PASS。

## 运行记录、提交与失败恢复

T00物化state/record/commit工具。T01—T05在各票开头调用commit.py TASK start，五步后调用finish；它只stage本票声明路径、本spec及证据，遇其他暂存项先停。finish前主线程核对真实红与绿色日志，创建本票execution/serial/TNN/selected.json（red、green为实际label）和red-review.json（verdict、reason、evidence）。这些是对真实原件的选择与判读，不能预填为有效红。

例如T01首次两次记录都确实产生且已判读时，保存如下两个JSON；重试用真实label替换，reason必须写实际失败断言及其对应THEN，不能照抄示例：
```json
{"red":"red","green":"green"}
```
red-review.json由人工判读生成，无预填PASS范本。必要字段和值域：`verdict=valid_behavior_red|invocation_failure|invalid_red`、`reason`非空、`evidence`为本票日志相对路径数组。仅valid_behavior_red可进入finish；无入口/导入错误记录为invocation_failure，再让测试真正到达业务断言。

失败命令回执保存后，用该票具体ID运行state.py TASK blocked --note 实际原因，再窄提交progress。下面是T03的完整失败保存示例，其他票使用各自ID与真实原因，不得谎称本示例已执行：
```bash
rtk proxy python3 .spec-dev/2026-09-10-01-status-overview/execution/state.py T03 blocked --note 'T03 latest recorded check failed; inspect execution/serial/T03 before retry'
rtk git add .spec-dev/2026-09-10-01-status-overview/plan/progress.yaml
rtk proxy env SKIP_RELEASE_HOOK=1 git commit -m 'chore(T03): save blocked checkpoint'
```

恢复先核对binding、工作区/分支、已有SHA/原始日志、current和资源实体；不重复创建或把completed重做。失败后重试用新label、保留selected的历史更换说明；state.py完成SHA为已存在实现提交，进度单独提交。T06模型/机器资源在创建前单独登记，T07从真实source清理，不能在被删worktree中写锚点。

## 计划期自检与执行边界

计划期只写本目录文档并进行静态语法/路径/导航校验；不运行任务、不创建执行worktree、不执行候选业务代码或模型验收。产物中的实现代码是待TDD逐项消费的候选，不是已测试产品。

完成前主线程做五查：13Requirement/26Scenario覆盖；无占位；跨票类型一致；导航/文件一致；每条依赖有真实消费理由。对代码块在内存做语法检查、对README锚点做内存匹配、验证真实引用路径。具体结果见self-review.md。
