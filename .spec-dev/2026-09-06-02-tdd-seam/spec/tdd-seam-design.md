---
spec_dev:
  version: 1
  feature: tdd-seam
  status: active
  covers:
    - "skills/test-driven-development/**"
    - "skills/test-strategy/SKILL.md"
    - "skills/test-strategy/agents/openai.yaml"
    - "skills/test-strategy/evals/**"
    - "skills/requirement-analysis/SKILL.md"
    - "skills/requirement-analysis/agents/openai.yaml"
    - "skills/requirement-analysis/assets/spec-template.md"
    - "skills/requirement-analysis/evals/**"
    - "skills/writing-plans/SKILL.md"
    - "skills/writing-plans/agents/openai.yaml"
    - "skills/writing-plans/evals/**"
    - "skills/executing-plans/SKILL.md"
    - "skills/executing-plans/agents/openai.yaml"
    - "skills/executing-plans/evals/**"
    - "skills/executing-plans/references/review-orchestration.md"
    - "skills/executing-plans-parallel/SKILL.md"
    - "skills/executing-plans-parallel/agents/openai.yaml"
    - "skills/executing-plans-parallel/evals/**"
    - "skills/quick-fix/SKILL.md"
    - "skills/quick-fix/agents/openai.yaml"
    - "skills/quick-fix/evals/**"
    - "agents/implementer.md"
    - "agents/code-reviewer.md"
    - "scripts/tests/plugin-root.test.mjs"
  sync_commit: null
  supersedes:
    - ".spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md"
  superseded_by: null
---

# 公共测试落点与红绿纪律（tdd-seam）设计

> roadmap [skill-ecosystem-absorption](../../roadmaps/2026-09-03-01-skill-ecosystem-absorption.md) 子项目 #3；吸收报告 AB-01～05，并处理 #1 明确留给本项的纯文案例外归属。用户于 2026-09-06 批准推荐方案、完整设计及审查后的 spec，并同意编写实施计划；本 spec 已激活，尚未实施。

## 背景与目标

现有流程规定测试维度与运行窗口，却没有声明从哪个公共接口验证行为；TDD 的逐函数覆盖措辞、循环内重构与分散的 mock 纪律容易把测试绑定在实现细节上。本特性使获批测试落点沿 spec、计划和串并行执行传递，并统一反模式、重构时机与静态验证边界。

**成功标准**：获批落点直接复用；未知或冲突落点不被执行者自行选择；测试依赖独立真值与公共行为；重构退出红绿循环；便宜静态检查不能代替测试证据；纯文案例外只有一个定义点。

## 非目标

- 不新增 skill、seam 清单文件、导航表列、progress 字段、结果 schema 或自动调度器。
- 不改变默认串行、并发 opt-in、每票五步、集成验证后完成或资源与认领纪律。
- 不扩大到 roadmap #4 的审查维度 S、#5 的 prefactor/expand–contract、#6 的根因诊断、#7 的 spike。
- 不为 typecheck 新增工具依赖，不将 skill 行为变化归为纯文案免测，不以文件后缀判断是否需要行为验证。

## 术语表

- **测试落点（seam）**：测试通过其输入及可观察输出验证行为的公共契约边界；可为函数、模块 API、CLI、HTTP API 或数据库适配器。Avoid：私有方法覆盖点。
- **独立真值**：来自需求、已验证字面量或独立手算例子的预期结果，不复制被测实现算法。
- **纯重构**：保持已承诺可观察行为和接口不变的结构调整；不包括借重构补功能或改契约。
- **纯文案**：不改变行为、契约或测试预期的措辞调整；技能执行规则属于行为，不因写在 Markdown 中而变成纯文案。
- **静态快检**：项目已有且适用的 typecheck 或静态检查命令，是反馈手段，不是行为测试结果。

## 影响面与定义点

| 定义点 | 职责与消费方 |
|---|---|
| requirement-analysis + spec-template | 在既有完整设计批准门展示并记录 seam；测试策略节承载接口、Scenario、依赖替换边界 |
| writing-plans | 在现有四列导航和任务接口块传递落点及来源；声明静态快检命令；任务五步不变 |
| test-driven-development | 统一落点消费、独立真值/公共行为导向、红绿循环、纯重构保护与例外清单 |
| testing-anti-patterns | 反模式 6/7、mock 准入正负清单、正反例、速查表与 Red Flags |
| test-strategy | 四类外部依赖的策略、注入和窄接口处方、静态快检的节奏；保留三 Lane 与真实集成要求 |
| executing-plans / parallel / implementer / quick-fix | 引用上述定义；处理落点缺失、冲突、授权例外与重构候选，不复制规则全文 |
| code-reviewer / review-orchestration | 按公共行为而非新增函数数量审查覆盖；承接重构候选及修复后复审，不增加审查维度 |

修改触及的 description 与语言协议保持中文；所有 SKILL/openai 元数据按当前同步规则核对。`scripts/tests/plugin-root.test.mjs` 中要求 quick-fix 保留自有纯文案例外的存量断言随契约取代更新。其余现有自动测试复跑，不为镜像措辞新增大量正则断言；不改只管理 anysearch/sequential-thinking 的 vendored 同步器。

## 已确认的关键决策

- 沿用既有定义点与接口块，拒绝另建 seam 清单及机器校验产生重复状态；seam 不是每个产出函数都必须有独立测试的别名。
- 设计已批准的 seam 是权威；spec 与 plan 冲突时不自行择一覆盖，走既有偏差处理。旧计划只允许唯一提取已有决定，不允许推测新决定。
- mock 准入与策略分层；禁止旁路是相对于选定 seam 而言，数据库契约测试本身仍有效。
- 纯重构退出每个红绿循环，由既有收尾机制承接；五步的第五步本来是提交，因此无需改变并发结果 schema。
- 已授权的纯文案例外迁入 TDD 单点；既有授权在范围内复用，不反复询问。
- 静态快检附加于现有测试纪律；保留有效红绿、相关测试、最终全量与失败归属裁决。
- 无新 ADR：这些局部技能规则不满足难以逆转判据；[ADR-0005](../../adr/0005-plan-single-format.md)、[ADR-0006](../../adr/0006-plugin-root-resolution.md)、[ADR-0007](../../adr/0007-opt-in-concurrent-execution.md) 原样继承。

## 取代与共存

- **部分取代** `.spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md` 的 Requirement「quick-fix TDD 例外清单引用（改了什么：不再复述清单，改为引用 + 显式化自有差异）」：其自有纯文案例外迁入 TDD canonical，下文同名 MODIFIED 完整承接引用及授权纪律；该旧 spec 其余插件根、失败隔离、Codex 映射行为分面共存。draft 阶段不改旧 spec；本 spec 激活时写 pending，交付时才回写单条 Superseded。
- **分面共存** `.spec-dev/2026-09-06-01-concurrent-execution/spec/concurrent-execution-design.md`：保持「plan 单一形态」「渐进执行与断点恢复」「implementer 独占执行契约」「集成验证后才完成」及全局收尾。seam 仅细化既有接口输入；blocked、空基线与例外票串行分流、五步、progress 唯一写者、schema、集成判据均不变。
- **分面共存** `.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md`：其现行「存量计划兼容读取」保留；已被 #2 取代的计划形态/恢复/资源条款仅作历史，现行继承文本以 #2 为准。唯一提取不迁移旧计划格式。
- **分面共存** `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md`：保留 test-strategy 的 Lane、治理顺序、模型边界、处方引用，以及设计原则、搜索、roadmap/编号和插件校验。新增纪律不改变这些切面；已取代的计划/恢复/资源/visual 条款不再作为现行约束。
- **分面共存** `.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`：保留相关范围基线、缺失/失效声明处理、最终全量和范围外失败归属裁决；typecheck 不能缩减它们。
- **分面共存** `.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md`：不改变仍现行的资源闭环；已取代条款以其后继为准。
- **分面共存** `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md`：继承批准、取代时序、covers 双声明、现行 Scenario 过滤、孤儿测试退役与对账语义。
- clarifying-skill、triage-routing 无本项文件或行为交集；TDD 目录原无 active covers，由本 spec 接管。交叉 covers 在实施提交逐项说明；不把 Markdown 技能行为误判为无需保护的普通文档。

## ADDED Requirements

### Requirement: 上游测试落点声明

requirement-analysis SHALL 在既有完整设计批准门中展示测试落点声明，并把获批声明保存在 spec 测试策略节，供计划消费。

#### Scenario: S01 复用一个公共接口覆盖多个行为

- **GIVEN** 现有 `Cart.total()` 可观察优惠和空购物车两个 Scenario，内部有三个辅助函数
- **WHEN** 展示设计及写入 spec
- **THEN** 声明 `Cart.total()`、两个 Scenario 和依赖替换边界；不因辅助函数数量另造三个落点，也不额外开独立 seam 批准门。

### Requirement: 计划中的落点传递

writing-plans SHALL 将获批落点及来源传入现有导航接口列和任务接口块，使只读本票、spec 与依赖接口行的执行者能获得同一测试边界。

#### Scenario: S02 并发消费者无需读取前票正文

- **GIVEN** T02 依赖 T01 的公共接口，两个任务共享一个已批准 seam
- **WHEN** 只向 T02 提供本票、spec、index 与依赖接口行
- **THEN** 输入可定位 seam、接口签名与对应 Scenario；无需读取 T01 正文；导航仍为四列，无新进度字段或清单文件。

### Requirement: 既有落点决定的直接消费

TDD 执行者 SHALL 直接使用上游获批 seam，或唯一提取并记录存量已批准接口与 Scenario 中的同一决定，不重复征询该决定。

#### Scenario: S03 显式声明直接开工

- **GIVEN** spec 和本票明确指定同一 seam，用户已经批准
- **WHEN** 开始写失败测试
- **THEN** 使用该 seam，不再次询问测试落点。

#### Scenario: S04 存量接口唯一提取

- **GIVEN** 旧计划没有 seam 标签，但批准的精确接口与 Scenario 唯一指向 CLI 的退出码和标准输出
- **WHEN** 恢复执行
- **THEN** 在本次工作记录中记下来源及提取结果，沿该 CLI 测试；不重写旧计划形态或选择私有函数作为新落点。

### Requirement: 缺失或冲突落点的裁决

执行链 SHALL 把无法唯一确定或相互冲突的落点交主线程依既有澄清/契约偏差纪律裁决，在决定前停止受影响任务的测试与实现。

#### Scenario: S05 即兴修复并入原确认环节

- **GIVEN** quick-fix 无批准落点，API 与内部服务都是候选
- **WHEN** 形成修复方案
- **THEN** 主线程在原修复确认环节说明公共接口和推荐落点，一次一题确认；不先写任一候选的测试。

#### Scenario: S06 spec 与计划冲突

- **GIVEN** spec 指定 HTTP seam，计划却要求私有方法断言
- **WHEN** 串行执行者检查本票输入
- **THEN** 报告冲突并走偏差处理，不默默选择其中一个继续。

#### Scenario: S07 implementer 不越权修正

- **GIVEN** implementer 发现落点缺失，或纠正落点需要改写集合外文件
- **WHEN** 检查任务可执行性
- **THEN** 回报 `blocked` 及来源/缺口，由主线程处理；不自行发问、修改 plan、扩大 writes 或伪造红绿结果；其他独立票按原并发规则处理。

### Requirement: 独立真值断言

testing-anti-patterns SHALL 将按被测算法重算期望值列为反模式 6，并以独立真值来源作为修正判据。

#### Scenario: S08 拒绝同构自证

- **GIVEN** 被测函数用 reduce 求和，测试又用同一 reduce 算出期望值
- **WHEN** 检查断言
- **THEN** 指出同义反复，改用有来源的已知样例结果，如 `[2, 5, 8]` 的手算值 `15`，而非换个函数名继续复制算法。

### Requirement: 公共边界内的测试位置

testing-anti-patterns SHALL 将越过获批 seam 依赖私有实现列为反模式 7，并在已确认行为未变时优先修正测试位置。

#### Scenario: S09 重构后脆弱测试失败

- **GIVEN** 私有协作者改名导致 mock 断言失败，而获批公共行为保持不变
- **WHEN** 诊断失败测试
- **THEN** 把测试移回公共边界，不为保留脆弱断言恢复旧内部结构；若公共行为实际改变，则按行为回归处理。

#### Scenario: S10 数据库测试边界对照

- **GIVEN** 一个测试声称验证 HTTP 响应却只查内部表，另一个明确验证获批数据库适配器契约
- **WHEN** 审查测试落点
- **THEN** 前者补回 HTTP 可观察行为断言，后者可在自身契约边界验证真实数据库；不一概禁止 DB 测试。测试夹具准备和清理不等于旁路行为断言。

### Requirement: 静态快检命令及节奏

计划与执行链 SHALL 使用项目已有且适用的静态快检命令在编辑批次间提供反馈，并把它与必需行为验证分别记录。

#### Scenario: S11 有 typecheck 命令

- **GIVEN** 项目配置已有 typecheck，计划同时声明目标行为测试和最终全量命令
- **WHEN** 完成一批接口编辑及本票实现
- **THEN** 可先获得 typecheck 反馈，仍运行本票红绿与相关验证；最终全量保留，静态通过不解锁尚未完成集成验证的后继。

#### Scenario: S12 无适用命令

- **GIVEN** 项目没有 typecheck 或其他适用静态命令
- **WHEN** 编写与执行计划
- **THEN** 标注静态快检不适用并沿用测试命令，不虚构 `tsc`、不安装额外依赖；不适用不等于任务测试通过。

#### Scenario: S13 编译失败不充当红证据

- **GIVEN** 新测试因拼写、编译或环境缺件而报错
- **WHEN** 收集红证据
- **THEN** 记录该故障并修复/阻塞相应验证，直到观察到预期行为失败；不把非零退出码直接当作有效红，也不将 SKIP 记作 PASS。

## MODIFIED Requirements

### Requirement: mock 准入与策略分层（改了什么：把隐含准入具体化并补四类策略）

测试纪律 SHALL 以 testing-anti-patterns 作为 mock 准入定义点、test-strategy 作为外部依赖策略定义点，通过引用保持两层一致。

准入仅在声明的外部边界替换依赖，不 mock 获批 seam 内自己的实现协作者或私有方法；保留理解副作用、真实数据结构完整性、不得为测试污染生产 API 的原纪律。策略区分外部 API、数据库、时间/随机性、文件系统：外部 API 可由明确契约的替身隔离；DB 优先真实测试库，内存替身仅提供局部信心；时间/随机性以注入源控制；文件系统按目的选可控真实临时目录或边界替身。注入及操作明确的窄接口用于已有交付需求，不为测试投机新建抽象。三 Lane、fake model 骨架和真实集成要求保持。

#### Scenario: S14 内部实现与外部替身对照

- **GIVEN** 支付业务通过声明的支付客户端边界调用外部服务，同时有内部折扣计算模块
- **WHEN** 设计测试替身
- **THEN** 可替换支付客户端并检查真实业务结果，保留内部计算；不把“自己写的外部适配器”按所有权误判为禁止替换的内部细节。

#### Scenario: S15 四类依赖与集成信心

- **GIVEN** 测试涉及远端 API、数据库、时钟/随机源、文件系统
- **WHEN** 选择策略及 Lane
- **THEN** 每类按上述规则得到真实依赖或替身方案；纯内存替身可以进入 fast，真实 IO 按 PR/nightly 安排；fast 全绿不能证明真实 DB/网络集成通过。

### Requirement: 公共行为覆盖检查（改了什么：替换逐函数或泛化新代码覆盖导向）

TDD 完成清单与 code-reviewer SHALL 按获批 seam 的公共行为、相关 Scenario、边缘及错误路径检查覆盖，而非按新增函数数量要求独立测试。

#### Scenario: S16 三个私有函数不制造三份测试

- **GIVEN** 两个获批行为由三个内部函数实现且均已有公共边界测试
- **WHEN** 完成自检和代码审查
- **THEN** 不因三个函数缺少直接单测判失败；如果错误路径 Scenario 漏测，仍明确报告该覆盖缺口。

### Requirement: 红绿循环与重构分离（改了什么：移除循环内重构并交收尾承接）

TDD 及各执行入口 SHALL 将循环限定为失败测试、确认有效红、最小实现、确认绿，把额外结构清理候选交既有收尾机制处理。

任务五步仍在上述四步后提交。串行/并发契约自检继续检查 over/under-building 与接口锚定，不扩大为每票风格审查。重构候选保留位置、理由和行为保护证据；有正式计划则进入现有收尾审查，quick-fix 则进入自身修复收尾，不因此强制开启可选 acceptance-qa 或整套 executing-plans。处置沿既有授权边界，禁止循环内顺手重构。

#### Scenario: S17 绿后发现重复代码

- **GIVEN** 目标测试已绿，执行者发现与本票相关的重复辅助逻辑
- **WHEN** 结束本次红绿循环
- **THEN** 记录重构候选，按任务流程提交和自检；收尾接收候选，而不是在每个循环里自动去重或新增功能。

#### Scenario: S18 各入口与图示一致

- **GIVEN** TDD 正文、DOT、description/openai、反模式 5、串行和 quick-fix 引用及已有 eval
- **WHEN** 沿任一入口执行红绿
- **THEN** 都没有循环内重构步骤，串并行每票仍保持五步；纯壳引用指向同一定义，元数据仍为中文。

### Requirement: 收尾纯重构的行为保护（改了什么：区分行为修复与不变行为的结构调整）

收尾处理 SHALL 对行为缺陷使用复现失败测试，对纯重构使用公共行为保护测试验证前后保持通过，并复审受影响维度。

#### Scenario: S19 纯重构复用已有保护

- **GIVEN** 已授权的结构整理不改变公共接口且已有相关行为测试
- **WHEN** 实施整理
- **THEN** 记录前后通过证据，不伪造失败或强行添加同义测试；一旦可观察行为回归就修复回归，不把它当作允许的重构差异。

#### Scenario: S20 缺少保护先刻画

- **GIVEN** 待整理路径缺乏公共行为保护测试
- **WHEN** 准备纯重构
- **THEN** 先依据现行契约补行为刻画并观察当前实现通过，记录其为刻画而非红证据，再进行结构调整；若需求期望与当前行为不同则转行为缺陷修复。

#### Scenario: S21 并发红绿协议不被豁免

- **GIVEN** implementer 被派发的票实际只需纯重构保护，无法提供新增行为的有效红证据
- **WHEN** 执行准入检查
- **THEN** 不伪造红结果，回主线程按现有例外/阻塞串行路径处理；不改变 implementation-result phase 或接收器对普通实施票的红绿要求。

### Requirement: TDD 例外统一定义（改了什么：加入纯措辞例外并明确授权复用）

TDD SHALL 在唯一例外清单中保留一次性原型、生成代码、配置文件，加入不改变行为或契约的纯文案，并要求适用的用户授权可追溯且在原范围内复用。

#### Scenario: S22 已授权纯措辞调整

- **GIVEN** 用户已授权一次不改变规则的错别字修正及其免测处理
- **WHEN** 同一范围内继续修正
- **THEN** 引用既有授权，不重复确认，也不为字面替换新增镜像断言；仍执行适用的格式/结构检查。

#### Scenario: S23 技能行为不是纯文案

- **GIVEN** 修改 Markdown 中的执行规则、API 语义或验收预期
- **WHEN** 判断纯文案例外
- **THEN** 不按后缀免测；为改变的行为设计正反场景及适当验证，实际例外仍依其授权处理。

### Requirement: quick-fix TDD 例外清单引用（改了什么：纯文案迁入 canonical，删除自有例外复述）

quick-fix SHALL 只引用 TDD 的例外清单与授权纪律，不再定义自有纯文案例外或重复列举清单项。

#### Scenario: S24 单点迁移及旧断言处置

- **GIVEN** quick-fix 当前含自有纯文案例外，plugin-root 测试要求保留它
- **WHEN** 完成本次迁移
- **THEN** TDD 有完整清单，quick-fix 保留引用及授权语义且无自有差异；存量测试转而验证引用与单点归属，旧 Requirement 随本项交付回写取代。

## 方案设计

声明采用普通 Markdown，最小内容为「公共接口与签名/协议、覆盖的 Scenario、允许替换的依赖边界、来源」。seam 的完整声明在 spec；计划接口块/导航行携带必要接口及指针，不另建 ID 注册表。没有依赖替换时显式写无。一个 seam 可覆盖多个 Scenario，多个任务也可共享 seam；四列导航中的产出接口并不自动等于每个接口都要独立直测。

数据流为：既有完整设计批准 → spec 声明 → 计划接口传递 → 执行前确认来源一致 → 红绿证据及候选记录 → 原收尾审查/验证。快检命令随计划测试命令提供，声明来源配置和不适用原因；不增加 progress schema。纯重构前后日志标注用途，避免被误用为普通票的 red。

声明缺失时先读取允许的现有来源，唯一提取只恢复已批准决定；多个候选、来源不一致、需要新接口或写集合变化都交主线程。无 plan 的 TDD 调用由主线程在写测试前确认 seam；quick-fix 优先并入既有确认环节。有 plan 的结构缺口走偏差，不由 implementer 自行询问用户。候选记录使用现有任务 notes、研究或审查记录，不另设运行状态源。

## 测试与验收策略

**本特性的 seam** 是技能消费方可见的指令与决策输出：设计/计划产物中的接口信息、执行者是否继续/阻塞/请求裁决、测试证据分类，以及现有插件校验 CLI。Scenario 对照采用独立给定期望，不通过复制技能句子制造“通过”。模型输出按结构、决策和实际动作判定，不按精确措辞或私有思考过程评分；模型边界可用受控输入复核装配，真实遵循只由真实模型记录证明。

静态 eval 是仓库现有的设计意图文件，没有自动 runner。表内静态走查记录对应入口、正反输入、预期及原文依据，只能记 STATIC_MATCH/不匹配，不能冒充真实行为 PASS。技能行为变更先写对应 eval 场景并验证旧规则的差异，再改规则；确定性脚本断言调整仍走真实失败→通过。普通措辞调整不用新增镜像文本测试。真实模型冒烟为 PR 必需检查；真实多轮 eval 为 nightly 非阻塞。执行环境/模型不可用时记录 BLOCKED（矩阵状态 unverified）及原因，不静默降格为静态通过。

| Scenario / 检查项 | 维度 | 执行方式 | Lane | 验收证据 |
|---|---|---|---|---|
| S01 复用一个公共接口覆盖多个行为 | integration（指令） | 验收任务 (A) | PR | 设计与模板声明走查 |
| S02 并发消费者无需读取前票正文 | integration（指令） | 验收任务 (A) | PR | 仅给允许输入的接口可达性走查 |
| S03 显式声明直接开工 | integration（指令） | 验收任务 (A) | PR | 串行/并发入口与 eval 逐项对照 |
| S04 存量接口唯一提取 | integration（指令） | 验收任务 (A) | PR | 旧计划夹具、提取依据与预期记录 |
| S05 即兴修复并入原确认环节 | integration（指令） | 验收任务 (A) | PR | quick-fix 无声明输入及确认路径 |
| S06 spec 与计划冲突 | integration（指令） | 验收任务 (A) | PR | 冲突输入与偏差路径走查 |
| S07 implementer 不越权修正 | integration（指令） | 验收任务 (A) | PR | 缺失/写集合不足两个输入的阻塞走查 |
| S08 拒绝同构自证 | integration（指令） | 验收任务 (A) | PR | 同构算法/独立字面量对照 |
| S09 重构后脆弱测试失败 | integration（指令） | 验收任务 (A) | PR | 不变行为/实际回归对照 |
| S10 数据库测试边界对照 | integration（指令） | 验收任务 (A) | PR | HTTP 旁路与 DB seam 两个输入 |
| S11 有 typecheck 命令 | integration（指令） | 验收任务 (A) | PR | 配置依据与目标/集成/全量命令保留 |
| S12 无适用命令 | integration（指令） | 验收任务 (A) | PR | 无命令输入，不适用和未新增依赖 |
| S13 编译失败不充当红证据 | integration（指令） | 验收任务 (A) | PR | 故障分类与并发原红绿校验对照 |
| S14 内部实现与外部替身对照 | integration（指令） | 验收任务 (A) | PR | 依赖所有权和边界身份对照 |
| S15 四类依赖与集成信心 | integration（指令） | 验收任务 (A) | PR | 四分类及 Lane/真实 IO 分界走查 |
| S16 三个私有函数不制造三份测试 | integration（指令） | 验收任务 (A) | PR | 清单和 reviewer 的覆盖判据对照 |
| S17 绿后发现重复代码 | integration（指令） | 验收任务 (A) | PR | 候选去向、五步和自检边界走查 |
| S18 各入口与图示一致 | integration（静态） | 验收任务 (D) | PR | 各副本扫描、DOT 边及 eval 走查记录 |
| S19 纯重构复用已有保护 | integration（指令） | 验收任务 (A) | PR | 纯重构输入及前后绿证据分类 |
| S20 缺少保护先刻画 | integration（指令） | 验收任务 (A) | PR | 无保护输入、刻画与红证据区别 |
| S21 并发红绿协议不被豁免 | integration（指令） | 验收任务 (A) | PR | 纯重构票的既有串行分流走查 |
| S22 已授权纯措辞调整 | integration（指令） | 验收任务 (A) | PR | 授权指针及范围对照 |
| S23 技能行为不是纯文案 | integration（指令） | 验收任务 (A) | PR | 规则变化与错别字修正对照 |
| S24 单点迁移及旧断言处置 | integration（静态） | 任务内 TDD | PR | plugin-root 相关断言实际红绿日志与单点核对 |
| 插件/元数据/原自动回归 | integration | 验收任务 (D) | PR | CLI 退出码、测试实际计数与 skip 数、diff 检查 |
| 关键执行行为模型冒烟（S03/S07/S09/S11/S19） | integration（真实模型） | 验收任务 (A) | PR | 实际加载候选 skill 的输入、模型/配置、输出和可观察动作记录，各例独立判定 |
| 全 Scenario 多轮真实模型 eval | integration（真实模型） | 验收任务 (A) | nightly | 多 trial 原始记录与逐 Scenario 结果；非阻塞，未运行明确 unverified |

PR 模型冒烟覆盖五个具名场景，采用可用的廉价模型/既有客户端，不新建 runner；输入来自本 spec 的独立夹具。S03 验证不重复问、S07 验证 blocked 且无越界写、S09 验证修正测试落点、S11 验证快检不能替代必需测试、S19 验证纯重构保绿且不伪造红。失败先诊断输入/装配/模型行为，不通过改预期消除失败；供应方故障按环境阻塞记录。nightly 多轮用于观察稳定性，不用单次冒烟宣称稳定性已验证。

实施计划保留最终全量 `node --test scripts/tests/*.test.mjs`，以及 `node scripts/validate-skills.mjs`、`node scripts/check-plugin.mjs`、`node scripts/check-openai-sync.mjs`、`git diff --check` 和 staged spec drift。实际运行命令遵循宿主 RTK 约定。UI、可访问性、负载测试不适用，本项不提供相关性能承诺。

## 风险与边缘情况

- “公共”不等于只测最外层 HTTP；较高层边界必须仍能稳定观察目标行为，不以过高边界迫使巨大夹具。
- “不测内部协作者”不按代码所有权划分；外部适配器可由本仓库实现但仍代表声明的外部边界。
- 纯重构刻画测试可能立即通过，它不能充当新行为的红证据；此区别需同步 TDD 的立即通过 Red Flag 与完成清单，避免保留矛盾。
- quick-fix 没有正式计划时仍可记录和处置重构候选，不因本项强制扩大可选验收流程。
- 本 spec 的静态走查和模型执行是不同证据；不引入自动 runner，模型冒烟缺环境时阻塞状态可见。

## 开放问题

无影响设计的未决项。具体任务拆分、现有客户端/模型命令与夹具位置由 writing-plans 在本边界内查证并固定；环境不可用不能改变验收等级或提前交付。
