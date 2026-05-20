---
description: 管理跨会话、可恢复、可验收、可归档的 spec 生命周期工作流
---

# Spec Flow

使用这个命令管理一个长期任务的 spec 生命周期。
工作流始终围绕 `explore -> plan -> implement -> accept -> archive` 五个 action。

## First Principles

- 把 `/spec-flow ...` 作为唯一用户入口。
- 把 `.specs/bin/spec-flow.mjs` 作为唯一状态写入器。
- 永远不要手改 `.specs/registry.json` 或 `progress.json`。
- 让 markdown 文档承载业务内容，让 runtime 只负责状态与目录。

## Runtime Bootstrap

在执行任何会持久化状态的操作前，先检查：

1. `.specs/` 是否存在。
2. `.specs/bin/spec-flow.mjs` 是否存在。

如果不存在，执行以下流程：

1. 创建 `.specs/bin/`、`.specs/active/`、`.specs/archive/`。
2. 将 `skills/spec-flow/assets/runtime/spec-flow-runtime.mjs` 复制到 `.specs/bin/spec-flow.mjs`。
3. 运行：

```bash
node .specs/bin/spec-flow.mjs init
```

只有 `/spec-flow init`、首次使用、或 runtime 缺失/损坏时才执行上面这套 bootstrap。

## Command Router

### `/spec-flow init`

- 初始化 `.specs/` 和 runtime。
- 输出 runtime 路径、registry 路径，以及是否新建。
- 不创建 spec。

### `/spec-flow explore ...`

- 读取当前任务描述和工作区上下文。
- 优先做本地探索；必要时再做外部研究。
- 输出探索摘要、约束、未决问题和建议下一步。
- 如果用户显式要求保存探索结果，或命令参数中带 `--draft`，则：
  1. 先确保 runtime 已就绪；
  2. 调用 `new --mode draft` 创建最小 spec；
  3. 将 `currentAction` 设为 `explore`，`runState` 设为 `completed`。

### `/spec-flow plan [spec-id]`

- 读取已有探索结果或当前上下文。
- 对复杂任务做深度分析。
- 展示方案摘要、关键决策、风险和实施步骤。
- 在用户确认前停止，不写入正式 spec。
- 用户确认后：
  - 新任务：调用 runtime `new`；
  - 现有任务重大修订：调用 runtime `amend`。
- 使用 `skills/spec-flow/assets/spec-template.md` 与 `skills/spec-flow/assets/plan-template.md` 生成或覆盖文档。
- 文档写完后调用 runtime `checkpoint` 把状态更新为 `plan/completed`。

### `/spec-flow implement [spec-id]`

- 读取 `spec.md`、`plan.md`、`progress.json`。
- 从当前 step 或下一个待执行 step 开始。
- 每完成一个 step 就调用 runtime `checkpoint` 更新当前进度。
- 遇到阻塞时写 `blockedReason` 并更新为 `paused` 或 `blocked`。
- 发现重大偏差时，不要继续硬做；回到 `/spec-flow plan`，重写文档并调用 `amend`。
- 实施完成后建议进入 `/spec-flow accept`。

### `/spec-flow accept [spec-id]`

- 读取 spec、plan、产物和可运行证据。
- 优先使用 `spec-acceptance-reviewer` 做独立验收。
- 使用 `skills/spec-flow/assets/acceptance-report-template.md` 生成 `acceptance-report.md`。
- 调用 runtime `accept` 写入结果。
- 结果映射：
  - `pass` -> 建议 `/spec-flow archive`
  - `changes_required` -> 回到 `/spec-flow implement`
  - `blocked` -> 保持在 `accept`

### `/spec-flow archive [spec-id]`

- 读取 spec、progress 和验收报告。
- 先生成并展示 `archive-summary.md`。
- 若未通过验收且用户未明确要求强制归档，则停止并解释原因。
- 用户确认后调用 runtime `archive`。

### `/spec-flow status [spec-id]`

- 无 `spec-id` 时列出所有活跃 spec。
- 有 `spec-id` 时显示该 spec 的 action、runState、完成度、验收结果和建议下一步。

### `/spec-flow resume [spec-id]`

- 读取 `progress.json` 的 `resumePoint`。
- 无 `spec-id` 时优先恢复 `in_progress`、`paused`、`blocked` 的 spec。
- 输出恢复点、当前 action 和建议命令。

## Internal Runtime Calls

所有内部调用都遵循 `skills/spec-flow/references/command-contract.md` 中定义的 CLI 约定。

常用示例：

```bash
node .specs/bin/spec-flow.mjs new --title "用户认证系统" --domain software
node .specs/bin/spec-flow.mjs checkpoint --spec-id spec-20260409-001 --action implement --run-state in_progress --current-step B.3 --completed-steps A.1,A.2,B.1,B.2 --completion-percent 45 --resume-action implement --resume-step B.3
node .specs/bin/spec-flow.mjs accept --spec-id spec-20260409-001 --result pass --report-path .specs/active/spec-20260409-001/acceptance-report.md
```

## References

- Action guide: `skills/spec-flow/references/action-explore.md`
- Planning guide: `skills/spec-flow/references/action-plan.md`
- Implement guide: `skills/spec-flow/references/action-implement.md`
- Acceptance guide: `skills/spec-flow/references/action-accept.md`
- Archive guide: `skills/spec-flow/references/action-archive.md`
