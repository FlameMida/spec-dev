# spec-dev

中文设计→计划→执行 skill 管线插件：把想法打磨成 spec，拆解成可执行计划，在隔离工作区中以 TDD 纪律交付。

**中文** | 设计→计划→执行管线 | 对抗验证 | 可视化预览 | 浏览器验收 | MCP 增强

## 特性

- **探索模式** — `exploring` 思考伙伴：想法未定型时的无承诺探索——只读不写码（HARD-GATE）、开支线而非审讯、ASCII 可视化、探索笔记提议制落盘 `docs/explorations/`；结晶后交接 requirement-analysis，executing-plans 卡壳时也可回探
- **需求设计** — `requirement-analysis` 8 阶段设计工作流：需求分诊（light / standard / deep 三档）、内外部并行探索（不设子代理上限）、逐题澄清、sequential-thinking 对抗验证 + 2-3 方案对比、spec 落盘与双重 review（行为规范结构化：Requirement + Scenario）；HARD-GATE 保证设计获批前零实施动作
- **可视化预览** — `visual-preview` 浏览器伴侣：设计对话中 JIT 提议，展示 mockup、线框、布局对比并回收点击选择
- **实施计划** — `writing-plans` 把 spec 拆成零上下文可执行的 bite-sized 任务：精确文件路径、完整代码、TDD 五步内嵌、接口消费/产出契约、禁止占位符
- **计划执行** — `executing-plans` 主线程逐任务执行（每任务 commit + spec 自检）、收尾多维对抗审查（fan-out code-reviewer + 契约校验 + loop-until-dry + completeness critic）、合并与总结
- **工程纪律** — `using-git-worktrees`（原生工具优先的隔离工作区）与 `test-driven-development`（没有失败测试就没有生产代码）独立成 skill，可被任何工作流复用
- **浏览器三层测试** — `browser-qa` 覆盖 Playwright E2E、AI 自主验收（证据强制 + 串行复核）和调试诊断
- **契约化编排** — 子代理输出走 JSON Schema 契约，`validate-output.mjs` 确定性校验，失败退回补全
- **MCP 工具增强** — 集成 context7、exa、sequential-thinking、playwright、chrome-devtools（可选，智能降级）
- **3 个专门化 Agents** — code-explorer、external-resource-explorer、code-reviewer（只读分析；实现代码始终由主线程编写）

## Skill 管线

```
exploring（未定型想法 → 可选 docs/explorations/<topic>.md）
        ↓ 结晶
requirement-analysis（设计 → docs/YYYY-MM-DD-<feature>/spec/<feature>-design.md）
        ↕ JIT
  visual-preview
        ↓
writing-plans（计划 → 同特性目录 plan/<feature>-plan.md）
        ↓
executing-plans（隔离执行 + 审查 + 总结）
   ├── using-git-worktrees（隔离工作区）
   ├── test-driven-development（TDD 纪律）
   └── browser-qa（UI 验收）
```

每个 skill 也可独立使用：想法未定型可从 exploring 开始；已有 spec 可直接从 writing-plans 进入；已有计划可直接 executing-plans；browser-qa / using-git-worktrees / test-driven-development 可被任意工作流触发。

## 安装

### Claude Code

```bash
# 添加为 marketplace
/plugin marketplace add https://github.com/FlameMida/spec-dev

# 安装插件
/plugin install spec-dev@SPEC-plugins
```

### Codex

仓库已包含 Codex 插件清单：`plugins/spec-dev/.codex-plugin/plugin.json`。该清单会暴露：

- `skills/`：`requirement-analysis`、`visual-preview`、`writing-plans`、`executing-plans`、`using-git-worktrees`、`test-driven-development`、`browser-qa`
- `.mcp.json`：context7、exa、sequential-thinking、playwright、chrome-devtools 的可选 MCP 配置
- 插件 UI 元数据：展示名称、分类、能力、默认提示词

仓库也包含 Codex marketplace 清单：`.agents/plugins/marketplace.json`。可以直接添加本仓库作为 marketplace：

```bash
codex plugin marketplace add https://github.com/FlameMida/spec-dev
```

Codex marketplace 使用 `plugins/spec-dev/` 作为插件入口。该目录是插件的唯一源码目录，Claude Code marketplace 也指向同一目录；不直接使用仓库根，是因为 `source.path` 为 `./` 时会被 Codex 规范化为空路径而在 `/plugin` 中被过滤。

如果本地已经添加过旧版本 marketplace，请在新版本发布后执行 `codex plugin marketplace upgrade spec-agent-skills`；本地开发验证可先移除旧源，再添加当前仓库路径。

```json
{
  "name": "spec-dev",
  "source": {
    "source": "local",
    "path": "./plugins/spec-dev"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Developer Tools"
}
```

## 插件包维护

`plugins/spec-dev/` 是插件的唯一源码目录：`skills/`、`agents/`、`commands/`、`scripts/`、`.codex-plugin/plugin.json` 都直接在其中修改，Claude Code 与 Codex 两个 marketplace 清单指向同一目录，无需任何同步步骤。

例外是 `README.md`、`CHANGELOG.md`、`.mcp.json` 三个文件：它们在仓库根（仓库主页 / 本仓库开发时的项目级 MCP 配置）和插件包内（插件介绍 / 插件分发 MCP 配置）各一份，内容必须逐字节一致。**以仓库根为编辑面**，改完后一键对齐：

```bash
node scripts/check-mirrors.mjs --fix
```

只校验不写入：

```bash
node scripts/check-mirrors.mjs
```

使用官方 Codex CLI 做真实安装路径校验：

```bash
node scripts/check-mirrors.mjs --codex-validate
```

`--codex-validate` 会创建临时 `CODEX_HOME`，执行 `codex plugin marketplace add <repo-root>` 和 `codex plugin add spec-dev@spec-agent-skills`，不会修改当前用户的 Codex 配置或插件缓存。

使用 `skill-creator` 的 `quick_validate.py` 校验插件包里的 skill：

```bash
node scripts/validate-skills.mjs
```

该脚本会优先查找 Codex 内置 `skill-creator`，也支持通过 `SKILL_CREATOR_QUICK_VALIDATE` 或 `SKILL_CREATOR_HOME` 指定校验脚本路径。若当前 Python 缺少 `PyYAML`，脚本会使用临时 venv 安装依赖后执行校验。

### 提交前 hook

启用版本化 Git hook：

```bash
node scripts/install-git-hooks.mjs
```

该命令会设置本仓库 `core.hooksPath=.githooks`。启用后，每次提交前会自动执行：

```bash
node scripts/check-mirrors.mjs --codex-validate
node scripts/validate-skills.mjs
git diff --cached --check
```

受控双份文件不一致时 hook 会中止提交，运行 `node scripts/check-mirrors.mjs --fix` 对齐后重新提交。临时跳过 hook 可设置 `SKIP_CODEX_PACKAGE_HOOK=1`。

## exploring 使用方法

```bash
/exploring 我在考虑要不要做实时协作，帮我想想
```

思考伙伴姿态：只读代码、开支线对比方向、ASCII 图梳理，不写码、不建档、不强制结论（探索出"不值得做"也是有效出口）；结论有价值时提议落盘 `docs/explorations/<topic>.md`，想法结晶后交接 requirement-analysis（探索结论作为其阶段 1 输入）。

## requirement-analysis 使用方法

```bash
/requirement-analysis 设计用户权限系统
```

8 阶段设计工作流：需求理解与分诊 → 并行探索（内部+外部同波次）→ 澄清问题（一次一个，JIT 可视化预览）→ 对抗验证 + 2-3 方案 → 展示完整设计 → 写 spec 并提交 → self-review + 对抗验证 → 交接 writing-plans。

阶段 1 判定执行档位并向用户声明（允许覆盖）：

- **light** — 单文件/单模块小改动：主线程直查，方案可收敛为 1 个，spec 几句话级——但设计仍须展示并获批准（HARD-GATE 不豁免）
- **standard** — 默认档：3-5 个 code-explorer 按层/模块并行 + external-resource-explorer 外部研究 + 完整方案对比
- **deep** — 跨层架构变更/新技术栈：multi-modal sweep 盲扫（模态数不设上限）+ 契约 JSON 校验合并

spec 落盘至特性目录 `docs/YYYY-MM-DD-<feature>/spec/<feature>-design.md` 并提交（后续计划落同目录 `plan/<feature>-plan.md`），经审查子代理对抗验证与用户 review 后交接 writing-plans。行为需求以 **Requirement + Scenario**（GIVEN/WHEN/THEN）结构表达——Scenario 被 writing-plans 直译为 TDD 失败测试、被收尾审查与 browser-qa 用作验收锚点；修改既有功能时用 ADDED/MODIFIED/REMOVED 差量三节。

## writing-plans / executing-plans 使用方法

```bash
/writing-plans 基于 docs/2026-07-04-auth/spec/auth-design.md 编写实施计划
/executing-plans 执行 docs/2026-07-04-auth/plan/auth-plan.md
```

- **writing-plans**：假设执行者零上下文——每份计划固定以任务 0（建立隔离工作区，含已隔离检测与 git 降级命令）开头，脱离插件也能按序执行；每任务给精确文件路径、完整代码、TDD 五步（失败测试→确认失败→最小实现→确认通过→提交）、接口消费/产出块；写完跑三查（spec 覆盖/占位符/类型一致）再交接
- **executing-plans**：执行确认后从任务 0（隔离工作区，纪律遵循 using-git-worktrees）开始，主线程逐任务连续执行（每任务 commit `feat(TN): xxx` + spec 自检），全部完成后 fan-out code-reviewer 多维对抗审查（review-findings 契约校验 + 高/中发现对抗复核 + completeness critic），UI 变更触发 browser-qa 验收，审查处置征询用户后合并总结

## visual-preview 使用方法

设计对话中出现"看比说清楚"的问题（布局对比、mockup、架构图）时由 requirement-analysis JIT 提议启用；也可手动触发：

```bash
/visual-preview 用浏览器给我看两种仪表盘布局的对比
```

本地服务器在浏览器中渲染 HTML fragment，用户点击选择回流到会话；会话文件持久化在 `<project>/.spec-dev/visual/`。

## browser-qa 使用方法

```bash
/browser-qa all 验收登录页面
/browser-qa layer1 为购物车流程补充 E2E 测试
/browser-qa layer3 诊断按钮点击后页面无响应
/browser-qa 验收一下购物车页面          # 无前缀时按意图推断路由层级
```

三层测试工作流：

- Layer 1：Playwright 原生确定性 E2E 测试（只运行本次生成的测试文件）
- Layer 2：Playwright MCP AI 自主验收——动态验收清单、每项结论强制证据引用、fail/warn 项串行对抗复核
- Layer 3：Chrome DevTools MCP 调试诊断，可配合 Browser Harness 处理 Shadow DOM / iframe

## MCP 工具增强（推荐但可选）

所有功能在没有 MCP 的情况下也能正常工作，插件使用智能降级策略自动切换备用方案。

| MCP 工具 | 主要功能 | 降级方案 |
|---------|---------|---------|
| **context7** | 最新库文档和 API 参考 | WebSearch + 项目依赖分析 |
| **exa** | 高质量网页搜索 | WebSearch |
| **sequential-thinking** | 结构化深度思考 | 回复中显式分点推演 |
| **playwright** | 浏览器自动化验收 | 原生 Playwright 测试 |
| **chrome-devtools** | 页面调试诊断 | Playwright trace / 控制台日志 |

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
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": { "EXA_API_KEY": "${EXA_API_KEY}" }
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

获取 API Key：[Context7](https://context7.com/) | [Exa](https://exa.ai/)

检查 MCP 配置状态：`/check-mcp`

## 专门化 Agents

主线程干活、子代理只读分析——实现代码始终由主线程编写，agent 只承担探索与审查：

| Agent | 用途 | 使用场景 |
|-------|------|---------|
| **code-explorer** | 深度分析代码库 | requirement-analysis 阶段 2 并行探索 |
| **external-resource-explorer** | 外部资源探索，可引用证据 | requirement-analysis 阶段 2 外部波次与回补探索 |
| **code-reviewer** | 代码审查（置信度 + 严重性） | executing-plans 收尾多维审查 |

## 目录结构

```
spec-dev/
├── .claude-plugin/
│   └── marketplace.json         # Claude Code marketplace 配置（指向 plugins/spec-dev）
├── .agents/
│   └── plugins/
│       └── marketplace.json      # Codex marketplace 配置（指向 plugins/spec-dev）
├── .githooks/
│   └── pre-commit               # 提交前校验受控双份与插件包
├── .mcp.json                    # 本仓库开发用 MCP 配置（与插件包内受控双份）
├── plugins/
│   └── spec-dev/                # 插件唯一源码目录（两平台共用）
│       ├── .codex-plugin/
│       │   └── plugin.json      # Codex 插件清单
│       ├── .mcp.json            # 插件分发 MCP 配置
│       ├── agents/              # 3 个专门化 agents（只读分析）
│       ├── commands/            # /check-mcp 命令
│       ├── scripts/
│       │   ├── validate-output.mjs   # 子代理输出契约校验器
│       │   └── schemas/         # 3 类输出契约 schema + 使用说明
│       └── skills/
│           ├── exploring/              # 探索模式（思考伙伴）
│           ├── requirement-analysis/   # 8 阶段需求设计工作流
│           ├── visual-preview/       # 浏览器可视化预览
│           ├── writing-plans/          # 实施计划编写
│           ├── executing-plans/        # 计划执行 + 收尾审查
│           ├── using-git-worktrees/    # 隔离工作区纪律
│           ├── test-driven-development/ # TDD 纪律
│           └── browser-qa/             # 浏览器三层测试工作流
├── scripts/
│   ├── check-mirrors.mjs        # 校验受控双份文件 + Codex CLI 安装校验
│   ├── validate-skills.mjs      # 复用 skill-creator 校验插件包 skill
│   └── install-git-hooks.mjs    # 启用版本化 Git hooks
├── CHANGELOG.md
└── README.md
```

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的版本更新历史。

## 许可证

MIT License

## 作者

FlameMida

## 贡献

欢迎提交 Issue 和 Pull Request！
