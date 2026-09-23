# spec-dev

[English](README.md) | 简体中文

中文设计→计划→执行 skill 管线插件：把想法打磨成 spec，拆解成可执行计划，在隔离工作区中以 TDD 纪律交付。

**中文** | 设计→计划→执行管线 | 对抗验证 | 可视化预览 | 全能验收 | MCP 增强

## 特性

- **探索模式** — `exploring` 保持未定想法的发散讨论：默认只读，授权受控 spike 回答必须运行的问题；可选后台调研追溯一手来源。关键分岔清单可见但每轮仍只问一题；可选笔记记录已排除选项及条件，交付问题明确后提议正式设计。
- **需求设计** — `requirement-analysis` 8 阶段设计工作流：需求分诊（light / standard / deep 三档）、按主题与实际容量分批探索、逐题澄清、sequential-thinking 对抗验证 + 2-3 方案对比、spec 落盘与双重 review（行为规范结构化：Requirement + Scenario）；HARD-GATE 保证设计获批前零实施动作
- **可视化预览** — `visual-preview` 浏览器伴侣：设计对话中 JIT 提议，展示 mockup、线框、布局对比并回收点击选择
- **实施计划** — `writing-plans` 把 spec 拆成可独立验证的 bite-sized 任务：精确文件路径、改动要点与关键 diff 片段、TDD 五步内嵌、接口消费/产出契约、禁止占位符
- **计划执行** — 主线程逐票实施与提交，独立 final 后按规模做 1/2/5 路审查，再验收、对账与交付；有效原件可复用，缺口补验。critic 由高/中候选、large 或显式 always 触发。
- **可选并发执行** — `executing-plans-parallel`: 显式选择；模型声明、任务边界切换、独占进度、隔离实现和中断恢复；共用本地/PR 交付闭环。
- **工程纪律** — `using-git-worktrees`（原生工具优先的隔离工作区）与 `test-driven-development`（行为变化先有效红、纯重构保绿、例外沿唯一清单与既有授权）独立成 skill，可被任何工作流复用
- **全能验收** — `acceptance-qa` 按「验收维度 × 执行性质」矩阵验收：单元/集成/API、Playwright E2E、视觉回归、可访问性、性能（前端 CWV / 后端 k6 / 客户端）、AI 自主验收（证据强制 + 串行复核 + verify 断言优先）与失败诊断
- **轻量修复** — `quick-fix`，用于已决定、无设计空间的小修：按证据诊断、逐题校对，沿获批公共落点 TDD 修复。范围、依赖、现行契约冲突或诊断证据不足时提议升级；偶发但可比较可继续。收尾核对复现率、临时插桩、原症状和根因证据，acceptance-qa 保持可选。
- **共享澄清** — `clarifying`，grill 式提问纪律（沿决策树一次一题、事实自查、每个决策带推荐交用户裁决）；被 requirement-analysis 与 quick-fix 引用，也可独立调用，以三出口收束（转主流程/就此结束/写入 md）
- **契约化编排** — 子代理输出走 JSON Schema 契约，`validate-output.mjs` 确定性校验，失败退回补全
- **零 MCP 依赖** — 结构化推理以内嵌 skill 提供（`sequential-thinking`，vendored）；浏览器自动化 MCP（playwright / chrome-devtools）按项目自配，见 `skills/acceptance-qa/references/mcp-setup.md`
- **4 个专门化 agents** — code-explorer、external-resource-explorer、code-reviewer 负责分析与复跑；implementer 仅在显式选择并发时于独立 worktree 写码。

## Skill 管线

意图案例位于各 skill 的 `evals/evals.json`；结构检查不代表真实模型评测，本次新增边界案例保持 manual-pending。流程字段见[计划格式](skills/writing-plans/references/plan-format.md)，守卫边界见[守卫说明](guardrail/README.zh-CN.md)。


```
exploring（未定型想法 → 可选 .spec-dev/explorations/<topic>.md）
        ↓ 结晶
requirement-analysis（设计 → .spec-dev/YYYY-MM-DD-NN-<feature>/spec/<feature>-design.md）
        ↕ JIT
  visual-preview
        ↓
writing-plans（计划 → 同特性目录 plan/ 分文件形态：index.md + tasks/ + progress.yaml）
        ↓
executing-plans（隔离实施 → final → 审查 → 验收/对账 → 交付）
   ├── executing-plans-parallel (显式选择、独立写集合、模型声明、恢复)
   ├── using-git-worktrees（隔离工作区）
   ├── test-driven-development（TDD 纪律）
   └── acceptance-qa（矩阵化验收）

quick-fix（已决定、无设计空间的小修复）  ── 旁路快车道
   根因 + spec 反查 → 逐题校对 → TDD 修复 → 可选验收
        ↑ 命中范围 / 现行契约冲突 / 诊断证据不足信号时提议升级

roadmap 续接（大目标）  ── 分解登记 .spec-dev/roadmaps/<project>.md ── 外环
   requirement-analysis 分解登记子项目 → 每个子项目独立走完整管线 → executing-plans 交付后回写状态并提示续接下一个
```

三个入口按承诺状态与设计空间分工：**exploring**（还没决定要不要做）、**quick-fix**（已决定、无设计空间——小 bug 或小调整）、**requirement-analysis**（已决定、有设计空间——功能或变更）。quick-fix 复用 test-driven-development 与 acceptance-qa，一旦修复需要真正的设计就把控制权交还 requirement-analysis。

所有产物（spec、plan、验收报告、探索笔记、ADR、roadmap）统一收纳在项目根目录 `.spec-dev/` 下；旧计划恢复保留原载体与历史证据，位置迁移按该动作的既有授权单独处理；守卫继续识别旧 `docs/` 位置，安装器保留独立迁移工具和选项。

每个 skill 也可独立使用：想法未定型可从 exploring 开始；已有 spec 可直接从 writing-plans 进入；已有计划可直接 executing-plans；acceptance-qa / using-git-worktrees / test-driven-development 可被任意工作流触发；quick-fix 处理已决定、无设计空间的小修复，不走完整设计流程；clarifying 不承诺任何工作流，单独把一个想法逐题磨到共识。

## 安装

### Claude Code

```bash
# 添加为 marketplace
/plugin marketplace add https://github.com/FlameMida/spec-dev

# 安装插件
/plugin install spec-dev@spec-agent-skills
```

### Codex

```bash
# 添加为 marketplace
codex plugin marketplace add https://github.com/FlameMida/spec-dev

# 安装插件
codex plugin add spec-dev@spec-agent-skills
```

Codex 清单（`.codex-plugin/plugin.json`、`.agents/plugins/marketplace.json`）另外提供插件 UI 元数据。新版本发布后执行 `codex plugin marketplace upgrade spec-agent-skills` 升级。

### 平台矩阵

| 平台 | Skills | Agents（子代理） | Hooks | Manifest |
|---|---|---|---|---|
| Claude Code | ✅ marketplace `skills[]` | ✅ `agents/*.md` | ✅ guardrail 安装 | `.claude-plugin/` |
| Codex | ✅ 目录自动发现 | ⚠️ 靠派发词（`spawn_agent` 不读 `agents/*.md`） | ✅ codex-hooks | `.codex-plugin/` |
| Grok Build | ✅ 零配置兼容 Claude Code（官方声明） | ✅ 同 Claude Code（字段生效情况见验收走查） | ✅ 同 Claude Code | 复用 `.claude-plugin/` |
| Pi (pi.dev) | ✅ `package.json` 的 `pi.skills` | ⚠️ 需 `pi-subagents` 扩展 | ❌ 需 TS extension（未适配） | `package.json` |
| Agent plugins 1.0.0 | ✅ 根级 `plugin.json` + `skills/` | —（不在标准便携范围） | —（同左） | `plugin.json` |

插件级 `hooks/hooks.json` 在支持插件 hooks 的平台（Claude Code / Grok Build）上安装即自动注册 SessionStart 会话注入——注入不再依赖手动安装。`guardrail/install.mjs` 仍是获得 git 闸门（pre-commit / pre-push / CI）与 PreToolUse / Stop 漂移守卫的途径。

### 运行时依赖

| 分级 | 依赖 | 用途 | 缺失时 |
|---|---|---|---|
| hard | `git` | 漂移守卫、worktree、每任务提交、`sync_commit` 锚定 | 主流程不可用 |
| hard | Node.js ≥ 18 | `validate-output.mjs`、guardrail 脚本、`doctor.mjs`、`think.mjs`、visual-preview 服务器、`node --test` | 契约校验、守卫、doctor 与可视化预览不可用 |
| soft | `bun` / `tsx` | sequential-thinking 的 `think.ts` | 降级 `think.mjs`（Node），再降级回复内分点推演 |
| soft | `python3` | anysearch CLI（`anysearch_cli.py`） | 降级零依赖 Node 版 `anysearch_cli.js`，再降级 WebSearch / WebFetch |
| soft | Playwright / k6 / Lighthouse / 浏览器 MCP | acceptance-qa Tier A 与性能行 | Tier D 工具链，或该行标记 `unverified` |
| soft | `codex` CLI、`skill-creator` | 仅仓库开发期（pre-commit 校验） | 软跳过 |

契约校验器无法运行（缺 Node 或插件根无法定位）时，主线程按 schema 人工核对必填键与 `coverage_note`，并在报告注明"契约校验降级"——唯一定义点是 `skills/requirement-analysis/references/exploration-patterns.md`（「输出契约与校验」与「插件根解析」节）。

受控审查入口（macOS/Linux）额外需要 Python 3.9+、已认证的本机 Claude CLI 和 rtk；其他平台原生流程保留，但不声称具备相同的程序控制保证。用法见 `skills/executing-plans/references/review-orchestration.md`。

## 插件包维护

仓库根即插件根（扁平结构）：`skills/`、`agents/`、`commands/`、`scripts/`、`.claude-plugin/plugin.json`（Claude Code 清单）、`.codex-plugin/plugin.json`（Codex 清单）、根级 `plugin.json`（Agent Plugins 1.0.0）与 `package.json`（pi 分发清单）都在仓库根直接修改，`README.md`、`CHANGELOG.md` 只有一份，无需任何镜像同步。发版时需同步更新五处版本号（`.claude-plugin/marketplace.json` 的 `metadata.version`、`.claude-plugin/` 与 `.codex-plugin/` 两份 `plugin.json` 的 `version`、根级 `plugin.json`、`package.json`），`check-plugin.mjs` 会校验它们保持一致：

```bash
node scripts/check-plugin.mjs
```

使用官方 Codex CLI 做真实安装路径校验：

```bash
node scripts/check-plugin.mjs --codex-validate
```

`--codex-validate` 会创建临时 `CODEX_HOME`，执行 `codex plugin marketplace add <repo-root>` 和 `codex plugin add spec-dev@spec-agent-skills`，不会修改当前用户的 Codex 配置或插件缓存。

使用 `skill-creator` 的 `quick_validate.py` 校验插件包里的 skill：

```bash
node scripts/validate-skills.mjs
```

该脚本会优先查找 Codex 内置 `skill-creator`，也支持通过 `SKILL_CREATOR_QUICK_VALIDATE` 或 `SKILL_CREATOR_HOME` 指定校验脚本路径。若当前 Python 缺少 `PyYAML`，脚本会使用临时 venv 安装依赖后执行校验。

### evals 定位

`skills/*/evals/` 下有两类文件，定位不同：

- `evals.json` — **设计意图文档**：记录各 skill 关键行为的预期（HARD-GATE 拒绝、交接门、降级路径等），供人工 review 与未来评测 harness 使用。仓库内没有运行器，且多数用例带对话前置状态、断言为散文——它们**不构成自动化回归防线**，改动 skill 行为时应把它们当 checklist 人工过一遍
- `trigger-evals.json` — **可冷启动、可判定的触发面用例**（should-trigger / should-not-trigger 单发 prompt + near-miss 负例）：目前覆盖 `acceptance-qa`、`clarifying`、`exploring`、`quick-fix`、`requirement-analysis`、`test-strategy`, `executing-plans-parallel` 七个 skill，接入任意评测 harness 即可直接运行判定

### 提交前 hook

启用版本化 Git hook：

```bash
node scripts/install-git-hooks.mjs
```

该命令会设置本仓库 `core.hooksPath=.githooks`。启用后，每次提交前会自动执行：

```bash
node scripts/check-plugin.mjs --codex-validate
node scripts/validate-skills.mjs
node scripts/check-openai-sync.mjs
git diff --cached --check
```

校验失败时 hook 会中止提交，按报错修复后重新提交。临时跳过 hook 可设置 `SKIP_CODEX_PACKAGE_HOOK=1`；确认 SKILL 改动无需同步 openai.yaml 时可设置 `SKIP_OPENAI_SYNC_CHECK=1`。

### 成熟度分区与发布纪律

skill 的发现路径有四条，全部只指向 `skills/`：Claude Code 读 `.claude-plugin/marketplace.json` 的显式 `skills[]` 清单（`check-plugin.mjs` 与磁盘目录双向校验——磁盘有而清单无、清单有而磁盘无都会让 pre-commit 失败）；Codex 对 `skills/` 目录自动发现；Pi 读 `package.json` 的 `pi.skills`；Agent Plugins 1.0.0 读根级 `plugin.json` + `skills/`。

- **实验 skill** 放在仓库顶层 `skills-in-progress/<name>/`：不进任何插件清单、不承诺稳定，用户按路径手装。
- **毕业清单**：目录移入 `skills/` → 登记 `.claude-plugin/marketplace.json` 的 `skills[]` → 加 `agents/openai.yaml` → 加 `evals/evals.json`（触发边界复杂时另加 `trigger-evals.json`）→ README 三处提及（特性、Skill 管线、目录结构）→ CHANGELOG 条目。
- **纯壳委托约定**：编排类 skill 只写流程，纪律以「遵循 X skill、定义以 X 为准」引用、不复述。共享定义点：clarifying 核心纪律、`writing-plans/references/design-principles.md`、`requirement-analysis/references/exploration-patterns.md`（派发、失败隔离、插件根解析、契约校验）、`requirement-analysis/references/codex-compat.md`、writing-plans 资源台账（`progress.yaml` 的 `resources`）、`acceptance-qa/references/acceptance-matrix.md`、test-strategy 的 Lane 语义。

## exploring 使用方法

```bash
/exploring 我在考虑要不要做实时协作，帮我想想
```

思考伙伴姿态：读代码、比较方向、保持发散；获授权的受控 spike 可回答运行性问题，并保留实际观察和资源去向。笔记仍为可选。入口复用已有实现、历史否决及 `.spec-dev/glossary.md` 中的共享术语，不自动代用户裁决；共享术语随获批 spec 保存。

## requirement-analysis 使用方法

```bash
/requirement-analysis 设计用户权限系统
```

8 阶段设计工作流：需求理解与分诊 → 并行探索（独立内部与外部主题按实际容量尽早派发）→ 澄清问题（一次一个，JIT 可视化预览）→ 对抗验证 + 2-3 方案 → 展示完整设计 → 写 spec 并提交 → self-review + 对抗验证 → 交接 writing-plans。

阶段 1 判定执行档位并向用户声明（允许覆盖）：

- **light** — 单文件/单模块小改动：主线程直查，方案可收敛为 1 个，spec 几句话级——但设计仍须展示并获批准（HARD-GATE 不豁免）
- **standard** — 默认档：3-5 个 code-explorer 按层/模块并行 + external-resource-explorer 外部研究 + 完整方案对比
- **deep** — 跨层架构变更/新技术栈：multi-modal sweep 盲扫（主题按需求确定，在途数受平台容量限制）+ 契约 JSON 校验合并

spec 落盘至特性目录 `.spec-dev/YYYY-MM-DD-NN-<feature>/spec/<feature>-design.md` 并提交（后续计划落同目录 `plan/` 分文件形态：index.md + tasks/ + progress.yaml），经审查子代理对抗验证与用户 review 后交接 writing-plans。设计还核对实际参与者、约束归属和测试先例；行为需求以 **Requirement + Scenario**（GIVEN/WHEN/THEN）结构表达，测试与验收策略以**验收矩阵**表达——Scenario 被 writing-plans 映射到适用的行为红绿、纯重构保护或组验证、矩阵被收尾审查与 acceptance-qa 用作验收锚点；修改既有功能时用 ADDED/MODIFIED/REMOVED 差量三节。

## writing-plans / executing-plans 使用方法

```bash
/writing-plans 基于 .spec-dev/2026-07-04-auth/spec/auth-design.md 编写实施计划
/executing-plans 执行 .spec-dev/2026-07-04-auth/plan/index.md
```

- **writing-plans**：固定 T00、实施票、独立 final F 和最大号交付 D；需要验收时 A 依赖 F，D 消费审查与 A/对账。计划给精确范围、接口、片段、验证与资源归属，写完跑五查（spec 覆盖/占位符/类型一致/导航表与任务文件一致/依赖最小性）。
- **executing-plans**：复用执行授权与持久模式，先恢复 current；按已提交范围核验写入。实施结束先 final，再独立审查与验收/对账；修复后补验和复审。最终核验 merge/squash 映射、转存原件、按台账清理并锚定 sync_commit。

## visual-preview 使用方法

设计对话中出现"看比说清楚"的问题（布局对比、mockup、架构图）时由 requirement-analysis JIT 提议启用；也可手动触发：

```bash
/visual-preview 用浏览器给我看两种仪表盘布局的对比
```

本地服务器在浏览器中渲染 HTML fragment，用户点击选择回流到会话；会话文件持久化在 `<project>/.spec-dev/visual/`。

## acceptance-qa 使用方法

```bash
/acceptance-qa all 按 spec 全面验收导出功能
/acceptance-qa e2e 为购物车流程补充 E2E 测试
/acceptance-qa perf-api 压测订单接口，p95 300ms 内
/acceptance-qa visual 这次样式改动跑个视觉回归
/acceptance-qa diagnose 按钮点击后页面无响应
/acceptance-qa 验收一下购物车页面          # 无前缀时按意图推断路由维度
```

按「验收维度 × 执行性质」矩阵执行：

- **Tier D 确定性验收**：单元/集成/API、Playwright E2E（只运行本次生成/涉及的文件）、`toHaveScreenshot` 视觉回归、axe 可访问性扫描、性能阈值（前端 CWV lab 数据、后端 k6 thresholds）——真实命令、零 LLM 判断
- **Tier A AI 自主验收**：Playwright MCP 驱动、`browser_verify_*` 断言优先、每项结论强制证据引用、fail/warn 串行对抗复核 + pass 独立证据审计
- **Tier X 诊断**：性能 trace insight、堆快照对比、网络瀑布、根因假设验证

与管线集成：spec 的验收矩阵 → writing-plans 生成验收任务 → executing-plans 收尾触发本 skill → 报告与证据落盘特性目录 `acceptance/`。

## quick-fix 使用方法

对于已经决定要修、且没有设计空间的 bug 或小调整，调用 quick-fix，而不是走完整的 requirement-analysis 流程：

> 用 quick-fix 直接把这个小 bug 修好。

它沿同一证据支持的根因链修复，非显然根因确认前先取得真实失败信号，再沿获批公共落点修复。升级仍由用户裁决；偶发但复现条件可比较时，不仅因偶发而升级。契约同步、TDD 与既有授权规则保持。收尾按适用性比较偶发失败次数，核对临时插桩，回放原始症状，并说明根因证据与验证边界；独立旁支记录后续入口，acceptance-qa 保持可选。

## 无外部 MCP 服务依赖

插件不依赖外部 MCP 服务。受控审查入口通过运行时生成的本地 stdio MCP 配置提供受限工具，不注册全局 MCP。结构化深度思考由内嵌的 `sequential-thinking` skill 提供（无可用运行时时降级为回复中显式分点推演）。Tier A 浏览器自动化验收所需的 playwright / chrome-devtools MCP 改为按项目自配——见 `skills/acceptance-qa/references/mcp-setup.md`；未配置时 acceptance-qa 自动降级到 Tier D 工具链（原生 Playwright 测试、trace、控制台日志）。

检查插件健康状态（平台 / guardrail / 标记块 / 注入回放 / anysearch / 推理运行时六域）：`/doctor`

把一个需求分诊到正确通道：`/triage <需求>`

### 项目进度记录

运行 `node "<插件绝对目录>/scripts/status.mjs"` 查看同一仓库全部登记 worktree；从项目任意子目录调用，或加 `--repo "/项目路径"`。`--json` 输出同一快照的JSON，`--help` 查看用法。

输出roadmap、spec生命周期、计划完成/待验/阻塞记录及来源；不同worktree不自动择新，未重新验收或核验交付。退出码0表示读取完成（可有blocked/分歧），1表示部分读取或格式失败，2表示调用错误。支持现行v1模板YAML/JSON、v2 JSON和旧单文件复选框；模板外语法明确诊断，不自动迁移。只读、离线、一次性运行，不是doctor健康检查或执行恢复。

支持commands的宿主可使用status命令指引；Codex通过插件提示入口或上述CLI调用，不依赖commands自动加载。源码仍位于插件目录，无需安装到用户项目。

## 专门化 Agents

默认串行由主线程写码。显式选择 executing-plans-parallel 后，implementer 在独立 worktree 内按认领写码；主线程仍独占进度与合并，其他 agents 保持分析职责：

| Agent | 用途 | 使用场景 |
|-------|------|---------|
| **code-explorer** | 深度分析代码库 | requirement-analysis 阶段 2 并行探索 |
| **external-resource-explorer** | 外部资源探索，可引用证据 | requirement-analysis 阶段 2 外部波次与回补探索 |
| **code-reviewer** | 代码审查、Spec 符合性及可选架构深化 | 统一收尾编排；完整性 critic 独立核对覆盖证据 |
| **implementer** | 单票 TDD 与自检 | executing-plans-parallel 独立 worktree |

## 目录结构

```
spec-dev/                            # 仓库根即插件根（扁平结构）
├── .claude-plugin/
│   ├── marketplace.json             # Claude Code marketplace 配置（指向 ./）
│   └── plugin.json                  # Claude Code 插件清单
├── .codex-plugin/
│   └── plugin.json                  # Codex 插件清单
├── .agents/
│   └── plugins/
│       └── marketplace.json         # Codex marketplace 配置（指向 ./）
├── .githooks/
│   ├── pre-commit                   # 提交前校验插件包与 skills
│   ├── post-commit                  # 提交后自动发版（升版本 + CHANGELOG + tag）
│   └── pre-push                     # 发布兜底（校验 CHANGELOG 条目、补打版本 tag）
├── agents/                          # 4 个 agents，含 opt-in implementer
├── commands/                        # /doctor、/triage 命令
├── guardrail/                       # spec 漂移守护（可装入目标仓库）
├── skills/
│   ├── ddd-lifecycle/               # DDD 全流程开发规范
│   ├── exploring/                   # 探索模式（思考伙伴）
│   ├── clarifying/                  # 共享澄清纪律（grill 式）
│   ├── requirement-analysis/        # 8 阶段需求设计工作流
│   ├── visual-preview/              # 浏览器可视化预览
│   ├── writing-plans/               # 实施计划编写
│   ├── executing-plans/             # 计划执行 + 收尾审查
│   ├── executing-plans-parallel/    # 显式选择的并发执行与恢复
│   ├── using-git-worktrees/         # 隔离工作区纪律
│   ├── test-driven-development/     # TDD 纪律
│   ├── test-strategy/               # 测试策略纪律（Lane / 治理 / 验收矩阵对接）
│   ├── acceptance-qa/               # 全能验收工作流
│   ├── quick-fix/                   # 轻量 bug 修复工作流
│   ├── anysearch/                   # vendored 实时搜索 CLI（上游快照）
│   └── sequential-thinking/         # vendored 结构化推理（上游快照 + Node 移植版）
├── scripts/
│   ├── check-plugin.mjs             # 清单版本一致性 + 符号链接 + Codex CLI 安装校验
│   ├── validate-output.mjs          # 子代理输出契约校验器 + plan-index 结构校验
│   ├── schemas/                     # 4 类输出契约 schema + 1 个 vendored manifest schema + 使用说明
│   ├── validate-skills.mjs          # 复用 skill-creator 校验 skills
│   ├── check-openai-sync.mjs        # openai.yaml 结构与 SKILL 同步 tripwire
│   ├── doctor.mjs                   # /doctor 健康检查（平台 / 守卫 / 标记 / 注入 / anysearch / 推理运行时）
│   ├── update-vendored-skill.mjs    # 从上游同步 vendored skill（tag / SHA 锁定）
│   ├── release.mjs                  # 发布脚本（手动发布 / post-commit 自动发版）
│   └── install-git-hooks.mjs        # 启用版本化 Git hooks
├── CHANGELOG.md
├── README.md
└── README.zh-CN.md
```

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的版本更新历史。

## 许可证

MIT License

## 作者

FlameMida

## 贡献

欢迎提交 Issue 和 Pull Request！

## 指令加载与统一文档规范

技能入口保留用途、触发及持续生效的边界；详细流程、声明、模板、恢复和审查按动作条件取得完整专题。
现有 exploration-patterns.md 为有效导航；插件根、派发与恢复、输出契约分别保留一个完整权威。
writing-plans 的字段和资源台账位于 references/plan-format.md，专项声明与任务/交付模板按需读取；生成计划包含关键片段、命令和接口，单任务文件不超过 200 行。
DDD 独立使用及被主流程调用均采用 .spec-dev/glossary.md、对应 spec 局部术语节和 .spec-dev/adr/。
完整设计或保存范围获批后写入，同范围授权复用；已有旧位置文档不自动迁移。
本轮未改变 AnySearch、sequential-thinking 及其上游更新逻辑，也没有取消其当前调用规则。
结构测试、文档契约和模型行为评测分别报告；仅文件变短或静态校验通过不证明模型效果。
