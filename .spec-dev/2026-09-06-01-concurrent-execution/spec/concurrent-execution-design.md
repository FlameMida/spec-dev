---
spec_dev:
  version: 1
  feature: concurrent-execution
  status: active
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
    - "scripts/tests/search-clause.test.mjs"
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

> roadmap [skill-ecosystem-absorption](../../roadmaps/2026-09-03-01-skill-ecosystem-absorption.md) 子项目 #2；吸收报告 AB-44 / AB-10 / AB-11 / AB-33。用户于 2026-09-06 确认含模型声明、切换与恢复的修订稿；本 spec 已激活，用户已指示开始实施；当前在隔离工作区按已批准计划逐任务实现。

## 背景与目标

默认 executing-plans 由主线程逐票实现，已有依赖导航表和渐进加载能力，却不能安全编排多个写代码的子代理。上游 implement-spec beta 提供独立 worktree 与 frontier 模式，但没有本项目要求的 TDD、进度唯一写者和契约自检协议。本特性为既有执行链增加明确选择后才启用的并发分支，并把其结果收回既有审查、验收和交付闭环。

**成功标准**：未选择并发的请求保持串行；合格的独立任务可在不同 worktree 同时执行；越界写、重复认领与未集成结果不能解锁后继；中断后从可核验事实恢复；本地与 PR 两种交付通道都有明确完成证据。

## 非目标

- 不替换默认串行范式，不改变 TDD、一次一题、契约偏差裁决或最终多维审查纪律；不吸收 roadmap #3—#8 的行为。
- 不实现多人分布式调度、远端队列、自动抢占租约、merger 子代理或通用 Agent 运行时。
- 不迁移存量单文件计划、不自动把缺写集合的历史计划补成并发计划；不默认推送、创建 PR 或合并远端 PR。
- 不在任务写到一半时转交实现上下文，不迁移未提交业务改动；串行转并发只发生在任务完成并保存的边界。
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
- 用户后续批准任务边界上的串行转并发：复用当前隔离工作区和已完成进度，保留最初审查基线，持久化切换检查点后才派发。并发模式内按可用任务决定一次执行一票还是多票，不为调度数量变化反复切换模式。
- 用户要求把模型声明作为并发 skill 自身的规则：首次启动、从串行切入、恢复编排前，明确展示主线程与实现子代理的模型及思考强度；不同配置分组列出，未知项如实标注。本项目不因此固定某个模型名称或强度，也不改变既有模型选择权限。

## 取代与共存

- [部分取代] `.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md`：Requirement「plan 单一形态」增加可选并发声明与运行扩展；「渐进执行与断点恢复」增加多 worktree、认领、集成完成、任务边界切换与恢复语义；「资源登记纪律」增加子代理创建前由主线程登记。下文 MODIFIED 完整继承串行与存量读取行为，分别定义 opt-in 例外。其「存量计划兼容读取」保持冻结，不取代。
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

执行者 SHALL 启动只读 index、progress 与 spec，执行 TN 时只读该任务正文和依赖的产出接口行；串行每任务完成后原子更新 progress 并提交，恢复核对 worktree、分支、commit 与任务文件，从最小编号 ready 任务继续，不重跑已 completed 任务。用户明确要求串行转并发时，在当前任务完成并提交后按本 spec 的切换协议升级，保留已有完成记录，不重做 T00；不满足准入条件则保留串行语义。并发模式主线程依据入口声明派发，子代理按同一渐进纪律读自己的任务；代码与状态分开提交，完成判据及恢复以本 spec 的核验协议为准。存量单文件仍按复选框和 feat(TN) 提交恢复、不生成 progress、不新增并发条款。progressive 两个旧 reference 保持删除，定义留在现有 SKILL 本体。

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

### Requirement: 并发执行前声明模型与思考强度

executing-plans-parallel SHALL 在首次启动、串行转并发激活前及中断后恢复编排前，按用户指定的三列表格「角色｜模型｜思考强度」（主线程行带 👤、实现子代理行带 🤖）展示配置，表格下用简短说明交代配置来源和是否尚未启动；统一配置可合并成一行，不同配置按子代理或任务组分别列明。声明区分已核实的运行配置、计划派发配置与继承关系，不能把本地默认配置或计划参数冒充已运行事实；平台未暴露的项目写“未知/平台未提供”，不猜值、不因无法读取而新增无关批准门。后续派发配置变化时，在受影响执行者继续工作前重新声明；相同配置的正常连续派发不逐票重复输出。用户明确指定的模型/强度约束仍须满足，不能借“未知”或声明本身授权更换模型、降档或绕过约束。

#### Scenario: S28 首次并发前展示两类执行者配置
- **GIVEN** 已选择并发，主线程实际配置可核实，实现子代理按工具语义继承或显式配置，但尚未派发。
- **WHEN** 进入 executing-plans-parallel。
- **THEN** 首次执行动作前展示带 👤/🤖 的「角色｜模型｜思考强度」三列表格，列出主线程模型/强度，以及子代理计划使用的模型/强度或继承关系，表格下说明来源与未启动状态；不把尚未启动的子代理写成已经核实运行。所有子代理配置相同时可合并一行，不硬编码本次开发会话的模型名称。

#### Scenario: S29 不同配置与平台未暴露字段
- **GIVEN** 两个任务组采用不同的已授权模型配置，且平台未暴露主线程的思考强度。
- **WHEN** 输出执行声明。
- **THEN** 按任务组列出不同配置，主线程强度写未知并注明来源限制；不猜为 high，也不把主线程强度套给未声明继承的子代理。没有相关用户硬约束时该未知项不单独阻塞流程。

#### Scenario: S30 恢复或配置变化时重新声明
- **GIVEN** 前次配置声明已保存，中断后新主线程配置发生变化，或恢复时仍有原配置的 implementer 存活。
- **WHEN** 新主线程准备恢复编排，或为下一批任务改变派发配置。
- **THEN** 恢复前重新展示当前主线程、原存活 implementer 及拟派发者的各自配置与可核实程度，不假定它们全部跟随新主线程；新增配置声明关联到后续认领，旧认领保留原声明。仅做声明不会重派存活 implementer，也不会产生新的模型变更授权。

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

### Requirement: 任务边界上的串行转并发

执行链 SHALL 在用户明确要求切换后，等当前票完成测试/自检并提交进度、当前隔离工作区干净、没有未结束的执行者或未解决的契约偏差，再核对剩余任务的并发声明、拓扑与资源资格；通过后复用该工作区作为集成工作区，取得特性锁并持久化切换检查点，然后才允许新认领和子代理派发。completed 记录、原始审查基线与交付通道不变；不满足资格不改变模式，说明原因后继续获准的串行工作；已有任务本身 blocked 时按原阻塞纪律处理，不为切换强行结束任务。并发模式内只剩一票或遇到主线程专属票时沿既有调度规则处理，不因此写回串行模式。

#### Scenario: S23 串行完成两票后切换
- **GIVEN** T00/T01 已完成并提交，用户在执行 T02 期间要求后面转并发，剩余 T03/T04 无相互依赖且声明有效。
- **WHEN** T02 完成并保存、主线程执行切换。
- **THEN** 复用当前隔离工作区，从最新已验证代码所在的检查点创建 T03/T04 的 worktree；T00—T02 不重做，原始 base_commit 不替换成切换点，最终审查仍覆盖切换前后的所有代码。两票均仅在切换检查点提交后派发。

#### Scenario: S24 切换条件不足继续串行
- **GIVEN** 用户要求切换，但剩余任务只有依赖链，或没有合法并发声明，或资源不能隔离。
- **WHEN** 主线程检查切换资格。
- **THEN** 保留串行模式和已有进度，说明不满足的条件，不创建 implementer；缺声明时不借切换预读全部任务并自动补写，需单独修订计划并通过原审查/校验后重新评估。不重复询问已经给出的并发选择。

#### Scenario: S25 切换检查点前后中断
- **GIVEN** 串行检查点 H 已保存，主线程取得锁并准备并发状态。
- **WHEN** 分别在 progress 原子写入前、写入后但提交前、检查点提交后但派发前中断。
- **THEN** 前两种没有子代理派发，已提交模式仍为串行；恢复核对授权和准备状态后可完成切换提交，或仅撤销本次准备改动并保持串行。第三种按已提交并发检查点恢复，不重复 T00 或已完成任务；若已进入后续认领窗口，则继续使用 S03/S04/S12 的既有核验规则。

#### Scenario: S26 切换请求先于当前任务完成时中断
- **GIVEN** 用户在 T02 执行中要求转并发，主线程已将带 request_id 的授权原话或可恢复引用记入 notes 并单独提交，T02 尚未完成。
- **WHEN** 新会话收到“继续”。
- **THEN** 从已有状态恢复 T02，不把它拆给子代理；T02 完成并提交后沿已保存授权重新检查切换资格，不丢失请求、不重复询问同一授权。若中断早于请求持久化且无法从可用会话记录核实授权，则保持串行，不凭空推定用户已选择并发。

#### Scenario: S27 已认领但派发回执缺失时中断
- **GIVEN** 模式切换已提交，T03 claim 已持久化，主线程在调用 spawn 与记录 agent_id 之间中断。
- **WHEN** 恢复执行。
- **THEN** 先确认旧编排 owner 已停止并取得特性锁、持久化新的 execution.owner，再按 claim_key、任务分支/worktree 和平台可见执行者核对是否已派发；找到身份可核验且能恢复通信的存活 implementer 就保留原 claim 恢复联系，不再 spawn；能够证明未派发时继续该认领的派发，证明原 implementer 已终止时核验其遗留代码/证据后再接管或创建新尝试。旧 owner、implementer 身份或通信能力无法核实时冻结相关恢复并报告，不把“agent_id 为空”当成未派发证明。

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

中途升级时增加可选 `execution.activation: { from: serial, request_id: <切换请求唯一标识>, checkpoint_commit: <H>, authorization_ref: <已保存请求 notes 的定位> }`；H 是切换前已保存串行完成状态的提交，不是包含 activation 的提交。notes 以现有 append-only 字符串项保存 `parallel-switch/<request_id>: requested; authorization=<原话或可恢复引用>`，成功切换时追加同 ID 的 activated 事件；不另建待办状态文件，实际模式仍以已提交 execution 为准。初始就选择并发不要求该 activation 字段。用户的切换授权和任务声明是两个独立条件，声明存在不能代替授权。

`tasks.TNN` 继承 status/commit/tests/deviations，增加 `claim: { key, owner, agent_id, worktree, branch, base_commit }`、`implementation_commit`、`result_path`。claim.owner 表示最初认领的编排会话，execution.owner 表示当前持锁编排者；恢复接管可以更新后者，身份与通信已核验的存活 implementer 保留原 claim，不因主线程换会话而换 key。agent_id 在工具返回后补写；派发前 claim 已持久化，若在派发与补写之间崩溃则核对运行中 agent 与 worktree，不盲重派。completed 的 `commit` 是通过集成验证的提交，不能填包含该 SHA 字段的状态提交；实现提交和进度 checkpoint 分开，后者随特性分支保存。每次新尝试以新 key 替换 claim，旧 key 与处置原因追加 notes，历史结果文件保留。progress 使用临时文件+rename 原子更新，不允许子代理副本合并回来。

模型声明沿现有 notes 保存 `model-declaration/<declaration_id>: <角色/任务组、模型、思考强度、来源、继承或计划派发标识>`，不另造执行配置文件；新认领增加 `claim.model_declaration_id` 指向适用于该票的声明。先向用户展示；主线程取得对应进度写权限后，在首次相关派发前将声明及引用持久化。该记录用于追溯而非驱动模型选择，不能覆盖真实工具参数。旧认领没有该字段时，恢复从可用的原派发参数/会话记录核对，无法核实的部分标未知，不能把新主线程配置回填成原执行者事实。

### 模型声明的呈现与核验

声明定义落在新 skill 的开始说明与恢复入口，executing-plans 的并发委托只引用该规则。固定沿用用户选定的三列表格形态（下面尖括号为生成时填入的值，不是指定某个模型）：

| 角色 | 模型 | 思考强度 |
|---|---|---|
| 👤 主线程 | `<当前模型标识或未知>` | `<当前强度或未知/不支持>` |
| 🤖 并发实现子代理 | `<计划模型；继承时注明继承主线程>` | `<计划强度；继承时注明继承主线程>` |

表格下用简短说明交代来源和状态，例如“主线程配置已由当前会话记录核实；子代理尚未启动，将按表中配置派发”。该示例只有事实成立时才可使用。不同配置按任务组增加 🤖 行；恢复时把原存活 implementer 与拟派发者分别标明，不能让读者误以为存活者随新主线程换了配置。来源不另增第四列，表格仍保持角色、模型、思考强度三列。

值使用平台实际暴露的标识（包括不支持可调思考强度的明确事实），不把各厂商等级强行换算为同一强度。证据优先使用当前会话/运行工具提供的元数据；只能读取默认配置或拟派发参数时明确标“配置值/待派发”，不作运行时保证。核验只读取相关模型字段，不读取或输出凭据。

声明不依赖先取得写权限，也不改变中断恢复中的锁顺序：恢复开始可只读核对并展示，新主线程取得锁后才保存新声明和更新 owner。若用户对模型/强度有硬约束，而当前工具不支持指定、实际配置不满足或无法验证约束是否满足，报告限制并阻塞相关派发；没有这类约束时，信息不完整仅注明边界并继续已授权流程。观察到实际运行配置与先前计划不同，重新说明差异并沿既有约束处理，不能悄悄把声明改成已满足。

特性锁落在解析后的共享 git common dir 的 `spec-dev-locks/<feature_key 的哈希>/`，用原子创建取得；`feature_key` 是计划所属 worktree 根下、采用 `/` 的仓库根相对特性目录（例如 `.spec-dev/2026-09-06-01-concurrent-execution`），禁止把 worktree 绝对前缀纳入哈希。同一仓库的不同 worktree 因共享 common dir 且 feature_key 相同而竞争同一锁；不能从另一个 worktree 的 cwd 直接对绝对计划路径求相对值。锁载荷中的绝对路径仅用于定位原编排者档案，锁非第二份任务状态源。主动挂起前停止/回收在途代理、写进度 checkpoint 后可释放自己的锁。意外中断后的接管要求核实旧编排 owner 已停止并对照磁盘；旧 owner 状态无法核实则报告占用，不按时间自动接管。存活 implementer 不等于旧编排 owner 仍存活：新主线程取得锁并持久化 execution.owner 后，可以对身份可核验且能够恢复通信的存活 implementer 继续编排，保留原 claim；无法核验该 implementer 则阻塞相关票，不重派。接管时核对旧锁归属，不能删除已被另一个恢复者取得的新锁；不同主线程不得同时宣称 progress 写权限。

### 串行转并发的交接顺序

1. 用户在任务中途提出切换时，为请求生成 request_id，在 progress.notes 保存其授权原话或可恢复引用并单独提交（只暂存进度，不夹带当前业务半成品）；当前票仍由原主线程完成，不转交半成品。请求持久化前不声称已保存；若提交失败则说明尚未保存，继续保护当前任务改动。进入已提交、无未完成执行者的任务边界后，读取 index/progress 检查剩余任务的拓扑潜力、声明和资源，遵循三条件及 S22。无法定位原始审查基线、工作区并未隔离、存在未知改动或认领时不猜测修复，不激活并发。
2. 沿用当前有效隔离 worktree，不重新执行 T00、不拷贝未提交业务代码。保存串行检查点 H 并核对其业务代码与最近通过验证的代码一致；检查点中新出现的非业务进度记录不要求重跑已完成票。`base_commit` 继承原计划执行周期的审查基线（必须可核验），`validated_commit` 初始化为 H；二者不可混用。切换后为每个新 worktree 建立基线的验证仍按既有派发规则执行。
3. 取得同一特性锁，原子写入 execution、activation、notes，清空仅用于指向刚结束串行票的 current，保留 tasks 的全部完成记录、resources 和 delivery。此时不创建子 worktree 或外部资源。把模式切换和进度作为一个独立 checkpoint 提交；其提交不得夹带业务实现、扩大计划范围或改变发布权限。仓库自动发版钩子按获准的文档/状态提交规则处理，不能因切换生成未经验证的版本改动。
4. 只有包含完整切换状态的提交成功且状态/分支核对一致，才进入既有“先认领、再派发”。切换准备失败时不派发；能正常收尾则仅撤销本次未提交的模式准备改动并释放自己持有的锁，串行检查点 H 保留。崩溃恢复先查已提交 progress，再比对未提交准备差异；不可把文件里的 mode 单独当作已成功切换。未知差异或活跃旧 owner 按原恢复规则报告阻塞，不覆盖他人内容。

切换不重新批准原计划，也不使所有剩余任务自动具备并发资格。无声明时，若用户另外授权修订计划，由 writing-plans 的既有审查/校验路径更新声明后再评估；单纯的“转并发”不授权猜写集合。并发启动后并行数量可随 ready 集合变化，模式保持 parallel，已获授权的范围内不每轮重新询问。

切换激活前完成本 skill 的模型与思考强度声明，在取得进度写权限后将声明一起保存进模式 checkpoint；不能只改 mode 就跳过声明。用户在当前串行票中途提出切换时，声明可以等边界核验配置后输出，请求保存不等于已宣布并发启动。

恢复先定位原集成 worktree 和特性锁 owner，再核对已提交 progress、未提交差异、运行中执行者、实际 Git 提交和证据；新会话不从来源分支的陈旧 progress 副本直接另起编排。恢复所需的原工作区/提交缺失沿 S04 报告，不重建一份空进度。恢复动作的分界如下：

| 中断位置 | 可核验依据 | 恢复动作 |
|---|---|---|
| 请求已保存，当前串行票未完 | notes 的 request_id/授权、current、任务工作区与提交 | 先恢复当前票；完成后重检资格，复用授权 |
| 模式准备已写，但尚未提交 | 已提交模式仍串行、准备差异仅属于该 request_id、锁归属 | 未派任何子代理；核对后补提交，或撤销仅本次准备差异 |
| 模式已提交，尚未认领 | execution.activation、H、当前集成工作区 | 以并发模式继续，保留 completed 和最初 base_commit |
| claim 已保存，agent_id 回执不完整 | 旧编排 owner 状态、claim_key、分支/worktree、可见运行中 agent | 先取得编排锁并持久化新 owner，再核实是否已派发；未知则阻塞，禁止重复 spawn |
| 子代理执行中或已完成但报告未收齐 | 新编排 owner、活跃 implementer 身份与通信、任务分支、实际 diff、持久证据 | 先完成编排接管，存活 implementer 可继续原票；确认终止后核验遗留结果，缺证据不判通过 |
| 实现已合入，completed checkpoint 未保存 | 实现提交 ancestry、集成验证证据 | 沿 S03 补未完成验证和状态提交，不重复 merge |

恢复不能仅凭“时间过去了”抢锁，也不能仅凭工具返回空列表就断言旧执行者终止；必须结合该平台的会话可见性及 worktree 活动核实，不能核实时显式阻塞。已完成并有持久验证证据的任务不重跑；未完成的验证或证据丢失部分才补验。测试日志与结果证据必须可在中断后定位：implementer 将其保存在主线程预登记的该 claim 专用临时位置，主线程接收后归档到 execution/<claim_key>/，不能只留在对话中的“通过”一句。清理前核对证据已归档且相关任务已接受，未集成 worktree 与未归档结果保留。

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
| S28 启动前模型声明 | docs/agent | 任务内评估用例编写；验收任务静态走查 | fast | 三列与角色图标、表下来源说明、执行先后及实际值/待派发值区分 |
| S29 多配置/未知字段 | docs/agent | 任务内评估用例编写；验收任务静态走查 | fast | 不同任务组、缺失强度、继承与显式值的正反例；不猜值 |
| S30 恢复/变更再声明 | docs/integration | 验收任务 (D) | PR | 两次会话配置夹具、存活 implementer 保留原配置、notes 与 claim 声明引用 |
| S08 真实并发 | integration | 验收任务 (D) | PR | 两个真实 worktree、受控执行者时间戳重叠、实际提交/合并、后继解锁 |
| S23 边界切换成功 | integration | 验收任务 (D) | PR | 同一集成 worktree、完成记录不变、两基线区分、完整审查 diff 与派发时间戳 |
| S24 切换资格不足 | unit/docs | 任务内 TDD + 验收任务静态走查 | fast | 不激活/不派发断言；缺声明、依赖链、资源冲突用例 |
| S25 切换中断恢复 | integration | 任务内 TDD + 验收任务 (D) | PR | 三个故障注入点的提交图/进度/零提前派发证据；已激活后恢复不重复认领 |
| S26 请求先保存再完成当前票 | integration | 验收任务 (D) | PR | 仅进度提交包含授权、半成品未提交；新会话复用请求、不提前派发 |
| S27 派发回执窗口中断 | integration | 任务内 TDD + 验收任务 (D) | PR | 旧主线程终止但 implementer 存活的接管、派发前/后回执丢失、原 claim 保留、未知不冒充未派发 |
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

## 实施核对记录

- T00：独立 worktree 已建立；基线 54/54，0 skip，分发/skill/openai 校验通过。
- T01：开始实现已批准的声明/路径接口；先增加解析与 CLI 失败用例，执行记录见 execution/serial。
- T01 红测试准备：解析模块尚不存在；CLI 当前忽略非法 parallel 声明，新增回归固定此缺口。
- T01 核对完成：CLI 红例真实断言 0≠1；实现后 15/15、0 skip；接口与计划一致，未扩大范围。
- T02 开始：按现有 schema 子集增加实现结果结构与真实 Git 校验，不引入调度运行时。
- T02 核对完成：31/31、0 skip；真实 Git 越界、中间提交、rename 两端、旧 claim 与未跟踪改动拒收；schema 与 Git 证明分离，接口无偏差。
- T03 开始：writing-plans 仍为声明与进度字段唯一规范点；同步中文元数据。
- T03 核对完成：35/35 结构/解析检查，三个新增 eval 静态走查通过；模型行为未验证；三件套和单一状态定义保持。
- T04 开始：增加单票 implementer 与共用 local/PR 交付协议。
- T04 核对完成：29/29 回归及包/skill 校验通过；implementer 与交付六个输入静态对齐；未宣称真实模型遵循。
- T05 开始：登记正式并发 skill、完整三列表模型声明与恢复/认领/集成协议；增加 S01—S30 输入。
- T05 核对完成：29/29 回归；14 skill/7 trigger 与 schema 集合登记一致；模型三列表、首次激活与恢复静态对齐，补明状态提交与已验证业务树关系。
- T06 开始：默认串行入口增加显式并发委托和已激活恢复；共享交付、平台绑定与追溯说明。
- T06 核对完成：37/37 相关结构回归；四例入口/切换/PR/全局审查静态核对完成；保留冻结单文件，限定默认串行不写码陈述。
- T06 更正：前条 37/37 为进度记录误写；实际初次 38/39，openai 简介缺三件套入口，当前补回并重新验证。
- T06 核对完成：修复简介后三件套回归 39/39、0 skip；旧失败日志保留，更正提前完成记录。

- T07 审查修复：真实 Git 反例确认符号链接扩大精确写集合，改为词法授权与各提交树路径安全双重核验；成功集成、恢复补记及串行例外完成同次推进 validated_commit；新入口补统一搜索条款，并将 search-clause 回归纳入 covers。属于已批准契约的补全。
