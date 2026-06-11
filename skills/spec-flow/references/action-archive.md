# Archive Action

## Goal

把一个完成或被明确接受的 spec 生命周期沉淀到 `.specs/archive/`，并留下可回溯总结。

## Preconditions

标准归档要求：

- 最近一次 `accept` 结果为 `pass`；或
- 用户明确接受当前状态并要求强制归档。

## Do

1. 读取 spec、plan、progress 和验收报告。
2. 生成 `archive-summary.md`（基于 `assets/archive-summary-template.md`）并先向用户展示，写出完成项、未完成项、关键决策、变更记录和遗留风险。
3. 若未满足标准归档条件且未 `--force`，停止并说明原因。
4. 调用 runtime `archive` 完成目录迁移和 registry 更新。

## Forced Archive

只有在用户明确确认时才允许：

1. 列出未满足的条件；
2. 标记为 forced archive；
3. 把风险写入 `archive-summary.md`。

## Delay Rule

`accept` 通过后允许延迟归档。
在延迟归档前，重新读取当前产物；若内容明显漂移，先重新执行一次 `accept`。
