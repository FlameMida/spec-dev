# Review A — test-scoping 三 skill 文档变更审查

- 审查对象：`git diff main...HEAD` 中 skills/writing-plans/SKILL.md、skills/using-git-worktrees/SKILL.md、skills/executing-plans/SKILL.md
- 对照 spec：.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md（worktree 内版本）
- 审查者：独立代码审查（只读分析）

## 发现总览

共 2 条发现；最高严重级 **medium**。

---

## 维度 1：正确性（步骤编号与交叉引用）

### 发现 1（medium）— 步骤 1 修复路径的措辞可能绕过步骤 2 退役检���

- 位置：skills/writing-plans/SKILL.md:213（及 :216-217 同款措辞）
- 问题：最终任务步骤 1 中，只有"全绿 → 进入步骤 2"一条路径显式路由到步骤 2（测试退役检查）。范围内失败写"修复后才进入合并"、范围外回归写"修复并复跑通过后才进入合并"——"进入合并"指向步骤 3，字面读法会让修复路径跳过步骤 2。而 spec MODIFIED/ADDED 要求（test-scoping-design.md:81）是"全量验证**通过后、合并前** SHALL 执行测试退役检查"，即所有最终转绿的路径都应经过步骤 2。零上下文执行者按字面走会漏掉退役检查。
- 建议：两处"才进入合并"改为"复跑全绿后进入步骤 2"（或统一为"修复并复跑全绿后，回到本步骤开头重新裁决/进入步骤 2"），使步骤 2 成为合并前的必经节点。

### 其余交叉引用核对（无发现）

- "只执行步骤 1、2 与步骤 5，步骤 3-4 交回原有隔离机制"（writing-plans/SKILL.md:251）：步骤 3=合并、步骤 4=清理确应交回原隔离机制，步骤 1/2/5 保留正确，与新编号一致。
- "全绿 → 进入步骤 2"（:212）指向退役检查，正确。
- 步骤 3/4/5 重编号后正文与编号一致（合并/清理/sync_commit）；"worktree 行即台账首行命令"仍成立。
- executing-plans/SKILL.md:40 引用"using-git-worktrees Step 3 与 writing-plans 任务 0 模板"，两处定位准确（worktrees Step 3 = :100-105；writing-plans 任务 0 步骤 3 = :120-126）。
- spec :115 所写触点"using-git-worktrees Step 3、writing-plans 任务 0 步骤 3"与实际文档步骤序一致。
- 步骤 1 内"（或计划无该节）"归入范围内语义（无条件修复），与 spec MODIFIED 要求"范围内失败仍按既有语义无条件修复"一致。

## 维度 2：三文件一致性

### 发现 2（low）— 声明命令报错回退时，using-git-worktrees 未含"建议修订计划"

- 位置：skills/using-git-worktrees/SKILL.md:103
- 问题：writing-plans 任务 0 步骤 3（:124-125）与 spec Scenario「声明命令执行失败回退全量」（test-scoping-design.md:77）均要求回退时"注明声明已失效、建议修订计划"；using-git-worktrees Step 3 只写"声明命令报错 → 回退完整测试套件并注明"，缺少"声明已失效、建议修订计划"的后半句。两处都是判据原文承载方（executing-plans 同时引用两者），表述不对齐会让走 worktrees 路径的执行者少给用户一个修订提示。
- 建议：:103 补齐为"回退完整测试套件，并注明声明已失效、建议修订计划"。

### 其余一致性核对（无发现）

- 空声明语义一致：worktrees（跳过、报告就绪并注明"纯文档特性，基线测试跳过"，:102-103、速查表 :128）与 writing-plans（跳过并注明，最终任务全量照跑，:123-124）同向；"最终任务全量照跑"只在 writing-plans 出现属合理——worktrees 不承载最终任务语义。
- 判据原文确实只存在于 writing-plans（头部模板 :88-96、任务 0 :123-126、最终任务 :209-225）与 using-git-worktrees（:102-105、:128）；executing-plans 两处（:40、:92）均为引用式表达（"判据见…""按 writing-plans 最终任务模板执行"），未复制判据，符合 spec Scenario「消费方不复制判据」。

## 维度 3：旧版计划回退链

无发现。三处触点齐备：

- skills/writing-plans/SKILL.md:125 "计划无该节（旧版计划）→ 运行完整测试套件，行为与现状一致"
- skills/using-git-worktrees/SKILL.md:104 "无计划或计划无该节 → 运行项目完整测试命令"
- skills/executing-plans/SKILL.md:40 "旧版计划无该节 → 按全量执行"

附加回退句也齐备：最终任务步骤 1 "（或计划无该节）"（writing-plans:213）与步骤 2 "计划无「相关测试范围」节 → 跳过本步骤"（writing-plans:225）。

## 维度 4：与资源台账特性的缝合

无发现。台账块（writing-plans:203-205）与台账总则（:207）原文完好；清理步骤仅重编号为步骤 4，正文（逐条执行、失败保留未勾选、台账外不动）未变；executing-plans:92 的台账清理描述（合并前核对台账全部勾清）未受影响；"牢记"节的预登记要求（:270）仍在。

## 维度 5：环境中立

无发现。本次新增文案（相关测试范围节模板、任务 0 步骤 3 改写、最终任务步骤 1/2、worktrees Step 3 与速查表行、executing-plans 两句引用）均未引用 AskUserQuestion / Agent / EnterWorktree 等 Claude 专属工具；文中 EnterWorktree 出现处均为既有兼容句（writing-plans:116、worktrees:54、:137），不在本次 diff 范围。

---

## 结论

- 发现总数：**2**（medium ×1，low ×1）
- 最高严重级：**medium**
- 总体评价：三文件语义同向、回退链齐备、引用不复制、台账缝合完好；仅步骤 1 修复路径的路由措辞（发现 1）与一处回退提示措辞（发现 2）需微调。
