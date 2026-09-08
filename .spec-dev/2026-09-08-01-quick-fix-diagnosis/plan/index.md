# Quick-fix 轻量诊断与收尾实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill，从 T00 起由主线程逐任务串行执行；无技能环境按完整任务步骤执行。状态唯一来源为 plan/progress.yaml，任务文件不使用复选框。携带时保留整个特性目录。
>
> **偏差处理**：路径/唯一锚点的小漂移先核对意图后就地修正并记录；行为、测试落点、授权门或证据等级变化返回设计，不猜着改。

**目标**：交付 skill-ecosystem-absorption 路线图第 6/8 项，在原六步内实现证据式诊断、真实故障覆盖和可回查收尾。

**Spec**：[quick-fix-diagnosis-design.md](../spec/quick-fix-diagnosis-design.md)，active，12 Requirement / 24 Scenario；[设计审查](../spec/design-review.md) Approved。用户已批准 spec review 与编写计划，尚未批准实施。

**架构**：quick-fix 为唯一产品改动中心；现有 TDD/clarifying/止损单点继续引用。任务内真实模型通过特性专用 CLI 夹具验证，不新增公共运行器或私有 seam。

**技术栈**：Markdown/JSON、Python 3 标准库、Node.js node:test、Git、现有 Claude CLI；不新增依赖。实际客户端/模型继承执行时配置，记录真实回执，不将历史模型写死。

**设计原则**：不留兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策。共享模块判据在 skills/writing-plans/references/design-principles.md；已批准 seam 不重开。

## 文件结构与职责

| 文件 | 职责 | 任务 |
|---|---|---|
| skills/quick-fix/SKILL.md、agents/openai.yaml | 六步诊断、seam/对象边界、收尾及同票摘要 | T01–T03 |
| skills/quick-fix/evals/evals.json | 具名正反行为输入和独立预期，保留旧例 | T01–T04 |
| README.md、README.zh-CN.md | 已完成流程的公开摘要 | T04 |
| 本特性 execution/state.py、record.py | 单写者原子进度与真实命令证据，仅本计划 | T00 |
| 本特性 execution/fixture.py、probe.py | 独立公开CLI夹具与真实模型记录，仅本特性 | T01 |
| 本特性 acceptance/ | 原始模型输出、快照、独立裁决与需求对账 | T01–T05 |
| 本 spec、roadmap、progress | 激活/交付状态、来源绑定与资源闭合 | T00、T06 |

无前置重构需要；无需 expand–contract 或集成组。新计划使用普通 v1 JSON 子集，所有运行值留待 T00 核实；没有并发声明。

## 全局约束与批准测试落点

- 红信号针对原症状；环境/供应方故障不作红。显然小修豁免仅诊断前置；继续 quick-fix 不豁免 TDD、seam或契约同步。
- 偶发可比较继续，证据不足才升级；同根因链为对象，独立旁支无隐式实施授权。
- 模型公共 seam：候选根加载规则后产生的实际决定、工具动作和公共 CLI 文件/退出码/stdout。特性 spec 的测试落点声明为权威，固定话术不作断言。
- 夹具允许控制时序/随机依赖，不 mock 缓存故障算法。decision 模式是给定分支事实下的实际回复；diagnose/repair 模式是实际动作。宿主运行、宿主预置插桩与模型执行分别归因。
- 模型只能读取候选规则和声明的 fixture，不能读取本特性 spec/plan/evals/oracle/judge。工具白名单不是强沙箱，必须独立审计轨迹和源码哈希。
- 每次 probe 使用新 run ID，旧失败不覆盖；先判断 transport，再判断语义。不存在“exit0即PASS”。基线某例已绿则记已有覆盖，不伪造红；真正变更须有对应有效失败证据。
- 各票改 SKILL 同票同步 openai.yaml；保留中文元数据、语言协议、插件根、五条glob及 canonical 引用。
- 本次文档/计划提交使用 SKIP_RELEASE_HOOK=1。实施开始前核对当前发布授权；本计划的示例提交均设 SKIP_RELEASE_HOOK=1，保持已批准本地交付、未push/发布边界，不触发自动发版。不修改 hook。
- 所有任务从 T00 的真实实施仓库根运行，不依赖前一工具调用的 shell 变量。逐任务证据/实现提交与状态提交分开，完成 SHA 指向已经存在的通过验证提交。
- T00/T05/T06 是隔离/验收/交付任务，采用其适用验证，不为流程记录制造生产代码红。普通行为票保持五步。
- 未来代码块仅计划内容，本轮不执行、不建worktree、不调模型。

## 关联 skill 与适用时机

| Skill | 任务/时机 | 单点路径 |
|---|---|---|
| executing-plans | 全计划、任务状态及收尾多维审查 | skills/executing-plans/SKILL.md |
| using-git-worktrees | T00及T06所有权/交付 | skills/using-git-worktrees/SKILL.md |
| test-driven-development | T01–T04有效红绿/已覆盖判定 | skills/test-driven-development/SKILL.md |
| test-strategy | 全部Lane和模型边界 | skills/test-strategy/SKILL.md |
| acceptance-qa | T05独立验收 | skills/acceptance-qa/SKILL.md |
| writing-plans | 状态及资源台账/五查 | skills/writing-plans/SKILL.md |

## 相关测试范围

package.json 当前无 dependencies/scripts，不安装空依赖；无 typecheck，静态检查使用以下现有命令：

```bash
rtk proxy node --test scripts/tests/plugin-root.test.mjs scripts/tests/search-clause.test.mjs
rtk proxy node scripts/validate-skills.mjs
rtk proxy node scripts/check-plugin.mjs --codex-validate
rtk proxy node scripts/check-openai-sync.mjs
```


按实际 covers/引用推导，非空；Markdown行为不是免测文案。T00只跑该相关基线。命令失效需说明并回退完整Node套件；真实失败按基线门处置，不以回退抹除失败。模型行为由T01起的真实探针承担，不在T00消费尚不存在的probe。最终安全网为：

```bash
rtk proxy node --test scripts/tests/*.test.mjs
```


## 任务导航表

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 隔离与基线 | — | 已提交spec/plan、实际Git来源 | binding notes；state.py TASK STATUS --commit SHA --tests pass；record.py TASK LABEL -- COMMAND；相关基线 |
| T01 诊断红、升级与候选 | T00 | 实际绑定、state/record；Spec A01/A02/A09/M01/M02，S01–S04/S17–S23 | fixture.make_fixture(Path, context=None)；probe.py RUN SNN decision或diagnose或repair --prior DIR --seed-instrumentation；逐run原件+judge.json；诊断规则 |
| T02 真实故障落点与对象边界 | T01 | probe/state/record；Spec A03/A08，S05–S07/S15–S16；T01诊断确认协议 | 获批CLI实际诊断记录；seam与对象规则；S05–S07/S15–S16证据 |
| T03 修复收尾四项 | T02 | 同候选diagnose通过记录供repair消费；probe/state/record；Spec A04–A07，S08–S14 | 实际repair、原回放/计数/插桩归属和叙事证据；完整六步 |
| T04 公开说明与旧评测同步 | T03 | 已完整六步及S01–S23证据；Spec M03/S24 | 双语说明、旧qf-small-bug-triggers修正、24项eval和静态映射 |
| T05 验收与完整性对账 | T04 | 所有产品改动/逐场景原件与judge；Spec验收矩阵 | acceptance-report.md、scenario-results.json、resources.json、完整性/多维审查结论 |
| T06 本地交付与清理 | T05 | T00实际来源/归属；T05完整矩阵；当前全部前序完成 | 真实本地合并、资源处置、sync_commit、roadmap delivered、全部completed |

依赖理由：T01使用T00实际隔离和证据工具；T02消费诊断确认及probe；T03真实修复需T02公共落点与对象纪律；T04摘要对应完整六步；T05核对全量产物；T06仅在必需验证/审查通过后交付。共享SKILL修改顺序明确；无多余跨边，无独立链可派并发。

## Scenario 对账

| 任务 | Requirement | Scenario |
|---|---|---|
| 诊断（T01） | A01、A02、A09、M01、M02 | S01、S02、S03、S04、S17、S18、S19、S20、S21、S22、S23 |
| 落点/范围（T02） | A03、A08 | S05、S06、S07、S15、S16 |
| 收尾（T03） | A04、A05、A06、A07 | S08、S09、S10、S11、S12、S13、S14 |
| 公开说明（T04） | M03 | S24 |
| 验收（T05） | 全部 | 24项逐行复核，完整诊断—修复—收尾及旧契约回归 |

## 使用证据与状态工具

state.py不推断测试通过；完成前由主线程核实真实结果并提供已存在的SHA。命令输出用record.py保存stdout/stderr/exit，记录本身不判语义。每次状态写入后单独窄提交progress；模型probe资源预登记也由主线程串行触发并先提交，不允许并行运行。重试record检查使用新的LABEL，恢复先核对已保存代码/提交/证据/合并回执，只续未完成步骤，不能机械重跑已有run、已应用替换、资源创建或合并。

probe CLI：RUN只能含字母数字下划线连字符；SNN必须S01—S24；decision只读、diagnose允许现有回放、repair需同候选已独立通过的真实diagnose目录。--seed-instrumentation仅repair且明确归因宿主。每个输出目录禁止覆写；每个run保留输入、oracle、stdout/stderr、facts、fixture快照和Git bundle，judge只由独立检查者产生。

judge.json最小字段：case、mode、verdict(pass/fail/unverified)、reason、evidence（本run可回查相对路径数组）、scenario_results（本run实际覆盖各SNN的同形结果）。不生成预填pass模板。CLI成功后仍为needs_independent_review。独立审查者从当前spec THEN和实际轨迹核查，不能仅采信模型叙事；辅助结构检查不代替语义复核。

## Self-Review 记录

2026-09-08 主线程五查完成：12条Requirement、24个Scenario均有对应任务和证据类型；T00/验收/交付使用适用流程步骤，T01–T04为五步。七个任务文件与导航一致，六条依赖各有消费接口/验证安全顺序理由；无并发或组声明。独立计划自审未派子代理。

- plan-index 实际exit0；初次因第二张对照表以TNN开头被当作导航而失败，已修正并复验，未修改校验器。
- 21个精确产品替换锚点已按T01→T04在内存顺序模拟，全部唯一；后继摘要消费前票真实新文本。
- 27个Python代码块、11个heredoc Python片段、31个Bash块及4段内嵌JavaScript均通过静态语法检查；未执行生成任务。
- 链接按所在文档目录解析，spec/审查指针存在；恢复路径核对实际binding、真实合并回执、资源先归档再清理及单独状态提交；已销账worktree恢复不再重复删除。
- 只读决策夹具与真实CLI动作夹具分离，避免输入事实被无关源码污染；S01另有实际diagnose探针，S05/S08/S10/S11/S12/S14由真实修复链支持。静态/假设分支/宿主注入/模型动作不互相冒充。

本轮只证明计划结构、语法和路径/锚点一致；真实模型、TDD与验收均未运行，所有任务保持pending，等待实施授权。
