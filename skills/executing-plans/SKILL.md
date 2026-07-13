---
name: executing-plans
description: >-
  Execute implementation plans - when a written plan from writing-plans exists (plan/*-plan.md under the feature directory in .spec-dev/): the main thread executes task-by-task in an isolated worktree (TDD + per-task commits + spec self-check), then orchestrates multi-dimension adversarial code review and matrix-driven acceptance. Not for improvised changes without a written plan. / 执行实施计划——当已有 writing-plans 产出的实施计划（`.spec-dev/` 特性目录下 plan/ 子目录的 *-plan.md）、准备动手实现时使用。主线程在隔离 worktree 中逐任务执行（TDD + 每任务提交 + spec 自检），全部完成后编排多维对抗代码审查（code-reviewer 子代理不写码、仅分析与复跑验证），并按验收矩阵触发 acceptance-qa 验收，最终合并总结。不适用于没有书面计划的即兴改动。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

# 执行实施计划

## 概述

载入计划 → 隔离工作区 → 主线程逐任务执行 → 收尾多维审查 → 合并与总结。

**核心范式**：**主线程干活、子代理不写码**——实现代码由主线程编写（保证上下文连续与契约一致），子代理只承担审查、探索与复跑验证等分析性任务，不产出实现代码。

**开始时声明**：「我正在使用 executing-plans skill 执行实施计划。」

## Checklist

必须为以下每一项创建任务（Claude Code 用 `TaskCreate`，Codex 用 `update_plan`）：

1. **载入并批判性审阅计划** — 有疑虑先提出；开工前过执行确认门
2. **隔离工作区** — 执行计划的任务 0（纪律遵循 using-git-worktrees）
3. **逐任务执行** — TDD + 每任务提交 + spec 自检，连续执行
4. **收尾审查** — 多维 fan-out + 对抗复核 + completeness critic；按验收矩阵触发 acceptance-qa
5. **审查处置与交付对账** — 例外驱动：零发现且全 DELIVERED 静默通过；否则一次性征询修复与裁决
6. **合并与总结** — 执行计划的最终任务（合并与清理，含 sync_commit 锚定），输出总结

## 阶段 1：载入并批判性审阅计划

1. 读取计划文件（`.spec-dev/YYYY-MM-DD-<feature>/plan/<feature>-plan.md`）与同特性目录的 `spec/<feature>-design.md`；产物仍在历史位置 `docs/YYYY-MM-DD-<feature>/` 时，默认先自动迁移到 `.spec-dev/` 再执行（有 `scripts/spec-dev/migrate-to-spec-dev.mjs` 则运行之，否则 `git mv` 等效迁移并重写文件内路径引用），迁移单独提交
2. 批判性审阅：步骤有歧义？接口块互相矛盾？与代码库现状不符？——**有疑虑先向用户提出，别带着疑虑开工**
3. **执行确认门**：向用户呈现执行摘要（计划路径、任务数与分组、将创建的 worktree 分支名）并确认开始——用户本轮已显式指示执行（如"执行这份计划"）或经 writing-plans 交接确认的，视为已确认、不重复问
4. 把计划任务注册进任务管理（每任务一条，`T{n}: 任务名` 命名），进入阶段 2

## 阶段 2：隔离工作区

执行计划的任务 0（建立隔离工作区）——完整纪律遵循 using-git-worktrees skill（已隔离检测、原生工具优先、git 降级、基线测试验证），分支名对齐计划（如 `plan/2026-07-03-export-report`）。计划缺任务 0（旧版计划）时，直接调用 using-git-worktrees 补齐同等效果。

**降级**：非 git 仓库、受保护分支未授权、沙箱无写权限 → 原地实施并向用户注明"未隔离"及原因。

## 阶段 3：逐任务执行

任务 0 已在阶段 2 完成，计划的验收任务（如有）留待阶段 4、最终任务（合并与清理）留待阶段 6——两者都不参与本阶段连续执行；对其余每个任务（任务 1 起），按序：

1. **标记 in_progress**，严格按计划步骤执行——计划已是 bite-sized 步骤，照做；TDD 循环遵循 test-driven-development skill（红→绿→重构，每步运行验证）
2. **commit**：任务完成即提交（message 对齐编号：`feat(T3): xxx`）；非 git 仓库跳过并注明
3. **spec 自检**（主线程，不派子代理）：对照本任务在计划中的验收标准重读本任务 diff，只查两件收尾审查不覆盖的事：
   - **over/under-building**——写了任务没要求的代码？漏了任务要求的产出？
   - **契约锚定**——本任务确立的契约（函数签名/数据结构/API 形态）与计划接口块一致？会不会被后续任务隐式重新解释？

   发现即就地修正并补提交（或 amend）。**禁止在此猎 bug、查风格、查规范**——那是阶段 4 的活，重复只造噪音与虚假安全感
4. **勾选计划复选框、标记任务 completed**，进入下一任务

**连续执行**：任务之间不停下来向用户汇报或请示——用户已经确认过计划。仅三种情况停下：无法自行解除的 BLOCKED、真正阻断前进的歧义、全部任务完成。

**偏差处理**（三档）：

- **小偏差**（路径笔误、步骤缺失但意图明确）→ 就地修正，在最终总结中记录
- **契约级偏差**（接口/数据结构与计划不符且影响后续任务）→ 停下向用户确认修正方向，不猜着改；卡在子问题想不清时可切 exploring skill 想透再回来，洞见按其归位表回填（设计决策→修 spec 并请用户 review、新任务→补进 plan）
- **意图级偏差**（真正要做的已是另一件工作：意图变了、范围爆炸如"修登录 bug"变成"重写认证"、或原计划可独立标记完成而新工作自成一体）→ 停下建议收尾当前计划，新工作另起特性目录走 requirement-analysis——**更新保留上下文，新起提供清晰**

## 阶段 4：收尾审查

全部任务完成后，编排独立代码审查。完整编排（维度定义、伪代码、契约校验、Codex 降级）见 [review-orchestration.md](references/review-orchestration.md)，要点：

- **审查范围**：worktree 分支上本计划的全部变更（`git diff <base>...HEAD`）
- **维度派发**（按变更规模）：小 diff（<100 行）1 路；常规 A/B/C 3 路；大变更/用户要求"彻底"时 5 路——单条消息一次性 fan-out `code-reviewer` 子代理
- **契约校验**：每份报告落盘后 `node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs review-findings <file>`，失败退回补全一次，再失败主线程接管该维度
- **loop-until-dry**：去重后无新发现即停（最多 2 轮）；高/中严重性发现逐条派独立子代理对抗复核（指令=试图反驳）
- **completeness critic**：1 个子代理对照变更文件清单与 spec 的 Requirement/Scenario 查覆盖缺口，输出并入报告
- **acceptance-qa**：计划含验收任务、或 spec 验收矩阵含「验收任务」行时，触发 acceptance-qa skill 按矩阵执行（输入=spec 路径+计划验收任务+本次变更文件清单+证据目录 `acceptance/`）；旧版计划无矩阵时，变更涉及 UI 即按其验收点触发。验收结论并入审查报告

## 阶段 5：审查处置与交付对账

**交付对账初判**（主线程）：依据 completeness critic 的覆盖缺口、任务完成记录与验收结果，逐条 Requirement 生成初判；实施中经用户确认补入的计划外行为记 ADDED-IN-FLIGHT（spec 已随偏差处理修订，此处只记账）。

**例外驱动的停顿门**（审查与对账共用一道门）：

- **零 confirmed 发现且全部 DELIVERED**（常态）→ 输出覆盖声明与对账计数，直接进入阶段 6——没有要用户决策的事，不停顿
- **存在 confirmed 发现或非 DELIVERED 嫌疑项** → **一次性征询**：按严重性分组展示发现 + 列出待裁决 Requirement（补做→回阶段 3 补任务 / DEFERRED 记一句原因 / DROPPED 记一句原因）——哪些值得修、什么没交付是用户的优先级决策，不自动修复、不擅自定稿

用户确认后在 worktree 内修复（修复本身同样走 TDD：先写复现测试），修复后受影响维度复审一次；裁决结果即对账定稿。

## 阶段 6：合并与总结

1. 审查与对账定稿后，**合并前在 worktree 内落盘并提交**：对账结果写入特性目录 `acceptance/acceptance-report.md` 的「Requirement Reconciliation」节——全绿一行带过，有偏差才展开差量表；acceptance-qa 未触发的特性按模板新建仅含头部与该节的轻量报告（一次交付一份时点记录）。DEFERRED / DROPPED 同时在 spec 原位标注（形制见 spec 模板行为规范节），DELIVERED 不标
2. 执行计划的最终任务（全量验证 → 合并回来源分支 → 清理 worktree 与分支 → **sync_commit 锚定**：合并后主工作区 HEAD 写入 spec frontmatter 并单独提交；原生工具建的隔离用原生方式退出）；计划缺最终任务或缺锚定步骤（旧版计划）时按同等步骤手工收尾；非 git 仓库跳过锚定并注明
3. 输出总结：
   - **成果清单**：完成的任务、创建/修改的文件、对账计数（`X DELIVERED / Y DEFERRED / Z DROPPED / N ADDED-IN-FLIGHT`）
   - **质量指标**：测试数与结果、审查发现数与修复情况
   - **偏差记录**：执行中对计划的就地修正
   - **后续建议**：优化点、文档更新

## Red Flags

- "计划有点问题，我猜着改吧" → 契约级偏差停下问用户
- "计划在手，直接开工" → 执行确认门：显式指示或交接确认之外，先获用户点头
- "这个任务简单，跳过测试" → TDD 铁律无例外
- "每完成一个任务都汇报一下" → 连续执行，别打断用户
- "spec 自检时顺便找找 bug" → 自检只查 over/under-building 与契约锚定
- "审查发现直接修了" → 先征询用户处理方式
- "没做完的 Requirement 含糊带过" → 对账逐条裁决，DEFERRED/DROPPED 必须记原因并回写 spec
- "零发现且全 DELIVERED 仍停下征询" → 例外驱动：没有要决策的事就静默进入合并，总结带一行计数
- "改动不大，审查跳过吧" → 收尾审查是强制步骤，规模只影响维度数
- "自己写的代码自己看一遍就行" → 审查必须由独立子代理承担
