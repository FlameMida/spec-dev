# Spec Schema

## Directory Layout

```text
.specs/
├── registry.json
├── active/{spec-id}/
│   ├── spec.md
│   ├── plan.md
│   ├── progress.json
│   ├── acceptance-report.md
│   └── archive-summary.md
└── archive/{spec-id}/
```

## `registry.json`

每个 spec 记录至少包含：

- `id`
- `title`
- `domain`
- `status`
- `currentAction`
- `runState`
- `version`
- `acceptanceResult`
- `acceptanceReportPath`
- `completionPercent`
- `createdAt`
- `updatedAt`
- `archivedAt`
- `path`

## `progress.json`

至少包含：

- `specId`
- `title`
- `status`
- `currentAction`
- `runState`
- `version`
- `currentStep`
- `completedSteps`
- `blockedReason`
- `resumePoint`
- `amendments`
- `acceptance`
- `timestamps`

## `spec.md`

至少包含：

1. 问题与目标
2. 约束与范围
3. 探索结论
4. 方案设计
5. 实施计划
6. 验收标准
7. 变更记录

## `plan.md`

至少包含：

1. Action 概览
2. Step List
3. 风险与缓解
4. 依赖与证据

## `acceptance-report.md`

至少包含：

1. Result
2. Scope
3. Findings
4. Coverage Check
5. Evidence
6. Next Action

## `archive-summary.md`

至少包含：

1. Outcome
2. Final Acceptance
3. Key Decisions
4. Amendments
5. Residual Risks
