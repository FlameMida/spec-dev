---
name: spec-flow
description: 管理跨会话、可恢复、可验收、可归档的 spec 生命周期工作流，围绕 explore、plan、implement、accept、archive 五个 action 维护持久化 `.specs/` 状态。用于复杂功能开发、研究任务、运维或流程改造、文档与规范编写等需要长期跟踪、独立验收、变更留痕或后续归档的场景；不适用于一次性小改动、即时问答或无需持久化 spec 的轻量任务。
---

# Spec Flow

用 action-first 的方式维护一个长期任务的 spec 生命周期。
把业务内容写进 `spec.md` / `plan.md` / 报告模板，把状态更新交给工作区 runtime，避免会话中断后丢失上下文。

## Core Model

- 把生命周期固定为 `explore -> plan -> implement -> accept -> archive`。
- 把状态拆成 `status`、`currentAction`、`runState`，不要回退到多阶段大状态机。
- 把 `.specs/registry.json` 和各 spec 的 `progress.json` 视为唯一状态源。
- 把 `spec.md`、`plan.md`、`acceptance-report.md`、`archive-summary.md` 视为业务产物。
- 把 slash command 作为唯一用户入口，把 runtime 作为唯一状态写入器。

## Start Here

1. 检查工作区是否已有 `.specs/bin/spec-flow.mjs`。
2. 如果没有，先执行 `/spec-flow init`，并将 [`assets/runtime/spec-flow-runtime.mjs`](./assets/runtime/spec-flow-runtime.mjs) 落地为工作区 runtime。
3. 根据当前任务选择 action，而不是机械推进阶段。
4. 在需要持久化时，只通过 `node .specs/bin/spec-flow.mjs ...` 更新状态。
5. 在需要模板时，使用 `assets/` 下的模板文件创建或覆盖文档。

## Action Router

### `explore`

- 先收集目标、约束、现有材料和缺口。
- 优先探索本地工作区；只有在本地材料不足、涉及第三方规范或用户明确要求时才做外部研究。
- 需要跨会话保留探索结果时，创建 draft spec，而不是直接跳进 implement。
- 详细规则见 [`references/action-explore.md`](./references/action-explore.md)。

### `plan`

- 把探索结论收敛成正式 `spec.md` 与 `plan.md`。
- 对复杂任务使用深度分析，但在用户确认前不要进入 `implement`。
- 新任务用 runtime `new` 创建 spec；重大修订用 runtime `amend` 升版。
- 详细规则见 [`references/action-plan.md`](./references/action-plan.md)。

### `implement`

- 读取当前 `spec.md`、`plan.md` 和 `progress.json`，从当前 step 或下一个待执行 step 开始。
- 完成一个 step 就写 checkpoint；发现重大偏差就回到 `plan`，不要偷改状态。
- 这个 action 既适用于代码，也适用于文档、研究、流程和运营产物。
- 详细规则见 [`references/action-implement.md`](./references/action-implement.md)。

### `accept`

- 用独立上下文判断产物是否满足 spec，不要让实现者自评。
- 优先使用专门的 `agents/spec-acceptance-reviewer` agent；如果当前环境不支持委派，就在本线程中模拟独立验收并严格遵守 findings-first。
- 写出 `acceptance-report.md` 后，再调用 runtime `accept` 落状态。
- 详细规则见 [`references/action-accept.md`](./references/action-accept.md)。

### `archive`

- 先确认验收结果或用户明确接受强制归档，再生成 `archive-summary.md`。
- 归档动作只通过 runtime `archive` 执行目录迁移和 registry 更新。
- 允许延迟归档；`accept` 通过后不要求同一会话立即归档。
- 详细规则见 [`references/action-archive.md`](./references/action-archive.md)。

## Runtime Rules

- 永远不要手改 `.specs/registry.json` 或任何 `progress.json`。
- 永远不要只在 markdown 中声称某个状态已经变化而不写 runtime。
- 永远让 runtime 处理 spec ID 生成、版本递增、归档迁移和原子写入。
- 每次执行命令前，先看 [`references/command-contract.md`](./references/command-contract.md) 确认 CLI 约定。
- 每次写文档前，先看 [`references/spec-schema.md`](./references/spec-schema.md) 确认最小结构。
- 每次恢复中断工作时，先看 [`references/recovery-rules.md`](./references/recovery-rules.md)。

## Templates And Assets

- [`assets/spec-template.md`](./assets/spec-template.md): 正式 spec 模板。
- [`assets/plan-template.md`](./assets/plan-template.md): 可执行 plan 模板。
- [`assets/acceptance-report-template.md`](./assets/acceptance-report-template.md): findings-first 验收报告模板。
- [`assets/archive-summary-template.md`](./assets/archive-summary-template.md): 归档总结模板。
- [`assets/runtime/spec-flow-runtime.mjs`](./assets/runtime/spec-flow-runtime.mjs): 工作区状态 runtime 模板。

## Tool Strategy

- 本地探索优先读工作区文件。
- 外部研究优先使用 `agents/external-resource-explorer` agent 中定义的流程。
- 第三方库或标准优先使用 `context7`；通用最佳实践优先使用 `exa`；都不可用时再降级到普通搜索。
- 对复杂规划或大幅 amend，优先使用结构化深度思考；不可用时退化为常规深度分析。

## Guardrails

- 把 action 当作当前工作的语义标签，不要把它重新包装成隐式的 11 阶段。
- 让验收结果以问题和证据为中心，不要退化成只给一个分数。
- 让 runtime 只管理状态，不要让它主导业务文档内容。
- 让归档总结保留未完成项、遗留风险和关键变更，不要只写“已完成”。
