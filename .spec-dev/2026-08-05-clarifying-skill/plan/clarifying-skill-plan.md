# clarifying-skill 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。步骤用复选框（`- [ ]`）语法跟踪；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：新增共享澄清纪律 skill `skills/clarifying/`（grill 式逐题澄清 + 三出口 + 可独立调用），并把 requirement-analysis 阶段 3 与 quick-fix 步骤 3 改为引用去重。

**Spec**：`.spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md`

**架构**：clarifying 是纯文档 skill（SKILL.md + agents/openai.yaml + evals），定义"被引用模式"（仅提供纪律，流程归引用方）与"独立会话模式"（逐题至共识态 + 三出口）。两个引用方各留一句"纪律定义以 clarifying 为准"的锚定语，同步方向恒为单向。发布面同步双端清单与 README。

**技术栈**：Markdown skill 文档、YAML（openai.yaml）、JSON（evals）；校验依赖仓库既有脚本（Node.js）。

## 全局约束

- **纯文档特性，TDD 铁律例外**（spec 已裁决，属 test-driven-development 既有例外类别）：每任务以"写文件 → 跑校验脚本（精确命令 + 预期输出）→ 提交"替代红绿循环；evals 文件即行为断言的落盘形态。
- **pre-commit 三校验必须全绿**：`node scripts/check-plugin.mjs --codex-validate`、`node scripts/validate-skills.mjs`、`node scripts/check-openai-sync.mjs`。
- **check-openai-sync 规则**：提交暂存了某 `SKILL.md` 而未同时暂存其 `agents/openai.yaml` 时报错。任务 3/4 只改 SKILL.md 正文、不改 frontmatter description（触发面不变），提交时用 `SKIP_OPENAI_SYNC_CHECK=1` 豁免并在此注明原因；任务 1 的新 SKILL.md 与 openai.yaml 同 commit 暂存，无需豁免。
- **post-commit 自动发版**：每次提交自动升版本号 + 更新 CHANGELOG（amend 进本提交）+ 打 tag，是仓库既有行为。**不要手写版本号或 CHANGELOG 条目**，也不要用 `SKIP_RELEASE_HOOK=1`（会漏发版）。
- **语言约定**：SKILL.md frontmatter description 中英双语（`EN / 中文`），正文中文；语言协议块逐字复用套件标准文本。
- **术语沿用 spec 术语表**：共识态、被引用模式、独立会话模式；不得混入 Avoid 别名。
- 分支名：`plan/2026-08-05-clarifying-skill`。

---

### 任务 0：建立隔离工作区

- [ ] **步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，跳过本任务。

- [ ] **步骤 2：建立 worktree**

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用（Codex 无原生 worktree 工具，直接走下面的手工路径）；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/plan/2026-08-05-clarifying-skill -b plan/2026-08-05-clarifying-skill` 并切换到该目录。

- [ ] **步骤 3：安装依赖并验证基线**

本仓库无 npm 依赖安装步骤（根目录无 package.json），基线即三校验：

```bash
node scripts/check-plugin.mjs --codex-validate && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs
```

预期：三者退出码 0（`Plugin package checks passed.` / 每个 skill 一行 `Skill validation passed` / openai.yaml 检查通过）。基线失败 → 停下报告，先问再继续。

---

## SKILL 主体

### 任务 1：创建 skills/clarifying/（SKILL.md + openai.yaml）

**文件**：
- 创建：`skills/clarifying/SKILL.md`
- 创建：`skills/clarifying/agents/openai.yaml`

**接口**：
- 消费：无（首任务）
- 产出：SKILL.md 的节名锚点，供任务 3/4 的引用语指向——`核心纪律`（六条纪律所在节）、`独立会话模式`、`Codex 规范`（内嵌节名）；frontmatter `name: clarifying`。

- [ ] **步骤 1：写 SKILL.md**

写入 `skills/clarifying/SKILL.md`，完整内容：

````markdown
---
name: clarifying
description: >-
  Shared clarification discipline (grill-style) - one-question-at-a-time interrogation down the decision tree until shared understanding: facts self-researched, each decision put to the user with a recommended answer; standalone sessions end at a consensus summary with three exits (hand off to the main workflow / stop here / write notes to md), no forced deliverable. Referenced by requirement-analysis and quick-fix as their questioning discipline. Use standalone when the user wants an idea, plan or decision grilled into clarity question by question; not for divergent thinking-partner exploration (use exploring), nor for committed delivery work (go straight to requirement-analysis / quick-fix). / 共享澄清纪律（grill 式）——沿决策树一次一题逼近共识：事实自查、每个决策带推荐交用户裁决；独立会话以共识摘要 + 三出口收束（转主流程/就此结束/写入 md），不强制产出。被 requirement-analysis 与 quick-fix 引用作提问纪律。当用户想把一个想法/计划/决定逐题磨清楚时独立使用；发散式的思考陪伴用 exploring；已承诺交付的开发工作直接用 requirement-analysis / quick-fix。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

# 澄清纪律（Clarifying）

沿决策树一次一题，把一个想法、计划或决定磨到共识态。**事实是你的活，决策是用户的**——环境能回答的自己查，需要裁决的逐题交给用户，每题附上你的推荐答案。

**纪律定义以本 skill 为准**：requirement-analysis 阶段 3 与 quick-fix 步骤 3 引用本纪律；引用方文本与本文冲突时以本文为准。

## 两种角色

| 角色 | 进入方式 | 流程控制权 | 终点 |
|------|---------|-----------|------|
| **被引用模式** | requirement-analysis / quick-fix 进入澄清环节 | 引用方 | 澄清完成，控制权回引用方下一阶段——**不呈现共识摘要与三出口，不发开场声明** |
| **独立会话模式** | 用户直接调用 clarifying | 本 skill | 共识态 → 共识摘要 → 三出口 |

## 核心纪律（两种角色共用）

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
   - **转主流程**——按承诺状态与设计空间建议 requirement-analysis（已承诺、有设计空间）或 quick-fix（已承诺、无设计空间），经用户确认后调用；共识结论作为下游输入，**已裁决过的问题不在下游重问**
   - **就此结束**——共识留在对话里，零产物
   - **写入 md**——落盘 `.spec-dev/explorations/<topic>.md`（复用 exploring 的落盘约定，结构从轻：问题、关键结论、未决点），改天转正式流程时由 requirement-analysis 阶段 1 作为输入消费

## 与 exploring 的分界

| | exploring | clarifying |
|---|-----------|------------|
| 姿态 | **发散**——开支线让用户挑方向 | **收敛**——沿决策树逼近共识 |
| 提问 | 问题自然涌现，不照脚本 | 逐题下行，覆盖每条支线 |
| 终点 | 可以没有结论 | 共识态（或显式挂起） |
| 典型措辞 | "帮我想想要不要做 X" | "把这个方案逐题问清楚 / grill me" |

两者都不实施、都可落盘 explorations 笔记、都能交接主流程——选错了也能中途换，向用户说明即可。

## Codex 规范

- 提问以普通对话消息进行：保持一次一题，每题 2-3 个互斥选项且推荐项在首位，等待用户明确回复
- 深度推演无 `mcp__sequential-thinking__sequentialthinking` 时降级为回复内分点推演
- 澄清前探索在沙箱禁网时以 `rg` + 文件阅读完成，不依赖 web_search
- 落盘失败（沙箱 read-only）→ 向用户说明并请其自行保存内容
- 独立会话模式轻量，不强制 `update_plan`

## Red Flags

- "一次多问几个效率高" → 一次一题
- "这个事实问用户最快" → 环境能答的自己查
- "上游还没定，先把下游问了" → 按决策依赖排序
- "澄清完顺手把代码写了" → HARD-GATE，走出口 1
- "共识达成，自动落盘个笔记" → 三出口是提议制，用户没选就不落盘
- "被引用时也走一遍三出口" → 被引用模式的终点是把控制权还给引用方
````

- [ ] **步骤 2：写 agents/openai.yaml**

写入 `skills/clarifying/agents/openai.yaml`，完整内容：

```yaml
interface:
  display_name: "Clarifying"
  short_description: "Shared clarification discipline (grill-style) - one-question-at-a-time down the decision tree until shared understanding; standalone sessions end with three exits (hand off / stop / write to md), no forced deliverable; referenced by requirement-analysis and quick-fix. Not for divergent exploration (use exploring). / 共享澄清纪律（grill 式）：一次一题沿决策树逼近共识，独立会话三出口收束（转主流程/结束/写入 md）、不强制产出；被 requirement-analysis 与 quick-fix 引用。发散探索用 exploring"
  default_prompt: "Use $clarifying to grill this idea, plan or decision into shared understanding, one question at a time. / 用 $clarifying 逐题把这个想法、计划或决定磨到共识。"

policy:
  allow_implicit_invocation: true
```

- [ ] **步骤 3：运行校验确认通过**

```bash
node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs
```

预期：输出含 `Skill validation passed: skills/clarifying`，两脚本退出码 0。失败 → 按报错修 frontmatter/yaml 结构后重跑。

- [ ] **步骤 4：提交**

```bash
git add skills/clarifying/SKILL.md skills/clarifying/agents/openai.yaml
git commit -m "feat(T1): 新增 clarifying skill——共享澄清纪律（grill 式逐题 + 三出口）"
```

（post-commit 自动发版会 amend 版本号与 CHANGELOG，属预期。）

### 任务 2：clarifying evals（行为用例 + 触发面用例）

**文件**：
- 创建：`skills/clarifying/evals/evals.json`
- 创建：`skills/clarifying/evals/trigger-evals.json`

**接口**：
- 消费：任务 1 的 `skills/clarifying/SKILL.md`（frontmatter description 即 trigger-evals 的被测对象）
- 产出：spec 验收矩阵中 eval 行的落盘载体（验收任务将逐条核对）。

- [ ] **步骤 1：写 evals.json**

写入 `skills/clarifying/evals/evals.json`，完整内容（六条对应 spec Scenario：一次一题不倾泻、事实不落到用户头上、上游未定不问下游、用户催促直接做、就此结束零产物 + 写入 md、被引用不触发出口）：

```json
{
  "skill_name": "clarifying",
  "evals": [
    {
      "id": "cl-one-question-at-a-time",
      "prompt": "（独立澄清会话中，当前存在鉴权方式、缓存策略、部署目标三个相互独立的待澄清点）",
      "expected_output": "下一条消息只包含一个问题（附 2-4 个选项、推荐项在首位并说明理由），其余待澄清点留待后续轮次；不出现一条消息多个问题"
    },
    {
      "id": "cl-facts-self-research",
      "prompt": "（澄清对象涉及'项目当前用的是哪个测试框架'这类可由仓库文件回答的问题）",
      "expected_output": "读取仓库配置文件自行得出答案并继续下一题，不把该事实性问题抛给用户；只有真正需要用户裁决的决策才进入对话"
    },
    {
      "id": "cl-dependency-order",
      "prompt": "（决策树中'是否需要持久化'尚未被用户裁决，待澄清点还包括'用什么数据库'）",
      "expected_output": "不提出'用什么数据库'等依赖上游决策的下游问题；先问'是否需要持久化'，其答复落定后才进入下游支线"
    },
    {
      "id": "cl-hard-gate-no-implement",
      "prompt": "（澄清进行中）别问了，直接改代码吧",
      "expected_output": "不改代码（HARD-GATE），提议经出口 1 转入对应主流程 skill（按承诺状态与设计空间建议 requirement-analysis 或 quick-fix），等待用户确认"
    },
    {
      "id": "cl-three-exits-no-forced-output",
      "prompt": "（共识摘要已呈现）就这样吧，先不做了",
      "expected_output": "用户选择'就此结束'——会话收束，工作区零新增文件；不自动落盘笔记（三出口是提议制，写入 md 须用户选择，落盘位置为 .spec-dev/explorations/<topic>.md）"
    },
    {
      "id": "cl-referenced-mode-no-exits",
      "prompt": "（requirement-analysis 阶段 3 按 clarifying 纪律完成最后一个澄清问题，用户已答复）",
      "expected_output": "流程直接进入 requirement-analysis 阶段 4——不呈现共识摘要、不出现三出口选择、不发 clarifying 开场声明；被引用模式只提供纪律，控制权归引用方"
    }
  ]
}
```

- [ ] **步骤 2：写 trigger-evals.json**

写入 `skills/clarifying/evals/trigger-evals.json`，完整内容（near-miss 负例检验与 exploring/requirement-analysis/quick-fix 的边界）：

```json
{
  "skill_name": "clarifying",
  "description_under_test": "见 SKILL.md frontmatter",
  "should_trigger": [
    { "id": "t1", "prompt": "把我这个重构方案逐题问清楚，别放过任何含糊的地方" },
    { "id": "t2", "prompt": "grill me：我想把通知系统改成事件驱动" },
    { "id": "t3", "prompt": "对着我的上线计划审我一轮，每个决定都问到底" },
    { "id": "t4", "prompt": "帮我把'要不要自建对象存储'这个决定磨到能拍板" },
    { "id": "t5", "prompt": "interview me relentlessly about this migration plan until we agree" },
    { "id": "t6", "prompt": "我脑子里有个 API 网关的想法，你一个问题一个问题帮我理清楚" }
  ],
  "should_not_trigger": [
    { "id": "n1", "prompt": "我在想要不要给产品加离线模式，帮我想想" },
    { "id": "n2", "prompt": "GraphQL 和 REST 哪个更适合我们？陪我聊聊思路" },
    { "id": "n3", "prompt": "给系统加一个用户权限管理功能" },
    { "id": "n4", "prompt": "把这个 bug 修一下：分页翻到第二页会重复第一条" },
    { "id": "n5", "prompt": "这个函数在哪里定义的？" },
    { "id": "n6", "prompt": "help me think through whether a plugin system is worth building" }
  ],
  "notes": "t1-t6 的共同信号：用户主动要求被逐题审问/磨清楚（'逐题问清楚''grill''审我一轮''磨到能拍板''一个问题一个问题'），对象是一个已有雏形的想法/计划/决定。n1/n2/n6 是发散式思考陪伴（'帮我想想''聊聊思路'——exploring 领地，clarifying 是收敛不是发散）；n3 已承诺交付的功能开发（requirement-analysis 领地，其阶段 3 会以被引用模式使用本纪律）；n4 已决定的无设计空间小修（quick-fix 领地）；n5 单点事实问答。近失负例检验 description 中'收敛式逐题 vs 发散式陪伴'的双向互斥边界。"
}
```

- [ ] **步骤 3：运行校验确认通过**

```bash
node scripts/check-plugin.mjs --codex-validate && node scripts/validate-skills.mjs
```

预期：退出码 0（evals 为数据文件，校验器验证 skill 结构完整性不受影响）。

- [ ] **步骤 4：提交**

```bash
git add skills/clarifying/evals/evals.json skills/clarifying/evals/trigger-evals.json
git commit -m "feat(T2): clarifying evals——五条行为用例与触发面双向边界用例"
```

---

## 引用方改造

### 任务 3：requirement-analysis 阶段 3 改为引用 + codex-compat 裁剪

**文件**：
- 修改：`skills/requirement-analysis/SKILL.md`（`## 阶段 3: 澄清问题` 节，当前位于 133-147 行附近）
- 修改：`skills/requirement-analysis/references/codex-compat.md`（`## 提问规范` 节，当前位于 41-48 行附近）

**接口**：
- 消费：任务 1 产出的 skill 名 `clarifying` 及其节名锚点（核心纪律、Codex 规范）
- 产出：改造后的阶段 3 文本（任务 6 验收将做改造前后语义对照）。

- [ ] **步骤 1：改写 SKILL.md 阶段 3**

将 `## 阶段 3: 澄清问题` 节从原文（自"**目标**：解决所有模糊、歧义与多解取舍。"起，至"**回补探索**"段落止，含视觉预览段）替换为：

```markdown
**目标**：解决所有模糊、歧义与多解取舍。

**提问纪律遵循 clarifying skill 的核心纪律（被引用模式，纪律定义以 clarifying 为准）**：一次只问一个问题、选择题优先且推荐项放首位（Claude Code 用 `AskUserQuestion`）、事实自查决策交用户、按决策依赖排序、术语挑战、不编造问题——无疑点则明确记录"需求已清晰，无需澄清"后进入阶段 4。本阶段是引用方：澄清完成后直接进入阶段 4，不触发 clarifying 的共识摘要与三出口。Codex 逐题提问规范见 clarifying 内嵌的 Codex 规范节；三道门的对话呈现要求见 [codex-compat.md](references/codex-compat.md)。

- 优先覆盖：目的、约束、成功标准；阶段 1-2 暴露的歧义、约束冲突、隐含假设、边缘场景
- 术语挑战裁决出的规范术语全程沿用，并在 spec 术语表中记录规范名、一句话定义与 Avoid 别名（挑战动作属 clarifying 纪律，术语表落盘是本阶段职责）

**可视化预览（JIT 提议）**：不要在开场提议。当某个问题**用看的比用说的更清楚**时（真实的 mockup/布局/图示问题，而不只是"话题涉及 UI"），首次出现的那一刻单独发一条消息提议使用 visual-preview skill——该消息只含提议、不夹带其他问题。用户接受则按 visual-preview skill 执行；拒绝则继续纯文字，不再重复提议。逐题判断浏览器 vs 终端：内容本身是视觉的（线框、布局对比、架构图）用浏览器，内容是文字的（需求、取舍、概念选择）留在终端。

**回补探索**：澄清或方案期发现新库/新领域，允许回补一轮外部探索（同样单响应发起），回补后继续当前阶段。
```

替换要点核对：原六条纪律 bullet（一次一题/先探索后提问/依赖排序/AskUserQuestion 工具行/术语挑战/不编造问题）全部收进引用句，语义一条不丢；视觉预览与回补探索两段逐字保留。

- [ ] **步骤 2：裁剪 codex-compat.md 提问规范节**

将 `## 提问规范（阶段 3 澄清、阶段 4 方案选定、阶段 5 设计批准、阶段 7 spec review）` 节整节替换为：

```markdown
## 提问规范（阶段 4 方案选定、阶段 5 设计批准、阶段 7 spec review 三道门）

阶段 3 的逐题澄清纪律遵循 clarifying skill 内嵌的 Codex 规范节（一次一题、选项带推荐、对话消息提问），此处不重复定义。

三道门（方案选定 / 设计批准 / spec review）同样以普通对话消息呈现，等待用户明确回复后再继续；不要求用户切换模式，也不依赖环境专有输入工具。
```

- [ ] **步骤 3：语义对照自检**

逐条核对改造前后条目归属（改造前六条纪律 bullet + 两段特有内容 → 改造后引用句 + 保留段），确认无丢失、无新增约束。运行：

```bash
git diff skills/requirement-analysis/ | head -80
```

预期：diff 仅涉及阶段 3 节与 codex-compat 提问规范节，其余阶段零改动。

- [ ] **步骤 4：提交**

```bash
git add skills/requirement-analysis/SKILL.md skills/requirement-analysis/references/codex-compat.md
SKIP_OPENAI_SYNC_CHECK=1 git commit -m "refactor(T3): requirement-analysis 阶段 3 引用 clarifying 纪律——去重内嵌条目，codex-compat 提问规范裁剪为三道门"
```

（豁免原因：SKILL.md frontmatter description 未变，触发面不受影响。）

### 任务 4：quick-fix 步骤 3 改为引用 + Codex 映射表更新

**文件**：
- 修改：`skills/quick-fix/SKILL.md`（`### 步骤 3` 首段，当前 50 行附近；`## 执行环境兼容性` 映射表"用户澄清/确认"行，当前 95 行附近）

**接口**：
- 消费：任务 1 产出的 skill 名 `clarifying` 及节名锚点
- 产出：改造后的步骤 3 文本（任务 6 验收对照）。

- [ ] **步骤 1：改写步骤 3 首段**

将原文：

> 沿用 requirement-analysis 的提问纪律（Claude Code 用 `AskUserQuestion`，Codex 用对话消息；一次一个、选择题优先、先查后问）。核心确认三类：

替换为：

```markdown
提问纪律遵循 clarifying skill 的核心纪律（被引用模式，纪律定义以 clarifying 为准）：一次一题、选择题优先且推荐项放首位（Claude Code 用 `AskUserQuestion`）、事实自查决策交用户。核心确认三类：
```

三类核心确认（根因认定/修复方案/契约影响）及其后全部内容逐字保留、零改动。

- [ ] **步骤 2：更新 Codex 映射表行**

将映射表中：

> | 用户澄清/确认 | `AskUserQuestion`（单题带选项） | 对话消息提问并等待回复 |

替换为：

```markdown
| 用户澄清/确认 | `AskUserQuestion`（单题带选项） | 对话消息提问（逐题规范见 clarifying 内嵌 Codex 规范节） |
```

- [ ] **步骤 3：语义对照自检**

```bash
git diff skills/quick-fix/SKILL.md
```

预期：diff 仅两处（步骤 3 首段 + 映射表一行）；三类核心确认、步骤 2.5 升级门、5a/5b 分支全部零改动。

- [ ] **步骤 4：提交**

```bash
git add skills/quick-fix/SKILL.md
SKIP_OPENAI_SYNC_CHECK=1 git commit -m "refactor(T4): quick-fix 步骤 3 引用 clarifying 纪律——Codex 映射行同步指向"
```

（豁免原因同任务 3：description 未变。）

---

## 发布面

### 任务 5：双端清单与 README 同步

**文件**：
- 修改：`.claude-plugin/plugin.json`（description、keywords）
- 修改：`.claude-plugin/marketplace.json`（plugins[0].skills 数组）
- 修改：`.codex-plugin/plugin.json`（description、keywords、interface.longDescription、interface.defaultPrompt）
- 修改：`README.md`（skill 清单 bullet 区、47/51 行附近入口说明）
- 修改：`README.zh-CN.md`（对应中文位置）
- 不改：`.agents/plugins/marketplace.json`（已核实其不含 skill 清单，零动作）

**接口**：
- 消费：任务 1 的 skill 名与定位描述
- 产出：无（终端发布面）。

- [ ] **步骤 1：更新 .claude-plugin/plugin.json**

description 的 EN 半句在 `quick-fix (lightweight bug-fix workflow)` 后插入 `, clarifying (shared clarification discipline)`；zh 半句在 `quick-fix 轻量修复` 后插入 `、clarifying 共享澄清纪律`。keywords 数组在 `"quick-fix"` 后插入 `"clarifying"`。

- [ ] **步骤 2：更新 .claude-plugin/marketplace.json**

`plugins[0].skills` 数组在 `"./skills/exploring"` 之后插入一行：

```json
        "./skills/clarifying",
```

- [ ] **步骤 3：更新 .codex-plugin/plugin.json**

- description：EN 半句 `quick-fix (lightweight bug-fix workflow)` 后插入 `, clarifying (shared clarification discipline)`；zh 半句 `quick-fix 轻量修复` 后插入 `、clarifying 共享澄清纪律`
- keywords：`"quick-fix"` 后插入 `"clarifying"`
- interface.longDescription：EN 半段句尾（`...via a spec-back-lookup + contract-split fast path` 后）追加 `; clarifying provides the shared grill-style questioning discipline (one question at a time, three exits) both referenced by the workflows and available standalone`；zh 半段句尾（`...处理已决定、无设计空间的小修复` 后）追加 `；clarifying 提供 grill 式共享提问纪律（一次一题、三出口），既被工作流引用也可独立调用`
- interface.defaultPrompt 数组末尾（`Check workspace MCP configuration...` 条目前）插入：

```json
      "Use clarifying to grill this idea into shared understanding, one question at a time / 使用 clarifying 逐题把这个想法磨到共识",
```

- [ ] **步骤 4：更新两份 README**

`README.md` 第 18 行 quick-fix bullet 之后插入：

```markdown
- **Shared clarification** — `clarifying`, the grill-style questioning discipline (one question at a time down the decision tree, facts self-researched, each decision put to the user with a recommendation); referenced by requirement-analysis and quick-fix, and usable standalone with three exits (hand off to the main workflow / stop / write notes to md)
```

第 51 行独立使用句的 `quick-fix handles small already-decided fixes without the full design workflow` 后追加 `; clarifying grills an idea into shared understanding without committing to any workflow`。

`README.zh-CN.md` 对应第 18 行后插入：

```markdown
- **共享澄清** — `clarifying`，grill 式提问纪律（沿决策树一次一题、事实自查、每个决策带推荐交用户裁决）；被 requirement-analysis 与 quick-fix 引用，也可独立调用，以三出口收束（转主流程/就此结束/写入 md）
```

第 51 行独立使用句的 `quick-fix 处理已决定、无设计空间的小修复，不走完整设计流程` 后追加 `；clarifying 不承诺任何工作流，单独把一个想法逐题磨到共识`。

- [ ] **步骤 5：运行校验确认通过**

```bash
node scripts/check-plugin.mjs --codex-validate && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs
```

预期：三者退出码 0（marketplace 新增路径 `./skills/clarifying` 必须真实存在——任务 1 已创建）。

- [ ] **步骤 6：提交**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json .codex-plugin/plugin.json README.md README.zh-CN.md
git commit -m "feat(T5): 发布面登记 clarifying——双端清单、defaultPrompt 与 README 双语同步"
```

---

## 测试与验收

### 任务 6：验收（acceptance-qa）

> 本任务由 executing-plans 收尾审查阶段触发 acceptance-qa 按下表执行，
> 不参与逐任务连续执行；报告与证据落盘特性目录 `acceptance/` 子目录。

| Scenario / 检查项 | 维度 | 执行方式 | 目标 | 阈值/预期 | 验收证据 |
|-------------------|------|---------|------|----------|---------|
| 一次一题不倾泻 / 事实不落到用户头上 / 上游未定不问下游 | eval | 验收任务（skill eval 用例） | `skills/clarifying/evals/evals.json` | cl-one-question-at-a-time、cl-facts-self-research、cl-dependency-order 三条存在且断言与 spec Scenario 语义一致 | eval 通过记录 |
| 就此结束零产物 / 写入 md 复用 explorations | eval | 验收任务（skill eval 用例） | 同上 | cl-three-exits-no-forced-output 断言含"零新增文件"与 explorations 路径 | eval 通过记录 |
| 被引用不触发出口 | eval | 验收任务（skill eval 用例） | 同上 | cl-referenced-mode-no-exits 断言含"不呈现三出口" | eval 通过记录 |
| 用户催促直接做（澄清中不实施） | eval | 验收任务（skill eval 用例） | 同上 | cl-hard-gate-no-implement 断言含 HARD-GATE 拒绝实施 | eval 通过记录 |
| 转主流程不重问已澄清问题 | 文档审查 | 验收任务（对照检查） | `skills/clarifying/SKILL.md` 三出口节 | 出口 1 明确写有"已裁决过的问题不在下游重问" | 检查记录 |
| 改造后语义等价（两引用方） | 文档审查 | 验收任务（逐条对照清单） | 任务 3/4 的 diff | 改造前每条纪律条目在改造后有语义等价归属，无丢失、无新增约束 | 对照表 |
| 无结构化提问工具（Codex 规范节完备） | 文档审查 | 验收任务（规范节完备性检查） | `skills/clarifying/SKILL.md` Codex 规范节 | 覆盖对话提问、sequential-thinking 降级、禁网降级、落盘失败四点 | 检查记录 |
| 发布面同步完整 | 文档审查 | 验收任务 | 双端 plugin.json、marketplace.json、两份 README | clarifying 在全部登记点出现；`.agents/plugins/marketplace.json` 确认零动作正确 | 检查记录 |

### 任务 7：合并与清理

- [ ] **步骤 1：全量验证**

在 worktree 内运行：

```bash
node scripts/check-plugin.mjs --codex-validate && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs
```

预期：三者退出码 0，且 `validate-skills` 输出含 `skills/clarifying`。失败 → 修复后才进入合并。

- [ ] **步骤 2：合并回来源分支**

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"   # 回到主工作区
git merge plan/2026-08-05-clarifying-skill
```

合并冲突、或主工作区有未提交改动 → 停下向计划作者确认，不强行合并。

- [ ] **步骤 3：清理**

```bash
git worktree remove .worktrees/plan/2026-08-05-clarifying-skill
git branch -d plan/2026-08-05-clarifying-skill
```

- [ ] **步骤 4：sync_commit 锚定**

```bash
SYNC=$(git rev-parse HEAD)   # 合并完成后的主工作区 HEAD
# 把 spec frontmatter 的 sync_commit: null 更新为 $SYNC
git add .spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md
git commit -m "chore(spec): sync_commit 锚定 ${SYNC:0:7}"
```

此后 `git diff <sync_commit>..HEAD -- skills/clarifying/**` 即"spec 上次确认同步以来的代码变化"。
