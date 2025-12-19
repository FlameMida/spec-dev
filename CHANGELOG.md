# 更新日志

本项目的所有重要更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [3.0.0] - 2025-12-19

### 💥 破坏性变更 (Breaking Changes)

- **Skill 结构重大重构** - 采用 Progressive Disclosure Pattern
  - 原因：优化上下文使用，提高加载效率
  - 影响：skill 目录结构发生变化，新增 references/ 和 assets/ 目录
  - 迁移：所有变更向后兼容，无需用户操作

### 重大改进 (Major Improvements)

#### 🏗️ 架构重构 - Progressive Disclosure Pattern

- **重构主文件**: 将 449 行的单体 skill.md 重构为 382 行的模块化结构（减少 34%）
- **新增 references/ 目录**: 创建 10 个按需加载的参考文档
  - `mcp-tools.md` - MCP 工具详细说明和降级策略
  - `phase-1-discovery.md` - 需求理解阶段详细指南
  - `phase-2-exploration.md` - 代码库探索阶段详细指南
  - `phase-3-clarify.md` - 澄清问题阶段详细指南
  - `phase-4-design.md` - 架构设计阶段详细指南
  - `phase-5-implement.md` - 实施阶段详细指南
  - `phase-6-review.md` - 质量审查阶段详细指南
  - `phase-7-summary.md` - 总结阶段详细指南
  - `troubleshooting.md` - 故障排查和常见问题
  - `quick-reference.md` - 快速参考清单
- **新增 assets/ 目录**: 创建输出模板资源
  - `output-template.md` - 统一的阶段输出格式模板
- **优化加载策略**: 只有主 skill.md 始终加载，references 和 assets 按需加载

#### 🔄 工作流控制机制 (Workflow Control)

- **新增工作流控制章节**: 在 skill.md 中添加完整的工作流状态管理机制
- **阶段声明要求**: 每个阶段开始和结束必须输出标准化的阶段标记
  ```markdown
  ---
  ## 🚀 当前阶段：[X] - [阶段名称]
  ---
  ```
- **用户输入继续机制**: 明确规定收到用户输入后如何继续当前阶段，避免流程中断
  - 确认收到输入 → 处理输入 → 继续当前阶段 → 不跳出 skill
- **强制检查点**: 明确规定阶段 3→4 和阶段 4→5 必须等待用户确认
- **禁止跳跃**: 明确禁止从阶段 3 直接到阶段 5，或在未确认架构时开始实施

#### 🎯 实施方案强制要求

- **phase-4-design.md 重大更新**: 将实施步骤从"可选"改为"必须产出"
- **新增强制标记**: 使用 ⚠️ 标记和"必须产出，不是可选项"强调
- **明确最低要求**:
  - 至少 5-10 个详细步骤（根据功能复杂度）
  - 每步必须包含：具体任务、预期产出、验证方式
  - 步骤必须详细到可以直接执行
  - 步骤必须按依赖关系排序
- **新增示例格式**: 提供完整的 8 步实施计划示例

#### 🌍 语言无关化 (Language-Agnostic)

- **移除所有特定语言代码**: 删除所有 Go、Java、Python 等语言特定示例
- **替换为结构化描述**: 使用树状结构描述实体、服务、API
  - Before: `type Dashboard struct { ID uint \`gorm:"primaryKey"\` }`
  - After: `Entity: Dashboard ├─ 字段: │ ├─ id: 主键，自增整数`
- **框架占位符**: 使用通用占位符替代特定框架名
  - `GORM` → `[ORM]`
  - `Gin` → `[Web 框架]`
  - `React` → `[前端框架]`
- **通用文件路径**: 移除 `.go`、`.java` 等扩展名，使用描述性说明
  - `models/dashboard.go` → "实体文件（在数据层目录）"
- **通用依赖引用**:
  - `go.mod` → "项目依赖配置文件（如 package.json, requirements.txt, go.mod, pom.xml）"
  - `vendor/github.com/gin-gonic/gin` → "已安装库的文档文件"

### ✨ 新增 (Added)

#### skill.md 主文件
- 新增"工作流控制"完整章节（81 行）
- 新增阶段标记规范和模板
- 新增用户输入处理流程
- 新增强制检查点列表
- 新增禁止操作清单
- 改进触发条件描述，列举 5 个具体场景
- 保留 `/feat-dev [功能描述]` 手动触发方式

#### phase-3-clarify.md
- 新增"继续工作流"章节，明确用户反馈后的流程
- 新增禁止操作清单（禁止跳过阶段 4、禁止直接到阶段 5）
- 新增标准化的阶段继续输出格式

#### phase-4-design.md
- 新增"实施步骤（必须产出）"专门章节
- 新增完整的 8 步实施计划示例
- 新增步骤格式要求和验证标准
- 新增"等待用户确认"流程说明
- 新增三种用户反馈场景的处理方式
- 完全重写实体和 API 设计示例（语言无关化）

#### quick-reference.md
- 新增"工作流控制要点"作为文档首部
- 新增阶段标记模板
- 新增强制检查点列表
- 新增禁止跳跃规则

#### output-template.md
- 新增完整的 7 个阶段输出模板
- 每个阶段包含阶段标记和完成标记
- 统一输出格式和结构

### 🔧 改进 (Changed)

#### 所有 phase 文档
- 统一阶段标记格式
- 统一输出模板结构
- 改进 MCP 工具使用说明
- 改进降级策略描述

#### mcp-tools.md
- 更新所有示例查询为通用格式
- 移除特定框架名称
- 使用占位符 [Web 框架]、[ORM]、[前端框架]

#### phase-2-exploration.md
- 移除 `.go` 文件扩展名
- 使用通用的文件描述
- 更新 code-explorer agent 提示词模板

#### phase-5-implement.md
- 批量替换语言特定术语为通用术语
- 更新所有代码示例为伪代码或结构化描述
- 通用化文件路径和命令示例

#### phase-6-review.md
- 更新安全检查清单为通用格式
- 移除特定语言的安全问题描述
- 使用通用的代码质量标准

#### troubleshooting.md
- 移除特定语言的故障排查示例
- 使用通用的问题描述和解决方案
- 更新依赖文件引用为通用格式

### 📝 文档 (Documentation)

- 添加详细的工作流控制说明
- 增强实施步骤的要求和示例
- 改进 MCP 工具使用指南
- 完善故障排查文档
- 新增快速参考清单

### ⚡ 性能优化 (Performance)

- 主文件大小减少 34%（449 → 382 行）
- 按需加载机制减少不必要的上下文占用
- 模块化结构提高可维护性

### 🧹 技术债务清理 (Technical Debt)

- 移除所有硬编码的语言和框架名称
- 统一所有阶段的输出格式
- 规范化所有工具使用说明
- 标准化所有降级策略描述

### 📦 迁移指南

**从 v2.0.0 升级到 v3.0.0**：

#### 结构变化
- 主文件 `skills/skill.md` 保持在同一位置
- 新增 `skills/references/` 目录（10 个文件）
- 新增 `skills/assets/` 目录（1 个文件）

#### 行为变化
1. **工作流控制**：现在会输出阶段标记，用于状态跟踪
2. **用户输入处理**：收到用户输入后会明确继续当前阶段，不会中断流程
3. **实施计划**：阶段 4 现在强制要求输出详细实施步骤（5-10 步）
4. **语言无关**：所有示例都是通用的，适用于任何编程语言和框架

#### 无需用户操作
- ✅ 所有变更都向后兼容
- ✅ 用户体验保持一致
- ✅ 功能增强是透明的

### 🙏 致谢

感谢用户反馈帮助识别关键问题：
- 实施方案强制要求的重要性
- 工作流中断问题的根因
- 语言无关化的必要性

这些反馈直接推动了 3.0.0 版本的重大改进。

---

## [2.0.0] - 2025-12-17

### 💥 破坏性变更 (Breaking Changes)

- **移除插件内置 `.mcp.json` 配置文件**
  - 原因：彻底避免与用户全局配置的 MCP 重复安装问题
  - 影响：依赖插件自动 MCP 配置的用户需要在全局配置中手动安装
  - 迁移：参见 README 中的"推荐配置（最佳体验）"章节

- **移除 SessionStart hook 和 `scripts/` 目录**
  - 原因：简化架构，提升跨平台兼容性
  - 影响：会话启动时不再自动检查 MCP 配置
  - 替代：使用 `/check-mcp` 命令手动检查配置状态

### ✨ 新增 (Added)

- **MCP 智能降级方案** - Skill 在 MCP 不可用时自动使用备用工具
  - context7 不可用 → WebSearch + 项目依赖分析
  - exa 不可用 → WebSearch
  - sequential-thinking 不可用 → EnterPlanMode + 思维链分析

- **100% 跨平台兼容性**
  - 完全移除 Bash 脚本依赖
  - 支持 Windows（CMD、PowerShell、Git Bash）
  - 支持 macOS（所有终端）
  - 支持 Linux（所有主流终端）
  - 支持 WSL

- **MCP 可选化设计**
  - 所有功能在无 MCP 环境下完全可用
  - 提供清晰的"快速开始"和"最佳体验"两种使用路径
  - 详细的使用体验对比表格

### 🔧 改进 (Changed)

- 完全重写 README.md 的 MCP 配置章节
  - 强调 MCP 是可选的（推荐但不必需）
  - 提供完整的全局配置示例（Windows 路径说明）
  - 添加智能降级策略说明
  - 添加跨平台支持说明

- 更新 plugin.json
  - 版本号升级至 2.0.0
  - 移除 SessionStart hook 配置
  - 添加 "cross-platform" 关键词

- 优化目录结构
  - 移除 `.mcp.json`
  - 移除 `scripts/` 目录
  - 简化至核心组件

### 📝 文档 (Documentation)

- 新增 MCP 工具降级策略表格
- 新增使用体验对比表格（有/无 MCP）
- 新增跨平台支持说明
- 更新"与官方 feat-dev 的区别"对比表
- 添加 Windows 用户的特别说明（路径、环境变量）

### 🎯 设计理念变更

从 **"MCP 必需，冲突时优先级处理"** 转变为 **"MCP 可选，降级时功能完整"**

这个设计理念的转变使插件：
- 更容易上手（零配置即可使用）
- 更可靠（不依赖外部服务）
- 更灵活（用户自主选择是否使用 MCP）
- 更简洁（无外部脚本依赖）

### 📦 迁移指南

**从 v1.1.0 升级到 v2.0.0**：

1. **如果您使用全局 MCP 配置**：
   - ✅ 无需任何操作，直接升级即可

2. **如果您依赖插件的 .mcp.json**：
   - ⚠️ 需要手动将 MCP 配置添加到全局配置 `~/.claude.json`
   - 📖 配置示例见 README 的"推荐配置"章节

3. **如果您不使用 MCP**：
   - ✅ 无需任何操作，降级方案自动生效

---

## [1.1.0] - 2025-12-17

### ✨ 新增 (Added)
- 添加 SessionStart hook，会话启动时自动检查 MCP 配置状态
- 新增 `/check-mcp` 命令，手动查看 MCP 配置详情和状态
- 智能 MCP 冲突检测和处理机制
- 完善 MCP 依赖管理文档，包含详细的配置说明和常见问题解答
- 创建 `scripts/check-mcp-setup.sh` - 自动检测脚本
- 创建 `commands/check-mcp.md` - MCP 配置检查斜杠命令

### 🔧 改进 (Changed)
- 利用 Claude Code 作用域优先级机制自动处理 MCP 重复问题
- 添加详细的 MCP 配置说明（3 种配置方式）
- 友好的彩色终端输出和提示信息
- 更新项目目录结构文档

### 🔨 技术细节 (Technical)
- 更新 `plugin.json` 添加 SessionStart hooks 配置
- 使用 `${CLAUDE_PLUGIN_ROOT}` 环境变量确保路径正确性
- 实现环境变量检测（CONTEXT7_API_KEY、EXA_API_KEY）
- Bash 脚本支持彩色输出和错误处理

### 📝 文档 (Documentation)
- 新增 "MCP 依赖管理" 章节到 README
- 添加 MCP 配置常见问题解答
- 说明 Claude Code 作用域优先级机制
- 提供配置方式对比和建议

---

## [1.0.0] - 2025-12-17

### ✨ 新增 (Added)
- 🎉 7 阶段功能开发工作流
  - 阶段 1: 需求理解 (Discovery)
  - 阶段 2: 代码库探索 (Codebase Exploration)
  - 阶段 3: 澄清问题 (Clarifying Questions)
  - 阶段 4: 架构设计 (Architecture Design)
  - 阶段 5: 实施 (Implementation)
  - 阶段 6: 质量审查 (Quality Review)
  - 阶段 7: 总结 (Summary)
- 🤖 3 个专门化 Agent
  - `code-explorer` - 深度分析代码库，追踪执行路径
  - `code-architect` - 设计架构蓝图，制定实施方案
  - `code-reviewer` - 代码审查，识别 bug 和规范问题
- 🧠 集成 ultrathink 深度分析（Sequential Thinking）
- 🔌 MCP 工具增强
  - `context7` - 获取最新库文档和 API 参考
  - `exa` - 高质量网页搜索和代码示例
  - `sequential-thinking` - 深度结构化思考
- 🌐 完整的中文支持和输出
- ⚡ 并行 Agent 执行能力
- 🎯 自动触发机制（通过 skill）
- 📝 `/feat-dev` 斜杠命令

### 🎯 特性 (Features)
- 语言无关 - 适用于任何编程语言和项目结构
- 灵活的模型配置（Sonnet/Opus）
- 支持复杂度判断的智能 ultrathink 使用
- 完整的 MCP 服务器配置（.mcp.json）

---

## 版本说明

### 版本号格式
遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)：

- **主版本号（MAJOR）**：不兼容的 API 修改
- **次版本号（MINOR）**：向下兼容的功能性新增
- **修订号（PATCH）**：向下兼容的问题修正

### 更新类型

- **新增 (Added)**：新功能
- **改进 (Changed)**：对现有功能的变更
- **弃用 (Deprecated)**：即将删除的功能
- **移除 (Removed)**：已删除的功能
- **修复 (Fixed)**：任何 bug 修复
- **安全 (Security)**：安全相关的修复

---

[3.0.0]: https://github.com/FlameMida/feat-dev/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/FlameMida/feat-dev/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/FlameMida/feat-dev/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/FlameMida/feat-dev/releases/tag/v1.0.0
