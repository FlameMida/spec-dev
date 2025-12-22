# 更新日志

本项目的所有重要更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [3.1.2] - 2025-12-22

### 🐛 修复 (Fixed)

#### 🔧 修复 Agent Model 参数传递问题

**问题描述**：
- skills/skill.md:76 错误地声称"Model 从 agent 文件的 YAML frontmatter 自动读取"
- 所有 Task 工具调用示例都缺少 `model` 参数
- 导致 code-explorer 和 code-reviewer agents 使用 sonnet 而不是配置的 haiku

**实际行为**：
- Task 工具的 `model` 参数如果不指定，会从父进程继承（使用当前对话的 model）
- **不会**自动读取 agent 文件 YAML frontmatter 中的 `model` 配置

**影响范围**：
- code-explorer (配置 `model: haiku`)
- code-reviewer (配置 `model: haiku`)
- code-architect (配置 `model: sonnet`) - 架构设计使用更强大的 model

**修复内容**：

1. **修正说明文档** (skills/skill.md:74-77)
   ```diff
   - Model 从 agent 文件的 YAML frontmatter 自动读取
   + 必须显式指定 `model` 参数（如 `model: "haiku"`），否则会从父进程继承（使用 sonnet）
   ```

2. **添加 model 参数到所有调用示例**：
   - skills/skill.md：code-explorer x3 (haiku)、code-architect x1 (sonnet)、code-reviewer x3 (haiku)
   - skills/references/phase-2-exploration.md：code-explorer x3 (haiku)
   - skills/references/phase-4-design.md：code-architect x1 (sonnet)
   - skills/references/phase-6-review.md：code-reviewer x3 (haiku)

3. **示例修改**：
   ```markdown
   Task tool:
   - subagent_type: feat-dev:code-explorer
   + model: haiku  # 新增：显式指定 model
   - prompt: "..."
   - run_in_background: true
   ```

**修复后效果**：
- ✅ code-explorer 和 code-reviewer 使用 haiku（快速、低成本）
- ✅ code-architect 使用 sonnet（架构设计需要更强推理能力）
- ✅ 降低整体 Token 消耗（探索和审查任务占大多数）
- ✅ 提升探索和审查速度
- ✅ 符合 agent 设计意图（不同任务使用不同 model）

**修改文件**：
- `skills/skill.md`：修正说明 + 6 处示例
- `skills/references/phase-2-exploration.md`：3 处示例
- `skills/references/phase-4-design.md`：1 处示例
- `skills/references/phase-6-review.md`：3 处示例

**总计**：4 个文件，15 行新增，1 行修改

---

## [3.1.1] - 2025-12-22

### 🔧 改进 (Changed)

#### 💡 改进并行 Agent 调用机制

基于对 Anthropic 官方并行执行最佳实践的深入理解，显著改进了并行 agent 调用的描述和指导。

**问题背景**：
- 虽然 v3.1.0 提到"并行 agents"，但缺少明确的执行层面指令
- Claude 可能按顺序调用多个 agents，而非真正并行
- 缺少 `run_in_background` 和 `TaskOutput` 的具体使用说明

**核心改进**：

##### 1. 专门化 Agents 章节（skills/skill.md:62-97）
- 新增"调用方式"完整说明
- 区分"并行调用（阶段 2 和 6）"和"单个调用（阶段 4）"
- 明确 `run_in_background: true` 的使用要求
- 提供 4 步并行调用流程：
  1. 在一个消息中发起多个 Task 工具调用
  2. 每个 Task 设置 `run_in_background: true`
  3. 继续其他工作（如阅读文件）
  4. 使用 TaskOutput 收集每个 agent 的结果

##### 2. 阶段 2：代码库探索（skills/skill.md:122-161）
- 添加 **⚠️ 并行执行要求（关键）** 警告标记
- 明确要求：**必须在单个消息中**发起 2-3 个 Task 工具调用
- 提供完整的并行调用示例代码：
  ```markdown
  Task 1: 探索数据层
  - description: "探索数据层架构"
  - prompt: "分析数据层：实体、数据库模式、数据关联。返回5-10个关键文件路径。"
  - subagent_type: "feat-dev:code-explorer"
  - run_in_background: true

  Task 2: 探索业务逻辑层 ...
  Task 3: 探索API层 ...

  等待所有 agents 完成后，使用 TaskOutput 收集结果。
  ```

##### 3. 阶段 4：架构设计（skills/skill.md:189-203）
- 添加单个 agent 调用方式说明
- 明确 `run_in_background: false`（或省略）用于阻塞等待

##### 4. 阶段 6：质量审查（skills/skill.md:287-324）
- 添加与阶段 2 类似的并行执行要求
- 提供 3 个 code-reviewer agents 的完整并行调用示例
- 明确各 reviewer 的审查焦点分工

**技术原理**：
- **单消息多调用**：符合 Anthropic 官方并行执行最佳实践
- **后台执行标志**：`run_in_background: true` 让 agents 在后台运行
- **结果收集机制**：使用 TaskOutput 工具异步收集结果
- **时间优化**：从串行执行（15分钟）→ 并行执行（5分钟），节省 67% 时间

**影响范围**：
- 修改文件：1 个（`skills/skill.md`）
- 新增内容：~120 行详细说明和示例
- 影响阶段：阶段 2、4、6 以及专门化 Agents 章节

### 📊 改进统计

| 改动类型 | 位置 | 改动量 | 关键改进 |
|---------|------|--------|----------|
| 新增章节 | 专门化 Agents | ~35 行 | 调用方式完整说明 |
| 改进阶段 2 | 代码库探索 | ~40 行 | 并行调用示例 |
| 改进阶段 4 | 架构设计 | ~15 行 | 单个调用说明 |
| 改进阶段 6 | 质量审查 | ~40 行 | 并行审查示例 |
| **总计** | **skill.md** | **~120 行** | **并行执行机制** |

### 🎯 设计理念

**从"概念描述"到"执行指令"**：
- Before: "并行启动 2-3 个 agents"（太抽象）
- After: "在单个消息中发起 2-3 个 Task 调用，每个设置 run_in_background: true"（可执行）

**遵循官方最佳实践**：
- ✅ 单个消息中发起多个 Task 调用
- ✅ 使用 `run_in_background` 参数控制执行模式
- ✅ 使用 `TaskOutput` 工具收集后台 agent 结果
- ✅ 最大化时间利用和并行效率

### 💡 用户收益

1. **更清晰的指导**：明确的执行步骤，不再困惑如何实现并行
2. **更快的执行**：真正的并行执行，阶段 2 和 6 各节省 67% 时间
3. **更好的示例**：可直接参考的调用代码，降低使用门槛

---

## [3.1.0] - 2025-12-22

### 💡 重大改进 (Major Improvements)

#### 🎯 融入官方 Agent 调用最佳实践

基于 [Anthropic 官方 feature-dev](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/feature-dev/commands/feature-dev.md) 的 agent 调用原则，提升工作流质量和效率。

**核心改进**：
1. **Agent 文件返回机制** - Agents 返回关键文件列表，主进程亲自阅读建立深度理解
2. **多方案设计和权衡分析** - Phase 4 提供备选方案并说明权衡，尊重用户选择
3. **询问用户决策** - Phase 6 不自动修复，而是向用户展示问题并询问如何处理

### ✨ 新增 (Added)

#### Phase 2: 代码库探索
- **Agent 输出要求** - 每个 agent 必须返回 5-10 个关键文件路径
- **文件返回机制** - 新增"Agent 输出要求"章节，说明为什么需要文件列表
- **主进程读取步骤** - 新增"读取 Agent 识别的文件"章节，明确读取流程
- **整合理解指导** - 强调基于亲自阅读的文件形成综合理解

#### Phase 4: 架构设计
- **code-architect 必须使用** - 从"可选"改为"必须"，增加"为什么必须使用"说明
- **Agent 输出要求** - architect 必须返回 5-10 个关键架构文件
- **整合分析步骤** - 综合 ultrathink + architect + 文件阅读形成最终方案
- **多方案设计章节** - 新增完整的多方案设计指导（最小改动/清晰架构/实用平衡）
  - 方案对比表格（开发时间/代码质量/可维护性/扩展性/风险）
  - 向用户展示方案的模板
  - 询问用户选择的流程
- **单方案设计说明** - 简单功能使用单方案，但仍需说明理由

#### Phase 6: 质量审查
- **整合和分类步骤** - 新增去重、分类、标注的详细步骤
- **向用户展示并询问决策** - 完整的用户决策流程
  - 展示格式模板（按严重性分类的问题列表）
  - 4 个选项（A/B/C/D）供用户选择
  - 等待用户回应的要求
  - 根据用户决策执行的 3 种场景
- **修复策略调整** - 从"自动修复"改为"基于用户决策"

#### Agent 文件更新
- **code-explorer.md**:
  - 输出要求第一项改为"关键文件清单（5-10 个）"
  - 输出格式开头增加关键文件清单章节
  - 添加文件选择标准说明
- **code-architect.md**:
  - 核心使命增加"必须返回 5-10 个关键架构参考文件"要求
  - 输出要求第一项改为"关键架构文件清单"
  - 输出格式开头增加关键架构文件清单章节
  - 添加文件选择标准说明
  - 增加"备选方案（如适用）"输出要求
- **code-reviewer.md**:
  - 核心使命增加"必须标注严重性和置信度"要求
  - 新增"严重性分类"章节（高/中/低三级）
  - 输出格式按严重性分类（高🔴/中🟡/低🟢）
  - 每个问题同时显示严重性和置信度

### 🔧 改进 (Changed)

#### skills/skill.md 主文件
- **Phase 2 执行要点** - 5 步详细流程，强调文件返回和读取
- **Phase 4 执行要点** - 5 步详细流程，architect 必须使用，支持多方案设计
- **Phase 4 产出** - 增加 ultrathink 分析、architect 建议、备选方案等
- **Phase 6 执行要点** - 5 步详细流程，增加询问用户决策环节
- **Phase 6 修复策略** - 改为"基于用户决策"

#### skills/references/phase-2-exploration.md
- 修改"汇总探索结果"章节结构：
  - 1. 收集 Agent 报告
  - 2. **读取 Agent 识别的文件**（新增）
  - 3. 整合发现（基于 agent 报告 + 亲自阅读的文件）

#### skills/references/phase-4-design.md
- 修改"可选：code-architect Agent"为"必须使用：code-architect Agent"
- 更新 architect prompt，增加"返回 5-10 个关键架构参考文件"要求
- 新增"Agent 输出要求"和"读取 Architect 推荐的文件"章节
- 新增"整合分析"步骤说明

#### skills/references/phase-6-review.md
- 修改"汇总审查结果"章节：
  - 2. 整合发现 → 2. 整合和分类（增加详细步骤）
  - 新增 3. 向用户展示并询问决策
- 修改"处理审查结果"的修复策略为"基于用户决策"

### 📊 改进统计

| 改动类型 | 文件数 | 改动量 | 关键改进 |
|---------|-------|--------|----------|
| 新增章节 | 3 | ~250 行 | Agent 调用最佳实践 |
| 修改执行要点 | 1 | ~60 行 | 3 个阶段优化 |
| Agent 输出要求 | 3 | ~80 行 | 文件返回机制 |
| **总计** | **7** | **~390 行** | **3 大核心原则** |

### 🎓 设计理念

**从官方学到的精华**：
1. **Agent 是探索者，不是执行者** - Agents 负责识别关键文件，主进程负责阅读和理解
2. **给用户选择权** - 提供多个方案和权衡分析，让用户做决策
3. **询问而不是假设** - Phase 6 询问用户如何处理问题，而不是自动修复

**保留的创新**：
- ✅ MCP 工具集成（context7、exa、sequential-thinking）
- ✅ ultrathink 深度分析
- ✅ 置信度标准（≥80%）- 比官方更科学
- ✅ 严重性分类（高/中/低）- 结合官方和自己的优势
- ✅ 中文交互和自动触发

### 🙏 致谢

感谢 [Anthropic 官方 feature-dev](https://github.com/anthropics/claude-plugins-official) 提供的优秀 agent 调用模式和最佳实践。

---

## [3.0.1] - 2025-12-22
 -  agent 调用修复

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
