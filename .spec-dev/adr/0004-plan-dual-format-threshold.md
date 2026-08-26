# ADR-0004: plan 双形态与阈值门控

**Status**: Superseded by [ADR-0005](0005-plan-single-format.md) (2026-08-27)

writing-plans 产物按阈值门控双形态：预估任务数 >8 或正文 >25KB 产出分文件形态（index.md 导航 + tasks/TNN.md 每任务一文件 + progress.yaml 唯一运行时状态），否则维持单文件；分文件形态弃用复选框双轨，progress.yaml 为唯一状态源。理由：真实计划已达 734 行/43.8KB/13 任务且跨会话执行无 resume 规程，上下文峰值与断点恢复是实证痛点；但 v5.5.0 曾引入对所有计划无条件强制的"三件套"（plan/tasks/progress 双事实源 + 文档运行时双轨同步），因维护成本压过收益被 v6.0.0 整体裁撤——本决策以"阈值门控（小计划零感知）+ 单一事实源（任务正文只在 tasks/、状态只在 progress）"回应该前车之鉴。

被否方案：全量新格式（复活 v6.0.0 裁撤的强制开销）；只加 resume 不分文件（不解决上下文峰值）；完整 writing-plan-plus 提案（executor 版本域/编译快照/skill 注册，违反最简实现原则）。
