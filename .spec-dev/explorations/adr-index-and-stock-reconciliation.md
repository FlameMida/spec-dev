# ADR 治理与存量对账工具（两个候选特性）

> 记录于 2026-08-10，supersede-lifecycle 交付当日。来源：TDM-Library 仓库（`~/workspace/TDM-Library`，勘察时位于 `.worktrees/merge/2026-08-09-assembly-core-fidelity`）的存量实证勘察。两件事均有真实设计取舍，不适合 quick-fix，故落盘候选；启动时走 requirement-analysis，本笔记作阶段 1 输入。

## 问题

supersede-lifecycle 机制解决了"取代关系的声明→生效→过滤"闭环，但对**存量重度仓库**（机制落地前积累的大量 spec/ADR）只提供了纪律、没有提供工具与索引。TDM-Library 一个月密集迭代的数据说明了缺口规模。

## 关键发现（TDM-Library 实证，2026-08-10）

- **ADR 侧**：32 条 ADR、**4 对编号撞车**（0007/0012/0013/0027 各两条，并行会话"扫描最高编号递增"竞态）、零状态行、`0010-protect-gtc-runtime` 被 `0011-retire-gtc-runtime` 推翻却无任何标注——32 条规模下"哪条还有效"已不可一眼判定。
- **spec 侧**：60 份 spec、52 份 active 堆积（目录名含 rebuild/remigration/reset 等多轮重构字样，行为交集嫌疑大）、6 份非法枚举（`delivered`×5、`completed`×1，生命周期字段被当工作状态用）、1 份无 frontmatter、1 份 superseded 无指针。
- **covers 重叠密度**：单文件最高被 **11 份 active spec** 同时 covers（`tdm-server/src/routes/mod.rs`），8 重、7 重的文件还有多个——双声明纪律在未对账仓库不可行的直接证据。

## 候选特性 1：ADR 索引与治理

**范围**：ADR 目录的状态索引（一眼可见每条编号/标题/状态/取代关系），可能含撞号存量修复指引。

**设计取舍（待裁决）**：
- 索引文件本身是新的漂移面（每次 ADR 变更需同步索引）——手写索引 vs **从状态行自动生成**（脚本随 guardrail 分发？随 skill 指令收尾生成？）；
- 生成时机：requirement-analysis 阶段 6 落 ADR 时顺带重建 vs 独立命令；
- 与"缺状态行视同 Accepted"原则的关系：索引生成器天然是状态行覆盖率的审计器。

## 候选特性 2：存量对账初筛工具

**范围**：把"N 份 active spec 两两行为交集判定"从 C(N,2) 人工量压缩为机器初筛嫌疑簇 + 人工/AI 逐簇三分类裁决（完全取代/部分取代/分面共存，判定纪律沿用 supersede-lifecycle）。

**形态取舍（待裁决）**：纯脚本（covers 重叠矩阵 + 标题/目录名聚类，输出嫌疑簇清单）vs 对账 skill（流程指令，含裁决与回写步骤）vs 混合（脚本初筛 + skill 消费）；输出落盘位置与格式。

**前提关系**：双声明纪律的适用前提是"active 集合经对账为真现行集合"（已写入 supersede-lifecycle spec 决策节）——本工具是该前提在存量仓库的达成手段。

## 已完成、不要重做（2026-08-10 交付）

- ADR 落盘防撞号指令（requirement-analysis 阶段 6，commit `2a0cb28`）；
- 未知 status 值告警（session-context + check-spec-drift 双侧，spec 新增 Requirement，commit `7a73237`；TDM 直跑验证 `delivered×5, completed×1`）；
- 双声明适用前提句（spec 决策节，commit `2a0cb28`）；
- supersede-lifecycle 机制全套（合并 `8dc5c71`）。

## 未决问题

- 两个候选合为一个特性（"存量健康度"）还是分开走？（索引偏 ADR、对账偏 spec，共享"存量治理"动机但交付物独立——倾向分开，各自可小）
- 优先级：TDM 若近期要做存量对账，候选 2 先行；否则候选 1 更便宜。
- TDM-Library 是否作为首个试点仓库（其数据即验收素材）。
