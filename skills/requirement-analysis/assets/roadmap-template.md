# Roadmap 模板（`.spec-dev/roadmaps/YYYY-MM-DD-<project>.md`）

> **Language / 语言**: Fill in the conversation language — all narrative content follows the conversation language at creation; keep structural labels (frontmatter keys, status enums) in English. / 以对话语言填写——叙述性内容跟随创建时对话语言；结构标签（frontmatter 键、状态枚举）保持英文。

> **roadmap 是条件性产物**：仅当范围分解检查判定"一个大目标必须拆成多个子项目"且用户确认拆分方案后创建；单一需求不查、不建、不更新 roadmap。它是分解决策的唯一持久化位置——只活在对话里的子项目清单会随会话结束静默蒸发。
>
> frontmatter 根键是 `spec_dev_roadmap`（区别于 spec 的 `spec_dev`），漂移守卫不解析本文件。状态回写节点：requirement-analysis 写子项目 spec 时置 `in-progress` 并回填特性目录；executing-plans 合并交付后置 `delivered`；用户裁决放弃置 `dropped` 并记一行原因；全部子项目 delivered/dropped 后 `status` 翻 `done`。

```markdown
---
spec_dev_roadmap:
  version: 1
  project: <project-name>
  status: active          # active | done | superseded —— 全部子项目 delivered/dropped 后翻 done
---

# [项目名] Roadmap

## 目标

[整个大目标的一句话陈述，以及为什么值得拆；1-3 句 / The one-sentence goal and why it needs decomposition]

## 分解边界

[按什么边界拆的（独立子系统 / 依赖层次 / 交付里程碑）与一两句理由——让后来者理解切分逻辑，而不是只看到切分结果 / What boundary the split follows and why]

## 子项目

[一行一个子项目，按建议实施顺序排列；每个子项目各自走独立的 spec → plan → 实施周期。
状态枚举：pending / in-progress / delivered / dropped（dropped 在备注记一行原因）。
特性目录在该子项目的 spec 创建时回填。 / One row per sub-project in suggested order; each runs its own spec → plan → execution cycle]

| # | 子项目 | 范围（一句话） | 依赖 | 状态 | 特性目录 |
|---|--------|--------------|------|------|---------|
| 1 | <name> | <一句话说清做什么> | — | pending | — |
| 2 | <name> | <一句话说清做什么> | #1 | pending | — |

## 备注

[跨子项目的全局约束、已知风险、dropped 原因；无可写"无" / Cross-cutting constraints, risks, drop reasons; "none" if empty]
```
