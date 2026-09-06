---
spec_dev:
  version: 1
  feature: review-conformance
  status: active
  covers:
    - "agents/code-reviewer.md"
    - "skills/executing-plans/SKILL.md"
    - "skills/executing-plans/agents/openai.yaml"
    - "skills/executing-plans/evals/**"
    - "skills/executing-plans/references/review-orchestration.md"
    - "skills/executing-plans-parallel/evals/**"
    - "skills/writing-plans/references/design-principles.md"
    - "skills/writing-plans/SKILL.md"
    - "skills/writing-plans/agents/openai.yaml"
    - "skills/writing-plans/evals/**"
    - "skills/requirement-analysis/SKILL.md"
    - "skills/requirement-analysis/agents/openai.yaml"
    - "skills/requirement-analysis/evals/**"
    - "skills/requirement-analysis/references/exploration-patterns.md"
    - "skills/requirement-analysis/references/spec-reviewer-prompt.md"
    - "scripts/schemas/review-findings.json"
    - "scripts/schemas/README.md"
    - "scripts/tests/review-findings.test.mjs"
    - "README.md"
    - "README.zh-CN.md"
  sync_commit: null
  supersedes: []
  superseded_by: null
---

# 收尾审查符合性与共享判据设计

> roadmap [skill-ecosystem-absorption](../../roadmaps/2026-09-03-01-skill-ecosystem-absorption.md) 子项目 #4，吸收 AB-12/09/14/13/32。用户于 2026-09-06 批准「S 与完整性审查分工」方案、完整设计及审查后的 spec，并同意编写实施计划。12 条 Requirement / 28 个 Scenario，独立审查 Approved，见 [design-review.md](design-review.md)；本 spec 已激活，尚未开始实施。

## 背景与目标

现有收尾审查按 A/B/C 检查实现，completeness critic 检查覆盖缺口，但没有明确的全量实现符合性审查通道。新增 S，以现行契约核对少做、多做和做错；补齐审查输入、共享设计判据与派发纪律，使每条发现及覆盖结论可追溯。

**成功标准**：不同规模均覆盖 S；符合性判断与覆盖检查分工；串并行共用全局审查；缺输入或截断不能被报成通过；判据集中定义且不制造投机抽象、私有函数覆盖或越权重构。

## 非目标

- 不新增 skill、agent 类型、自动审查调度器、覆盖数据库或 progress 字段。
- 不吸收 roadmap #5—#8 的任务分解、诊断、探索与留观条目；不启动全仓架构巡检。
- 不改默认串行、并发授权、implementer 五步、原始审查基线、交付通道及最终全量时机。
- 不改八条设计原则或获批 seam；不以静态文案检查证明真实模型遵循。

## 术语表

- **S／实现符合性**：对照现行 Requirement、Scenario、任务及已批准变更判断实现偏差。Avoid：覆盖率检查。
- **完整性审查／completeness critic**：检查审查范围与测试证据是否存在缺口。已审零发现属于审查覆盖，不自动代表已有测试覆盖。
- **D／架构深化**：有明确触发依据时，围绕本次变更的结构摩擦做进一步审查。
- **模块删除判据**：假想移除模块后，复杂性消失还是重新分散到调用方。Avoid：删除保护测试。
- **覆盖证据**：可恢复的文件、Scenario、测试结果及审查报告指针；既不以 finding 数量代替覆盖，也不以计划声明代替执行证据。

## 已确认的关键决策

- S 与 critic 保留分工；拒绝把三向核对全部塞入末尾 critic，以免混合实现判断与覆盖判断。
- 小变更一路覆盖 A+S；常规 A/B/C/S 四路；大变更 B 拆为质量与简洁性，连同 A/C/S 五路。C 保留项目约定与抽象边界；D 条件追加。
- 维度覆盖与同时运行的代理数量分开：资源允许时同波扇出，容量不足时分批完成同一组维度，不丢弃维度。
- schema 仅新增类别 `Spec符合性`；引用与覆盖证据继续放现有 description、coverage_note，由语义复核检查。不新增强制 JSON 字段或修改通用校验算法。
- 八条原则之外增加共享判据。adapter 计数提供反投机抽象证据，不设置「不足两个实现禁止 seam」的硬门。
- AB-13 只补扇出前置校验和措辞负面清单，已有代码质量启发式、报告展示、否决记忆和处置机制继续复用。
- 不新增 ADR：本次局部审查编排与判据扩展可独立调整，不满足难以逆转判据；Accepted ADR-0001/0002/0005/0006/0007 继续生效。

## 影响面与定义点

| 定义点 | 本项职责与消费者 |
|---|---|
| review-orchestration.md | 路数、S/critic 分工、输入预检、D 触发、复核与完整性收口的唯一编排；串并行消费 |
| agents/code-reviewer.md | S、D 的审查职责、发现与覆盖输出、证据措辞；引用共享判据 |
| design-principles.md | 模块删除判据、真实 adapter 计数、接口三问与结构摩擦五问；设计/计划/审查引用 |
| exploration-patterns.md | 通用派发完成条件、排除项与好坏对照；保留插件根、时效与失败处置单点 |
| requirement-analysis / writing-plans / spec-reviewer-prompt | 用 gist 与锚点消费新增判据、派发要求，不复制定义 |
| review-findings.json / schemas README | 新类别及机器/语义校验边界 |
| evals / review-findings.test.mjs | 行为正反例与真实 CLI 契约回归 |
| README 双语 / 对应 openai.yaml | 更新审查能力说明与同步元数据；描述和语言协议保持现有中文约定 |

并发 skill 现有入口已交回串行阶段 4—6，不新增第二套路数或修改其结果 schema；用并发全局审查 eval 验证继承。上表 covers 中的 SKILL 修改与其 openai.yaml 同步暂存。vendored 同步器不管理本次目标，无需改动。

## 取代与共存

本项修改既有编排，但未发现与以下现行 Requirement 相矛盾的行为，因此按分面共存处理，`supersedes` 为空；同文件 covers 各自保留。实施阶段逐提交说明分面及按守卫约定处理，不能因文档载体而跳过漂移核对。

- **分面共存** `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md`：保留「设计原则声明块」八原则、语境注解及头部消费；增加模块判据。现行搜索、Lane、校验契约保留；已被取代的计划/恢复/资源/visual 条款只作历史。
- **分面共存** `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md`：保留「completeness critic 排除已取代项」、派发时效、取代与批准时序。S 亦过滤历史条款，critic 继续检查现行 Scenario 覆盖。
- **分面共存** `.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md`：保留存量计划兼容读取；计划/恢复/资源被取代条款沿 #2 读取。不迁移单文件计划，不改变四列导航。
- **分面共存** `.spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md`：保留插件根、输出契约、失败重试与主线程接管的单点定义；review 输入预检发生在派发前，不另造重试次数。
- **分面共存** `.spec-dev/2026-09-06-01-concurrent-execution/spec/concurrent-execution-design.md`：保留「既有收尾审查全量继承」、来源指针、主线程唯一状态写者、原始 base 及集成后收尾；路数变化在共用编排内生效。
- **分面共存** `.spec-dev/2026-09-06-02-tdd-seam/spec/tdd-seam-design.md`：保留公共行为覆盖、红绿与重构分离、收尾保护。其「不增加审查轴」限定于重构候选自身不另造审查轴；D 由本项触发规则决定，不因候选存在自动触发。
- **分面共存** `.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`：上游与执行 SKILL 文件相交，保留相关测试范围、基线及最终全量/失败归属；不前移最终全量到每票。
- **分面共存** `.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md`：上游与执行 SKILL 文件相交，保留现行资源闭环；本项不新增台账形态，已取代条款沿后继读取。
- clarifying-skill、triage-routing 无本项文件或行为交集。无须新增或取代 ADR；ADR-0004 已被 ADR-0005 取代，不作为现行约束。

## ADDED Requirements

### Requirement: 实现符合性三向核对

收尾审查 SHALL 对现行契约逐项判断要求缺失或半成品、未经批准的额外行为、与 Scenario 语义不符的实现，并将成立的偏差报告为 S 发现。

#### Scenario: S01 任务完成但缺少承诺的错误处理

- **GIVEN** 任务已标 completed，Scenario 要求无效输入返回校验错误，但 diff 仅实现正常路径
- **WHEN** S 审查整个特性
- **THEN** 报告缺失行为并引用 Scenario 和当前入口，不用任务完成状态证明交付。

#### Scenario: S02 增加了未获批准的对外行为

- **GIVEN** 获批范围只有读取接口，diff 新增可对外调用的删除接口，计划及批准变更均无依据
- **WHEN** S 核对行为与授权范围
- **THEN** 报告越界，引用获批范围原文及新增接口位置，说明已核对的任务与变更来源。

#### Scenario: S03 看似实现但语义相反

- **GIVEN** Scenario 要求空集合返回零，而实现返回空值，实施者声称通过
- **WHEN** S 对照入口和测试证据
- **THEN** 报告语义偏差并给出契约与实现证据，自报告不抵销发现。

#### Scenario: S04 内部辅助实现不构成额外交付

- **GIVEN** diff 增加为获批排序行为服务的内部辅助函数，未增加可观察行为或违背其他约束
- **WHEN** S 追溯其用途
- **THEN** 不因任务未逐项列出该函数而报越界；同样承认有可恢复批准记录且已按偏差流程修订契约的新增行为。

### Requirement: S 发现的契约依据

S 发现 SHALL 提供可恢复的现行契约原文与位置、实现证据以及二者偏差，不以仅有任务 ID、推测需求或历史条款支撑结论。

#### Scenario: S05 已取代条款与缺失实现位置

- **GIVEN** active spec 含一条已标 Superseded 的旧 Scenario 和一条现行缺失功能
- **WHEN** reviewer 产生 S 发现
- **THEN** 旧条款不产生缺失发现；现行缺失项引用现行原文，file/line 锚定应承载行为的现有入口，若完全没有代码锚则锚定契约行并说明不存在实现，不编造源码位置。

### Requirement: 可选架构深化

编排 SHALL 仅在用户明确要求或本次变更存在具体结构摩擦证据时追加 D，并记录触发依据与审查范围。

#### Scenario: S06 存在耦合泄漏时启用

- **GIVEN** diff 使三个调用方必须了解同一模块的内部表示，主线程能给出实际调用位置
- **WHEN** 选择审查维度
- **THEN** 追加 D，派发触发证据与本次受影响边界，复用共享判据，不扩为全仓巡检。

#### Scenario: S07 大 diff 不自动增加 D

- **GIVEN** 大 diff 属有界机械更新，无具体结构摩擦证据且用户未要求架构深化
- **WHEN** 安排五路审查
- **THEN** 不自动追加 D；仅有优化设想不构成阻塞性架构缺陷，也不授权 reviewer 写码。

### Requirement: 共享模块判据

设计、计划与审查 SHALL 从 design-principles 单点消费模块删除判据、真实 adapter 计数和接口收敛三问，按实际问题使用而不将启发式升级为普遍硬门。

#### Scenario: S08 模块删除判据比较两个模块

- **GIVEN** 一个模块只转发调用，另一个集中处理多个调用方共同的业务规则
- **WHEN** 使用模块删除判据
- **THEN** 比较假想移除后的复杂性去向及实际用途；不实际删除模块或保护测试，不仅凭转发形态要求整改。

#### Scenario: S09 一个 adapter 与已批准 seam

- **GIVEN** 计划已批准一个公共 seam，当前只有一个生产 adapter
- **WHEN** 使用 adapter 计数评价抽象
- **THEN** 不为凑两个实现创建 fake、不据此取消已批准 seam；只有真实需求和具体复杂性证据才能支持改进建议。

#### Scenario: S10 多 adapter 仍暴露内部结构

- **GIVEN** 两个真实 adapter 的接口向消费者暴露各自内部参数，调用方需做分支判断
- **WHEN** 使用接口三问
- **THEN** 检查是否能减少方法、简化参数、隐藏内部复杂性，并引用实际边界；adapter 数量不自动证明抽象合理。

### Requirement: 审查输入预检

主线程 SHALL 在派发前核实原始 base、当前 HEAD、完整 diff 及所需契约和计划来源是否可读，不能可靠恢复时报告缺口而不臆造审查输入。

#### Scenario: S11 错误基线或丢失契约指针

- **GIVEN** base ref 无效，或计划显式关联的 spec 路径不存在
- **WHEN** 准备扇出
- **THEN** 先查现有记录恢复；仍无法确认则不按未知范围派发并标明阻塞，不把 HEAD 或某个猜测文件用作替代。

#### Scenario: S12 空 diff 仍需交付对账

- **GIVEN** base/HEAD 均已核实且 diff 为空，计划仍有一项承诺行为
- **WHEN** 准备收尾
- **THEN** 如实报告无代码变更，跳过无效代码扇出，但按已有实现和证据继续必要覆盖核对及对账，不自动宣称全部 DELIVERED。

### Requirement: 发现措辞基于证据

reviewer SHALL 用具体行为、影响和来源说明发现，排除无证据的确定语气、只贴问题标签、以个人偏好冒充规范或以最佳实践代替依据的报告。

#### Scenario: S13 只有问题标签的候选

- **GIVEN** 候选只写「违反最佳实践、过度设计」，没有位置、规则或实际影响
- **WHEN** reviewer 筛选报告
- **THEN** 该候选不能作为已确认问题输出；证据充分的高置信发现仍按现有严重性分类报告。

## MODIFIED Requirements

### Requirement: 规模化维度编排（改了什么：各档覆盖 S，大变更五路重分配，容量不足不丢维度）

收尾编排 SHALL 按小变更一路 A+S 兼查 B/C、常规四路 A/B/C/S、大变更五路 A/B质量/B简洁性/C/S 的规则安排覆盖，并在实际容量不足时分批完成全部选定维度。

#### Scenario: S14 小变更也检查越界

- **GIVEN** 本次 diff 为 40 行且引入未批准的对外行为
- **WHEN** 选择小变更一路审查
- **THEN** 同一路明确执行 A 与 S，兼查 B/C 显著问题，并能报告越界，不能因不足 100 行省略 S。

#### Scenario: S15 常规与大变更的路数

- **GIVEN** 一份常规改动和另一份明确要求彻底审查的改动，均未触发 D
- **WHEN** 分别生成派发安排
- **THEN** 前者四路 A/B/C/S，后者五路 A/B质量/B简洁性/C/S；D 被触发时在相应安排之外追加一路。

#### Scenario: S16 容量只够两路同时运行

- **GIVEN** 已选定四路，平台同时只能运行两个 reviewer
- **WHEN** 派发与回收
- **THEN** 说明容量限制并分批完成四路，已返回报告可先复核，不把未启动维度报为完成；资源允许时仍同波扇出，不无故串行。

### Requirement: 完整性审查的证据覆盖（改了什么：明确零发现与未覆盖的区别，保留现行 Scenario 核对）

completeness critic SHALL 对照变更文件、风险面和现行 Requirement/Scenario 核查审查与测试证据，区分已审零发现、实际未覆盖及明确截断，排除已取代项。

#### Scenario: S17 零发现且确有覆盖证据

- **GIVEN** reviewer 无 findings，但 coverage_note 列明已审文件、Scenario 和实际测试结果指针
- **WHEN** critic 核查
- **THEN** 不因 findings 为空报未审查；若测试证据缺失则单独记录测试覆盖缺口，不以审查覆盖代替测试覆盖。

#### Scenario: S18 S 漏查文件或场景

- **GIVEN** S 报告无发现但漏掉一个本次变更文件及其现行 Scenario
- **WHEN** critic 对照输入清单
- **THEN** 报告明确的覆盖缺口并交主线程补查；若补查形成实现偏差发现，按正常高/中独立反驳及处置路径处理，不能直接当 confirmed。

### Requirement: 发现与覆盖契约（改了什么：新增符合性类别并具体化证据内容）

编排调用的 reviewer SHALL 输出既有 review-findings JSON，S 原始发现使用 `Spec符合性` 类别，并在 description 和 coverage_note 中提供可复核的契约及覆盖证据。

#### Scenario: S19 新旧类别均有效

- **GIVEN** 字段完整的旧六类报告和新增 `Spec符合性` 报告
- **WHEN** 经现有 validate-output CLI 校验
- **THEN** 均通过；机器校验仅证明 schema 合法，S 引用是否真实及结论是否成立仍需语义复核。

#### Scenario: S20 未知类别或缺字段

- **GIVEN** 报告类别为未定义值，或缺 description，或 coverage_note 为空
- **WHEN** 经 CLI 校验
- **THEN** 退出码为 1，错误指出对应字段；按原输出契约单点规则补全一次，再失败由主线程接管，不能忽略报告。

#### Scenario: S21 没有发现的合法报告

- **GIVEN** findings 为空而 coverage_note 非空，说明实际覆盖与证据
- **WHEN** 校验并消费
- **THEN** schema 接受，critic 按所列证据核查；不会为满足格式而制造 findings。

### Requirement: 跨维度复核与收口（改了什么：符合性发现与覆盖补查进入既有复核）

主线程 SHALL 将 S/D 及覆盖补查得到的发现接入现有去重、独立反驳和授权处置流程，对跨类别但根因相同的发现保留一条处置记录及全部依据。

#### Scenario: S22 A 与 S 指向同一缺陷

- **GIVEN** A 报空值 bug，S 引用空集合 Scenario 报同一处语义偏差
- **WHEN** 主线程复核合并
- **THEN** 保留一条处置项及两份来源、契约依据；不因 category 不同重复要求修复，也不将不同根因仅因同一行而误合并。

#### Scenario: S23 覆盖补查发现新问题

- **GIVEN** 常规维度最多两轮已结束，critic 补查确认先前未扫的范围存在中严重性候选
- **WHEN** 主线程收口
- **THEN** 对候选进行独立反驳并按既有授权处置，不绕过复核直接记 confirmed；不重新无限循环整套扇出，未完成的覆盖或复核显式保留为未完成。

### Requirement: 通用派发完成条件（改了什么：在原主题与来源要求上增加完成条件、排除项和对照示例）

派发方 SHALL 沿 exploration-patterns 单点要求给出有界主题、来源指针、可判定的完成条件、显式排除项及所需输出，并参考共享好坏示例校准具体程度。

#### Scenario: S24 泛泛任务改成有界派发

- **GIVEN** 待派发内容只有「检查审查纪律」
- **WHEN** 按通用派发纪律准备输入
- **THEN** 补充目标条目、现状/缺口与 file:line 的交付条件、禁止改文件等本任务排除项及覆盖声明要求；不复制整篇 spec 来替代指针，也不要求每次派发附上整套教学例子。

#### Scenario: S25 既有时效与失败规则继续生效

- **GIVEN** 派发涉及含 Superseded 条款的 active spec，且子代理执行失败
- **WHEN** 消费与恢复
- **THEN** 派发保留现行条款过滤要求，失败按原单点缩小范围重试一次、再失败主线程接管；缩小处理批次不缩减总覆盖，未覆盖显式说明。

### Requirement: 串并行入口共同消费（改了什么：上游与审查入口接入新增单点规则）

设计、计划、spec 审查及串并行收尾入口 SHALL 引用其对应单点规则，并保留原始特性范围与现行公共测试落点纪律。

#### Scenario: S26 中途切换并发后的全量审查

- **GIVEN** T01 串行完成后切换并发，剩余票已集成
- **WHEN** 全局审查接收输入
- **THEN** diff 覆盖最初 base 到当前集成 HEAD，包括 T01；共用包含 S 的完整编排与 critic，implementer 自检不抵销任何维度。

#### Scenario: S27 上游消费共享判据

- **GIVEN** RA 比较方案、writing-plans 编写头部、spec reviewer 检查设计可实施性
- **WHEN** 各入口读取设计判据
- **THEN** 通过同一 design-principles 指针使用新增判据，保留八原则与原审查职责，不复制三套判据或新增独立批准门。

#### Scenario: S28 架构建议不破坏测试纪律

- **GIVEN** D 建议调整内部结构，公共 seam 与行为契约仍成立，最终全量属于原计划收尾
- **WHEN** 主线程决定后续处置
- **THEN** 按现有授权和 TDD 收尾纯重构规则记录保护证据，不增加逐私有函数测试，不把最终全量变为每票解锁门。

## 方案设计

### 输入、数据流与错误处理

主线程从原执行记录解析 base/HEAD、计划入口、spec 和批准变更指针，核实 diff 与引用可读性；基线必须与当前执行周期相符，不使用切换点替代原始 base。正常分支保留既有 `git diff <base>...HEAD` 范围表达。派发针对固定的已核实范围；审查中代码变化需说明新范围，并按受影响维度复审，不能混用前后快照证据。

无 spec 的存量计划可用其已批准的任务与验收标准作 S 依据，明确来源边界；计划显式要求但丢失的 spec 属输入缺口，不能假装从未有 spec。无法找回任何可判断范围的批准依据时报告阻塞。空 diff 只跳过无效代码扇出，不豁免覆盖核对、对账和原有交付门。

预检通过后从 canonical 选维度，按实际容量安排，同维度分批扫描只改变批次，不改变总范围。各报告校验通过即可复核；机器字段问题沿输出契约单点补全，引用虚构或语义证据不足则在主线程复核中排除/补查并记录，不把 schema 绿当语义绿。

发现先按既有 file:line+category 索引，再做跨维度同根因核对。S 原始报告保留新类别；合并处置记录可沿已有主记录类别，但必须保存 S 契约依据。现行置信度阈值、严重性、预存问题排除、否决记忆、高/中独立反驳、最多两轮及修复后受影响维度复审一次均保留。critic 的覆盖缺口交主线程补查；补查不能用来无限重启全局发现循环或默默跳过独立反驳。

### 输出与共享判据

保持 JSON 顶层 `findings`、`coverage_note` 及每条 finding 的既有必填键。新增类别唯一拼写为 `Spec符合性`；D 按内容使用既有 `质量/规范/建议` 类别。S description 用普通文字串起「契约路径:行及必要短引文—实现位置/缺失证据—偏差与影响」，不增加强制引用字段。coverage_note 分清已审文件/风险面、S 对现行 Scenario 的核对、真实测试指针、缺口与截断；其他 reviewer 只声明自身实际覆盖，critic 汇总对照。

共享判据定义四组：模块删除判据；真实 adapter 的用途与变化计数；接口能否减少方法/简化参数/隐藏内部复杂性三问；结构摩擦五问（跨模块理解成本、接口是否与内部一样复杂、测试是否遗漏公共调用行为、耦合泄漏、公共接口是否难测）。所有判据基于现行需求和获批 seam；假想删除不实际修改文件，只有具体影响能形成缺陷，单纯变得更优雅不是缺陷。D 与 B/C 重叠发现按同根因合并。

### 实施范围与验证方式

本特性主要改变模型执行规则，Markdown 不是纯文案例外。计划按公共行为编排红绿与真实模型探针，schema 新类别有确定性红绿；提示词行为以具备独立真值的场景评判，不能为每句话增加镜像正则测试。实施细节和命令由后续 writing-plans 展开。

## 测试与验收策略

### 已批准的测试落点

| 公共边界与协议 | 覆盖 Scenario | 依赖替换与来源 |
|---|---|---|
| `node scripts/validate-output.mjs review-findings <file>`；退出码、stdout/stderr JSON | S19/S20/S21 | Node 子进程与真实临时文件，不替换 validator。来源：现有 CLI、review-findings schema、已有 scripts/tests 的 CLI 用法 |
| 加载候选 skill/reference/agent 后，输入批准契约、真实 Git 夹具及来源指针，观察派发记录、报告和处置记录 | S01—S18、S22—S28 | 核心冒烟调用真实模型；不 mock 被评判规则、Git 或契约读取。夹具外的外部 API 无需调用；来源为本 spec Scenario 与现有模型冒烟路径 |
| 仓库现有技能、插件、元数据和链接/引用检查 | 全部规则的集成与分发 | 原有命令原样使用；静态结果仅表明候选结构与条款符合，不能证明模型行为 |

真实文件/子进程/Git/模型 IO 归 PR 或 nightly，不标成纯内存 fast。现有适用静态检查独立记账，不新增 typecheck 工具。尚未实现的调度器不为本项测试而搭建；调度验证观察 agent 的实际派发/覆盖记录与可复核报告，不只看回答宣称的路数。

### 验收矩阵

每个 Scenario 都做静态对照并列出输入、预期与候选锚点；以下矩阵指定行为验证归属。PR 五组为必需核心冒烟，每组含固定正反例，nightly 为完整多轮行为 eval、非阻塞。未知、未运行、SKIP 与静态符合分别记录，不得报行为 PASS。

| Scenario | 维度 | 执行方式 | Lane | 行为证据 |
|---|---|---|---|---|
| S01 | integration | 验收任务 (D) | PR 组1 | 缺失行为发现与双向引用 |
| S02 | integration | 验收任务 (D) | PR 组1 | 未批准接口与获批范围证据 |
| S03 | integration | 验收任务 (D) | PR 组1 | 语义偏差及不采信自报告 |
| S04 | integration | 验收任务 (D) | PR 组1 | 辅助实现/批准变更不误报 |
| S05 | integration | 验收任务 (D) | PR 组1 | 历史排除与缺失位置锚定 |
| S06 | integration | 验收任务 (D) | PR 组4 | D 有证据触发及范围 |
| S07 | integration | 验收任务 (D) | PR 组4 | 大 diff 无证据时不派 D |
| S08 | integration | 验收任务 (D) | PR 组4 | 两模块判据对照且无删除动作 |
| S09 | integration | 验收任务 (D) | PR 组4 | 获批 seam 与单 adapter 不误判 |
| S10 | eval | 验收任务 (D) | nightly | 多 adapter 的接口泄漏判据 |
| S11 | integration | 验收任务 (D) | PR 组5 | 无效 ref/缺 spec 的预检结果与无盲派发 |
| S12 | integration | 验收任务 (D) | PR 组5 | 空 diff 与对账状态区别 |
| S13 | eval | 验收任务 (D) | nightly | 无依据标签未成为确认发现 |
| S14 | integration | 验收任务 (D) | PR 组3 | 一路实际覆盖 A/S |
| S15 | integration | 验收任务 (D) | PR 组3 | 常规四路/大变更五路覆盖记录 |
| S16 | integration | 验收任务 (D) | PR 组3 | 容量限制下全维度记录 |
| S17 | integration | 验收任务 (D) | PR 组2 | 已审零发现与独立测试缺口 |
| S18 | integration | 验收任务 (D) | PR 组2 | 漏覆盖被识别且补查不直接确认 |
| S19 | integration | 任务内 TDD | PR | 新类别红绿、旧六类回归 |
| S20 | integration | 任务内 TDD | PR | exit 1 与字段级 errors |
| S21 | integration | 任务内 TDD | PR | 空 findings 合法及消费对照 |
| S22 | integration | 验收任务 (D) | PR 组2 | 同根因一次处置、多来源保留 |
| S23 | integration | 验收任务 (D) | PR 组2 | 补查仍独立反驳且不无限扇出 |
| S24 | integration | 验收任务 (D) | PR 组5 | 派发完成条件、排除项、来源指针 |
| S25 | eval | 验收任务 (D) | nightly | 时效与失败重试/接管边界 |
| S26 | integration | 验收任务 (D) | PR 组3 | 真实 Git 含切换前后 diff 和 S/critic |
| S27 | eval | 验收任务 (D) | nightly | 三入口消费同一判据 |
| S28 | integration | 验收任务 (D) | PR 组4 | 重构候选保护及原全量时序 |

PR 五组的分组用于组织夹具，不将组数宣称为只有五次模型调用或五个 Scenario。组1 符合性正反例、组2 覆盖/复核、组3 调度/并发、组4 判据/D、组5 输入/派发。记录实际模型、候选绝对路径与哈希、输入、调用结果、独立判定及失败原件。已有模型工具无法提供有效证据时标未验证，不以本次开发子代理的探索报告代替候选行为冒烟；模型多轮稳定性留 nightly。UI、无障碍、负载不适用。

## 风险与边缘情况

- 引用放文本而非强制字段，schema 无法保证引用真实；由复核与模型行为验证补足，不宣称机器已验证契约语义。
- 路数规则改变原大变更拆分：B 拆分，C 保留一体，以五路纳入 S；入口与既有固定三路 eval 必须同步。
- 真实模型有波动，核心冒烟和多轮稳定性分别报告；不得不断改断言或重试直到绿。
- 容量不足只影响批次；输出截断、失联和输入无法恢复都留下明确缺口，不能因零 confirmed 发现直接进入无缺口交付。
- 启发式可能被误读成新硬门；单 adapter、辅助函数、纯转发用途与保护测试均提供反例。

## 开放问题

无影响方案或接口的未决问题。具体任务拆分、夹具组织和调用命令由 writing-plans 基于本 spec 给出。

## 实施记录

- T00：2026-09-06 创建隔离分支；原始 base `88cf00a9f5ba7a340720dd49cf8be068cb8a9e20`，相关基线 55 passed / 0 skipped；证据 `../execution/serial/T00/`。
- T01：按获批模块判据单点及三入口消费实施，中文 openai 元数据同步；37 项相关回归、技能与插件检查通过。S09 旧规则已有行为；S27 CLI 两次超时，原生候选决策对照及其平台/会话限制见 `../execution/serial/T01/`；真实工具动作留 T05，不将静态结果作为行为通过。保留八原则、原测试 seam、TDD/全量时机、既有批准与资源闭环。
- T02：reviewer 增加 S/D 职责、证据措辞和覆盖说明；schema 仅新增 `Spec符合性`，通用校验器算法及字段不变。S19 真实 CLI 因旧枚举拒绝红、扩枚举后绿，S20/S21 回归绿；40 项相关回归及插件/技能检查通过，S02 候选行为验证见 `../execution/serial/T02/`。
- T03：通用派发完成条件、排除项和好坏示例集中在 exploration-patterns，上游只引用；保留原时效过滤、一次重试与接管单点。40 项相关回归、技能和插件检查通过。模型运行器增加严格 MCP 隔离，T02 原始工具污染已标注并独立重放，不覆盖原件。
- T04：收尾编排统一预检、一路 A+S/常规四路/大变更五路、D 证据触发、容量分批、同根因合并及 critic 证据收口；串行入口只消费单点，并发入口继承。README 双语与 openai 同步；40 项相关回归、技能与插件检查通过，S15 旧三路/缺 S 有效红，S14 为已有行为，候选模型结果见 `../execution/serial/T04/`。

- T05（未完成）：真实模型验收发现证据锚定、覆盖误判、独立回执、D触发、规模与去重偏差；修复两份规则提交 `945467ea9fc386f9bdc8c8597dadb3471408bd7d`，未改变本spec验收判据。修复后94测试通过、0跳过，S04/S14有效红绿；S05/S18/S23仍失败，复杂调用仍有300秒超时，其他补证尚未完成。完整28场景、12Requirement对账和原始证据见 `../acceptance/acceptance-report.md`。原生执行器对照有输入副本缺口且超时，未拿它覆盖CLI失败；T05/T06均不标完成，未作DEFERRED。
