# spec-dev-skills

完整的功能开发工作流插件 - 7阶段系统化开发流程，包含代码探索、架构设计、实施和质量审查。

**中文版** | 融合 ultrathink 深度分析 | MCP 工具增强 | 语言无关

## 特性

- **双工作流系统**: 7 阶段完整开发 + 9 阶段需求分析，灵活适配不同场景
- **Task List 智能管理**: 进度可视化、工作流透明化、断点恢复、任务可复用
- **双模式架构设计**: feat-dev 支持单方案快速设计 vs 多方案对比（复杂需求）
- **ultrathink 深度分析**: 在关键决策点使用 Sequential Thinking 进行结构化思考
- **灵活并行模式**: 探索阶段 2-5 agents，审查阶段 3-5 agents，自适应需求复杂度
- **MCP 工具增强**: 集成 context7、exa、sequential-thinking（可选，智能降级）
- **3 个专门化 Agents**: code-explorer、code-architect、code-reviewer（支持子任务跟踪）
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

本插件提供**两个主要 skill**，可根据需求选择使用：

### Skill 对比

| 特性 | **feat-dev** | **requirement-analysis** |
|------|-------------|------------------------|
| **阶段数** | 7 阶段 | 9 阶段 |
| **适用场景** | 复杂功能开发、多模块实施、需要架构设计 | 前期分析、技术方案设计、API/数据库设计 |
| **核心输出** | 完整功能实现 + 代码审查 | 实施计划 + 可选实施 |
| **架构设计** | 双模式（单方案/多方案对比） | 单一深度分析 |
| **外部资源研究** | 集成在代码探索阶段 | 独立阶段（条件执行） |
| **实施阶段** | 必须执行 | 可选（用户确认后） |
| **代码审查** | 必须执行（3个并行） | 可选执行（3-5个并行） |
| **断点恢复** | ✅ 支持 | ✅ 支持 |

### 如何选择

**选择 feat-dev 当你需要**：
- ✅ 完整实施一个新功能
- ✅ 修改多个核心模块
- ✅ 需要对比多种架构方案
- ✅ 需要自动化的代码审查
- ✅ 从设计到交付的完整流程

**选择 requirement-analysis 当你需要**：
- ✅ 快速分析技术方案可行性
- ✅ 设计 API 或数据库架构
- ✅ 评估实施复杂度
- ✅ 先看计划再决定是否实施
- ✅ 需要研究外部资源和最佳实践

### 1. feat-dev - 完整功能开发工作流

**适用场景**：复杂功能开发、多模块实施、需要架构设计的任务

**使用方式**：
```bash
/feat-dev 实现用户认证功能
```

**工作流程**：7 个完整阶段（需求理解 → 代码探索 → 澄清问题 → 架构设计 → 实施 → 质量审查 → 总结）

**示例**：
```bash
/feat-dev 实现一个支持多租户的订单管理系统，包括订单创建、状态跟踪和报表统计功能
```

### 2. requirement-analysis - 需求分析工作流

**适用场景**：快速需求分析、前期设计规划、需要深度分析但不立即实施的场景

**使用方式**：
```bash
/requirement-analysis 分析用户权限系统的实现方案
```

**工作流程**：9 个完整阶段（需求理解 → 代码探索 → 外部资源研究 → 澄清问题 → 深度分析 → 展示计划 → 可选实施 → 可选审查 → 总结）

**示例**：
```bash
分析如何集成第三方支付系统（支付宝、微信支付），提供技术方案, 使用需求分析skill
```


## 专门化 Agents

本插件使用三个专门化 agents 提升效率和质量，所有 agents 都支持子任务跟踪。

| Agent | 颜色 | 模型     | 用途 | 使用阶段 | 并行数量 |
|-------|------|--------|------|---------|---------|
| **code-explorer** | 黄色 | haiku  | 深度分析代码库，追踪执行路径 | 代码库探索 | 2-5 个 |
| **code-architect** | 绿色 | sonnet | 设计架构蓝图，制定实施方案 | 架构设计 | 1-3 个 |
| **code-reviewer** | 红色 | haiku  | 代码审查，识别 bug 和规范问题 | 质量审查 | 3-5 个 |

### 并行策略

**何时使用并行**：
- ✅ 需求涉及多个架构层次或模块
- ✅ 探索任务可以清晰分解
- ✅ 需要节省时间，提高效率

**并行数量建议**：
- 简单需求：1 个 agent
- 中等需求：2-3 个 agents
- 复杂需求：3-5 个 agents
- ⚠️ 不建议超过 5 个并行任务

**探索阶段分解策略**：
- **按架构层次**：数据层、服务层、API层
- **按功能模块**：核心模块、关联模块
- **按关注点**：现有实现、错误处理、测试、配置

## feat-dev 的 7 阶段工作流

```
阶段 1: 需求理解 (Discovery)
    ↓ [可选 ultrathink]
阶段 2: 代码库探索 (Codebase Exploration)
    ↓ [并行 2-3 个 code-explorer]
阶段 3: 澄清问题 (Clarifying Questions)
    ↓ [AskUserQuestion]
阶段 4: 架构设计 (Architecture Design)
    ↓ [双模式：单方案/多方案对比]
阶段 5: 实施 (Implementation)
    ↓ [等待用户确认]
阶段 6: 质量审查 (Quality Review)
    ↓ [并行 3 个 code-reviewer]
阶段 7: 总结 (Summary)
```

## feat-dev 的双模式架构设计

阶段 4（架构设计）支持两种模式，根据需求复杂度自动选择。

### 模式 1：单方案设计（简单/中等需求）

**适用条件**：
- 单一功能或 2-3 个模块
- 实现路径清晰明确
- 不涉及重大架构变更

**执行流程**：
1. 主进程使用 ultrathink 深度分析
2. 启动 1 个 code-architect agent 细化设计
3. 向用户展示单一方案
4. 等待用户确认

### 模式 2：多方案对比设计（复杂需求）

**适用条件**：
- 多种明显不同的实现路径
- 重大架构权衡（性能 vs 复杂度）
- 影响 3+ 个核心模块
- 引入新的技术或架构模式

**执行流程**：
1. 并行启动 2-3 个 code-architect agents
2. 每个 agent 设计不同方案：
   - **方案 A**：最小改动方案（快速交付，低风险）
   - **方案 B**：清晰架构方案（最佳实践，高质量）
   - **方案 C**：实用平衡方案（⭐ 通常推荐）
3. 整合所有方案并进行权衡分析
4. 向用户展示对比和推荐意见
5. 等待用户选择

**方案对比示例**：
| 维度 | 最小改动方案 | 清晰架构方案 | 实用平衡方案 |
|------|------------|------------|------------|
| 开发时间 | ⭐⭐⭐⭐⭐ 快 | ⭐⭐ 中等 | ⭐⭐⭐ 中等 |
| 代码质量 | ⭐⭐⭐ 可接受 | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐ 良好 |
| 可维护性 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐ 良好 |
| 风险 | ⭐⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 低 |
| 推荐度 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## requirement-analysis 的 9 阶段工作流

```
阶段 1: 需求理解
    ↓ [可选 ultrathink]
阶段 2: 代码库探索
    ↓ [并行 2-5 个 code-explorer]
阶段 3: 外部资源研究 ⚡ [条件执行]
    ↓ [满足条件时执行，否则跳过]
阶段 4: 澄清问题
    ↓ [AskUserQuestion]
阶段 5: 深度分析 ⚡ [必须 ultrathink]
    ↓ [sequential-thinking]
阶段 6: 展示实施计划 ⚠️ [关键检查点]
    ↓ [等待用户确认]
阶段 7: 实施开发 (可选)
    ↓ [用户确认后执行]
阶段 8: 代码审查 (可选)
    ↓ [并行 3-5 个 code-reviewer]
阶段 9: 总结
```

**关键特性**：
- ⚡ **阶段 3**：条件执行 - 涉及新技术或需要行业实践时执行，否则跳过
- ⚡ **阶段 5**：必须使用 ultrathink - 结构化的深度分析
- ⚠️ **阶段 6**：关键检查点 - 必须等待用户确认后才能进入实施阶段
- **阶段 7-8**：可选执行 - 根据用户需求决定是否实施和审查
- **断点恢复**：支持中断后从任意阶段继续

## Task List 智能管理

两个 skill 都自动管理任务列表，提供完整的进度跟踪和恢复能力。

### 核心功能

- 📊 **进度可视化**：实时显示当前执行阶段和完成进度
- 🔍 **工作流透明化**：清晰展示所有阶段流程和状态
- ⏸️ **断点恢复**：支持中断后继续执行，自动识别断点
- 🔄 **任务可复用**：任务列表可被其他工作流引用

### 进度显示示例

```
### 任务进度
用户认证项目 - 总进度: 43% (3/7 阶段完成)

[✅ 完成] 阶段 1: 需求理解
[✅ 完成] 阶段 2: 代码库探索
[✅ 完成] 阶段 3: 澄清问题
[🔄 进行中] 阶段 4: 架构设计
[⏳ 等待] 阶段 5-7
```

### 断点恢复机制

如果工作流被中断，下次运行时会：
1. 自动检测未完成的任务列表
2. 显示上次的执行进度
3. 询问是否从断点继续
4. 跳过已完成的阶段

### Agents 子任务支持

code-explorer agent 支持创建细粒度的子任务跟踪：
- 功能发现 - 识别入口点、定位核心文件
- 代码流追踪 - 跟踪执行路径、记录依赖关系
- 架构分析 - 映射架构层次、识别设计模式
- 实现细节 - 检查核心算法、分析性能特征
- 生成报告 - 整合发现、输出探索结果

通过 `enableTaskList=true` 参数启用。

## 目录结构

```
feat-dev/
├── .claude-plugin/
│   └── marketplace.json    # Marketplace 配置
├── agents/
│   ├── code-explorer.md    # 代码探索 agent
│   ├── code-architect.md   # 架构设计 agent
│   └── code-reviewer.md    # 代码审查 agent
├── commands/
│   └── check-mcp.md        # /check-mcp 命令 - 检查 MCP 配置状态
├── skills/
│   ├── feat-dev/           # 完整功能开发工作流 skill
│   │   ├── skill.md        # 主技能文件
│   │   ├── references/     # 参考文档
│   │   │   ├── phase-1-discovery.md
│   │   │   ├── phase-2-exploration.md
│   │   │   ├── phase-3-clarify.md
│   │   │   ├── phase-4-design.md
│   │   │   ├── phase-5-implement.md
│   │   │   ├── phase-6-review.md
│   │   │   ├── phase-7-summary.md
│   │   │   ├── mcp-tools.md
│   │   │   ├── quick-reference.md
│   │   │   ├── specialized-agents.md
│   │   │   ├── task-list-management.md
│   │   │   ├── troubleshooting.md
│   │   │   └── workflow-control.md
│   │   └── assets/
│   │       └── output-template.md
│   └── requirement-analysis/  # 需求分析工作流 skill
│       ├── skill.md        # 主技能文件
│       ├── references/     # 参考文档
│       │   ├── parallel-patterns.md
│       │   ├── task-list-management.md
│       │   └── examples.md
│       └── assets/
│           └── output-template.md
├── CHANGELOG.md            # 版本更新日志
└── README.md               # 项目说明文档（本文件）
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
