# clarifying-skill 验收报告

**验收对象**：分支 `worktree-plan+2026-08-05-clarifying-skill`，HEAD `f2fd90c`（基点 `ce5093a`，共 5 个任务提交）
**Spec**：`.spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md`
**执行方式说明**：原计划由 acceptance-qa 子代理执行；因推理网关持续 520 故障（两轮子代理派发均失败），按降级纪律由主线程执行全部矩阵行（均为确定性静态检查，命令与证据如下）。独立性降级已如实记录。

## 验收矩阵结果

| # | Scenario / 检查项 | 结果 | 证据 |
|---|-------------------|------|------|
| 1 | 一次一题 / 事实自查 / 上游未定不问下游（eval 存在且语义一致） | PASS | evals.json 含 cl-one-question-at-a-time、cl-facts-self-research、cl-dependency-order，断言与 spec Scenario 逐条对应 |
| 2 | 就此结束零产物 / 写入 md 复用 explorations | PASS | cl-three-exits-no-forced-output 断言含"零新增文件"与 `.spec-dev/explorations/<topic>.md` |
| 3 | 被引用不触发出口 | PASS | cl-referenced-mode-no-exits 断言含"不呈现共识摘要、不出现三出口" |
| 4 | 用户催促直接做（澄清中不实施） | PASS | cl-hard-gate-no-implement 断言含 HARD-GATE 拒绝实施 |
| 5 | 转主流程不重问已澄清问题 | PASS | SKILL.md:43 出口 1 明确写有"已裁决过的问题不在下游重问" |
| 6 | 改造后语义等价（两引用方） | PASS | 对照表见下节 |
| 7 | Codex 规范节完备（四点） | PASS | SKILL.md:60-63 覆盖对话提问 / sequential-thinking 降级 / 禁网降级 / 落盘失败处理 |
| 8 | 发布面同步完整 | PASS | clarifying 出现于 .claude-plugin/plugin.json(2)、marketplace.json(1)、.codex-plugin/plugin.json(4)、README.md(2)、README.zh-CN.md(2)；`.agents/plugins/marketplace.json` 不含 skill 清单，零动作正确；五个 JSON 全部解析合法 |

补充核查：三校验脚本（check-plugin --codex-validate / validate-skills / check-openai-sync）全绿（11 skills）；语言协议块与套件既有文本逐字一致；全部新文件无损坏字符。

## 语义等价对照表（矩阵行 6）

**requirement-analysis 阶段 3（改造前 → 改造后归属）**：

| 改造前条目 | 改造后归属 |
|-----------|-----------|
| 一次只问一个问题 | 引用句"一次只问一个问题"（clarifying 核心纪律第 1 条展开语义一致） |
| 先探索后提问 | 引用句"事实自查决策交用户" |
| 按决策依赖排序 | 引用句同名保留 |
| AskUserQuestion 工具行 + Codex 指引 | 引用句括注 + "Codex 逐题提问规范见 clarifying 内嵌 Codex 规范节"；三道门指引仍指 codex-compat.md |
| 优先覆盖清单 | 原样保留（bullet 1） |
| 术语挑战 | 引用句"术语挑战" + 保留 bullet 2（术语表落盘联动） |
| 不编造问题 | 引用句"无疑点则明确记录……后进入阶段 4" |
| 视觉预览（JIT）段 | 逐字保留 |
| 回补探索段 | 逐字保留 |

**quick-fix 步骤 3**：首段改引用（一次一题/选择题优先/事实自查语义保留），三类核心确认逐字未动；Codex 映射表仅"用户澄清/确认"行更新指向。均无新增约束。

**codex-compat.md**：提问规范节裁剪后，逐题纪律指向 clarifying，三道门呈现要求保留——与 SKILL.md 阶段 3 新文本互相印证、无矛盾。

## Requirement Reconciliation

全部 8 条 Requirement（ADDED 6 + MODIFIED 2）均 DELIVERED：**8 DELIVERED / 0 DEFERRED / 0 DROPPED / 0 ADDED-IN-FLIGHT**。

计划内偏差（不影响交付判定）：marketplace.json 登记由 T5 前移至 T1 提交（pre-commit 校验器强制 skills[] 与磁盘同步）；worktree 分支名为原生工具命名 `worktree-plan+2026-08-05-clarifying-skill`（计划为 `plan/2026-08-05-clarifying-skill`）。
