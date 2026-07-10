# 收尾审查编排（阶段 4）

> **阅读时机**：executing-plans 全部任务完成、进入收尾审查前。

## 编排伪代码

每个编排动作前用一句话告知用户进度。

```
DIMENSIONS = 按变更规模选维度（<100 行: [A]；常规: [A,B,C]；大变更/用户要求彻底: 5 路，见下）
seen = []        # 已见发现集合（含被否决的），按 file:line+category 去重

repeat (最多 2 轮):
  # fan-out：单条消息内并行派出全部维度（每维度一个 code-reviewer 子代理）
  #          分批发起会退化为串行，丧失并行收益
  reports = parallel for d in DIMENSIONS:
      Agent(code-reviewer, 范围=git diff <base>...HEAD, 维度=d,
            输出=review-findings 契约 JSON，落盘到临时目录)
  # 契约校验：每份报告落盘后运行
  #   node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs review-findings <file>
  #   失败 → 把 errors 清单发回该子代理补全一次；再失败 → 主线程接管该维度
  # pipeline 优先：单维度报告校验通过即可进入复核，无需等齐所有维度——
  #   仅当去重需要跨维度信息时才等待
  fresh = dedupe(所有 findings, against=seen)
  if fresh 为空: break          # loop-until-dry：枯竭即停
  seen += fresh                  # 复核否决的也留在 seen，防止下轮重现
  # 对抗复核：仅 severity ∈ {高, 中}，每条派 1 个独立子代理，指令为
  #   "试图反驳此发现：给出 file:line 证据证明它不成立或属误报；
  #    无法证实存在即判误报"
  confirmed += [f for f in fresh if 复核(f) == 成立]

# completeness critic（1 个子代理）：
#   "对照本次变更文件清单与维度表，哪些文件/风险面没有被任何发现覆盖？
#    对照 spec 行为规范的 Requirement 清单，哪些 Requirement/Scenario
#    没有任何测试或发现覆盖？
#    哪些维度的 coverage_note 声明了截断？" → 输出并入报告"覆盖声明"节
```

## 审查维度（与 code-reviewer agent 的维度定义一致）

- **维度 A：功能正确性** — Bug、逻辑错误、空值/边界/竞态/资源泄漏/异常处理；含测试结果独立验证（重跑本次变更涉及的测试，不采信实施者自报告——声称通过但无法复现即为高严重性发现）
- **维度 B：代码风格和质量** — 命名、可读性、复杂度，含 DRY/重复代码与抽象恰当性
- **维度 C：项目规范遵循** — 规范文件约定、架构模式，含优先使用项目已有工具与模式

**5 路扩展**（仅大变更）：B 拆出「简洁性/DRY」、C 拆出「项目约定与抽象」各自独立成路——对小型变更是浪费。

## 派发规则

- **小 diff（<100 行）**：只派 1 路（维度 A 为主、顺带 B/C 显著问题）
- **常规**：派 3 路，分别聚焦 A/B/C
- **大变更 / 用户要求"彻底/全面/审计"**：5 路

每路给定：审查范围（base..HEAD 区间）、聚焦维度、输出契约与落盘路径、计划文件路径（供对照验收标准）。

## 失败隔离

某维度子代理失败 → 缩小该维度范围重试 1 次 → 仍失败则主线程接管该维度，其余维度流水线不受影响。

## acceptance-qa 联动

计划含验收任务、或 spec 验收矩阵含「验收任务」行时，在维度审查之外触发 acceptance-qa skill 按矩阵执行——输入为 spec 路径、计划验收任务、本次变更文件清单与证据目录（特性目录 `acceptance/`）；acceptance-qa 按变更面裁剪矩阵行（裁剪写入其 coverage_note），Tier A 检查项直接引用 spec 中的 Scenario（GIVEN/WHEN/THEN 即验收步骤），发现失败项时自动追加诊断。旧版计划无矩阵时，变更涉及 UI（页面、组件、样式、前端交互）即按其验收点触发。acceptance-qa 报告（含 Requirement 覆盖对照）并入审查报告。

## 报告与处置

1. confirmed 发现按严重性分组（高/中/低），每条含 file:line、描述、影响、建议修复
2. 并入 completeness critic 的覆盖声明与 acceptance-qa 报告（如有）
3. 向用户征求处理方式——不自动修复；用户确认后修复走 TDD（先写复现测试），修复后受影响维度复审一次

## Codex 降级形态

- 派发：`spawn_agent` 并继承主会话上下文（`fork_turns: "all"`；参数的新旧版本兼容见 requirement-analysis 的 [codex-compat.md](../../requirement-analysis/references/codex-compat.md)；同样单响应一次性发起），`wait_agent` 收集
- 对抗复核降级为**单 critic 串行版**——每条高/中发现由一个复核 agent 顺序反驳（Codex 子代理并发能力弱于 Claude Code，串行换取确定性）
- 契约校验命令相同（校验器随插件分发在 `scripts/validate-output.mjs`）
