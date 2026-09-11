# ADR Format

> 读取时机：准备记录满足三条件的 ADR 时。
> 资格、统一编号、保存授权和状态生命周期以 [统一文档规范](../../../requirement-analysis/references/document-conventions.md) 为准。

ADR 保存在 `.spec-dev/adr/`。没有合格决策不创建目录或空 ADR。

## 已批准决策的最小示例

```markdown
# 按限界上下文组织领域模块

**Status**: Accepted (YYYY-MM-DD)

背景、决定与理由用一至三句话说明；实际日期、标题及取舍来自当前批准来源。
```

需要时记录有意义的被否方案和后果，不为填结构添加内容。
既有决策的取代、弃用和双向指向按统一规范执行；不另设可选状态或域内独立编号制度。
旧 docs/adr/ 中的文件不自动搬移、改写或双写。
