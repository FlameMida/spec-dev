# Roadmap 模板（`.spec-dev/roadmaps/YYYY-MM-DD-NN-<project>.md`；NN 为当日两位序号，同一 NN 序列全 `.spec-dev/` 日期前缀产物共用，见 requirement-analysis 阶段 6 命名规则）

> **Language / 语言**: Fill in the conversation language — all narrative content follows the conversation language at creation; keep structural labels (frontmatter keys, status enums) in English. / 以对话语言填写——叙述性内容跟随创建时对话语言；结构标签（frontmatter 键、状态枚举）保持英文。

> **roadmap 是条件性产物**：仅当范围分解检查判定"一个大目标必须拆成多个子项目"且用户确认拆分方案后创建；单一需求不查、不建、不更新 roadmap。它是分解决策的唯一持久化位置——只活在对话里的子项目清单会随会话结束静默蒸发。
>
> frontmatter 根键是 `spec_dev_roadmap`（区别于 spec 的 `spec_dev`），漂移守卫不解析本文件。状态回写节点：requirement-analysis 写子项目 spec 时置 `in-progress` 并回填特性目录；executing-plans 合并交付后置 `delivered`；用户裁决放弃置 `dropped` 并记一行原因；全部子项目 delivered/dropped 后 `status` 翻 `done`。

```markdown
---
spec_dev_roadmap:
  version: 1
  project: <project-name>
  status: active          # active | done | superseded —— 全部子项目 delivered/dropped 后翻 done；
                          # superseded 仅表整份 roadmap 被新 roadmap 替代（罕用、无指针字段，
                          # 与 spec 的 superseded 生命周期无关）
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

## 原始需求

> 登记时把用户的原始需求描述**全文**引用于此（引用块原样保留，不改写不压缩）——这是所有子项目共同的最上游输入，续接时不得要求用户重新提供。

## 上下文胶囊（每子项目一小节，续接的唯一交接面）

### #N <子项目名>

- **关键裁决**：分解期与本子项目相关的澄清结论，每条一行
- **探索指针**：相关 explorations 文件、前置子项目 spec/acceptance-report 的仓库根相对路径
- **已扫范围**：分解期/前置子项目已完成的探索模态与范围（续接的 requirement-analysis 阶段 2 对已登记范围不重扫、只补缺口）
- **留给后继的注意事项**：（交付回写时由 executing-plans 追加；登记时留空）

## 备注

[跨子项目的全局约束、已知风险、dropped 原因；无可写"无" / Cross-cutting constraints, risks, drop reasons; "none" if empty]
```
