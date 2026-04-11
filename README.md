# spec-dev

跨会话、可恢复、可验收、可归档的 spec 生命周期工作流插件。

**中文** | Action-First 生命周期 | 跨会话持久化 | 独立验收 | MCP 增强

## 特性

- **Spec Flow** — 5 action 生命周期（explore → plan → implement → accept → archive），workspace-local runtime 原子写入
- **独立验收** — 专用 `spec-acceptance-reviewer` agent，findings-first 报告，实现者不自评
- **跨会话恢复** — 会话中断后通过 `progress.json` 和 `resumePoint` 精确恢复
- **需求分析** — 9 阶段系统化分析工作流（可选实施）
- **5 领域覆盖** — 软件、研究、运维/流程、文档、跨团队协作
- **MCP 工具增强** — 集成 context7、exa、sequential-thinking（可选，智能降级）
- **3 个专门化 Agents** — spec-acceptance-reviewer、external-resource-explorer、code-explorer/architect/reviewer

## 安装

```bash
# 添加为 marketplace
/plugin marketplace add https://github.com/FlameMida/spec-dev

# 安装插件
/plugin install spec-dev@SPEC-plugins
```

## Skill 对比

| 特性 | **spec-flow** | **requirement-analysis** |
|------|---------------|------------------------|
| **核心模型** | 5 action 生命周期 | 9 阶段分析流程 |
| **跨会话持久化** | `.specs/` + runtime CLI | 无（会话内） |
| **独立验收** | 专用 agent + 报告 | 内嵌审查 |
| **归档** | 完整归档 + 总结 | 无 |
| **适用场景** | 长期任务、需验收归档 | 快速分析、方案评估 |

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
| `checkpoint` | 写入执行检查点 |
| `amend` | 升版重大变更 |
| `accept` | 记录验收结果 |
| `archive` | 归档已验收 spec |
| `resume` | 恢复中断的工作 |

## requirement-analysis 使用方法

```bash
/requirement-analysis 分析用户权限系统的实现方案
```

9 阶段工作流：需求理解 → 代码探索 → 外部资源研究 → 澄清问题 → 深度分析 → 展示计划 → 可选实施 → 可选审查 → 总结

## MCP 工具增强（推荐但可选）

所有功能在没有 MCP 的情况下也能正常工作，插件使用智能降级策略自动切换备用方案。

| MCP 工具 | 主要功能 | 降级方案 |
|---------|---------|---------|
| **context7** | 最新库文档和 API 参考 | WebSearch + 项目依赖分析 |
| **exa** | 高质量网页搜索 | WebSearch |
| **sequential-thinking** | 结构化深度思考 | EnterPlanMode + 思维链分析 |

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
├── agents/
│   ├── spec-acceptance-reviewer.md   # 独立验收 agent
│   ├── external-resource-explorer.md # 外部资源探索 agent
│   ├── code-explorer.md         # 代码探索 agent
│   ├── code-architect.md        # 架构设计 agent
│   └── code-reviewer.md         # 代码审查 agent
├── commands/
│   ├── spec-flow.md             # /spec-flow 命令
│   └── check-mcp.md             # /check-mcp 命令
├── skills/
│   ├── spec-flow/               # Spec 生命周期工作流
│   │   ├── SKILL.md
│   │   ├── agents/openai.yaml
│   │   ├── references/          # 8 个参考文档
│   │   └── assets/              # 模板 + runtime
│   └── requirement-analysis/    # 需求分析工作流
│       ├── SKILL.md
│       ├── references/
│       └── assets/
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
