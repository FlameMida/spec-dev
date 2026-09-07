---
name: executing-plans
description: >-
  执行实施计划——当已有 writing-plans 产出的实施计划（`.spec-dev/` 特性目录下 plan/ 的分文件形态：index.md + tasks/ + progress.yaml；存量单文件计划按原样读取）、准备动手实现时使用。主线程在隔离 worktree 中逐任务执行（TDD + 每任务提交 + spec 自检），全部完成后编排多维对抗代码审查（code-reviewer 子代理不写码、仅分析与复跑验证），并按验收矩阵触发 acceptance-qa 验收，最终合并总结。不适用于没有书面计划的即兴改动。 分文件进度仍由 progress.yaml 唯一跟踪；默认串行；已明确选择且声明/拓扑/资源合格时委托 executing-plans-parallel，任务边界切换及恢复由该 skill 编排。
---

> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

> **插件根**：`${CLAUDE_PLUGIN_ROOT}`——本 skill 正文与其 references 中的插件根命令以此为准；若上式仍为变量字面量（平台未替换），按 requirement-analysis 的 references/exploration-patterns.md「插件根解析」序列推导。

> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。

# 执行实施计划

## 概述

载入计划 → 隔离工作区 → 主线程逐任务执行 → 收尾多维审查 → 合并与总结。

**默认串行范式**：**主线程干活、子代理不写码**——实现代码由主线程编写（保证上下文连续与契约一致），子代理只承担审查、探索与复跑验证等分析性任务，不产出实现代码。显式选择 executing-plans-parallel 的 implementer 为已批准例外，主线程仍独占进度与合并。

**开始时声明**：「我正在使用 executing-plans skill 执行实施计划。」

## Checklist

必须为以下每一项创建任务（Claude Code 用 `TaskCreate`，Codex 用 `update_plan`）：

1. **载入并批判性审阅计划** — 有疑虑先提出；开工前过执行确认门
2. **隔离工作区** — 执行计划的任务 0（纪律遵循 using-git-worktrees）
3. **逐任务执行** — TDD + 每任务提交 + spec 自检，连续执行
4. **收尾审查** — 多维 fan-out + 对抗复核 + completeness critic；按验收矩阵触发 acceptance-qa
5. **审查处置与交付对账** — 例外驱动：零发现且全 DELIVERED 静默通过；否则一次性征询修复与裁决
6. **合并与总结** — 执行计划的最终任务（合并与清理，含 sync_commit 锚定），回写 roadmap 状态（如属），输出总结

## 阶段 1：载入并批判性审阅计划

1. 读取计划（格式嗅探）：`plan/tasks/` 子目录存在 → 分文件形态（全部新生成计划的唯一形态），按下文「渐进加载与断点恢复」节渐进加载（启动只读、按需读任务文件）；不存在 → 存量单文件形态，按 `.spec-dev/YYYY-MM-DD-NN-<feature>/plan/*-plan.md` 原样一次性读取计划全文与同特性目录 `spec/<feature>-design.md`（旧命名 `YYYY-MM-DD-<feature>` 目录按原样读取）。**该读分支为冻结侧**——后续流程演进不再为其新增条款，仅维持既有语义。产物仍在历史位置 `docs/YYYY-MM-DD-<feature>/` 时，默认先自动迁移到 `.spec-dev/` 再执行（有 `scripts/spec-dev/migrate-to-spec-dev.mjs` 则运行之，否则 `git mv` 等效迁移并重写文件内路径引用），迁移单独提交
2. 批判性审阅：步骤有歧义？接口块互相矛盾？与代码库现状不符？——**有疑虑先向用户提出，别带着疑虑开工**
3. **执行确认门**：向用户呈现执行摘要（计划入口、任务数与依赖拓扑、将创建的 worktree 分支名）并确认开始——用户本轮已显式指示执行（如"执行这份计划"）或经 writing-plans 交接确认的，视为已确认、不重复问
4. 把计划任务注册进任务管理（每任务一条，`T{n}: 任务名` 命名），进入阶段 2

### 可选并发与任务边界切换

默认串行不变。分文件计划有合法 parallel 声明、导航拓扑至少存在两个无相互依赖路径且写集合/资源可隔离的实施票时，可以提议 executing-plans-parallel；只有用户明确选择才委托。共同 T00 不影响入口资格，实际派发等依赖 completed。普通「继续」不构成新的并发选择；已提交 progress.execution.mode=parallel 时进入该 skill 的恢复入口，先定位原集成工作区与锁，不从旧来源副本重新调度。

用户在串行票中途要求切换时，先按 executing-plans-parallel 协议保存 request_id/授权到 notes 并单独提交，当前票由主线程继续完成；其完成检查点干净可核验后，复用原隔离 worktree 检查剩余资格并委托，不重做 T00。原始审查基线保持不变；模型表、特性锁与激活检查点顺序由该 skill 定义。条件不足继续已授权串行，缺声明不自动改计划；恢复先读取已提交请求，不丢失授权或重派半成品。

并发分支完成全部实施票集成后回到本 skill 阶段 4—6。只有该分支的 implementer 可以写获准代码，其他探索/审查子代理继续只读。存量单文件按现有冻结分支执行，不新增并发元数据。

**恢复入口**：会话开始即发现未完成的 progress.yaml（或单文件计划有未勾选步骤）且用户要求继续 → 走「渐进加载与断点恢复」节的恢复流程（校验一致性 → ready 任务续跑），不从任务 0 重来。


### 渐进加载与断点恢复（分文件形态＝全部新计划）

- 启动只读：`index.md` + `progress.yaml`（+ 同特性目录 spec）。**不读任何 tasks/ 正文**。
- 执行 TN 时只读：`tasks/TN.md` + 导航表中 TN 依赖行的「产出接口」列。不提前读无关后继任务正文。
- 普通任务完成条件（全部满足才置 completed）：依赖全 completed、适用 TDD/纯重构步骤完成、测试通过、commit 可解析、接口块与导航表一致、progress.yaml 已原子更新并随任务提交。含组成员/验证票的完成与 ready 由 integration-groups 定义；本票操作已保存不等于 completed。
- 偏差处理沿用主文件三级纪律；契约级偏差冻结受影响后继（导航表依赖闭包），修订 index 接口行与相关任务文件后再继续。

**恢复执行（resume）**——检测到 `progress.yaml` 存在且有非 completed 任务时：
1. 校验一致性：worktree/分支存在、`current`/completed 各任务的 commit 可 `git cat-file -e` 解析、progress 引用的任务文件都存在。任一不成立 → 停下向用户报告不一致，不猜测继续。
2. 普通分支从下一 ready 任务（依赖全 completed 的最小编号 pending）续跑；组分支消费 plan-state 的 ready_tasks 并按 integration-groups 恢复。同前只读该任务文件与依赖接口行。
3. 恢复不重跑已 completed 任务的测试（最终任务的全量验证是安全网）。

**存量单文件的轻量恢复（兼容分支）**：单文件计划无 progress.yaml——按复选框判读：首个含未勾选步骤的任务即续跑点；勾选状态与 git log 的 `feat(TN)` 提交对照，不一致时以提交为准并报告。

## 集成组分支

涉及集成组的进入、组员检查失败、调度或恢复时，先读 [integration-groups.md](references/integration-groups.md)，再应用该分支；不要先套普通票的 ready/completed 规则。进入组前检查的是整组全部外部前置，组首单票 ready 不足以开工。组内意外局部失败使成员与组 blocked；修复后成员恢复待验，全部成员待验后才执行组验证。恢复时先处理尚未待验的成员，不能仅因当前票已待验就直接跳到验证。

含组的 v2 先使用 plan-index 和 plan-state 协议检查，按 [integration-groups.md](references/integration-groups.md) 执行主线程独占、待验、组验证与恢复。无组 v1/旧单文件保持原分支。每个状态边界以已提交检查点为准，组内 awaiting_verification 只允许本组显式依赖消费；组外等验证票 completed。组验证是阶段 3 的普通执行类型，不与阶段 4 的 acceptance-qa 任务混淆。

## 阶段 2：隔离工作区

执行计划的任务 0（建立隔离工作区）——完整纪律遵循 using-git-worktrees skill（已隔离检测、原生工具优先、git 降级、基线测试验证），分支名对齐计划（如 `plan/2026-07-03-export-report`）。计划缺任务 0（旧版计划）时，直接调用 using-git-worktrees 补齐同等效果。基线验证范围遵循计划头部「相关测试范围」声明（判据见 using-git-worktrees Step 3 与 writing-plans 任务 0 模板）；旧版计划无该节 → 按全量执行。

**降级**：非 git 仓库或无法建立隔离时，按 using-git-worktrees 的既有纪律记录并处理；来源分支受保护不是原地实施理由，仍在隔离特性分支工作。交付与权限遵循 references/delivery-channels.md，策略无法查询时记未知。


## 阶段 3：逐任务执行

下面普通票流程不对集成组成员强行标 completed；到组入口时按 integration-groups 完成整组（含独立组验证任务），组成功后回本流程。纯重构使用 TDD 的前后保护步骤，不伪造失败。

任务 0 已在阶段 2 完成，计划的验收任务（如有）留待阶段 4、最终任务（合并与清理）留待阶段 6——两者都不参与本阶段连续执行；对其余每个任务（任务 1 起），按序：

1. **标记 in_progress**，严格按计划步骤执行——计划已是 bite-sized 步骤，照做；TDD 循环遵循 test-driven-development skill（有效红→最小实现→绿）；写测试前直接消费获批 seam，存量只允许唯一提取并记录来源，缺失/冲突走主线程偏差处理。按 test-strategy 使用已有适用快检，仍执行目标测试与全部必需验证；重构候选交收尾
2. **commit**：任务完成即提交（message 对齐编号：`feat(T3): xxx`）；非 git 仓库跳过并注明
3. **spec 自检**（主线程，不派子代理）：对照本任务在计划中的验收标准重读本任务 diff，只查两件收尾审查不覆盖的事：
   - **over/under-building**——写了任务没要求的代码？漏了任务要求的产出？
   - **契约锚定**——本任务确立的契约（函数签名/数据结构/API 形态）与计划接口块一致？会不会被后续任务隐式重新解释？

   发现即就地修正并补提交（或 amend）。**禁止在此猎 bug、查风格、查规范**——那是阶段 4 的活，重复只造噪音与虚假安全感
4. **标记任务 completed**，进入下一任务（分文件形态原子更新 progress.yaml 并随任务提交——progress.yaml 是唯一状态源；存量单文件计划沿用其复选框勾选）

**资源登记**：执行中创建了计划未预登记的持久资源（容器、测试库/表、临时目录、后台服务）时，当场登记进 progress.yaml 的 `resources` 键（writing-plans 的资源台账规范定义点；计划任务文件不被编辑）、不延迟到收尾补记；执行**存量单文件计划**时就地编辑其最终任务内嵌的台账行（该侧冻结）。

**连续执行**：任务之间不停下来向用户汇报或请示——用户已经确认过计划。仅三种情况停下：无法自行解除的 BLOCKED、真正阻断前进的歧义、全部任务完成。

**偏差处理**（三档）：

- **小偏差**（路径笔误、步骤缺失但意图明确）→ 就地修正，在最终总结中记录
- **契约级偏差**（接口/数据结构与计划不符且影响后续任务）→ 停下向用户确认修正方向，不猜着改；卡在子问题想不清时可切 exploring skill 想透再回来，洞见按其归位表回填（设计决策→修 spec 并请用户 review、新任务→补进 plan）
- **意图级偏差**（真正要做的已是另一件工作：意图变了、范围爆炸如"修登录 bug"变成"重写认证"、或原计划可独立标记完成而新工作自成一体）→ 停下建议收尾当前计划，新工作另起特性目录走 requirement-analysis——**更新保留上下文，新起提供清晰**；收尾废弃计划时，若其 spec 已激活并已打出 Superseded-pending 标注，一并回收（删除旧 spec 上的 pending 行）并在最终总结注明

## 阶段 4：收尾审查

全部任务完成后，编排独立代码审查。完整编排（维度定义、伪代码、契约校验、Codex 降级）见 [review-orchestration.md](references/review-orchestration.md)，要点：

- **审查范围**：worktree 分支上本计划的全部变更（`git diff <base>...HEAD`）
- **维度派发**：路数、各档 S 覆盖、D 的证据触发及容量不足分批均以 review-orchestration「维度与路数」为唯一规则；预检基线/diff/契约来源后派发全部选定维度，不在此复制路数表。
- **契约校验**：每份报告落盘后 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" review-findings <file>`；校验失败发回补全一次，再失败主线程接管（定义见 exploration-patterns「输出契约与校验」）
- **loop-until-dry**：去重后无新发现即停（最多 2 轮）；高/中严重性发现逐条派独立子代理对抗复核（指令=试图反驳）
- **completeness critic**：一个子代理检查现行文件/Scenario 的审查与测试覆盖，已取代项排除；S 判实现偏差，critic 查证据缺口，已审零发现不等于未审。未完成补查不能因零 confirmed 而当全交付，具体收口沿共用编排。
- **acceptance-qa**：计划含验收任务、或 spec 验收矩阵含「验收任务」行时，触发 acceptance-qa skill 按矩阵执行（输入=spec 路径+计划验收任务+本次变更文件清单+证据目录 `acceptance/`）；旧版计划无矩阵时，变更涉及 UI 即按其验收点触发。验收结论并入审查报告

## 阶段 5：审查处置与交付对账

**交付对账初判**（主线程）：依据 completeness critic 的覆盖缺口、任务完成记录与验收结果，逐条 Requirement 生成初判；实施中经用户确认补入的计划外行为记 ADDED-IN-FLIGHT（spec 已随偏差处理修订，此处只记账）。

**例外驱动的停顿门**（审查与对账共用一道门）：

- **零 confirmed 发现且全部 DELIVERED**（常态）→ 输出覆盖声明与对账计数，直接进入阶段 6——没有要用户决策的事，不停顿
- **存在 confirmed 发现或非 DELIVERED 嫌疑项** → **一次性征询**：按严重性分组展示发现 + 列出待裁决 Requirement（补做→回阶段 3 补任务 / DEFERRED 记一句原因 / DROPPED 记一句原因 / SUPERSEDED 记后继 spec 指向——契约已移交后继、行为仍存在时用此裁决，与"不再交付"的 DROPPED 区分）——哪些值得修、什么没交付是用户的优先级决策，不自动修复、不擅自定稿

沿已有授权在 worktree 内处置：行为缺陷先写复现失败测试；纯重构按 test-driven-development「收尾纯重构」记录前后绿，缺保护先补刻画，不伪造红。修复后受影响维度复审一次；裁决结果即对账定稿。

## 阶段 6：合并与总结

分文件计划的本地/PR 交付统一遵循 [delivery-channels.md](references/delivery-channels.md)。ready 不等于已合并；尚 awaiting_merge 时最终任务与 roadmap 保持未完成，不提前 sync_commit。存量单文件保持原读取与记录形态。

1. 审查与对账定稿后，**合并前在 worktree 内落盘并提交**：对账结果写入特性目录 `acceptance/acceptance-report.md` 的「Requirement Reconciliation」节——全绿一行带过，有偏差才展开差量表；acceptance-qa 未触发的特性按模板新建仅含头部与该节的轻量报告（一次交付一份时点记录）。DEFERRED / DROPPED 同时在 spec 原位标注（形制见 spec 模板行为规范节）；SUPERSEDED 的原位标注即取代机制的 Requirement 级 `Superseded` 标注（形制见 spec-template「取代标注形制」节，含后继指向）；DELIVERED 不标
2. 执行计划的最终任务（全量验证——范围外失败的归属裁决与测试退役检查按 writing-plans 最终任务模板执行 → **取代回写**（按 spec 取代与共存节执行翻转/标注/covers 接管核对；`supersedes` 为空——缺失或空数组——则跳过） → 合并回来源分支 → 按资源台账逐条清理（合并前核对归属与清理计划；合并后核验资源实体、逐条清理并保存实际结果，复用资源移交原机制） → **sync_commit 锚定**：合并后主工作区 HEAD 写入 spec frontmatter 并单独提交；原生工具建的隔离用原生方式退出）；计划缺最终任务或缺锚定步骤（旧版计划）时按同等步骤（含取代回写）手工收尾；非 git 仓库跳过锚定并注明
3. **roadmap 状态回写（仅当 `.spec-dev/roadmaps/` 下某 active roadmap 引用本特性目录）**：把对应子项目行状态置 `delivered` 并提交，同时在该子项目的上下文胶囊追加一行「留给后继的注意事项」（交付摘要、接口变化、给下一子项目的提醒）；全部子项目已 delivered/dropped 时把该 roadmap frontmatter 的 `status` 翻 `done`。目录不存在或查无引用 → 跳过，零动作
4. 输出总结：
   - **成果清单**：完成的任务、创建/修改的文件、对账计数（`X DELIVERED / Y DEFERRED / Z DROPPED / S SUPERSEDED / N ADDED-IN-FLIGHT`）
   - **质量指标**：测试数与结果、审查发现数与修复情况
   - **偏差记录**：执行中对计划的就地修正
   - **后续建议**：优化点、文档更新
   - **roadmap 续接（仅当上一步命中 roadmap 且仍有 pending 子项目）**：列出依赖已满足的下一个子项目，询问「roadmap `<project>` 还有 N 个子项目待做，下一个是 <子项目>，现在开始它的需求设计吗？」（询问时引用下一子项目的胶囊要点，不只报名字）——用户同意后走 requirement-analysis（其 spec 已存在时直接 writing-plans）；不同意则保持 roadmap 现状，随时可续

## Red Flags

- "计划有点问题，我猜着改吧" → 契约级偏差停下问用户
- "计划在手，直接开工" → 执行确认门：显式指示或交接确认之外，先获用户点头
- "这个任务简单，跳过测试" → TDD 铁律无例外
- "每完成一个任务都汇报一下" → 连续执行，别打断用户
- "spec 自检时顺便找找 bug" → 自检只查 over/under-building 与契约锚定
- "审查发现直接修了" → 先征询用户处理方式
- "没做完的 Requirement 含糊带过" → 对账逐条裁决，DEFERRED/DROPPED/SUPERSEDED 必须记原因（SUPERSEDED 记后继指向）并回写 spec
- "零发现且全 DELIVERED 仍停下征询" → 例外驱动：没有要决策的事就静默进入合并，总结带一行计数
- "改动不大，审查跳过吧" → 收尾审查是强制步骤，规模只影响维度数
- "自己写的代码自己看一遍就行" → 审查必须由独立子代理承担
- "子项目交付了，roadmap 回头再更新" → 交付即回写 delivered 并提示续接，否则剩余子项目无声搁浅
