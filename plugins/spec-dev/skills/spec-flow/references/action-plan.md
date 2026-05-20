# Plan Action

## Goal

把探索结果收敛成正式 `spec.md` 和 `plan.md`，并在用户确认后把 spec 切换到可实施状态。

## Do

1. 读取探索结果、本地证据和必要的外部资料。
2. 对复杂任务做深度分析，明确范围、风险、验收标准和实施步骤。
3. 向用户展示方案摘要和关键取舍。
4. 在用户确认前，不创建新 spec，也不进入 `implement`。
5. 用户确认后：
   - 新任务：调用 runtime `new` 创建 spec；
   - 已有 spec 的重大修订：重写文档并调用 runtime `amend`。
6. 写入或覆盖 `spec.md` 与 `plan.md`。
7. 调用 runtime `checkpoint`，把 action 更新为 `plan/completed`。

## Minimum Document Requirements

`spec.md` 至少包含：

- 问题定义
- 范围与非目标
- 关键约束
- 验收标准

`plan.md` 至少包含：

- step list
- 风险与缓解
- 依赖与证据
- 何时进入 `accept`

## Decision Rule

- 小变更：允许在现有 spec 上直接更新文档。
- 大变更：必须重新展示方案并调用 `amend` 升版。
- 用户拒绝方案：停留在 `plan` 或回到 `explore`，不要偷偷继续实施。
