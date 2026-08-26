---
name: test-strategy
description: >-
  Test strategy discipline - three-lane scheduling by IO type (fast/PR/nightly), governance order flaky→duration→selection, AI-agent model-boundary testing skeleton, and acceptance-matrix integration. Use when designing a spec's test & acceptance strategy, translating an acceptance matrix into plan tasks, or setting up test lanes for a project. / 测试策略纪律——按 IO 类型的三 Lane 调度（fast/PR/nightly）、治理顺序 flaky→时长→选择、AI Agent 模型边界测试骨架、验收矩阵对接。为 spec 设计测试与验收策略、把验收矩阵翻译为计划任务、或为项目搭测试分层时使用。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction takes precedence, then recent messages; default to English. Deliverables follow the conversation language at creation. / 以对话语言输出；落盘产物以创建时对话语言为准。

> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。

# 测试策略纪律

普适纪律在本文；栈特定处方按需加载 references（阅读时机见各文件头）。

## 三 Lane 模型（调度维度是 IO 类型，不是业务模块）

| Lane | 时机/预算 | 内容 | 判据 |
|---|---|---|---|
| **fast** | 保存/提交时 < 1 min | 纯内存：mock IO、mock 模型、组件+mock 网络 | 不碰任何真实 IO（含 LLM） |
| **PR** | 目标 < 10 min | 编译/静态先行 + fast 全量 + 集成（真实容器/库）+ 主干 E2E 3-5 条 | 每套件一容器 + 模板克隆 |
| **nightly** | 夜间/手动 | 全量含慢测试：并发锁、迁移演练、全 E2E、Agent 完整 eval | 概率性/长耗时永不阻塞 PR |

小团队（1-5 人）fast lane 全量跑全部模块——不建按模块的测试选择系统；选择/分片只在触发条件满足时引入（>15-20 人或 PR lane >15min，先榨干单机并行）。

## 治理顺序铁律：flaky → 时长 → 选择

反序必翻车——一条 flaky 的必需检查会拖垮整条流水线的信任。先清 flaky，再治时长（拓扑>磁盘>并行），最后才考虑选择系统。

## AI Agent 测试骨架（模型边界是唯一不可逆决策）

一根窄接口隔离模型，模型是它之外唯一的依赖；边界以下全确定性：

- L0 静态 + 工具 JSON Schema 校验（schema 漂移是工具类头号故障）
- L1 harness 单测（fast）：fake model 按序弹响应；测循环控制、路由、重试、预算、护栏
- L1.5 prompt 快照（fast）：快照装配后的最终 prompt（确定性），不是模型输出
- L2 工具契约（fast）：工具=普通函数单测
- L3 回放（fast/PR）：录制回放（脱敏），周期性重录
- L4 廉价模型冒烟（PR，仅 agent 相关变更）：小模型 + 严格 schema 断言
- L5 完整 eval（nightly）：真实模型、多 trial、pass^k、按维度隔离 judge

断言纪律：`temperature=0` 不是确定性——断言面向结构与 schema，永不面向精确文本；评结果不评路径（精确工具序列断言脆弱）。

## 与验收矩阵的对接（上游分工链的一环）

- **requirement-analysis 写矩阵时**：每行标注 Lane 归属（fast/PR/nightly）——unit/docs 行默认 fast，integration 行默认 PR，perf/eval 行默认 nightly；性能行必须带阈值数字。
- **writing-plans 翻译时**：任务的失败测试步骤继承该行 Lane 归属并写明运行命令所属 lane；DB/容器类测试步骤引用 references/db-testing.md 处方（模板克隆、两速隔离），不得每测试起容器。
- **acceptance-qa 执行时**：阶段 0 装配按 Lane 选择执行窗口；nightly 行在验收报告中标注"非阻塞"。

## Red Flags

- 每测试/每文件一个容器；每测试重放迁移 → 读 db-testing.md 处方
- 用 mock 测出来的绿当集成信心 → mock 只属 fast lane，集成信心来自 PR lane 真实容器
- eval 分数波动就改断言阈值 → 先查 flaky 治理顺序，eval 属 nightly 不阻塞
- 为测试选择系统引缝 → 缝跟着真实交付边界走，1-5 人先全量
