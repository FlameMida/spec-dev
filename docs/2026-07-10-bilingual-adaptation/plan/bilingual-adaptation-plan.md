# spec-dev 中英双语适配 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。步骤用复选框（`- [ ]`）语法跟踪；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：插件全链路输出语言自适应（对话跟随用户语言、非中文默认英语、产物跟随对话语言）+ README 中英双版互跳。

**Spec**：`docs/2026-07-10-bilingual-adaptation/spec/bilingual-adaptation-design.md`（含 ADR-0001）

**架构**：单一「语言协议块」内联到 8 个 SKILL.md 驱动输出语言；配套清除确定性中文输出面——descriptions 中英拼接（英前中后）、agent 语言条款、产物模板双语指引、README/snippet/脚本文案双语化；evals 补英文触发样例。指令正文保持中文不翻译（ADR-0001）。

**技术栈**：纯 Markdown/JSON/YAML/Node 脚本文案改造，无运行时逻辑变更；校验链为 skill-creator quick_validate.py（经 validate-skills.mjs）、check-openai-sync.mjs、check-plugin.mjs、pre-commit hooks。

## 全局约束

- **所有 git commit 一律带 `SKIP_RELEASE_HOOK=1` 前缀**——本仓库 post-commit hook 会自动发版（bump 版本 + 改 CHANGELOG + 打 tag），逐任务提交必须跳过，版本发布由维护者在合并后统一决定。
- **description 硬约束**（quick_validate.py）：≤ 1024 字符、不得含尖括号 `<` `>`。每次改 description 后用任务内命令实测长度。
- **拼接格式统一**：`<English condensed> / <中文全版>`——英文在前、中文在后、分隔符为空格斜杠空格（` / `）。
- **中文原文保真**：双语化过程中现有中文文案一字不改（除 spec 明确要求的"中文"→"中英双语"定语更新，见任务 4）。
- **协议块 8 处逐字一致**：任务 1 的协议块文本是唯一版本，逐字节复制，不得局部改写。
- **改 SKILL.md 而不改触发描述的提交**用 `SKIP_OPENAI_SYNC_CHECK=1` 豁免同步检查（check-openai-sync.mjs 的约定豁免通道），并在提交信息注明。
- **环境前提**：`codex` CLI 与 `node` 可用（pre-commit 的 `check-plugin.mjs --codex-validate` 需要，超时 120s）；`~/.codex/skills/.system/skill-creator/scripts/quick_validate.py` 存在（validate-skills.mjs 依赖）。

---

### 任务 0：建立隔离工作区

- [ ] **步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，跳过本任务。

- [ ] **步骤 2：建立 worktree**

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用（Codex 无原生 worktree 工具，直接走下面的手工路径）；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/plan/2026-07-10-bilingual-adaptation -b plan/2026-07-10-bilingual-adaptation` 并切换到该目录。

- [ ] **步骤 3：安装依赖并验证基线**

本仓库无 package.json，无依赖安装步骤。基线 = 校验链全绿：

```bash
node scripts/check-plugin.mjs
node scripts/validate-skills.mjs
node scripts/check-openai-sync.mjs
```

预期：三条各输出 `Plugin package checks passed.` / `Skill validation passed: skills/<name>`（×8）/ `openai.yaml sync checks passed (8 skills).`。基线失败 → 停下报告，先问再继续。

---

## 分组 A：协议与指令层

### 任务 1：语言协议块注入 8 个 SKILL.md

**文件**：
- 修改：`skills/acceptance-qa/SKILL.md`、`skills/executing-plans/SKILL.md`、`skills/exploring/SKILL.md`、`skills/requirement-analysis/SKILL.md`、`skills/test-driven-development/SKILL.md`、`skills/using-git-worktrees/SKILL.md`、`skills/visual-preview/SKILL.md`、`skills/writing-plans/SKILL.md`

**接口**：
- 产出：协议块文本（下方唯一版本）；任务 5、10 的双语指示措辞与其保持术语一致（"对话语言 / conversation language"）。

- [ ] **步骤 1：红——确认协议块不存在**

```bash
grep -rl 'Language Protocol / 语言协议' skills/*/SKILL.md | wc -l
```

预期输出：`0`

- [ ] **步骤 2：在 8 个 SKILL.md 中插入协议块**

插入位置：frontmatter 结束的第二个 `---` 行之后、正文第一个 `#` 标题之前，前后各留一个空行。协议块全文（逐字复制，8 处一致）：

```markdown
> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。
```

注意：7 处固定话术行（spec「已确认的关键决策」列出的 requirement-analysis L198、writing-plans L12/L234-236、executing-plans L14、using-git-worktrees L35-36/L40、visual-preview L14）**一字不改**——行为变化完全由协议块的"语义模板"条款驱动。

- [ ] **步骤 3：绿——断言 8 处一致**

```bash
grep -rl 'Language Protocol / 语言协议' skills/*/SKILL.md | wc -l   # 预期 8
grep -h '^> \*\*Language Protocol' skills/*/SKILL.md | sort -u | wc -l   # 预期 1（首行逐字一致）
grep -h '^> 语言协议' skills/*/SKILL.md | sort -u | wc -l               # 预期 1（次行逐字一致）
node scripts/validate-skills.mjs    # 预期 8 个 Skill validation passed
```

- [ ] **步骤 4：提交**

```bash
git add skills/*/SKILL.md
SKIP_RELEASE_HOOK=1 SKIP_OPENAI_SYNC_CHECK=1 git commit -m "feat(T1): 语言协议块内联 8 个 SKILL.md（协议不影响触发描述，openai.yaml 无需同步）"
```

### 任务 2：agent 定义语言条款 + agents/command descriptions 拼接

**文件**：
- 修改：`agents/code-explorer.md`、`agents/code-reviewer.md`、`agents/external-resource-explorer.md`、`commands/check-mcp.md`

**接口**：
- 产出：语言条款文本（下方唯一版本，3 个 agent 一致）。

- [ ] **步骤 1：红——确认条款不存在**

```bash
grep -rl 'Language / 语言' agents/*.md | wc -l    # 预期 0
```

- [ ] **步骤 2：3 个 agent 正文 H1 标题之后插入语言条款（前后空行）**

```markdown
**Language / 语言**: Report in the language of the task prompt you receive; fall back to English when the prompt language is mixed or unclear. Keep JSON contract field names in English; field values follow the prompt language. / 以派发任务 prompt 的语言回报，混合或无法判定时用英语；JSON 契约字段名保持英文，字段值跟随派发语言。
```

- [ ] **步骤 3：4 个 frontmatter description 替换为拼接版**

`agents/code-explorer.md`：

```
Deep codebase analysis - trace execution paths, map architecture layers, understand design patterns and abstractions / 深度分析代码库，追踪执行路径，映射架构层次，理解设计模式和抽象
```

`agents/code-reviewer.md`：

```
Code review - identify bugs, security vulnerabilities, code quality issues and convention violations / 代码审查，识别 bug、安全漏洞、代码质量问题和规范违反
```

`agents/external-resource-explorer.md`：

```
External resource exploration - find best practices, standards, official docs and cases for requirement-analysis parallel and follow-up exploration; reports conclusions, evidence and sources / 外部资源探索 agent，负责查找外部最佳实践、标准、官方文档与案例，服务 requirement-analysis 的并行探索与回补探索，输出结论、证据和来源
```

`commands/check-mcp.md`：

```
Check MCP configuration status - details and fallback plans for all 4 MCPs / 检查 MCP 配置状态，显示全部 4 个 MCP 的详细信息和降级方案
```

- [ ] **步骤 4：绿——断言**

```bash
grep -rl 'Language / 语言' agents/*.md | wc -l                     # 预期 3
grep -c ' / ' <(grep 'description:' agents/*.md commands/check-mcp.md)  # 预期 4
```

- [ ] **步骤 5：提交**

```bash
git add agents/ commands/check-mcp.md
SKIP_RELEASE_HOOK=1 git commit -m "feat(T2): agent 语言条款 + agents/command descriptions 中英拼接"
```

---

## 分组 B：触发描述与清单

### 任务 3：8 个 SKILL.md descriptions 拼接 + openai.yaml 同步

**文件**：
- 修改：8 个 `skills/<name>/SKILL.md`（frontmatter description）+ 8 个 `skills/<name>/agents/openai.yaml`（short_description、default_prompt）

**接口**：
- 消费：全局约束的拼接格式与 1024/尖括号约束。
- 产出：16 个文件的最终触发文案（下方逐字给出）。英文压缩版是后续英文触发 evals（任务 6）的判定对象。

- [ ] **步骤 1：红——实测当前无拼接、量出预算**

```bash
node -e '
const fs=require("fs");
for (const s of ["acceptance-qa","executing-plans","exploring","requirement-analysis","test-driven-development","using-git-worktrees","visual-preview","writing-plans"]) {
  const t=fs.readFileSync(`skills/${s}/SKILL.md`,"utf8");
  const fm=t.split(/^---$/m)[1];
  const m=fm.match(/^description:\s*(>?-?)\s*\n?([\s\S]*?)(?=^\S|\n---)/m);
  const d=(m?m[2]:"").replace(/\s+/g," ").trim();
  console.log(s, d.length, /[<>]/.test(d)?"ANGLE!":"ok", d.includes(" / ")?"已拼接":"未拼接");
}'
```

预期：8 行均为 `未拼接`、`ok`。

- [ ] **步骤 2：替换 8 个 SKILL.md 的 description**

规则：保持各文件现有 YAML 写法（单行的保持单行；acceptance-qa 的 `>` 折叠块保持折叠块，英文部分起于块首）。新值 = 下方英文压缩版 + ` / ` + **该文件现有中文全文（一字不改）**。英文压缩版逐字如下：

- `exploring`：`Exploration mode (thinking partner) - for ideas not yet committed to delivery: read-only code walks, option comparison, diagram-driven reasoning; no code changes, no implementation artifacts, no forced conclusions; hands off to requirement-analysis once the idea crystallizes. Not for committed deliverables or single-fact lookups.`
- `requirement-analysis`：`Requirement design workflow - mandatory before any creative development (new features, components, behavior changes, API/DB design): triage, parallel exploration, one-question-at-a-time clarification, adversarial validation and 2-3 option comparison produce a spec, then hand off to writing-plans. Use exploring first while the idea is unsettled; not for pure Q&A, test runs or trivial one-line fixes.`
- `writing-plans`：`Write implementation plans - when a spec or clear requirement exists and multi-step work has not started: decompose the design into bite-sized tasks a zero-context engineer can execute (exact file paths, complete code, TDD steps, expected output), save under the feature directory plan/ subdir, hand off to executing-plans. Usually invoked by requirement-analysis after spec approval.`
- `executing-plans`：`Execute implementation plans - when a written plan from writing-plans exists (plan/*-plan.md under the feature docs directory): the main thread executes task-by-task in an isolated worktree (TDD + per-task commits + spec self-check), then orchestrates multi-dimension adversarial code review and matrix-driven acceptance. Not for improvised changes without a written plan.`
- `using-git-worktrees`：`Isolated workspace - before feature work that needs isolation from the current workspace or before executing a plan: detect existing isolation first, prefer native worktree tools (e.g. Claude Code EnterWorktree), fall back to manual git worktree; ensure dependencies installed and the test baseline is green.`
- `test-driven-development`：`TDD discipline - before implementing any feature or fixing any bug. Iron law: no production code without a failing test. Write the test, watch it fail, write minimal code to pass; red-green-refactor. Exceptions (throwaway prototypes, generated code, config files) require user consent.`
- `visual-preview`：`Browser visual preview - during requirement design or brainstorming, show mockups, wireframes, layout comparisons and architecture diagrams in a local browser page and collect click-through choices. Use when a question is genuinely visual (clearer to see than to say); text-only requirement, tradeoff or concept questions stay in the terminal.`
- `acceptance-qa`：`All-round acceptance workflow - multi-dimension acceptance over the dimension x execution-nature matrix: unit/integration/API regression, E2E, visual regression, accessibility, performance (web CWV/Lighthouse, k6 load, client), plus AI autonomous acceptance and failure diagnosis. For acceptance-flavored requests (accept a feature/page/endpoint, E2E, load test, visual regression) or executing-plans wrap-up; also diagnoses page interaction, rendering, performance, Shadow DOM/iframe issues. Not for TDD red-green cycles, routine test runs, static code review, or doc review.`

- [ ] **步骤 3：8 个 openai.yaml 更新 short_description 与 default_prompt**

`short_description` 新值 = 对应 skill 的英文压缩版（同上，逐字） + ` / ` + 该 yaml 现有中文 short_description（一字不改）。
`default_prompt` 新值 = 现有英文（一字不改） + ` / ` + 下方中文（逐字）：

| skill | default_prompt 追加的中文侧 |
|---|---|
| exploring | `用 $exploring 在决定要不要做之前陪我把这个想法或问题想清楚。` |
| requirement-analysis | `用 $requirement-analysis 走 8 阶段工作流设计这个功能并产出 spec。` |
| writing-plans | `用 $writing-plans 把已批准的 spec 拆成详细实施计划。` |
| executing-plans | `用 $executing-plans 以 TDD 逐任务执行实施计划并做收尾审查。` |
| acceptance-qa | `用 $acceptance-qa 验收目标功能、页面或接口；请提供明确目标（URL、端点或功能描述）以装配验收矩阵。` |
| using-git-worktrees | `用 $using-git-worktrees 在动手实现前建立隔离工作区。` |
| test-driven-development | `用 $test-driven-development 纪律：先写失败测试，再写最小实现让它通过。` |
| visual-preview | `用 $visual-preview 在设计讨论中于浏览器展示 mockup 与可视化选项。` |

- [ ] **步骤 4：绿——长度/尖括号/结构断言**

```bash
# 重跑步骤 1 的 node 脚本：8 行均应为 已拼接、ok，且长度 ≤1024
node scripts/validate-skills.mjs      # 8 个 passed（含 1024 与尖括号校验）
node scripts/check-openai-sync.mjs    # openai.yaml sync checks passed (8 skills).
grep -c 'default_prompt.*用 \$' skills/*/agents/openai.yaml | grep -c ':1$'   # 预期 8
```

- [ ] **步骤 5：提交**

```bash
git add skills/*/SKILL.md skills/*/agents/openai.yaml
SKIP_RELEASE_HOOK=1 git commit -m "feat(T3): 8 个 skill 触发描述中英拼接（SKILL.md + openai.yaml 同步）"
```

### 任务 4：3 个插件清单 descriptions

**文件**：
- 修改：`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`、`.codex-plugin/plugin.json`

**接口**：
- 消费：全局约束拼接格式。注意 spec 决策：原文案中"中文"定语随双语化更新为"中英双语"（本任务是全局约束"中文保真"的唯一例外，spec 已批准）。

- [ ] **步骤 1：红**

```bash
node -e 'const j=require("./.claude-plugin/plugin.json"); console.log(j.description.includes(" / ")?"已拼接":"未拼接")'
```

预期：`未拼接`

- [ ] **步骤 2：替换字段（JSON 值逐字如下）**

`.claude-plugin/plugin.json` 与 `.codex-plugin/plugin.json` 的 `description`（同文）：

```
Development workflow plugin suite: exploring (thinking partner), requirement-analysis (design workflow), writing-plans / executing-plans (planning and execution), visual-preview, using-git-worktrees / test-driven-development (engineering discipline), acceptance-qa (all-round acceptance). / 开发工作流插件集：exploring 探索模式、requirement-analysis 设计工作流、writing-plans/executing-plans 计划与执行、visual-preview 可视化预览、using-git-worktrees/test-driven-development 工程纪律、acceptance-qa 全能验收。
```

`.claude-plugin/marketplace.json` 的 `metadata.description`：

```
Bilingual (EN/zh) design-plan-execute skill pipeline and all-round acceptance workflow plugin suite / 中英双语的设计→计划→执行 skill 管线与全能验收工作流插件集
```

`.claude-plugin/marketplace.json` 的 `plugins[0].description`：

```
Development workflow plugin suite - full design-plan-execute skill pipeline with all-round acceptance / 开发工作流插件集 - 设计→计划→执行完整 skill 管线与全能验收工作流
```

`.codex-plugin/plugin.json` 的 `interface.shortDescription`：

```
Bilingual (EN/zh) design-plan-execute skill pipeline and all-round acceptance workflows. / 中英双语的设计→计划→执行 skill 管线与全能验收工作流。
```

`.codex-plugin/plugin.json` 的 `interface.longDescription`（双语两段，英文段 + 现中文段将首句"Spec Dev 提供中文开发工作流管线"改为"Spec Dev 提供中英双语开发工作流管线"，其余一字不改）：

```
Spec Dev provides a bilingual (EN/zh) development workflow pipeline: exploring offers no-commitment thinking-partner exploration while an idea is unsettled; requirement-analysis polishes ideas into specs (parallel exploration, one-question-at-a-time clarification, adversarial validation, multi-option comparison, visual preview, acceptance matrix); writing-plans decomposes specs into zero-context executable plans (with acceptance tasks); executing-plans executes task-by-task with TDD in an isolated worktree plus multi-dimension adversarial review; supported by using-git-worktrees and test-driven-development discipline and acceptance-qa all-round acceptance (unit/integration/E2E/visual/a11y/performance + AI autonomous acceptance + diagnosis), with optional in-plugin MCP config for doc retrieval, web research, deep thinking and browser/performance acceptance. / Spec Dev 提供中英双语开发工作流管线：exploring 在想法未定型时提供无承诺的思考伙伴探索，requirement-analysis 把想法打磨成 spec（并行探索、逐题澄清、对抗验证、多方案对比、可视化预览、验收矩阵），writing-plans 拆解为零上下文可执行计划（含验收任务），executing-plans 在隔离 worktree 中以 TDD 逐任务执行并做多维对抗审查；配套 using-git-worktrees、test-driven-development 工程纪律与 acceptance-qa 全能验收（单元/集成/E2E/视觉/可访问性/性能 + AI 自主验收 + 诊断），并可通过插件内 MCP 配置增强文档检索、网页研究、深度思考和浏览器/性能验收。
```

`.codex-plugin/plugin.json` 的 `interface.defaultPrompt` 数组（6 条整体替换）：

```json
[
  "Use exploring to think through this idea with me / 使用 exploring 陪我探讨这个想法的可行性",
  "Use requirement-analysis to design this feature and produce a spec / 使用 requirement-analysis 设计这个功能并产出 spec",
  "Use writing-plans to turn the approved spec into an implementation plan / 使用 writing-plans 把已批准的 spec 拆成实施计划",
  "Use executing-plans to execute this implementation plan / 使用 executing-plans 执行这份实施计划",
  "Use acceptance-qa to run all-round acceptance on this feature / 使用 acceptance-qa 全面验收这个功能",
  "Check workspace MCP configuration and fallbacks / 检查当前工作区 MCP 配置与降级方案"
]
```

- [ ] **步骤 3：绿**

```bash
node scripts/check-plugin.mjs        # Plugin package checks passed.（三清单版本一致性不受影响）
node -e 'for (const f of ["./.claude-plugin/plugin.json","./.codex-plugin/plugin.json","./.claude-plugin/marketplace.json"]) JSON.parse(require("fs").readFileSync(f,"utf8")); console.log("JSON ok")'
```

- [ ] **步骤 4：提交**

```bash
git add .claude-plugin/ .codex-plugin/
SKIP_RELEASE_HOOK=1 git commit -m "feat(T4): 插件清单 descriptions 中英双语化"
```

---

## 分组 C：产物模板与 evals

### 任务 5：产物模板双语指引

**文件**：
- 修改：`skills/requirement-analysis/assets/spec-template.md`、`skills/acceptance-qa/templates/acceptance-report.md`、`skills/visual-preview/references/preview-guide.md`

- [ ] **步骤 1：红**

```bash
grep -l 'Fill in the conversation language' skills/requirement-analysis/assets/spec-template.md skills/acceptance-qa/templates/acceptance-report.md | wc -l   # 预期 0
```

- [ ] **步骤 2：spec-template.md**

在 H1（`# Spec 模板…`）之后插入双语填写指示（前后空行）：

```markdown
> **Language / 语言**: Fill in the conversation language — all narrative content (background, requirements, scenarios, decisions) follows the conversation language at creation; keep structural labels (Requirement / Scenario / GIVEN / WHEN / THEN, frontmatter keys) in English. / 以对话语言填写——叙述性内容（背景、需求、场景、决策）跟随创建时对话语言；结构标签（Requirement/Scenario/GIVEN/WHEN/THEN、frontmatter 键）保持英文。
```

方括号填写指引双语化：模板正文中每处 `[中文指引]` 形态的填写说明，在中文后追加 ` / English` 对照，语义等价、一句话为限。示例（其余同规则机械处理，全文约 15 处）：

| 原文 | 新文 |
|---|---|
| `[要解决什么问题、为什么现在做；1-3 句]` | `[要解决什么问题、为什么现在做；1-3 句 / What problem, why now; 1-3 sentences]` |
| `[做到什么算完成]` | `[做到什么算完成 / What counts as done]` |
| `[明确不做的事——防止范围蔓延；没有可写"无"]` | `[明确不做的事——防止范围蔓延；没有可写"无" / What we explicitly won't do; write "none" if empty]` |
| `[一句话命名一个行为]` | `[一句话命名一个行为 / Name one behavior in a sentence]` |
| `[具体案例名，如"拒绝过期 token"——不写"场景 2"]` | `[具体案例名，如"拒绝过期 token"——不写"场景 2" / Concrete case name, not "scenario 2"]` |

- [ ] **步骤 3：acceptance-report.md 全文替换为**

````markdown
# Acceptance Report: {{target-feature}}

> **Language / 语言**: Fill report content in the conversation language; keep table headers and structural labels in English. / 报告内容以对话语言填写；表头与结构标签保持英文。
> Time: {{time}} | Triggered by: {{executing-plans wrap-up / direct user request}} | Tier: {{light/standard/deep}}
> Spec: {{spec path or "none (mini matrix)"}} | Evidence dir: {{acceptance/ path}}

## Overview

| Dimension | Execution | Pass | Fail | Warn | Unverified | Notes |
|-----------|-----------|------|------|------|------------|-------|
| unit | D | 42 | 0 | 0 | 0 | full run 3.2s |
| integration | D | 11 | 1 | 0 | 0 | 1 failure → Diagnosis #1 |
| e2e | D + A | 6 | 0 | 1 | 0 | warning → Finding #2 |
| visual | D | 4 | 0 | 0 | 1 | 1 item without baseline (created) |
| a11y | D | 1 | 0 | 0 | 0 | no WCAG A/AA violations |
| perf-web | D | 2 | 0 | 0 | 0 | LCP median 1.8s ≤ 2.5s |
| perf-api | D | — | — | — | 1 | k6 not installed (see coverage_note) |

## Requirement Coverage (when a spec exists)

| Matrix row (Scenario / check item) | Dimension | Status | Evidence |
|------------------------------------|-----------|--------|----------|
| {{reject-expired-token}} | integration | pass | {{tests/auth.spec.ts passed}} |
| {{login-redirects-to-dashboard}} | e2e | pass | {{e2e passed + trace.zip}} |

## Key Findings (by severity)

1. **[P1] {{title}}** ({{dimension}}, Diagnosis #1) — {{one-line impact}}; root cause: {{file:line + verified root cause}}; suggestion: {{fix direction}}
2. **[P3] {{title}}** ({{dimension}}) — {{impact and suggestion}}

## Diagnosis Details

{{One section per failure, format per references/diagnose.md Step 4; write "all passed, diagnosis skipped" when nothing failed}}

## Evidence Index

- Contract JSON: `{{acceptance/check-items.json}}` (validated by validate-output.mjs)
- Test files: {{list of tests generated/run this round}}
- Screenshots / traces / perf reports: {{file list}}

## coverage_note

{{Trimmed dimensions and reasons; unverified items and why; tier-down/sampling statements. Write "full matrix executed, no truncation" when nothing was cut}}
````

- [ ] **步骤 4：preview-guide.md** 在 H1 之后插入（前后空行）：

```markdown
> **Language / 语言**: The Chinese copy in the HTML examples below is structural placeholder only — write actual mockup copy (headings, option labels, annotations) in the conversation language. / 下文 HTML 示例中的中文文案仅为结构示意，实际 mockup 文案（标题、选项、标注）以对话语言书写。
```

- [ ] **步骤 5：绿**

```bash
grep -l 'Fill in the conversation language\|Fill report content' skills/requirement-analysis/assets/spec-template.md skills/acceptance-qa/templates/acceptance-report.md | wc -l  # 预期 2
grep -c '{{目标功能}}' skills/acceptance-qa/templates/acceptance-report.md   # 预期 0（占位符已英文化）
grep -c 'structural placeholder' skills/visual-preview/references/preview-guide.md  # 预期 1
node scripts/validate-skills.mjs   # 8 个 passed
```

- [ ] **步骤 6：提交**

```bash
git add skills/requirement-analysis/assets/spec-template.md skills/acceptance-qa/templates/acceptance-report.md skills/visual-preview/references/preview-guide.md
SKIP_RELEASE_HOOK=1 git commit -m "feat(T5): 产物模板双语指引 + 报告模板结构英文化"
```

### 任务 6：trigger-evals 英文用例增补

**文件**：
- 修改：`skills/requirement-analysis/evals/trigger-evals.json`、`skills/exploring/evals/trigger-evals.json`、`skills/acceptance-qa/evals/trigger-evals.json`

**接口**：
- 消费：任务 3 定稿的英文压缩 descriptions（评估对象）。

- [ ] **步骤 1：红——确认新 id 不存在**

```bash
grep -c '"t11"\|"n9"' skills/requirement-analysis/evals/trigger-evals.json   # 预期 0
```

- [ ] **步骤 2：追加条目（JSON 数组尾部，保持既有缩进风格）**

`requirement-analysis`（已有英文正例 t6）——`should_trigger` 追加：

```json
{ "id": "t11", "prompt": "we've decided to build team workspaces - design this feature and produce the spec" }
```

`should_not_trigger` 追加：

```json
{ "id": "n9", "prompt": "I'm still debating whether we need multi-tenancy at all - help me think it through" },
{ "id": "n10", "prompt": "where is this helper function defined?" }
```

`notes` 末尾追加一句：`t6/t11 与 n9/n10 为英文触发样例：验证 description 英文压缩版的正负边界（n9 是 exploring 领地、n10 是单点事实问答）。`

`exploring`（已有英文正例 t6）——`should_trigger` 追加：

```json
{ "id": "t9", "prompt": "not sure if we should move to GraphQL - can we talk through the tradeoffs first?" }
```

`should_not_trigger` 追加：

```json
{ "id": "n9", "prompt": "add a user permission management feature to the system" },
{ "id": "n10", "prompt": "write an implementation plan based on the approved spec" }
```

`notes` 末尾追加一句：`t6/t9 与 n9/n10 为英文触发样例：n9 已承诺交付（requirement-analysis 领地）、n10 属 writing-plans 领地，检验英文侧的双向互斥边界。`

`acceptance-qa`（已有英文正例 t4）——`should_trigger` 追加：

```json
{ "id": "t17", "prompt": "run a full acceptance pass on the checkout flow against the spec before we merge" }
```

`should_not_trigger` 追加：

```json
{ "id": "n11", "prompt": "run the unit tests and fix whatever is failing" }
```

`notes` 末尾追加一句：`t4/t17 与 n11 为英文触发样例：n11 是日常跑测试/修测试（无验收语义），检验英文侧排除边界。`

- [ ] **步骤 3：绿**

```bash
for f in skills/requirement-analysis/evals/trigger-evals.json skills/exploring/evals/trigger-evals.json skills/acceptance-qa/evals/trigger-evals.json; do node -e "const j=require('./$f'); const ids=[...j.should_trigger,...j.should_not_trigger].map(x=>x.id); if(new Set(ids).size!==ids.length) throw 'dup id in $f'; console.log('$f ok', ids.length)"; done
```

预期：三行 ok，条目数分别为 21、18、29。

- [ ] **步骤 4：提交**

```bash
git add skills/*/evals/trigger-evals.json
SKIP_RELEASE_HOOK=1 git commit -m "feat(T6): trigger-evals 增补英文触发正负样例"
```

---

## 分组 D：文档双版

### 任务 7：创建 README.zh-CN.md（中文版迁移）

**文件**：
- 创建：`README.zh-CN.md`

- [ ] **步骤 1：复制现中文 README 并加互跳行**

```bash
cp README.md README.zh-CN.md
```

在 `README.zh-CN.md` 的 H1（`# spec-dev`）之后插入（前后空行）：

```markdown
[English](README.md) | 简体中文
```

- [ ] **步骤 2：绿——断言**

```bash
head -5 README.zh-CN.md | grep -c '\[English\](README.md)'   # 预期 1
diff <(tail -n +4 README.zh-CN.md) <(tail -n +2 README.md) && echo "内容一致"   # 除头部互跳行外与原文一致（行偏移按实际插入位置调整）
```

- [ ] **步骤 3：提交**

```bash
git add README.zh-CN.md
SKIP_RELEASE_HOOK=1 git commit -m "feat(T7): 新增 README.zh-CN.md（现中文 README 迁移 + 互跳行）"
```

### 任务 8：README.md 英文化

**文件**：
- 修改：`README.md`（全文重写为英文，结构保持 315 行原骨架）

**接口**：
- 消费：任务 7 已创建的 `README.zh-CN.md`（互跳目标）。
- 产出：英文版章节锚定（下方标题映射表）。

- [ ] **步骤 1：按映射表与规则翻译全文**

H1 之后第一行插入互跳行：

```markdown
English | [简体中文](README.zh-CN.md)
```

章节标题映射（逐字采用）：

| 原标题 | 英文标题 |
|---|---|
| `## 特性` | `## Features` |
| `## Skill 管线` | `## Skill Pipeline` |
| `## 安装` | `## Installation` |
| `### Claude Code` / `### Codex` | 不变 |
| `## 插件包维护` | `## Plugin Package Maintenance` |
| `### evals 定位` | `### About evals` |
| `### 提交前 hook` | `### Pre-commit hooks` |
| `## exploring 使用方法` | `## Using exploring` |
| `## requirement-analysis 使用方法` | `## Using requirement-analysis` |
| `## writing-plans / executing-plans 使用方法` | `## Using writing-plans / executing-plans` |
| `## visual-preview 使用方法` | `## Using visual-preview` |
| `## acceptance-qa 使用方法` | `## Using acceptance-qa` |
| `## MCP 工具增强（推荐但可选）` | `## MCP Enhancements (recommended, optional)` |
| `### 推荐配置` | `### Recommended configuration` |
| `## 专门化 Agents` | `## Specialized Agents` |
| `## 目录结构` | `## Directory Layout` |
| `## 更新日志` | `## Changelog` |
| `## 许可证` | `## License` |
| `## 作者` | `## Author` |
| `## 贡献` | `## Contributing` |

翻译规则（无例外）：
1. 代码块内的命令、JSON、路径逐字保留，不翻译；代码块内的中文注释翻译为英文注释。
2. skill 名、agent 名、文件路径、工具名（EnterWorktree、playwright、k6 等）不翻译。
3. ASCII 管线图：框内 skill 名保留，框外中文标签（如箭头旁说明）译为英文，保持图形对齐（宽度不足时允许调整框宽）。
4. 表格：表头与单元格中文全部翻译。
5. `## Changelog` 节正文改为：`See [CHANGELOG.md](CHANGELOG.md) (Chinese).`——链接旁标注中文。
6. 目录树注释（`# 中文说明`）翻译为英文。
7. 正文散文逐段翻译，语义等价、技术语气，不增删信息。

- [ ] **步骤 2：绿——中文残留断言**

```bash
grep -c '[一-龥]' README.md    # 预期 1（仅互跳行的"简体中文"）
grep -n '[一-龥]' README.md    # 人工核对唯一命中即互跳行
grep -c '](README.zh-CN.md)' README.md   # 预期 1
grep -c '(Chinese)' README.md  # 预期 ≥1（CHANGELOG 标注）
```

- [ ] **步骤 3：提交**

```bash
git add README.md
SKIP_RELEASE_HOOK=1 git commit -m "feat(T8): README.md 英文化 + 双版互跳"
```

### 任务 9：guardrail/README.md 双版同构

**文件**：
- 创建：`guardrail/README.zh-CN.md`
- 修改：`guardrail/README.md`（63 行，英文化）

- [ ] **步骤 1：迁移中文版**

```bash
cp guardrail/README.md guardrail/README.zh-CN.md
```

`guardrail/README.zh-CN.md` H1 之后插入：`[English](README.md) | 简体中文`

- [ ] **步骤 2：英文化 guardrail/README.md**

H1 之后插入：`English | [简体中文](README.zh-CN.md)`。标题映射：`# spec-dev 漂移守卫（guardrail）` → `# spec-dev Drift Guard (guardrail)`；`## 一键安装到目标仓库` → `## One-command install into a target repo`；`## 防线分层` → `## Defense layers`；`## 判定逻辑` → `## Detection logic`；`## 临时放行` → `## Temporary bypass`；`## 文件` → `## Files`；`## 已知边界` → `## Known limitations`。翻译规则同任务 8（表格全译、命令保留、`Spec-Guard: off` 等 trailer 语法逐字保留）。

- [ ] **步骤 3：绿**

```bash
grep -c '[一-龥]' guardrail/README.md         # 预期 1（互跳行）
head -5 guardrail/README.zh-CN.md | grep -c '\[English\](README.md)'   # 预期 1
```

- [ ] **步骤 4：提交**

```bash
git add guardrail/README.md guardrail/README.zh-CN.md
SKIP_RELEASE_HOOK=1 git commit -m "feat(T9): guardrail README 双版同构互跳"
```

---

## 分组 E：guardrail 播种与脚本文案

### 任务 10：播种 snippet 双语并列 + session-context 双语输出

**文件**：
- 修改：`guardrail/templates/CLAUDE.md.snippet`、`guardrail/templates/AGENTS.md.snippet`、`guardrail/session-context.mjs`

**接口**：
- 约束：snippet 首尾标记行**逐字保留**（install.mjs 以 `<!-- spec-dev:guardrail:start` 与 `spec-dev:guardrail:end -->` 子串定位幂等替换块，install.mjs:127-128）；只改标记之间的内容。

- [ ] **步骤 1：红**

```bash
grep -c 'spec-driven development' guardrail/templates/CLAUDE.md.snippet   # 预期 0
```

- [ ] **步骤 2：CLAUDE.md.snippet 标记块内改为英文节+中文节并列**

标记行之间的新内容（英文节在前；中文节 = 现有内容 L3-L21 一字不改，此处从略以「保留原文」标注；执行时原样保留）：

````markdown
## This repository uses spec-driven development (spec-dev)

This repository follows the [spec-dev](https://github.com/FlameMida/spec-dev) workflow: requirements land as a spec first, then break down into a plan, then get implemented against the plan. **Read this section before touching code.**

### Where artifacts live

- **spec / plan**: `docs/YYYY-MM-DD-<feature>/` — `spec/<feature>-design.md` is the behavior contract and acceptance matrix; `plan/<feature>-plan.md` is the executable plan.
- The `spec_dev.covers` frontmatter at the top of each spec declares the code paths it covers.

### Obligations when changing code (plugin installed or not)

1. Before touching code, find the owning feature and what its spec says about the behavior.
2. **When behavior changes, update that spec in the same commit** (behavior requirements + acceptance matrix).
3. The drift guard blocks changes that touch code covered by an active spec without syncing it: at edit time (PreToolUse hook), turn wrap-up (Stop hook workspace audit), commit (pre-commit), push (pre-push) and CI. Update the spec first (working-tree changes count), then touch the covered code.
4. For changes genuinely unrelated to the behavior contract, leave a `Spec-Guard: off <reason>` trailer in the commit message (range checks pass it through), or set `SPEC_DEV_GUARD=off` temporarily; mark an obsolete spec's frontmatter `status` as `superseded`.

### With the spec-dev plugin installed

Drive work with the `requirement-analysis` (requirement→spec), `writing-plans` (spec→plan) and `executing-plans` (TDD task-by-task execution + wrap-up acceptance) skills; do not bypass the workflow and edit code directly.

## 本仓库采用 spec 驱动开发（spec-dev）

【保留原文：现有中文节 L3-L21 一字不改，整体下移至此】
````

- [ ] **步骤 3：AGENTS.md.snippet 同构**

同上结构；英文节两处差异：首段末尾加 `(In Codex environments read this file first; the equivalent Claude guidance lives in CLAUDE.md.)`；义务第 3 条防线列表用 Codex 措辞 `at edit time (PreToolUse hook in Codex .codex/hooks.json), commit (pre-commit), push (pre-push) and CI (Claude Code additionally runs a Stop-hook wrap-up audit)`。中文节保留现有 L3-L21 原文。

- [ ] **步骤 4：session-context.mjs 输出双语**

L54-58 的 `console.log` 模板字符串整体替换为（`${specs.length}` 与 `${health}` 插值保留）：

```js
console.log(`[spec-dev workflow notice / spec-dev 流程提示] This repository uses spec-driven development / 本仓库采用 spec 驱动开发（spec-dev 工作流）:
- Existing spec/plan artifacts live under docs/ (${specs.length} spec(s)). / 现有 spec/plan 产物位于 docs/<日期-特性>/ 目录（共 ${specs.length} 份 spec）。
- Before changing code, check the owning feature's spec; behavior changes must update the spec (requirements + acceptance matrix) in the same commit. / 修改代码前，先查看其所属特性的 spec；行为变更必须同步更新 spec 的行为规范与验收矩阵，并与代码同一提交。
- The drift guard (PreToolUse/Stop hooks / pre-commit / pre-push / CI) blocks code changes that skip spec sync; update the spec first, then the code. / 漂移守卫会拦截"改代码不同步 spec"的操作；先改 spec 再改代码即放行。
- With the spec-dev plugin installed, use requirement-analysis / writing-plans / executing-plans; otherwise honor the sync obligations above. / 若安装了 spec-dev 插件，请用 requirement-analysis / writing-plans / executing-plans 工作流开展开发；未安装时至少遵守上述同步义务。${health}`);
```

L40-42 与 L45-47 的两条自检 issue 文案改为 `English / 中文` 拼接：

```js
issues.push(
  "git gate not enabled: versioned hooks (.githooks/) exist but core.hooksPath does not point to them; run `git config core.hooksPath .githooks` now, then continue. / git 闸门未启用：仓库带有版本化 hooks（.githooks/），但 core.hooksPath 未指向它。请立即执行 `git config core.hooksPath .githooks` 修复，再继续其他工作。",
);
```

```js
issues.push(
  "guard script scripts/spec-dev/check-spec-drift.mjs missing: drift guard incomplete; re-run the installer (node guardrail/install.mjs). / 守卫脚本 scripts/spec-dev/check-spec-drift.mjs 缺失：漂移守卫不完整，请重新运行安装器（node guardrail/install.mjs）。",
);
```

- [ ] **步骤 5：绿**

```bash
grep -c 'spec-dev:guardrail:start' guardrail/templates/*.snippet | grep -c ':1$'   # 预期 2（标记未破坏）
grep -c 'spec-driven development' guardrail/templates/CLAUDE.md.snippet             # 预期 ≥1
grep -c '本仓库采用 spec 驱动开发' guardrail/templates/CLAUDE.md.snippet             # 预期 1（中文节保留）
node --check guardrail/session-context.mjs && echo "syntax ok"   # 语法通过
```

- [ ] **步骤 6：提交**

```bash
git add guardrail/templates/CLAUDE.md.snippet guardrail/templates/AGENTS.md.snippet guardrail/session-context.mjs
SKIP_RELEASE_HOOK=1 git commit -m "feat(T10): 播种 snippet 双语并列 + session-context 双语输出"
```

### 任务 11：脚本 console 文案双语

**文件**：
- 修改：`scripts/check-openai-sync.mjs`、`scripts/install-git-hooks.mjs`、`scripts/release.mjs`、`guardrail/install.mjs`

**接口**：
- 约束：只改字符串字面量，不动逻辑与退出码；模板字符串中的 `${}` 插值原样保留。

- [ ] **步骤 1：红——记录当前中文文案基线**

```bash
grep -rEn 'console\.(log|error|warn)' scripts/*.mjs guardrail/install.mjs | grep -cE '[一-龥]'   # 记录基线数（约 15+14）
```

- [ ] **步骤 2：按映射表逐条替换（格式 `English / 中文`，中文侧一字不改）**

`scripts/check-openai-sync.mjs`（含 problems 数组内文案）：

| 位置 | 新文案 |
|---|---|
| L36 | `` `skills/${entry}: missing agents/openai.yaml (Codex interface file) / 缺少 agents/openai.yaml（Codex 平台接口文件）` `` |
| L42 | `` `skills/${entry}/agents/openai.yaml: missing required key ${key.replace(/:$/, "")} / 缺少必需键 ${key.replace(/:$/, "")}` `` |
| L63-64 | `` `skills/${m[1]}/SKILL.md staged without its agents/openai.yaml; check whether the Codex trigger description needs sync, or skip with SKIP_OPENAI_SYNC_CHECK=1. / skills/${m[1]}/SKILL.md 已暂存修改，但同 skill 的 agents/openai.yaml 未同步。请核对 Codex 端触发描述是否需要更新；确认无需同步可用 SKIP_OPENAI_SYNC_CHECK=1 跳过` `` |
| L72 | `"openai.yaml sync check failed: / openai.yaml 同步检查未通过："` |

`scripts/install-git-hooks.mjs` L25：`"Configured git push.followTags=true (tags ride along on push / 推送时自动带上版本 tag)"`

`scripts/release.mjs`：

| 行 | 新文案 |
|---|---|
| L28 | `"Usage / 用法: node scripts/release.mjs <patch|minor|major|X.Y.Z|--auto> [--dry-run]"` |
| L43 | `` `release --auto: ${skipReason}, skipping auto release / 跳过自动发版` `` |
| L56 | `` `release --auto: tag ${tag} already exists, skipping auto release / tag 已存在，跳过自动发版` `` |
| L59 | `` `tag ${tag} already exists, check the version number / tag 已存在，请检查版本号` `` |
| L64 | `"Working tree not clean; commit or stash before releasing / 工作区不干净，请先提交或暂存当前修改再发布"` |
| L76 | `"Cannot find '## [' section anchor in CHANGELOG.md / CHANGELOG.md 中找不到 '## [' 章节锚点"` |
| L80 | `` `Version / 版本: ${current} -> ${next}` `` |
| L81 | `"---- CHANGELOG draft / 草稿 ----"` |
| L86 | `"(dry-run, nothing written / 未写入任何文件)"` |
| L108 | `` `Merged version ${next} and CHANGELOG into current commit, tag ${tag} created. / 已将版本 ${next} 与 CHANGELOG 合并进当前提交，并创建 tag ${tag}。` `` |
| L112 | `` `Commit and tag ${tag} created; git push will publish (pre-push hook carries the tag). / 已创建提交与 tag ${tag}。执行 git push（pre-push 钩子会自动带上 tag）即可发布。` `` |
| L117 | `` `Release failed; version and CHANGELOG changes rolled back. Reason / 发布失败，已回滚版本号与 CHANGELOG 改动。原因：\n${err.message ?? err}` `` |
| L184 | `` `Unrecognized version argument / 无法识别的版本参数: ${bump}` `` |

`guardrail/install.mjs`（log/done.push 文案，行号以当前文件为准）：

| 行 | 新文案 |
|---|---|
| L36 | `` `Target repo / 目标仓库：${repo}` `` |
| L52 | `".claude/settings.json (hooks merged / hooks 已合并)"` |
| L57 | `".codex/hooks.json (hooks merged / hooks 已合并)"` |
| L61 | `"CLAUDE.md (guard section written / 守卫段已写入)"` |
| L63 | `"AGENTS.md (guard section written / 守卫段已写入)"` |
| L69 | `` `${res.hooksDir}/{pre-commit,pre-push} (guard installed / 守卫已安装)` `` |
| L70 | `"git config core.hooksPath .githooks (set / 已设置)"` |
| L71 | `"package.json prepare script (auto-enables hooksPath on install / install 时自动启用 hooksPath)"` |
| L83 | `"\n✓ Install complete / 安装完成："` |
| L85 | `"\nNote: the guard only activates when spec frontmatter has spec_dev.covers filled and status: active. / 提示：确保 spec 的 frontmatter 填了 spec_dev.covers 且 status: active，守卫才会生效。"` |
| L133 | `` `  ! ${path.relative(repo, file)} guard markers incomplete or out of order; file skipped — restore paired start/end markers and reinstall. / 的守卫标记不完整或顺序异常，已跳过该文件；请手工恢复成对的 start/end 标记后重装` `` |
| L152 | `"  ! not a git repo, skipping git hooks / 非 git 仓库，跳过 git hooks"` |
| L194 | `"  ! cannot write git config (read-only sandbox?); run manually: git config core.hooksPath .githooks / 无法写 git config（沙箱只读？），请手工执行：git config core.hooksPath .githooks"` |

- [ ] **步骤 3：绿**

```bash
node --check scripts/check-openai-sync.mjs && node --check scripts/install-git-hooks.mjs && node --check scripts/release.mjs && node --check guardrail/install.mjs && echo "syntax ok"
node scripts/release.mjs 2>&1 | grep -c 'Usage / 用法'    # 预期 1（无参调用打印双语用法，退出码非 0 属预期）
node scripts/check-openai-sync.mjs                         # 仍通过（文案改动不影响判定）
```

- [ ] **步骤 4：提交**

```bash
git add scripts/ guardrail/install.mjs
SKIP_RELEASE_HOOK=1 git commit -m "feat(T11): 脚本 console 文案 English / 中文 双语拼接"
```

---

## 分组 F：验收与收尾

### 任务 12：验收（acceptance-qa）

> 本任务由 executing-plans 收尾审查阶段触发 acceptance-qa 按下表执行，
> 不参与逐任务连续执行；报告与证据落盘特性目录 `acceptance/` 子目录。
> spec 验收矩阵的「任务内校验」行已内嵌于任务 1-11 的绿断言，此处只承载「验收任务 (D)」行。

| Scenario / 检查项 | 维度 | 执行方式 | 目标 | 阈值/预期 | 验收证据 |
|-------------------|------|---------|------|----------|---------|
| 两版互跳可达 + 相对链接有效 | docs | 验收任务 (D) | README.md、README.zh-CN.md、guardrail/README*.md | 互跳链接指向的文件存在；文内相对链接（CHANGELOG.md、guardrail 路径）逐条可达 | 链接核对清单 |
| 英文会话全英文交互 / 开场声明英文表达 | ai-acceptance | 验收任务 (D) | 英文冒烟会话：以英文 prompt 触发 requirement-analysis 与 using-git-worktrees | 开场声明、澄清提问为英文，无中文句子/词组夹杂（协议块驱动） | 冒烟会话记录 |
| 中文会话话术不回归 | ai-acceptance | 验收任务 (D) | 中文冒烟会话：触发 writing-plans 开场 | 输出中文、语义与原话术一致 | 冒烟会话记录 |
| snippet 幂等安装不破坏 | integration | 验收任务 (D) | 在临时 git 仓库运行 `node guardrail/install.mjs` 两次 | 标记块唯一、双语节完整、无重复堆叠 | 安装输出与目标文件 diff |
| descriptions 展示效果 | docs | 验收任务 (D) | Claude Code 技能列表 / Codex 插件界面 | 拼接后可读、无截断异常 | 截图或列表输出 |

### 任务 13：合并与清理

- [ ] **步骤 1：全量验证**

在 worktree 内运行完整校验链（等价 pre-commit 全绿）：

```bash
node scripts/check-plugin.mjs --codex-validate   # 含官方 Codex CLI 安装校验，约 1-2 分钟
node scripts/validate-skills.mjs
node scripts/check-openai-sync.mjs
git diff --check
```

预期全部通过。失败 → 修复后才进入合并。

- [ ] **步骤 2：合并回来源分支**

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"   # 回到主工作区
git merge plan/2026-07-10-bilingual-adaptation
```

合并冲突、或主工作区有未提交改动 → 停下向计划作者确认，不强行合并。
合并提交同样带 `SKIP_RELEASE_HOOK=1`（版本发布由维护者事后统一执行 `node scripts/release.mjs minor`，本计划不代发版）。

- [ ] **步骤 3：清理**

```bash
git worktree remove .worktrees/plan/2026-07-10-bilingual-adaptation
git branch -d plan/2026-07-10-bilingual-adaptation
```

任务 0 未由本计划建立 worktree（此前已在隔离环境、原生工具建立、或降级原地执行）→ 只执行步骤 1，步骤 2-3 交回原有隔离机制收尾并注明。
