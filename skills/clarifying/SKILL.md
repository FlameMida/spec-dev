---
name: clarifying
description: >-
  Shared clarification discipline (grill-style) - one-question-at-a-time interrogation down the decision tree until shared understanding: facts self-researched, each decision put to the user with a recommended answer; standalone sessions end at a consensus summary with three exits (hand off to the main workflow / stop here / write notes to md), no forced deliverable. Referenced by requirement-analysis and quick-fix as their questioning discipline. Use standalone when the user wants an idea, plan or decision grilled into clarity question by question; not for divergent thinking-partner exploration (use exploring), nor for committed delivery work (go straight to requirement-analysis / quick-fix). / 共享澄清纪律（grill 式）——沿决策树一次一题逼近共识：事实自查、每个决策带推荐交用户裁决；独立会话以共识摘要 + 三出口收束（转主流程/就此结束/写入 md），不强制产出。被 requirement-analysis 与 quick-fix 引用作提问纪律。当用户想把一个想法/计划/决定逐题磨清楚时独立使用；发散式的思考陪伴用 exploring；已承诺交付的开发工作直接用 requirement-analysis / quick-fix。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。

# 澄清纪律（Clarifying）

沿决策树一次一题，把一个想法、计划或决定磨到共识态。**事实是你的活，决策是用户的**——环境能回答的自己查，需要裁决的逐题交给用户，每题附上你的推荐答案。

**纪律定义以本 skill 为准**：requirement-analysis 阶段 3 与 quick-fix 步骤 3 引用本纪律；引用方文本与本文冲突时以本文为准。

## 两种角色

| 角色 | 进入方式 | 流程控制权 | 终点 |
|------|---------|-----------|------|
| **被引用模式** | requirement-analysis / quick-fix 进入澄清环节 | 引用方 | 澄清完成，控制权回引用方下一阶段——**不呈现共识摘要与三出口，不发开场声明** |
| **独立会话模式** | 用户直接调用 clarifying | 本 skill | 共识态 → 共识摘要 → 三出口 |

## 核心纪律（两种角色共用）

- **第 0 条·提问前自我披露**——开出第一题之前，先用三小段向用户披露：(a) 我默认了哪些未说出口的假设；(b) 哪些信息一旦提供会显著改变我的答案或方案；(c) 处理这类问题最容易犯什么错。披露基于已完成的探索事实、不编造；披露后才进入逐题澄清，且披露内容随澄清进展可修订。两种角色（独立会话/被引用）均适用
- **一次只问一个问题**——等用户答复再问下一个；一次多题会把人淹没
- **选择题优先**——每题尽量给 2-4 个互斥的具体选项，**推荐项放首位并说明理由**（Claude Code 用 `AskUserQuestion`；没有合适选项的开放式问题用对话直接问）
- **事实自查，决策交用户**——能由环境（代码库、文件系统、已有探索产物、工具）回答的事实性问题自己查证，绝不抛给用户；真正需要用户裁决的才带到对话
- **按决策依赖排序**——沿决策树逐支下行，上游决策未定时不问下游问题（如存储选型未定就不问索引设计），避免上游答案变化令下游澄清作废
- **术语挑战**——用户用词模糊或一词多义时，当场提出规范术语请用户裁决，此后全程沿用
- **不编造问题**——没有疑点就明确说"已清晰、无需澄清"并收束；为走流程而提问和带着错误假设前进同样是浪费

## 独立会话模式

<HARD-GATE>
澄清会话只提问与查证，不实施：可以读文件、搜代码，但绝不编写生产代码、不搭脚手架、不执行实施动作。用户在会话中要求直接实施时，引导走出口 1 转入对应主流程 skill。
</HARD-GATE>

1. **开场**：声明「我正在使用 clarifying skill，逐题把这件事磨清楚。」无参数时先问一句"要磨清楚的是什么"。
2. **先探索后开题**：轻量查证（Grep/Glob/Read；Codex 下 `rg` + 文件阅读）能自答的事实，再开第一题。
3. **逐题下行**：按核心纪律沿决策树推进，直至**共识态**——所有决策支线要么已由用户裁决、要么被显式挂起为未决点，无静默假设。
4. **共识摘要**：呈现达成的理解 + 挂起的未决点。
5. **三出口**（提议制，用户选，未选前不落盘任何文件）：
   - **转主流程**——按承诺状态、任务类型与设计空间建议 requirement-analysis（已承诺、有设计空间）、quick-fix（已承诺、无设计空间）或报告通道（已承诺的非开发交付，约定见 requirement-analysis 阶段 1 任务类型检查），经用户确认后进入；共识结论作为下游输入，**已裁决过的问题不在下游重问**
   - **就此结束**——共识留在对话里，零产物
   - **写入 md**——落盘 `.spec-dev/explorations/<topic>.md`（复用 exploring 的落盘约定，结构从轻：问题、关键结论、未决点），改天转正式流程时由 requirement-analysis 阶段 1 作为输入消费

## 与 exploring 的分界

分界是嵌套而非对立：exploring 默认发散，但其开场披露与关键分岔漏斗以被引用模式复用本 skill 纪律；分岔漏斗结束即归还控制权回发散。

| | exploring | clarifying |
|---|-----------|------------|
| 姿态 | **发散**——开支线让用户挑方向 | **收敛**——沿决策树逼近共识 |
| 提问 | 问题自然涌现，不照脚本（关键分岔漏斗期除外） | 逐题下行，覆盖每条支线 |
| 终点 | 可以没有结论 | 共识态（或显式挂起） |
| 典型措辞 | "帮我想想要不要做 X" | "把这个方案逐题问清楚 / grill me" |

两者都不实施、都可落盘 explorations 笔记、都能交接主流程——选错了也能中途换，向用户说明即可。

## Codex 规范

- 提问以普通对话消息进行：保持一次一题，每题 2-3 个互斥选项且推荐项在首位，等待用户明确回复
- 自我披露以一条对话消息完成（三段合一条），不拆多条
- 深度推演无 sequential-thinking skill（插件内嵌）可用时降级为回复内分点推演并注明工具降级原因
- 澄清前探索在沙箱禁网时以 `rg` + 文件阅读完成，不依赖 web_search
- 落盘失败（沙箱 read-only）→ 向用户说明并请其自行保存内容
- 独立会话模式轻量，不强制 `update_plan`

## Red Flags

- "背景我都懂，直接开问吧" → 披露先行：三段披露是第一题的前置，不可跳过
- "一次多问几个效率高" → 一次一题
- "这个事实问用户最快" → 环境能答的自己查
- "上游还没定，先把下游问了" → 按决策依赖排序
- "澄清完顺手把代码写了" → HARD-GATE，走出口 1
- "共识达成，自动落盘个笔记" → 三出口是提议制，用户没选就不落盘
- "被引用时也走一遍三出口" → 被引用模式的终点是把控制权还给引用方
