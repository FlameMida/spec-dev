---
spec_dev_roadmap:
  version: 1
  project: skill-ecosystem-absorption
  status: active
---

# Skill 生态对比吸收 Roadmap

## 目标

把《Skill 生态对比：Matt Pocock skills × spec-dev》报告（`.spec-dev/reports/2026-08-28-01-skill-ecosystem-comparison.md`）经第四轮正确性核验（报告 §8.5）后仍成立的 44 条吸收建议落入 spec-dev 各 skill，并以 implement-spec（beta）范式为蓝本，为 executing-plans 增加一个 opt-in 的并发执行模式（独立正式 skill，由 executing-plans 分支调用）。44 条横跨 13 个 skill、9 个主题，一半可独立交付，任何单份 spec 都装不下，故拆分。

## 分解边界

按"文件触碰局部性 + 交付独立性"拆：每个子项目主要落在一组相邻文件（同一 skill 及其 references/evals/openai.yaml），彼此只通过既有的"单点定义 + 引用"关系耦合。#1 修复真实 bug 并收敛共享定义点，是后续子项目改动共享件时的基线；#2 是用户点名的主题、设计最重，依赖 #1 修好的校验器路径写法与依赖范围解析；#3-#7 是报告 P0/P1 的纪律类改进，互相独立，按报告 §5.5 主题优先级排序；#8 收纳 P2 六条留观项，待前序交付后再评估。

## 子项目

| # | 子项目 | 范围（一句话） | 依赖 | 状态 | 特性目录 |
|---|--------|--------------|------|------|---------|
| 1 | portability-hygiene | 修 writing-plans:118 裸路径 bug，插件根解析序列单点定义、9 处调用统一写法；失败隔离与 TDD 例外清单等复述收敛为单点引用；README 补 hard/soft 依赖分级表、成熟度分区与纯壳委托约定并修正核验发现的文档漂移；Codex 适配映射表去重；visual 会话目录隔离结构化；导航表依赖范围写法定义并由校验器展开（AB-38/36/37/39/40/42） | — | delivered | .spec-dev/2026-09-03-02-portability-hygiene/ |
| 2 | concurrent-execution | 新建正式 skill `executing-plans-parallel`（进插件清单），executing-plans 在执行确认门满足条件时提议并分支调用：主线程编排与合并、implementer 子代理各占 worktree、每票 TDD 五步 + 契约自检、主线程唯一写 progress.yaml；含 PR 制交付通道、执行期探索分工与指针派发、认领键（AB-44/10/11/33） | #1 | delivered | .spec-dev/2026-09-06-01-concurrent-execution/ |
| 3 | tdd-seam | seam 声明上游权威 + TDD 门兜底；测试反模式 6/7（同义反复、实现耦合）；mock 分层；重构移出红绿循环；typecheck 最便宜验证档（AB-01/02/03/04/05） | — | delivered | .spec-dev/2026-09-06-02-tdd-seam/ |
| 4 | review-conformance | 收尾审查增加 Spec 符合性维度 S 三向核对；设计判据包单点定义；可选架构深化维度；审查微纪律；子代理派发词纪律（AB-12/09/14/13/32） | — | delivered | .spec-dev/2026-09-06-03-review-conformance/ |
| 5 | plan-decomposition | expand–contract 宽面重构排序及多票集成组；Self-Review 第 5 查与产物 review 门三问；prefactor 最前槽位；正交约束预分配与「拒绝的解读」节；计划头部关联 skill 声明与胶囊 gist；需求完备性两则（测试先例模态、actor 枚举）（AB-06/07/08/30/35/29） | — | delivered | .spec-dev/2026-09-07-01-plan-decomposition/ |
| 6 | quick-fix-diagnosis | 红信号门槛、认知性升级信号、排序候选根因；correct seam 判定；修复收尾四则；会话级止损（AB-16/17/18/19） | — | delivered | .spec-dev/2026-09-08-01-quick-fix-diagnosis/ |
| 7 | exploring-clarifying | 结晶判据与冲动路由；spike 受控例外；探索笔记已排除节；explorer 一手来源追溯与后台调研通道；frontier 决策清单可见；HITL 不得自代红线；否决记忆与路由前置双查；仓库级 glossary（AB-20/21/22/26/23/25/31/27） | — | in-progress | .spec-dev/2026-09-09-01-exploring-clarifying/ |
| 8 | p2-watchlist | 报告 P2 六条留观：acceptance-qa HTML 汇总报告、同层小批提问阀门、status 状态面板、ADR 资格类型清单、guardrail 破坏性命令拦截层、description 触发词瘦身（AB-15/24/34/28/41/43）——前序全部交付后逐条评估启动或 dropped | #1-#7 | pending | — |

## 原始需求

> @/Users/maverick/feature-dev/.spec-dev/reports/2026-08-28-01-skill-ecosystem-comparison.md
> 先审查正确性，然后执行改进并引入implement-spec(beta)作为执行可选的并发执行模式

分解期补充裁决（2026-09-03，用户原话）：并发模式形态选"集成进 executing-plans 作为 opt-in 模式"并要求"可以的话做成单独的分支skill"——确认为独立正式 skill 进插件、由 executing-plans 分支调用；子项目顺序按本表；本次会话先为 #1 走完 spec。

## 上下文胶囊（每子项目一小节，续接的唯一交接面）

### #1 portability-hygiene

- **关键裁决**：AB-38 采用"单点定义解析序列 + 统一 9 处写法"，不随守卫安装器分发校验器副本；文档提交带 `SKIP_RELEASE_HOOK=1`，实施阶段代码提交走自动发版；核验发现的 README 漂移（trigger-evals "四个"实为 6、目录结构只列 9/13 skill、scripts 缺 doctor/update-vendored、Self-Review "四查"列三、"3 output contract schemas"）与 quick-fix:66 TDD 例外清单复述并入本子项目；导航表依赖范围写法 `T01-T06` 由校验器展开而非禁止（保存量 index.md 有效）；AB-40 按修正事实改为结构化隔离（脚本自建 .gitignore），不搬临时目录。
- **探索指针**：报告 §5.2 AB-38/36/37/39/40、§5.3 AB-42；报告 §8.5 A2/A3/B 项修正；本文备注「核验事实速查」；spec `.spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md`；ADR-0006（载入即声明 + 单点解析序列）。
- **设计期新发现**：官方文档证实 `${CLAUDE_PLUGIN_ROOT}` 只在 skill/agent 正文替换、不导出到模型 Bash、references 不替换——统一写法之上必须加"载入即声明"机制（详见 spec 决策节）。
- **已扫范围**：全仓 grep 空白核实（skills/ agents/ commands/ guardrail/ scripts/ README 双语）；7 份 active spec covers 反向索引；pre-commit/post-commit/pre-push 与 check-openai-sync 约束；11 个测试文件的断言正则；CLAUDE_PLUGIN_ROOT 全部 12 处引用与三种写法；validate-output 全部调用点；install.mjs 拷贝清单；start-server.sh 三分支；codex-compat.md 与 7 处专节 + 8 处单句适配分布；release.mjs --auto 规则；各纪律"单点定义 vs 复述"位置表。
- **留给后继的注意事项**：2026-09-06 已交付并合入 main（本地 v8.2.0）。插件根解析与契约校验 canonical 在 exploration-patterns；四份 skill 声明与命令双引号已统一；plan-index 已展开 TNN-TMM 闭区间；visual 两根自建 .gitignore。后继 #2 应复用这些接口、保留主线中文描述/语言协议，并对 active spec 做分面共存声明。验收 76/76、真实集成与 Claude 客户端加载通过；远端模型 429、发布后缓存重装未验证，3 条既有 eval 文案陈旧见 portability-hygiene/acceptance/acceptance-report.md。

### #2 concurrent-execution

- **2026-09-06 实施计划已保存**：入口 `.spec-dev/2026-09-06-01-concurrent-execution/plan/index.md`；T00—T08 共 9 任务，覆盖 S01—S30；顺序为隔离、声明/路径校验、结果/schema/Git 核验、计划字段、implementer/交付协议、并发 skill 登记、串行/平台接入、验收、合并清理。使用现有串行 executing-plans 开发新 skill，不以未验收产物调度自身。计划四查、plan-index 和内嵌源码语法校验已完成；T00—T08 已完成并本地交付；必需验收通过，真实模型行为仍未验证。
- **2026-09-06 设计批准**：用户批准独立正式 skill、index 可选写集合、progress 唯一写者、集成验证后 completed、资源先登记后创建、特性级本地/PR 双出口及完整收尾。spec：`.spec-dev/2026-09-06-01-concurrent-execution/spec/concurrent-execution-design.md`（active；14 条 Requirement / 30 个 Scenario，增量独立复审 Approved、用户已确认，writing-plans 已完成）；ADR-0007。此前切换与恢复增量独立复审已修正跨 worktree 统一锁身份、测试例外串行分流、编排 owner 接管与存活 implementer 恢复的区别，保留原 claim；自检修正入口拓扑与实际 ready 分离。本地实施与交付已完成；PR ready 本身仍不构成交付。
- **模型声明补充要求**：用户明确要求把声明写入并发执行 skill，而非仅本会话报告，并指定沿用对话中的终端三列表格「角色｜模型｜思考强度」，主线程带 👤、实现子代理带 🤖，来源和待启动状态在表格下简述。启动/切入/恢复编排前声明；多配置分组、未知不猜、配置变化重声明，沿 notes 与 claim 关联留痕；不固定为本轮开发使用的模型，不改变模型选择权限。S28—S30 承载验收。
- **任务边界切换补充批准**：用户同意串行任务完成并保存后再转并发，并强调中断恢复；复用现有隔离 worktree，保留已完成任务、原始审查基线与交付通道；先保存切换请求，模式检查点提交后才派发。条件不足继续串行，缺声明不自动补写；S23—S27 覆盖切换成功、资格不足、模式提交窗口、请求早于当前任务完成及派发回执丢失。恢复先核实原 owner/执行者/提交，不凭空重派或重置进度。并发模式内按 ready 数量调度一票或多票，不反复切换模式。此为 ADR-0007 下的交接协议细化，不推翻或修改 Accepted ADR。
- **续接补查**：新 skill 仅需补 Claude 显式 skills[]；其他平台按目录发现，check-plugin 无需改。新增 implementer 沿现有 agent 形制，Bash 白名单不等于只读沙箱。plan-single-format 的三条计划/恢复/资源 Requirement 和 portability-hygiene 的「README 漂移修正」须部分取代；不能将新增状态键误称纯分面共存。其余既有接口按当前 spec 继承。
- **关键裁决**：默认范式（主线程串行、子代理不写码）不变，并发为 opt-in——与报告 rejected #9 及 CHANGELOG v5.6.0"不新增 implementer 子代理、per-task 门留作 opt-in"裁决一致，例外已由 ADR-0007 记录；形态为独立正式 skill `executing-plans-parallel`（登记 .claude-plugin/marketplace.json skills[]、带 agents/openai.yaml 与 evals），executing-plans 在执行确认门加"满足条件时提议、同意则调用"，PR 出口单点定义供两模式引用；触发 = 用户显式选择 且 导航表 ≥2 条独立链 且 写集合不相交；merger 由主线程兼任、冲突上抛用户；每票强制 TDD 五步 + 契约锚定自检；已授权例外/空基线票归主线程串行；收尾仍走多维审查全套。
- **探索指针**：报告 §3.1、AB-44/10/11/33；本文备注「并发模式设计事实」；`.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md:171`（并行会话合并冲突对策）；外部 `/Users/maverick/skills/skills/in-progress/implement-spec/SKILL.md`（35 行，上游 2026-08-21 后无变更）。
- **已扫范围**：executing-plans/writing-plans/review-orchestration/using-git-worktrees 全文与"主线程/不写码"全部陈述位置（SKILL.md、README 双语、openai.yaml、.codex-plugin、guardrail snippet）；progress.yaml 契约与真实实例；evals 中断言串行的用例（ep-continuous-execution、ep-execution-confirm-gate、ep-contract-deviation-stops、wp-final-task-closure 等）；上游 implement-spec 的 9 个社区 issue；Claude Code 官方 sub-agents/worktrees 文档；Codex spawn_agent 官方文档与源码。续接时阶段 2 只需补：新 skill 目录/清单登记流程（check-plugin 双向校验）、implementer 类 agent 定义形制。
- **留给后继的注意事项**：2026-09-06 已交付到本地 main，sync_commit=d9428058cfd485c09b72700fb321ffac5871b67d。入口 skills/executing-plans-parallel/SKILL.md，声明/progress 唯一定义在 writing-plans，交付通道在 delivery-channels。全量91/91、0 skip，48条静态eval、10组真实Git/进程受控演练及独立复核通过；真实模型nightly与真实托管PR未验证。进度仅主线程持锁写入；blocked/失联不得按超时重派，接管前核验原写者停止。默认串行、原始base与validated基线分离、声明三列表和恢复追溯均保留。后继从 #3 tdd-seam 的胶囊继续需求设计，不改已接受 ADR-0007；本次未 push。

### #3 tdd-seam

- **2026-09-06 实施计划已保存**：入口 `.spec-dev/2026-09-06-02-tdd-seam/plan/index.md`；T00—T06 共 7 任务（隔离、TDD 核心、mock/快检、上游声明、执行接入、验收、本地交付），覆盖全部 13 Requirement / 24 Scenario。四查、plan-index、54 个替换锚点顺序模拟及 12 个 Python 块语法检查通过；T00—T06 已完成并本地交付。默认串行，无并发声明；模型路径使用现有 Claude CLI，PR 五例真实冒烟含 S07 可写夹具，真实模型五例及 S07 可写动作已通过，nightly 多轮仍未验证。spec 激活提交 `ad3140d`，旧例外条款已完成 Requirement 级取代。
- **2026-09-06 设计批准并落盘**：用户先后批准推荐方案与完整设计；spec `.spec-dev/2026-09-06-02-tdd-seam/spec/tdd-seam-design.md`（active，13 条 Requirement / 24 个 Scenario；独立审查 Approved，用户已 review 并同意编写计划；已完成实施与本地交付）。初次提交 `8e56756`，审查记录同目录 `design-review.md`。沿现有 spec 测试策略、四列导航与任务接口块传递 seam；已批准声明直接消费，存量仅唯一提取，缺失/冲突交主线程、implementer blocked。
- **本轮补充裁决**：纯重构交收尾，已有保护测试前后保绿，缺保护先做行为刻画，不伪造红；并发五步的末步原本是提交，ADR-0007 与结果 schema 不变。typecheck 仅使用已有适用命令且不替代必需测试。纯文案例外迁入 TDD canonical、授权可追溯复用，部分取代 #1「quick-fix TDD 例外清单引用」；技能行为改动不属于纯措辞。
- **增量补查与验证边界**：#1 后 code-reviewer 已在 portability-hygiene covers，TDD 目录仍待新 spec 接管；#2 的 plan/implementer 条款为现行权威。执行入口缺失/冲突路径、五步与 schema、绿后重构副本、plugin-root 的自有例外断言均已查证。验收区分静态 eval、自动回归、PR 必需真实模型五场景冒烟及 nightly 非阻塞多轮 eval；未运行/缺环境不报 PASS。
- **关键裁决**：seam 两案合一——spec/plan 已声明则以声明为准、仅即兴场景由 TDD 门发问（报告 §5.4 #1）；实现耦合测试裁决方向"挪测试位置而非改实现"（§5.4 #6）；mock 纪律 testing-anti-patterns（准入）与 test-strategy（策略）分层不合并（§5.4 #12）。
- **探索指针**：报告 AB-01/02/03/04/05 与 §8.5 B 项修正（AB-05 executing-plans 落点 :68；AB-04 另牵 8 处"红-绿-重构"同义文本含 description/openai.yaml；code-reviewer.md:78 与 TDD:157 同为全覆盖措辞）。
- **已扫范围**：早期探索记录已由本项更新：TDD/反模式、test-strategy、设计与计划接口、串并行/reviewer/元数据均已覆盖；本 spec covers 覆盖27个产品文件，旧 active 分面按批准设计共存。
- **留给后继的注意事项**：2026-09-06 已本地交付到 main，sync_commit=7833c8b39c5925a0aa256b0e6d2b3cb1594410a4。公共测试落点沿 spec→四列导航/本票→串并行消费；TDD 是例外与纯重构单点，anti-patterns 管 mock 准入，test-strategy 管策略及票内/收尾时序。五步、结果 schema、ADR-0007 不变；#1 纯文案条款已部分取代。最终全量91/91、0 skip，24静态Scenario和5例真实模型（实际 glm-5.3-flash，含S07可写动作）通过；两个中等审查/模型发现已修复复审，nightly多轮未运行。#4 复用现有公共行为覆盖与重构候选收尾，Spec符合性新维度需划清与completeness职责；不能重引逐函数测试或把最终全量提前为每票解锁门。未 push。

### #4 review-conformance

- **2026-09-07 已本地交付**：T00–T06 completed；sync_commit=`941ec2439335a6003c195c16158505503c712fd1`，验收见 `.spec-dev/2026-09-06-03-review-conformance/acceptance/acceptance-report.md`。原12Requirement及受控修正R01–R06均DELIVERED；以下设计/计划条目保留为当时记录。

- **2026-09-06 实施计划已保存**：入口 `.spec-dev/2026-09-06-03-review-conformance/plan/index.md`；T00—T06 共 7 任务，覆盖 12 Requirement / 28 Scenario，顺序为隔离、共享判据、reviewer/schema、通用派发、收尾编排、验收、本地交付。用户已 review spec 并同意写计划，激活提交 `43122c0`。默认串行、无并发声明；plan-index、四查、21 个替换锚点顺序模拟、16 个 Python 块和内嵌 JS 语法检查通过，20 个产品路径在 covers 内。PR 五组落实为 20 个具体夹具及报告/独立判读；尚未创建实施 worktree、未执行候选或模型验收。
- **2026-09-06 设计已批准并落盘**：用户批准方案、完整设计及审查后的 spec，并同意编写计划；spec `.spec-dev/2026-09-06-03-review-conformance/spec/review-conformance-design.md`（active，12 条 Requirement / 28 个 Scenario，独立审查 Approved，实施计划已保存，尚未实施）。初始提交 `d6dd856`，审查记录同目录 `design-review.md`。S 查少做/多做/做错，critic 保留现行 Scenario、文件与证据覆盖核对；零发现不等于未审查。小变更一路 A+S，常规四路，大变更五路（B 拆质量/简洁性），D 按明确要求或具体结构摩擦证据追加；容量不足分批、不丢维度。category 新增 `Spec符合性`，引用与覆盖继续用现有 description/coverage_note，通用 validator 算法不变。
- **本轮补查与验证边界**：核心文件命中六份 active spec，上游 SKILL 引用另与 resource-ledger/test-scoping 相交，全部按现行条款分面共存；不改 Accepted ADR。模块删除判据是假想复杂性去向，adapter 计数不推翻获批 seam；AB-13 只新增输入预检与措辞负面清单。机器 seam 为现有 validate-output CLI，模型行为为真实 Git/契约夹具下的派发与报告；PR 五组核心冒烟与 nightly 完整多轮分开，当前均未执行。并发入口已复用全局编排，只补继承 eval；此前已扫范围不重做生态调研。
- **关键裁决**：判据单点落 design-principles.md、审查维度只引用不复制（§5.4 #7）；维度 S 的 (a)"要求但缺失"与 completeness critic 职责重叠，设计时需划清或合并。
- **探索指针**：报告 AB-12/09/14/13/32 与 §8.5 B 项修正（scripts/schemas/review-findings.json:15 category 闭合枚举必改；ep-review-orchestration eval 写死"3 路 A/B/C"；AB-13 六项中仅"扇出前置校验、措辞负面清单"确缺；AB-32 三要素中"验收判据"空白、"排除项/对照例"散见 code-reviewer.md:193-198、exploration-patterns.md:87、spec-reviewer-prompt.md:28-34）。
- **已扫范围**：review-orchestration.md 全文、code-reviewer.md 契约段、validate-output 调用、exploration-patterns 派发要求 :81-87。
- **留给后继的注意事项**：S三向符合性、critic覆盖与共享design-principles保持单点；小A+S、常规四路、大五路，D需真实结构依据。新增受控Claude入口冻结证据/actor/依赖，默认每段1800秒、最多3段、费用不限且继承本机设置；其他客户端不宣称同等机器保证。最终128项全库通过；两复杂真实run第二段收口及A/B/S同Scenario正向合并通过，原始附属误报已独立否决/收窄，语义准确性partial、四项nightly未运行，未push。#5修改计划分解时复用既有共享判据与派发完成条件，不重造S/critic规则，不提前执行未批准的设计。

### #5 plan-decomposition

- **历史设计与早期实施检查点（2026-09-07，已由下述交付结果取代）**：用户选择「方案2」——保留独立小票、集成组统一验证；随后以 `ok` 批准完整设计。spec `.spec-dev/2026-09-07-01-plan-decomposition/spec/plan-decomposition-design.md`（active，23 条 Requirement / 33 个 Scenario，独立审查 Approved；审查基线 `9a8bd71`，记录同目录 `design-review.md`），ADR-0008。用户已 review 并同意编写实施计划，现已激活并向三份旧 spec 写取代预告；实施计划 `.spec-dev/2026-09-07-01-plan-decomposition/plan/index.md` 已保存（10票，T00—T09；声明/状态/真实证据→串并行协议→分解与需求→全矩阵验收→本地交付），用户已于2026-09-07确认执行；隔离分支plan/2026-09-07-01-plan-decomposition完成T00—T03（最新53/53机器回归），T04六例默认glm-5.3-flash模型探针均provider429，保留blocked检查点且未写T04规则实现。T05—T09待续，未验收/合并/推送；真实状态在该worktree的plan/progress.yaml。
- **本轮补充裁决**：不可逐批绿时引入 awaiting_verification，只有同组依赖可消费，组外经唯一验证票等待；组员/验证票由主线程独占现有隔离集成工作区，进入前收拢在途普通任务，整组通过后同次原子完成并推进已验证基线。保留原始审查基线、每票实现提交和失败证据；状态/代码分开提交，中断核对事实、不重复施工。无组旧计划原样读取；组数据升级及校验 CLI 必须明确支持协议。review 三问以 2–3 个检查点加一次整体确认呈现。
- **本轮补查结果**：#2 的计划形态/恢复/完成条款、#3 的红绿时序/纯重构保护、major-upgrade 的设计原则/胶囊需部分取代；普通 implementer 五步、结果 schema、ADR-0005/0007 与 S/critic 保持。新组协议的复杂度由用户明确选择承担，不采用最初推荐的单张原子大票。
- **新增探索指针**：spec 解释完整状态与恢复设计；`skills/executing-plans/SKILL.md:56` 是原 completed 判据、`:61` 是原 ready 判据；`skills/test-driven-development/SKILL.md:135` 是纯重构保护原定义；`scripts/validate-output.mjs:175` 起的 plan-index 是现有公共结构校验入口。前置 #4 的验收报告仅说明已交付边界，不构成本项模型证据。
- **关键裁决**：expand–contract 取第一轮完整版含两级降级（§5.4 #4）；prefactor"识别 + 固化为最前槽位"一步（§5.4 #8，实际槽位为 T01，T00 固定为隔离工作区）；产物 review 门"呈现产物 + 2-3 个目标化检查问题"通用形态、RA 阶段 7 与 writing-plans 交接各自落地（§5.4 #5）；AB-29 测试先例模态 deep 档已有（exploration-patterns:37），只需向 standard 档开放，actor 枚举落 spec-template。
- **探索指针**：报告 AB-06/07/08/30/35/29 与 §8.5 修正（Self-Review 现为四查，"第 5 查"编号吻合；README 双语 :171 "四查"只列三项由 #1 修；design-principles:7 第 1 条与 expand 阶段新旧并存存在张力需补注解；胶囊指针现为纯路径无 gist；关联 skill 声明在头部 :86/:98/:122 已有部分）。
- **已扫范围**：writing-plans 全文结构（任务粒度 :52-66、头部 :79-116、Self-Review :316-325）、design-principles.md 全文、roadmap-template、RA 阶段 2 探索模态定义。
- **留给后继的注意事项**：2026-09-08完成T00—T09并合入本地main，实际merge bc99e272165167159e7e3409e47fa90ee0d32022。入口：.spec-dev/2026-09-07-01-plan-decomposition/ 下 spec/plan-decomposition-design.md、plan/index.md、acceptance/acceptance-report.md。23Req/33Scenario必需验收及最终179/179通过，七条部分取代生效；复用v2组状态、单点恢复与第五查，不把awaiting_verification当completed。模型完整稿为反馈修订后独立验收，真实执行链产品通过但resume辅助RTK格式FAIL保留；nightly三trial未运行，未push/发布。#6沿现有quick-fix契约扩充lite诊断，不重建十级loop；保持Spec/TDD和真实证据边界。

### #6 quick-fix-diagnosis

- **历史设计与计划检查点（以下交付结论为准）**：用户选择“证据不足才升级”（偶发可比较则继续），选择方案 1（内嵌 quick-fix 六步），随后以 `ok` 批准完整设计。spec `.spec-dev/2026-09-08-01-quick-fix-diagnosis/spec/quick-fix-diagnosis-design.md`（active，12 条 Requirement / 24 个 Scenario，独立审查 Approved，无阻断问题；审查基线 `bc4e047`，记录同目录 `design-review.md`）；用户已以 `ok` 完成 spec review 并同意编写实施计划，守卫已激活（`ac54b75`）。
- **历史实施计划（已执行完成）**：`.spec-dev/2026-09-08-01-quick-fix-diagnosis/plan/index.md`；T00—T06七票，普通串行/v1，无并发或集成组。顺序为隔离基线→诊断/升级/候选→seam与对象边界→收尾四项→公开说明同步→全矩阵验收→本地交付。覆盖全部12Req/24Scenario；具体公开CLI夹具、真实模型决策/动作、独立判读、来源/资源恢复命令已内嵌。用户随后明确“开始吧”；全部任务已执行完成，以下交付结论为准。
- **本轮边界与补查**：显然小修仅免诊断前置，不免 TDD；优先复用已有命令，seam 未定不提前写候选测试；“无 correct seam”需具体结构证据，不因缺标签或多个候选推定架构缺陷；同一根因链为修复对象，旁支记录后续入口。当前 quick-fix 命中 6 份 active spec covers，另有 4 份行为相关 spec，均按现行条款分面共存；不修改 ADR。openai.yaml 已改为 seam/TDD 摘要，旧“五处三信号”定位不可机械套用；现有 eval 的“三条 glob”需纠正为五条。
- **历史验证方向**：至少一例真实可写诊断→修复→收尾，边界案例通过真实模型决策与独立动作/结果判读；借鉴 #5 特性内 CLI/夹具证据方式，不把 #4 review-runner 扩为通用执行器。静态、真实模型、实际动作证据分列；设计期此时尚未运行；现已完成必需验证，原始失败与未运行nightly边界详见验收报告。
- **关键裁决**：不吸收 diagnosing-bugs 的十级 loop 与 3-5 假设完整 ranking（报告 §6 #3），只取 lite 红信号门槛、认知性升级信号、2-3 排序候选。
- **探索指针**：报告 AB-16/17/18/19 与 §8.5 修正（quick-fix:39 列表外已有第 4 个升级信号"双 spec 矛盾"，认知性信号应并入列表成第 5 条；三信号枚举在 5 处需同步：SKILL.md :4/:18、openai.yaml、README 双语 :18/:42；eval qf-small-bug-triggers 步骤顺序需随红信号前置调整）。
- **已扫范围**：quick-fix 全文结构（步骤 2 :36-40、2.5 :42-50、3 :52-58、5a/5b :64-82、6 :84-91）；flaky/插桩/止损等同义词全仓零命中；quick-fix/SKILL.md 命中 4 份 active spec covers。
- **留给后继的注意事项**：（交付回写时追加）


- **本地交付结论**：T00—T06完成，12Req/24Scenario必需证据及最终全库验证通过；实际合并 464666d7f1c3decd63c160814d8beab0af473d39。来源/资源以execution/serial/T06/merge.json和progress.notes为准，失败原件保留；未push/发布。#7从其原胶囊续接，不重开本项证据升级裁决。

### #7 exploring-clarifying

- **2026-09-09 实施计划已保存**：入口 `.spec-dev/2026-09-09-01-exploring-clarifying/plan/index.md`，T00—T07 共8任务：隔离/共享上下文/澄清/实验/调研/公开说明/验收/交付。覆盖14Requirement、32Scenario，51个具名输入含后台预检、宿主迁移检查和入口/多轮变体；普通v1、默认串行，所有任务pending，尚未获实施指令。主线程五查、plan-index、49替换锚点+1新文件的内存模拟、内嵌代码静态语法通过；未执行任务、模型或产品验收。
- **2026-09-09 完整设计批准并落盘**：spec `.spec-dev/2026-09-09-01-exploring-clarifying/spec/exploring-clarifying-design.md`（active；14 条 Requirement / 32 个 Scenario，独立审查修正后 Approved；用户已review并同意编写计划）。初始提交 `c53cc1b`，独立审查闭合 `b72bdfd`，激活及旧条款pending提交 `019c17b`。用户依次确认邻近独立 spike 文件、增量 skill + 共享 reference 方案，并在完整设计与流程对比后回复 ok。
- **独立审查修正**：新代理名额满后使用全新只读 Codex CLI 两轮审查，原始输入/工具回执/结论见特性 `spec/design-review.md`；首轮指出 Codex 不自动加载 agent 定义，一手追溯可能漏传。已补 RA/exploring 非自动加载环境的解析路径派发及先读取要求，S16/S17 验收必须走真实派发，不以宿主预加载替代；独立增量复审 Approved。不是产品行为验收通过。
- **本轮裁决**：spike 只为获授权的运行性决策实验，按需升级隔离，资源去向可追溯；否决复用可选探索笔记；共享术语随获批 spec 保存。新增 `context-reuse.md` 单点定义双查与词汇表，入口以引用消费；migrate 仅登记新 `.spec-dev/glossary.md` 约定，不自动认领 `docs/glossary.md`。一手不可得保持缺口，后台为可选只读调研，不新增 skill/schema/公共 runner。
- **本轮补查**：major-upgrade 的「澄清核心纪律（新增第 0 条自我披露）」写死七条和引用方枚举，需 Requirement 级部分取代，保留原纪律语义；当前 TDD 原型授权和资源总则为引用权威。prototype 上游允许运行必需错误处理、邻近文件，不自动删除材料。migrate 当前仅遍历历史目录；glossary 是新增位置而非已确认历史文件。现有 evals 是意图清单，必需验收另取真实模型、工具回执和实际写入/运行证据。
- **关键裁决**：一次一题铁律与红线主句不变，frontier 批问不引入（roadmap 2026-08-05 备注、clarifying spec 非目标 :22）——AB-23 只加"可见的未决决策清单"不改交互形态，落地时须对表这两处既有裁决；spike 规则来源取 prototype 成型四纪律（§5.4 #2）；glossary 为仓库级 `.spec-dev/glossary.md`（守卫不解析，需在 migrate 清单登记）。
- **探索指针**：报告 AB-20/21/22/26/23/25/31/27 与 §8.5 修正（AB-20 用户侧冲动路由已在 exploring:83 + eval ex-hard-gate，仅 agent 侧 :82 缺；AB-21 内部近义锚点 TDD:28 "一次性原型"例外，README 双语 :11/:146 "no code/只读不写码"与受控例外冲突需改；AB-22 "已排除"承接位是「考察过的选项与取舍」而非「未决问题」；AB-23 结构性终止已由 clarifying:43 共识态定义；AB-25 原则已在 clarifying:14/:30/:43，缺反向 Red Flag）。
- **已扫范围**：exploring/clarifying 全文结构；RA:139 逐条枚举七条纪律（新增即陈旧）；clarifying evals cl-one-question（清单展示不得被判为多题）、cl-referenced-mode-no-exits；commands/triage.md 判据指针。
- **留给后继的注意事项**：（交付回写时追加）

### #8 p2-watchlist

- **关键裁决**：六条均"空白属实"但报告判为可选；AB-43 数字前提已修正（原始文本口径，YAML 真值均 643.6），论据仍成立但改动面 13 SKILL.md + 13 openai.yaml + 6 trigger-evals；AB-24 等真实"用户嫌慢"反馈再上。
- **探索指针**：报告 §5.3 与 §8.5（AB-34 parseFrontmatter 未导出、session-context.mjs:43-48 已有副本；AB-15 仓库唯一 .html 是 visual-preview 模板）。
- **已扫范围**：同 #1（结构性核验一并覆盖）。
- **留给后继的注意事项**：（交付回写时追加）

## 备注

- **全局约定（沿用 roadmap 2026-08-05 并新增）**：一次一题铁律、HARD-GATE、TDD 铁律、spec 漂移守卫、分诊三角双向建议式转介保留不动；报告 §6 的 16 项拒绝不重新提案；默认执行范式（主线程串行、子代理不写码）不变，并发仅作 opt-in 例外并以 ADR 记录。
- **契约姿态**：7 份 active spec 全部为硬约束；改动命中其 covers 时按 supersede-lifecycle 的分面共存双声明规则处理。本仓库未安装 PreToolUse/Stop 守卫、pre-commit 不跑漂移检查，各子项目实施前须手工 `node guardrail/check-spec-drift.mjs --staged` 自检。
- **提交纪律**：文档类提交（roadmap/spec/ADR/报告纠偏）带 `SKIP_RELEASE_HOOK=1`，避免 post-commit 自动发版产生过程碎片版本；改任何 SKILL.md 必须同暂存其 `agents/openai.yaml`（check-openai-sync）；改 skill 行为后人工走查其 evals（仓库无 runner）；新增 skill 必须登记 `.claude-plugin/marketplace.json` skills[]（check-plugin 双向校验）。
- **核验事实速查（供 #1）**：writing-plans:118 裸路径在用户项目 cwd 下 `MODULE_NOT_FOUND` 实测复现；CLAUDE_PLUGIN_ROOT 引用 skills/+agents/ 7 文件 + commands/doctor.md + scripts/schemas/README.md + hooks.json，三种写法并存（变量+降级句 3 处 / 变量裸用 8 处 / 裸相对路径 1 处），全仓无 `${VAR:-}` 形式；install.mjs:46-48 只拷 3 个 mjs；失败隔离定义点 exploration-patterns.md:89，复述 RA:133、quick-fix:38、codex-compat.md:54、review-orchestration.md:58；契约校验变体（补全一次→主线程接管）散 exploration-patterns:72、review-orchestration:21、executing-plans:93、schemas/README:14；Codex 映射表定义点 codex-compat.md:22-28，复述 RA:90-96、quick-fix:99-103、acceptance-qa:179-182；start-server.sh :153/:160/:166 三分支，SKILL.md:38 标准调用固定 --project-dir，:74 与 stop-server.sh:112-117 有意保留项目内会话；validate-output.mjs:200 依赖 token 只抽 `T\d\d`；skill 发现四路径均指向 skills/（marketplace skills[] 显式 / codex 目录 / pi.skills / 根 plugin.json）。
- **并发模式设计事实（供 #2）**：progress.yaml 单指针 `current`、整文件重写、写者始终主线程（writing-plans:212、executing-plans:75）；导航表四列无文件路径列，写集合只在任务文件「文件」块，与 executing-plans:45"不读 tasks/ 正文"冲突——需机器可读的写集合声明；上游 implement-spec 社区 issue 实证（#942 worktree 基线陈旧、#943 gitignored 夹具致 worktree 内测试静默跳过、#936 frontier 无法推进、#988 共享资源字面名冲突、#991 未先合并 tip 必冲突且 refs/stash 跨 worktree 互踩、#1010 零提交时 draft PR 开不出且无冲突时 merger 子代理多余且"后台运行"不带来并发、#1014 审查修复循环无界）；Claude Code `isolation: "worktree"` 默认从远端默认分支分叉（需 settings `worktree.baseRef: "head"`）、无自动合并、后台子代理无 AskUserQuestion、并发上限 20；Codex spawn_agent 无 cwd/worktree 参数、继承父 cwd、并发默认 6（v2 为 4）、完成态 agent 到 close_agent 才释放名额、工具描述要求"仅显式要求时派生"与"不相交写集合"；三个 agent 定义工具白名单均无 Edit/Write，README.md:22/:222 与 README.zh-CN.md:22/:221 对外承诺"子代理不写码"；evals ep-continuous-execution / ep-execution-confirm-gate（单数 worktree）/ ep-contract-deviation-stops 隐含串行。
- **新发现、未入子项目（quick-fix 候选）**：guardrail/session-context.mjs 对绝对路径形式的 `core.hooksPath` 疑似误报"git gate not enabled"（本仓库实测 hooksPath 已设为绝对路径仍告警，根因未实测）。
- **风险**：#1-#7 多个子项目都会触碰 writing-plans/executing-plans/requirement-analysis 的 SKILL.md（各命中 3-5 份 active spec covers），串行交付可避免合并冲突，但每个子项目的 spec 都要重做一次取代分流；共享件（clarifying 纪律、exploration-patterns、design-principles、codex-compat）被 4-10 处引用，改动须同步核对全部引用方（位置表见报告 §8.5 E 项与本文核验速查）。
