# Explore Action

## Goal

理解任务、现有材料、约束和未知项，并判断是否已经具备进入 `plan` 的条件。

## Do

1. 识别产出类型：代码、文档、研究、流程、配置或混合产物。
2. 优先探索本地工作区，确认已有实现、模板、历史决策和依赖材料。
3. 只有在下列情况下再做外部研究：
   - 本地材料不足以支撑方案；
   - 涉及第三方工具、框架、标准或法规；
   - 用户明确要求调研；
   - 需要最新行业实践。
4. 只对会改变方案的关键不确定项发问。
5. 产出探索摘要、已知约束、未决问题和建议下一步。

## Domain Hints

- 代码仓库：读代码、配置、测试和已有文档；需要时复用 `code-explorer`。
- 文档任务：读现有规范、模板、历史文档和目标格式。
- 研究任务：先确认数据源、已有结论、证据质量和时效性。
- 流程或运维任务：读 SOP、runbook、配置、变更记录和告警材料。

## Persistence Rule

- 默认不创建 spec。
- 当任务明显会跨会话继续，或用户要求保存探索结果，或命令参数中带 `--draft` 时，创建 draft spec：
  1. 先确保 runtime 已就绪（缺失时按 command 的 Runtime Bootstrap 流程初始化）；
  2. 调用 runtime `new --mode draft` 创建最小 spec；
  3. 通过 checkpoint 将状态置为下述值。
- draft spec 应满足：
  - `currentAction = explore`
  - `runState = completed`
  - `status = active`

## Suggested Output

```markdown
## Explore Summary
- Goal:
- Current assets:
- Constraints:
- Open questions:
- Recommended next action: plan / continue explore
```
