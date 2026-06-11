# Recovery Rules

## Goal

在会话中断后，用最少假设恢复正确的 action 和 step。

## Status Query

`status` 是只读查询命令（不属于五个生命周期 action）：

- 无 `spec-id`：列出所有活跃 spec。
- 有 `spec-id`：显示该 spec 的 `currentAction`、`runState`、完成度、验收结果和建议下一步。

## Selection Order

### 指定了 `spec-id`

1. 优先读取该 spec 的 `progress.json`。
2. 如果状态是 `archived`，只允许查看状态，不允许继续实施。
3. 如果缺失关键文件，先报告不一致，再决定是否人工修复。

### 未指定 `spec-id`

按以下顺序选择目标：

1. `runState` 为 `in_progress`
2. `runState` 为 `paused`
3. `runState` 为 `blocked`
4. `runState` 为 `idle`（已创建但尚未开始执行）
5. `runState` 为 `completed`（前序 action 已完成，可推进下一 action）
6. 以上均无匹配时，选择最近更新的活跃 spec

## Resume Output

至少返回：

- `specId`
- `title`
- `status`
- `currentAction`
- `runState`
- `resumePoint`
- `lastUpdatedAt`
- 推荐下一条 `/spec-flow ...` 命令

## Repair Rule

发现以下情况时，不要盲目继续：

- registry 中有 spec，但目录缺失；
- `progress.json` 的 action 与 registry 不一致；
- 验收报告路径存在，但文件缺失；
- 归档目录和 registry 路径不一致。

处理顺序：先运行 `node .specs/bin/spec-flow.mjs doctor` 获取问题清单与建议；安全项（字段漂移、孤儿目录）用 `doctor --fix` 修复；其余按 suggestedFix 人工处理——不要手改 registry/progress 文件。
