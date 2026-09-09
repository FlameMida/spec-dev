---
spec_dev:
  version: 1
  feature: plan-decomposition
  status: active
  covers:
    - "skills/writing-plans/SKILL.md"
    - "skills/writing-plans/agents/openai.yaml"
    - "skills/writing-plans/evals/**"
    - "skills/writing-plans/references/design-principles.md"
    - "skills/executing-plans/SKILL.md"
    - "skills/executing-plans/agents/openai.yaml"
    - "skills/executing-plans/evals/**"
    - "skills/executing-plans/references/integration-groups.md"
    - "skills/executing-plans-parallel/SKILL.md"
    - "skills/executing-plans-parallel/agents/openai.yaml"
    - "skills/executing-plans-parallel/evals/**"
    - "skills/test-driven-development/SKILL.md"
    - "skills/test-driven-development/agents/openai.yaml"
    - "skills/test-driven-development/evals/**"
    - "skills/test-strategy/SKILL.md"
    - "skills/test-strategy/agents/openai.yaml"
    - "skills/test-strategy/evals/**"
    - "skills/requirement-analysis/SKILL.md"
    - "skills/requirement-analysis/agents/openai.yaml"
    - "skills/requirement-analysis/evals/**"
    - "skills/requirement-analysis/assets/spec-template.md"
    - "skills/requirement-analysis/assets/roadmap-template.md"
    - "skills/requirement-analysis/references/exploration-patterns.md"
    - "skills/requirement-analysis/references/codex-compat.md"
    - "scripts/validate-output.mjs"
    - "scripts/lib/integration-plan.mjs"
    - "scripts/tests/plan-index.test.mjs"
    - "scripts/tests/integration-plan.test.mjs"
    - "scripts/tests/plan-state.test.mjs"
    - "scripts/tests/plan-single-format.test.mjs"
    - "scripts/tests/plugin-root.test.mjs"
    - "scripts/schemas/README.md"
    - "README.md"
    - "README.zh-CN.md"
  sync_commit: bc99e272165167159e7e3409e47fa90ee0d32022
  supersedes:
    - ".spec-dev/2026-09-06-01-concurrent-execution/spec/concurrent-execution-design.md"
    - ".spec-dev/2026-09-06-02-tdd-seam/spec/tdd-seam-design.md"
    - ".spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md"
  superseded_by: null
---

# 计划分解与集成组设计

> roadmap [skill-ecosystem-absorption](../../roadmaps/2026-09-03-01-skill-ecosystem-absorption.md) #5，吸收 AB-06/07/08/30/35/29。用户于 2026-09-07 选择“方案 2：多张小任务卡组成集成组”，并以 `ok` 批准整篇设计。本文件为批准设计的可执行化规格；2026-09-07用户确认执行后已完成T00—T07；T08必需验收及独立完整性审查已通过，T09本地交付已完成，状态见plan/progress.yaml与实施记录。

> 独立审查 **Approved**，23 条 Requirement / 33 个 Scenario，见 [design-review.md](design-review.md)。用户已 review 通过并于 2026-09-07 以 `ok` 同意编写实施计划；现已激活；[实施计划](../plan/index.md) 已保存（T00—T09），用户已明确确认执行；T00—T09均已完成，23条Requirement/33个Scenario必需证据齐备，已合入本地main。

## 背景与目标

让计划在普通变更和不能逐票独立通过测试的宽面迁移中，都能保持明确的任务边界、真实依赖和可恢复进度。通过显式集成组区分“本票操作已保存”与“整组验证通过”，并补齐上游参与者、约束、测试先例和上下文声明，减少拆票后的隐含条件。

**成功标准**：普通计划仍逐票通过；必要的宽面迁移能够分票保存、恢复并统一验证；未验证中间态不会解锁组外任务或推进验证基线；计划审阅能够发现漏边、多余边、遗漏参与者和被错误重新引入的解读。

## 非目标

- 不新增 skill、写码 agent、自动调度服务、独立状态库或通用 YAML 库依赖。
- 不让多个 implementer 同时写共享集成分支，不改变普通 implementer 的五步、结果 schema 和 Git 接收规则。
- 不把集成组当作跳过测试、生产发布半成品或把普通功能拼成大项目的通道。
- 不实施 roadmap #6—#8，不回填全部历史计划和 roadmap，不修改已接受的 S/critic 分工。

## 术语与参与者

- **集成组**：一组无法独立通过全部相关验证的迁移票及其唯一组验证任务。Avoid：一个巨大任务、并行写共享目录。
- **待整体验证**：`awaiting_verification`，本票操作、局部检查、自检及实现提交已保存，整体通过承诺仍欠缺。不是 Git 暂存，也不是 completed。
- **组验证任务**：有独立 TNN 文件的执行任务，检查全部组员的最终组合；不是 acceptance-qa 验收任务，也不是最终合并清理任务。
- **验证基线**：已经通过规定验证的代码提交；**检查点**是已保存的工作进度，两者不能混用。
- **前置纯重构**：批准计划中为解除具体实施阻碍安排的行为保持改动；**收尾重构候选**仍是执行中额外发现、交收尾裁决的机会。
- **正交约束**：可独立违反、需要分别证明的要求，例如路径隔离与唯一状态写者；分配其负责边界和验证位置，不要求每条约束只涉及一个文件。
- 用户负责方案、设计、spec/执行门与契约偏差裁决；计划作者负责声明和分解；持锁主线程负责状态、组内写入、验证和恢复；普通 implementer 仅执行原协议适用票；校验 CLI 只读检查事实；审查者检查契约与证据。进程崩溃、hook 和晚到回执是需要处理的事件，不假设它们能批准或更新状态。

## 已确认的关键决策

- 用户选择保留多张任务卡，拒绝将不可独立绿的全部批次折成一张原子大票；独立记录的代价由显式组状态和恢复协议承担，见 [ADR-0008](../../adr/0008-integration-groups.md)。
- 拆分顺序为普通可验证任务 → expand/migrate/contract 每批绿 → 有证据的集成组；临时旧形要在已列明的 contract 工作中删除。
- 集成组只由主线程在现有隔离集成工作区串行执行；已启用 parallel 时先收拢在途执行者，组完成后恢复原模式，不把选择本方案解释成新并发授权。
- 普通四状态保留；只有组成员增加 `awaiting_verification`。组成功时将成员、组验证任务和组一次原子标为 completed，并更新已验证提交。
- 三件套、四列导航和 progress 唯一状态源保留。组声明是 index 的计划数据，运行状态不写回 index 或任务文件。
- 审阅三问以 2–3 个陈述式检查点呈现，最后只有一个整体确认问题；若检查暴露多个决策，仍逐题澄清。
- 形式化对话门继续逐一通过；本次设计批准不是开始实施授权。

## 拒绝的解读

| 表达 | 排除的理解 | 采用的理解与依据 |
|---|---|---|
| 最后统一验证 | 票内不运行任何检查、项目最终全量也取消 | 只推迟组的整体绿承诺；保留可运行检查、组验证及最终安全网，用户完整设计已批准 |
| 方案二多卡 | 多个 agent 写同一分支 | 共享工作区主线程独占；小卡服务追踪与恢复，用户完整设计已批准 |
| 操作完成 | 可以写 completed 或解锁组外依赖 | 使用 awaiting_verification，整组通过后完成 |
| 依赖最小性 | 删掉迁移顺序、T00 或验收依赖来制造并发 | 删除无真实理由的边，同时保留安全/接口/验证约束 |
| 目标化三问 | 一次发三个独立决策或增加三次审批 | 2–3 个检查点、一个整体确认；一次一题规则仍有效 |

## 取代与共存

部分取代只在交付时回写旧 Requirement；本 spec 已获用户 review 并激活，同次向旧 spec 写入 pending；旧条款内容及 active 状态保留至本项交付。标题以下均按主名匹配、忽略旧标题的“改了什么”括注。

| 旧 active spec | 被部分取代的 Requirement | 新版本落点与原因 |
|---|---|---|
| `.spec-dev/2026-09-06-01-concurrent-execution/spec/concurrent-execution-design.md` | plan 单一形态 | M01：增加组声明、v2 数据和任务类型步骤，完整保留三件套、四列导航、资源、普通五步及并发声明 |
| 同上 | 渐进执行与断点恢复 | M02：增加待验票、组内 ready 与组检查点恢复，保留普通串并行及单文件恢复 |
| 同上 | 集成验证后才完成 | M03：普通票逐票验证与组员组验证两种完成单位明确区分；并发 Git 接收规则仍完整继承 |
| `.spec-dev/2026-09-06-02-tdd-seam/spec/tdd-seam-design.md` | 红绿循环与重构分离 | M04：新增经批准的组内延后整体绿，保留普通五步与额外重构候选收尾 |
| 同上 | 收尾纯重构的行为保护 | M05：将同一保护规则推广至批准的 T01 和组迁移，保留收尾复审及 implementer 分流 |
| `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md` | 设计原则声明块 | M06：完整保留八原则与消费点，补迁移暂存旧形的限定注解 |
| 同上 | roadmap 上下文胶囊 | M07：完整保留原话、前置读取、已扫范围与交付回写，新增 gist+pointer |

分面共存（各 spec 的现有 covers 保持，新切面由本 spec covers 声明）：

- concurrent-execution 其余条款：入口三条件、模型声明、锁、claim、资源预登记、普通 implementer、串并行切换、交付与收尾继续有效；组成员及验证票不进入 parallel 写集合，组期间是既有主线程专属任务分流的扩展。尚未组完成不是“串行完成任务边界”。
- tdd-seam 其余条款：公共 seam 上游权威、独立真值、mock、静态快检、例外授权和 quick-fix 仍有效；本设计不以组身份重开 seam、不把无法运行的目标测试记为已执行通过。
- major-upgrade 其余现行条款：编号、测试 Lane、搜索和澄清纪律保持；已 Superseded 的阈值、恢复和资源条款只作历史。
- `.spec-dev/2026-09-06-03-review-conformance/spec/review-conformance-design.md`：S、critic、共享模块判据和派发完成条件保持单点；新增约束分配与计划审阅属于其他切面。
- 同目录 `controlled-review-design.md`：只继承真实审查入口与宿主证据边界，本项不扩造该控制器为计划生成器。
- `.spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md`：插件根、闭区间、单点引用和发布纪律保持；“五查”引发 README 同步是新功能描述，旧漂移修复已被 concurrent-execution 取代的部分不再取代。
- `.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md`：其计划、恢复、资源条款已被 concurrent-execution 取代，只继承现行“存量计划兼容读取”。
- `.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`：T00 相关范围、最终全量和失败归属裁决不变；组验证不替代最终安全网。
- `.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md`：现行清理及隔离规则继续有效，组证据与工作区沿原台账；已取代的资源写入/模板条款不作为现行合同。
- `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md`：取代、激活、审查与状态过滤流程不变。
- `.spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md`：检查点不构成批问，不更改其一次一题契约，也不修改 clarifying 产品文件。
- Accepted ADR-0001/0002/0005/0006/0007 继续有效。ADR-0008 扩展主线程串行任务的组合验证，不改变普通 implementer 的每票接收决定；v2 是进度数据格式，不是 ADR-0005 拒绝的 executor 版本域/技能注册/编译快照。

## ADDED Requirements

### Requirement: A01 宽面迁移的有证据分解

计划作者 SHALL 按独立验证能力选择普通拆票、逐批绿的 expand–contract 或集成组，并为后两者记录影响范围、普通切分失败原因及删除旧形的任务。

#### Scenario: S01 能逐票绿时不使用集成组
- **GIVEN** 三个调用包可在旧形保留时分别迁移并通过相关测试。
- **WHEN** 分解机械改名。
- **THEN** 生成 expand、具有真实依赖的迁移票及依赖全部迁移票的 contract；不因文件多就延期整体绿。

#### Scenario: S02 批次不能独立绿时保留小票
- **GIVEN** 共享类型改动导致多个包必须全部迁移后才能通过相关验证，批准设计记录该事实。
- **WHEN** 编写计划。
- **THEN** 各批次各有 TNN 文件和提交，归入明确组及组验证任务，不合并为一张超大票，不承诺中间绿。

### Requirement: A02 集成组结构可校验

plan-index SHALL 拒绝违反方案设计中组成员、验证票、依赖出口或版本结构的计划。

#### Scenario: S03 非法组声明被拒绝
- **GIVEN** 夹具分别包含重复归组、未知 T99、嵌套组、验证票也是成员、把 T00/项目验收/最终任务放入组或把组员放入 parallel。
- **WHEN** 运行 plan-index。
- **THEN** 每例 exit 1 并定位对应字段；不静默忽略组块。

#### Scenario: S04 组出口与隐含循环被拒绝
- **GIVEN** 组外 T09 直接依赖组员 T03，或组员依赖组外 T09 而 T09 依赖本组验证票。
- **WHEN** 校验。
- **THEN** 拒绝直接消费组员以及收缩组后形成的环；四列导航无需增加列。

### Requirement: A03 待验提交不构成完成

主线程 SHALL 仅在成员操作、可运行检查、契约自检和实现提交均可追溯后将其置为 awaiting_verification，并将整体测试标为待组验证。

#### Scenario: S05 已保存批次仍显示待验
- **GIVEN** T03 已提交、局部检查符合计划，整体测试仍因后续迁移未完成而失败。
- **WHEN** 保存 T03 进度。
- **THEN** status=awaiting_verification、tests=pending_group，保留真实失败日志、implementation_commit；commit 完成锚仍为空，验证基线不变。

#### Scenario: S06 意外局部失败阻塞
- **GIVEN** T03 的本应通过的独立行为保护测试失败，且不属于批准的组间暂时失败范围。
- **WHEN** 准备推进 T04。
- **THEN** T03/整组 blocked，不自动扩大“预期失败”白名单；保存原因并先修复或走契约偏差。

### Requirement: A04 组内外依赖分开解锁

执行入口 SHALL 按方案设计的 ready 规则，仅对活动组内显式依赖允许消费 awaiting_verification，组外只在验证票 completed 后解锁。

#### Scenario: S07 同一状态对组内外不同
- **GIVEN** T03 待验，组内 T04 依赖 T03，组外 T09 依赖组验证 T06，全部组外前置已完成。
- **WHEN** 计算 ready。
- **THEN** T04 可以执行、T09 不可以，且不把 T03 改 completed 来解锁。

#### Scenario: S08 外部前置未完不进组
- **GIVEN** 组末成员 T05 还依赖组外 pending 的 T02，虽然组首 T03 的依赖已满足。
- **WHEN** 选择下个任务。
- **THEN** 不激活整组；先按普通规则完成 T02，避免进入半成品分支后再等待外部工作。

### Requirement: A05 集成组独占执行

主线程 SHALL 在取得同一特性锁、收拢在途执行并持久化活动组检查点后，独占现有隔离集成工作区执行组员及验证票。

#### Scenario: S09 并发模式中遇到集成组
- **GIVEN** mode=parallel 且两张普通票仍在执行。
- **WHEN** 下一阶段准备进入 G01。
- **THEN** 先停止新派发，核验并收拢在途票及回报，完成所需合入到已验证基线；没有未知执行者/未接收实现后才激活 G01；期间无其他新合入、派发或模式切换。

#### Scenario: S10 第二主线程不能进组
- **GIVEN** A 已持有 G01 所属特性锁，B 从同仓库另一 worktree 恢复。
- **WHEN** B 准备更新进度。
- **THEN** B 无写权，旧 owner 是否停止无法核实就阻塞；不按超时、空 agent 列表或锁路径不同猜测接管成功。

### Requirement: A06 整组完成原子发布

主线程 SHALL 在组验证证据与实际代码绑定且全部规定检查通过后，一次原子更新组员、验证票、组完成状态和验证基线，再单独提交进度。

#### Scenario: S11 全组通过同次完成
- **GIVEN** T03—T05 待验，T06 在实现提交 V 对应业务树上运行全部组验证并通过。
- **WHEN** 接受整组。
- **THEN** 各成员保留自身 implementation_commit，成员/验证票的 commit 均锚定 V，全部 completed/tests=pass，组 completed，validated_commit=V；进度提交另有 SHA，后继仅在此检查点持久化后解锁。

#### Scenario: S12 失败不移动已验证基线
- **GIVEN** 组基线 B 已通过，T06 在当前实现 tip 测试失败。
- **WHEN** 记录结果。
- **THEN** T06/组 blocked，成员保持待验，validated_commit 仍为 B；报告失败命令及日志，不派组外任务。

### Requirement: A07 组修复保留证据与失效范围

主线程 SHALL 在组验证失败后按已声明任务写集合修复，并对修复触及的成员及其组内依赖闭包重新核验有效性。

#### Scenario: S13 前序接口修正影响后继
- **GIVEN** T06 发现 T03 产出接口与批准接口不一致，T04/T05 已待验且消费该接口。
- **WHEN** 在 T03 授权范围内修复。
- **THEN** 先把 T03 置 in_progress、受影响后继置 blocked，保留旧提交/证据；修复后逐票核对仍有效的操作与局部检查，已成立的内容不重复改写，证据失效部分补验，再回待验并复跑全部组验证；越出批准契约则冻结等裁决。

### Requirement: A08 集成组恢复核对事实

恢复者 SHALL 取得排他写权后核对已提交进度、未提交差异、工作区绑定、提交 ancestry 与证据，按中断窗口补齐未完成动作而不重复施工。

#### Scenario: S14 实现提交早于进度中断
- **GIVEN** T03 implementation commit 已存在，待验状态尚未提交，磁盘差异与本票能够唯一对应。
- **WHEN** 恢复。
- **THEN** 核对实际提交、局部检查和自检证据后补记待验；缺证据只补检查，不重做迁移，不凭提交信息直接认定通过。

#### Scenario: S15 组通过后进度保存窗口
- **GIVEN** T06 全部验证通过且日志存在，分别在进度 rename 前、rename 后 commit 前、状态 commit 后中断。
- **WHEN** 恢复。
- **THEN** 前两种检查业务树与 V 一致后补原子完成/提交；第三种直接消费已完成事实，不重复测试或改写成员；证据缺失/树变化则补验，未知差异阻塞。

#### Scenario: S16 工作区或证据不可信
- **GIVEN** 组工作区丢失、提交不可解析、日志哈希不符或出现无法解释的业务变更。
- **WHEN** plan-state 或恢复入口核对。
- **THEN** 给出具体不一致、ready 为空，保留已有现场；不新建空进度、不清理未接受产物。

### Requirement: A09 协议能力检查先于写入

含集成组计划的执行者 SHALL 在首次写入、每个状态边界和恢复时使用支持本协议的校验入口，无法识别协议或校验失败时停止相关执行。

#### Scenario: S17 旧能力不能静默降级
- **GIVEN** 含组计划声明 format_version=2，但旧 CLI 不认识 plan-state，或新 CLI 收到未知版本。
- **WHEN** 执行入口预检。
- **THEN** 不将其作为普通 v1 计划继续，不写业务/状态；明确缺少支持并保留原文件。此保证针对遵守入口的执行者，不声称能约束忽略指令的旧客户端。

#### Scenario: S18 无组存量继续原样读取
- **GIVEN** v1 普通/并发分文件计划或旧单文件计划。
- **WHEN** 新执行入口载入。
- **THEN** 使用原有对应分支，保留旧状态及授权，不强制转换为 v2、不添加组。

### Requirement: A10 必要前置重构固定首个实施槽位

计划作者 SHALL 仅在具体实施阻碍证据成立时将获批前置重构安排为 T01，并让后继通过真实接口或顺序依赖消费它。

#### Scenario: S19 必要重构位于隔离之后
- **GIVEN** 已批准把当前混合职责拆开才能安全实现后续功能。
- **WHEN** 写计划。
- **THEN** T00 隔离和基线、T01 前置纯重构及行为保护、后续功能票按需依赖 T01；没有阻碍时不造空 T01 重构票。

### Requirement: A11 依赖最小性第五查

writing-plans SHALL 在原四查之后核对每条依赖的接口、验证或安全顺序理由，同时补漏边并删除无实际理由的边。

#### Scenario: S20 删除冗余而保留必要边
- **GIVEN** 独立文案票被无理由串到 API 票之后，迁移 contract 又遗漏对最后一个 migrate 的依赖。
- **WHEN** Self-Review。
- **THEN** 删除前一冗余边、补后一必要边，保留 T00/验收/最终任务和整组出口；同步导航与任务接口，不把结构校验当成依赖语义证明。

### Requirement: A12 产物审阅检查点

RA 的 spec review 门与 writing-plans 的执行交接 SHALL 展示最新产物链接、简短变更摘要和 2–3 个针对本产物的审阅检查点，随后只提出一次整体确认。

#### Scenario: S21 检查点不变成多重授权
- **GIVEN** spec 有参与者和约束两处值得用户重点审阅。
- **WHEN** 呈现 review 门。
- **THEN** 陈述两处检查点并只问是否确认并开始计划；用户仅认可内容时不冒充执行授权，检查暴露独立决策时按一次一题处理。

### Requirement: A13 standard 定向测试先例探索

standard 档需求探索 SHALL 将相邻测试、公共行为入口和 fixture/mock 惯例分配给已有或独立的有界探索主题。

#### Scenario: S22 存在与不存在测试均如实报告
- **GIVEN** 两个 standard 夹具分别有可复用公共入口测试、没有相邻测试。
- **WHEN** 完成探索。
- **THEN** 前者提供来源与复用建议，后者明确缺口；不将 standard 改成 deep 多模态盲扫，不凭没有先例发明私有测试 seam。

### Requirement: A14 参与者与适用行为核对

spec 作者 SHALL 枚举实际参与者及其适用行为/错误路径，以命名 Scenario 覆盖真实遗漏。

#### Scenario: S23 非人触发者不能遗漏
- **GIVEN** 同一操作既可由用户启动，也可由后台重试触发，后者没有交互式授权能力。
- **WHEN** 设计 spec。
- **THEN** 列出两类实际参与者与适用边界，给后台重复执行命名 Scenario，不给每类参与者机械复制全部场景或编造不存在的 actor。

### Requirement: A15 约束归属与排除解读

设计作者 SHALL 在方案定型前将真实独立约束映射到负责边界和验证位置，并为有依据的拒绝解读保留采用理解及裁决来源。

#### Scenario: S24 不同约束分别有证据
- **GIVEN** “状态只能主线程写”和“工作区路径不能逃逸”可独立失败。
- **WHEN** 设计并拆票。
- **THEN** 分别映射写者门与路径检查、对应 Scenario，并在消费任务继承；不能以其中一项通过证明另一项。

#### Scenario: S25 被拒解读不能重新变需求
- **GIVEN** 用户已拒绝“多任务意味着共享目录多人并发写”。
- **WHEN** 下游计划消费 spec。
- **THEN** 读取采用理解及来源，不重新增加该行为；无真实歧义时不捏造拒绝项，规范性决策仍按 ADR 资格判断。

### Requirement: A16 关联 skill 的可恢复声明

计划头部 SHALL 声明本产物关联 skill 的名称、适用任务/时机和来源指针，并让任务仅补充本票特有项。

#### Scenario: S26 脱离会话仍能找到纪律
- **GIVEN** 新执行者只取得特性目录、index、spec 与本票。
- **WHEN** 读取 T01 或组验证任务。
- **THEN** 能从声明定位 TDD/集成组/测试策略的适用规则，seam 仍来自原接口传递；技能不可用时使用计划自足步骤，唯有组的必需机器入口不可用时停止而非猜执行。

## MODIFIED Requirements

### Requirement: M01 plan 单一形态（增加组声明与类型化步骤）

writing-plans SHALL 始终生成 index.md + tasks/TNN.md + progress.yaml，完整保留头部、全局约束、相关测试范围、四列导航、依赖闭区间、无环与文件一一对应、无复选框、T00 隔离、最大号最终任务及按矩阵安排的验收任务，并按下面的任务类型携带完整步骤与验证要求。

普通行为票保留失败测试、确认有效红、最小实现、确认绿、提交五步；批准的纯重构票使用 M05 前后保护，组员使用 A03/M04 的局部检查和待验提交，组验证票含聚合验证/失败处理/完成检查点。文件块与接口块仍完整，配置/脚手架/文档随所属任务折叠，不恢复按规模切换单文件。progress 是唯一状态源并预登记已知资源；合法普通 parallel 声明仍按原写集合规则生成，组员及验证票排除；plan-index 失败不得交付。

#### Scenario: S27 各类任务有实际步骤且首尾闭合
- **GIVEN** 同一计划有普通票、T01 纯重构、集成组、项目验收及最终任务。
- **WHEN** 检查生成产物。
- **THEN** 每票有精确文件、接口、命令、预期结果与对应类型的完整步骤，组员没有假绿步骤；T00 与最终生命周期闭合、只一个状态源，导航通过结构校验。

### Requirement: M02 渐进执行与断点恢复（扩展组检查点）

执行者 SHALL 启动只读 index、progress 与 spec，执行时按最小编号合法 ready 任务读取本票正文及依赖接口，并按当前模式核实提交/工作区/证据后恢复。

普通串行完成后原子保存进度并提交，不重跑已有有效完成证据的任务；普通 parallel 沿现有 claim、真实 Git 核验和代码/状态分开提交恢复，保持原始审查基线。用户请求切换先持久化授权，当前普通票或整个活动组完成并提交、符合原入口三条件且无在途执行者/未知差异后才激活，不重做 T00、不丢声明或授权。组内适用 A04/A08，current 只指主线程正在处理的票；额外读取仅限本活动组的记录与本票需要的证据，不预读全部后继正文。旧单文件仍按复选框与 feat(TN) 提交恢复、不生成 progress；两个已删除的 progressive reference 不恢复，组执行协议集中于新 reference，不复制普通恢复全文。

#### Scenario: S28 组内切换请求等组完成
- **GIVEN** 用户在 T04 期间请求转并发，T03 已待验。
- **WHEN** T04 提交待验且随后会话中断。
- **THEN** 授权请求保存在 notes，mode 不变；恢复 T05/T06，整组完成后沿已保存授权检查原准入，不把 T04 待验作为可切换完成边界。

### Requirement: M03 集成验证后才完成（区分普通票和组完成单位）

主线程 SHALL 仅接受实际集成验证通过且证据可恢复的完成事实，普通票按原逐票协议，组员按 A06 同组验证事实完成。

普通 implementer 结果仍先核 schema、claim、真实 Git diff、全部提交 ancestry、干净工作区、原写集合和红绿/自检证据，再保留 ancestry merge 到当前允许的集成 tip；相关集成验证通过后才 completed 并更新 validated_commit。冲突保留现场交用户，不自动选 ours/theirs；普通集成失败保持 blocked、暂停新派发/合入，旧验证基线上已在途独立票可结束并暂存报告。组分支不使用 implementation-result 伪造普通 ready，失败时按 A05/A06 保持独占和旧基线；组外消费者不能使用未验证接口。

#### Scenario: S29 普通票不继承待验解锁特权
- **GIVEN** 无组 T01 返回 ready 但尚未集成，T02 依赖它。
- **WHEN** 新执行器调度。
- **THEN** T02 仍等待 completed；手写 awaiting_verification 于无组票被拒绝，原 Git 接收和合并冲突规则仍生效。

### Requirement: M04 红绿循环与重构分离（明确组内整体绿延后）

TDD 与执行入口 SHALL 对普通行为变更保持有效红到绿的五步，对经批准的不可独立验证组按声明延后整体绿，并将执行中额外发现的结构清理交既有收尾。

分组不提供红证据豁免：行为变化在其实现前获得公共 seam 的有效行为失败；纯机械/行为保持迁移按 M05 保护原行为。组声明逐项指出哪些目标验证因何暂时不能通过、何时在验证票执行；每批仍运行可运行检查，保留真实 exit，不删测试/改断言/吞错来造绿，无法取得必要行为红时回到设计而非用编译错误顶替。两项契约自检仍只查 over/under-building 与接口锚定。额外候选保留位置、理由和保护证据交现有审查或 quick-fix 自身收尾，不强制额外 acceptance-qa。

#### Scenario: S30 组身份不豁免有效红
- **GIVEN** 一张组员票实际改变错误处理行为，现有失败仅是导入编译错误。
- **WHEN** 执行者准备写实现。
- **THEN** 不将编译错误当红，不因有组就跳过有效行为复现；取得有效红或冻结回设计，不能静默把该票改称纯重构。

### Requirement: M05 纯重构的行为保护（推广至批准的前置及组迁移）

纯重构处置 SHALL 对批准的前置、迁移及收尾工作复用公共行为保护测试验证前后保持通过，缺保护先刻画，行为缺陷转复现红绿路径。

T01 在调整前后取得 green；不能逐批通过的组在修改前取得组基线保护，逐批保留可运行检查，在组验证任务证明最终公共行为保持。刻画当前实现通过不是红证据。收尾修复后复审受影响维度，前置/组成员保留票内自检并进入最终整特性审查。无法提供有效红的纯重构仍不派给普通 implementer，implementation-result phase 和普通红绿接收条件不变。

#### Scenario: S31 前置纯重构缺保护先刻画
- **GIVEN** T01 有批准范围但当前路径没有行为保护。
- **WHEN** 准备结构调整。
- **THEN** 先补契约行为刻画并在当前实现观察通过，再调整并记录通过；不伪造一次失败、不拖到功能实现之后才做前置重构。

### Requirement: M06 设计原则声明块（补迁移过渡和约束归属注解）

共享 design-principles SHALL 承载原八条原则及模块判据，并补充有明确清理终点的迁移过渡与独立约束归属注解，供 RA 方案/完整设计检查及 writing-plans 头部声明共同消费。

八原则仍为默认不留向后兼容、最简实现、分层构建、不以未完成复杂性换可工作产品、模块化、优先成熟库、优先已有依赖、长期决策。新旧暂存仅为批准的迁移路径，不是长期兼容合同，需列出旧形删除、消费者清零和完成验证；旧 active 行为的改变照常走取代。启发式仍基于真实需求、实际消费者和批准 seam，不因一个 adapter 或更优雅的设想制造违规。RA 阶段 4 评价、阶段 5 检查与计划头部继续引用单点。

#### Scenario: S32 迁移旧形不能永久遗留
- **GIVEN** expand 新增同用途新接口并暂存旧接口，但候选计划没有删除旧接口的工作。
- **WHEN** 方案或计划自检。
- **THEN** 不能以“允许 expand”通过检查；补明确 contract 和验证，或重新分解，八原则声明块仍存在。

### Requirement: M07 roadmap 上下文胶囊（指针增加摘要）

roadmap 胶囊 SHALL 在保留原始需求全文、关键裁决、探索指针、已扫范围和交付后继注意事项的基础上，为新增指针附一句说明用途/适用边界的摘要。

RA 续接读取胶囊及前置 spec 与验收结论，按现行/历史过滤，不重扫已登记范围、只补缺口；摘要不替代原文、不把历史 PASS 当当前证据。交付仍追加后继注意事项。旧胶囊没有摘要继续正常读取，本次触及/新增的指针补齐，不全库迁移。

#### Scenario: S33 摘要冲突时回读源文
- **GIVEN** 胶囊摘要说模型通过，来源报告实际是 unverified。
- **WHEN** 续接下一子项目。
- **THEN** 以实际来源及其时点报告边界、修正当前使用的摘要，不重复索要原始需求；交付后仍追加下一项注意事项。

## 方案设计

### 组件与单点定义

| 落点 | 职责 |
|---|---|
| writing-plans/SKILL.md | 分解顺序、组声明/进度格式唯一字段定义、各类型任务模板、第五查及关联 skill |
| executing-plans/references/integration-groups.md | 组生命周期、ready、检查点/修复/恢复协议单点；串并行 skill 以 gist+pointer 消费 |
| scripts/lib/integration-plan.mjs + validate-output.mjs | 新组/状态检查的确定性逻辑与公共 CLI；复用既有路径规范函数，不改普通 verifyResult |
| TDD/test-strategy | 类型化测试责任、前置/组/收尾的保护时机；可运行检查与组验证 Lane |
| RA/assets/exploration-patterns + design-principles | 参与者、测试先例、约束归属、拒绝解读与胶囊；保留单点与获批 seam |
| evals、metadata、README 双语 | 行为意图/触发和对外约定同步；静态齐全不代表模型通过 |

不新增计划编译器。CLI 只读、不写状态/拿锁/运行任务/批准异常；主线程负责实际执行与串行写状态，校验器不能替代检查真实测试原因。

### 静态声明

index 中至多一个 `json spec-dev-integration` fenced block，内容为 JSON（使用 JSON 避免引入第二套复杂 YAML 语法；重复键显式拒绝）。声明示例为确定的结构示意，不是本特性的实施计划：

```json spec-dev-integration
{
  "protocol_version": 1,
  "task_roles": {
    "T00": "isolation",
    "T10": "acceptance",
    "T11": "delivery"
  },
  "groups": {
    "G01": {
      "members": ["T03", "T04", "T05"],
      "verify": "T06",
      "reason": "共享类型的三个消费者全部迁移后才能通过相关验证"
    }
  }
}
```

GNN 与 TNN 分别唯一；每组至少两名成员，members 为确定的执行顺序，必须与导航 DAG 的拓扑顺序一致但不凭此数组虚构依赖边。组员保持常规小票粒度；组验证显式依赖全部成员；组外任务只能通过 verify 依赖该组。声明中的 `task_roles` 必填，T00 唯一 isolation、最大号唯一 delivery、项目 acceptance 如有则列出，角色不得重叠；这些票不得进入 members/verify。组验证文件显式标 `任务类型：group-verification`，组员标 `任务类型：integration-member`，不重复写进 task_roles；普通票由余集确定。task_roles/组声明与任务正文在计划 Self-Review/运行读取本票时核对。上例 T10/T11 是示例角色，实际 ID 必须存在于四列导航表。组声明不产生第二份进度。

组间及普通任务构成的收缩 DAG 同样无环；外部前置取组员和 verify 对组外依赖的并集，全部 completed 才进入组。禁止外部依赖成员的隐藏绕行；不同组通过 verify 相连。活动组期间即使存在独立 ready 普通票也先完成活动组，避免未验证 HEAD 被外部使用。

### 运行数据与读取边界

无组新计划继续 v1；含组使用 `progress.yaml` 的 `format_version: 2`。v2 的机器写入格式限定为缩进 JSON（JSON 属于 YAML 子集，文件位置不变），字符串必须双引号、拒绝重复键与未知协议字段；不接收 YAML anchor/tag/注释等额外语法，不引入新 YAML 依赖。新读取器支持 v2，v1/单文件仍走既有分支。格式号只标识数据，不绑定 executor/skill 版本，也不生成编译快照。

v2 完整继承 tasks/resources/notes 和原 parallel 可选 execution 扩展字段；无组计划不准出现 awaiting_verification。新增字段如下：

| 位置 | 字段与约束 |
|---|---|
| 根 | `integration: {owner, worktree, branch, base_commit, validated_commit, active_group, groups}`；生成时 owner/路径运行值/SHA 为 null，active_group=null，组 status=pending；resources 可预登记已知资源 |
| integration.groups.GNN | `status: pending\|in_progress\|blocked\|completed`；`base_commit`（本组启动已验证点）、`checkpoint_commit`（最后已保存实现点）、`validated_commit`（本组完成点，完成前 null）、`evidence_paths: []` |
| tasks.TNN | 原 status 加 awaiting_verification；`implementation_commit` 记本票实现点，`commit` 仅完成后填接受点；`tests: pending_group\|pass\|fail` 对组员适用，保留原字段；`evidence_paths: []` 与 `deviations` 支持恢复 |
| notes | 追加授权来源、组激活/恢复/失效/晚到回执事件及证据路径，不覆盖旧记录 |

parallel 模式下 `integration.owner/worktree/branch/base_commit/validated_commit` 分别与 `execution.owner/integration_worktree/integration_branch/base_commit/validated_commit` 一致，后者为旧消费者的投影，不允许独立更新；CLI 检查一致性并要求同次原子更新。integration.base_commit 为特性原始审查点，groups.GNN.base_commit 为组进入点，不混用。串行 v2 也使用既有同一 common-dir 特性锁及其维护门，身份只在持锁后填写，不以存在 JSON owner 自证锁。v2 普通票完成同样更新 integration.validated_commit；在首次状态写入前取得锁，T00 建立/确认隔离后绑定真实工作区，保留该特性同一锁身份。

`current` 只指正在施工或补查的主线程票，不用它表示所有已待验票。运行 SHA 不指向正在包含它们的状态提交：先保存真实实现提交 C，再将 C 写入状态并另行提交；证据归档引起的后续提交不改变代码树时允许继续引用 C，但需可核验只变更本特性的进度/证据路径。

### ready、提交和验证事实

1. 活动组为空：普通票按 completed 依赖；整组只能在其全部外部前置 completed、资源可用、组基线实际通过且没有在途执行者/未接收实现时进入。保存组启动检查点后才开始业务写入。
2. 活动组存在：仅返回此组下一个可执行成员，成员的组内依赖必须 awaiting_verification 或 completed；未完成前序成员阻止越序。全部成员待验后仅 verify 可执行。blocked 时 ready 为空，由主线程明确修复/恢复后再算。
3. 普通票和其他组不消费成员中间状态。验证票通过和进度持久化前，不清 active_group、不推进验证基线、不切模式或从当前失败 HEAD 派票。
4. 每票先记录批准检查命令、期望允许的暂时失败及归因；命令、cwd、exit、实际实现 SHA/业务树标识、stdout/stderr 路径及 SHA-256 归档到特性 `execution/groups/GNN/TNN/<attempt>/`。原日志和失败尝试不可覆盖。组验证覆盖批准的全部组 Scenario、相关回归及旧形/调用者清理，没有必需测试记 skip/未运行而宣称通过的出口。
5. 状态转移只能在工作区已解释且实现提交存在时持久化；未提交业务改动在崩溃恢复时先核对本票归属，不 reset/stash/覆盖。日志存在与哈希只证明可恢复/未变更，不自证命令曾真实执行；主线程与独立审查核对实际工具回执、失败原因和语义。

计划必须为每个组给出组验证命令、公共 seam/Scenario、保护基线、局部必通过检查以及延期检查原因，不能仅把 `reason` 当免测许可。序列中有行为变化时在写该变化前保留有效红；纯机械迁移保护测试先于组首改动。没有足够保护/有效红则处理缺口后才写代码，不把组协议当 TDD 例外授权。

### 修复、恢复与资源

- 组验证失败后，组与 verify blocked；原待验票不因失败被误标 completed 或全部清空。只读诊断可继续。验证票若需改业务代码，先回到承担该写集合的成员；若涉及新接口/范围，沿契约偏差门修订计划后再继续。
- 回到成员时保存旧尝试，成员 in_progress、受影响依赖闭包 blocked；主线程记录修复归属和动作，组恢复 in_progress、verify 回 pending 后持久化这个修复检查点，才允许写入。依赖闭包仍 blocked 的成员只在其前置重新待验后由主线程显式置 in_progress 进行有效性复核，普通 ready 不能自动跳过它。按声明接口/提交/检查逐票重新确认，仍有效的工作复用，缺证据补验，不重复应用已有补丁。再次进入待验后全部组验证重跑；不能仅重跑上次失败一条就接受改变后的代码树。
- 恢复从实际集成工作区的已提交 progress 起步，磁盘中未提交的状态只视作待核验准备；原 owner 停止、锁实体归属、工作区与分支绑定、SHA ancestry、角色记录与证据都核对。不能核实的冻结，仍活跃的执行者不按超时替换。组中不存在 implementer claim，普通历史认领不清空。
- 完成证据已齐而状态没提交，核对代码树没有改变后补完成检查点；发现原接受实现已经存在，不重复 merge。组成功后清 active_group、保留组档案，恢复原模式；原审查基线、交付通道、模型声明历史保持。
- 工作区和持久证据目录均沿 progress.resources 登记；组不新建额外 worktree。未通过或证据未归档的现场不清理；最终仍只遍历台账并完成全量、实际合并、取代、sync_commit 与 roadmap 回写。

### 公共校验接口

- 既有 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index <plan-dir>`：增加可选组声明/角色/版本组合检查；无组路径保持原合同；exit 0 合法、1 非法，保持 `{ok,schema,file,errors}` 形状（成功时 errors 可沿现有省略）。
- 新增 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-state <plan-dir>`：只处理 v2，读取 index/progress 和实际 Git/证据，stdout 成功或 stderr 失败均为 JSON；返回 `{ok,schema:"plan-state",file,errors,protocol_version:1,active_group,ready_tasks}`。exit 0 表示记录一致，不等于可继续执行：业务 blocked 可返回 ok=true、ready_tasks=[]；一致性错误 exit 1 且 ready_tasks=[]。尚未启动的 v2 允许空运行值，返回 T00；运行后校验真实绑定、SHA、完成态与证据，不自动取得锁或变更文件。
- 调用入口对新协议要求成功且 `protocol_version:1`，不接受只有 exit 0 的未知响应；v1/单文件不调用 plan-state，不声称新 CLI 已验证其全部历史状态。plan-index 检查声明和 v2 数据形状但不把尚未创建的运行资源当错误；运行 Git/证据核对由 plan-state 承担。
- plan-state 的可调度结果以已提交的 index/progress 检查点为准；工作区内有尚未提交的声明/状态差异时返回 exit 1、`checkpoint_uncommitted`、ready_tasks=[]，供恢复者核对后补提交或保留阻塞。不能用磁盘中已 rename 但未提交的 completed 提前解锁。初始计划尚未建立隔离时从所在真实仓库校验已提交的 v2 档案，运行字段为 null 合法；T00 完成后要求隔离绑定，非 Git 或无法隔离的组不采用普通非 Git 原地降级。
- 解析器不执行声明文本或测试命令；路径限制特性内证据目录，拒绝绝对证据路径、`..`、符号链接逃逸和哈希不符。工作区由真实 Git/common-dir/branch 绑定，不能靠 JSON 写一个路径冒充。

终端归档补充（S27 生命周期闭合，T08 修复）：只有全部任务（含最终票）和组均 completed、current/active_group 均 null 的已提交档案，plan-state 才按终端只读分支核验，ready_tasks 固定为空。允许从实际合并目标或保留完整 Git 历史的档案副本读取；原 integration/execution 路径与分支是历史绑定，原证据 cwd 必须精确匹配该保存路径，不要求已按台账删除的原工作区仍存在；还从原成员 implementation_commit 的已提交 progress 核对 worktree/branch/base_commit，避免当前字段互相自证。全部原 SHA ancestry、验证树、日志哈希、证据归属、当前目标树及干净检查继续生效，不能以终端状态跳过验证或自动接受无 ancestry 的 squash。已有 execution.delivery 时还必须为 merged/completed，拒绝仍 implementing/awaiting_merge 的矛盾档案；无该项不新增字段。活动/等待/blocked 状态继续要求原隔离绑定，不因位置变化获得调度权限。

最终写者在原区保存检查点、实际验证提交和可恢复的来源/合并/所有权事实后，结束并释放原辅助调用；只读核实同一 common-dir 的来源检出/分支后，在来源重新取得同一特性锁的新 receipt，才实际合并并核验目标包含原 tip，进行获批清理与归档；锁空窗不写来源。不得修改旧 receipt 的路径或把 resume_receipt 跨工作区使用。原区删除后清理/提交中断时，在来源保留旧绑定和证据、保存最终票 blocked 检查点；其 plan-state 仍应 exit1/ready=[]，仅允许核实原来源/合并/台账/锁事实后继续终端收尾，不能派业务票。全部适用清理、Spec 回写/锚定和目标验证实际完成后，才更新实际全局验证 SHA、最终票 completed 并独立提交终端检查点；不改组验证 SHA/历史日志，parallel 同步既有投影，无新字段/CLI。

## 测试与验收策略

### 已批准测试落点

公共机器 seam 使用上述 plan-index 与 plan-state CLI；输入为真实临时特性目录和 Git 仓库，输出 JSON/exit/只读前后差异。覆盖组结构、状态与恢复，不按内部解析函数逐个造接口。真实 Git/日志哈希/路径核验不 mock；失败夹具可故意缺失、损坏或保留中间状态，但不能把 fixture 预置 pass 当成真实执行证明。

模型 seam 为实际 CLI 客户端加载本次候选 skill/计划/spec 指针、在有界夹具执行后的文件与工具回执。模型是唯一非确定性依赖；判读行为、状态、证据和授权边界，不匹配精确话术。普通命令返回与缺失工具可用受控替身检验拒绝分支，但标为 replay/受控，不能替代真实模型运行。来源为现行 TDD seam 与 test-strategy，参照前置 #3/#4 的证据方法，不将其专用控制器扩为本项通用执行器。

本项没有新增纯内存公共入口，机器验收主要为 PR lane 的本地文件/Git IO；既有 fast 回归仍保留。静态 eval 文件是意图清单，没有通用 runner。真实模型核心冒烟为 PR 必需；多 trial 和压力恢复为 nightly 非阻塞，二者分别报告，不以结构检查代替模型行为。

| Scenario | 维度 / Lane | 执行方式 | 预期与证据 |
|---|---|---|---|
| S01、S02 | 模型行为 / PR | 验收任务 | 可独立绿与不可独立绿两夹具，分解产物、来源与独立判读 |
| S03、S04 | 结构 / PR | 任务内 TDD | 实际 plan-index，合法组 exit 0、各非法变体 exit 1，定位准确 |
| S05、S07、S08 | 状态 / PR | 任务内 TDD + 验收任务 | plan-state 不误解锁；模型实际保存待验而不是 completed |
| S06、S12、S13 | 故障处理 / PR | 任务内 TDD + 验收任务 | 真实失败日志、基线保持、依赖闭包复核和全组复验 |
| S09、S10 | 排他/模式 / PR | 任务内 TDD + 验收任务 | 真实 Git/进程受控演练无重叠组写入；模型不提前派发 |
| S11、S14、S15、S16 | 恢复/一致性 / PR | 任务内 TDD + 验收任务 | 各提交窗口可恢复、不重复应用、证据不符拒绝；前后树与日志归档 |
| S17、S18、S29 | 兼容/拒绝 / PR | 任务内 TDD + 验收任务 | 旧路径照常、新能力不支持停止、普通票无待验特权 |
| S19、S20、S27 | 计划行为 / PR | 验收任务 | 实际计划稿中 T01/类型步骤/依赖理由正确，独立判读 |
| S21、S22、S23、S24、S25、S26 | 需求/交互 / PR | 验收任务 | 定向夹具覆盖所有对应判据，工具/对话与产物一起留证 |
| S28、S30、S31、S32、S33 | 边界行为 / PR | 验收任务 | 不早切换、不伪造红、保护时机正确、旧形清理、来源优先 |
| 全部 Scenario 的静态意图与引用 | docs / PR | 验收任务 | 逐条走查 eval、元数据、README 和 covers；只报告静态一致 |
| 核心模型场景多轮、锁/崩溃随机窗口 | 模型/压力 / nightly | 验收任务（非阻塞） | 至少 3 trial，逐例记录成功率/失败类；未运行如实标注 |

实施计划把 PR 模型核心组合为五组：①分解/前置/依赖；②组推进/普通票拒绝；③失败修复/证据；④中断/模式/排他；⑤需求审阅/上下文。每组的子例仍逐 Scenario 对账，不以“跑过五组”声称全覆盖。模型实际配置在执行时读取并记录，不预填型号或把历史模型当本次约束；预算沿既有批准的客户端约束，超时不算通过。受控流程与真实模型分开落证。

## 风险与边缘情况

- 全组同时 completed 的文件原子性不等于测试/代码/状态跨系统事务；通过先实现提交、外部日志、后状态提交和恢复核对解决，不宣称零窗口。
- v2 JSON 子集比手写 YAML 严格，错误时给字段/语法位置并停止，不静默丢字段。旧消费者是否遵守入口不是机器可强制的保证；新入口必须失败关闭。
- 被批准的暂时失败只能按命令/适用范围/原因识别，不能用任意非零 exit 作为“符合预期”；环境失败单列，必要证据缺失时阻塞。
- 组较大时只读当前票和依赖接口，操作检查点沿小票提交；文件量不能成为跳过最终全量的理由。
- hook 若自动改版本或其他产品文件导致计划外业务树变化，暂停并按现有仓库授权处理；不把这些改动混入验证通过事实。
- 实施前仍需核实 covers 与现行源码、运行环境、真实模型可用性；本文件不把未运行测试报告为 PASS。

## 开放问题

无阻塞设计问题。实施阶段仅细化内部函数组织、夹具内容和命令路径；若改变状态/完成单位、授权门、并发方式或公共 CLI 合同，按契约偏差回到设计。

## 实施记录

- T00：用户已确认执行；建立计划自有隔离工作区，base_commit=46752f43af19e91ff00964785f9ac35fb80d33b7；相关基线61/61、skills与官方Codex插件校验通过，见execution/serial/T00。未把本机CLI版本视作模型已运行。

- T01：公共plan-index首次红16个非法组被旧CLI错误接受；实现后34/34通过（含旧plan-index/parallel）。只增加声明结构、角色与出口检查，未接入状态/执行；接口与本票导航一致，无额外调度行为。证据execution/serial/T01。

- T02：implement v2 state and group readiness；35/35通过，缺少plan-state能力的有效组路径已观察红；真实Git事实由T03接入；公共CLI/字段与导航契约锚定，未扩展普通implementer或额外调度。证据execution/serial/T02。

- T03：verify persisted Git checkpoints and evidence；53/53通过，未提交完成态/错分支/损坏日志/逃逸链接/不存在提交等七个拒绝分支已观察有效红；公共CLI/字段与导航契约锚定，未扩展普通implementer或额外调度。证据execution/serial/T03。

- T04：仅新增具名eval输入并运行六例真实Claude探针，当前配置glm-5.3-flash[1M]全部返回provider429，无有效行为红，任务blocked；步骤3实现未执行。见execution/serial/T04/model-results.json，不能以CLI exit0/result success冒充模型成功。T05—T09仍pending。

- T04：integrate exclusive group execution and recovery；36/36机器回归及六项真实模型只读决定通过，修正三处组入口分流遗漏，S28补完整夹具后重新对照；实际写入留T08；公共CLI/字段与导航契约锚定，未扩展普通implementer或额外调度。证据execution/serial/T04。

- T05：generate typed tasks and integration-group plans；71/71机器检查及4例真实模型只读决策通过；接口与范围按批准计划自检，实际产物验收留T08；公共CLI/字段与导航契约锚定，未扩展普通implementer或额外调度。证据execution/serial/T05。

- T06：align refactor and group verification discipline；34/34机器检查及4例真实模型只读决策通过；保留S12错误状态证据后定向修复，既有schema未改；公共CLI/字段与导航契约锚定，未扩展普通implementer或额外调度。证据execution/serial/T06。

- T07：complete requirement and context inputs；40/40机器检查及6例真实模型只读决策通过；参与者能力与拒绝记录消费边界经真实失败补充，实际夹具验收留T08；公共CLI/字段与导航契约锚定，未扩展普通implementer或额外调度。证据execution/serial/T07。

- T08修复：按原S05/S14/S16拒绝只含旧业务树证据的待验状态，逐字校验已提交checkpoint；3例回归真实红后相关48/48绿。原模型失败促成既有维护门/暂停顺序、未知差异保留、v2模板路由及证据路径/提交顺序的入口澄清；契约未扩张，实际操作仍待新轮验证。

- T08第二轮澄清：既有特性锁SHA-256与L.maintenance路径具体化（沿concurrent演练既有实现），列操作顺序并禁止短命shell PID自证owner；恢复证据缺失/已解释树变化须补验。WP组票先读执行协议、准确归档JSON与符号清零，不改变批准状态/格式/调度契约。r2真实模型失败与harness输入缺口分别记录，待r3验证。

- T08第三轮S复审：新增锁禁令被独立确认误覆盖v1激活前授权请求；限定parallel/v2持锁阶段，保留既有v1先存请求与H后取锁顺序。模型配额403阻塞后不继续调用，最终任务尚未开始。


## T09交付前实施记录

2026-09-08：T08独立完整性审查通过，23条Requirement/33个Scenario、9项必需PR矩阵齐备。最终安全网179/179、0 fail/skip，skills/plugin官方与plan-index检查通过，详见 [验收报告](../acceptance/acceptance-report.md) 和 [T09原始验证](../execution/serial/T09/final-validation/facts.json)。七条部分取代按批准映射回写，旧三份spec保持active及原sync_commit。模型完整稿为反馈修订验收，生成任务未执行；非阻断RTK格式FAIL、nightly not_run和历史失败均保留。实际合并/清理/锚定待本票终态登记。


### T09实际交付完成

2026-09-08：实际快进合并main：bc99e272165167159e7e3409e47fa90ee0d32022，sync_commit锚定该真实合并点。178产品文件与最终179/179验收候选一致；29个live夹具、121个已验证外部审查副本、实施worktree与分支已清理，39份fixture快照保留。归档遗漏先由字节守卫拒绝，再补存完整tar、提交后续清。5个外部归属未明目录及10个私有诊断目录保留，不宣称删除。生成模型计划任务未执行；历史失败、非阻断RTK格式FAIL及nightly not_run保留。未push或发布。

## 与 exploring-clarifying 的分面共存

现行未取代条款继续有效；.spec-dev/2026-09-09-01-exploring-clarifying/spec/exploring-clarifying-design.md 负责概念双查、共享术语、可见清单及受控探索/来源交接切面，双方covers按各自行为声明。仅major-upgrade中被明确点名的澄清核心纪律走部分取代，其他条款不因同文件被触碰而失效。triage可读取相关上下文，但仍零自动落盘；历史“不读产物”的范围解释不再用于本切面。

### exploring-clarifying T01 切面同步

本次T01更新skills/requirement-analysis/references/context-reuse.md、skills/requirement-analysis/SKILL.md、skills/quick-fix/SKILL.md、commands/triage.md、skills/clarifying/SKILL.md、skills/requirement-analysis/assets/spec-template.md、skills/requirement-analysis/agents/openai.yaml、skills/quick-fix/agents/openai.yaml、skills/clarifying/agents/openai.yaml、skills/exploring/evals/evals.json、skills/requirement-analysis/evals/evals.json、skills/quick-fix/evals/evals.json的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。最终有效用例选择见 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T01/green-selection.json（S29仅本票贡献）；原行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t01-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t01-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T01/；这些任务期结果不替代最终候选验收。

### exploring-clarifying T02 切面同步

本次T02更新skills/clarifying/SKILL.md、skills/requirement-analysis/SKILL.md、skills/clarifying/agents/openai.yaml、skills/requirement-analysis/agents/openai.yaml、skills/clarifying/evals/evals.json的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t02-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t02-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T02/；这些任务期结果不替代最终候选验收。
