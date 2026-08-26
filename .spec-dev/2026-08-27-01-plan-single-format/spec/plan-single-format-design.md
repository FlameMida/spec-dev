---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——
spec_dev:
  version: 1
  feature: plan-single-format
  status: draft
  covers:
    - "skills/writing-plans/SKILL.md"
    - "skills/writing-plans/references/progressive-plan-format.md"
    - "skills/executing-plans/SKILL.md"
    - "skills/executing-plans/references/progressive-execution.md"
    - "skills/executing-plans/references/review-orchestration.md"
    - "skills/requirement-analysis/SKILL.md"
    - "skills/quick-fix/SKILL.md"
    - "skills/acceptance-qa/SKILL.md"
    - "skills/writing-plans/evals/evals.json"
    - "skills/executing-plans/evals/evals.json"
    - "skills/executing-plans/agents/openai.yaml"
    - "guardrail/templates/CLAUDE.md.snippet"
    - "guardrail/templates/AGENTS.md.snippet"
    - "README.md"
    - "README.zh-CN.md"
    - "scripts/tests/resource-ledger-split.test.mjs"
  supersedes:
    - ".spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md"
  sync_commit: null
---

# plan 单一形态设计（写收敛、读宽容）

## 背景与目标

v8.0.0 交付的 plan 双形态（阈值门控）暴露两类实证问题：**分叉缝隙**——每条新纪律须在单/分文件两侧各写一遍，"资源预登记按形态分流"在 writing-plans 侧三处全部漏落地（审查发现 R4）；**执行体验**——106KB 单文件计划跨会话执行时每任务需回捞计划段落、断点恢复靠 git log 与未提交文件推断。本特性把 writing-plans 产物收敛为**唯一分文件形态**，同时保留 executing-plans 对存量单文件计划的读取执行能力（写收敛、读宽容）；两个 progressive reference（阈值门控时代的按需加载设计）随门控失效合并进各自 SKILL.md 并删除。

**成功标准**：writing-plans 生成的每份计划都是 index.md + tasks/ + progress.yaml 结构且 plan-index 校验通过；任务文件无复选框（progress.yaml 唯一状态源）；存量单文件计划在 executing-plans 下按原样可执行、可恢复、可验收；全仓无"阈值门控/形态分流"残留条款；全套校验与测试绿。

## 非目标

- 不做存量单文件计划迁移脚本（读历史数据非兼容垫片；可选后续）
- 不改 validate-output plan-index 校验器与其测试（已针对分文件结构，适用面随收敛扩大）
- 不动 plan-index 四列契约、progress.yaml 键结构、NN 编号规则（继承 v8.0.0 定义）
- 不恢复 writing-plan-plus 的 executor 版本域/编译快照/skill 注册（ADR-0004 已否，ADR-0005 重申）

## 术语表

- **写收敛、读宽容**：writing-plans 只生成分文件形态；executing-plans 按格式嗅探保留对存量单文件计划的读取执行。_Avoid_：砍掉单文件（读侧仍在）、废弃旧格式（存量 grandfather）
- **存量 grandfather**：`.spec-dev/` 下现有单文件计划不改名不迁移，按原样被读取执行。_Avoid_：旧格式兼容层

## 已确认的关键决策

- 单一形态收敛 + 读宽容，正面回应 v5.5.0 前车之鉴（失败根因是双事实源双轨同步，本设计的单一事实源 + 全局去复选框已消除）——详见 [ADR-0005](../../adr/0005-plan-single-format.md)（整体取代 ADR-0004，仍有效结论完整重述）
- 两个 progressive reference 合并进各自 SKILL.md 后删除（单形态后"按需加载"门控失效，拆分只剩间接引用成本；token 两侧等价）
- 任务文件步骤用「**步骤 N:**」标题式，全局去复选框（单一事实源名副其实）
- 单一特性一次收敛（方案 A）：文档全改 + reference 合并 + 测试随动一个交付周期完成，不留"单形态 + 带门控条款 reference"的中间态

## 取代与共存

- [部分取代] `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md`：
  - Requirement「plan 分文件形态（阈值门控）」——整条取代：阈值门控与双形态并存语义删除，由本 spec MODIFIED「plan 单一形态」完整重述（结构/导航表/键结构/生成后校验全部继承）。理由：门控语义随单一形态失效
  - Requirement「渐进执行与断点恢复」——部分取代：渐进加载从"分文件形态的行为"升为"新计划的默认行为"，单文件复选框判读降格为存量兼容子句。理由：主从关系翻转
  - Requirement「资源登记纪律（按计划形态分流）」——部分取代：登记载体收敛为 progress.yaml resources（生成侧唯一形态），存量单文件台账行保留为读侧兼容。理由：分流语义消失
  - 其余 Requirement（manifest/doctor/test-strategy/编号/胶囊/澄清纪律等）无行为交集，零动作
- [分面共存] `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md`：本 spec 编辑其 covers 中 8 个文件（requirement-analysis/writing-plans/executing-plans/quick-fix/acceptance-qa 的 SKILL.md、review-orchestration.md、guardrail 两 snippet）但不触碰取代生命周期行为；提交命中其 covers 时按双声明规则同步或 `Spec-Guard: off` trailer 放行
- [分面共存] `.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`：「相关测试范围」声明继续随计划头部走（现物理位置 = index.md 头部），判定语义零变化
- [零动作] resource-ledger spec：其被取代标注（Superseded by major-upgrade）不受本次再演进影响

## MODIFIED Requirements

### Requirement: plan 单一形态（改了什么：删除阈值门控与单文件生成能力，分文件成为唯一生成形态；结构与键定义继承）

writing-plans SHALL 对每份计划产出分文件形态——`plan/index.md`（计划头部：标题/技术栈/设计原则块/全局约束/「相关测试范围」声明 + 任务导航表，导航表含任务/依赖/消费接口/产出接口四列，不复制任务正文）、`plan/tasks/TNN.md`（每任务一文件：文件块/接口块/TDD 步骤，步骤用「**步骤 N:**」标题式、不使用复选框；T00 为隔离工作区、最大号为最终任务、验收任务如有居其间）、`plan/progress.yaml`（唯一运行时状态：任务状态/当前指针/commit 映射/资源台账/偏差记录；writing-plans 生成时预登记已知资源入初始 resources）。生成后 SHALL 运行 plan-index 校验（tasks/ 文件与导航表一一对应、依赖引用存在、依赖图无环），失败不得交付执行。**不再存在**单文件生成路径与阈值判定条款；progressive 渐进规范（结构/导航表规则/键结构/生成规则/Self-Review 第 4 查）SHALL 并入 writing-plans SKILL.md 本体，`references/progressive-plan-format.md` 文件删除。

#### Scenario: 小计划也产分文件

- **GIVEN** light 档需求推导出 3 个任务
- **WHEN** writing-plans 产出计划
- **THEN** 生成 index.md + tasks/T00-T03 + progress.yaml，plan-index 校验通过——无任何按规模分流的判定

#### Scenario: 阈值条款不复存在

- **GIVEN** writing-plans SKILL.md 现行文本
- **WHEN** 扫描形态相关条款
- **THEN** 不出现"任务数 >8 / 正文 25KB"门控与"低于阈值维持单文件"表述；docs 断言测试通过

#### Scenario: 大计划自动分文件（继承）

- **GIVEN** spec 推导出 13 个任务
- **WHEN** writing-plans 产出计划
- **THEN** 生成 index + 13 个任务文件 + progress.yaml，且 plan-index 校验通过

#### Scenario: 悬空依赖被拦截（继承）

- **GIVEN** 导航表中任务 T05 声明依赖 T99
- **WHEN** 运行 plan-index 校验
- **THEN** 校验失败并指出悬空引用

### Requirement: 渐进执行与断点恢复（改了什么：渐进加载升为新计划默认，复选框判读降格为存量兼容）

executing-plans 对分文件形态（全部新计划）SHALL：启动只读 index 与 progress；执行 TN 时只读 `tasks/TN.md` 与其依赖任务的产出接口行（不读其正文）；每任务完成原子更新 progress 并提交。检测到未完成的 progress.yaml 时 SHALL 校验 worktree/分支/最后 commit 可解析后从下一 ready 任务续跑。渐进加载纪律（含 resume 规程）SHALL 并入 executing-plans SKILL.md 本体，`references/progressive-execution.md` 文件删除。存量单文件计划的复选框判读轻量恢复（首个含未勾选步骤的任务即续跑点，勾选状态与 git log 的 feat(TN) 提交对照、不一致以提交为准并报告）SHALL 保留为兼容分支条款，不再与分文件形态对称陈述。

#### Scenario: 新会话恢复执行（继承）

- **GIVEN** progress.yaml 显示 T01-T04 完成、T05 待执行，会话为全新上下文
- **WHEN** 用户要求继续执行该计划
- **THEN** 流程从 T05 续跑且不读取 T06 及之后的任务正文

#### Scenario: 状态与文件不一致（继承）

- **GIVEN** progress 引用的 `tasks/T05.md` 文件缺失
- **WHEN** 恢复执行
- **THEN** 停下向用户报告不一致，不猜测继续

#### Scenario: 存量单文件计划的轻量恢复

- **GIVEN** 一份存量单文件计划，勾选状态止于任务 4 且 git log 有对应 feat(T4) 提交
- **WHEN** 恢复执行
- **THEN** 从任务 5 续跑；勾选与提交不一致时以提交为准并向用户报告

### Requirement: 资源登记纪律（改了什么：载体由"按形态分流"收敛为 progress.yaml resources，存量单文件台账行保留为读侧兼容）

executing-plans 执行任务期间创建计划未预登记的持久资源时，执行者 SHALL 当场写入 progress.yaml 的 resources 键、不延迟到收尾补记（计划任务文件不被编辑）；最终任务清理步骤 SHALL 遍历 progress.yaml 的 resources 清单（writing-plans 的资源台账规范定义点为 progress.yaml 键结构节）。执行**存量单文件计划**时，登记与清理 SHALL 沿用该计划最终任务内嵌的复选框台账行（就地编辑，该侧冻结、不再新增条款）。quick-fix 与 acceptance-qa 的台账指针 SHALL 指向 writing-plans 的资源台账定义（不再定位到"最终任务模板"）。

#### Scenario: 分文件形态登记进 progress（继承）

- **GIVEN** 分文件形态计划执行中创建了未预登记的持久资源
- **WHEN** 执行者创建该资源
- **THEN** progress.yaml 的 resources 当场追加一行（含清理命令），任务文件不被编辑

#### Scenario: 存量单文件形态创建即登记

- **GIVEN** 存量单文件计划执行中需临时启动一个数据库容器
- **WHEN** 执行者创建该容器
- **THEN** 该计划最终任务的资源台账即刻多出一行（含清理命令）

#### Scenario: 外部指针不悬空

- **GIVEN** quick-fix、acceptance-qa 与 executing-plans 自身的台账定义指针条款
- **WHEN** 按"资源台账定义"检索 writing-plans
- **THEN** 命中 progress.yaml 键结构节的台账规范，无指向已让位小节的悬空定位

## ADDED Requirements

### Requirement: 存量计划兼容读取

executing-plans 载入计划时 SHALL 按格式嗅探分流：`plan/tasks/` 子目录存在 → 分文件形态（渐进加载）；不存在 → 单文件形态，按 `plan/*-plan.md` 原样读取执行，不要求迁移、不改名、不生成 progress.yaml。存量单文件计划 SHALL 保持可执行、可恢复（复选框判读）、可验收（验收任务定位）能力；该读分支为冻结侧——后续流程演进不再为其新增条款，仅维持既有语义。acceptance-qa 定位存量计划的验收任务时 SHALL 读取计划正文尾部的验收任务节。

#### Scenario: 旧单文件计划可执行

- **GIVEN** `.spec-dev/2026-08-26-01-major-upgrade/plan/major-upgrade-plan.md`（存量单文件）
- **WHEN** executing-plans 载入该计划
- **THEN** 走单文件分支按原样读取执行，不提示迁移、不生成 tasks/ 或 progress.yaml

#### Scenario: 新计划走渐进分支

- **GIVEN** 新生成的计划目录含 `tasks/` 子目录
- **WHEN** executing-plans 载入
- **THEN** 走分文件分支，启动只读 index + progress + spec，不预读任务正文

## 测试与验收策略

| Scenario / 检查项 | 维度 | 执行方式 | Lane | 验收证据 |
|-------------------|------|---------|------|---------|
| 阈值条款不复存在 + 唯一形态断言 | docs | 任务内 TDD（docs 断言测试） | fast | 测试通过 |
| 存量单文件计划可执行（eval 断言） | docs | 任务内 TDD（executing-plans evals 补录） | fast | eval 承载核对 |
| resource-ledger-split 断言随动 | unit | 任务内 TDD | fast | 测试通过 |
| plan-index 校验对新结构通过 | unit | 任务内 TDD（沿用既有测试） | fast | 测试通过 |
| living docs 无"阈值门控/形态分流"残留 | integration | 验收任务 (D)（rg 扫描 skills/ + guardrail/templates/ + README 双语，排除 CHANGELOG 与 .spec-dev/——历史档案不清理） | fast | rg 零命中 |
| reference 删除后无悬空引用 | integration | 验收任务 (D)（rg 两文件名，同上范围） | fast | rg 零命中 |
| validate-skills / check-openai-sync / check-plugin / node --test 全绿 | integration | 验收任务 (D) | fast | 命令退出码 0 |
