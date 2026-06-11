# Accept Action

## Goal

在独立上下文中验证产物是否满足 spec，并给出 `pass`、`changes_required` 或 `blocked` 结论。

## Principles

- findings-first
- 证据优先
- 覆盖检查明确
- 实现者不自评

## Do

1. 读取 `spec.md`、`plan.md`、产物和可运行证据。
2. 优先让 `spec-acceptance-reviewer` 执行独立验收。
3. 生成 `acceptance-report.md`（基于 `assets/acceptance-report-template.md`），至少包含：
   - 结果
   - 范围
   - Findings
   - Coverage Check
   - Evidence
   - Next Action
4. 调用 runtime `accept` 写入结果。

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
- 无未接受的 `MAJOR`
- 核心 spec 条目全部覆盖
- 未覆盖项必须记录
