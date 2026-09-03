---
spec_dev_report:
  type: analysis-report
  id: 2026-08-28-01
  title: "Skill 生态对比：Matt Pocock skills × spec-dev"
  date: 2026-08-28
  status: final
  scope: "外部 skill 仓库 /Users/maverick/skills/skills（engineering 18 + productivity 7 + in-progress beta 区）与本项目 /Users/maverick/feature-dev（spec-dev 插件源码）的全量对比"
  method: "两轮 ultracode Workflow：①16 agent（深读 6 主角 + 生态地图 + 7 组配对 + 批判）；②21 agent（补读剩余 5 簇 + 8 组次级配对 + 6 个生态角度 + 合并去重 + 证据复核）；③beta implement-spec × executing-plans 机制级专项对比（应用户要求补做，见 §3.1）；④第三轮独立复核（7 agent、6 域 420 条断言：16 项确认修正、5 项误报驳回）。三段共 44 agent、约 268 万 tokens、754 次工具调用；75 条原始建议（29+29+17）去重合并为 43 条、加专项 AB-44 共 44 条编号清单"
  consumption: "§5 吸收清单是唯一权威执行入口（AB-NN 稳定编号）；§6 拒绝清单防止重复提案；§8 数据可信度记录了全部已知纠偏"
---

# Skill 生态对比：Matt Pocock skills × spec-dev

> 🤖 **Agent 消费指南**（人类可跳过本节）
> - 想执行改进 → 只读 **§5 吸收清单**，按 §5.5 顺序取 AB-NN 条目，`where` 字段即落点文件，`evidence` 即外部原文出处。
> - 想提新建议 → 先查 **§6 拒绝清单**（16 项已裁决不吸收，含理由），重复提案无效。
> - 想引用对比结论 → §3 总表 + §4 角度结论是全量对比的压缩态；细节引文均带 `文件:行号`。
> - 本报告数字经第二轮 Critic 与第三轮独立复核（6 域 420 条断言）双重校验，全部已知纠偏（12 条）记录在 §8.3——引用数字以本报告为准。
> - **2026-09-03 第四轮核验**（对仓库与外部引文逐条实测）的修正记录在 **§8.5**，与 §8.3 或正文冲突时以 §8.5 为准；44 条的执行入口已转为 roadmap `../roadmaps/2026-09-03-01-skill-ecosystem-absorption.md`（8 个子项目），AB-44 升格为其子项目 #2（独立正式 skill、opt-in），不再是 P2 沙盒。
> - 路径链接约定：本项目文件 = 仓库相对链接（自本报告位置 `../../` 起算，git 内可移植）；外部生态 = 本机绝对路径（`/Users/maverick/skills/skills/…`）。全部可点击索引见附录 A。

---

## TL;DR

两套生态是**同一条「想法→spec→任务→执行→审查」流水线的两种极端实现**：

- **外部（Matt Pocock）**：赌「写得少就不会漂移」。纯 markdown 零依赖、issue tracker 为共享状态机、HITL 集中在少数高质量确认点、执行并发（implementer 子代理齐飞）、正文禁路径禁代码。
- **本项目（spec-dev）**：赌「漂移了会被机器拦住」。五层漂移守卫 + evals 触发回归 + schema 校验 + 断点恢复 + 验收对账，重工程化、双语、插件级制品。

**结论**：本项目在防漂移、执行纪律、恢复与验收上全面更深；外部在**测试落点纪律（seam）、审查的 Spec 符合性轴、宽面重构排序、提问进度可见性、spike 受控例外**五个维度是本项目真实空白。两轮分析 + beta 专项共产出 **44 条编号吸收建议（P0×9 / P1×26 / P2×9）**、16 项明确拒绝、12 组跨配对冲突裁决，全部证据经复核。beta `implement-spec` 的并发执行范式另有机制级专项对比（§3.1）。

---

## 一、外部生态如何运作

### 1.1 全景：两层 skill + 一层胶水

```
┌──────────────── 👤 用户显式调用（disable-model-invocation: true）────────────────┐
│                                                                                   │
│  🗺️ wayfinder     📋 to-spec      🎫 to-tickets     🔨 implement /        🏗️ improve-  │
│  超大工作的       对话→spec       spec→票+依赖边     implement-spec(beta)  codebase-   │
│  决策地图         （禁止访谈）    （tracer bullet）  （并发/单线程两版）   architecture │
│                                                                                   │
├──────────────── 🤖 模型自动到达（丰富触发词）──────────────────────────────────────┤
│                                                                                   │
│  🧪 tdd（红绿参考）  🔥 grilling（frontier 批问）  📐 domain-modeling（术语+ADR）    │
│  📚 codebase-design（架构词汇表）  🎨 prototype  🔍 research  🐛 diagnosing-bugs     │
│  👀 code-review（双轴）  🧙 wizard  🔀 resolving-merge-conflicts                    │
│                                                                                   │
├──────────────── 🧱 共享胶水层 ─────────────────────────────────────────────────────┤
│  📟 issue tracker = 唯一共享状态机（/setup-matt-pocock-skills 配置）                │
│  🏷️ ready-for-agent 标签 = agent 取件池                                            │
│  📖 CONTEXT.md 领域词汇表 + ADR = 语言层契约（domain-modeling 就地维护）            │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**配合的三个精髓**：

1. **纯壳委托**：编排层 skill 只写流程，纪律全部委托给基础层（`grill-with-docs` 全文 7 行："Call the Skill tool twice, for grilling and domain-modeling"）。正式版 `implement` 仅 15 行，beta 版 `implement-spec`（35 行）才写全并发编排——**这一对上，成熟度与文档厚度成反比**（体量分层本身是设计；非全生态规律——稳定区的 wayfinder 128 行、to-tickets 105 行均厚于 beta）。
2. **状态全在 tracker**：map、spec、tickets、PR 互相关联（blocking 边、closing 关键词），天然支持多 session 并发编辑（wayfinder 明写 "expect other sessions to be editing the tracker concurrently"）。
3. **词汇表治理**：codebase-design 锁定架构术语（module/seam/depth…附 Avoid 反义词表），CONTEXT.md 锁定领域术语，ADR 记录不可逆决策——语言本身是被治理的接口。

### 1.2 主链流程（按工作大小分两条路）

```
  想法到达
     │
     ├─ 中小工作 ──► 💬 对话/grilling ──► 📋 /to-spec ──► 🎫 /to-tickets ──► 🔨 /implement(-spec)
     │                    │                    │                  │
     │                    │ 唯一确认点:         │ quiz 三问:        │ ① exploration 子代理（可选；notes 存 repo 外）
     │                    │ seams 匹配预期吗    │ 粒度/依赖边/合并  │ ② implementer×N 并发（各占 worktree）
     │                    ▼                    ▼                  │    ⚠ beta 并发版无 TDD——/tdd at seams 只在正式版（§3.1.2）
     │              [tracker 发布          [tracker 发布          │ ③ merger 子代理逐个收编进 PR 分支
     │               ready-for-agent]       + blocking edges]     │ ④ frontier 变化→再派工
     │                                                              │ ⑤ /code-review → PR ready
     │
     └─ 超大工作 ──► 🗺️ /wayfinder
        ① 命名 destination（grilling+domain-modeling）
        ② 广度优先扫雾 → 无雾？→ 不需要地图，停下问用户
        ③ 建 map（tracker 父 issue）+ 能说清的票（research/prototype/grilling/task 四型）+ blocking 边
        ④ 并发放 🔍 research 子代理（一 session 一票铁律的唯一例外）
        ⑤ 停：制图是一个 session 的活，一张票也不解
        ⏳ 后续每 session：领 frontier 票 → 解掉 → 记决策 → 雾毕业成新票…
        🌫️ 雾散尽 = 交接 /to-spec 或 /to-tickets

  🔀 横向通道（任何时候）：🏗️ /improve-codebase-architecture
     git log 找热点 → 子代理扫 friction（五问+deletion test）→ HTML 报告 → grilling 定案 → 新 spec/ADR
```

### 1.3 值得记住的外部设计手法（第二轮补全）

| 手法 | 出处 | 一句话 |
|------|------|--------|
| Frontier 批问 | [grilling:8](/Users/maverick/skills/skills/productivity/grilling/SKILL.md) | 每轮计算「前置已定的决策全集」整轮发问，每题带推荐答案；轮数=依赖深度而非问题数 |
| Facts/Decisions 二分 | [grilling:26](/Users/maverick/skills/skills/productivity/grilling/SKILL.md) | 事实自己查（派子代理、不阻塞），决策必须问用户且等答复 |
| 双轴审查不重排 | [code-review:76](/Users/maverick/skills/skills/engineering/code-review/SKILL.md) | Standards 与 Spec 分开报告、拒绝跨轴选冠军——用结构保住正交维度 |
| Fowler smell 基线 | [code-review:38-56](/Users/maverick/skills/skills/engineering/code-review/SKILL.md) | repo 零文档也生效的兜底启发式，但「repo 覆盖优先 / 永远是判断题（工具已管的不查内嵌于此条）」两条约束把它压在硬规则之下 |
| Scope creep 检测 | [code-review:70](/Users/maverick/skills/skills/engineering/code-review/SKILL.md) | Spec 轴三问之一："behaviour in the diff that wasn't asked for" |
| 红信号先行 | [diagnosing-bugs:20,66](/Users/maverick/skills/skills/engineering/diagnosing-bugs/SKILL.md) | "If you have a tight pass/fail signal…you will find the cause"；没有能变红的命令就没有 Phase 2 |
| throwaway 是写作约束 | [prototype:21-26](/Users/maverick/skills/skills/engineering/prototype/SKILL.md) | 第一天标记、默认无持久化、跳过打磨；结论折进真代码、本体存 throwaway 分支当 primary source |
| 懒创建 | [domain-modeling:40](/Users/maverick/skills/skills/engineering/domain-modeling/SKILL.md) | 文件只在有东西可写时创建（CONTEXT.md/ADR 皆然） |
| 决策只活一处 | [wayfinder:23](/Users/maverick/skills/skills/engineering/wayfinder/SKILL.md) | map 是 index 不是 store，决策住在它的 ticket 里，map 只 gist+link |

---

## 二、两种哲学

```
┌──────────── 🪶 外部 ─────────────┐  ┌──────────── 🏭 本项目（spec-dev v8.1.0）────────────┐
│ 纯 markdown，零 node 依赖        │  │ 插件级制品：skills+hooks+guardrail+commands+agents   │
│ 状态机 = issue tracker           │  │ 状态机 = repo 内文件（frontmatter/progress.yaml/     │
│   （多 session 并发原生）        │  │   sync_commit），并发防护靠撞号重扫                   │
│ HITL 集中少数确认点              │  │ HITL 多道门：方案→设计→spec review→执行确认          │
│ 执行并发：implementer 齐飞       │  │ 执行串行：主线程干活、子代理不写码                   │
│ 防漂移赌「写得少」：              │  │ 防漂移赌「会被拦」：五层守卫+schema 校验+evals 回归   │
│   正文禁路径/代码                │  │ 12/13 skill 带 evals.json（vendored anysearch 除外）、 │
│                                  │  │ 6 个带 trigger-evals                                  │
│ docs/ 人类镜像层，SKILL.md 纯指令│  │ description 双语（平均 648 字符 vs 外部平均约 145）    │
│ in-progress beta 区发布 gate     │  │ 实验物无沙盒（plugin.json 无 skills 键、目录即清单）  │
└──────────────────────────────────┘  └──────────────────────────────────────────────────────┘
```

---

## 三、逐对对比总表（14 对）

**主链六对**（第一轮）：

| 配对 | 谁强在哪 | 外部独有、本项目空白的机制 |
|------|---------|--------------------------|
| [🧪 tdd](/Users/maverick/skills/skills/engineering/tdd/SKILL.md) ↔ [test-driven-development](../../skills/test-driven-development/SKILL.md) | B 强：执行纪律（确认红/绿、借口对照表、删代码重来、例外需同意） | Seam 确认门；Tautological/实现耦合反模式；mock 正负清单；mockability 处方 |
| [📋 to-spec](/Users/maverick/skills/skills/engineering/to-spec/SKILL.md) ↔ [requirement-analysis](../../skills/requirement-analysis/SKILL.md) | B 全面强：八阶段/档位/对抗验证/Requirement+Scenario/差量/取代/守卫锚点 | Seam-first 决策；测试 prior art；spec 耐用性明文规则；actor 枚举 |
| [🎫 to-tickets](/Users/maverick/skills/skills/engineering/to-tickets/SKILL.md) ↔ [writing-plans](../../skills/writing-plans/SKILL.md) | B 强：任务格式与执行自足（完整代码/接口块/机器校验/唯一状态源/首尾闭合） | expand–contract 宽面重构；依赖边真实性；quiz 三问；prefactor 排最前 |
| [🔨 implement-spec](/Users/maverick/skills/skills/in-progress/implement-spec/SKILL.md)（beta，专项见 §3.1）↔ [executing-plans](../../skills/executing-plans/SKILL.md) | B 强：断点恢复/worktree 工程/多维对抗审查/验收对账 | frontier 并发吞吐；draft PR 早建+closing；context pointers 禁复制 |
| [🗺️ wayfinder](/Users/maverick/skills/skills/engineering/wayfinder/SKILL.md) ↔ [exploring](../../skills/exploring/SKILL.md)（+[quick-fix](../../skills/quick-fix/SKILL.md)） | B 强：入口分诊（三角+证据后置升级门+升级不重来） | 「想动手」=路由信号；结晶判据；out-of-scope 永不毕业；一 session 一票 |
| [🏗️ improve-codebase-architecture](/Users/maverick/skills/skills/engineering/improve-codebase-architecture/SKILL.md) ↔ (无直接对应) | B 强：验证与影响面控制 | 主动巡检通道；deletion test；friction 五问；HTML 报告；ADR-on-rejection |

**次级八对**（第二轮）：

| 配对 | 结论要点 |
|------|---------|
| [🔥 grilling](/Users/maverick/skills/skills/productivity/grilling/SKILL.md) ↔ [clarifying](../../skills/clarifying/SKILL.md) | 提问经济学正面对决：批问省轮次 vs 一次一题保聚焦。**裁决：保留一次一题**（介质匹配/本项目问题偏深树/术语污染三理由），吸收三个可剥离构件（AB-23/24/25） |
| [👀 code-review](/Users/maverick/skills/skills/engineering/code-review/SKILL.md) ↔ [review-orchestration](../../skills/executing-plans/references/review-orchestration.md)+[code-reviewer](../../agents/code-reviewer.md) | B 的 fan-out/对抗复核/completeness critic 更强，但 completeness critic 只查「未覆盖」不查「超范围」——Spec 符合性维度 S 是真实缺口（AB-12） |
| [🐛 diagnosing-bugs](/Users/maverick/skills/skills/engineering/diagnosing-bugs/SKILL.md) ↔ [quick-fix](../../skills/quick-fix/SKILL.md) | quick-fix 已有复现测试强制与升级门；缺的是 lite 红信号门槛、认知性升级信号、排序候选根因（AB-16/17/18）；十级 loop 重型机械明确不吸收 |
| [📐 domain-modeling](/Users/maverick/skills/skills/engineering/domain-modeling/SKILL.md) ↔ [requirement-analysis](../../skills/requirement-analysis/SKILL.md) 的 ADR 分流/术语表 | ADR 三判据两边完全同源；真差异是外部有**仓库级活词汇表** [CONTEXT.md](/Users/maverick/skills/skills/engineering/domain-modeling/CONTEXT-FORMAT.md)（格式定义），本项目术语表只活在单份 spec 内（AB-27） |
| [🔨 implement](/Users/maverick/skills/skills/engineering/implement/SKILL.md)（正式版）↔ [executing-plans](../../skills/executing-plans/SKILL.md) | 15 行 vs 133 行的体量分层本身是设计；「/tdd at pre-agreed seams」被执行链复述，加强 AB-01 证据；typecheck 常跑/全量一次的节奏是 AB-05 |
| [🏷️ triage](/Users/maverick/skills/skills/engineering/triage/SKILL.md)+[ask-matt](/Users/maverick/skills/skills/engineering/ask-matt/SKILL.md) ↔ [doctor](../../commands/doctor.md)+[triage](../../commands/triage.md) 命令 | 外部路由「该用哪个 skill」，本项目路由「该走哪条通道」；可吸收否决记忆双查与派发词纪律（AB-31/32） |
| [🎨 prototype](/Users/maverick/skills/skills/engineering/prototype/SKILL.md)+[research](/Users/maverick/skills/skills/engineering/research/SKILL.md) ↔ spike+[exploring](../../skills/exploring/SKILL.md)/[explorer](../../agents/external-resource-explorer.md) | prototype 成型四纪律是 spike 受控例外的最佳规则来源（AB-21）；research 的 primary-source 追溯强化 explorer（AB-26） |
| [📚 codebase-design](/Users/maverick/skills/skills/engineering/codebase-design/SKILL.md) ↔ [design-principles.md](../../skills/writing-plans/references/design-principles.md) | 两套原则互补不重叠：外部管模块形态（深浅/接缝），本项目管实现纪律（垫片/投机性）；可吸收为可跑判据（AB-09） |

### 3.1 专项深对比：beta `implement-spec` × `executing-plans`（机制级）

> 背景：`implement-spec` 位于外部 in-progress 分区（beta，「可随时变更消失、不入 plugin」）；正式版 `implement`（15 行）是它的稳定内核。第一轮对本配对只做了概览级对比，本节为机制级专项——两文件均已逐行核对。

#### 3.1.1 逐机制对照表

| 维度 | [beta implement-spec（35 行）](/Users/maverick/skills/skills/in-progress/implement-spec/SKILL.md) | [executing-plans（133 行）](../../skills/executing-plans/SKILL.md) | 评注 |
|------|------------------------------|---------------------------|------|
| 任务图消费 | **frontier 动态取票**：完成即合并、合并即查新解锁票再派工（步骤 6） | 导航表静态依赖，T{n} **连续顺序执行**，任务间不停顿 | beta 支持并行；B 串行换确定性 |
| 执行者 | implementer 子代理 ×N 后台并发，**每票独立 worktree + 独立 branch** | **主线程单执行者**，单 worktree | 范式对立（见 §3.1.3） |
| TDD | **完全缺席**——全文 tdd/test 零命中（grep 核实） | TDD 五步显式内嵌每任务 + test-driven-development skill 铁律 | ⚠️ beta 的关键弱点：并发范式没带实现纪律，质量全押收尾 code-review |
| 探索分工 | exploration 子代理**可选**前置（步骤 2 原文标注 optional），notes 存 **repo 外**共享目录，供后续所有子代理读 | 探索全部前置在 RA；执行期主线程内联 | AB-11 已列吸收（notes 落特性目录） |
| 通信协议 | **context pointers**：只传指针（spec/tickets/research notes/commits），明文禁复制 | 计划文件即通信载体（接口块/导航表，执行者只读自己任务+依赖行） | 同构思想、不同载体：beta 是运行时子代理间协议，B 是静态计划内协议；AB-11 补审查派发的「禁复制」 |
| 合并 | **merger 子代理**逐个收编进 PR 分支——仅一句话（:27），**冲突处理零定义** | 最终任务一次性 merge 回来源分支，冲突/脏工作区停下问用户 | beta 并发范式的核心难点没有方案；B 串行下此问题天然不存在 |
| 审查修复收敛 | 全部 code-review 发现在**单个 implementer 子代理**里一次修复（步骤 7） | 主线程在 worktree 内修复（修复本身走 TDD）+ 受影响维度复审 | beta 防多修复者互踩的显式设计，值得记一笔 |
| spec 自检 | 无 | 每任务 over/under-building + 契约锚定两查 | B 独有 |
| 偏差处理 | 无 | 三级纪律（小/契约级/意图级） | B 独有 |
| 中断恢复 | 无显式协议（票的 open/closed 在 tracker 上，粗粒度天然可续） | progress.yaml 一致性校验 → ready 任务细粒度续跑 | B 强 |
| 交付载体 | **draft PR 第 3 步即建**（早于任何实现）+ closing 标注 + 步骤 8 转 ready | 本地合并 + sync_commit 锚定 | AB-10 已列吸收（受保护分支场景） |
| 资源清理 | 步骤 9 显式清理全部 implementer worktree | 资源台账遍历清理（worktree+容器+测试库+服务） | 同构意识，B 覆盖面更全 |
| 状态源 | tracker（票状态） | progress.yaml（唯一状态源、随任务提交） | 架构选择不同（§4 角度 1） |
| 成熟度 | in-progress beta（不稳定承诺） | v8.1.0 主链 | — |

#### 3.1.2 专项新发现（前两轮未抓到）

1. **beta 没有 TDD**：正式版 `implement` 的第 9 行写着 "Use /tdd where possible, at pre-agreed seams"，beta 把这句丢了——并发放大器版本恰恰是把实现纪律外包给了收尾审查。**这是并行范式的隐性代价的实证**：吞吐上去了，红绿循环在每个 implementer 里是否发生完全不可见。
2. **merger 是黑箱**：合并冲突是并行执行的第一难点（两个 implementer 对同一接口的隐式解释分歧在合并时爆发），beta 对此只有一行动词。外部生态同样没解决这个问题。
3. **修复收敛于单个 implementer** 是 beta 少有的显式防踩踏设计——B 的对应物是「主线程修复」，语义相同。
4. **beta 有资源清理意识**（步骤 9），第一轮 external_unique 漏记；与 B 的资源台账同构。

#### 3.1.3 并行范式可行性评估（B 能否加 opt-in 并行模式）

**B 的静态制品其实已经「并行就绪」**——接口块（精确签名）、导航表（依赖闭包可推导改动面是否相交）、bite-sized 任务（自足）正是并行执行需要的前置条件；beta 反而没有这些制品。**B 缺的不是计划质量，是运行时编排层**：并发状态源（progress.yaml 是单文件原子写，并发即撞）、合并协议（merger 语义）、以及「子代理不写码」红线的放宽条件。

| 何时并行赢 | 何时串行赢 |
|-----------|-----------|
| 任务图宽：导航表有 ≥2 条独立依赖链 | 纯线性链（并行零收益） |
| 改动面不相交（依赖闭包可验证） | 任务共享文件/接口（合并冲突高发） |
| 墙钟时间是硬约束（大特性、CI 窗口） | 契约一致性优先（B 的默认立场） |
| 每任务实现纪律可机器核验 | TDD 监督成本高（beta 的教训） |

**结论**：默认范式维持主线程串行（rejected #9 的裁决不变，但理由细化为上表）；并行的正确打开方式不是改 executing-plans，而是**条件触发的实验通道**——见 AB-44。

---

**AB-44 · opt-in 并行执行模式原型（实验沙盒）**（P2，新增）

- **what**：在 `skills/` 目录外（呼应 AB-42 修正版沙盒：不进插件清单、不承诺稳定）原型一个并行执行实验 skill：触发条件=导航表依赖闭包显示 ≥2 条独立链且改动面不相交；implementer 子代理各自 worktree、**每票强制 TDD 五步 + 契约锚定自检**（补上 beta 丢掉的纪律）；merger 由主线程兼任（合并冲突上抛用户，不自动裁决）；progress.yaml 改分片写或加锁；收尾仍走 B 的多维审查全套。
- **why**：B 的计划制品已是并行就绪态，唯一缺运行时编排；beta 证明了并行可行、也证明了不带 TDD 的并行会丢实现纪律——实验以「并行 + 全纪律保留」为对照假设。
- **where**：仓库顶层 `skills-in-progress/parallel-executing-plans/`（新建，不进插件）。
- **evidence**：[implement-spec/SKILL.md](/Users/maverick/skills/skills/in-progress/implement-spec/SKILL.md):15（后台最大并发）、:25（每票独立 worktree）、:27（merger）；正式版 [implement:9](/Users/maverick/skills/skills/engineering/implement/SKILL.md) 的 TDD 对照（beta 缺失）；B 侧 [executing-plans/SKILL.md](../../skills/executing-plans/SKILL.md):18（主线程范式）、[writing-plans](../../skills/writing-plans/SKILL.md) 接口块/导航表。


---

## 四、生态级角度对比（6 角度）

| 角度 | 外部做法 | 本项目做法 | 裁决 |
|------|---------|-----------|------|
| 跨会话共享状态 | tracker 原生并发：assign 即认领、blocking 边可视、PR closing 收口 | repo 文件：progress.yaml 唯一状态源、NN/ADR 撞号重扫、恢复入口校验 | 单人插件场景 B 占优（自足、可审计）；多人多会话场景 A 占优。吸收 claim-first 认领键 + Spec 追溯 trailer（AB-33） |
| 上下文传递契约 | context pointers（只传指针禁复制）+ map low-res/zoom | 导航表+接口块（执行者只读自己任务）+ 胶囊 + 升级不重来 | 双方都有渐进披露；B 缺「per-artifact 关联 skill 声明」与胶囊 gist 要素（AB-35） |
| 提问经济学 | frontier 整轮批问+每题推荐；HITL 票 agent 不得自代 | 一次一题铁律 + AskUserQuestion 推荐首位 | **B 胜出并维持**；吸收清单可见（AB-23）、自代红线（AB-25）、受限阀门留观（AB-24） |
| 失败路径 | 零散降级（tracker 回退/双形态/no-fog 停） | 系统化（Codex 兼容表/降级链/失败隔离/优雅降级） | **B 全面占优**；唯一可学：失败隔离纪律单点定义（现散 4 处措辞已分化，AB-36） |
| 第三平台移植 | 零依赖，拿目录即用 | node 硬依赖（校验/脚本/CLI），双平台 hooks | **A 占优**；补 hard/soft 依赖分级表（AB-37）+ 插件根解析统一（AB-38，内含真实 bug） |
| 安全与破坏半径 | 零防护（信任=人盯着+写得克制）；报告写 temp dir | 五层守卫、资源台账只清台账内、共享实例禁令、Tier A 不进 CI | **B 全面占优**（这是被装进他人仓库的插件的护城河）；唯一缺口 expand–contract 已列 AB-06 |

---

## 五、吸收清单（权威 backlog）

> 两轮 75 条原始建议（29+29+17）→ 去重合并为 43 条（14 组主题合并消化 46 条重复），加上 §3.1 专项新增的 AB-44，共 **44 条**。编号 AB-NN 稳定，后续引用以此为准。
> 优先级经第二轮 Critic 复核调整 + 专项补充：P0×9 / P1×26 / P2×9。

### 5.1 P0 —— 强烈建议做（9 条，按建议执行序）

---

**AB-01 · Seam 确认门两案合一：上游声明为权威，TDD 门只在即兴场景发问**（medium）

- **what**：requirement-analysis 阶段 5 在设计展示时声明测试缝（优先复用既有缝 / 选尽可能高的缝 / 新缝最少化理想 1），并入既有设计批准门一并确认（**不新增独立门**）；spec-template「测试与验收策略」节记录 seam 声明；writing-plans 导航表「产出接口」列即 seam 载体；test-driven-development 新增「测试落点确认门」小节——spec/plan 已有声明则以声明为准直接开工，仅即兴场景（quick-fix、无 plan）用标准问句问用户；检查清单「每个新函数/方法都有测试」改为「每个公共行为（经确认的落点）都有测试」。
- **why**：本项目全链路管了「测什么维度」（验收矩阵）「何时跑」（Lane），唯独没管「挂在哪个接口测」；且 TDD 清单措辞是反向的全覆盖导向，会把 agent 推向私有方法级测试。
- **where**：[requirement-analysis/SKILL.md](../../skills/requirement-analysis/SKILL.md)（阶段 5）、[spec-template.md](../../skills/requirement-analysis/assets/spec-template.md)、[writing-plans/SKILL.md](../../skills/writing-plans/SKILL.md)（导航表节）、[executing-plans/SKILL.md](../../skills/executing-plans/SKILL.md):68、[test-driven-development/SKILL.md](../../skills/test-driven-development/SKILL.md)（:64 前插节 + :157 措辞）及 evals。
- **evidence**：[tdd/SKILL.md](/Users/maverick/skills/skills/engineering/tdd/SKILL.md):22 "No test is written at an unconfirmed seam"、:24 标准问句；[to-spec/SKILL.md](/Users/maverick/skills/skills/engineering/to-spec/SKILL.md):15,17 三启发式；[implement/SKILL.md](/Users/maverick/skills/skills/engineering/implement/SKILL.md):9 "at pre-agreed seams"。

---

**AB-02 · 测试反模式 6+7：同义反复测试与实现耦合测试**（low）

- **what**：testing-anti-patterns.md 新增反模式 6「同义反复」——期望值必须来自独立真值源（已知字面量/手算例子/spec），附 reduce 重算 vs 字面量 15 的 GOOD/BAD 对；反模式 7「实现耦合/测过接口」——mock 内部协作者、测私有方法、旁路验证（直查 DB 不走接口）均禁，tell 为「行为没变、重构后测试挂了」，裁决方向是**挪测试位置而非改实现迁就测试**；两模式补进速查表与 Red Flags。
- **why**：同义反复是 LLM 高频失效模式（用同构算法自证期望值，红转绿毫无意义），与「确认失败原因正确」互补不重叠。
- **where**：[testing-anti-patterns.md](../../skills/test-driven-development/references/testing-anti-patterns.md)（反模式 5 后新增；速查表与 Red Flags 同步）。
- **evidence**：[tdd/SKILL.md](/Users/maverick/skills/skills/engineering/tdd/SKILL.md):31 独立真值源铁律、:30 tell；[DEEPENING.md](/Users/maverick/skills/skills/engineering/codebase-design/DEEPENING.md):36-37 "If a test has to change when the implementation changes, it's testing past the interface"。

---

**AB-06 · expand–contract 宽面重构排序（含两级降级）**（medium）

- **what**：当 spec 是 blast radius 横扫全库的机械变更（rename column、retype shared symbol）导致任何纵切片无法单独落绿时：排 expand 任务（新旧并存）→ 按 blast radius 分批 migrate（批间依赖串接、每批提交后全绿）→ contract 任务删旧形；连批次都无法独立 green 时降级为共享 integration 分支 + 最终一次性验证。
- **why**：本项目现在只有两条坏路：合成大任务（触发「>5 实施步骤」Red Flag）或按文件横切（中间态不绿、违反 TDD 每步可验证）；expand–contract 的逐批 green 与既有纪律天然同构。
- **where**：[writing-plans/SKILL.md](../../skills/writing-plans/SKILL.md)（「任务的粒度」节后新增小节）、[design-principles.md](../../skills/writing-plans/references/design-principles.md)（语境注解补一行）。
- **evidence**：[to-tickets/SKILL.md](/Users/maverick/skills/skills/engineering/to-tickets/SKILL.md):40 "batches sized by blast radius … keeping CI green batch to batch"。

---

**AB-10 · PR 制交付通道（受保护分支场景）**（medium）

- **what**：executing-plans 阶段 2 建分支时检测来源分支是否受保护/远端是否 PR 制，命中则同期创建 draft PR（描述链接特性目录 spec、progress.yaml、对账报告位置；repo 有 issue tracker 时带 closing 关键词）；阶段 6 完成对账后改 ready for review 替代直接合并；未命中仍走本地合并 + sync_commit 锚定。
- **why**：本项目唯一收口是本地合并；受保护分支只有「原地实施」这一更差降级，PR 制 repo 下插件没有干净交付出口。不触碰 guardrail 的 commit/pre-push 机制。
- **where**：[executing-plans/SKILL.md](../../skills/executing-plans/SKILL.md)（阶段 6 :112 分支化 + 阶段 2 :61 降级条款）。
- **evidence**：[implement-spec/SKILL.md](/Users/maverick/skills/skills/in-progress/implement-spec/SKILL.md):23 draft PR + closing、:33 ready for review。

---

**AB-12 · 收尾审查增加「Spec 符合性」维度 S（三向核对）**（medium）

- **what**：常规档审查维度改 [A,B,C,S]，大变更并入 5 路；brief 三向核对：(a) plan/spec 要求但缺失或半成品；(b) diff 中无任务/Requirement 依据的行为（**scope creep**）；(c) 看似实现但与 Scenario 语义不符——每条强制引用 plan 任务或 spec Requirement/Scenario 原文行；code-reviewer.md 加维度 S 定义与 category 枚举。
- **why**：completeness critic 只查「未覆盖」不查「超范围」；spec 自检的 over-building 检查只对单任务 diff，收尾全量 diff 上没有「做多了」的判定通道。
- **where**：[review-orchestration.md](../../skills/executing-plans/references/review-orchestration.md)（DIMENSIONS/维度表/派发规则/报告与处置）、[code-reviewer.md](../../agents/code-reviewer.md)、[executing-plans/SKILL.md](../../skills/executing-plans/SKILL.md) 阶段 4。
- **evidence**：[code-review/SKILL.md](/Users/maverick/skills/skills/engineering/code-review/SKILL.md):70 "(a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding."

---

**AB-16 · quick-fix 诊断纪律三则**（low）

- **what**：(1) 步骤 2/3 之间加 lite 红信号门槛——根因非显而易见时先产出一条能对本 bug 变红的命令（最常见即把 5a 失败测试提前试写一次）再向用户确认根因，显而易见小 bug 明示豁免；(2) 升级门 2.5 补第 4 条认知性信号——code-explorer 重试后根因仍不高置信、或 bug flaky/无法复现时，停下显式列出已试手段交用户裁决；(3) 步骤 3 第 1 问支持 2-3 个排序候选根因形态（各附一句预测「若是 X，改 Y 则症状应消失」）。
- **why**：红信号先行是外部诊断循环的核心理念——"No red-capable command, no Phase 2"；quick-fix 现在直接从定位跳到确认，缺这道廉价保险。
- **where**：[quick-fix/SKILL.md](../../skills/quick-fix/SKILL.md)（步骤 2 末尾 / 2.5 信号列表 :46-48 / 步骤 3 :56）。
- **evidence**：[diagnosing-bugs/SKILL.md](/Users/maverick/skills/skills/engineering/diagnosing-bugs/SKILL.md):20、:66、:53-55 "List what you tried"、:88-98 ranked hypotheses。

---

**AB-20 · 探索结晶可检验判据 + 「想动手」冲动路由化**（low）

- **what**：exploring 出口 1 的「结晶」补可检验判据——能把通往交付的关键问题精确陈述出来（哪怕还答不上来）即算成形、提议转 requirement-analysis；Red Flag「直接改代码最快」触发时不只停，同时读作「该问题已足够锐利」，接着提议出口 1 交接。
- **why**：「想法成形时提议」无可操作测试，agent 会凭感觉拖长探索或过早升级；冲动携带的状态信息（雾已散）现在被丢弃。
- **where**：[exploring/SKILL.md](../../skills/exploring/SKILL.md)（出口 1 :47-51 加判据；Red Flags :80-86 改写呼应）。
- **evidence**：[wayfinder/SKILL.md](/Users/maverick/skills/skills/engineering/wayfinder/SKILL.md):13 "The pull to just do the work is usually the signal…time to hand off"、:88 "state the question precisely now, not whether you can answer it now"。

---

**AB-21 · spike 受控例外（以 prototype 成型规则为规则来源）**（medium）

- **what**：exploring HARD-GATE 内开「spike 受控例外」小节（约 8 行）：触发判据=问题属于「纸上推不动、跑一次代码才能回答」且「因解锁一个决策而存在，不为交付目的地」，经用户同意。四条成型纪律：①第一天起 throwaway 标记（文件名含 spike/prototype、放最接近问题的位置）；②默认无持久化（状态留内存，涉及存储才用 scratch 资源 + wipe-me 命名）；③跳过打磨（无测试/错误处理/抽象）；④问题先行（开写前把要回答的问题写进笔记或 spike 顶部）。收场：verdict 提议记入 explorations 笔记；转 RA 只带结论与位置指针；被验证的决策编码（state machine/reducer/schema/type shape）经窄例外内联进 spec「关键接口」节并标注来源；Red Flags 加「spike 无 throwaway 标记/开始打磨」一条。
- **why**：exploring:37 已承认「值得先做 spike」、:19 却一刀切禁止——「做一点才知道」的问题被迫中断或走私进实施；prototype 的成型规则是成熟纪律，优于自造判据。
- **where**：[exploring/SKILL.md](../../skills/exploring/SKILL.md)（HARD-GATE :18-20 内或紧随；:37/:45/:82 衔接）、[spec-template.md](../../skills/requirement-analysis/assets/spec-template.md)（关键接口节 :98-100）。
- **evidence**：[prototype/SKILL.md](/Users/maverick/skills/skills/engineering/prototype/SKILL.md):21 "Throwaway from day one"、:23 "State lives in memory"、:26 "The main branch keeps only the validated decision"；[LOGIC.md](/Users/maverick/skills/skills/engineering/prototype/LOGIC.md):20；[to-spec/SKILL.md](/Users/maverick/skills/skills/engineering/to-spec/SKILL.md):55,57。

---

**AB-23 · frontier 决策清单可见（展示性进度工件）**（low）

- **what**：clarifying 第 0 条披露之后给出按依赖排序的未决决策清单（决策名 + 一句悬而未决表述 + 依赖关系），随裁决逐项勾销、新解锁的下游问题追加，共识摘要即「清单勾完 + 挂起项」——**只改可见性，不改一次一题交互形态**；依赖排序条目末尾追加半句「同级并列时最重要者先问」。
- **why**：给提问过程三样现在没有的东西：进度可见（用户知道还剩多少）、结构性终止（「感觉问完了」变成「清单空了」）、用户中途改道入口；不触碰一次一题红线与既有 eval。
- **where**：[clarifying/SKILL.md](../../skills/clarifying/SKILL.md)（核心纪律新增一条 + 排序条半句）；requirement-analysis/quick-fix 经引用继承自动覆盖。
- **evidence**：[grilling/SKILL.md](/Users/maverick/skills/skills/productivity/grilling/SKILL.md):8 frontier 定义、:24 "Recompute the frontier"、:28 "done when the frontier is empty"；[to-questionnaire/SKILL.md](/Users/maverick/skills/skills/productivity/to-questionnaire/SKILL.md):20 "most-important-first"。

---

### 5.2 P1 —— 值得做（26 条索引）

| ID | 标题 | effort | 落点 |
|----|------|--------|------|
| AB-38 ⬆ | 插件根便携解析序列统一（**内含现存真实 bug**：writing-plans:118 裸相对路径在任何用户项目 cwd 下必失败；install.mjs 实测只拷 3 个 mjs 不含 validate-output） | low | [writing-plans/SKILL.md](../../skills/writing-plans/SKILL.md):118（无变量裸路径，bug 本体）+ 7 处 CLAUDE_PLUGIN_ROOT 变量引用文件（含 [executing-plans](../../skills/executing-plans/SKILL.md):93、[acceptance-qa](../../skills/acceptance-qa/SKILL.md):78/81 两处易漏点；[code-explorer.md](../../agents/code-explorer.md):148），共 8 个改动文件 |
| AB-11 | 派发指针不复制 + 执行期探索分工 | low | [review-orchestration.md](../../skills/executing-plans/references/review-orchestration.md)；[executing-plans/SKILL.md](../../skills/executing-plans/SKILL.md) |
| AB-04 | 重构移出红绿循环、划归收尾审查 | low | [test-driven-development/SKILL.md](../../skills/test-driven-development/SKILL.md):49 与 :123-125 |
| AB-05 | typecheck 作为最便宜验证档 | low | [writing-plans/SKILL.md](../../skills/writing-plans/SKILL.md):105；[executing-plans/SKILL.md](../../skills/executing-plans/SKILL.md):69 |
| AB-07 | Self-Review 依赖最小性第 5 查 + 产物 review 门目标化三问 | low | [writing-plans/SKILL.md](../../skills/writing-plans/SKILL.md)；[requirement-analysis/SKILL.md](../../skills/requirement-analysis/SKILL.md) 阶段 7 |
| AB-03 | mock 策略分层：准入正负清单 + 设计处方 + 依赖形态四分类 | medium | [testing-anti-patterns.md](../../skills/test-driven-development/references/testing-anti-patterns.md)；[test-strategy/SKILL.md](../../skills/test-strategy/SKILL.md) |
| AB-08 | prefactor 识别与排序：前置重构固化为最前任务槽位 | medium | [writing-plans/SKILL.md](../../skills/writing-plans/SKILL.md) |
| AB-09 | 设计判据包：删除测试 + 两-adapter 计数 + 接口收敛三问 | low | [design-principles.md](../../skills/writing-plans/references/design-principles.md) 等 4 处（判据单点定义于此，审查维度只引用） |
| AB-13 | review 微纪律包：smell 基线 / 扇出前置校验 / 报告保底可见 / 措辞负面清单 / 否决记忆 / 优先处置 | low | [code-reviewer.md](../../agents/code-reviewer.md)；[review-orchestration.md](../../skills/executing-plans/references/review-orchestration.md) |
| AB-14 | 收尾审查可选「架构深化」维度（friction 五问 + deletion test） | medium | [review-orchestration.md](../../skills/executing-plans/references/review-orchestration.md)；[code-reviewer.md](../../agents/code-reviewer.md) |
| AB-17 | quick-fix 5a 引入 correct seam 判定与「无 seam 即架构发现」 | medium | [quick-fix/SKILL.md](../../skills/quick-fix/SKILL.md) |
| AB-18 | quick-fix 修复收尾四则：flaky 复现率 / 插桩清理 / 症状回放 / 根因叙事 | low | [quick-fix/SKILL.md](../../skills/quick-fix/SKILL.md) |
| AB-19 | quick-fix 会话级止损：一次会话一个修复对象 | low | [quick-fix/SKILL.md](../../skills/quick-fix/SKILL.md) |
| AB-22 | 探索笔记「未决问题」拆为未决与已排除两节 | low | [exploring/SKILL.md](../../skills/exploring/SKILL.md) |
| AB-25 | HITL 问题 agent 不得自代的显式红线 | low | [clarifying/SKILL.md](../../skills/clarifying/SKILL.md) |
| AB-26 | explorer 两则：primary-source 追溯 + 可选后台调研通道 | low | [external-resource-explorer.md](../../agents/external-resource-explorer.md)；[exploring/SKILL.md](../../skills/exploring/SKILL.md):10 |
| AB-27 | 仓库级词汇表 .spec-dev/glossary.md + 术语冲突对质 | medium | [requirement-analysis/SKILL.md](../../skills/requirement-analysis/SKILL.md) + [spec-template](../../skills/requirement-analysis/assets/spec-template.md)；[clarifying/SKILL.md](../../skills/clarifying/SKILL.md):32 |
| AB-29 | 完备性两则：测试先例探索模态 + actor 枚举 | low | [requirement-analysis/SKILL.md](../../skills/requirement-analysis/SKILL.md) + [spec-template](../../skills/requirement-analysis/assets/spec-template.md) |
| AB-30 | 正交约束预分配 + 「拒绝的解读」小节 | low | [requirement-analysis/SKILL.md](../../skills/requirement-analysis/SKILL.md)；[design-principles.md](../../skills/writing-plans/references/design-principles.md) |
| AB-31 | 探索期否决记忆：per-concept 沉淀 + 路由前置双查 | medium | [clarifying/SKILL.md](../../skills/clarifying/SKILL.md)；[triage.md](../../commands/triage.md) |
| AB-32 | 子代理派发词纪律：验收判据 + 显式排除项 + 好坏对照例 | medium | [exploration-patterns.md](../../skills/requirement-analysis/references/exploration-patterns.md)；[code-reviewer.md](../../agents/code-reviewer.md) |
| AB-33 | progress.yaml 认领键（claim-first）+ 提交 Spec 追溯 trailer | low | [executing-plans](../../skills/executing-plans/SKILL.md)；[writing-plans](../../skills/writing-plans/SKILL.md)；[guardrail/README](../../guardrail/README.md) 两语言版 |
| AB-35 | 计划头部「关联 skill」声明 + 胶囊指针 gist+pointer 双要素 | low | [writing-plans/SKILL.md](../../skills/writing-plans/SKILL.md)；[roadmap-template:49](../../skills/requirement-analysis/assets/roadmap-template.md) |
| AB-36 | 失败隔离单点定义 + 上下文耗尽主动止损 | low | [exploration-patterns.md](../../skills/requirement-analysis/references/exploration-patterns.md)（canonical）；另 3 处改引用 |
| AB-37 | hard/soft 依赖分级表 + 校验器断电降级 | low | [README.md](../../README.md)；[exploration-patterns.md](../../skills/requirement-analysis/references/exploration-patterns.md):64-75 等 |
| AB-40 | visual-preview 会话产物临时目录化（真实问题：PROJECT_DIR 默认落目标仓库 .spec-dev/visual/，与「唯一入 git 是定稿」规则张力；隔离靠 gitignore 非结构） | low | [start-server.sh](../../skills/visual-preview/scripts/start-server.sh)（SESSION_DIR 三分支） |

（AB-38 标 ⬆：Critic 建议在 P1 内最先执行——它是全清单唯一直接收敛现存 bug 的条目。AB-28 与 AB-39 经权威分组核对属 P2，已移至 §5.3。）

### 5.3 P2 —— 可选（9 条索引）

| ID | 标题 | effort | 落点 / 备注 |
|----|------|--------|------------|
| AB-43 | description 触发词原话化 + 单语瘦身 | medium | 各 [*/SKILL.md](../../skills/) frontmatter + agents/openai.yaml + trigger-evals。**数字已修正**：本项目平均 648.4 字符（min 404/max 940，>800 者仅 2 条）vs 外部平均约 145（中位 136）——早期「约 900」与二轮「170/156」两次表述均不成立；论据（双语 2x token、原话触发词匹配度）仍成立，但改动面 13 SKILL+openai.yaml+触发回归，降 P2 |
| AB-24 | 同层独立小批提问受限阀门（≤3 题，三前置门控） | medium | [clarifying/SKILL.md](../../skills/clarifying/SKILL.md) + [evals.json](../../skills/clarifying/evals/evals.json)；同步引用方三处。等真实「用户嫌慢」反馈再上；届时 eval 的三独立点场景改阀门正例 |
| AB-34 | /spec-dev status 全局状态面板（doctor 姊妹件） | medium | scripts/ 新增 status.mjs，复用 [guardrail/check-spec-drift.mjs](../../guardrail/check-spec-drift.mjs)（非 scripts/）的 frontmatter 解析 |
| AB-15 | acceptance-qa deep 档可选 HTML 汇总报告 | medium | [acceptance-qa/SKILL.md](../../skills/acceptance-qa/SKILL.md)；新建模板 acceptance-qa/templates/html-report.md |
| AB-28 | ADR 资格类型短清单 + 边界场景压测锐化术语 | low | [spec-template](../../skills/requirement-analysis/assets/spec-template.md)；[requirement-analysis/SKILL.md](../../skills/requirement-analysis/SKILL.md):142 或 [clarifying/SKILL.md](../../skills/clarifying/SKILL.md):32 |
| AB-39 | Codex 适配知识收敛为单一 platform-compat.md | medium | [codex-compat.md](../../skills/requirement-analysis/references/codex-compat.md) 扩展 + 7 文件改指针（TDD 无实质内容可指、排除） |
| AB-41 | guardrail 可选破坏性命令拦截层（opt-in 默认关） | medium | [guardrail/install.mjs](../../guardrail/install.mjs) + [guardrail/templates/](../../guardrail/templates/) + [guardrail/README.md](../../guardrail/README.md)；退出码 2 约定实际在 guardrail/README.md:21/:23 |
| AB-42 | 成熟度分区（**修正版**：实验 skill 放 `skills/` 外目录即不进插件）+ 纯壳委托编写约定 | low | [README.md](../../README.md) 发布纪律说明。原始版「改 plugin.json」前提已证伪——本项目 plugin.json 无 skills 键，靠目录约定自动发现 |
| AB-44 | opt-in 并行执行模式原型（实验沙盒，§3.1 专项新增） | medium | 仓库顶层 `skills-in-progress/parallel-executing-plans/`（新建，不进插件）。触发条件=导航表 ≥2 条独立链且改动面不相交；implementer 每票强制 TDD 五步+契约锚定（补 beta 丢掉的纪律）；merger 由主线程兼任；progress.yaml 分片/加锁 |

### 5.4 已裁决的跨配对冲突（12 组，摘要）

1. **seam 两案合一**（tdd#1 + to-spec#1 + implement#2b）：最终形态「上游声明权威 + TDD 门兜底」——spec/plan 有声明以声明为准，即兴场景才问用户。**不合并会产生两道重复问用户的门**。
2. **spike 四案合一**（wayfinder#4 + to-spec#3 + prototype#1/#2）：规则来源裁定为 prototype 成型规则（结构性判据优于自造代理指标）。
3. **批问 vs 一次一题**：一次一题保持默认与红线主句（介质匹配/深树/术语污染三理由）；批问以三个可剥离构件进入（AB-23 清单可见、AB-24 受限阀门 P2、排序半句并入 AB-23）。
4. **expand–contract 两轮重述合一**：取第一轮完整版（含两级降级）。
5. **产物 review 三问多处合一**：「呈现产物 + 2-3 个目标化检查问题」通用形态，RA 阶段 7 与 writing-plans 交接两处各自落地。
6. **实现耦合测试三案合一**：裁决方向取「挪测试位置而非改实现迁就测试」。
7. **deletion test 双落点**：判据单点落 design-principles.md，审查维度只引用不复制。
8. **prefactor 两处合一**：「识别 + 固化为最前任务槽位」一步。
9. **plugin.json 事实纠偏三条**：无 skills 键（目录约定发现）；description 平均 648 非 900；发布清单实为 5 处 manifest。
10. **PR 通道两轮口径不一**：取第一轮吸收版（仅受保护/PR 制场景启用，默认仍本地合并+锚定）。
11. **批问阀门两案合一**：以配对版为主体（含 Codex 形态与 eval 改写细节）。
12. **mock 纪律分层**：testing-anti-patterns（准入层）与 test-strategy（策略层）互补不合并。

### 5.5 执行顺序建议（Critic 终审意见）

- **P0 九条维持且按序**：AB-01（seam 上游声明）与 AB-12（Spec 符合性维度 S）分别是 TDD 入口与「做的是不是这件事」判定通道的整体缺位；AB-02/AB-16 直接对应 LLM 高频失败模式；AB-21 是唯一带 HARD-GATE 例外的规则变更，需最早定形。
- **P1 内最先**：AB-38（含现存 bug）。
- **P2 前置条件**：AB-43 先修正数字前提再决定；AB-34 先修 guardrail/ 路径表述。

---

## 六、明确不吸收（16 项，防止重复提案）

| # | 被拒建议 | 一句话理由 |
|---|---------|-----------|
| 1 | beta 分区改 plugin.json（原始版） | 前提证伪：plugin.json 无 skills 键；修正版 AB-42 已入库 |
| 2 | [grilling](/Users/maverick/skills/skills/productivity/grilling/SKILL.md) 整轮批问交互形态 | 介质匹配/深树/术语污染三理由，保留一次一题 |
| 3 | [diagnosing-bugs](/Users/maverick/skills/skills/engineering/diagnosing-bugs/SKILL.md) 的十级 loop 构造、最小化 repro load-bearing 判据、3-5 假设完整 ranking | 重型机械会破坏 quick-fix 轻量定位；高频遇到应另立 diagnosing 类 skill |
| 4 | [domain-modeling](/Users/maverick/skills/skills/engineering/domain-modeling/SKILL.md) 常驻横切纪律 + CONTEXT-MAP 多 context | 八阶段已承载术语挑战；多 context 对单仓库特性流水线是过度设计 |
| 5 | [codebase-design](/Users/maverick/skills/skills/engineering/codebase-design/SKILL.md) 八词 Glossary 整体引入 | 与 spec 术语表+Avoid 重复，且与 Language Protocol 冲突、形成第二套语言系统 |
| 6 | ready-for-agent/ready-for-human 双通道状态机 | B 是一次性形态判别器（零落盘），跨会话状态已在产物层解决 |
| 7 | [AGENT-BRIEF](/Users/maverick/skills/skills/engineering/triage/AGENT-BRIEF.md) 的 durability 原则（禁路径/行号） | 前提不成立：writing-plans 刻意要精确路径，plan 获批即执行，staleness 由 frontmatter 管 |
| 8 | 发布即分诊（spec 打标签进 tracker 免二次 triage） | 架构选择不同：A 以 tracker 为状态机，B 用 repo 文件+交接 |
| 9 | [implement-spec](/Users/maverick/skills/skills/in-progress/implement-spec/SKILL.md) 并行 implementer/merger 范式（作为 executing-plans 的默认范式替换） | 与「主线程干活、子代理不写码」范式正面对立；且机制级核对显示 beta 并发版**丢了 TDD、merger 冲突处理零定义**（§3.1.2），直接移植是净损失。裁决细化为条件化：默认串行维持，并行以**条件触发的实验通道**另立（AB-44：≥2 条独立链 + 改动面不相交 + 每票强制 TDD），吸收其 PR 载体（AB-10）与执行期探索分工（AB-11）不变 |
| 10 | [to-questionnaire](/Users/maverick/skills/skills/productivity/to-questionnaire/SKILL.md) 第三方问卷全套 | B 无「答主是第三方」象限 |
| 11 | [triage](/Users/maverick/skills/skills/engineering/triage/SKILL.md) 的验证前置（先复现/跑测试） | B 的 triage 判形态不判真伪；诊断期验证已由 AB-16 承担 |
| 12 | 环境变体按载体分文件（[setup 三 tracker 变体](/Users/maverick/skills/skills/engineering/setup-matt-pocock-skills/SKILL.md)） | 与 AB-39 收敛方向相反，扩大维护面 |
| 13 | docs/ 人类读者镜像层 | README 双语已承担，双份维护引入漂移面 |
| 14 | [prototype](/Users/maverick/skills/skills/engineering/prototype/SKILL.md) 的 UI 型原型机制（variants/switcher/NODE_ENV gate，[UI.md](/Users/maverick/skills/skills/engineering/prototype/UI.md)） | 已被 visual-preview 以更轻机制覆盖 |
| 15 | 对外发言强制 AI 署名免责 | B 不向 issue tracker 发言 |
| 16 | [ask-matt](/Users/maverick/skills/skills/engineering/ask-matt/SKILL.md) 的 phase boundaries 五选一完整决策树（[PHASE-BOUNDARIES.md](/Users/maverick/skills/skills/engineering/ask-matt/PHASE-BOUNDARIES.md)） | B 的上下文管理已分散解决；仅吸收「降质不硬撑、最近边界重开」半句（并入 AB-36） |

---

## 七、本项目已更强之处（对照结论，无需动作）

- **evals 触发回归**：12/13 skill 带 evals.json（vendored anysearch 除外）、6 个带 trigger-evals 双向集——外部整仓零 eval。
- **五层漂移守卫**：PreToolUse 编辑拦截 → Stop 收尾审计 → pre-commit → pre-push → CI；外部零防护（这是被装进他人仓库的插件的安全护城河）。
- **openai.yaml 完整 subagent 定义 + 同步 tripwire**（check-openai-sync.mjs）；外部只是 3 行 UI 卡片。
- **schema 契约校验**（scripts/schemas/ 实测 4 个 schema JSON + README）与 vendored 上游生命周期管理（update-vendored-skill.mjs，tag/SHA 双模式）。
- **断点恢复**（progress.yaml 唯一状态源 + 一致性校验续跑）；外部无恢复机制（每 session 一票是节奏约束不是恢复协议）。
- **验收矩阵对账**（DELIVERED/DEFERRED/DROPPED/SUPERSEDED/ADDED-IN-FLIGHT 五态逐条裁决 + 回写 spec）；外部交付止于 PR ready。
- **升级不重来的交接契约**（quick-fix→RA 带根因输入、阶段 2/3 不重做）；外部无对应机制。
- **取代生命周期**（supersede/pending 标注/ covers 接管/sync_commit 锚定）；外部靠 tracker issue 关闭语义。

---

## 八、方法论与数据可信度

### 8.1 方法

两轮 ultracode Workflow + 一轮独立复核，共 **44 个 agent**（第一轮 16、第二轮 21、复核轮 7）、约 **268 万 tokens**、**754 次工具调用**：

- 第一轮：6 主角深读 + 外部生态地图 + spec-dev 地图 + 7 组配对 + 完整性批判。
- 第二轮：补读 5 簇剩余文件（正式版 implement、code-review、diagnosing-bugs、grilling、domain-modeling、codebase-design、triage、setup 等全部未读件）+ 8 组次级配对 + 6 个生态角度 + Reconcile 合并去重 + Critic 逐条证据复核（P0/P1 全查、P2 抽查 5 条）。
- 复核轮（第三轮）：6 域并行核验 420 条断言（外部引文逐字/本项目行号/结构断言实测/内部一致性/与 workflow 原始结论保真/图表事实）+ 对抗裁决——16 项确认（1 error + 3 major + 12 minor，已全部修正入正文）、5 项候选被驳回为误报。

### 8.2 可信度结论（第二轮 Critic 原话摘要）

> 两轮 75 条吸收-去重-43 条编号的结构与 14 组主题合并经抽查**均无幽灵条目或同源漏并**；两处冲突裁决（seam「上游声明权威+TDD 门兜底」、批问「默认一次一题+三可剥离构件」）复核通过、无需重开。

### 8.3 全部已知纠偏（引用数字以本报告为准）

1. **plugin.json**：本项目无 skills 键（skill 靠目录约定自动发现）；外部反而显式列 25 项（engineering 18 + productivity 7，零 in-progress）——「17+8」的拆分为早期误记。
2. **description 长度**：本项目平均 **648.4 字符**（min 404 / max 940；>800 者仅 acceptance-qa 940 与 clarifying 933）；外部 37 个 SKILL.md 平均 **约 145**（中位 136，frontmatter 首行值口径）。早期「约 900 vs 195」与二轮「170/156」两次表述均不成立（第三轮复核实测）。
3. **schema 数**：scripts/schemas/ 实测 4 个 schema JSON + README.md。
4. **check-spec-drift.mjs 位置**：在 `guardrail/` 而非 `scripts/`。
5. **CLAUDE_PLUGIN_ROOT 引用**：skills/+agents/ 下实测 7 文件（改动清单易漏 executing-plans:93 与 acceptance-qa:78/81）；code-explorer.md 的变量引用实际在 :148；writing-plans:118 是无变量的裸相对路径（bug 本体），不计入 7 文件、但计入改动清单（共 8 个）。
6. **writing-plans:118 是现存真实 bug**：cwd=用户项目时裸相对路径 `scripts/validate-output.mjs` 必失败；install.mjs:47-49 实测只拷 3 个 mjs、不含 validate-output。
7. **visual-preview**：visual 目录不随守卫安装；真实问题是 PROJECT_DIR 默认使会话目录落在目标仓库 `.spec-dev/visual/`。
8. **guardrail 退出码 2 约定**：在 guardrail/README.md:21/:23（zh-CN 同行号），代码侧注释见 check-spec-drift.mjs:71 附近。首轮引 :12-18 与真值差 3-5 行（容差内）；二轮纠偏值 :95 反而是不存在的行号（README 仅 70 行）——本条为第三轮复核修正。
9. **外部 docs/agents/issue-tracker.md**：是 setup 在用户仓库生成的目标侧产物，外部仓库本身无此文件；实际模式是「目标侧单点定义 + 4 处同句式轻引用」。
10. **evals 覆盖**：实测 12/13（vendored anysearch 无 evals/）、trigger-evals 6 个——「13/13、7 个」为早期误记。
11. **AB-39 改指针清单**：test-driven-development 不在列——其 SKILL.md 中 Codex 仅 1 次通用性声明（:20），无实质适配内容可指向 platform-compat.md。
12. **AB-34 evidence 路径**：issue-tracker-github.md 实际位于 setup-matt-pocock-skills/ 下（wayfinder 目录无此文件），frontier 查询定义在其 :43。

### 8.4 未覆盖残余（后续可深挖）

- productivity 分区的 teach/writing-for-agents/handoff 等非工程 skill 未逐个配对（与本项目域正交，价值低）。
- 外部 deprecated/ 与 misc/ 分区未读。
- 「多人多会话同时操作同一特性目录」的压力场景（本项目并发防护=撞号重扫，未实测并发行为）。

### 8.5 第四轮核验（2026-09-03，逐条实测）

> 由 spec-dev requirement-analysis 主线程编排 9 个只读子代理完成：P0/P1/P2 全部 44 条的落点行号、空白真实性（全仓中英同义词 grep）与影响面逐条核对；外部 37 处 `file:line` 引文逐字核对；§8.3 数字断言全部实测；另做执行链架构、契约守卫、skill 引用网三份地形勘察与上游/平台官方文档外部探索。仓库 HEAD 095eb40（与报告分析时一致），外部快照 HEAD 6654f6b（= origin/main，implement-spec 上游无变更）。

**总体结论**：44 条 0 条不成立；成立 34 条、部分成立 10 条（既有近义机制被低估）。本项目落点行号 100% 命中（2 处偏 1 行），外部引文 37 处行号全中、逐字零错。AB-38 的 bug 实测复现（用户项目 cwd 下 `node scripts/validate-output.mjs` → `MODULE_NOT_FOUND`，exit 1）。

**A. 影响裁决的修正（3 条）**

1. §3.1.3 "导航表（依赖闭包可推导改动面是否相交）"**不成立**：导航表四列无文件路径列，路径只在各任务文件「文件」块（自由 markdown，plan-index 不解析）；依赖列范围写法 `T01-T06` 被 validate-output.mjs:200 只解析为两个端点（真实 index.md 的 T07 机器闭包因此漏 T03-T05）。独立依赖链可推导，改动面相交不可推导——并发模式的触发条件需补机器可读的写集合声明。
2. §8.3 #1 与 AB-42 前提"本项目无 skills 键、靠目录约定自动发现"只对 Codex（.codex-plugin/plugin.json:36）、pi（package.json pi.skills）、Agent-Plugins 成立；Claude 侧 .claude-plugin/marketplace.json:18-32 显式 `skills[]` 13 项且 scripts/check-plugin.mjs:97-121 双向校验（磁盘有清单无、清单有磁盘无均报错）。AB-42 修正版结论"放 skills/ 外即不进插件"仍成立（四条发现路径都只指向 skills/），但新增 skill 必须登记 marketplace.json，否则 pre-commit 直接失败。
3. AB-40 "PROJECT_DIR 默认落目标仓库"应限定：start-server.sh 裸默认是 `/tmp/brainstorm-<id>`（:166），落目标仓库是 SKILL.md:38 标准调用固定带 `--project-dir` 所致；且 SKILL.md:74 与 stop-server.sh:112-117 有意保留项目内会话供回看——"临时目录化"与该既有设计对撞，吸收形态改为结构化隔离（脚本自建 .gitignore）。

**B. 影响实施面的修正（11 条）**

- AB-38：install.mjs 拷贝行为 :46-48（报告 :47-49 偏 1）；三种路径写法并存——变量+降级句 3 处（acceptance-qa:81、external-resource-explorer:31、scripts/schemas/README:16）、变量裸用 8 处、裸相对路径 1 处（writing-plans:118，skill 指令中唯一）；全仓无 `${CLAUDE_PLUGIN_ROOT:-…}` 形式。
- AB-36：非 canonical 复述 4 处而非 3 处（漏 codex-compat.md:54，且主体词已分化为"主进程"）；另有"契约校验失败→补全一次→主线程接管"姊妹变体散 exploration-patterns:72、review-orchestration:21、executing-plans:93、schemas/README:14。
- AB-39：7 个专节文件外另有 8 处单句适配（using-git-worktrees:56/:88、writing-plans:135、exploring:78、visual-preview:52、spec-reviewer-prompt:7、exploration-patterns:86、spec-template:13、mcp-setup:19）。
- AB-43：落点应为 13 个 `skills/<name>/agents/openai.yaml`（顶层 agents/ 无此文件）。
- AB-05：executing-plans 落点为 :68（验证措辞所在行），非 :69。
- AB-10：where 漏列 writing-plans:231-296 最终任务模板（合并与锚定步骤的定义处，executing-plans:112 只是引用）；PR 通道首次引入 push 动作，会触发 guardrail pre-push 区间闸与 CI——"不触碰 guardrail"需限定为"不改其机制"。
- AB-12：影响面漏列 scripts/schemas/review-findings.json:15 的 category 闭合枚举（新维度必改 schema）与 ep-review-orchestration eval 写死"3 路 A/B/C"。
- AB-16：quick-fix:39 在 2.5 列表外已有第 4 个升级信号（双 active spec 矛盾），"补第 4 条"实为并入列表成第 5 条。
- AB-21：仓内既有近义锚点 TDD:28"一次性原型"例外与 quick-fix:66 未被引用；README 双语 :11/:146 "no code / 只读不写码"与受控例外直接冲突需同改。
- AB-22：前提不准——"已排除"不在「未决问题」项下，现承接位是「考察过的选项与取舍」；exploring evals 已把已排除选项列为交接结论。
- AB-23："结构性终止缺失"不成立（clarifying:43 共识态已定义）；落地须对表 clarifying spec 非目标 :22 与 roadmap 2026-08-05 备注"frontier 模式不引入"。

**C. 部分成立清单（10 条，既有近义机制）**：AB-20（用户侧冲动路由已有 exploring:83 + eval ex-hard-gate，仅 agent 侧 :82 缺）、AB-23、AB-11（指针不复制已有局部实践 review-orchestration:54，exploration-patterns:86 有反向条款）、AB-13（六项中仅扇出前置校验与措辞负面清单确缺）、AB-22、AB-25（原则已在 clarifying:14/:30/:43，缺反向 Red Flag）、AB-26（来源优先级已有 explorer:20-24，缺回溯指令）、AB-29（测试模态 deep 档已有 exploration-patterns:37，仅 standard/light 无）、AB-31（RA:107 已有 explorations 前置查阅，triage 无）、AB-32（验收判据空白；排除项/对照例散见 code-reviewer:193-198、exploration-patterns:87、spec-reviewer-prompt:28-34）、AB-35（关联 skill 声明在头部 :86/:98/:122 已有部分）。

**D. 记法与口径（6 条）**：§8.3 #2 description 长度为原始文本口径（含 `>-` 换行缩进），YAML 解析真值每条少 5 字符（均值 643.6 / min 399 / max 935），排序与">800 仅两条"结论不变；§1.1 grill-with-docs 引文丢两对双引号；§1.3 "拒绝跨轴选冠军"原句在 code-review:78（:76 只有"不重排"）；§3.1.1、AB-44、§1.2 对 implement-spec 步骤三套记法并存（步骤号 / 行号 / 自编①-⑤），"完成即合并"属步骤 5；"状态源 tracker"为推断（SKILL.md 全文无 tracker 一词）；§8.3 #9 "4 处同句式轻引用"按 tracker 口径成立、按句式实测 5 处（多 triage:43）；AB-01 to-spec:15 原文四句合为三条（语义无损）。

**E. 仓库侧新发现（非报告错误）**：README:119 双语 trigger-evals "四个 skill"实为 6 个文件；README 目录结构只列 9/13 skill，scripts 列表缺 doctor.mjs 与 update-vendored-skill.mjs；README:171 双语"四查"只列三项；README:262 "3 output contract schemas"（实 4 个 json，第 4 个为 manifest schema）；测试基线现为 11 文件 51 个 test（报告 44 为 2026-08-27 T00 时点）；check-spec-drift.mjs:275 parseFrontmatter 未导出、session-context.mjs:43-48 另有一份极简副本；quick-fix:66 TDD 例外清单复述与 TDD:28 不一致（"配置文件/纯文案/一次性原型" vs "一次性原型、生成代码、配置文件"）；本仓库自身未安装 PreToolUse/Stop 守卫且 pre-commit 不跑漂移检查（只能手工 `node guardrail/check-spec-drift.mjs`）；session-context.mjs 对绝对路径形式的 core.hooksPath 疑似误报"git gate not enabled"（未实测根因）。

**F. 上游与平台现状（2026-09-03）**：implement-spec 上游无变更（仍 in-progress，全历史 2 次提交均 2026-08-21，维护者对相关 issue 零回复）；社区 9 个 open issue 实测暴露——#942 worktree 基线陈旧致假绿与真冲突、#943 gitignored 夹具让 worktree 内测试静默跳过、#936 frontier 因 tracker 关票时机无法推进、#988 共享资源字面名未预钉致并行冲突、#991 未先合并 PR tip 的分支必冲突且 `refs/stash` 跨 worktree 互踩、#1010 零提交时 draft PR 开不出且无冲突时 merger 子代理多余且"后台运行"不带来并发（真正杠杆是同一消息派发全部 frontier）、#1014 审查修复循环无界（跑 4 小时）、#1011 目标应为 integration branch 而非 PR。Claude Code 官方：`isolation: "worktree"` 默认从远端默认分支分叉（需 settings `worktree.baseRef: "head"` 才基于当前分支），无自动合并、子代理不能 ExitWorktree，后台子代理无 AskUserQuestion，并发上限默认 20。Codex 官方：`spawn_agent`/`wait_agent`/`close_agent` 等 stable 默认开启，但无 cwd/worktree 参数、子代理继承父 cwd，并发默认 6（v2 为 4），完成态 agent 直到 `close_agent` 才释放名额，工具描述要求"仅显式要求时派生"与"不相交写集合"。

**处置**：上述修正已写入 roadmap `../roadmaps/2026-09-03-01-skill-ecosystem-absorption.md` 各子项目的上下文胶囊；44 条按该 roadmap 8 个子项目分批吸收，AB-44 升格为子项目 #2（独立正式 skill `executing-plans-parallel`、由 executing-plans 分支调用、opt-in），AB-39/42 从 P2 提入子项目 #1。

---

## 附录 A：本地路径索引（点击直达）

### A.1 外部生态（本机绝对路径，根 `/Users/maverick/skills/skills`）

**主链六主角**

| Skill | 文件 |
|-------|------|
| 🗺️ wayfinder | [SKILL.md](/Users/maverick/skills/skills/engineering/wayfinder/SKILL.md) |
| 📋 to-spec | [SKILL.md](/Users/maverick/skills/skills/engineering/to-spec/SKILL.md) |
| 🎫 to-tickets | [SKILL.md](/Users/maverick/skills/skills/engineering/to-tickets/SKILL.md) |
| 🔨 implement（正式版，15 行） | [SKILL.md](/Users/maverick/skills/skills/engineering/implement/SKILL.md) |
| 🔨 implement-spec（beta，35 行，§3.1 专项） | [SKILL.md](/Users/maverick/skills/skills/in-progress/implement-spec/SKILL.md) |
| 🧪 tdd | [SKILL.md](/Users/maverick/skills/skills/engineering/tdd/SKILL.md) · [tests.md](/Users/maverick/skills/skills/engineering/tdd/tests.md) · [mocking.md](/Users/maverick/skills/skills/engineering/tdd/mocking.md) |
| 🏗️ improve-codebase-architecture | [SKILL.md](/Users/maverick/skills/skills/engineering/improve-codebase-architecture/SKILL.md) · [HTML-REPORT.md](/Users/maverick/skills/skills/engineering/improve-codebase-architecture/HTML-REPORT.md) |

**配套簇（第二轮 Fill 读全）**

| 簇 | Skill 与文件 |
|----|-------------|
| 提问 | [grilling](/Users/maverick/skills/skills/productivity/grilling/SKILL.md) · [grill-me](/Users/maverick/skills/skills/productivity/grill-me/SKILL.md) · [wait-what](/Users/maverick/skills/skills/productivity/wait-what/SKILL.md) · [to-questionnaire](/Users/maverick/skills/skills/productivity/to-questionnaire/SKILL.md) · [grill-with-docs](/Users/maverick/skills/skills/engineering/grill-with-docs/SKILL.md) |
| 审查/诊断 | [code-review](/Users/maverick/skills/skills/engineering/code-review/SKILL.md) · [diagnosing-bugs](/Users/maverick/skills/skills/engineering/diagnosing-bugs/SKILL.md) · [resolving-merge-conflicts](/Users/maverick/skills/skills/engineering/resolving-merge-conflicts/SKILL.md) |
| 语言/设计 | [domain-modeling](/Users/maverick/skills/skills/engineering/domain-modeling/SKILL.md)（[CONTEXT-FORMAT](/Users/maverick/skills/skills/engineering/domain-modeling/CONTEXT-FORMAT.md) · [ADR-FORMAT](/Users/maverick/skills/skills/engineering/domain-modeling/ADR-FORMAT.md)）· [codebase-design](/Users/maverick/skills/skills/engineering/codebase-design/SKILL.md)（[DESIGN-IT-TWICE](/Users/maverick/skills/skills/engineering/codebase-design/DESIGN-IT-TWICE.md) · [DEEPENING](/Users/maverick/skills/skills/engineering/codebase-design/DEEPENING.md)） |
| 路由/配置 | [triage](/Users/maverick/skills/skills/engineering/triage/SKILL.md)（[AGENT-BRIEF](/Users/maverick/skills/skills/engineering/triage/AGENT-BRIEF.md) · [OUT-OF-SCOPE](/Users/maverick/skills/skills/engineering/triage/OUT-OF-SCOPE.md)）· [ask-matt](/Users/maverick/skills/skills/engineering/ask-matt/SKILL.md)（[PHASE-BOUNDARIES](/Users/maverick/skills/skills/engineering/ask-matt/PHASE-BOUNDARIES.md)）· [setup-matt-pocock-skills](/Users/maverick/skills/skills/engineering/setup-matt-pocock-skills/SKILL.md)（[github](/Users/maverick/skills/skills/engineering/setup-matt-pocock-skills/issue-tracker-github.md) · [gitlab](/Users/maverick/skills/skills/engineering/setup-matt-pocock-skills/issue-tracker-gitlab.md) · [local](/Users/maverick/skills/skills/engineering/setup-matt-pocock-skills/issue-tracker-local.md) · [triage-labels](/Users/maverick/skills/skills/engineering/setup-matt-pocock-skills/triage-labels.md) · [domain](/Users/maverick/skills/skills/engineering/setup-matt-pocock-skills/domain.md)） |
| 执行支持 | [prototype](/Users/maverick/skills/skills/engineering/prototype/SKILL.md)（[LOGIC](/Users/maverick/skills/skills/engineering/prototype/LOGIC.md) · [UI](/Users/maverick/skills/skills/engineering/prototype/UI.md)）· [research](/Users/maverick/skills/skills/engineering/research/SKILL.md) · [wizard](/Users/maverick/skills/skills/engineering/wizard/SKILL.md) |
| 分区/清单 | [engineering/README](/Users/maverick/skills/skills/engineering/README.md) · [productivity/README](/Users/maverick/skills/skills/productivity/README.md) · [in-progress/README](/Users/maverick/skills/skills/in-progress/README.md) · [外部 plugin.json（显式 25 skill 清单）](/Users/maverick/skills/.claude-plugin/plugin.json) |

### A.2 本项目（仓库相对路径，自本报告位置 `../../` 起算）

| 分组 | 文件 |
|------|------|
| 主链 skill | [requirement-analysis](../../skills/requirement-analysis/SKILL.md) · [exploring](../../skills/exploring/SKILL.md) · [clarifying](../../skills/clarifying/SKILL.md) · [quick-fix](../../skills/quick-fix/SKILL.md) · [writing-plans](../../skills/writing-plans/SKILL.md) · [executing-plans](../../skills/executing-plans/SKILL.md) · [acceptance-qa](../../skills/acceptance-qa/SKILL.md) |
| 纪律/支撑 skill | [test-driven-development](../../skills/test-driven-development/SKILL.md) · [test-strategy](../../skills/test-strategy/SKILL.md) · [using-git-worktrees](../../skills/using-git-worktrees/SKILL.md) · [visual-preview](../../skills/visual-preview/SKILL.md) · [sequential-thinking](../../skills/sequential-thinking/SKILL.md) · [anysearch](../../skills/anysearch/SKILL.md) |
| references / assets | [spec-template](../../skills/requirement-analysis/assets/spec-template.md) · [roadmap-template](../../skills/requirement-analysis/assets/roadmap-template.md) · [exploration-patterns](../../skills/requirement-analysis/references/exploration-patterns.md) · [codex-compat](../../skills/requirement-analysis/references/codex-compat.md) · [spec-reviewer-prompt](../../skills/requirement-analysis/references/spec-reviewer-prompt.md) · [design-principles](../../skills/writing-plans/references/design-principles.md) · [review-orchestration](../../skills/executing-plans/references/review-orchestration.md) · [testing-anti-patterns](../../skills/test-driven-development/references/testing-anti-patterns.md) |
| agents | [code-reviewer](../../agents/code-reviewer.md) · [code-explorer](../../agents/code-explorer.md) · [external-resource-explorer](../../agents/external-resource-explorer.md) |
| commands | [doctor](../../commands/doctor.md) · [triage](../../commands/triage.md) |
| guardrail | [README](../../guardrail/README.md) · [README.zh-CN](../../guardrail/README.zh-CN.md) · [check-spec-drift.mjs](../../guardrail/check-spec-drift.mjs) · [install.mjs](../../guardrail/install.mjs) · [templates/](../../guardrail/templates/) |
| scripts / 清单 | [schemas/（4 schema JSON + README）](../../scripts/schemas/) · [本项目 plugin.json（无 skills 键，目录约定发现）](../../.claude-plugin/plugin.json) |
| evals | [clarifying/evals](../../skills/clarifying/evals/evals.json)（其余各 skill 同路径形态 `skills/<name>/evals/evals.json`） |

## 附录 B：编号 → 主题速查

```
TDD/测试    AB-01 seam 确认门 · AB-02 反模式6+7 · AB-03 mock 分层 · AB-04 重构出环 · AB-05 typecheck 档
            AB-09 设计判据 · AB-17 无seam即架构发现 · AB-26 追溯纪律 · AB-29 prior art+actor
计划/拆解   AB-06 expand–contract · AB-07 依赖最小性+三问 · AB-08 prefactor 槽位 · AB-30 正交预分配
执行/交付   AB-10 PR 通道 · AB-11 指针不复制+执行期探索 · AB-33 认领键+追溯 trailer · AB-35 关联skill声明
            AB-44 并行执行原型(P2·实验沙盒·§3.1专项)
审查/验收   AB-12 Spec 符合性维度 S · AB-13 微纪律包 · AB-14 架构深化维度 · AB-15 HTML 报告
修复/诊断   AB-16 诊断三则 · AB-18 收尾四则 · AB-19 会话止损
探索/路由   AB-20 结晶判据+冲动路由 · AB-21 spike 例外 · AB-22 笔记两节 · AB-31 否决记忆 · AB-32 派发词
提问        AB-23 frontier 清单 · AB-24 受限阀门(P2) · AB-25 自代红线
语言/词汇   AB-27 仓库级 glossary · AB-28 ADR 资格+场景压测
工程化      AB-34 状态面板(P2) · AB-36 失败隔离单点 · AB-37 依赖分级 · AB-38 根解析(含bug) · AB-39 平台兼容层
            AB-40 visual 临时目录 · AB-41 拦截层(P2) · AB-42 分区+纯壳 · AB-43 触发词瘦身(P2)
```

*—— 报告完 ——*
