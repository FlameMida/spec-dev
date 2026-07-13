# spec-dev

[English](README.md) | 简体中文

中文设计→计划→执行 skill 管线插件：把想法打磨成 spec，拆解成可执行计划，在隔离工作区中以 TDD 纪律交付。

**中文** | 设计→计划→执行管线 | 对抗验证 | 可视化预览 | 全能验收 | MCP 增强

## 特性

- **探索模式** — `exploring` 思考伙伴：想法未定型时的无承诺探索——只读不写码（HARD-GATE）、开支线而非审讯、ASCII 可视化、探索笔记提议制落盘 `.spec-dev/explorations/`；结晶后交接 requirement-analysis，executing-plans 卡壳时也可回探
- **需求设计** — `requirement-analysis` 8 阶段设计工作流：需求分诊（light / standard / deep 三档）、内外部并行探索（不设子代理上限）、逐题澄清、sequential-thinking 对抗验证 + 2-3 方案对比、spec 落盘与双重 review（行为规范结构化：Requirement + Scenario）；HARD-GATE 保证设计获批前零实施动作
- **可视化预览** — `visual-preview` 浏览器伴侣：设计对话中 JIT 提议，展示 mockup、线框、布局对比并回收点击选择
- **实施计划** — `writing-plans` 把 spec 拆成零上下文可执行的 bite-sized 任务：精确文件路径、完整代码、TDD 五步内嵌、接口消费/产出契约、禁止占位符
- **计划执行** — `executing-plans` 主线程逐任务执行（每任务 commit + spec 自检）、收尾多维对抗审查（fan-out code-reviewer + 契约校验 + loop-until-dry + completeness critic）、合并与总结
- **工程纪律** — `using-git-worktrees`（原生工具优先的隔离工作区）与 `test-driven-development`（没有失败测试就没有生产代码）独立成 skill，可被任何工作流复用
- **全能验收** — `acceptance-qa` 按「验收维度 × 执行性质」矩阵验收：单元/集成/API、Playwright E2E、视觉回归、可访问性、性能（前端 CWV / 后端 k6 / 客户端）、AI 自主验收（证据强制 + 串行复核 + verify 断言优先）与失败诊断
- **轻量修复** — `quick-fix`，已决定、无设计空间的小修复（小 bug、小调整）的快路径：定位根因（含 spec 反查）、逐题校对、TDD 修复、可选验收；按契约影响分流以规避 spec 漂移，涉及跨 spec 契约/跨模块/新依赖时升级 requirement-analysis
- **契约化编排** — 子代理输出走 JSON Schema 契约，`validate-output.mjs` 确定性校验，失败退回补全
- **MCP 工具增强** — 集成 context7、sequential-thinking、playwright、chrome-devtools（可选，智能降级）
- **3 个专门化 Agents** — code-explorer、external-resource-explorer、code-reviewer（分析与复跑验证，不写实现代码；实现始终由主线程编写）

## Skill 管线

```
exploring（未定型想法 → 可选 .spec-dev/explorations/<topic>.md）
        ↓ 结晶
requirement-analysis（设计 → .spec-dev/YYYY-MM-DD-<feature>/spec/<feature>-design.md）
        ↕ JIT
  visual-preview
        ↓
writing-plans（计划 → 同特性目录 plan/<feature>-plan.md）
        ↓
executing-plans（隔离执行 + 审查 + 总结）
   ├── using-git-worktrees（隔离工作区）
   ├── test-driven-development（TDD 纪律）
   └── acceptance-qa（矩阵化验收）

quick-fix（已决定、无设计空间的小修复）  ── 旁路快车道
   根因 + spec 反查 → 逐题校对 → TDD 修复 → 可选验收
        ↑ 命中跨 spec 契约 / 跨模块 / 新依赖信号时升级回 requirement-analysis
```

三个入口按承诺状态与设计空间分工：**exploring**（还没决定要不要做）、**quick-fix**（已决定、无设计空间——小 bug 或小调整）、**requirement-analysis**（已决定、有设计空间——功能或变更）。quick-fix 复用 test-driven-development 与 acceptance-qa，一旦修复需要真正的设计就把控制权交还 requirement-analysis。

所有产物（spec、plan、验收报告、探索笔记、ADR）统一收纳在项目根目录 `.spec-dev/` 下；历史项目 `docs/` 位置的产物默认自动迁移过去（守卫安装器自带 `migrate-to-spec-dev.mjs`，会话自检发现历史布局也会当场迁移），迁移前守卫仍识别旧位置兜底。

每个 skill 也可独立使用：想法未定型可从 exploring 开始；已有 spec 可直接从 writing-plans 进入；已有计划可直接 executing-plans；acceptance-qa / using-git-worktrees / test-driven-development 可被任意工作流触发；quick-fix 处理已决定、无设计空间的小修复，不走完整设计流程。

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

Codex 清单（`.codex-plugin/plugin.json`、`.agents/plugins/marketplace.json`）另外提供可选 MCP 配置（context7、sequential-thinking、playwright、chrome-devtools）与插件 UI 元数据。新版本发布后执行 `codex plugin marketplace upgrade spec-agent-skills` 升级。

## 插件包维护

仓库根即插件根（扁平结构）：`skills/`、`agents/`、`commands/`、`scripts/`、`.claude-plugin/plugin.json`（Claude Code 清单）、`.codex-plugin/plugin.json`（Codex 清单）都在仓库根直接修改，`README.md`、`CHANGELOG.md`、`.mcp.json` 只有一份，无需任何镜像同步。发版时需同步更新三处版本号（`.claude-plugin/marketplace.json` 的 `metadata.version` 与两份 `plugin.json` 的 `version`），`check-plugin.mjs` 会校验它们保持一致：

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
- `trigger-evals.json` — **可冷启动、可判定的触发面用例**（should-trigger / should-not-trigger 单发 prompt + near-miss 负例）：目前覆盖触发边界最复杂的 acceptance-qa、requirement-analysis、exploring 三个 skill，接入任意评测 harness 即可直接运行判定

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

## exploring 使用方法

```bash
/exploring 我在考虑要不要做实时协作，帮我想想
```

思考伙伴姿态：只读代码、开支线对比方向、ASCII 图梳理，不写码、不建档、不强制结论（探索出"不值得做"也是有效出口）；结论有价值时提议落盘 `.spec-dev/explorations/<topic>.md`，想法结晶后交接 requirement-analysis（探索结论作为其阶段 1 输入）。

## requirement-analysis 使用方法

```bash
/requirement-analysis 设计用户权限系统
```

8 阶段设计工作流：需求理解与分诊 → 并行探索（内部+外部同波次）→ 澄清问题（一次一个，JIT 可视化预览）→ 对抗验证 + 2-3 方案 → 展示完整设计 → 写 spec 并提交 → self-review + 对抗验证 → 交接 writing-plans。

阶段 1 判定执行档位并向用户声明（允许覆盖）：

- **light** — 单文件/单模块小改动：主线程直查，方案可收敛为 1 个，spec 几句话级——但设计仍须展示并获批准（HARD-GATE 不豁免）
- **standard** — 默认档：3-5 个 code-explorer 按层/模块并行 + external-resource-explorer 外部研究 + 完整方案对比
- **deep** — 跨层架构变更/新技术栈：multi-modal sweep 盲扫（模态数不设上限）+ 契约 JSON 校验合并

spec 落盘至特性目录 `.spec-dev/YYYY-MM-DD-<feature>/spec/<feature>-design.md` 并提交（后续计划落同目录 `plan/<feature>-plan.md`），经审查子代理对抗验证与用户 review 后交接 writing-plans。行为需求以 **Requirement + Scenario**（GIVEN/WHEN/THEN）结构表达，测试与验收策略以**验收矩阵**表达——Scenario 被 writing-plans 直译为 TDD 失败测试、矩阵被收尾审查与 acceptance-qa 用作验收锚点；修改既有功能时用 ADDED/MODIFIED/REMOVED 差量三节。

## writing-plans / executing-plans 使用方法

```bash
/writing-plans 基于 .spec-dev/2026-07-04-auth/spec/auth-design.md 编写实施计划
/executing-plans 执行 .spec-dev/2026-07-04-auth/plan/auth-plan.md
```

- **writing-plans**：假设执行者零上下文——每份计划固定以任务 0（建立隔离工作区，含已隔离检测与 git 降级命令）开头、以最终任务（合并与清理）收尾，spec 验收矩阵含「验收任务」行时在两者之间固定生成验收任务，worktree 生命周期在计划内闭合、脱离插件也能按序执行；头部随行偏差处理指引；每任务给精确文件路径、完整代码、TDD 五步（失败测试→确认失败→最小实现→确认通过→提交）、接口消费/产出块；写完跑三查（spec 覆盖/占位符/类型一致）再交接
- **executing-plans**：执行确认后从任务 0（隔离工作区，纪律遵循 using-git-worktrees）开始，主线程逐任务连续执行（每任务 commit `feat(TN): xxx` + spec 自检），全部完成后 fan-out code-reviewer 多维对抗审查（review-findings 契约校验 + 高/中发现对抗复核 + completeness critic），按验收矩阵触发 acceptance-qa 验收，审查处置征询用户后执行最终任务（合并与清理）并总结

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

它会定位根因（含与漂移守卫 `covers` 对齐的 spec 反查），逐题确认根因/修复方案/契约影响，在 TDD 下修复，并按契约影响分流——行为改变则同步对应 spec，不变则以 `Spec-Guard: off` trailer 提交——最后可选触发 acceptance-qa。若根因涉及跨 spec 的行为契约、跨多个模块或需要新依赖，quick-fix 会停下并提议升级到 requirement-analysis。

## MCP 工具增强（推荐但可选）

所有功能在没有 MCP 的情况下也能正常工作，插件使用智能降级策略自动切换备用方案。

| MCP 工具 | 主要功能 | 降级方案 |
|---------|---------|---------|
| **context7** | 最新库文档和 API 参考 | WebSearch + 项目依赖分析 |
| **sequential-thinking** | 结构化深度思考 | 回复中显式分点推演 |
| **playwright** | 浏览器自动化验收（含 verify 断言与 trace/video 取证） | 原生 Playwright 测试 |
| **chrome-devtools** | 性能追踪（CWV/insight）、堆快照、调试诊断 | Playwright trace / 控制台日志 |

### 推荐配置

编辑 `~/.claude.json`：

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": { "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}" }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

获取 API Key：[Context7](https://context7.com/)

检查 MCP 配置状态：`/check-mcp`

## 专门化 Agents

主线程干活、子代理不写码——实现代码始终由主线程编写，agent 只承担探索、审查与复跑验证等分析性任务：

| Agent | 用途 | 使用场景 |
|-------|------|---------|
| **code-explorer** | 深度分析代码库 | requirement-analysis 阶段 2 并行探索 |
| **external-resource-explorer** | 外部资源探索，可引用证据 | requirement-analysis 阶段 2 外部波次与回补探索 |
| **code-reviewer** | 代码审查（置信度 + 严重性） | executing-plans 收尾多维审查 |

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
├── .mcp.json                        # MCP 配置（开发与插件分发共用一份）
├── agents/                          # 3 个专门化 agents（分析与复跑验证，不写实现代码）
├── commands/                        # /check-mcp 命令
├── guardrail/                       # spec 漂移守护（可装入目标仓库）
├── skills/
│   ├── exploring/                   # 探索模式（思考伙伴）
│   ├── requirement-analysis/        # 8 阶段需求设计工作流
│   ├── visual-preview/              # 浏览器可视化预览
│   ├── writing-plans/               # 实施计划编写
│   ├── executing-plans/             # 计划执行 + 收尾审查
│   ├── using-git-worktrees/         # 隔离工作区纪律
│   ├── test-driven-development/     # TDD 纪律
│   ├── acceptance-qa/               # 全能验收工作流
│   └── quick-fix/                   # 轻量 bug 修复工作流
├── scripts/
│   ├── check-plugin.mjs             # 清单版本一致性 + 符号链接 + Codex CLI 安装校验
│   ├── validate-output.mjs          # 子代理输出契约校验器
│   ├── schemas/                     # 3 类输出契约 schema + 使用说明
│   ├── validate-skills.mjs          # 复用 skill-creator 校验 skills
│   ├── check-openai-sync.mjs        # openai.yaml 结构与 SKILL 同步 tripwire
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
