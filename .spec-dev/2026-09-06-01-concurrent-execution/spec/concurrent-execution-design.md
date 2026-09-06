---
spec_dev:
  version: 1
  feature: concurrent-execution
  status: draft
  covers:
    - "skills/executing-plans-parallel/**"
    - "agents/implementer.md"
    - "skills/executing-plans/SKILL.md"
    - "skills/executing-plans/agents/openai.yaml"
    - "skills/executing-plans/evals/**"
    - "skills/executing-plans/references/review-orchestration.md"
    - "skills/executing-plans/references/delivery-channels.md"
    - "skills/writing-plans/SKILL.md"
    - "skills/writing-plans/agents/openai.yaml"
    - "skills/writing-plans/evals/**"
    - "skills/requirement-analysis/references/codex-compat.md"
    - "scripts/validate-output.mjs"
    - "scripts/lib/parallel-plan.mjs"
    - "scripts/schemas/implementation-result.json"
    - "scripts/schemas/README.md"
    - "scripts/tests/parallel-plan.test.mjs"
    - "scripts/tests/parallel-integration.test.mjs"
    - "scripts/tests/plan-index.test.mjs"
    - "scripts/tests/plugin-root.test.mjs"
    - ".claude-plugin/marketplace.json"
    - "guardrail/templates/CLAUDE.md.snippet"
    - "guardrail/templates/AGENTS.md.snippet"
    - "guardrail/README.md"
    - "guardrail/README.zh-CN.md"
    - "README.md"
    - "README.zh-CN.md"
  sync_commit: null
  supersedes:
    - ".spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md"
    - ".spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md"
  superseded_by: null
---

# 可选并发执行（concurrent-execution）设计

> roadmap [skill-ecosystem-absorption](../../roadmaps/2026-09-03-01-skill-ecosystem-absorption.md) 子项目 #2；吸收报告 AB-44 / AB-10 / AB-11 / AB-33。用户于 2026-09-06 批准具体设计。本文件为待审查的设计契约，尚未实施或激活。

## 背景与目标

默认 executing-plans 由主线程逐票实现，已有依赖导航表和渐进加载能力，却不能安全编排多个写代码的子代理。上游 implement-spec beta 提供独立 worktree 与 frontier 模式，但没有本项目要求的 TDD、进度唯一写者和契约自检协议。本特性为既有执行链增加明确选择后才启用的并发分支，并把其结果收回既有审查、验收和交付闭环。

**成功标准**：未选择并发的请求保持串行；合格的独立任务可在不同 worktree 同时执行；越界写、重复认领与未集成结果不能解锁后继；中断后从可核验事实恢复；本地与 PR 两种交付通道都有明确完成证据。

## 非目标

- 不替换默认串行范式，不改变 TDD、一次一题、契约偏差裁决或最终多维审查纪律；不吸收 roadmap #3—#8 的行为。
- 不实现多人分布式调度、远端队列、自动抢占租约、merger 子代理或通用 Agent 运行时。
- 不迁移存量单文件计划、不自动把缺写集合的历史计划补成并发计划；不默认推送、创建 PR 或合并远端 PR。
- 不把 Bash/Edit/Write 权限表描述为操作系统级隔离保证；worktree 也不隔离端口、数据库与全局 Git 状态。

## 术语表

- **集成工作区**：主线程持有、接收所有票代码的 worktree；来源分支与其分开。
- **写集合**：任务获准修改的仓库根相对文件路径集合；含新增、修改、删除及重命名两端。
- **ready 任务**：所有依赖均已 completed 的 pending 实施任务；不含 T00、验收与最终任务。
- **认领键（claim_key）**：单次任务尝试的唯一标识，由主线程生成并先登记再派发。
- **实现提交 / 集成提交**：前者是子代理提交 tip，后者是主线程接受该结果后的集成分支 tip；状态提交另行记录进度，避免自引用 SHA。

## 影响面与定义点

- 新增 `skills/executing-plans-parallel/`（SKILL、openai.yaml、evals 与 trigger-evals）和 `agents/implementer.md`；登记 Claude marketplace，其他平台继续按现有目录发现。元数据与新增语言协议采用中文；不清理无关历史文本。
- executing-plans 增条件提议与分支委托；串行/并发共用 `references/delivery-channels.md` 定义本地/PR 出口，收尾审查仍引用 review-orchestration。默认串行介绍保留，README 与 guardrail snippet 中无条件的“子代理不写码”改成默认模式限定。
- writing-plans 是写集合、progress 扩展与资源台账的定义点；新 skill 只规定编排流程。TDD、worktree、插件根解析、失败隔离、Codex 工具映射继续引用原定义点。
- `scripts/validate-output.mjs` 保留原 plan-index 行为并增加并发声明验证；`scripts/lib/parallel-plan.mjs` 承载可测试的声明、路径及结果核验逻辑，不负责调模型、调度或合并；新增 implementation-result schema。既有 check-plugin/validate-skills 自动发现能力无需修改。
- 执行期只读探索笔记由主线程收纳到同特性目录 `research/`，结果证据收纳到 `execution/<claim_key>/`；它们是输入/证据，不是另一份任务状态源。

## 已确认的关键决策

- 正式独立 skill、显式 opt-in、主线程唯一状态写者与 merger；每票 TDD + 契约自检、全局收尾纪律继承（[ADR-0007](../../adr/0007-opt-in-concurrent-execution.md)）。
- 写集合放 index 的可选机器可读声明、运行状态放 progress：保留三件套与四列导航；拒绝独立调度文件造成重复索引，也不为并发扩充导航表列数。声明代表能力，不代表用户已经选择并发。
- 一个特性同一时刻只有一个编排主线程；认领与锁只用于排他和恢复，不引入分布式调度。
- 任务完成以集成后验证为准；资源先登记后创建；PR ready 与实际合并分别记账。上述细节落实用户批准的七项设计，不扩大交付范围。

## 取代与共存

- [部分取代] `.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md`：Requirement「plan 单一形态」增加可选并发声明与运行扩展；「渐进执行与断点恢复」增加多 worktree、认领、集成完成与恢复语义；「资源登记纪律」增加子代理创建前由主线程登记。下文 MODIFIED 完整继承串行与存量读取行为，分别定义 opt-in 例外。其「存量计划兼容读取」保持冻结，不取代。
- [部分取代] `.spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md`：Requirement「README 漂移修正」中的固定 13 skill、6 trigger-evals 与 schema 计数随新增正式 skill/schema 更新，保留四项 Self-Review 和 scripts 目录事实；其余插件根、依赖区分、纯壳委托、失败隔离、区间展开纪律分面共存。
- [分面共存] `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md`：新增 skill 登记和输出 schema 使用既有分发与校验机制；相关旧计划/恢复/资源条款已有 Superseded 标注，不再作为取代目标。现行搜索优先级、编号与 roadmap 胶囊语义继承。
- [分面共存] `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md`：只修改所覆盖文件的执行模式/追溯说明，取代时序、covers 双声明和守卫机制不变；Spec trailer 是追溯字段，不是绕过守卫的指令。
- [分面共存] `.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`：相关测试范围声明约束每个执行 worktree 的基线，最终全量安全网及范围外失败裁决不变。
- [分面共存] `.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md`：保留「清理只遍历台账」及验收隔离复用；旧「执行中创建即登记」已被后继取代，本次修改其 plan-single-format 后继。
- [零动作] clarifying-skill、triage-routing：无路径或行为交集。ADR-0005 的三件套、四列、单一事实源与拒绝编译快照不被推翻；ADR-0006 原样继承。
- 新 spec 与共存 spec 各自声明 covers；实施提交须手工运行漂移检查，改单一分面时按现有机制明确说明，不以删除 covers 放行。新接管路径为并发 skill、implementer、交付 reference、并发核验模块和新 schema/测试。draft 阶段不改旧 spec；激活时打 pending，交付才做部分取代回写。

## MODIFIED Requirements

### Requirement: plan 单一形态（改了什么：增加可选并发声明，保留现有结构）

writing-plans SHALL 始终生成 index.md + tasks/TNN.md + progress.yaml：index 含头部、全局约束、相关测试范围和四列导航表；任务正文含文件块、接口块、TDD 五步且无复选框；T00 为隔离工作区、最大号为最终任务、验收任务如有居其间；progress 为唯一状态源并预登记已知资源；生成后 plan-index 校验失败不得交付。依赖闭区间、无环与文件一一对应语义不变。具备可声明独立写集合的分文件计划额外生成下文 `parallel` 块，其他计划省略，不恢复阈值门控或单文件生成分支。

#### Scenario: S01 普通计划保持串行可执行
- **GIVEN** 没有 parallel 块的三任务分文件计划。
- **WHEN** 校验并执行。
- **THEN** 原 plan-index 校验通过、串行执行，不要求迁移或新增字段。

#### Scenario: S02 并发声明损坏不可交付
- **GIVEN** parallel 块引用 T99 或含绝对路径、父目录逃逸、重复任务键。
- **WHEN** 运行 plan-index。
- **THEN** exit 1 并定位错误；不忽略损坏声明或派工。

### Requirement: 渐进执行与断点恢复（改了什么：增加 opt-in 认领与集成恢复）

执行者 SHALL 启动只读 index、progress 与 spec，执行 TN 时只读该任务正文和依赖的产出接口行；串行每任务完成后原子更新 progress 并提交，恢复核对 worktree、分支、commit 与任务文件，从最小编号 ready 任务继续，不重跑已 completed 任务。并发模式主线程依据入口声明派发，子代理按同一渐进纪律读自己的任务；代码与状态分开提交，完成判据及恢复以本 spec 的核验协议为准。存量单文件仍按复选框和 feat(TN) 提交恢复、不生成 progress、不新增并发条款。progressive 两个旧 reference 保持删除，定义留在现有 SKILL 本体。

#### Scenario: S03 恢复中间合并而不重复应用
- **GIVEN** T01 的实现提交已成为集成 HEAD 的祖先，但 completed 状态提交前会话中断。
- **WHEN** 主线程恢复并核对认领、提交与实际文件。
- **THEN** 不重复合并；补跑未有证据的集成验证，通过后补进度提交，再解锁后继。

#### Scenario: S04 不一致恢复停止受影响任务
- **GIVEN** 某认领的 worktree、任务文件或实现提交缺失，或出现无法解释的集成提交。
- **WHEN** 恢复。
- **THEN** 报告具体不一致并冻结该任务及依赖闭包；不猜 completed、不重派仍可能存活的 agent。

### Requirement: 资源登记纪律（改了什么：并发资源由主线程创建前登记）

执行者 SHALL 保留 progress.resources 唯一台账、串行创建即登记和最终只遍历台账清理的规则；并发 implementer 新建持久资源前发送标识、隔离范围和清理命令，由主线程先原子持久化台账并确认，再创建。收不到确认则阻塞该资源操作，不先创建后补账；临时探索/验收创建的资源沿用相同规则。存量单文件仍就地使用最终任务台账，quick-fix/acceptance-qa 继续引用 writing-plans 定义点。

#### Scenario: S05 资源消息中断不留未知资源
- **GIVEN** implementer 请求新测试数据库，但主线程确认消息尚未收到。
- **WHEN** 会话中断。
- **THEN** implementer 没有创建数据库；若主线程已预登记，恢复时查询是否存在再继续或记未创建，不删除同名他人资源。

### Requirement: README 漂移修正（改了什么：新增 skill 后按实际集合更新计数）

README 双语 SHALL 与磁盘正式 skill、trigger-evals 和 schema 集合一致：本次增加 executing-plans-parallel 正式 skill 及 trigger-evals，目录列出它和 implementer；保留 doctor/update-vendored 条目及 writing-plans 四项自检；区分子代理输出 schema 与 vendored manifest schema，加入 implementation-result。计数测试比较实际集合，避免把旧数字作为永久契约。

#### Scenario: S06 正式登记与文档集合一致
- **GIVEN** 新 skill、openai.yaml、evals 和 schema 已就位。
- **WHEN** 运行包校验与文档集合检查。
- **THEN** marketplace 不遗漏/悬空、两份 README 列出全部 14 个 skill 和 7 个 trigger skill；schema 分类与磁盘一致。

## ADDED Requirements

### Requirement: 并发入口三条件

executing-plans SHALL 仅在用户明确选择、导航拓扑存在至少两个无相互依赖路径的可并发实施任务、写集合及资源隔离检查通过时委托 executing-plans-parallel；满足资格但用户未选择时只提议。入口判断拓扑潜力，不要求 T00 已完成；实际派发必须等依赖全 completed、任务成为 ready。共享 T00 或共同前置不妨碍独立；T00、验收和最终任务永不派给 implementer。只剩一票时可继续已选择模式，但同时在途票之间始终无写/资源冲突；能力不可用或声明缺失时说明原因走串行。

#### Scenario: S07 普通继续不自动并发
- **GIVEN** 导航表有两条独立链、声明有效，用户只说“继续计划”。
- **WHEN** executing-plans 载入。
- **THEN** 不把该话语视作并发选择；沿用已记录的模式，首次模式未定时默认串行并可提议。

#### Scenario: S08 显式选择后的真实并发
- **GIVEN** 用户已选并发、T01/T02 均依赖尚未执行的 T00、写集合不相交且资源可隔离。
- **WHEN** 运行编排。
- **THEN** 入口接受并发选择，先由主线程完成 T00 再派两票；两票在不同 worktree 有重叠的执行时间，最终由主线程逐个核验并集成；最终任务不被提前派发。

### Requirement: 写集合与资源冲突准入

主线程 SHALL 在派发前与接收结果时核对下文写集合规则，不能把“不同 worktree”当成共享服务隔离证明；锁文件、生成文件、rename 两端、数据库/端口等冲突票必须排序或阻塞，要求扩大写集合的票先报偏差再由主线程处理。

#### Scenario: S09 同写锁文件的票不并发
- **GIVEN** 两票业务文件不同但都声明 package-lock.json，或都使用同一个不可隔离测试库。
- **WHEN** 选择派发集合。
- **THEN** 不同时派发这两票；有其他独立票可继续，不伪造额外依赖或认定整份计划无效。

#### Scenario: S10 路径越界结果拒收
- **GIVEN** 实际 diff 含未声明文件、rename 的未授权旧路径或符号链接逃逸。
- **WHEN** 主线程核验结果。
- **THEN** 不集成、不置 completed，报告路径与 claim；子代理未跟踪和未提交改动也被核对。

### Requirement: 唯一编排者与先认领后派发

主线程 SHALL 在共享 git common dir 内取得特性级排他锁，并在 progress 持久化唯一 claim_key 后才派发；同一任务最多一个有效认领、只有持锁主线程能写 progress。锁载荷只含 owner 与规范化计划路径，任务状态仍只在 progress；不因超时自动偷锁。

#### Scenario: S11 两主线程重复启动
- **GIVEN** 主线程 A 持有同一特性锁且 T01 已认领。
- **WHEN** B 从另一个 worktree 的不同绝对计划路径启动相同仓库根相对特性。
- **THEN** B 无法取得锁，不写 progress、不派发 T01；报告现有 owner。

#### Scenario: S12 旧结果重复回报
- **GIVEN** T01 已接受某 claim，或失败后已生成新 claim。
- **WHEN** 收到重复或过期 claim 的完成消息。
- **THEN** 已接受同一结果幂等忽略，旧 claim 不更新新尝试状态。

### Requirement: implementer 独占执行契约

implementer SHALL 在给定绝对 worktree 内核对仓库、分支和基线，读取指针输入并完成 TDD 五步及两项自检，返回 implementation-result；仅修改获准业务/测试文件，不编辑 spec/plan/progress、不合并或推送、不操作共享 stash、不创建 PR、不自行派生写码代理。现行 TDD 的已授权例外仍然有效，但例外票与相关基线测试范围显式为空的票由主线程串行执行，不派给 implementer；不撤销已有例外、不强制补造测试。spec 自检只查 over/under-building 与契约锚定。

#### Scenario: S13 基线错误先停
- **GIVEN** 工具继承了主线程 cwd，或 worktree HEAD 不是派发基线。
- **WHEN** implementer 准备首次写文件。
- **THEN** 先切到正确 worktree 并复核；无法建立绑定则 blocked，主线程工作区零业务改动。

#### Scenario: S14 红绿与自检证据齐全
- **GIVEN** 一票有可复现的失败测试。
- **WHEN** implementer 报成功。
- **THEN** 报告含红测试的预期失败证据、绿测试通过证据、实现提交及两项自检结果；编译/环境故障不能冒充有效红测试。

#### Scenario: S22 已授权免测或空基线范围保留串行语义
- **GIVEN** 某票已获用户授权 TDD 例外，或适用的计划基线测试范围显式为空。
- **WHEN** 生成并发声明或准备派工。
- **THEN** 该票不进入 implementer 并发集合，由主线程排空在途票后串行执行，分别记录授权例外或空基线原因，不伪造 tests: pass；其他具备完整测试条件的票仍可并发。空基线只豁免基线测试，本身不构成票内 TDD 例外。

### Requirement: 集成验证后才完成

主线程 SHALL 先核对 schema、claim、真实 Git diff、提交 ancestry、干净工作区与测试证据，再以保留实现提交 ancestry 的 merge 集成到当前集成 tip，运行票的集成验证后才记录 completed；任何冲突停止合并并交用户裁决，测试失败保留受影响状态为 blocked，后继不得消费未验证接口。

#### Scenario: S15 实现完成不解锁依赖
- **GIVEN** T01 已返回成功但尚未集成，T03 依赖 T01。
- **WHEN** 主线程重算 ready。
- **THEN** T03 不进入 ready；集成验证通过并持久化 completed 后才进入。

#### Scenario: S16 合并冲突或集成测试失败
- **GIVEN** 两个独立票在不同基线完成，当前集成 tip 已变化。
- **WHEN** 后一票合并冲突或合并后的相关测试失败。
- **THEN** 冲突交用户裁决，不自动选 ours/theirs；失败票及后继冻结，不标通过，其他票只能在已验证基线上继续。

### Requirement: 执行期探索与指针派发

主线程 SHALL 将执行期事实调研交给只读 explorer 并收纳带来源指针的 research 笔记，向 implementer/reviewer 派发任务/spec/依赖接口/笔记/commit 指针以及必要编排元数据，不复制完整正文；探索发现的契约偏差按原三级纪律裁决，不由 explorer 改码或改计划。

#### Scenario: S17 探索发现接口偏差
- **GIVEN** T02 的只读探索发现计划接口与现行 spec 不一致。
- **WHEN** 返回带 file:line 的笔记。
- **THEN** 主线程冻结相关票并按契约偏差处理，不把探索意见当作隐式改约授权；不重复派发已覆盖的同一事实调查。

### Requirement: 特性级双交付通道

执行链 SHALL 使用共用交付规则：默认本地合并与 sync_commit 锚定；用户已授权 PR 工作流或仓库明确要求 PR 时准备一个特性级 PR，在已有实际差异且具备相应发布授权后才 push/create draft，零差异时不造空提交。通过全套审查/验收与对账后可标 ready，但实际合并证据取得前最终任务维持 in_progress、roadmap 维持 in-progress、sync_commit 保持未锚定；实际合并后才完成取代回写、清理与锚定。不能把受保护来源分支当作原地实施理由；无法确认远端策略时报告未知，不推断未保护。

#### Scenario: S18 零差异或无发布授权
- **GIVEN** 特性分支尚无差异，或会话尚未授权发布远端。
- **WHEN** 准备 PR 通道。
- **THEN** 本地继续获准工作并准备 PR 文案；不创建空提交，不 push/create PR；需要发布时复用已有授权，缺失才请求。

#### Scenario: S19 PR ready 尚未合并
- **GIVEN** 审查、验收和对账通过，PR 已 ready 但仍 open。
- **WHEN** 交付状态回写。
- **THEN** delivery.state 为 awaiting_merge，最终任务与 roadmap 不记 delivered，不声称已合并或完成 sync_commit。

#### Scenario: S20 PR 实际合并后恢复收尾
- **GIVEN** PR 后续已合并且可获得目标分支上的实际提交。
- **WHEN** 用户继续收尾。
- **THEN** 核对实际合并内容与已验收树，必要时补验证，再执行取代回写/清理/sync_commit/roadmap delivered；若写回受保护目标，走获准的后续 PR，不绕过保护。

### Requirement: 既有收尾审查全量继承

并发执行 SHALL 在全部实施票集成后交回 executing-plans 的审查、completeness critic、矩阵验收、例外驱动裁决和最终全量验证；票内自检或分支测试不能代替全局审查，Spec 追溯 trailer 仅增加可追溯性、不代替漂移检查。

#### Scenario: S21 全票绿仍执行全局收尾
- **GIVEN** 所有 implementer 测试通过并已集成。
- **WHEN** 进入收尾。
- **THEN** 审查范围为整个特性相对 base 的 diff，验收与最终全量检查照常执行；只有全部门通过才进入相应交付出口。

## 方案设计与关键接口

### index 并发声明

index 头部增加至多一个标记为 `yaml spec-dev-parallel` 的 fenced block；不存在表示无并发声明。其结构为 `parallel: { tasks: { TNN: { writes: [路径], resources: [排他资源键] } } }`。只声明可派给 implementer 且写集合非空的票，已知 TDD 例外或显式空基线范围的票不列入；未声明票由主线程串行执行且执行时排空 implementer。writing-plans 从任务文件块产生声明并在 Self-Review 核对同义一致；入口校验不预读 tasks 正文，implementer 读取自己任务后再核对文件块，任何差异阻塞该票。执行中才发现已授权例外时，子代理先回报 blocked，由主线程按 S22 接管，不能伪造 ready 的测试证据。

写路径为精确文件名，不支持 glob/目录授权；使用 `/`、仓库根相对，拒绝空值、绝对路径、`..`、重复规范路径、大小写/Unicode 规范化碰撞；不存在的新文件按最近存在祖先解析符号链接。`.git`、`.spec-dev`（含所有计划/状态/证据）及其符号链接别名禁止进入 implementer 写集合。不同票的同一路径或祖先文件路径冲突不能同批；“不同文件读写形成语义依赖”必须在导航表声明依赖，路径不相交不证明接口独立。

resources 是该票使用的排他外部资源键（如数据库、端口、输出目录）；同键不能同批。主线程用 claim 命名空间分配可隔离资源，不能把同一实体换名伪装隔离；无法确认隔离范围的票不加入并发声明。资源实际标识/清理命令只记 progress.resources。

`plan-index` 继续输出现有 `{ok,schema,file,errors}` 契约；新声明存在时校验其结构和合法路径，写集合重叠表示调度冲突而非整份计划非法。不新增第三种计划文件或解析全部 YAML 特性：读取仓库当前支持的受限映射/数组形制，拒绝重复键和不支持的语法，不默默截断。

### progress 扩展与独占写

保留 `format_version: 1`、四种任务 status、resources、notes；增加可选 `execution`，其 `mode: parallel` 为并发语义的明确判别项。未出现该项的存量 progress 原样串行读取。`current` 只指主线程正在执行的串行票；并发派发期间为 null，不用它推断所有任务空闲，活动票以 tasks 中 in_progress 的认领为准。

`execution` 字段：`mode`、`owner`（会话唯一标识）、`integration_worktree`（绝对路径）、`integration_branch`、`base_commit`（特性审查基线）、`validated_commit`（最后通过集成验证的 tip）。可选 `delivery`：`channel: local|pr`、`state: implementing|awaiting_merge|merged|completed`、`source_branch`、`pr_url`、`merge_commit`；记录事实变化，不以 state 自证合并。

`tasks.TNN` 继承 status/commit/tests/deviations，增加 `claim: { key, owner, agent_id, worktree, branch, base_commit }`、`implementation_commit`、`result_path`。agent_id 在工具返回后补写；派发前 claim 已持久化，若在派发与补写之间崩溃则核对运行中 agent 与 worktree，不盲重派。completed 的 `commit` 是通过集成验证的提交，不能填包含该 SHA 字段的状态提交；实现提交和进度 checkpoint 分开，后者随特性分支保存。每次新尝试以新 key 替换 claim，旧 key 与处置原因追加 notes，历史结果文件保留。progress 使用临时文件+rename 原子更新，不允许子代理副本合并回来。

特性锁落在解析后的共享 git common dir 的 `spec-dev-locks/<feature_key 的哈希>/`，用原子创建取得；`feature_key` 是计划所属 worktree 根下、采用 `/` 的仓库根相对特性目录（例如 `.spec-dev/2026-09-06-01-concurrent-execution`），禁止把 worktree 绝对前缀纳入哈希。同一仓库的不同 worktree 因共享 common dir 且 feature_key 相同而竞争同一锁；不能从另一个 worktree 的 cwd 直接对绝对计划路径求相对值。锁载荷中的绝对路径仅用于定位原编排者档案，锁非第二份任务状态源。挂起前停止/回收在途代理、写进度 checkpoint 后可释放自己的锁。崩溃恢复需要核实原 owner/agent 已停止并对照磁盘；无法核实则报告占用，不按时间自动接管。不同主线程对同一特性不得各自宣称 progress 的写权限。

### 派发、结果与集成

主线程先完成 T00 和相关基线（显式空范围按原 test-scoping 跳过并注明），再从当前 validated_commit 建具备测试条件的每票独立分支/worktree，准备依赖与被忽略夹具，实际跑该票基线；应当执行的测试若缺工具/夹具、实际零测试或 skip，不能算基线通过。TDD 例外/空基线票按 S22 主线程串行处理，不要求 implementation-result ready；原测试范围和例外授权不因并发 skill 被撤销。每轮按 ready 编号稳定选取互不冲突的集合，数量受当前平台工具实际可用并发能力约束，不写死平台限额、不递归派生 implementer。源分支未提交改动不拷入子工作区。

输入含 task_id/claim_key、worktree、branch、base_commit、计划与 spec 绝对路径、依赖接口定位、writes/resources、测试命令、研究指针和证据位置。平台原生 isolation 可用时也核对实际基线；无 cwd 参数时要求 agent 每条命令显式指定工作目录。不能建立隔离则说明原因按串行降级；后台交互由主线程承接。

implementation-result JSON 的必填字段为 `task_id`、`claim_key`、`status: ready|blocked`、`worktree`、`branch`、`base_commit`、`commits`（提交 SHA 数组）、`changed_files`、`tests`（command/phase/exit_code/evidence_path）、`self_check`（over_under_building/contract_alignment 两项结论）、`deviations`、`resources`、`blockers`、`coverage_note`。ready 要求非空实现提交、绿测试和两项自检通过；blocked 可以没有提交，但 blockers 非空。例外授权以 evidence 指针记录，不能自行报告为 waived。主线程接收消息后把 JSON/证据写到集成工作区 execution/<claim_key>/，子代理不写共享特性档案。schema 失败依现有 canonical 补全一次，再失败主线程接管该票。

实现提交使用 `feat(TNN): ...` 等符合任务意图的前缀并带 `Spec: <仓库根相对 spec 路径>` trailer，guardrail 双语说明其仅用于追溯。主线程用真实 Git 核对报告 tip 可解析、由 claim 基线派生、实际路径属于 writes，检查工作区未提交/未跟踪内容和历史是否混入其他票或元数据；不能只信 reported changed_files。merge 保留 ancestry；禁止 squash/cherry-pick 作为票的集成方式，以便崩溃恢复幂等判定。PR 平台最终 squash 属交付通道，恢复使用实际合并树核验，不套用票 ancestry 判据。

集成一次只处理一票；存在失败未验证合并时暂停新的派发/合并，允许已在已验证基线上运行的独立票完成并暂存回报。主线程不得把失败 tip 作为新基线。契约偏差/冲突交用户后，修订计划与 spec、更新声明并重新校验才恢复；纯路径笔误沿用原小偏差处理，不扩大已派票写集合。

### PR 与最终任务闭环

delivery-channels 同时供串行和并发引用：受保护分支仍在隔离特性分支实现。首个实际差异可来自已批准的 spec/plan，不为开 PR 造无意义提交；已有特性 PR 就复用。文案引用 spec、progress、验收对账位置，只有明确存在对应 issue 且适合关闭时写 closing 关键词。推送/创建/ready/合并动作按已有会话授权与仓库约定执行，探测本身不提供发布授权。

awaiting_merge 可以结束当前执行会话，但不是“全部任务完成”；保留恢复所需分支/状态，闲置 implementer worktree 在核验已集成并登记后可清理。只有取得实际合并证据并完成全部文档回写才进入 completed 与 roadmap delivered；若回写需要另一个 PR，记录其链接并继续 awaiting_merge，不提前宣称已交付。最终 sync_commit 指向实际受保护目标上核验过的代码提交，后续只含文档的锚定提交不形成自引用。取代 pending 的实际翻转随最终交付完成，不以 draft/ready 代替。

## 测试与验收策略

本表属于待执行计划，所有行尚未运行。纯校验逻辑走 fast；真实文件系统/Git/客户端走 PR；真实模型多轮行为评估走 nightly（手动、非阻塞）。不把静态 eval 文案走查或本地模型夹具当作真实模型遵循协议的证明。

| Scenario / 检查项 | 维度 | 执行方式 | Lane | 验收证据 |
|---|---|---|---|---|
| S01 普通计划；S02 损坏声明 | unit | 任务内 TDD | fast | 解析及合法性断言，缺声明旧夹具通过 |
| S03 中间合并恢复；S04 不一致恢复 | integration | 验收任务 (D) | PR | 临时 Git 仓库中断点夹具、恢复输出和提交图 |
| S05 资源确认前中断 | integration | 验收任务 (D) | PR | 本地假资源提供者记录零创建、预登记记录 |
| S06 登记与集合 | integration | 验收任务 (D) | PR | check-plugin、validate-skills、check-openai-sync、集合检查 exit 0 |
| S07 普通继续不并发 | docs/agent | 任务内评估用例编写；验收任务静态走查 | fast | 命中/近似不命中 trigger-evals，走查逐条结论 |
| S08 真实并发 | integration | 验收任务 (D) | PR | 两个真实 worktree、受控执行者时间戳重叠、实际提交/合并、后继解锁 |
| S09 同写锁文件/共享库；S10 越界路径 | unit/integration | 任务内 TDD + 验收任务 (D) | fast/PR | 冲突集合断言；真实 rename/symlink/diff 拒收证据 |
| S11 重复启动；S12 旧结果 | integration/unit | 任务内 TDD + 验收任务 (D) | fast/PR | 两进程竞争锁只一成功；claim 重复/过期幂等断言 |
| S13 基线错误；S14 红绿与自检 | integration | 验收任务 (D) | PR | 错误 cwd 不写主线；schema 正反例及红绿命令证据 |
| S22 已授权免测/空基线 | unit/docs | 任务内 TDD + 验收任务静态走查 | fast | 准入排除与主线程接管用例；空基线不隐式豁免 TDD |
| S15 不提前解锁；S16 冲突/集成失败 | integration | 任务内 TDD + 验收任务 (D) | PR | 提交图、依赖状态、冲突未自动解决、失败未标通过 |
| S17 探索偏差 | docs/agent | 任务内评估用例编写；验收任务静态走查 | fast | 指针派发与偏差阻塞用例 |
| S18 无差异/授权；S19 ready；S20 已合并 | integration | 验收任务 (D) | PR | 受控 PR 适配回放：远端动作记录与各节点状态；不得计为真实托管 PR 已验证 |
| S21 全局收尾 | integration/docs | 验收任务 (D) | PR | 审查/验收输入范围与最终任务顺序，相关 eval 走查 |
| 平台绑定与行为遵循 | agent | 验收任务 (AI，手动非阻塞) | nightly | 可用平台真实 implementer 按任务运行；不可用标 unverified |
| 全量仓库回归与漂移检查 | integration | 验收任务 (D) | PR | node --test、visual-path、包/skill/同步校验与 staged drift，无 skip 假绿 |

## 风险与边缘情况

- 路径排他只能验证文件边界；隐式语义依赖由计划接口/依赖审查和集成测试补足。动态生成文件无法预先声明时该票串行执行。
- 工作区 bootstrap 可触发包锁/生成物修改；这些必须计入 writes 或在派发前完成并验证，不能借“准备环境”绕过写集合。
- hooks 自动改版本、共享 refs/stash、全局测试资源会突破 worktree 隔离。派发前识别：能按仓库获准的配置在票内停用发版钩子并由主线程统一发版就明确记录；不能安全处理则串行，不凭插件自行关闭必需校验。
- 主线程崩溃、子代理不可达和远端 API 不可用都不是 PASS。先保存可核验事实，再按具体阻塞范围处理；外部权限未知只报告未知。
- 新模块只承担确定性验证；不扩展为调度服务。实施中发现需突破此范围按契约偏差处理。

## 开放问题

无阻断设计的问题。实现可以选择与仓库现有风格一致的受限声明解析和测试夹具组织方式，但不得改变上述路径、状态、授权与完成判据。
