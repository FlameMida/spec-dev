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

## MCP 工具增强（推荐但可选）

### 🎯 重要说明

本插件的**所有功能在没有 MCP 的情况下也能正常工作**！

插件使用智能降级策略，当 MCP 不可用时自动切换到备用方案：

| MCP 工具 | 主要功能 | 降级方案 | 体验差异 |
|---------|---------|---------|----------|
| **context7** | 最新库文档和 API 参考 | WebSearch + 项目依赖分析 | 可能返回过时文档 |
| **exa** | 高质量网页搜索 | WebSearch | 搜索结果质量略低 |
| **sequential-thinking** | 结构化深度思考（ultrathink） | EnterPlanMode + 思维链分析 | 结构化程度降低 |

### 使用体验对比

| 功能 | 有 MCP | 无 MCP（降级） |
|------|--------|---------------|
| 获取最新库文档 | ✅ 实时最新 API | ⚠️ 可能过时（WebSearch） |
| 代码示例搜索 | ✅ 精准代码片段 | ⚠️ 通用搜索结果 |
| 架构深度分析 | ✅ 结构化 ultrathink | ⚠️ 常规思维链 |
| 整体工作流 | 🌟 最佳体验 | ✅ 完全可用 |

### 🚀 快速开始（无需配置）
## 安装
```bash
# 添加为 marketplace
/plugin marketplace add https://github.com/FlameMida/spec-dev

# 安装skill spec-dev
/plugin install spec-dev@SPEC-plugins
```

直接使用插件，无需任何 MCP 配置即可获得完整功能（降级方案自动生效）。


### 💡 推荐配置（最佳体验）

如果您想获得最佳开发体验，建议在**全局配置**中安装 MCP 服务器。

#### 配置步骤



**1. 编辑全局配置文件**

编辑 `~/.claude.json`（Windows 用户为 `%USERPROFILE%\.claude.json`）：

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
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

**2. 配置环境变量**

在 `~/.zshrc`（macOS/Linux）或 `~/.bashrc`（Linux）或系统环境变量（Windows）中添加：

```bash
export CONTEXT7_API_KEY="your-context7-api-key"
export EXA_API_KEY="your-exa-api-key"
```

**获取 API Key**：
- Context7: https://context7.com/
- Exa: https://exa.ai/

#### 检查 MCP 配置状态

运行以下命令检查当前 MCP 配置状态：

```bash
/check-mcp
```

该命令会显示：
- 哪些 MCP 已配置
- 哪些 MCP 正在使用
- 哪些功能使用降级方案
- 配置建议和优化提示

### ⚠️ 关于 MCP 重复安装
如果您：
- ✅ 已在全局配置中安装了这些 MCP - 完美，直接使用
- ✅ 不想安装 MCP - 没问题，降级方案自动生效
- ✅ 部分安装了 MCP - 已有的 MCP 会被使用，其他功能降级


## 使用方法

### 使用 /feat-dev 命令

```bash
/feat-dev 实现用户认证功能
```

或者只输入命令，按提示描述功能：

```bash
/feat-dev
```

### 自动触发

当你提出以下类型的需求时，会自动使用此工作流：
- "我需要实现一个 XXX 功能"
- "帮我开发 XXX 模块"
- "需要添加 XXX 特性"

## 专门化 Agents

| Agent | 颜色 | 模型     | 用途 |
|-------|------|--------|------|
| **code-explorer** | 黄色 | haiku  | 深度分析代码库，追踪执行路径 |
| **code-architect** | 绿色 | sonnet | 设计架构蓝图，制定实施方案 |
| **code-reviewer** | 红色 | haiku  | 代码审查，识别 bug 和规范问题 |

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
feat-dev/
├── .claude-plugin/
│   ├── plugin.json         # 插件元数据
│   └── marketplace.json    # Marketplace 配置
├── agents/
│   ├── code-explorer.md    # 代码探索 agent
│   ├── code-architect.md   # 架构设计 agent
│   └── code-reviewer.md    # 代码审查 agent
├── commands/
│   └── check-mcp.md        # /check-mcp 命令 - 检查 MCP 配置状态
├── skills/
│   └── skill.md            # Skill 定义（自动触发）
├── CHANGELOG.md            # 版本更新日志
└── README.md               # 项目说明文档
```

## 与官方 feat-dev 的区别

| 特性 | 官方 feat-dev | feat-dev |
|------|-----------------|----------------|
| 语言 | 英文 | 中文 |
| ultrathink | 无 | 融合 Sequential Thinking |
| MCP 工具 | 无 | 集成 context7、exa（可选） |
| MCP 降级 | 无 | 智能降级方案 |
| 模型配置 | 固定 Sonnet | 可配置（Sonnet/Opus） |
| 自动触发 | 无 | 支持 |
| 跨平台 | 是 | 100% 兼容（Windows/macOS/Linux） |

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的版本更新历史。

## 许可证

MIT License

## 作者

FlameMida

## 贡献

欢迎提交 Issue 和 Pull Request！
