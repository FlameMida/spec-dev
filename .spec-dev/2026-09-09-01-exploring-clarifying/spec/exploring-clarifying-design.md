---
spec_dev:
  version: 1
  feature: exploring-clarifying
  status: active
  covers:
    - "skills/exploring/SKILL.md"
    - "skills/exploring/agents/openai.yaml"
    - "skills/exploring/evals/**"
    - "skills/clarifying/SKILL.md"
    - "skills/clarifying/agents/openai.yaml"
    - "skills/clarifying/evals/**"
    - "skills/requirement-analysis/SKILL.md"
    - "skills/requirement-analysis/agents/openai.yaml"
    - "skills/requirement-analysis/evals/**"
    - "skills/requirement-analysis/assets/spec-template.md"
    - "skills/requirement-analysis/references/context-reuse.md"
    - "skills/requirement-analysis/references/exploration-patterns.md"
    - "skills/requirement-analysis/references/codex-compat.md"
    - "skills/quick-fix/SKILL.md"
    - "skills/quick-fix/agents/openai.yaml"
    - "skills/quick-fix/evals/**"
    - "agents/external-resource-explorer.md"
    - "commands/triage.md"
    - "guardrail/migrate-to-spec-dev.mjs"
    - "scripts/tests/exploring-clarifying.test.mjs"
    - "README.md"
    - "README.zh-CN.md"
  sync_commit: null
  supersedes:
    - ".spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md"
  superseded_by: null
---

# 探索、澄清与上下文复用设计

> Roadmap skill-ecosystem-absorption #7，覆盖 AB-20/21/22/26/23/25/31/27。2026-09-09 用户依次批准 spike 边界、增量组织方案，并在查看完整设计及流程对比后确认。独立审查修正后 Approved，用户已 review 当前 spec 并同意编写计划；现激活守卫，尚未实施。

## 背景与目标

在现有探索与澄清路径中，使决策所依赖的实验、调研和历史结论可追溯，使未决决策可见，并把有效结论安全交接到正式设计。沿现有 skill 增量补齐，不建立第二套工作流。

**成功标准**：运行实验有明确问题与授权；调研结论有对应来源或明确缺口；用户能看到待决事项且每轮仍只答一题；新会话可按概念找到已有实现、历史否决和共享术语；探索结论进入正式设计时不夹带未批准的实现。

## 非目标

- 不新增 skill、批问 frontier 模式、自动拒绝请求、自动知识库或持久决策状态机。
- 不改变正式设计三道门、执行模式、TDD 例外清单、漂移守卫算法、现有输出 JSON schema 或公共模型运行器。
- 不为所有 spike 强制 worktree，不自动删除实验材料，不迁移归属未知的 `docs/glossary.md`。
- 不处理 roadmap #8，不回写全部历史 spec 的术语，不把一般编程概念收进词汇表。

## 术语表

- **结晶**：已能精确陈述通往交付的关键问题；答案可以仍未知。_Avoid_：所有答案齐备。
- **受控 spike**：为了回答必须运行才能判断的具体决策问题而存在的临时实验。_Avoid_：可直接交付的初版实现。
- **未决决策清单**：当前澄清范围内按依赖排序的展示性事项列表。_Avoid_：批量问卷、执行计划。
- **历史否决**：在指定上下文中曾被用户排除的概念及理由；不包含“已经实现”。
- **共享术语**：跨本仓特性复用的项目专有概念，其定义带适用域与来源。
- **承重结论**：会直接影响当前方案选择或决策的事实性结论。

## 参与者与适用行为

| 参与者 | 职责与边界 | 关键 Scenario |
|---|---|---|
| 用户 | 裁决分岔、实验范围、术语冲突及已有流程中的保存/交接；已有授权可复用 | S03–S04、S12–S13、S22–S24 |
| 主线程 | 入口双查、发散/收敛切换、实验与来源判读、清单更新和上下文交接 | S01–S32 |
| 可选只读调研子代理 | 执行独立有界子题并返回来源和缺口，无用户裁决权 | S14–S17 |
| 本地实验进程/资源 | 提供真实运行观察，不是实现完成或验收通过的证明 | S05–S08 |
| 后续 requirement-analysis/quick-fix/triage | 按自身流程消费共享上下文，保留原有路由与保存授权 | S18–S28 |

## 已确认的关键决策

1. **邻近独立文件为默认**：spike 文件含 spike/prototype 标记并靠近问题，按具体风险升级隔离；用户明确选择，不一律创建 worktree。
2. **增量与单点引用**：exploring/clarifying 沿原结构增强，路由双查和词汇表约定集中到 `context-reuse.md`；不各入口复制，不新增知识管理 skill。
3. **保存沿现有授权**：否决复用探索笔记；共享术语随获批 spec 保存；独立探索/澄清仍可零产物。
4. **migrate 登记新位置**：说明 `.spec-dev/glossary.md` 是新增约定而非既有历史路径；不据同名自动搬移用户文档。
5. **来源与后台最小增量**：外部 explorer 保留 Markdown 输出，只补逐结论追溯；后台是可选只读通道，失败处置复用现有定义。

上述决策可局部调整，未同时满足难逆转、离开上下文费解和真实取舍三项 ADR 判据；不新增或修改 Accepted ADR。

## 影响面与规则归属

| 落点 | 负责行为 |
|---|---|
| `skills/exploring/SKILL.md` | 结晶、agent 冲动路由、spike 准入/观察/收场、笔记已排除节、可选调研、关键分岔后的回归发散 |
| `skills/clarifying/SKILL.md` | 单题纪律与清单、不得自代裁决、读取术语和否决规则的引用；独立及被引用角色边界 |
| `skills/requirement-analysis/references/context-reuse.md` | 路由双查、概念级否决记录、共享术语格式和读取/冲突/写入规则的唯一定义 |
| RA、quick-fix、triage 入口 | 指针引用并消费双查结果；RA 在设计批准后保存 glossary 与 spec |
| RA spec-template | 共享/局部术语、来源指针及已验证决策表达的窄交接格式 |
| `agents/external-resource-explorer.md` | 承重结论逐条绑定一手证据，二手来源仅作线索 |
| `exploration-patterns.md`、`codex-compat.md` | 非自动加载环境的外部调研派发携带已解析 agent 定义路径并要求读取；新增纪律仍以 agent 文件为单点 |
| `guardrail/migrate-to-spec-dev.mjs` | 仅更新迁移范围说明，明确 glossary 新路径和不自动认领旧同名文件；算法不改 |
| 各对应 openai.yaml、evals、README 双语 | 摘要、入口触发和正反场景随实际规则同步 |
| `scripts/tests/exploring-clarifying.test.mjs` | 可观察的装配/文档契约回归，不以关键词存在代替模型行为验收 |

引用的既有权威保持不变：TDD 的例外清单及可追溯授权；writing-plans 的资源台账总则；exploration-patterns 的派发、失败隔离、插件根与工具降级。资源总则在无计划探索中的承载为对话记录，不创建 progress.yaml；若用户已授权保存探索笔记，可将记录纳入该笔记。

**外部调研派发承接**：RA 与 exploring 在 Codex 等不自动加载 agent 定义的环境中，按既有插件根解析规则取得 `agents/external-resource-explorer.md` 的绝对路径，在有界派发词中传入并要求子代理先读取后执行；不能假定 `spawn_agent` 自动加载该文件。兼容说明引用这一派发要求，来源纪律本身不复制。路径不可解析/定义不可读时报告缺口并按既有规则由主线程接管，主线程同样须取得规则后执行；未取得规则不得宣称该通道已满足来源纪律。

## 约束归属与拒绝的解读

| 可独立违反的约束 | 权威/负责边界 | 验证 |
|---|---|---|
| 原型授权不变成正式实现授权 | TDD + exploring | S03–S08、S27–S28 |
| 清单不变成多题、沉默不算裁决 | clarifying | S10–S13 |
| 分岔结束回到发散 | exploring | S11 |
| 历史否决不自动否决新请求 | context-reuse + 各路由入口 | S18–S21 |
| glossary 不静默推翻现行契约 | context-reuse + RA | S22–S26 |
| 模型完成声明不替代来源与实际动作 | external explorer + 主线程 | S07、S14–S17 |
| 仅处置授权且归属明确资源 | 资源总则 + exploring | S08 |

已拒绝的解读：AB-22 不是把未决问题拆成已排除（当前承接位为选项与取舍）；AB-23 不是新终止机制或批问；AB-21 的“省去错误处理”只省打磨，保留运行必需处理；否决记录不是已实现功能清单；migrate 登记不等于自动迁移 `docs/glossary.md`；受控 spike 不等于把 exploring 变为正式实施入口。

## 取代与共存

以下路径均为仓库根相对。现行判定过滤单条 Superseded 标注；plan/acceptance 只作时点证据。

- **部分取代** `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md`：Requirement「澄清核心纪律（新增第 0 条自我披露）」——以本文「澄清核心纪律与可见清单」完整承接三段披露及原六条纪律，扩展清单并移除固定七条及引用方同步枚举要求。其探索发散/关键分岔、搜索、模型工具兼容等其余分面共存。
- **分面共存** `.spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md`：共识、三出口、被引用模式、一次一题、零自动落盘不变；仅增加展示和共享上下文引用，不给 clarifying 独立会话引入 spike。
- **分面共存** `.spec-dev/2026-08-08-triage-routing/spec/triage-routing-design.md`：增加只读前置上下文检查，仍建议式、全程零落盘、判据引用不复制。
- **分面共存** `.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md`：探索消费持久资源归属及处置总则，复用资源保留/移交，不改变执行期台账协议。
- **分面共存** `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md`：glossary 不参与守卫解析，不替代 spec/ADR 冲突裁决；triage 现在读取相关产物，旧文对其“不读落盘产物”的历史共存解释在本交付范围内需同步澄清，不改生命周期算法。
- **分面共存** `.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md`：本项不改变计划、恢复及资源字段；无计划的探索不创建空 progress。
- **分面共存** `.spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md`：沿用插件根、单点定义与降级；README 仅更新探索与上下文能力的公开描述。
- **分面共存** `.spec-dev/2026-09-06-01-concurrent-execution/spec/concurrent-execution-design.md`：只读后台研究不授予 implementer 写权限、不改变执行分支、认领及进度唯一写者。
- **分面共存** `.spec-dev/2026-09-06-02-tdd-seam/spec/tdd-seam-design.md`：原型例外仍使用其授权机制，普通行为实现仍先取得有效红，测试落点声明沿旧规范。
- **分面共存** `.spec-dev/2026-09-06-03-review-conformance/spec/review-conformance-design.md`：复用有界派发、Spec 符合性与设计判据，不改收尾维度/输出契约。
- **分面共存** `.spec-dev/2026-09-06-03-review-conformance/spec/controlled-review-design.md`：只复用真实模型运行证据边界，不改运行器与受控审查协议；README 各自能力切面共存。
- **分面共存** `.spec-dev/2026-09-07-01-plan-decomposition/spec/plan-decomposition-design.md`：共享术语/实验决策表达补入模板，保留 actor、约束归属、拒绝的解读、公共 seam 与真实模型验收纪律。
- **分面共存** `.spec-dev/2026-09-08-01-quick-fix-diagnosis/spec/quick-fix-diagnosis-design.md`：仅入口双查与澄清引用消费新上下文；原症状复现、证据式升级、修复收场不变。

实施前按上述共存关系补齐需要的双向声明/covers；本 spec draft 时不提前回写旧 Requirement 的 Superseded。新 spec 激活时写 pending，实际交付时取代回写。

## ADDED Requirements

### Requirement: 受控 spike 准入

exploring SHALL 仅在问题明确、确需运行回答且原型范围已获可追溯授权时进入受控 spike。

#### Scenario: S03 未获授权不能以实验名义实施
- **GIVEN** 用户仍在比较方案、没有授权实验，agent 想直接改生产模块
- **WHEN** agent 判断需要运行验证
- **THEN** 提议具体实验问题和范围，等待裁决；生产模块和实验文件均无写入。

#### Scenario: S04 同范围授权直接复用
- **GIVEN** 用户已批准针对一个状态转换问题的独立 spike 及资源范围
- **WHEN** 本轮继续执行同一实验
- **THEN** 引用原决定直接继续；新增持久依赖不在原授权内时不擅自扩展。

### Requirement: spike 最小实验形态

受控 spike SHALL 使用独立可辨识的临时实验形态来回答已记录的问题。

#### Scenario: S05 默认邻近文件和内存状态
- **GIVEN** 问题不涉及持久存储且邻近模块可安全放置独立文件
- **WHEN** 获批实验运行
- **THEN** 文件名含 spike/prototype、顶部记录问题、状态留内存，生产文件不变；只保留运行所需处理，无正式测试/抽象打磨。

#### Scenario: S06 存储或污染风险按范围隔离
- **GIVEN** 实验问题涉及存储，或邻近文件会被构建自动当作生产内容消费
- **WHEN** 选择实验位置和资源
- **THEN** 使用获授权的独立 scratch/wipe-me 资源或隔离位置；不能可靠隔离时停止该实验并说明缺口，不使用真实业务存储。

### Requirement: spike 收场可追溯

主线程 SHALL 以真实观察及明确材料去向收束每个执行过的 spike。

#### Scenario: S07 失败观察不包装成已验证结论
- **GIVEN** 实验运行因环境错误失败，尚无目标行为观察
- **WHEN** 汇报结果
- **THEN** 保存实际命令/退出结果或等价回执、问题和位置，声明目标结论未证实；不声称 spike 已验证决策。

#### Scenario: S08 资源只按归属与授权处置
- **GIVEN** 实验创建独立临时目录并复用了用户资源，未授权删除原型
- **WHEN** 收场
- **THEN** 持久资源已有对话或获准笔记台账，自有资源按授权处置，复用者保留/移交，原型保留并报告去向；不建立实施 progress，不顺手清理台账外资源。

### Requirement: 可选后台调研

exploring SHALL 仅将独立有界的只读子题交由可用后台代理调查，并在依赖其结论前回收核验结果。

#### Scenario: S14 调研未完成时只推进独立讨论
- **GIVEN** 用户允许的只读调研已派发，当前尚无回执
- **WHEN** 主线程继续对话
- **THEN** 可讨论不依赖结果的事项，依赖事实保持待核实；不能替后台编造结论、写代码或代用户决策。

#### Scenario: S15 能力缺失或调研失败有边界交接
- **GIVEN** 后台能力不可用，或子题按既有缩域重试规则仍失败
- **WHEN** 需要该题结论
- **THEN** 主线程接管只读核查，报告未覆盖范围；不虚构后台运行、不强制保存研究报告。

### Requirement: 共享术语消费与持久化

参与本项上下文复用的入口 SHALL 按适用域读取共享术语，并仅通过原有获批保存路径新增或更新词汇表。

#### Scenario: S22 同名不同义先裁决
- **GIVEN** glossary 的“订单”定义与用户本次同名概念冲突
- **WHEN** 澄清该概念
- **THEN** 呈现定义、适用域及来源，逐题请用户裁决；不得静默覆盖或全仓替换术语。

#### Scenario: S23 首次获批共享术语随 spec 保存
- **GIVEN** 尚无 glossary，用户已批准包含一个共享项目术语的完整设计
- **WHEN** RA 写入该 spec
- **THEN** 懒创建 `.spec-dev/glossary.md`，写规范名、定义、Avoid、适用域和来源，与 spec 同次范围提交；特性局部术语仍留 spec。

#### Scenario: S24 独立澄清可保持零文件
- **GIVEN** 独立澄清中用户决定一个新术语，但未选择写入 md 或授权更新 glossary
- **WHEN** 共识收束
- **THEN** 术语留在对话，沿原三出口处理，glossary 不自动创建或改动。

#### Scenario: S25 词汇表不能覆盖现行契约
- **GIVEN** glossary 与一个 active spec 或 Accepted ADR 的现行定义矛盾
- **WHEN** 后续设计消费术语
- **THEN** 点明来源冲突并按现有契约姿态/取代流程处理；不依据词汇表自动改写旧契约或推断旧契约失效。

### Requirement: glossary 新路径登记

migrate 范围说明 SHALL 将 glossary 登记为新增 `.spec-dev/glossary.md` 约定，保留现有迁移器对旧同名普通文件的非认领行为。

#### Scenario: S26 不因同名搬移用户文档
- **GIVEN** 存在用户自有 `docs/glossary.md`，目标词汇表可存在或不存在
- **WHEN** 读取迁移说明或运行原迁移命令
- **THEN** 说明新位置且明确不自动迁移；旧文件路径和内容保持不变，不覆盖目标。

## MODIFIED Requirements

### Requirement: 结晶与冲动路由（补可检验判据）

exploring SHALL 在能精确陈述交付关键问题或出现直接实施冲动时提议交接正式设计，由用户决定是否转入。

#### Scenario: S01 问题清楚但答案未知仍可提议
- **GIVEN** 已能说清必须解决的状态一致性问题，尚无选定方案
- **WHEN** 判断探索是否结晶
- **THEN** 可以提议 requirement-analysis，交接已知问题及缺口，不要求先解完问题，不自动开始实施。

#### Scenario: S02 agent 与用户的动手冲动均走交接
- **GIVEN** agent 想“改一下更快”，或用户要求直接动手且未选择受控实验
- **WHEN** exploring 响应该请求
- **THEN** 提议正式设计并沿已有确认继续，不暗中写实现，也不把请求改名为 spike 来绕门。

### Requirement: 澄清核心纪律与可见清单（承接七条语义、取消固定枚举）

clarifying SHALL 在两种角色中执行三段披露、单题推荐、事实自查、依赖排序、术语挑战与无疑点不编造问题的纪律，并用可见未决清单展示当前澄清范围。

完整语义：第一题前披露默认假设、会改变方案的信息及易犯错误；每轮只问一个真正需要裁决的问题，适合选择题时推荐首位，环境能回答的事实自行查证；依赖上游未定不问下游，同级按重要性排序；模糊术语当场对质；无疑点明确无需澄清。披露后清单以陈述句显示事项/未决含义/依赖，裁决后移出未决区或标已决，新解锁事项追加；显式挂起与已决区分。清单不落盘状态机、不替代原共识判据。引用方只保留 gist 与权威指针，不逐条机械复制。

#### Scenario: S09 依赖变化更新清单
- **GIVEN** 存储选型是上游，索引策略依赖它，另有独立高影响决策
- **WHEN** 第一题提出及上游随后裁决
- **THEN** 三段披露后显示依赖清单，先处理可决高影响项；下游解锁后更新，不提前询问依赖未定事项。

#### Scenario: S10 清单含三项仍只问一题
- **GIVEN** 有三个待决事项
- **WHEN** 展示清单并提问
- **THEN** 清单为陈述式进度，只有一个要求回答的问题；用户答复前不继续提第二题。

#### Scenario: S11 被引用不加出口，分岔结束回发散
- **GIVEN** exploring 在关键分岔以被引用模式澄清，或 RA/quick-fix 引用纪律
- **WHEN** 当前澄清范围已裁决或显式挂起
- **THEN** 控制权回引用方，无独立共识摘要与三出口；exploring 回到发散，无关键分岔时不持续维护审讯式清单。

### Requirement: 用户裁决不可自代（补反向红线）

执行者 SHALL 将用户的明确决定作为裁决依据，复用同范围已有决定而不把推荐、沉默或挂起当作回答。

#### Scenario: S12 推荐显然但用户未答
- **GIVEN** agent 推荐方案 A，用户没有回答或明确挂起
- **WHEN** 下游动作依赖该选择
- **THEN** 该项保持未决/挂起，不自动选 A，不执行依赖动作。

#### Scenario: S13 已有决定不重复询问
- **GIVEN** 可恢复上下文含用户对同一范围的明确决定且无新冲突
- **WHEN** 新一轮消费该决策
- **THEN** 引用来源继续；不能以新清单、恢复会话或 HITL 红线为由要求再次确认。

### Requirement: 承重结论一手追溯（加强既有来源纪律）

external-resource-explorer SHALL 将每条承重事实结论绑定可核查的一手依据，无法核实时明确证据缺口。

#### Scenario: S16 二手线索回溯到一手依据
- **GIVEN** 二手材料声称某接口支持一种行为，并链接官方文档或源码；RA 或 exploring 在不自动加载 agent 定义的环境派发调研
- **WHEN** 该行为将影响方案
- **THEN** 实际派发携带已解析 agent 路径并要求读取，子代理取得规则后实际读取相应一手材料并核对支持范围，返回结论与出处的对应关系；事实、引用和推断分开。

#### Scenario: S17 一手不可得保持未核实
- **GIVEN** 子代理经实际派发取得来源纪律，但二手声称的一手页面无法读取或内容不支持该声称
- **WHEN** 汇总研究
- **THEN** 报告访问/证据缺口和实际检索链，不能把二手转述标作一手确认；主线程不把它当确定事实解锁依赖决策。

### Requirement: 路由前概念双查（扩展既有笔记复用）

RA、quick-fix 与 triage 的入口 SHALL 在提出路由建议前按当前概念核查相关已有实现和历史否决，并把结果交给原有建议式路由消费。

#### Scenario: S18 同义请求发现已有实现
- **GIVEN** 用户用别名描述一个已有公共能力，共享术语可映射该概念
- **WHEN** 入口双查
- **THEN** 定位相关实现与适用边界，报告查询范围；不按字面漏查，不把已有能力写成历史否决。

#### Scenario: S19 历史否决可由新证据重开
- **GIVEN** 某概念曾因成本被排除，用户给出成本变化或明确要求重新讨论
- **WHEN** 双查命中
- **THEN** 展示原理由及条件、新事实差异，仍由用户决定，不自动拒绝或关闭请求。

#### Scenario: S20 无笔记或无仓库仍可分诊
- **GIVEN** 当前范围不存在探索笔记、共享词汇表或可查仓库
- **WHEN** 执行入口核查
- **THEN** 如实记录未找到/不可核查，继续基于可用事实建议路线；不伪造“查遍不存在”、不自动创建知识文件。

### Requirement: 概念级已排除记录（扩展可选笔记结构）

获准保存的探索结论 SHALL 将已排除概念的理由、来源和适用条件与未决问题分别记录。

#### Scenario: S21 拒绝与未决不会混写
- **GIVEN** 方案 A 被用户因资源限制排除、方案 B 尚未决定，用户选择保存笔记
- **WHEN** 保存或交接
- **THEN** A 进入已排除节并带理由/条件/决定来源，B 保持未决；用户未选择保存时仅在对话保留，不新增否决目录。

### Requirement: 实验结论到正式设计的窄交接（补来源与表达边界）

RA SHALL 以结论和来源指针消费探索产物，仅将经实验支持的决策表达作为附来源的设计内容纳入 spec。

#### Scenario: S27 经验证的状态模型可进入关键接口
- **GIVEN** 获授权 spike 已实际支持一段状态转换表达，完整设计已获批准
- **WHEN** 写入 spec
- **THEN** 关键接口可呈现必要状态机/reducer/schema/type shape，标注问题、来源位置及验证边界；实验文件本体不作为正式实现复制入产品。

#### Scenario: S28 未验证实现片段不夹带交接
- **GIVEN** 原型中有未执行的业务分支或无关生产脚手架
- **WHEN** 交接设计
- **THEN** 保留缺口及来源指针，不将该片段描述为已验证决策或免除后续行为实现的 TDD。

### Requirement: 公开摘要与引用一致（同步新行为边界）

公开说明、元数据和引用方 SHALL 与本设计的默认探索姿态及有界例外保持一致。

#### Scenario: S29 多入口引用同一共享约定
- **GIVEN** Codex 不加载 commands/triage.md
- **WHEN** RA 或 quick-fix 直接进入
- **THEN** 仍能沿入口指针获得双查；glossary/否决规则无各入口竞争副本，澄清纪律无固定七条枚举。

#### Scenario: S30 摘要区分探索与正式交付
- **GIVEN** 加载 exploring 的 SKILL、openai 摘要或 README 任一语言版本
- **WHEN** 判断可做行为
- **THEN** 均表达默认只读探索和授权 spike 例外，不承诺任意写码，不把已承诺交付请求误导成探索。

#### Scenario: S31 普通探索没有新增必填工件
- **GIVEN** 用户只想讨论一个未定想法，无关键分岔、无运行必要、未授权保存
- **WHEN** 探索继续或结束
- **THEN** 不强制清单、spike、后台代理、glossary 或笔记；允许没有结论。

#### Scenario: S32 quick-fix 保留诊断后续规则
- **GIVEN** quick-fix 双查完成且仍为当前症状的小修
- **WHEN** 继续定位与修复
- **THEN** 按原真实红信号、契约检查、TDD 和收场规则推进，历史记录不代替原症状证据。

## 方案设计

### 数据流与接口

入口请求 → 按概念读取相关实现/历史否决/适用术语 → 原有建议式路由。exploring 保持发散；关键分岔暂时进入澄清清单，完成后回发散。必要实验在授权范围内运行并返回观察，后台研究返回与结论绑定的来源。结晶后由用户决定交接 RA；方案/完整设计批准后写 spec，必要共享术语同次保存；用户 spec review 后再写计划。

共享 reference 的记录约定采用 Markdown，不新增 JSON 协议或状态解析器：
- 双查结果：概念/检索范围、已有实现指针与适用边界、相关否决及来源、未核查范围。
- 否决条目：概念、排除理由、用户决定来源、适用条件；条件改变时保留原记录并注明重开，不覆盖历史。
- 术语条目：规范名、1–2 句定义、Avoid（无则写无）、适用域、来源指针。同名跨域并存时按域区分，禁止全局唯一名强行合并。
- 实验结论：问题、授权来源、文件/资源位置、实际观察及命令或回执、结论与未证实范围、保留/清理/移交去向。

读取按当前问题限定范围，不要求扫描全仓全部产物；环境能自查的事实自行查证。显式 skill 选择和已有有效裁决优先，不因为双查重复分诊确认。词汇表只辅助理解；来源版本与现行 spec/ADR 不符时进入冲突处理，不批量重写旧 spec。

### 错误与恢复

原型失败保留原始观察并声明未证实；扩大实验范围需新授权，原范围不重问。未知资源归属不清理；持久资源创建即登记，结束说明实际处置。调研失败按 exploration-patterns 缩域重试一次再接管，缩的是批次而不是最终覆盖。来源不可达或不同来源相互矛盾时保留缺口；依赖该事实的结论不静默解锁。

读取缺失文件视为无对应上下文，不自动创建；读取失败需声明失败，不能当作已查无记录。保存失败保留待保存内容及错误，不能宣称持久化成功。后续会话以可恢复决定来源和现行文件续接；没有来源时保持未知。

## 测试与验收策略

### 测试落点声明

公共 seam 为加载候选 skill/被引用 reference 的真实模型会话：输入任务与受控仓库/来源事实，输出对话、工具回执、实际文件/资源变化。沿 #5/#6 已使用的模型运行路径和独立语义判读方式；允许替换任务夹具、来源文档/工具可用性、隔离 scratch 资源，不以 fake model 回答或宿主代写文件替代被测模型行为。测试不约束逐字措辞或完整工具序列，只观察实际决策、授权边界、证据支持关系及写入结果。

规则变化先取得有意义的现状失败证据；已存在行为保留前后保护，不伪造红。静态文档/元数据/链接校验是装配证据，evals.json 是场景设计，均不替代真实行为。所有 S01–S32 为必需：每例保存候选规则哈希、完整输入、模型实际配置、工具回执/退出码、原始输出及独立判读；模型过程成功但语义不足为 unverified/FAIL，不报 PASS。模型/API 不可用为 BLOCKED，不放宽断言或宣称静态通过即交付。

| Scenario | 维度/公共观察点 | 执行方式与 Lane | 必需证据 |
|---|---|---|---|
| S01、S02 | 结晶/动手冲动路由 | 任务内行为基线 + 验收任务，PR | 真实模型选择及未越权写入 |
| S03、S04 | 未授权/已授权对照 | 任务内行为基线 + 验收任务，PR | 同夹具授权差异；负例文件快照不变 |
| S05、S06 | 实际 spike 文件和运行 | 验收任务，PR | 模型创建并运行独立文件；内存与 scratch 两种实际动作；生产保护哈希 |
| S07、S08 | 失败/资源收场 | 验收任务，PR | 实际失败回执、登记/去向、复用资源保留；不得只检查模型承诺 |
| S09、S10、S11 | 清单、单题、引用模式 | 任务内行为基线 + 验收任务，PR | 多轮真实对话，单题等待与回归发散 |
| S12、S13 | 沉默/挂起/授权复用 | 验收任务，PR | 依赖动作未执行及已有决定直接消费对照 |
| S14、S15 | 后台未完成/失败降级 | 验收任务，PR | 一例实际可观察后台派发/回收，能力不足与失败可控对照；独立核查未覆盖声明 |
| S16、S17 | 来源支持/不可得及派发承接 | 任务内行为基线 + 验收任务，PR | RA/exploring 两入口真实派发覆盖；非自动加载环境由主线程派发词传递 agent 路径、子代理实际读取规则与一手材料的回执；不可由测试宿主直接预加载 agent 文件替代派发；逐结论支持性判读及缺口对照 |
| S18、S19、S20、S21 | 概念双查与否决保存 | 验收任务，PR | 同义能力查证、条件变化重开、缺失上下文、实际笔记写入与未决分离 |
| S22、S23、S24、S25 | 术语读取/冲突/保存 | 验收任务，PR | 实际 glossary+spec 保存、未授权零写入、同名跨域及现行契约冲突对照 |
| S26 | 迁移公开命令与说明 | 任务内回归 + 验收任务，PR | 隔离目录中执行原命令，旧/目标文件前后哈希与退出码 |
| S27、S28 | 原型交接表达 | 验收任务，PR | 已验证/未验证分支输入对照，实际 spec 内容与来源核验 |
| S29、S30 | 引用/摘要及入口行为 | 静态校验 + 验收任务，PR | 引用可达、各摘要一致；真实直接入口与探索/交付冷启动对照 |
| S31、S32 | 无分岔探索/quick-fix 保护 | 验收任务，PR | 零强制工件；不以历史记录替代诊断证据 |
| 所有 Scenario | 规则与 eval 映射、元数据/插件包 | 静态/装配检查，PR（文件 IO） | 逐条场景对账；现有 validate-skills/check-plugin/check-openai-sync 与全库回归 |
| S03–S05、S10、S12、S16–S17、S23–S24 | 多轮稳定性 | 验收任务，nightly 非阻塞，每组至少 3 trial | 各 trial 原始结果与独立判读，不以首次成功推断可靠率 |

PR 是所属执行通道，不承诺全部真实模型场景十分钟内完成。按五个语义组组织有界用例，独立情况分夹具；后台实际能力及模型运行器在计划 T00 核实，若无法观察真实后台则该必需项 BLOCKED。不为本特性新增公共 runner、DB 服务、UI/a11y/性能工作。真实模型和文件 IO 不归 fast；纯内存 helper 若出现可按既有 fast 纪律测试。

## 风险与边缘情况

- 清单容易膨胀为计划：只包含当前澄清范围，普通发散没有强制清单；挂起不等于决定。
- 原型可能被构建自动收录：创建前核对消费路径，需要时隔离；本体保留不自动进入主线产品提交。
- 否决记录可能陈旧：带条件与来源，允许新证据重新讨论；已实现与被否决分开。
- 术语引用可能失效：报告缺口，核对现行契约；不把 glossary 当守卫或冻结历史的替代权威。
- 背景任务未完成/访问失败：消费前等待或接管，保留未核实边界。

## 设计依据与覆盖映射

| 吸收项 | 本文 Requirement/Scenario |
|---|---|
| AB-20 | 结晶与冲动路由，S01–S02 |
| AB-21 | spike 准入/形态/收场、窄交接，S03–S08、S27–S28 |
| AB-22 | 概念级已排除记录，S21 |
| AB-23 | 澄清核心纪律与可见清单，S09–S11 |
| AB-25 | 用户裁决不可自代，S12–S13 |
| AB-26 | 可选后台调研、一手追溯，S14–S17 |
| AB-27 | 共享术语、新路径登记，S22–S26 |
| AB-31 | 路由双查、概念级记录，S18–S21 |

原报告：`.spec-dev/reports/2026-08-28-01-skill-ecosystem-comparison.md` §5.1、§5.2、§8.5；roadmap #7 胶囊及本会话四次确认。补查本地一手源 `/Users/maverick/skills/skills/engineering/prototype/SKILL.md`、`research/SKILL.md`、`triage/SKILL.md` 与 `domain-modeling/CONTEXT-FORMAT.md`（同 engineering 根），只用于可追溯设计依据，不成为安装后运行依赖，不声称为联网核实的最新版本。

## 开放问题

无阻塞设计问题。具体夹具名称、命令参数与可用模型配置在计划中按当前环境落实，不改变上述必需观察面或授权边界。

### exploring-clarifying T01 切面同步

本次T01更新skills/requirement-analysis/references/context-reuse.md、skills/requirement-analysis/SKILL.md、skills/quick-fix/SKILL.md、commands/triage.md、skills/clarifying/SKILL.md、skills/requirement-analysis/assets/spec-template.md、skills/requirement-analysis/agents/openai.yaml、skills/quick-fix/agents/openai.yaml、skills/clarifying/agents/openai.yaml、skills/exploring/evals/evals.json、skills/requirement-analysis/evals/evals.json、skills/quick-fix/evals/evals.json的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。最终有效用例选择见 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T01/green-selection.json（S29仅本票贡献）；原行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t01-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t01-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T01/；这些任务期结果不替代最终候选验收。

### exploring-clarifying T02 切面同步

本次T02更新skills/clarifying/SKILL.md、skills/requirement-analysis/SKILL.md、skills/clarifying/agents/openai.yaml、skills/requirement-analysis/agents/openai.yaml、skills/clarifying/evals/evals.json的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t02-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t02-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T02/；这些任务期结果不替代最终候选验收。

### exploring-clarifying T03 切面同步

本次T03更新skills/exploring/SKILL.md、skills/requirement-analysis/assets/spec-template.md、skills/exploring/agents/openai.yaml、skills/exploring/evals/evals.json、skills/requirement-analysis/evals/evals.json的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。各候选切面有效贡献选择及边界见 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T03/green-selection.json；行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t03-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t03-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T03/；这些任务期结果不替代最终候选验收。

### exploring-clarifying T04 切面同步

本次T04更新skills/requirement-analysis/SKILL.md、skills/requirement-analysis/agents/openai.yaml、skills/exploring/SKILL.md、agents/external-resource-explorer.md、skills/requirement-analysis/references/exploration-patterns.md、skills/requirement-analysis/references/codex-compat.md、skills/exploring/agents/openai.yaml、skills/requirement-analysis/evals/evals.json的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。各候选切面7项有效贡献及边界见 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T04/green-selection.json；原始失败、配置缺口及异常CLI会话的后续宿主清理分别保留；行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t04-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t04-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T04/；这些任务期结果不替代最终候选验收。

### exploring-clarifying T05 切面同步

本次T05更新skills/requirement-analysis/SKILL.md、skills/requirement-analysis/agents/openai.yaml、README.md、README.zh-CN.md、guardrail/migrate-to-spec-dev.mjs、skills/requirement-analysis/evals/evals.json、skills/exploring/evals/evals.json、skills/exploring/evals/trigger-evals.json、scripts/tests/exploring-clarifying.test.mjs的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。6项分版本行为贡献及边界见 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T05/green-selection.json；S26公共命令回归前后通过但不冒称四份独立哈希回执，原始失败及T06关注项分别保留；行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t05-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t05-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T05/；这些任务期结果不替代最终候选验收。

### exploring-clarifying T06 验收修复同步

本次在既有获批切面内修正历史数值/条件与现行/拟议语义区分、RA 入口的澄清权威及首次外部材料前置、澄清互斥选项，并将 exploring 展开的恢复细则收回 exploration-patterns 单点，相关元数据同步。原门、TDD、契约生命周期和未取代条款不变；不新增公共 runner/schema。真实反例、独立反驳及修复前保护见 `.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/reviews/disposition-r1.json` 和 `execution/serial/T06/`；当前仍待统一最终候选验收和本地交付，不以任务期或静态通过宣称全部 DELIVERED。

### exploring-clarifying T06 普通入口与验收隔离修复

统一验收发现普通 exploring 仍可能先读外部资料后取来源权威，因此在探索入口明确先取得三份共享规则；探索姿态、授权实验与零必填工件的现行边界不变，元数据同步。另修任务内 harness 的字段误用，宿主实验与私有验收判据分离，污染原件在本特性 acceptance/invalidated-results.json 逐项撤出可采信证据，需干净重跑。该修复不新增公共 runner/schema；既有未取代条款保持。本段不宣称最终矩阵或交付已经通过。

### exploring-clarifying T06 范围题整改

在同一澄清权威内细化包含关系的范围问题：先以保持当前边界或必须扩展两项裁决，后续实现维度仍依赖该裁决；普通分类题继续允许适当的互斥选项，不全局限制为两项。原单题、推荐、披露、已有决定复用与角色出口边界不变。当前干净范围分岔证据见 `.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t06-range-direct/S09-scope/`；统一 final-r2 仍待执行，不宣称全部交付。

### exploring-clarifying T06 范围答案不绑定未决机制

范围裁决仅约定需支持的对象或场景；可以解释实现代价，但不得把未决存储或协调机制变成选择该范围的附带承诺。该细化仍在澄清单点，无新增用户门。final-r2 两项判读经独立反驳：身份政策上限的确定性失败被推翻，范围题仅保留机制绑定缺陷；初始 judge 已保存。干净修复证据见 `.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t06-scope-mechanism/`，全矩阵转 final-r3，尚不声明全部验收或交付。

### exploring-clarifying T06 来源支持与派发字段修复

外部来源权威补充“返回形态不证明状态更新/原子性”的具体区分，仍允许官方文档支持其明确声明，不强制运行验证。真正进入项目文档取证时先取得既有时效权威；完整时效分类与恢复细则继续单点维护。派发优先级改为先填 CLI 绝对实值再发送完整提醒，重试保留原合法类型/预算/访问边界，不为短预算合并有依赖的读取；调用拒绝与任务执行失败分别记录，不以任务 ID 数量判定恢复。原始失败、独立反驳和干净保护见本特性 acceptance/model/t06-source-boundaries、t06-dispatch-fields 及 reviews；最后静态反例字样清理只恢复既有零自造占位符规范，31 项相关检查通过。统一矩阵仍待最终候选完成，不恢复旧污染结果的证据资格。
