---
name: ddd-lifecycle
description: DDD 全流程开发规范(语言无关):从零搭建工程的领域建模、六边形架构落地,与开发过程中的 DDD 抉择判断。当用户要开始新项目或新模块的领域建模、建立或维护统一语言(spec-dev 词汇表)、划分限界上下文(context mapping)、定义实体/值对象/聚合、设计领域事件与仓储、搭建分层/端口适配器(六边形)架构、判断某决策是否值得写 ADR、或需要评审领域模型质量(10 分制评分)时使用。适用于任何编程语言与框架。
---

# DDD 全流程开发规范(ddd-lifecycle)

从零搭建到日常演进的一体化 DDD 开发规范。由三个互补组件构成(均为 MIT,原文见 `references/`,来源与许可见 `references/ATTRIBUTION.md`):

- **modeling/** — 语言纪律与决策留痕(源自 mattpocock/skills):统一语言词汇表、上下文映射、按 spec-dev 规范记录 ADR
- **methodology/** — DDD 全景方法论与模型评分(源自 wondelai/skills):六大模块 + 10 分制诊断
- **architecture/** — 六边形架构施工手册(源自 affaan-m/ECC):Ports & Adapters、分层、迁移、测试

三者零重叠:**modeling 管"说话与决策",methodology 管"建模与裁决",architecture 管"分层与施工"**。

## 文档规范（独立与被调用完全统一）

实际文档动作前取得 [跨技能文档规范](../requirement-analysis/references/document-conventions.md)；
已有当前定义直接复用。本 skill 专注建模，不另设文档位置、保存权限或 ADR 生命周期。

- 跨特性领域术语：`.spec-dev/glossary.md`；同名不同义以适用域区分。
- 本特性局部术语：对应 spec 的术语节；没有适用 spec 时先留候选，不自动创建实施档案。
- ADR：`.spec-dev/adr/`，统一编号及 Accepted/Deprecated/Superseded 生命周期。
- 完整设计或当前保存范围获批后才写，同范围已有授权直接复用，不逐项请示。
- 无内容不创建文件；不自动搬移、删除或双写已有 CONTEXT.md、docs/adr/ 等旧位置。
- 上下文关系仍应建模；需要图或映射时按当前任务授权表达，不以映射工作为由自动建立第二套词汇表。

## 全流程阶段编排

按当前所处阶段加载对应参考文档(渐进披露——只读当下需要的):

| 阶段 | 做什么 | 深读 | 产出 |
|---|---|---|---|
| **0 领域发现**(项目第一天) | 与用户磨统一语言:挑战模糊术语、编造边界场景压测领域关系、用代码交叉验证说法 | `modeling/SKILL.md` + `modeling/CONTEXT-FORMAT.md` | 获授权的共享/局部术语记录 |
| **1 上下文映射**(子域变多时) | 识别限界上下文、选定九种映射模式(ACL/共享内核/开放主机…) | `modeling/SKILL.md`(文件结构节)、`methodology/bounded-contexts.md`、`methodology/strategic-design.md` | 获授权的上下文关系表达 |
| **2 架构奠基**(搭工程骨架) | 六边形六步:用例边界→出站端口先行→纯编排用例→边缘适配器→组合根→按边界分层测试 | `architecture/SKILL.md`(全文) | 分层骨架 + 端口接口 |
| **3 战术建模**(每个需求) | 实体/值对象判定、聚合边界、领域事件、仓储与工厂 | `methodology/SKILL.md` 模块 3–5 + `methodology/building-blocks.md`、`domain-events.md`、`repositories-factories.md` | 领域模型代码 |
| **4 编码施工**(持续) | 语言纪律 + 分层规则 + 按边界测试,两者同时常驻 | `modeling/SKILL.md`(会话动作节)+ `architecture/SKILL.md`(反模式/测试节) | 代码 + 按统一授权保存术语 |
| **5 抉择点**(事件驱动) | 见下方抉择路由表 | 按路由 | ADR(仅过门槛者) |
| **6 审查自检**(每迭代/里程碑) | 10 分制模型评分:7 行快速诊断各 1 分 + 3 项深度加分,报告失败行与修复动作 | `methodology/SKILL.md`(Scoring 节) | 评分报告 + 修复清单 |

## 开发中的 DDD 抉择路由表

| 你在纠结什么 | 裁决依据 | 深读 |
|---|---|---|
| "这是实体还是值对象?" | 身份测试:"属性全变还是不是同一个?"是→实体;"只由属性定义?"是→值对象。多数时候应是值对象 | `methodology/building-blocks.md` |
| "聚合边界画哪?该合并吗?" | 聚合保持小;跨聚合只按 ID 引用;立即一致性仅在聚合内,之间设计最终一致 | `methodology/building-blocks.md` |
| "这个状态变化要发事件吗?" | 只发领域专家关心的事(过去时命名);领域事件留在上下文内,跨上下文用集成事件 | `methodology/domain-events.md` |
| "要不要上事件溯源/CQRS?" | 先明确解耦与审计诉求;事件溯源以事件史为事实源,按需引入 | `methodology/domain-events.md` |
| "这个词该进词汇表吗?" | 只收词汇表条目:业务术语及其定义;通用编程概念(timeout、错误类型)即使常用也不收 | `modeling/CONTEXT-FORMAT.md` |
| "两个词是一回事吗?" | 即时挑战,逼出规范词;定不下来通常说明模型有问题(命名困难=设计信号) | `modeling/SKILL.md`、`methodology/ubiquitous-language.md` |
| "这个决策值得写 ADR 吗?" | 三条件缺一不写:①难逆转 ②缺上下文会令未来读者费解 ③真实取舍的结果 | `modeling/SKILL.md` + `modeling/ADR-FORMAT.md` |
| "这段逻辑放哪层?" | 依赖永远内向:domain 不 import 框架;出站端口归 application 层;映射留在适配器 | `architecture/SKILL.md` |
| "外部系统的模型渗进来了?" | 防腐层(ACL)在边界翻译,绝不让外来模型污染核心域 | `methodology/bounded-contexts.md` |
| "这个子系统该上多重的 DDD?" | 10 分制评分定轻重:≤3 分 → 只做统一语言,别过度设计 | `methodology/SKILL.md`(Scoring 节) |
| "怎么从旧结构迁到六边形?" | Strangler 渐进:按用例切片、每步可回滚;先边界后细节 | `architecture/SKILL.md`(迁移节) |

## 常驻纪律(任何阶段都生效)

1. **术语冲突即时挑战**:用户用词与适用领域定义冲突时及时指出；保存服从统一文档规范，术语敲定不自动产生写入授权。
2. **依赖永远内向**:Adapters → application/domain;application → 端口;domain → 任何外部的东西都不依赖。
3. **ADR 三条件门槛**:难逆转 + 缺上下文费解 + 真实取舍,缺一条就跳过。
4. **词汇表只记录领域术语**：不作 spec、草稿本或实现决策存储；局部术语留对应 spec。

## 参考文档索引

```
references/
├── ATTRIBUTION.md            来源与 MIT 许可
├── modeling/                 语言纪律与决策(mattpocock/skills)
│   ├── SKILL.md              会话中的主动建模纪律(六类动作)
│   ├── CONTEXT-FORMAT.md     词汇表格式(单/多上下文)
│   └── ADR-FORMAT.md         ADR 极简格式
├── methodology/              DDD 方法论(wondelai/skills)
│   ├── SKILL.md              六大模块 + 10 分制评分(全景入口)
│   ├── ubiquitous-language.md
│   ├── bounded-contexts.md   九种上下文映射模式
│   ├── building-blocks.md    实体/值对象/聚合规则
│   ├── domain-events.md      事件命名/事件溯源/集成事件
│   ├── repositories-factories.md
│   └── strategic-design.md   子域划分/核心域识别/精炼
└── architecture/             六边形施工(affaan-m/ECC)
    └── SKILL.md              6 步实施/模块布局/反模式/迁移/测试/TS·Java·Kotlin·Go 映射
```

## 使用约束

- **语言无关**:方法论与流程适用于任何语言;代码示例仅为示意,按当前项目语言翻译心智模型。
- **不预设微服务**:限界上下文默认落在模块边界(模块化单体);上下文 ≠ 服务。
- 本 skill 是编排层,参考文档保留领域方法；文档位置、保存权限和生命周期以统一文档规范为准，其他冲突按常驻纪律及用户要求处理。
