# Feature Dev CN

完整的功能开发工作流插件 - 7阶段系统化开发流程，包含代码探索、架构设计、实施和质量审查。

**中文版** | 融合 ultrathink 深度分析 | MCP 工具增强 | 语言无关

## 特性

- **7 阶段工作流**: 需求理解 → 代码探索 → 澄清问题 → 架构设计 → 实施 → 质量审查 → 总结
- **3 个专门化 Agent**: code-explorer、code-architect、code-reviewer
- **ultrathink 深度分析**: 在关键阶段使用 Sequential Thinking 进行深度思考
- **MCP 工具增强**: 集成 context7、exa、sequential-thinking 等 MCP 服务
- **并行 Agent 执行**: 代码探索和质量审查阶段并行执行多个 agent
- **语言无关**: 适用于任何编程语言和项目结构
- **中文输出**: 全程中文沟通

## MCP 工具集成

本插件集成以下 MCP 服务器以增强开发流程：

| MCP 服务器 | 用途 | 使用阶段 |
|-----------|------|---------|
| **context7** | 获取最新库文档和 API 参考 | 代码探索、架构设计、实施 |
| **exa** | 网页搜索最佳实践和代码示例 | 需求理解、架构设计、质量审查 |
| **sequential-thinking** | 深度结构化思考（ultrathink） | 需求理解、架构设计 |

### MCP 配置

插件包含 `.mcp.json` 配置文件，定义了推荐的 MCP 服务器配置：

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    },
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "${EXA_API_KEY}"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

### 环境变量配置

使用 MCP 服务需要设置相应的 API Key：

```bash
# 在 ~/.zshrc 或 ~/.bashrc 中添加
export CONTEXT7_API_KEY="your-context7-api-key"
export EXA_API_KEY="your-exa-api-key"
```

获取 API Key:
- Context7: https://context7.com/
- Exa: https://exa.ai/

## 安装

### 方式 1: 从 GitHub 安装

```bash
# 添加为 marketplace
/plugin marketplace add https://github.com/FlameMida/feature-dev

# 安装插件
/plugin install GodV-plugins/feature-dev
```

### 方式 2: 本地安装

将此目录放置在 `~/.claude/plugins/repos/feature-dev/`

## 使用方法

### 使用 /feature-dev 命令

```bash
/feature-dev 实现用户认证功能
```

或者只输入命令，按提示描述功能：

```bash
/feature-dev
```

### 自动触发

当你提出以下类型的需求时，会自动使用此工作流：
- "我需要实现一个 XXX 功能"
- "帮我开发 XXX 模块"
- "需要添加 XXX 特性"

## 专门化 Agents

| Agent | 颜色 | 模型 | 用途 |
|-------|------|------|------|
| **code-explorer** | 黄色 | Sonnet | 深度分析代码库，追踪执行路径 |
| **code-architect** | 绿色 | Opus | 设计架构蓝图，制定实施方案 |
| **code-reviewer** | 红色 | Sonnet | 代码审查，识别 bug 和规范问题 |

## 7 阶段工作流

```
阶段 1: 需求理解 (Discovery)
    ↓ [可选 ultrathink]
阶段 2: 代码库探索 (Codebase Exploration)
    ↓ [并行 2-3 个 code-explorer]
阶段 3: 澄清问题 (Clarifying Questions)
    ↓ [AskUserQuestion]
阶段 4: 架构设计 (Architecture Design)
    ↓ [必须 ultrathink + code-architect]
阶段 5: 实施 (Implementation)
    ↓ [等待用户确认]
阶段 6: 质量审查 (Quality Review)
    ↓ [并行 3 个 code-reviewer]
阶段 7: 总结 (Summary)
```

## 目录结构

```
feature-dev/
├── .claude-plugin/
│   ├── plugin.json         # 插件元数据
│   └── marketplace.json    # Marketplace 配置
├── .mcp.json               # MCP 服务器配置
├── agents/
│   ├── code-explorer.md    # 代码探索 agent
│   ├── code-architect.md   # 架构设计 agent
│   └── code-reviewer.md    # 代码审查 agent
├── skills/
│   └── skill.md            # Skill 定义（自动触发）
└── README.md
```

## 与官方 feature-dev 的区别

| 特性 | 官方 feature-dev | feature-dev |
|------|-----------------|----------------|
| 语言 | 英文 | 中文 |
| ultrathink | 无 | 融合 Sequential Thinking |
| MCP 工具 | 无 | 集成 context7、exa |
| 模型配置 | 固定 Sonnet | 可配置（Sonnet/Opus） |
| 自动触发 | 无 | 支持 |

## 许可证

MIT License

## 作者

FlameMida

## 贡献

欢迎提交 Issue 和 Pull Request！
