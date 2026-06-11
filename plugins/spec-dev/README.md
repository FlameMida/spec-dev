# spec-dev

跨会话、可恢复、可验收、可归档的 spec 生命周期工作流插件。

**中文** | Action-First 生命周期 | 跨会话持久化 | 独立验收 | 浏览器验收 | MCP 增强

## 特性

- **Spec Flow** — 5 action 生命周期（explore → plan → implement → accept → archive），workspace-local runtime 原子写入
- **独立验收** — 专用 `spec-acceptance-reviewer` agent，findings-first 报告，实现者不自评；skeptic + coverage critic 双向对抗复核
- **跨会话恢复** — 会话中断后通过 `progress.json` 和 `resumePoint` 精确恢复；编排子任务 journal 化，已完成的 fan-out 不重派
- **证据链** — implement 阶段 `--evidence` 累积证据，accept 阶段直接消费；`doctor` 命令检测并修复状态不一致
- **需求分析** — 9 阶段系统化分析工作流，light / standard / deep 三档复杂度路由，按需派发探索与审查
- **浏览器三层测试** — `browser-qa` 覆盖 Playwright E2E、AI 自主验收（证据强制 + 串行复核）和调试诊断
- **契约化编排** — 子代理输出走 JSON Schema 契约，`validate-output.mjs` 确定性校验，失败退回补全
- **5 领域覆盖** — 软件、研究、运维/流程、文档、跨团队协作
- **MCP 工具增强** — 集成 context7、exa、sequential-thinking、playwright、chrome-devtools（可选，智能降级）
- **5 个专门化 Agents** — spec-acceptance-reviewer、external-resource-explorer、code-explorer、code-architect、code-reviewer

## 安装

### Claude Code

```bash
# 添加为 marketplace
/plugin marketplace add https://github.com/FlameMida/spec-dev

# 安装插件
/plugin install spec-dev@SPEC-plugins
```

### Codex

仓库已包含 Codex 插件清单：`.codex-plugin/plugin.json`。该清单会暴露：

- `skills/`：`spec-flow`、`requirement-analysis` 与 `browser-qa`
- `.mcp.json`：context7、exa、sequential-thinking、playwright、chrome-devtools 的可选 MCP 配置
- 插件 UI 元数据：展示名称、分类、能力、默认提示词

仓库也包含 Codex marketplace 清单：`.agents/plugins/marketplace.json`。可以直接添加本仓库作为 marketplace：

```bash
codex plugin marketplace add https://github.com/FlameMida/spec-dev
```

Codex marketplace 使用 `plugins/spec-dev/` 作为插件入口。该目录由根目录源码生成，避免 `source.path` 使用 `./` 时被 Codex 规范化为空路径而在 `/plugin` 中被过滤。

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

## Codex 分发包维护

根目录是唯一源码，`plugins/spec-dev/` 是 Codex marketplace 的生成产物。修改 `skills/`、`agents/`、`commands/`、`.codex-plugin/plugin.json`、`.mcp.json`、`README.md` 或 `CHANGELOG.md` 后，先同步生成 Codex 分发包：

```bash
node scripts/sync-codex-package.mjs
```

检查分发包是否和根目录源码一致：

```bash
node scripts/sync-codex-package.mjs --check
```

使用官方 Codex CLI 做真实安装路径校验：

```bash
node scripts/sync-codex-package.mjs --check --codex-validate
```

`--codex-validate` 会创建临时 `CODEX_HOME`，执行 `codex plugin marketplace add <repo-root>` 和 `codex plugin add spec-dev@spec-agent-skills`，不会修改当前用户的 Codex 配置或插件缓存。

使用 `skill-creator` 的 `quick_validate.py` 校验根目录和 Codex 分发包里的 skill：

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
node scripts/sync-codex-package.mjs
node scripts/sync-codex-package.mjs --check --codex-validate
node scripts/validate-skills.mjs
git diff --cached --check
```

如果同步生成了新的 `plugins/spec-dev/` 差异，hook 会中止提交，等你暂存生成文件后再提交。临时跳过 hook 可设置 `SKIP_CODEX_PACKAGE_HOOK=1`。

## Skill 对比

| 特性 | **spec-flow** | **requirement-analysis** | **browser-qa** |
|------|---------------|--------------------------|----------------|
| **核心模型** | 5 action 生命周期 | 9 阶段分析流程 | 3 层浏览器测试 |
| **跨会话持久化** | `.specs/` + runtime CLI | 无（会话内） | 无（测试报告输出） |
| **独立验收** | 专用 agent + 报告 | 内嵌审查 | Playwright / MCP 验收 |
| **归档** | 完整归档 + 总结 | 无 | 无 |
| **适用场景** | 长期任务、需验收归档 | 快速分析、方案评估 | 前端功能验收、E2E、调试诊断 |

### 如何选择

**选择 spec-flow 当你需要**：
- 跨多个会话完成一个复杂任务
- 正式验收和归档交付物
- 需要变更留痕和版本追踪
- 运维流程改造、文档编写、研究任务

**选择 requirement-analysis 当你需要**：
- 快速分析技术方案可行性
- 评估实施复杂度后决定是否推进
- 一次性深度分析，无需持久化

> 两者可衔接：requirement-analysis 在计划确认后（阶段 6），若发现实施将跨多个会话、或需要正式验收/留痕/归档，会建议升级到 spec-flow——阶段 1-6 的分析成果直接映射为 spec.md/plan.md 初稿，不重做分析。

**选择 browser-qa 当你需要**：
- 为前端功能补充确定性 E2E 测试
- 使用浏览器 MCP 做 AI 自主验收
- 诊断页面交互、渲染、Shadow DOM 或 iframe 问题

## spec-flow 使用方法

### 快速开始

```bash
# 初始化工作区
/spec-flow init

# 开始探索
/spec-flow explore 实现用户认证系统，支持 JWT 和 OAuth2

# 规划方案
/spec-flow plan

# 实施
/spec-flow implement

# 独立验收
/spec-flow accept

# 归档
/spec-flow archive
```

### 生命周期

```
explore → plan → implement → accept → archive
   ↑          ↓        ↑         ↓
   └── amend ←┘        └─ amend ←┘
```

- 每个步骤通过 `/spec-flow <action>` 驱动
- 状态通过 `node .specs/bin/spec-flow.mjs` 原子写入
- 中断后 `/spec-flow resume` 精确恢复

### Runtime 命令

| 命令 | 说明 |
|------|------|
| `init` | 初始化 `.specs/` 工作区 |
| `new` | 创建新 spec |
| `status` | 查看所有活跃 spec 状态 |
| `checkpoint` | 写入执行检查点；`--evidence` 登记可验证证据，`--dispatch` 登记编排子任务 |
| `amend` | 升版重大变更 |
| `accept` | 记录验收结果 |
| `archive` | 归档已验收 spec（`--summary-path` 校验存在性并返回迁移后路径） |
| `resume` | 恢复中断的工作；存在编排记录时返回 `pendingDispatch` |
| `doctor` | 检测 registry 与目录的 7 类不一致；`--fix` 仅执行安全修复 |

## requirement-analysis 使用方法

```bash
/requirement-analysis 分析用户权限系统的实现方案
```

9 阶段工作流：需求理解 → 代码探索 → 外部资源研究 → 澄清问题 → 深度分析 → 展示计划 → 可选实施 → 可选审查 → 总结

阶段 1 结束时自动判定执行档位并向用户声明（允许覆盖）：

- **light** — 单文件/单模块小改动：跳过外部研究与并行编排，全流程 ≤ 2 次交互
- **standard** — 默认档：并行探索 + code-architect 架构蓝图 + 3 路维度审查
- **deep** — 跨层架构变更/新技术栈：multi-modal sweep 盲扫探索 + judge panel 多视角方案评分 + 5 路审查与对抗复核

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
| **sequential-thinking** | 结构化深度思考 | EnterPlanMode + 思维链分析 |
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

| Agent | 用途 | 使用场景 |
|-------|------|---------|
| **spec-acceptance-reviewer** | 独立验收，findings-first 报告 | spec-flow accept |
| **external-resource-explorer** | 外部资源探索，可引用证据 | spec-flow explore/plan |
| **code-explorer** | 深度分析代码库 | requirement-analysis |
| **code-architect** | 设计架构蓝图 | requirement-analysis |
| **code-reviewer** | 代码审查 | requirement-analysis |

## 目录结构

```
spec-dev/
├── .claude-plugin/
│   └── marketplace.json         # Marketplace 配置
├── .agents/
│   └── plugins/
│       └── marketplace.json      # Codex marketplace 配置
├── .codex-plugin/
│   └── plugin.json              # Codex 插件清单
├── .githooks/
│   └── pre-commit               # 提交前同步并校验 Codex 分发包
├── .mcp.json                    # Codex 插件内 MCP 配置
├── agents/
│   ├── spec-acceptance-reviewer.md   # 独立验收 agent
│   ├── external-resource-explorer.md # 外部资源探索 agent
│   ├── code-explorer.md         # 代码探索 agent
│   ├── code-architect.md        # 架构设计 agent
│   └── code-reviewer.md         # 代码审查 agent
├── commands/
│   ├── spec-flow.md             # /spec-flow 命令
│   └── check-mcp.md             # /check-mcp 命令
├── plugins/
│   └── spec-dev/                # Codex marketplace 插件入口（由脚本生成）
├── scripts/
│   ├── sync-codex-package.mjs   # 同步并校验 Codex 分发包
│   ├── validate-skills.mjs      # 复用 skill-creator 校验所有 skill
│   ├── validate-output.mjs      # 子代理输出契约校验器（随分发包分发）
│   ├── schemas/                 # 4 类输出契约 schema + 使用说明
│   └── install-git-hooks.mjs    # 启用版本化 Git hooks
├── skills/
│   ├── spec-flow/               # Spec 生命周期工作流
│   │   ├── SKILL.md
│   │   ├── agents/openai.yaml
│   │   ├── evals/               # 行为评测用例基线
│   │   ├── references/          # 8 个参考文档
│   │   └── assets/              # 模板 + runtime
│   ├── requirement-analysis/    # 需求分析工作流（三档复杂度路由）
│   │   ├── SKILL.md
│   │   ├── agents/openai.yaml
│   │   ├── evals/
│   │   ├── references/          # 含 codex-compat.md 双环境指南
│   │   └── assets/
│   └── browser-qa/              # 浏览器三层测试工作流
│       ├── SKILL.md
│       ├── agents/openai.yaml
│       ├── evals/               # 行为用例 + trigger evals
│       ├── scripts/             # detect-env.mjs 前置环境检测
│       ├── references/
│       └── templates/
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
