---
spec_dev:
  version: 1
  feature: quick-fix-diagnosis
  status: active
  covers:
    - "skills/quick-fix/SKILL.md"
    - "skills/quick-fix/agents/openai.yaml"
    - "skills/quick-fix/evals/**"
    - "README.md"
    - "README.zh-CN.md"
  sync_commit: 464666d7f1c3decd63c160814d8beab0af473d39
  supersedes: []
  superseded_by: null
---

# Quick-fix 轻量诊断与修复收尾设计

> 来源：路线图 skill-ecosystem-absorption #6，AB-16/17/18/19。2026-09-08 用户批准设计、spec与计划流程；实施与必需验收已完成，已本地交付。

> 独立设计审查 Approved，12 条 Requirement / 24 个 Scenario；实施与验收证据见 ../acceptance/acceptance-report.md，真实进度见 ../plan/progress.yaml。

## 背景与目标

quick-fix 已有根因定位、spec 反查、升级门、逐题确认和 TDD；本项补上“根因认定有真实证据、修复覆盖真实故障、收尾能回查”的轻量约束。沿现有六步增强，不另建诊断循环。

**成功标准**：非显然根因在确认前有针对原症状的失败证据；证据不足能及时交接；获批测试落点覆盖真实故障；修复结果由原症状回放及实际动作支持，偶发故障不因单次绿被宣布消失。

## 非目标

- 不新增 skill、通用诊断执行器、持久诊断状态协议、十级 loop 或 3–5 假设完整 ranking。
- 不改变 TDD 例外、获批 seam 权威、一次一题、spec 生命周期、既有提交/清理授权、可选 acceptance-qa 或 ADR。
- 不把源码插桩当免测理由，不增加私有测试接口，不因架构发现自动授权重构。
- 不实施路线图 #7/#8，不刷新全部历史产物；本项仅纠正所触及 quick-fix eval 的旧 glob 数量描述。

## 术语表

- **诊断红信号**：实际执行且能观察原症状的失败结果，附命令、条件和输出；环境失败不属于目标行为红。与 TDD 回归测试可共享证据，但不自动相互替代。
- **可比较复现条件**：明确原症状断言、环境/输入/触发方式及观察范围，能在修复前后按同一口径记录结果。不是“运行足够多次”的统计保证。
- **测试落点（seam）**：现行 TDD 定义的公共行为观察边界；本文只增加与真实故障模式的对应检查。
- **修复对象**：同一用户症状及其经证据确认的根因链；文件数、调用方数、消息轮次或上下文压缩不作为分界。
- **证据进展**：本次调查实际支持、排除或区分候选，或产生有依据且可检验的新候选；重复相同尝试、换句话描述猜测不算。

## 参与者与适用行为

| 参与者 | 职责和错误路径 | 验证位置 |
|---|---|---|
| 用户 | 提供症状，裁决升级/继续及原有根因、修法、契约影响确认；已有授权直接复用 | S18、S19、S22、S23 |
| quick-fix 主线程 | 取得和判读证据、spec 反查、限定调查、修复与收尾、交接；对证据缺口负责 | S01–S24 |
| 可选 code-explorer | 按现有只读有界派发追踪根因；失败由现有缩域重试/主线程接管处理 | S20 |
| 目标测试/CLI/API 与环境 | 提供行为结果或环境错误；没有用户裁决权 | S01、S02、S08、S12、S13 |

没有新增后台执行者或自动授权主体。验收模型与独立审查者属于本特性的验证设施，不扩大 quick-fix 产品角色。

## 影响面

- `skills/quick-fix/SKILL.md`：description、六步中的诊断/升级/确认/修复/收尾和 Red Flags。
- `skills/quick-fix/agents/openai.yaml`：摘要随行为同步；当前已是 seam/TDD 摘要，不照抄路线图旧“三信号副本”定位。
- `skills/quick-fix/evals/evals.json`：更新原流程预期、新增正反行为案例、将旧“三条 glob”纠正为现行五条；`trigger-evals.json` 只在入口表述确有变化时补冷启动对照，不把会话中升级伪装成入口触发。
- `README.md`、`README.zh-CN.md`：功能摘要、流程图升级摘要和 quick-fix 使用说明，保持双语一致。
- 新 spec、计划和特性内验收夹具/证据；不扩展 `scripts/review-runner.py`，不以本特性为由修改公共运行器。

## 已确认的关键决策

1. **证据不足才升级**：用户明确选择；偶发但可比较时可以继续，无法可靠捕获/比较原症状或限定调查后根因仍缺证据才触发认知性升级。
2. **内嵌六步**：用户选择方案 1；相比拆独立诊断参考文档，避免额外加载和双重流程权威，符合本项局部增量范围。
3. **保留现有测试落点和 TDD 权威**：补真实 bug 模式判断，不把“缺标签/多候选”当架构缺陷或免测条件。
4. **同一根因链为对象边界**：多调用方不是多个对象；独立问题只记录后续入口，用户可明确扩大范围。
5. **验证动作与结论**：至少一个真实可写端到端夹具，其余边界通过真实模型决策和独立证据核查；静态检查不充当行为证明。

ADR 分流：以上是既有工作流内可局部调整的纪律，未同时满足“难以逆转、缺上下文会费解、真实取舍”三判据，故不新增 ADR；Accepted ADR 不修改。

## 约束归属与拒绝的解读

| 约束 | 负责边界 | 验证 |
|---|---|---|
| 红证据来自目标行为 | 步骤 2，沿 TDD 有效红定义 | S01–S04 |
| 升级/继续由用户裁决，候选不自动成为事实 | 步骤 2.5/3，沿 clarifying | S18–S23 |
| 获批落点直接消费、结构发现需证据 | 步骤 3/5，沿 TDD 与 design-principles | S05–S07 |
| 不因一次绿或缺原环境过度宣称 | 修复收尾/交付 | S08、S09、S12–S14 |
| 源码插桩与持久资源分开处理 | 修复收尾，沿既有授权及资源台账 | S10、S11 |
| 范围收敛与可恢复交接 | 步骤 1/2.5/收尾，引用共享止损 | S15–S17 |

已裁决的拒绝解读：

- 报告“bug flaky/无法复现”不解释为“凡偶发一律提示升级”；用户裁决采用证据质量门槛。
- “显然小修豁免”只免诊断前置，不免 TDD；“无 correct seam”不解释为留一条架构笔记即可无测试交付。后者虽见上游完成条件，但不符合本仓库现行 TDD。
- “一次会话一个修复对象”不解释为每轮消息只能修一个文件或压缩后重来；来源为 AB-19 提议和本轮完整设计，不声称本地上游 diagnosing-bugs 已有该规则。
- 不吸收重型循环，不为候选数或重试数凑程序；有新证据可继续限定调查，无证据进展不得靠追加猜测无限延长。

## 取代与共存

本项修改现有实现行为，但没有改写下列旧 spec 的现行 Requirement；均为分面共存，`supersedes` 为空。当前 quick-fix covers 命中六份 active spec，另有四份行为相关 spec；旧行号/旧“4 份”统计不作依据。

| active spec（仓库根相对路径） | 相交条款与共存理由 |
|---|---|
| `.spec-dev/2026-09-06-02-tdd-seam/spec/tdd-seam-design.md` | 「既有落点决定的直接消费」「缺失或冲突落点的裁决」「TDD 例外统一定义」「quick-fix TDD 例外清单引用」保持；仅补真实故障对应检查。旧红绿/纯重构条款已被 #5 取代，不作现行依据。 |
| `.spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md` | 「主线程止损」「失败隔离单点化」「成熟度分区与发布纪律」保持；新增对象边界与证据不足处置，不复制共享失败/降质规则。 |
| `.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md` | 「quick-fix 收尾清单式清理」保持；源码诊断标识检查不替代持久资源清单或扩大删除授权。 |
| `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md` | 「子代理与全 skill 统一搜索优先级」「澄清核心纪律」保持；不改工具入口和自我披露。 |
| `.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md` | 「存量计划兼容读取」保持；诊断不要求升级历史计划格式。 |
| `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md` | 「消费侧按状态与指针过滤」保持；诊断允许历史参考，修复方向仍服从现行契约，五条发现 glob 保持。 |
| `.spec-dev/2026-08-08-triage-routing/spec/triage-routing-design.md` | 「拿不准档默认路由 quick-fix」「quick-fix 升级携带上下文交接」「triage 引用而不复制分诊判据」保持；新增升级信号不改变入口默认或重开已裁决问题。 |
| `.spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md` | 「被引用模式不触发出口」「quick-fix 步骤 3 引用 clarifying」保持；候选清单是证据呈现，不变成同时多题。 |
| `.spec-dev/2026-09-06-03-review-conformance/spec/review-conformance-design.md` | 「共享模块判据」「可选架构深化」「通用派发完成条件」保持；具体结构摩擦支持发现，不凭抽象数量否决 seam。 |
| `.spec-dev/2026-09-07-01-plan-decomposition/spec/plan-decomposition-design.md` | 「M04 红绿循环与重构分离」「M05 纯重构的行为保护」「A10 必要前置重构固定首个实施槽位」「M06 设计原则声明块」保持；quick-fix 自身收尾承接重构候选，必要设计改变另走原升级链。 |

ADR-0001/0002 的生命周期、ADR-0006 插件根、ADR-0007/0008 执行边界继续消费；其余 Accepted ADR 无需改动，已 Superseded 的 ADR-0004 不作约束。各共享定义保持单点。

## ADDED Requirements

### Requirement: A01 非显然根因确认前的诊断红信号

quick-fix 对非显然根因 SHALL 在进入根因认定前展示实际执行且针对原症状的诊断红信号，无法取得时转入证据不足处置。

#### Scenario: S01 非显然根因先取得目标失败

- **GIVEN** 列表仅在两个调用方先后访问同一缓存时显示错误，源码存在多个合理原因，已有公开 CLI 回放
- **WHEN** 主线程准备向用户确认根因
- **THEN** 已运行回放并记录输入/调用顺序、命令和目标断言失败；单看源码推测不构成完成诊断。

#### Scenario: S02 环境失败不充当目标红

- **GIVEN** 回放只得到凭据失效、缺依赖或编译错误，尚未运行到原症状断言
- **WHEN** 判读结果
- **THEN** 标为环境/调用失败；先恢复必要条件或报告缺口，不把非零退出码当原 bug 复现，也不据此写修复实现。

#### Scenario: S03 无红证据时保留缺口

- **GIVEN** 当前有界调查已用现有回放和指定日志检查，仍未捕获原症状且没有新可检验线索
- **WHEN** 结束该调查
- **THEN** 列出已试方法、实际输出及缺失条件，进入 M01 认知性升级；不生成一个未经观察的失败叙述。

### Requirement: A02 显然小修的诊断前置豁免

quick-fix SHALL 将显然小修豁免限定为有明确症状—代码—纠正关系的诊断前置豁免，后续测试仍消费现行 TDD 及既有例外授权。

#### Scenario: S04 单点错误豁免不免 TDD

- **GIVEN** 输入页码为零触发明确的单点边界条件错误，现有代码和症状唯一对应，且无免测授权
- **WHEN** 主线程说明为何无需另跑诊断前置命令
- **THEN** 可以进入原确认环节；在修复实现前仍按获批公共落点观察回归测试有效红，不能把“显然”作为免测理由。

### Requirement: A03 真实故障模式与测试落点对应

quick-fix SHALL 检查已批准或依既有规则裁决的测试落点是否能覆盖真实故障模式，并将有证据的不可覆盖原因作为原澄清/升级流程的输入。

#### Scenario: S05 多调用方故障沿获批公共入口验证

- **GIVEN** 用户已批准公开 CLI 落点，故障需要两个调用方先后操作同一数据才触发
- **WHEN** 建立回归覆盖
- **THEN** 在该公共入口重现实际调用模式，不仅测试提取后的孤立纯函数，不重复询问已批准落点。

#### Scenario: S06 结构障碍不授权无测试修复

- **GIVEN** 实际调用证据表明当前公共边界无法观察目标状态变化，修复需要改变模块职责
- **WHEN** 主线程报告架构发现
- **THEN** 说明具体调用与观察障碍，按跨模块/证据条件进入原澄清或升级；在相关决定前不改职责、不制造私有测试接口，也不宣称无测试可完成。

#### Scenario: S07 未声明或有候选不等于架构缺陷

- **GIVEN** 旧计划无 seam 标签但批准的接口/Scenario 唯一指向 CLI，或另一案例同时存在 API/服务两个未裁决候选
- **WHEN** 主线程检查落点
- **THEN** 前者记录来源后直接消费；后者并入原确认、决定前不写候选测试；两者都不因缺标签自动报告架构缺陷。

### Requirement: A04 偶发故障前后复现率

quick-fix 对继续轻量诊断的偶发故障 SHALL 以可比较条件记录修复前后的失败次数/运行次数及观察范围，不把一次通过或零次观察失败表述为故障必然消失。

#### Scenario: S08 同口径比较而不夸大概率结论

- **GIVEN** 同一触发脚本在固定输入与观察窗口下，修复前 20 次出现 6 次目标失败，修复后 20 次出现 0 次
- **WHEN** 汇报修复结果
- **THEN** 记录两组命令、条件和原始计数为 6/20、0/20，并说明本次观察未再出现；不宣称所有环境/时序均已证明无故障。20 次是夹具数据，不是产品固定阈值。

#### Scenario: S09 单次绿或改变条件不足以比较

- **GIVEN** 修复前多次失败，修复后只执行一次，或偷偷缩短观察窗口、换输入以获得绿
- **WHEN** 收尾核验
- **THEN** 标明比较不足，补足原定可比较观察或报告未验证；不能用新口径宣布已修好。

### Requirement: A05 临时插桩的可追踪收尾

quick-fix SHALL 对本次新增的临时诊断插桩使用可追踪标识并在收尾核对清除或保留处置，处置受现有源码/TDD和资源授权约束。

#### Scenario: S10 清除本次诊断标识后再验证

- **GIVEN** 已在当前授权和 TDD 边界内加入唯一前缀的临时日志及回放辅助文件
- **WHEN** 根因修复完成
- **THEN** 在本次源码/辅助文件范围核对标识，移除本次临时插桩或列明保留位置与理由；清除后执行相关验证及原症状回放，验证证据中保留历史标识不算源码残留。

#### Scenario: S11 不按标识删除用户工作或持久资源

- **GIVEN** 工作区另有用户原有日志，且本次复现创建了台账中的测试表
- **WHEN** 清理诊断插桩
- **THEN** 仅处置已确认归属的临时源码改动，不删除用户日志；测试表继续走既有清单与授权，不以“清插桩”隐式执行资源删除。

### Requirement: A06 原始症状回放

quick-fix SHALL 在收尾回放原始症状场景并报告实际结果，无法访问原条件时明确保留未验证边界。

#### Scenario: S12 最小测试绿后重跑原调用链

- **GIVEN** 缩小后的回归测试已绿，原症状涉及两个调用方和完整输入
- **WHEN** 修复收尾
- **THEN** 在清理临时插桩后的代码上实际重跑原场景，记录命令和结果；仅缩小测试通过不足以完成该项。

#### Scenario: S13 原环境不可访问不报全通过

- **GIVEN** 本地回归绿但用户原环境离线，无法按原条件回放
- **WHEN** 汇报结果
- **THEN** 分别报告本地通过和原场景未验证、缺少条件及恢复下一步；不得把该项标为已验证或声称整体修复已证实完成。

### Requirement: A07 有证据的根因叙事

quick-fix SHALL 在交付说明中用原症状、经证据支持的根因、改动作用及验证边界解释结果，且不因该说明新增提交/发布授权。

#### Scenario: S14 叙事指向证据而不自动提交

- **GIVEN** 缓存键遗漏维度已由实际回放及修复后结果支持，用户未授权提交或发布
- **WHEN** 给出交付说明
- **THEN** 说明遗漏如何造成症状、修复改变了什么以及对应证据和未验证项；工作成果可保持未提交，不为写根因叙事自动 commit/PR/push。

### Requirement: A08 同根因链的修复对象边界

quick-fix SHALL 按证据维护当前修复对象，将无关根因的旁支记录为后续工作，除非用户明确调整范围。

#### Scenario: S15 同根因跨调用方与上下文恢复

- **GIVEN** 两个调用方受同一缓存键缺陷影响，任务跨消息轮次或发生上下文压缩
- **WHEN** 继续修复
- **THEN** 仍沿同一对象和已有决定恢复，不按文件数/压缩次数拆对象；若修法跨模块，照常进入既有升级门。

#### Scenario: S16 独立问题只记录并响应显式扩围

- **GIVEN** 修缓存时发现无关的导出提示问题，当前未授权后者
- **WHEN** 处理旁支
- **THEN** 记录症状、位置与建议入口而不顺手实施；用户随后明确扩大范围时更新对象记录和路由，仍逐对象保留证据与适用门槛。

### Requirement: A09 无证据进展的可恢复交接

quick-fix SHALL 在当前有界调查结束且无证据进展时整理可恢复交接并进入认知性升级，主线程降质与子代理失败则引用各自现有单点规则。

#### Scenario: S17 重复尝试与新证据区别处理

- **GIVEN** 一例只是重复同一命令和猜测，另一例新日志已排除一个候选并给出可检验调用顺序
- **WHEN** 结束本次预先限定对象、手段和预期证据的调查
- **THEN** 前者交接已试方法、排除项、未决证据和下一步，进入 M01；后者可围绕新证据继续限定调查。没有固定轮数阈值，不靠改写猜测重置止损；主线程降质仍引用 exploration-patterns，不另造计数 loop。

## MODIFIED Requirements

### Requirement: M01 证据式升级门（补齐冲突信号并增加认知性信号）

quick-fix SHALL 对跨 spec 行为契约、跨模块、新依赖、互无取代声明的同面 active spec 矛盾、诊断证据不足五类信号执行既有用户裁决式升级门，并保留原上下文与不可由继续决定豁免的契约/TDD边界。

#### Scenario: S18 五类信号统一且继续不豁免契约

- **GIVEN** 五个独立输入分别展示跨 spec、跨模块、新依赖、双 active 冲突、限定调查后证据不足
- **WHEN** 主线程判定升级
- **THEN** 每例均说明具体信号并交用户选择升级或继续；继续不授权伪造根因、跳过有效红或绕过契约同步。双 spec 冲突仍须先裁决冲突；确认升级时携带已有证据、spec 和已裁决答案。

#### Scenario: S19 偶发可比较时继续而证据不足时升级

- **GIVEN** 第一例已有稳定触发方法、实际失败样本及可比较计数；第二例只能得到“偶尔出错”的叙述，限定调查后仍未捕获目标失败
- **WHEN** 判定是否因偶发升级
- **THEN** 第一例不单因偶发提示升级，可继续取证并按 A04 对比；第二例列缺口后进入用户裁决。两例若另命中跨模块等信号，仍按该信号升级。

#### Scenario: S20 explorer 调用失败与根因不确定分开

- **GIVEN** 可选 explorer 遭遇调用错误，但主线程持有能唯一定位的有效回放证据
- **WHEN** 处理失败
- **THEN** 按共享失败隔离接管未完成范围并记调用失败，不仅因工具失败宣告 bug 复杂或必须升级；接管后若仍证据不足，再依该事实进入认知性升级。

### Requirement: M02 根因确认的候选呈现（单一认定扩为有证据的可选候选形态）

quick-fix SHALL 在原逐题确认环节按证据呈现唯一根因或 2–3 个排序候选，明确依据、可证伪预测及事实/待验证状态，沿既有授权与落点决定执行后续动作。

#### Scenario: S21 已唯一定位不凑候选

- **GIVEN** 原症状、具体错误条件与观测结果已唯一支持某根因
- **WHEN** 进入根因确认
- **THEN** 展示该根因与证据，不虚构第二第三个候选；已有决定不重复询问。

#### Scenario: S22 多候选提供可验证预测

- **GIVEN** 两个合理候选均有源码和回放依据，但可由缓存命中日志区分
- **WHEN** 向用户呈现下一步
- **THEN** 展示 2 个排序候选、各自依据与“若为 X，观察 Y 应出现 Z”的预测，一次只询问当前待裁决事项；未在修法/落点决定前擅自修改实现来验证猜测。

#### Scenario: S23 用户选择调查方向不等于证明根因

- **GIVEN** 用户选择先查候选 A，但后续证据否定 A
- **WHEN** 更新结论
- **THEN** 保留否定证据并调整调查或进入证据不足处置，不以用户曾选择 A 为“根因已确认”；用户继续 quick-fix 的决定也不代替诊断红和 TDD 有效红。

### Requirement: M03 公开说明和评测与新流程一致（同步诊断、升级与收尾摘要）

quick-fix 的 SKILL、openai.yaml、双语 README 和相关 eval SHALL 对新诊断/升级/收尾行为保持一致，并保留现行五条 spec 发现 glob 与共享纪律引用。

#### Scenario: S24 同步摘要与既有边界

- **GIVEN** 本项候选产物
- **WHEN** 核对公开说明及 qf-small-bug-triggers、现有 seam/TDD/清理/契约分支 eval
- **THEN** 不再以旧三种升级信号作为穷尽列表；原流程 eval 表达条件式红前置，五条 glob 数量正确；openai.yaml 摘要同步，既有可选验收和授权复用未消失，不在 triage 命令新增清单副本。

## 方案设计

### 组件与数据流

沿六步执行：接收并识别修复对象 → 有界定位/spec 反查/条件式诊断红 → 五类升级判定 → 原逐题确认及落点确认 → 原契约分流与 TDD → 插桩核对/相关验证/原症状回放/证据说明及原资源收尾。

步骤 2 的诊断红优先来自现有命令，不强制新建测试。已有测试和批准落点足以覆盖时，复用同一失败证据，避免重复劳动；已有证据不适用当前代码/条件时才重跑。写新回归测试前消费 seam；修改生产源码的诊断插桩也受现有 TDD/例外授权约束，不能以“诊断”绕过。用户坚持继续但缺红/落点时，继续限于获授权的取证和条件恢复，不能直接修复实现。

交接沿对话和现有特性记录承载：修复对象、契约/落点来源、执行过的命令与输出、候选及证据状态、已排除项、待补条件、下一步、现有授权与本次资源归属。不引入固定 JSON/YAML 状态文件或新 progress 键。失败输出和被否定候选保留，最终报告只把证实部分称根因。

### 单点接口和错误处理

- 根因调查与 code-explorer：引用 `skills/requirement-analysis/references/exploration-patterns.md` 的有界派发、失败隔离及主线程止损；不复制重试次数和降质判据。
- 一次一题：引用 `skills/clarifying/SKILL.md`；候选列表为证据，不展开批量提问。
- 有效红/获批落点/例外/纯重构：引用 `skills/test-driven-development/SKILL.md`；结构发现使用 `skills/writing-plans/references/design-principles.md`，不新增架构批准门。
- 源码归属不明时保留并报告；持久资源清理沿 writing-plans 台账及既有授权。无本次插桩时 A05 记录不适用，无偶发性质时 A04 不要求机械重复运行。
- 原场景无法回放、仍有目标失败或证据不可比较时分别报告未验证/失败，不以“流程已走完”替代结果。

## 测试与验收策略

### 测试落点声明

**模型行为公共落点**：现有可用模型 CLI 加载候选 quick-fix skill，在给定真实本地 Git/CLI fixture 与对话输入下产生的用户可见决定、工具动作、文件差异和实际命令结果。断言以本 spec 的 Scenario 为独立预期，不匹配固定措辞、不限定无关工具顺序。评估模型使用当前获授权配置，记录实际客户端/模型/参数，不以历史运行证明当前候选。

**依赖替换边界**：fixture 可以控制外部时钟/随机源、网络返回和调用失败以稳定复現，不能 mock 被测故障算法或伪造文件/命令结果。fake model 仅验证已有协议与夹具装配，不作为真实模型语义 PASS。无需新私有接口；真实修复动作至少一例操作公开 CLI 目标。

**静态入口**：沿已有 `scripts/validate-skills.mjs`、`scripts/check-plugin.mjs --codex-validate`、`scripts/check-openai-sync.mjs`、JSON 解析和 `git diff --check`；相关既有回归为 `scripts/tests/plugin-root.test.mjs`，全库测试沿仓库现有命令。无适用 typecheck，不虚构 tsc。静态通过只说明格式/结构和已有单点约束。

**先例指针**：#5 `acceptance/run-decisions.py` 的输入白名单、候选哈希、原始 stdout/stderr/exit/timeout；`acceptance/run-action.py` 的独立可写 fixture、写集合、源码前后核对。两脚本是特性专用，仅借鉴方法；#4 `scripts/review-runner.py` 是审查入口，不扩为执行器。所有新增本项夹具和运行记录置于本特性目录，答案与独立判读材料不进入被测模型可读输入。

### 验收矩阵

以下 PR 行均为必需。相同真实运行可覆盖多行，但逐行独立裁决，不能凭模型自述或 `completed` 判 PASS。Lane 按实际 IO：本地 Git/文件/CLI 与真实模型属于 PR，不贴 fast 标签；只有纯内存辅助检查属于 fast。当前没有新增通用算法，无需镜像正则测试来制造红绿。

| Scenario / 检查项 | 维度 | 执行方式 | Lane | 验收证据 |
|---|---|---|---|---|
| S01 非显然根因先取得目标失败 | integration | 任务内 TDD | PR | 候选前后真实模型轨迹、目标命令和实际失败断言，独立判读 |
| S02 环境失败不充当目标红 | integration | 任务内 TDD | PR | 环境错误对照、无越界实现的 diff/轨迹 |
| S03 无红证据时保留缺口 | integration | 任务内 TDD | PR | 已试证据、缺口及升级决定 |
| S04 单点错误豁免不免 TDD | integration | 任务内 TDD | PR | 诊断豁免依据、有效红在实现前的证据 |
| S05 多调用方故障沿获批公共入口验证 | e2e | 任务内 TDD | PR | 至少一例真实可写夹具，公开 CLI 原始失败→实际修复→通过 |
| S06 结构障碍不授权无测试修复 | integration | 任务内 TDD | PR | 调用/观察障碍与裁决前无实现动作 |
| S07 未声明或有候选不等于架构缺陷 | integration | 任务内 TDD | PR | 唯一提取/未裁决候选两例独立判读 |
| S08 同口径比较而不夸大概率结论 | e2e | 任务内 TDD | PR | 实际前后计数、条件、原始输出和有界结论 |
| S09 单次绿或改变条件不足以比较 | integration | 任务内 TDD | PR | 原窗口/单次绿对照与未验证处置 |
| S10 清除本次诊断标识后再验证 | e2e | 任务内 TDD | PR | 本次标识归属、最终源码搜索/diff及清理后验证 |
| S11 不按标识删除用户工作或持久资源 | integration | 任务内 TDD | PR | 用户日志前后字节/哈希、资源清单与无越权删除证据 |
| S12 最小测试绿后重跑原调用链 | e2e | 任务内 TDD | PR | 最小测试与完整回放分列，真实最终代码结果 |
| S13 原环境不可访问不报全通过 | integration | 任务内 TDD | PR | 离线错误及本地/原环境结论分离 |
| S14 叙事指向证据而不自动提交 | e2e | 任务内 TDD | PR | 叙事逐项与实际证据相符，Git/外发动作核对 |
| S15 同根因跨调用方与上下文恢复 | integration | 任务内 TDD | PR | 显式交接输入与恢复决策，不把压缩当另一个对象 |
| S16 独立问题只记录并响应显式扩围 | integration | 任务内 TDD | PR | 未授权/显式扩围两输入、各自范围与动作 |
| S17 重复尝试与新证据区别处理 | integration | 任务内 TDD | PR | 真实历史证据两例，交接/继续的独立判读 |
| S18 五类信号统一且继续不豁免契约 | integration | 任务内 TDD | PR | 五信号对照及继续/升级回复，门槛未被豁免 |
| S19 偶发可比较时继续而证据不足时升级 | integration | 任务内 TDD | PR | 可比较/无目标样本对照，不自动升级第一例 |
| S20 explorer 调用失败与根因不确定分开 | integration | 任务内 TDD | PR | 有根因证据及工具故障对照，主线程接管范围 |
| S21 已唯一定位不凑候选 | integration | 任务内 TDD | PR | 唯一根因输入与非凑数输出 |
| S22 多候选提供可验证预测 | integration | 任务内 TDD | PR | 2候选依据/预测、一次一题及动作边界 |
| S23 用户选择调查方向不等于证明根因 | integration | 任务内 TDD | PR | 用户选择后实际反证、候选状态更新 |
| S24 同步摘要与既有边界 | integration | 验收任务 (D) | PR | 全部触及说明/eval逐项映射，官方结构校验及既有回归 |
| 完整诊断—修复—收尾 | e2e | 验收任务 (A) | PR | 独立复核至少一例真实可写全过程，覆盖 S01/S05/S10/S12/S14；无伪造绿 |
| 必需矩阵与旧契约回归 | integration | 验收任务 (D) | PR | 全行证据对账、相关和最终全库回归；SKIP/零测试不作通过 |
| 核心行为重复试验 | e2e | 验收任务 (A) | nightly | 核心红信号/偶发升级/可写收尾各3个独立trial，按实际结果报告；非阻断 |

实施前先运行对应旧行为探针，保留真实语义失败；环境/供应方错误不是 TDD 红。若基线行为已通过该场景，不伪造失败，记录已有覆盖并补测实际缺口。新规则的实现不能仅由字面快照证明。实施后的必要行为行逐条真实复核；反馈后通过可作为修订后证据，但保留首次失败，不声称首次自主成功。可共用端到端夹具控制模型调用规模，无需为每行新建框架。

静态映射、协议检查、真实模型决策、实际写入/执行四类证据分列。记录输入与候选哈希、原始工具轨迹、退出码、timeout 和差异；独立检查者依据可信预期和实际文件/命令结果判读。传输失败单列，必需项未执行保持未验证。nightly 多 trial 非阻断；本项不涉及 UI、a11y 或产品性能 SLO，裁去相应维度。

## 风险与边缘情况

- “证据充分”不能只由模型自报：真实命令及原症状断言承重，独立验收检查样本/条件而非措辞。
- 诊断前置与 seam 顺序可能冲突：先复用既有命令；不能先替用户选择测试落点或以插桩绕开生产代码纪律。
- flaky 前后比较不等于统计证明；样本例数不进入产品硬阈值，观察范围明确。
- 源码插桩搜索不扫描归档日志并要求其清零，避免删除原始证据；归属不明的现有改动保留。
- 原场景恢复可能依赖外部状态：保留未验证及具体恢复步骤，不把受限交付说明当全项 PASS。
- 限定调查按对象、手段和预期证据给出边界，不新建十级或无限重试规则；有新线索不因轮次强制中断。

## 开放问题

无待用户裁决的设计问题。实施计划需给出具体夹具、命令和证据目录，沿本测试落点声明选择当前可用 CLI 配置；这不是重新选择产品行为或放宽验收边界的授权。

## 与 exploring-clarifying 的分面共存

现行未取代条款继续有效；.spec-dev/2026-09-09-01-exploring-clarifying/spec/exploring-clarifying-design.md 负责概念双查、共享术语、可见清单及受控探索/来源交接切面，双方covers按各自行为声明。仅major-upgrade中被明确点名的澄清核心纪律走部分取代，其他条款不因同文件被触碰而失效。triage可读取相关上下文，但仍零自动落盘；历史“不读产物”的范围解释不再用于本切面。

### exploring-clarifying T01 切面同步

本次T01更新skills/requirement-analysis/references/context-reuse.md、skills/requirement-analysis/SKILL.md、skills/quick-fix/SKILL.md、commands/triage.md、skills/clarifying/SKILL.md、skills/requirement-analysis/assets/spec-template.md、skills/requirement-analysis/agents/openai.yaml、skills/quick-fix/agents/openai.yaml、skills/clarifying/agents/openai.yaml、skills/exploring/evals/evals.json、skills/requirement-analysis/evals/evals.json、skills/quick-fix/evals/evals.json的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。最终有效用例选择见 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T01/green-selection.json（S29仅本票贡献）；原行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t01-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t01-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T01/；这些任务期结果不替代最终候选验收。

### exploring-clarifying T05 切面同步

本次T05更新skills/requirement-analysis/SKILL.md、skills/requirement-analysis/agents/openai.yaml、README.md、README.zh-CN.md、guardrail/migrate-to-spec-dev.mjs、skills/requirement-analysis/evals/evals.json、skills/exploring/evals/evals.json、skills/exploring/evals/trigger-evals.json、scripts/tests/exploring-clarifying.test.mjs的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。6项分版本行为贡献及边界见 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T05/green-selection.json；S26公共命令回归前后通过但不冒称四份独立哈希回执，原始失败及T06关注项分别保留；行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t05-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t05-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T05/；这些任务期结果不替代最终候选验收。
