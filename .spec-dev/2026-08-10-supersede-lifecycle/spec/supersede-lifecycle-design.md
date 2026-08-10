---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——
spec_dev:
  version: 1
  feature: supersede-lifecycle
  status: active
  covers:
    - "skills/requirement-analysis/SKILL.md"
    - "skills/requirement-analysis/assets/spec-template.md"
    - "skills/requirement-analysis/references/spec-reviewer-prompt.md"
    - "skills/requirement-analysis/references/exploration-patterns.md"
    - "skills/writing-plans/SKILL.md"
    - "skills/executing-plans/SKILL.md"
    - "skills/executing-plans/references/review-orchestration.md"
    - "skills/quick-fix/SKILL.md"
    - "skills/acceptance-qa/SKILL.md"
    - "skills/acceptance-qa/references/acceptance-matrix.md"
    - "skills/acceptance-qa/templates/acceptance-report.md"
    - "guardrail/templates/CLAUDE.md.snippet"
    - "guardrail/templates/AGENTS.md.snippet"
    - "guardrail/README.md"
    - "guardrail/README.zh-CN.md"
    - "guardrail/session-context.mjs"
    - "guardrail/check-spec-drift.mjs"
  sync_commit: 8dc5c71c
  supersedes:
    - ".spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md"
  superseded_by: null
---

# spec/ADR 取代生命周期机制（supersede-lifecycle）设计

## 背景与目标

`status: superseded` 在模板、守卫与装机文档三处被承认，但全管线没有任何一步负责判定与执行取代：差量三节单向落新 spec、旧 spec 原文不动仍 active，两份 active spec 对同一行为给出矛盾定义；探索与审查无文档时效意识，破坏性重构时旧契约仍被当硬约束；ADR 零状态机制；消费侧（quick-fix 反查、writing-plans 载入、acceptance-qa 定位）全线无过滤；test-scoping 的孤儿测试退役判据因无人翻 superseded 永远半空转；covers 竞合已实际发生（resource-ledger `covers: []` 自述规避抢占，代价行为面零守卫）。本设计建立取代生命周期三段闭环：**设计期声明 → 交付期生效 → 消费期强制过滤**。

**成功标准**：requirement-analysis 产出的 spec 携带取代分流结论；executing-plans 收尾强制执行取代回写；全部消费入口按 status/标注/指针链过滤；ADR 具状态行与裁决期回写；存量 4 份 spec 完成对账（含 resource-ledger covers 补声明）；守卫判定逻辑（loadActiveSpecs/violations 判定）零改动。

## 非目标

不改 check-spec-drift.mjs 的判定逻辑（仅 report() 一行指引文案）；不为 plan/acceptance 报告/exploration 笔记引入状态机（只加消费规则）；不建全局取代索引/清单文件（指针物化在文档本体，W3C MUST-link 路线）；不引入"无后继作废"状态（作废必须有记录理由的后继文档）；不改 hook/CI 模板层（已核实零字段假设）；不为 exploring skill 增加规则（只读思考伙伴，不产出契约决策）。

## 术语表

- **取代（supersede）**：新 spec 的行为契约替换旧 spec 的全部或部分 Requirement。_Avoid_：作废、废弃、覆盖
- **完全取代**：旧 spec 整体退出现行契约面（文件级 status 翻转）。_Avoid_：整体作废
- **部分取代**：旧 spec 的个别 Requirement 被替换，文件整体保持 active（Requirement 级原位标注）。_Avoid_：局部覆盖
- **分面共存**：多份 active spec 描述同一文件的不同行为切面，互不冲突、互不取代。_Avoid_：spec 重叠、双 spec 抢占
- **契约姿态**：既有 spec/ADR 对新设计的约束力档位——"硬约束"（默认）或"仅现状输入"（用户授权破坏性重构后降格）。_Avoid_：约束级别
- **窗口期**：新 spec 激活（承诺交付）至交付合并（取代生效）之间的双 active 时段。
- **现行 Requirement**：所在 spec 为 active 且自身未被 Superseded 标注的 Requirement。_Avoid_：有效需求

## 影响面

skill 指令层 11 个文件（requirement-analysis×4、writing-plans、executing-plans×2、quick-fix、acceptance-qa×3）、guardrail 装机与文档层 6 个文件（snippet×2、README×2、session-context.mjs、check-spec-drift.mjs 仅 report 文案）；`.spec-dev/adr/` 目录随本特性首批 ADR 创建；存量 4 份 active spec 的对账动作在交付时执行。无新第三方依赖。

## 已确认的关键决策

- 取代生效时点双轨：spec 随交付、ADR 随裁决 —— 详见 [ADR-0001](../../adr/0001-supersede-timing-dual-track.md)
- ADR 封闭三态 + 禁止部分推翻（新 ADR 完整重述整体取代）—— 详见 [ADR-0002](../../adr/0002-adr-closed-status-no-partial.md)
- 声明方向"新指旧为权威、旧指新由工具交付时物化"：单向声明、双向落盘 —— RFC/OpenSpec/RAC/adr-tools 四先例一致；spec-dev 无索引系统、消费方直接读文件，反向指针必须写进旧文档本体（W3C MUST-link）
- covers 竞合取双声明：分面共存各自声明 covers，改单面对另一份用既有 `Spec-Guard: off` trailer 放行 —— trailer 语义恰为"与该 spec 契约无关"；保护面与反查发现面双全；已否备选：主 owner+touches 字段（守卫需新字段且保护洞不消失）、后来者让位（双洞制度化）。适用前提：active 集合经对账为真现行集合——重度存量仓库（多 spec 高密度重叠 covers，实测案例单文件被 11 份 active spec 覆盖）应先对账收敛再启用双声明纪律，否则 trailer 频率不可行
- 被取代 Requirement 不进验收矩阵 —— 改动收敛于 acceptance-matrix 三条规则与报告模板差量表（新增 SUPERSEDED 行），schema enum/if-then 免改；已取代行为的遗留测试由孤儿测试退役机制承接（判据对接不重叠）
- 部分取代仅"冲突型"触发过滤，"扩展型补充"归入分面共存、零标注零指针 —— 防 IETF Updates 式语义过载
- 取代路径风格分双面：**frontmatter 字段（`supersedes`/`superseded_by`）与 blockquote 标注中的路径字符串一律仓库根相对**（供机器/AI 解析，迁移脚本既有重写规则天然覆盖）；**正文 markdown 超链接沿用相对当前文件路径**（渲染兼容，`../../adr/…` 等既有风格不变）
- 窗口期在旧 spec 打 pending 标注（而非消费侧动态反查）—— 一次物化、全消费方与人类读者可见；DROPPED 时回收
- 翻 superseded 必须同时填 superseded_by；删除整个特性写 REMOVED-only spec 作为后继 —— 无后继作废不提供（IESG Historic 教训：被降级文档必须能指到降级理由）

## ADDED Requirements

### Requirement: spec frontmatter 取代字段与四种落盘形态

spec 的 `spec_dev` frontmatter SHALL 支持可选字段 `supersedes`（仓库根相对路径列表，设计期声明）与 `superseded_by`（单一仓库根相对路径，交付回写；与 `status: superseded` 必须成对出现）；取代状态 SHALL 以四种形态落盘：窗口期 pending 标注（旧 spec 正文顶部 blockquote）、完全取代（frontmatter 翻转 + 指针 + 正文标注 + sync_commit 冻结）、部分取代（旧 spec 保持 active，被取代 `### Requirement:` 标题下原位 blockquote 标注，形制对齐 DEFERRED 标注）、分面共存（零标注，仅新 spec「取代与共存」节记判定理由）。

#### Scenario: 部分取代不误翻文件级状态

- **GIVEN** 旧 spec 含 3 条 Requirement，其中 1 条被新 spec 声明部分取代且新 spec 已交付
- **WHEN** 检查旧 spec
- **THEN** frontmatter `status` 仍为 `active`，仅该条 Requirement 标题下出现 `> **Superseded (日期)** — by <新spec路径>#<锚>` 标注，其余 2 条无标注且继续受守卫保护

#### Scenario: 完全取代成对写入指针

- **GIVEN** 新 spec 完全取代旧 spec 且已交付
- **WHEN** 检查旧 spec frontmatter
- **THEN** `status: superseded` 与 `superseded_by: <新spec仓库根路径>` 同时存在，正文顶部有 Superseded blockquote，此后 `sync_commit` 不再更新

### Requirement: requirement-analysis 阶段 6 取代分流

requirement-analysis 阶段 6 写 spec 时 SHALL 对探索期命中的每份行为相交 active spec 做三分类判定（完全取代 / 部分取代 / 分面共存）并落盘：完全与部分取代登记进新 spec frontmatter `supersedes` 与正文「取代与共存」节（部分取代 SHALL 列出旧 spec 被取代的具体 Requirement 清单，每条附一句取代理由），分面共存 SHALL 记一行判定理由并执行 covers 双声明；用户要求删除整个特性且无新行为承接时，SHALL 产出仅含 REMOVED Requirements 的轻量 spec 作为后继（记录删除理由，交付时按完全取代回写旧 spec）。

#### Scenario: 部分取代声明含 Requirement 清单

- **GIVEN** 新设计与某 active spec 的 2 条 Requirement 行为冲突、与其余 Requirement 无关
- **WHEN** 阶段 6 落盘 spec
- **THEN** frontmatter `supersedes` 含该旧 spec 路径，「取代与共存」节列出这 2 条 Requirement 的标题与各自取代理由，未涉及的 Requirement 不在清单中

#### Scenario: 分面共存不产生取代声明

- **GIVEN** 新设计与某 active spec 覆盖同一文件的不同行为切面且无冲突
- **WHEN** 阶段 6 落盘 spec
- **THEN** `supersedes` 不含该 spec，「取代与共存」节记一行共存判定理由，新 spec 自行声明所需 covers（不要求对方让位）

### Requirement: 契约姿态判定

requirement-analysis 阶段 1/2 在用户措辞含破坏性重构信号（重构、推翻、不留兼容等）时 SHALL 以一道澄清题向用户确认命中的旧 spec/ADR 是"硬约束"还是"仅现状输入"；确认降格后，探索派发词 SHALL 携带该姿态结论，子代理报告 SHALL NOT 将降格契约作为设计约束呈现（仅作现状与迁移分析输入）。

#### Scenario: 破坏性重构授权后旧契约降格

- **GIVEN** 用户明确要求"全面、可破坏性重构"某特性，且该特性有 active spec
- **WHEN** 契约姿态经用户确认为"仅现状输入"后进入探索与方案设计
- **THEN** 探索报告把旧 spec 归入现状描述而非约束清单，方案对比不因"违反旧 spec 契约"排除任何选项

### Requirement: 阶段 8 激活时打 pending 标注

requirement-analysis 阶段 8 激活携带非空 `supersedes` 的 spec 时，SHALL 在同一提交内向每份被指向的旧 spec 正文顶部写入 Superseded-pending blockquote（含日期与新 spec 仓库根路径）。

#### Scenario: 窗口期双 active 可判定

- **GIVEN** 新 spec 已激活、尚未交付，其 `supersedes` 指向某旧 spec
- **WHEN** 任一消费方读取旧 spec
- **THEN** 正文顶部可见 `> **Superseded-pending (日期)** — 本 spec 将被 <新spec路径> 取代（待其交付）…` 标注，无需反向扫描全部 active spec 即可判定取代关系存在

### Requirement: 交付期取代回写为强制步骤

writing-plans 的最终任务模板 SHALL 含取代回写步骤（与 sync_commit 锚定同一提交组）：按 spec「取代与共存」节执行完全取代翻转（含 pending 行替换与 `superseded_by` 写入）、部分取代的 Requirement 原位标注、covers 接管核对（完全取代时列出旧 covers 中不被新 spec covers 覆盖且仍存在的路径差集，经用户确认处置）；executing-plans 阶段 6 SHALL 执行该步骤；spec 无取代声明时该步骤 SHALL 声明"无取代回写"后跳过；executing-plans 以意图级偏差收尾废弃计划时 SHALL 回收其 spec 已打出的 pending 标注并在总结注明。

#### Scenario: 交付时旧 spec 被回写

- **GIVEN** 计划对应 spec 声明完全取代某旧 spec，实施完成进入最终任务
- **WHEN** 执行取代回写步骤并合并
- **THEN** 同一提交组内旧 spec `status: superseded` + `superseded_by` 写入、pending 行替换为 Superseded 行，且该提交组含 sync_commit 锚定（revert 该组即原子恢复取代前状态）

#### Scenario: covers 接管出现真空时不静默

- **GIVEN** 完全取代场景，旧 spec covers 含仍存在的路径 `src/legacy/**`，新 spec covers 未覆盖它
- **WHEN** 执行 covers 接管核对
- **THEN** 差集 `src/legacy/**` 被列出并征询用户处置（补进新 spec covers / 确认放弃保护并记录），不静默翻转

#### Scenario: 计划废弃时回收 pending 标注

- **GIVEN** 新 spec 已激活并打了 pending 标注，实施中用户裁决放弃（意图级偏差收尾）
- **WHEN** executing-plans 收尾该废弃计划
- **THEN** 旧 spec 上的 pending 标注被删除并在总结中注明，旧 spec 恢复无标注的 active 状态

### Requirement: ADR 状态行与裁决期回写

ADR SHALL 在标题下携带封闭三态状态行（`Accepted (日期)` / `Deprecated (日期) — 原因` / `Superseded by [ADR-NNNN](NNNN-<slug>.md) (日期)`，ADR 互指用同目录文件名相对链接；缺状态行的历史 ADR 视同 Accepted）；requirement-analysis 阶段 6 落盘声明 `Supersedes: ADR-NNNN` 的新 ADR 时 SHALL 在同一提交回写旧 ADR 状态行为 Superseded by（不等待实施交付）；Deprecated SHALL 强制携带一句原因，Superseded SHALL 强制携带编号链接。

#### Scenario: 决策推翻即时回写

- **GIVEN** 阶段 6 沉淀的新 ADR-0005 声明 `Supersedes: ADR-0002`
- **WHEN** 该阶段的 git commit 完成
- **THEN** 同一提交内 ADR-0002 状态行已变为 `Superseded by [ADR-0005](…) (日期)`，正文其余部分逐字未动

### Requirement: spec 审查新增外部一致性维度

spec-reviewer 审查维度 SHALL 包含外部一致性检查：对照「取代与共存」节，报告新 spec 与既有 active spec/ADR 之间未声明的行为冲突；完全取代场景 SHALL 核对 covers 接管完整性并把真空差集列为 issue。

#### Scenario: 未声明的取代被审查捕获

- **GIVEN** 新 spec 的某 Requirement 与既有 active spec 的 Requirement 行为矛盾，但「取代与共存」节未提及该 spec
- **WHEN** 阶段 7 对抗审查执行
- **THEN** 审查报告以 Issues Found 列出该未声明冲突及两份文档的定位

### Requirement: 消费侧按状态与指针过滤

quick-fix 步骤 2 反查、writing-plans 载入检查、acceptance-qa 阶段 0 定位 SHALL 读取命中 spec 的 frontmatter status 与正文标注：status 为 superseded 时沿 `superseded_by` 链跳转至 active 端（跳转记录已访问路径集合，发现环 SHALL 停下报告）；被 Superseded 标注的 Requirement SHALL NOT 作为"实现偏离 spec"的修复判据或验收依据；quick-fix 诊断存量行为时 MAY 将已取代契约作为历史参考读取（区分"新工作依据"与"存量排查输入"）。

#### Scenario: 反查跳转防止按旧契约回改

- **GIVEN** 某文件同时命中已交付取代链中旧 spec（superseded）与新 spec（active）的 covers
- **WHEN** quick-fix 反查该文件的行为契约
- **THEN** 修复判据取自新 spec；旧 spec 仅在排障需要时作为历史参考，不触发"实现偏离旧 spec"的修复动作

#### Scenario: 载入被取代 spec 时停下

- **GIVEN** 用户以一份 status: superseded 的 spec 路径触发 writing-plans
- **WHEN** 载入检查执行
- **THEN** 流程停下告知该 spec 已被取代并给出 `superseded_by` 指向，经用户显式确认后才可继续

#### Scenario: acceptance-qa 记录跳转链

- **GIVEN** 用户直接对某特性触发验收，按目录定位到的 spec 已 superseded
- **WHEN** 阶段 0 定位执行
- **THEN** 沿链跳转至 active 后继 spec 并以其矩阵验收，报告头记录原始路径、实际使用路径与跳转链

#### Scenario: 指针链成环时停下

- **GIVEN** 两份 spec 的 `superseded_by` 因人为错误互相指向对方
- **WHEN** 任一消费入口沿链跳转
- **THEN** 已访问路径集合检出重复，跳转停止并向用户报告环上的文件清单，不进入无限循环、不擅自选边

### Requirement: 验收矩阵只含现行 Requirement

验收矩阵的行数纪律 SHALL 以现行 Requirement 为准：被 Superseded 标注的 Requirement 不出矩阵行、其 Scenario 不被引用；执行期裁剪 SHALL 将"Requirement 已被取代"作为独立裁剪原因并入 coverage_note（与"变更面未触及"区分）；交付对账 verdict 集合 SHALL 新增 SUPERSEDED（判定：契约移交给后继 spec；与 DROPPED 的分界为行为是否继续存在）。

#### Scenario: 部分取代后矩阵自动收缩

- **GIVEN** 某 spec 的 1 条 Requirement 已被标注 Superseded，其余 2 条现行
- **WHEN** 按该 spec 生成或裁剪验收矩阵
- **THEN** 矩阵仅含 2 条现行 Requirement 的行，coverage_note 注明"1 条已取代，不入矩阵"

### Requirement: completeness critic 排除已取代项

executing-plans 收尾的 completeness critic SHALL 只对照现行 Requirement/Scenario 查覆盖缺口，被 Superseded 标注的 Requirement SHALL NOT 被报告为"未覆盖"。

#### Scenario: 历史长 spec 不产生取代噪音

- **GIVEN** 交付对照的 spec 含 4 条已标注 Superseded 的历史 Requirement 与 3 条现行 Requirement
- **WHEN** completeness critic 执行
- **THEN** 覆盖缺口仅针对 3 条现行 Requirement 判定，4 条已取代项不出现在缺口清单

### Requirement: session-context 注入区分状态计数

session-context.mjs 的注入行 SHALL 在保留既有总数的基础上附 active 与 superseded 细分计数（如 `5 spec(s): 4 active, 1 superseded`；draft 等其他状态不入细分、仍计入总数），使接手会话第一眼可知历史层存在；实现 SHALL 为该脚本新增最小 frontmatter status 读取。

#### Scenario: 含取代历史的仓库注入可见

- **GIVEN** 仓库有 4 份 active 与 1 份 superseded spec
- **WHEN** SessionStart hook 运行 session-context.mjs
- **THEN** stdout 注入行呈现两个分离的计数，而非单一总数

### Requirement: 未知 status 值告警

session-context.mjs 的健康自检与 check-spec-drift.mjs 的 loadActiveSpecs SHALL 对 status 值不在 `draft | active | superseded` 枚举内的 spec 发出告警（列出值与数量，说明该 spec 不受守卫保护，并给出合法枚举修正指引：现行用 active、已被取代用 superseded 并填 superseded_by）；未知值 SHALL NOT 计入注入行的状态细分。

#### Scenario: 工作状态误用被提示

- **GIVEN** 仓库存在 status 为 delivered、completed 等非枚举值的 spec（生命周期字段被误当工作状态使用）
- **WHEN** SessionStart 注入或守卫检查运行
- **THEN** 输出告警列出未知值及计数并给出修正指引，不静默忽略；注入行细分计数不含这些 spec

### Requirement: 装机侧把 superseded 重写为生命周期终态

guardrail 的 CLAUDE.md.snippet、AGENTS.md.snippet 与 README（中英）SHALL 将 superseded 从"临时放行手段"清单移出、独立成生命周期条目：写明翻转必须携带 `superseded_by`、读到 superseded spec 应沿指针跳转后继、SHALL NOT 依据其行为规范开展新工作；并补充 covers 接管义务与 superseded spec 的 sync_commit 冻结语义；check-spec-drift.mjs 的 report() 指引第 3 条 SHALL 同步该措辞（判定逻辑不变）。

#### Scenario: 未装插件的接手者获得正确纪律

- **GIVEN** 目标仓库装有 guardrail、未装 spec-dev 插件
- **WHEN** 接手者阅读 CLAUDE.md/AGENTS.md 装机段落
- **THEN** superseded 不再与 trailer/环境变量并列为放行手段，而是带指针义务与跳转读取义务的生命周期终态

## MODIFIED Requirements

### Requirement: 探索派发要求含文档时效规则（改了什么：派发要求清单从 4 项扩为 5 项）

阶段 2 探索派发要求 SHALL 包含：清晰主题或模态、相关文件线索、期望输出格式、外部工具优先级提醒（既有第 4 项），以及**（新增第 5 项）文档时效规则**——涉及 `.spec-dev/` 产物时按 frontmatter status 分类报告，superseded 与带 pending 标注者点名标示且仅作历史参考，命中 active spec/ADR 与本需求的行为交集逐一列出；plan/acceptance 报告/exploration 笔记 SHALL 被视为执行时点记录（现状以代码与 active spec 为准），SHALL NOT 从中照抄代码片段作为现状依据。

#### Scenario: 探索报告区分文档时效

- **GIVEN** `.spec-dev/` 下同时存在 active、superseded 与带 pending 标注的 spec
- **WHEN** 按派发要求发起内部探索
- **THEN** 探索报告按三类分别列出，superseded/pending 项不进入"现行契约"结论，旧 plan 中的代码块未被当作代码现状引用

### Requirement: 孤儿测试退役判据可闭环（改了什么：判据第二条件新增"被 Superseded 标注"分支——对 test-scoping「随周期测试退役检查」的部分取代，见取代与共存节）

最终任务的测试退役检查判据 SHALL 为：测试名对不上任何 active spec 的现行 Scenario，且对应 Requirement 已 REMOVED、**或被 Superseded 标注**、或所属 spec 已 superseded——第二条件的"被 Superseded 标注"分支为本设计新增（writing-plans 最终任务步骤 2 判据文本与 test-scoping 术语表 SHALL 同步该扩展）；本设计交付后该判据的 superseded 分支 SHALL 具备真实输入（取代回写产生 superseded 状态与 Requirement 标注）。

#### Scenario: 取代交付后的下一周期可退役旧测试

- **GIVEN** 某 Requirement 经部分取代已被标注，其 Scenario 对应的旧测试仍在仓库且命中计划「相关测试范围」
- **WHEN** 后续某计划执行最终任务的测试退役检查
- **THEN** 该测试进入孤儿候选清单征询用户，同意后删除

## 取代与共存（本 spec 对既有 active spec 的判定，自举示范）

- **test-scoping**（covers: writing-plans/using-git-worktrees/executing-plans SKILL.md）：**部分取代 + 分面共存**——其「Requirement: 随周期测试退役检查」及术语表"孤儿测试"定义被本 spec 部分取代（判据第二条件由"已 REMOVED 或所属 spec 已 superseded"扩为含"被 Superseded 标注"分支，同一前置下判定结果相反，属冲突型变更；取代理由：Requirement 级取代自本 spec 起真实存在，判据必须识别它）——交付时按本机制在其该 Requirement 打 Superseded 标注并同步 writing-plans 最终任务步骤 2 判据文本与其术语表；其余切面（相关测试范围声明、归属裁决、基线分域）**分面共存**，行为无冲突。本 spec 依双声明规则自行声明 covers，交付提交命中其 covers 时以 `Spec-Guard: off` trailer 放行或同步。
- **resource-ledger**（covers: []）：**分面共存**——其拥有资源台账切面；存量对账时（见验收矩阵）按双声明规则为其补 covers 声明（writing-plans/executing-plans/acceptance-qa/quick-fix 四个 SKILL.md），并同步删改其「已确认的关键决策」中"`covers: []` 留空规避双 spec 抢占"一行（否则对账后其决策与自身 frontmatter 自相矛盾）。
- **clarifying-skill**（covers: skills/clarifying/**）：无行为交集（本 spec 不动 clarifying），零动作。
- **triage-routing**（covers: commands/triage.md）：无行为交集（triage 不读落盘产物，已核实），零动作。

## 方案设计（要点）

**数据流**：设计期——探索报告命中旧 spec/ADR → 契约姿态判定 → 阶段 6 三分类落盘（`supersedes` + 取代与共存节；ADR 即时回写）→ 阶段 7 外部一致性审查 → 阶段 8 激活 + pending 标注。交付期——最终任务取代回写 + covers 接管核对 + sync_commit 同组提交 → 合并。消费期——各入口按 status/标注/链跳转过滤。

**错误处理**：指针链成环 → 记录已访问集停下报告；`superseded_by` 缺失或悬空（存量装机仓库常见——旧纪律不要求指针）→ 消费方按无后继处理：向用户报告并以历史参考对待，不阻塞流程；draft 滞留 → supersedes 永不执行；并发取代同一旧 spec 不同 Requirement → roadmap 依赖序保证回写串行；撤销 → revert 取代提交组原子恢复；旧 spec 无 frontmatter → 跳过机制；非 git → 沿既有跳过先例；`docs/` 迁移 → 仓库根相对路径被迁移脚本既有规则覆盖。

## 测试与验收策略

| Scenario / 检查项 | 维度 | 执行方式 | 验收证据 |
|-------------------|------|---------|---------|
| 结构校验（validate-skills / check-plugin / check-openai-sync 全绿） | integration | 任务内 TDD | 脚本通过输出 |
| session-context 注入区分状态计数（superseded fixture 直跑） | integration | 任务内 TDD | stdout 含双计数 |
| 完全取代 / 部分取代 / 分面共存三场景产物形态走查（对照本 spec 各 Scenario） | ai-acceptance | 验收任务 (A) | 走查记录（逐 Scenario 对照） |
| 存量对账：resource-ledger 补 covers 并删改其"covers: [] 规避抢占"决策行 + 四份 spec 交集裁决落地（含对 test-scoping 的部分取代回写） | integration | 验收任务 (D) | 对账后 frontmatter 与正文 diff |
| 装机侧 snippet/README 语义重写核对（superseded 不在放行清单） | docs | 任务内 TDD | diff review |
| acceptance-qa evals.json 报告结构断言与改动后报告模板一致性核对 | docs | 任务内 TDD | eval 文本核对 |

## 风险与边缘情况

pending 标注在计划长期搁置时滞留（缓解：executing-plans 意图级偏差收尾挂回收；roadmap 续接提示可见）；文档型仓库（如本仓库）分面共存密度高，双声明带来的 trailer 频率需观察（缓解：trailer 本身留痕可审计，频率过高即为重新划分 covers 的信号）；skill 指令为自然语言、AI 执行有漏检风险（缓解：审查外部一致性维度与验收走查兜底；核心判定全部物化为文档内标注，可事后审计）；`supersedes` 字段对旧版守卫解析器为未知键（已核实按标量忽略、covers 解析不受影响，写作内联 `[]` 或置于 covers 之后规避 coversSuspect 误报）。

## 开放问题

ADR 数量增长后是否需要索引文件（`adr/README.md` 状态列表）——本期不建，随首次 ADR 超过 10 条时再议；trailer 频率的量化观察窗口——留给交付后一个开发周期。
