# Accept Action

## Goal

在独立上下文中验证产物是否满足 spec，并给出 `pass`、`changes_required` 或 `blocked` 结论。

## Principles

- findings-first
- 证据优先
- 覆盖检查明确
- 实现者不自评

## Acceptance 编排

输入 = `spec.md` + `plan.md` + 产物 + `progress.json` 中的 `evidence[]`（implement 阶段用 `--evidence` 登记的证据，直接消费，避免重复收集）

**前置判断（浏览器类验收）**：spec.md 的验收标准含 UI/页面/交互/浏览器类条目时，先建议运行 browser-qa（Layer 2，必要时 +Layer 1）收集证据，报告与截图存入 `.specs/active/<id>/evidence/browser/`，再进入下方编排——浏览器证据由专门工作流收集比验收 agent 临时操作浏览器更可靠。browser-qa 未安装或不适用时跳过此步，验收照常进行（建议而非硬依赖）。

```
1. findings = Agent(spec-acceptance-reviewer, 输入,
                    输出=acceptance-findings 契约 JSON 落盘 + markdown 报告)
   校验: node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs acceptance-findings <file>
         失败 → 把 errors 清单退回该 agent 补全一次
         再失败 → 结论直接置 blocked（理由：验收输出不可靠，缺乏可信结构化结论）

2. 对抗复核 skeptic（杀误报；仅 CRITICAL 与 MAJOR）:
   for f in findings.findings where severity in {CRITICAL, MAJOR}:
       verdict = Agent(独立复核, "试图反驳：给出证据证明该问题不存在或不影响
                       spec 条目；无法证实即维持原判")
       被反驳成立 → 从 findings 移除并记录到复核日志（报告附录）

3. coverage critic（抓漏报；1 个子代理，方向与 skeptic 相反）:
   "逐条检查 coverage 中 status=pass 的 spec 条目：evidence 是否真实支撑？
    哪些 spec 条目没有出现在 coverage 里？"
   → 不达标条目降级为 partial/fail，遗漏条目补入 coverage

4. 结论规则（保持现有）:
   无 CRITICAL 且无未接受的 MAJOR 且核心条目全覆盖 → pass
   - "已接受的 MAJOR" 定义：用户在对话中明确表示接受该风险的 MAJOR finding，
     记入报告 accepted_risks（finding 引用、accepted_by=user、理由）；
     未走此流程的 MAJOR 一律视为未接受
   - 其余映射见下方 Result Mapping

5. 用最终 findings 填 acceptance-report-template.md（含 Accepted Risks 节）

6. node .specs/bin/spec-flow.mjs accept --spec-id ... --result ... --report-path ...
```

**降级路径**：当前环境不支持子代理委派时，单线程模拟独立验收（SKILL.md 既有规则），其中复核步骤改为"主进程换一个反驳视角自查每条 CRITICAL/MAJOR"，并在报告中注明"复核为同线程模拟"——读者需要知道复核独立性的真实水位。

## Result Mapping

- `pass`:
  - `currentAction = accept`
  - `runState = completed`
  - 下一步建议 `archive`
- `changes_required`:
  - `currentAction = implement`
  - `runState = in_progress`
  - 必须带问题清单和修复建议
- `blocked`:
  - `currentAction = accept`
  - `runState = blocked`
  - 必须说明阻断原因和缺失证据

## Acceptance Standard

优先使用规则判断，而不是总分：

- 无 `CRITICAL`
- 无未接受的 `MAJOR`（接受流程见编排第 4 步）
- 核心 spec 条目全部覆盖
- 未覆盖项必须记录
