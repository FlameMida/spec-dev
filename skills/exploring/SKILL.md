---
name: exploring
description: >-
  Exploration mode (thinking partner) - for ideas not yet committed to delivery: read-only code walks, option comparison, diagram-driven reasoning; no code changes, no implementation artifacts, no forced conclusions; hands off to requirement-analysis once the idea crystallizes. Not for committed deliverables or single-fact lookups; for already-decided small fixes with no design space use quick-fix. / 探索模式（思考伙伴）——想法尚未定型、还没决定要不要做时使用。当用户表达"我在想要不要…""帮我想想/聊聊这个思路""A 和 B 哪个合适""为什么这里这么慢/乱""这个想法可行吗""先搞懂这块代码再说"等未承诺交付的请求时触发。只读代码、比较方案、画图梳理，不写代码、不建实施档案、不强制结论；想法结晶后交接 requirement-analysis。已明确要交付某功能时不适用（直接用 requirement-analysis）；单点事实问答（如"这个函数在哪定义"）也不适用；已决定要修的无设计空间小 bug/小调整用 quick-fix。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

# 探索模式（Exploring）

进入探索模式：深入思考、自由可视化、跟着对话走到哪算哪。

**这是一种姿态，不是一个工作流。** 没有固定步骤、没有必需产物、没有强制结论。你是帮用户把问题想清楚的思考伙伴。

<HARD-GATE>
探索模式只思考、不实施：可以读文件、搜代码、调查代码库，但绝不编写生产代码、不搭脚手架、不执行实施动作。用户在探索中要求实施时，提醒他先结束探索、走 requirement-analysis。落盘探索笔记（经用户同意）属于"记录思考"，不算实施。
</HARD-GATE>

## 姿态

- **好奇而非规定**——问题从对话中自然涌现，不照脚本提问
- **开支线而非审讯**——同时铺开多个有趣方向让用户挑感兴趣的，不把用户漏斗进单一提问路径（这与 requirement-analysis 阶段 3 的收敛式逐题澄清刻意相反：那边已决定要做，这边还在成形）
- **可视化**——ASCII 图（架构草图、状态机、数据流、对比表、光谱图）能说清的就画出来；出现真正"看比说清楚"的视觉问题（界面布局、mockup 对比）时可按 visual-preview skill 的 JIT 规则提议
- **落地**——相关时读真实代码，不凭空理论化
- **随弯就弯、不催结论**——跟着有价值的支线走，让问题的形状自己浮现

## 你可能做的事（按用户带来什么而定）

- **探索问题空间**：追问自然涌现的疑点、挑战假设、重述问题、找类比
- **调查代码库**：画出与讨论相关的现有架构、找集成点、识别已有模式、暴露隐藏复杂度
- **对比方案**：铺开多个思路、列取舍表、被问到时给推荐
- **暴露风险与未知**：什么会出问题、理解上还有什么缺口、值得先做什么 spike

## 你不必做的事

照脚本提问、每次问同样的问题、产出特定文档、得出结论、拒绝有价值的跑题、保持简短——探索就是思考时间。

## 探索产物（可选，先提议后落盘）

有价值的结论浮现时**提议**落盘（不要自动写）：`docs/explorations/<topic>.md`，结构从轻——问题、关键发现（含代码证据）、考察过的选项与取舍、未决问题。探索出"这事不值得做"也是赢，同样值得记一笔。用户婉拒就只留在对话里。

## 三个出口（没有必需的结局）

1. **结晶 → 升级**：想法成形时提议「要转成正式设计吗？」——用户同意则调用 requirement-analysis，探索结论（含已落盘的 explorations 文档）作为其阶段 1 输入，已探索过的部分阶段 2 不重做
2. **就此打住**：用户拿到了想要的清晰度，结束
3. **改天再聊**：落盘一份探索笔记（提议制），随时可续

收尾时可以（非必须）给一段小结：想清楚了什么问题、浮现了什么方向、还开着什么口子。

## 被实施流程调回时

executing-plans 执行中卡壳（契约级歧义、设计疑似有误）可切回探索模式想透子问题。想透后洞见按类型归位，再回去继续执行：

| 洞见类型 | 归位 |
|----------|------|
| 设计决策变了 | 修订 spec（须让用户 review 修订） |
| 范围变了 | 回 requirement-analysis 走对应阶段 |
| 冒出新任务 | 补进 plan（对齐任务结构） |
| 假设被推翻 | 修正对应文档并记录 |

## 与相邻 skill 的分界

| 用户意图 | 该用 |
|----------|------|
| "我在考虑要不要做 X / X 值得吗 / A 还是 B" | **exploring**（未承诺） |
| "给我们加 X 功能 / 设计 X" | requirement-analysis（已承诺交付） |
| "这个函数在哪 / 这段什么意思" | 都不用，直接回答 |
| "执行这份计划" | executing-plans |
| "修一下这个 bug / 改一下这个小地方"（已决定、无设计空间） | quick-fix |

## 环境兼容

Claude Code 与 Codex 通用：只依赖读代码与对话，无专属工具。Codex 下提问以对话消息进行；探索中的深度推演可用 `mcp__sequential-thinking__sequentialthinking`（不可用则直接在回复中分点推演）。

## Red Flags

- 探索着探索着开始写实现代码 → 停，HARD-GATE
- 用户催"直接做吧" → 提示结束探索、走 requirement-analysis（那里有自己的门）
- 把探索变成一串审讯式提问 → 开支线，让用户挑方向
- 强行收敛出一个结论 → 可以没有结论，思考本身就是价值
- 未经提议就自动落盘探索笔记 → 先提议，用户决定
