---
name: feat-dev
description: 完整的 7 阶段功能开发工作流（需求理解、代码探索、架构设计、实施、审查、总结）。适用场景：(1) 新功能实施或模块开发，(2) 复杂代码修改和重构，(3) API/数据库/服务架构设计，(4) 多模块功能开发，(5) 需要代码审查的实施任务。融合 ultrathink 深度分析、MCP 工具增强（context7、exa、sequential-thinking）和并行 agent 执行（code-explorer、code-architect、code-reviewer）。支持全程中文交互。
---

# 功能开发技能

提供系统化的 7 阶段功能开发工作流，确保从需求理解到质量交付的完整过程。

---

## 快速开始

**工作流概览**：
```
需求理解 → 代码探索 → 澄清问题 → 架构设计 → 实施 → 质量审查 → 总结
```

**核心特性**：
- 🧠 **ultrathink 深度分析**：复杂需求和架构设计阶段使用 sequential-thinking
- 🔧 **MCP 工具增强**：优先使用 context7、exa、sequential-thinking，自动降级保证可用性
- 🤖 **并行 agents**：使用专门化 agents（code-explorer、code-architect、code-reviewer）提升效率
- 🌐 **语言无关**：适用于任何技术栈和编程语言
- 🇨🇳 **中文交互**：全程使用中文与用户沟通

**手动触发**：
```bash
/feat-dev [功能描述]
```

**详细指南**：
- MCP 工具和降级策略：[references/mcp-tools.md](references/mcp-tools.md)
- 快速参考：[references/quick-reference.md](references/quick-reference.md)
- 故障排查：[references/troubleshooting.md](references/troubleshooting.md)

---

## MCP 工具集成

本 skill 优先使用 MCP 工具，但**所有功能在无 MCP 环境下完全可用**。

### 工具清单

| MCP 工具 | 用途 | 降级方案 | 使用阶段 |
|---------|------|---------|---------|
| **context7** | 获取最新库文档和 API 参考 | WebSearch + Grep + Read | 2、4、5 |
| **exa** | 高质量网页搜索和代码示例 | WebSearch | 1、4、6 |
| **sequential-thinking** | 深度结构化思考（ultrathink） | EnterPlanMode + 思维链分析 | 1、4 |

### 降级策略

```
尝试 MCP 工具 → 失败 → 立即切换降级方案 → 继续工作流（不中断）
```

**重要**：不要因为 MCP 工具不可用而中断工作流。

**详细说明**：[references/mcp-tools.md](references/mcp-tools.md)

---

## 专门化 Agents

三个外部 agents（位于 `agents/` 目录）：

| Agent | 用途 | 使用阶段 | 并行数量 |
|-------|------|---------|---------|
| **code-explorer** | 深度分析代码库，追踪执行路径 | 2 | 2-3 个 |
| **code-architect** | 设计架构蓝图，制定实施方案 | 4 | 1 个 |
| **code-reviewer** | 代码审查，识别 bug 和规范问题 | 6 | 3 个 |

### 调用方式

**基本原则**：
- 使用 **Task 工具**调用 agents
- **必须显式指定 `model` 参数**（如 `model: "haiku"`），否则会从父进程继承（使用 sonnet）
- 并行执行时必须设置 `run_in_background: true`

**并行调用（阶段 2 和 6）**：
```markdown
⚠️ 关键要求：必须在单个消息中发起所有 Task 调用

示例（启动 3 个并行 agents）：
1. 在一个消息中发起 3 个 Task 工具调用
2. 每个 Task 设置 run_in_background: true
3. 继续其他工作（如阅读文件）
4. 使用 TaskOutput 收集每个 agent 的结果
```

**单个调用（阶段 4）**：
```markdown
启动 1 个 agent，阻塞等待结果：
- run_in_background: false（或省略此参数）
- 等待 agent 完成后继续
```

详见各阶段的参考文档。

---

## 7 阶段工作流

### 阶段 1: 需求理解

**目标**：全面理解用户需求

**执行要点**：
- 识别核心功能、业务实体、API 端点、业务规则、集成点
- 根据复杂度决定是否使用 ultrathink（sequential-thinking）
- 可选：搜索类似实现案例（exa/WebSearch）

**产出**：需求理解摘要（核心功能、业务实体、API 端点、业务规则、集成点、不确定点）

**详细指南**：[references/phase-1-discovery.md](references/phase-1-discovery.md)

---

### 阶段 2: 代码库探索

**目标**：深入理解现有代码库

**执行要点**：
1. **首要任务**：查找并阅读项目根目录的 CLAUDE.md 文件

2. **并行启动 2-3 个 code-explorer agents**：

   **⚠️ 并行执行要求**（关键）：
   - **必须在单个消息中**发起 2-3 个 Task 工具调用
   - **每个 Task 必须设置** `run_in_background: true`
   - **然后使用 TaskOutput** 收集每个 agent 的结果

   **Agent 分工**：
   - Agent 1: 数据层 - 全面追踪实体、数据库模式、数据关联
   - Agent 2: 业务逻辑层 - 全面追踪服务、Repository、业务流程
   - Agent 3: API 层 - 全面追踪控制器、路由、请求处理
   - **要求每个 agent 返回 5-10 个关键文件路径**

   **并行调用示例**：
   ```markdown
   在单个消息中发起所有 Task 调用：

   Task 1: 探索数据层
   - description: "探索数据层架构"
   - prompt: "分析数据层：实体、数据库模式、数据关联。返回5-10个关键文件路径。"
   - subagent_type: "spec-dev:code-explorer"
   - model: "haiku"
   - run_in_background: true

   Task 2: 探索业务逻辑层
   - description: "探索业务逻辑层架构"
   - prompt: "分析业务逻辑层：服务、Repository、业务流程。返回5-10个关键文件路径。"
   - subagent_type: "spec-dev:code-explorer"
   - model: "haiku"
   - run_in_background: true

   Task 3: 探索API层
   - description: "探索API层架构"
   - prompt: "分析API层：控制器、路由、请求处理。返回5-10个关键文件路径。"
   - subagent_type: "spec-dev:code-explorer"
   - model: "haiku"
   - run_in_background: true

   等待所有 agents 完成后，使用 TaskOutput 收集结果。
   ```

3. **读取所有 agent 识别的文件** - 主进程必须亲自阅读这些文件建立深度理解

4. **整合发现**：
   - 汇总所有 agents 的探索结果
   - 基于阅读的文件识别设计模式和代码风格
   - 梳理技术栈和依赖
   - 形成代码库理解摘要

5. 可选：使用 context7 查询依赖库文档

**产出**：代码库探索报告（CLAUDE.md 规范、项目架构、相关组件、设计模式、技术栈、必读文件）

**详细指南**：[references/phase-2-exploration.md](references/phase-2-exploration.md)

---

### 阶段 3: 澄清问题

**目标**：填补需求空白，解决模糊和歧义

**执行要点**：
- 识别需要澄清的情况：
  - 模糊或规格不足的需求
  - 多个有效实施方法
  - 业务规则细节
  - 与现有功能的关系
  - 技术选型或架构决策
- **必须**使用 AskUserQuestion 工具向用户提问
- 记录用户反馈，更新需求理解

**产出**：澄清结果（用户反馈）或"无需澄清"

**详细指南**：[references/phase-3-clarify.md](references/phase-3-clarify.md)

---

### 阶段 4: 架构设计

**目标**：设计详细的实施方案

**执行要点**：
1. **必须并行启动 2-3 个 code-architect agents** 进行深度架构设计：
   - ⚠️ **关键**：agents 在执行过程中必须使用 **ultrathink 等级**的深度思考
   - **并行执行**：每个 agent 负责设计一个备选方案

   **⚠️ 并行执行要求**（关键）：
   - **必须在单个消息中**发起 2-3 个 Task 工具调用
   - **每个 Task 必须设置** `run_in_background: true`
   - **然后使用 TaskOutput** 收集每个 agent 的结果

   **Agent 方案分工**：
   - Agent 1: 最小改动方案 - 快速交付，最小化风险
   - Agent 2: 清晰架构方案 - 追求最佳实践和长期可维护性
   - Agent 3: 实用平衡方案 - 在速度和质量之间找平衡（通常推荐）

   **并行调用示例**：
   ```markdown
   在单个消息中发起所有 Task 调用：

   Task 1: 设计最小改动方案
   - description: "设计最小改动架构方案"
   - prompt: "任务：为 [功能名称] 设计详细的架构蓝图

   ⚠️ 要求：
   1. 在执行过程中使用 ultrathink 等级的深度思考进行架构分析
   2. 设计方案类型：**最小改动方案** - 在现有架构上做最小必要的修改

   [需求概述、代码库探索结果、澄清的问题...]

   设计要求：
   1. 使用深度思考分析需求组件和依赖关系
   2. 设计数据结构、API端点、服务层架构
   3. 识别潜在的架构风险和边缘情况
   4. 推荐架构模式和最佳实践
   5. 返回 5-10 个关键架构参考文件
   6. 规划详细实施步骤（至少 5-10 步）
   7. 分析本方案的优势和劣势"
   - subagent_type: "spec-dev:code-architect"
   - model: "sonnet"
   - run_in_background: true

   Task 2: 设计清晰架构方案
   [参数类似 Task 1，但方案类型为"清晰架构方案"]

   Task 3: 设计实用平衡方案
   [参数类似 Task 1，但方案类型为"实用平衡方案"]

   等待所有 agents 完成后，使用 TaskOutput 收集结果。
   ```

2. **读取所有 agents 推荐的架构文件** - 理解现有架构模式

3. **整合所有方案**：
   - 对比三个方案的优劣势
   - 进行权衡分析（开发时间、代码质量、可维护性、风险）
   - 给出推荐意见及理由

4. **简单功能的特殊处理**：
   - 如果功能简单明确，只有一种合理实现方式
   - 可以只启动 1 个 agent，设计单一方案
   - 设置 `run_in_background: false`（阻塞等待）

5. **向用户展示**：
   - 复杂功能：展示多个方案对比表格 + 每个方案的详细设计 + 权衡分析 + 推荐意见及理由
   - 简单功能：展示单个方案 + 设计理由 + 请求确认

6. **询问用户选择**：等待用户确认使用哪个方案

**产出**（所有都是必须的）：
- ✅ 2-3 个 code-architect agents 使用 ultrathink 等级的深度分析结果和架构建议
- ✅ 读取的架构相关文件理解
- ✅ 多方案对比和权衡分析（复杂功能）
- ✅ [针对选定方案] 数据库设计（实体/表结构、字段、关联、索引）
- ✅ [针对选定方案] API 端点设计（方法、路径、请求/响应、认证）
- ✅ [针对选定方案] 服务层设计（服务接口、依赖关系、业务逻辑流程）
- ✅ **详细实施步骤**（编号列表，每步明确任务和产出）
- ✅ 推荐意见及理由
- ✅ 用户确认

**详细指南**：[references/phase-4-design.md](references/phase-4-design.md)

---

### 阶段 5: 实施

**目标**：按照架构设计实施功能

**前置条件**：用户已确认架构方案

**执行要点**：
- 按阶段 4 规划的步骤顺序实施（通常为）：
  1. 数据层（实体、数据库）
  2. 数据访问层（Repository/DAO）
  3. 服务层（业务逻辑）
  4. DTO（请求/响应结构）
  5. API 层（控制器/路由）
  6. 验证和错误处理
- 严格遵循 CLAUDE.md 规范和现有模式
- 每完成一个模块及时测试
- 可选：使用 context7 查询 API 文档

**实施原则**：
- 保持代码简洁，避免过度设计
- 安全第一（防止注入、XSS、认证授权等）
- 遵循项目现有模式

**产出**：完整的功能实现代码

**详细指南**：[references/phase-5-implement.md](references/phase-5-implement.md)

---

### 阶段 6: 质量审查

**目标**：确保代码质量

**执行要点**：
1. **并行启动 3 个 code-reviewer agents**：

   **⚠️ 并行执行要求**（关键）：
   - **必须在单个消息中**发起 3 个 Task 工具调用
   - **每个 Task 必须设置** `run_in_background: true`
   - **然后使用 TaskOutput** 收集每个 reviewer 的结果

   **Reviewer 分工**：
   - Reviewer 1: Bug 和逻辑错误 - 关注功能正确性
   - Reviewer 2: 代码风格和质量 - 关注简洁性/DRY/优雅性
   - Reviewer 3: 项目规范遵循 - 关注项目约定和抽象
   - **要求每个 reviewer 返回问题列表并标注严重性和置信度**

   **并行调用示例**：
   ```markdown
   在单个消息中发起所有 Task 调用：

   Task 1: Bug 和逻辑错误审查
   - description: "审查Bug和逻辑错误"
   - prompt: "审查代码中的Bug、逻辑错误、空值处理等问题。返回问题列表，每个问题标注严重性（高/中/低）和置信度（0-100）。"
   - subagent_type: "spec-dev:code-reviewer"
   - model: "haiku"
   - run_in_background: true

   Task 2: 代码风格和质量审查
   - description: "审查代码风格和质量"
   - prompt: "审查代码重复、函数复杂度、命名清晰度等质量问题。返回问题列表，每个问题标注严重性和置信度。"
   - subagent_type: "spec-dev:code-reviewer"
   - model: "haiku"
   - run_in_background: true

   Task 3: 项目规范遵循审查
   - description: "审查项目规范遵循"
   - prompt: "审查是否遵循项目规范（CLAUDE.md等）、架构模式、命名约定等。返回问题列表，每个问题标注严重性和置信度。"
   - subagent_type: "spec-dev:code-reviewer"
   - model: "haiku"
   - run_in_background: true

   等待所有 reviewers 完成后，使用 TaskOutput 收集结果。
   ```

2. **整合审查结果**：
   - 收集所有 reviewers 的发现
   - 去重（多个 reviewer 可能发现相同问题）
   - 按严重性分类（高/中/低）
   - 标注置信度（≥80%/60-80%/<60%）
   - 识别最高严重性问题

3. **向用户展示发现并询问决策**：
   - 展示按严重性分类的问题列表
   - 突出显示高置信度 bug（≥80%）和严重规范违反
   - **询问用户**："你希望如何处理这些问题？"
     - 选项 A：立即修复所有高严重性问题（推荐）
     - 选项 B：立即修复高置信度 bug，其他稍后处理
     - 选项 C：按现状继续，记录问题供后续处理
     - 选项 D：自定义

4. **根据用户决策执行**：
   - 按用户选择的策略修复问题
   - 记录暂不处理的问题及原因

5. 完成安全检查清单

**修复策略**（基于用户决策）：
- 必须修复（用户选择时）：高置信度 bug（≥80%）、严重规范违反
- 应该修复（如用户同意）：中置信度 bug（60-79%）、严重质量问题
- 可选修复（视用户决策）：一般质量问题、低置信度 bug（<60%）

**产出**：审查报告、修复记录、质量评分

**详细指南**：[references/phase-6-review.md](references/phase-6-review.md)

---

### 阶段 7: 总结

**目标**：全面总结实施成果

**输出内容**：
1. **变更摘要**：实现了什么功能
2. **修改文件列表**：所有新增和修改的文件
3. **API 变更**：新增的 API 端点
4. **数据库变更**：新增或修改的表/字段
5. **后续建议**：
   - 测试计划
   - 部署注意事项
   - CHANGELOG 条目
   - API 文档生成
   - 可选功能扩展
   - 性能优化建议
   - 监控指标
6. **工具使用情况**：MCP 工具和 agents 使用记录

**产出**：完整总结文档

**详细指南**：[references/phase-7-summary.md](references/phase-7-summary.md)

---

## 工作流控制

⚠️ **CRITICAL - 工作流执行规则**：
- **必须严格按照 1→2→3→4→5→6→7 的顺序执行**
- **每个阶段必须完整执行，禁止跳过**
- **在强制检查点必须停止并等待用户输入**
- **收到用户输入后必须继续当前阶段，不得跳出工作流**

### 阶段声明要求

**⚠️ 每个阶段开始时 MUST 输出（强制）**：
```markdown
---
## 🚀 当前阶段：[X] - [阶段名称]

⚠️ WORKFLOW CHECKPOINT: 当前处于阶段 [X]，必须完成本阶段所有任务后才能进入阶段 [X+1]
---
```

**⚠️ 每个阶段结束时 MUST 输出（强制）**：
```markdown
---
✅ 阶段 [X] 完成

📋 本阶段产出：
- [列出主要产出]

📍 下一阶段：[X+1] - [阶段名称]

⚠️ WORKFLOW CHECKPOINT: 准备进入阶段 [X+1]
---
```

### 用户输入后的继续机制

⚠️ **CRITICAL - 收到用户输入后的处理规则**：

当用户在阶段中提供输入（如回答澄清问题、确认架构方案）后，**MUST 执行以下步骤**：

1. **MUST 确认收到输入**：
```markdown
---
📥 已收到用户输入

⚠️ WORKFLOW CHECKPOINT: 继续阶段 [X] - [阶段名称]
（禁止跳出当前 skill，禁止跳过任何阶段）
---
```

2. **MUST 处理用户输入**：整合到当前阶段的分析中

3. **MUST 继续当前阶段**：完成阶段剩余工作

4. **MUST 完成阶段后才能进入下一阶段**：输出阶段完成标记

5. **CRITICAL - 绝对禁止**：
   - ❌❌❌ 跳出当前 skill（除非用户明确要求）
   - ❌❌❌ 重新评估 skill 触发条件
   - ❌❌❌ 跳过任何阶段（如从阶段 1 直接到阶段 5）
   - ❌❌❌ 在未完成当前阶段时进入下一阶段
   - ❌❌❌ 在收到用户输入后直接开始实施（必须先完成阶段 3 和阶段 4）

### 强制检查点（MANDATORY CHECKPOINTS）

以下检查点是**强制性的**，必须停止并等待用户输入：

**阶段 1 → 2**：
- 完成需求理解后，**MUST 输出阶段完成标记**
- 然后进入阶段 2（代码库探索）
- ❌ 禁止在阶段 1 收到用户输入后直接跳到阶段 2 之后的任何阶段

**阶段 3 → 4（如有澄清问题）**：
- 如果使用了 AskUserQuestion，**MUST 停止并等待用户回应**
- **MUST 收到回应后输出确认标记**（见上方"用户输入后的继续机制"）
- **MUST 继续阶段 3 完成澄清**
- **MUST 输出阶段 3 完成标记**
- 然后才能进入阶段 4
- ❌❌❌ **CRITICAL**：禁止收到用户回应后直接跳到阶段 5（实施）

**阶段 4 → 5（CRITICAL CHECKPOINT）**：
- **⚠️⚠️⚠️ 这是最关键的检查点**
- **MUST 等待用户明确确认架构方案**（必须看到用户回复"确认"、"可以"、"开始实施"等明确同意的词）
- 用户确认前**ABSOLUTELY PROHIBITED 开始实施**（绝对禁止）
- 如果用户要求修改，**MUST 更新设计并重新请求确认**
- **MUST 收到确认后输出确认标记和阶段完成标记**
- ❌❌❌ **CRITICAL**：禁止在用户未确认的情况下开始任何实施工作
- ❌❌❌ **CRITICAL**：禁止假设用户默认同意
- ❌❌❌ **CRITICAL**：禁止在展示架构设计后直接开始实施

**阶段 5 → 6**：
- 实施必须完成
- **MUST 输出阶段完成标记**
- 然后进入阶段 6（质量审查）
- ❌ 禁止在实施中途跳到审查

### 阶段顺序规则

⚠️ **CRITICAL - 严格的阶段执行顺序**：

**必须按此顺序执行**：1 → 2 → 3 → 4 → 5 → 6 → 7

**每个阶段的执行要求**：
1. **阶段 1（需求理解）**：MUST 完成需求分析
2. **阶段 2（代码库探索）**：MUST 完成代码探索和文件阅读
3. **阶段 3（澄清问题）**：MUST 完成问题澄清（如有疑问必须提问）
4. **阶段 4（架构设计）**：MUST 完成设计并**等待用户确认**
5. **阶段 5（实施）**：仅在用户确认后 MUST 完成实施
6. **阶段 6（质量审查）**：MUST 完成代码审查
7. **阶段 7（总结）**：MUST 完成总结

**允许回退（向前回退）**：
- ✅ 阶段 5 发现需求理解有误 → 回退到阶段 3 或 4
- ✅ 阶段 4 用户要求修改设计 → 停留在阶段 4 更新设计
- ✅ 任何阶段发现问题 → 可以回退到之前的阶段重新分析

**❌❌❌ ABSOLUTELY PROHIBITED（绝对禁止的跳跃）**：
- ❌❌❌ 从阶段 1 直接到阶段 5（跳过探索、澄清、设计）
- ❌❌❌ 从阶段 2 直接到阶段 5（跳过澄清和设计）
- ❌❌❌ 从阶段 3 直接到阶段 5（跳过架构设计）
- ❌❌❌ 从阶段 4 直接到阶段 5 而未等待用户确认
- ❌❌❌ 在用户提供输入后跳过多个阶段
- ❌❌❌ 在任何阶段未完成时进入下一阶段

**⚠️ 违反阶段顺序的常见错误模式**：
```
错误模式 1: 阶段 1 → 直接开始代码探索并实施
正确做法: 阶段 1 → 阶段 2 → 阶段 3 → 阶段 4 → [等待确认] → 阶段 5

错误模式 2: 阶段 1 → 用户回复 → 直接实施
正确做法: 阶段 1 → 阶段 2 → 阶段 3 → 阶段 4 → [等待确认] → 阶段 5

错误模式 3: 阶段 4 设计完成 → 直接实施
正确做法: 阶段 4 设计完成 → 请求用户确认 → [停止等待] → 收到确认 → 阶段 5

错误模式 4: 收到用户输入 → 跳出 skill
正确做法: 收到用户输入 → 确认收到 → 继续当前阶段 → 完成后进入下一阶段
```

---

## 输出格式

使用标准化模板输出各阶段结果。详见：[assets/output-template.md](assets/output-template.md)

**重要**：所有输出必须包含阶段标记（见"工作流控制"章节）

---

## 重要原则

1. **全程使用中文**：与用户的所有沟通必须使用中文
2. **严格遵循 CLAUDE.md**：必须阅读并遵守项目规范
3. **主动提问**：不清楚的地方必须澄清（阶段 3）
4. **善用 ultrathink**：复杂分析必须使用 Sequential Thinking（阶段 1 可选、阶段 4 必须）
5. **并行执行**：探索和审查阶段并行启动多个 agents
6. **等待确认**：架构设计确认后才开始实施（阶段 4 → 5）
7. **质量把关**：实施后必须进行代码审查（阶段 6）
8. **不中断工作流**：MCP 工具不可用时立即使用降级方案

---

## 何时使用 ultrathink

### ✅ 应该使用
- 需求涉及多个模块或系统集成
- 需求包含复杂业务逻辑或工作流
- 需求描述模糊或不完整
- 需求之间存在依赖关系或冲突
- **架构设计阶段（阶段 4）- 必须使用**

### ❌ 不需要使用
- 单一、明确的需求
- 简单的 CRUD 操作
- 直接的代码修改
- 需求已经非常清晰且范围明确

---

## 参考文档

### 阶段详细指南
- [阶段 1: 需求理解](references/phase-1-discovery.md)
- [阶段 2: 代码库探索](references/phase-2-exploration.md)
- [阶段 3: 澄清问题](references/phase-3-clarify.md)
- [阶段 4: 架构设计](references/phase-4-design.md)
- [阶段 5: 实施](references/phase-5-implement.md)
- [阶段 6: 质量审查](references/phase-6-review.md)
- [阶段 7: 总结](references/phase-7-summary.md)

### 辅助文档
- [MCP 工具集成指南](references/mcp-tools.md)
- [快速参考](references/quick-reference.md)
- [故障排查指南](references/troubleshooting.md)
- [输出格式模板](assets/output-template.md)

---

## 技术栈支持

本 skill 设计为**语言无关**，适用于但不限于：

**后端**：Node.js、Python、Go、Java、Ruby、PHP、C#、Rust 等
**前端**：React、Vue、Angular、Svelte、纯 JavaScript/TypeScript 等
**全栈**：Next.js、Nuxt、SvelteKit 等
**移动端**：React Native、Flutter、Swift、Kotlin 等
**数据库**：关系型（PostgreSQL、MySQL、SQL Server）、NoSQL（MongoDB、Redis）等

具体实施时，会根据项目的技术栈和 CLAUDE.md 规范调整。
