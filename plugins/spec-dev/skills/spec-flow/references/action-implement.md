# Implement Action

## Goal

按照 `plan.md` 推进当前 spec，并用原子 checkpoint 记录进度和恢复点。

## Loop

```text
读取当前 step
-> 执行工作
-> 验证 step 完成条件
-> 写入 checkpoint
-> 继续或暂停
```

## Do

1. 读取 `spec.md`、`plan.md`、`progress.json`。
2. 找出 `currentStep` 或下一个未完成 step。
3. 完成 step 后写 checkpoint，至少更新：
   - `currentAction`
   - `runState`
   - `currentStep`
   - `completedSteps`
   - `completionPercent`
   - `resumePoint`

   step 涉及可验证产物（测试/命令/构建）时，将输出存入 `.specs/active/<id>/evidence/` 并在 checkpoint 时用 `--evidence "<desc>::<path-or-command>"` 登记——accept 阶段直接消费这些证据，避免验收时重复收集。
4. 如遇阻塞，写入 `blockedReason` 并将 `runState` 设为 `blocked` 或 `paused`。
5. 全部实现完成后，将 `runState` 设为 `completed` 并建议进入 `accept`。

## Change Protocol

### Minor change

满足以下条件时可视为轻量变更：

- 不改变总体目标；
- 不显著扩大范围；
- 不改变核心验收面。

处理方式：

1. 说明原因；
2. 获得用户确认；
3. 更新 `spec.md` / `plan.md`；
4. 调用 runtime `amend`；
5. 继续实施。

### Major change

满足以下任一条件时视为重大变更：

- 改变目标或核心路径；
- 改变关键约束；
- 改变主要验收标准。

处理方式：

1. 暂停当前实现；
2. 回到 `plan`；
3. 重新展示方案；
4. 用户确认后重写文档；
5. 调用 runtime `amend`；
6. 再回到 `implement`。
