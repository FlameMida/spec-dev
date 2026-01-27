---
name: feat-dev
description: 提供完整的 7 阶段功能开发工作流（需求理解、代码探索、架构设计、实施、审查、总结）。适用于新功能实施、复杂代码修改和重构、API/数据库/服务架构设计、多模块功能开发以及需要代码审查的实施任务。融合 ultrathink 深度分析、MCP 工具增强（context7、exa、sequential-thinking）和并行 agent 执行（code-explorer、code-architect、code-reviewer）。当用户提出功能开发、架构设计或代码重构需求时使用此技能。根据用户设置和输入语言进行交互。
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
- **ultrathink 深度分析**：复杂需求和架构设计阶段使用 sequential-thinking
- **MCP 工具增强**：优先使用 context7、exa、sequential-thinking，自动降级保证可用性
- **并行 agents**：使用专门化 agents（code-explorer、code-architect、code-reviewer）提升效率
- **Task list 自动管理**：进度可视化、工作流透明化、断点恢复
- **自适应语言**：根据用户的 Claude 语言设置和输入语言回应

**手动触发**：
```bash
/feat-dev [功能描述]
```

**详细指南**：
- MCP 工具和降级策略：[references/mcp-tools.md](references/mcp-tools.md)
- 快速参考：[references/quick-reference.md](references/quick-reference.md)
- 故障排查：[references/troubleshooting.md](references/troubleshooting.md)

---

## Task List 集成

本 skill 自动管理任务列表，提供进度可视化、工作流透明化、断点恢复和任务可复用功能。

**详细指南**：[Task List 管理](references/task-list-management.md)

---

## MCP 工具集成

本 skill 优先使用 MCP 工具（context7、exa、sequential-thinking），但**所有功能在无 MCP 环境下完全可用**。

- **MCP 工具和降级策略**：[references/mcp-tools.md](references/mcp-tools.md)

---

## 专门化 Agents

本 skill 使用三个外部专门化 agents（code-explorer、code-architect、code-reviewer）提升效率和质量。

**详细指南**：[专门化 Agents](references/specialized-agents.md)

---

## 7 阶段工作流

### 阶段 1: 需求理解

**目标**：全面理解用户需求

**任务管理**：
```markdown
# 开始阶段时
tasks = TaskList()
task = findTaskBySubject(tasks, "阶段 1: 需求理解")
TaskUpdate(task.id, status="in_progress", owner="feat-dev")

# 完成阶段时
TaskUpdate(task.id, status="completed")
```

**执行要点**：
- 识别核心功能、业务实体、API 端点、业务规则、集成点
- 根据复杂度决定是否使用 ultrathink（sequential-thinking）
- 可选：搜索类似实现案例（exa/WebSearch）

**产出**：需求理解摘要（核心功能、业务实体、API 端点、业务规则、集成点、不确定点）

**详细指南**：[references/phase-1-discovery.md](references/phase-1-discovery.md)

---

### 阶段 2: 代码库探索

**目标**：深入理解现有代码库

**任务管理**：
```markdown
# 开始阶段时
tasks = TaskList()
task = findTaskBySubject(tasks, "阶段 2: 代码库探索")
TaskUpdate(task.id, status="in_progress", owner="feat-dev")

# 完成阶段时
TaskUpdate(task.id, status="completed")
```

**执行要点**：
1. **首要任务**：查找并阅读项目根目录的 CLAUDE.md 文件

2. **并行启动 2-3 个 code-explorer agents**：
   - **必须在单个消息中**发起所有 Task 调用
   - **每个 Task 必须设置** `run_in_background: true`
   - **然后使用 TaskOutput** 收集每个 agent 的结果
   - **Agent 分工**：数据层、业务逻辑层、API 层
   - **并行调用示例和详细指南**：[并行模式指南](../requirement-analysis/references/parallel-patterns.md)

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

**任务管理**：
```markdown
# 开始阶段时
tasks = TaskList()
task = findTaskBySubject(tasks, "阶段 3: 澄清问题")
TaskUpdate(task.id, status="in_progress", owner="feat-dev")

# 用户回应后完成
TaskUpdate(task.id, status="completed")
```

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

**任务管理**：
```markdown
# 开始阶段时
tasks = TaskList()
task = findTaskBySubject(tasks, "阶段 4: 架构设计")
TaskUpdate(task.id, status="in_progress", owner="feat-dev")

# 用户确认后完成（最关键的检查点）
TaskUpdate(task.id, status="completed")
```

**执行要点**：

**步骤 1: 准备结构化上下文**
- **目的**：确保 code-architect agents 获得完整准确的上下文信息
- **整理内容**：
  - 阶段 1 的需求理解结果（核心功能、业务实体、API 端点需求、业务规则、集成点）
  - 阶段 2 的代码库探索发现（CLAUDE.md 规范、项目架构、相关实现、设计模式、必读文件）
  - 阶段 3 的用户澄清和决策（问题、回答、影响）
  - 阶段 2.5 的外部资源研究结果（如适用）
- **使用结构化模板**：参见 [phase-4-design.md](references/phase-4-design.md) 中的完整模板
- **重要性**：避免信息遗漏，提升 architect 输出的准确性和一致性

**步骤 2: 判断需求复杂度并选择设计模式**

根据需求特征判断复杂度：

**简单/中等需求**（使用**模式1：单方案设计**）：
- 单一功能或涉及 2-3 个模块
- 实现路径清晰明确
- 不涉及重大架构变更
- 示例：添加字段、CRUD操作、简单业务流程

**复杂需求**（使用**模式2：多方案设计**）：
满足以下**任一**条件：
- 有**多种明显不同的实现路径**（技术方案差异大）
- 存在**重大架构权衡**（性能vs复杂度、时间vs质量）
- **影响多个核心模块**（3个以上模块需要重大修改）
- **引入新的技术或架构模式**
- **用户明确要求**对比多个方案

**步骤 3: 执行对应的设计模式**

### 模式1：单方案设计（简单/中等需求）

1. **主进程使用 ultrathink 进行深度分析**：
   - 使用 **mcp__sequential-thinking__sequentialthinking 工具**
   - 分析内容：
     - 分解需求组件和依赖关系
     - 分析可能的实现路径
     - 做出关键架构决策
     - 识别主要风险和权衡点
     - 确定推荐的架构方向

2. **启动单个 code-architect agent 细化设计**：
   - 使用步骤1准备的结构化上下文模板
   - 传递 ultrathink 的分析结果
   - 设置 `run_in_background: false`（阻塞等待）
   - Agent 细化：数据库设计、API端点、服务层、实施步骤

3. **读取 agent 推荐的架构文件** - 理解现有架构模式

4. **向用户展示单一方案**：
   - Ultrathink 的深度分析结果
   - Code-architect 的详细设计
   - 完整的实施步骤
   - 请求用户确认

### 模式2：多方案设计（复杂需求）

1. **并行启动 2-3 个 code-architect agents**：
   - **不使用主进程 ultrathink**（agents 会各自进行深度分析）
   - **使用结构化上下文**：将步骤1整理的完整上下文传递给每个 agent
   - **并行执行**：每个 agent 负责设计一个备选方案

   **并行执行要求**（关键）：
   - **必须在单个消息中**发起 2-3 个 Task 工具调用
   - **每个 Task 必须设置** `run_in_background: true`
   - **然后使用 TaskOutput** 收集每个 agent 的结果

   **Agent 方案分工**：
   - Agent 1: 最小改动方案 - 快速交付，最小化风险
   - Agent 2: 清晰架构方案 - 追求最佳实践和长期可维护性
   - Agent 3: 实用平衡方案 - 在速度和质量之间找平衡（通常推荐）

   - **详细调用示例**：[专门化 Agents](../shared/references/specialized-agents.md) 或 [phase-4-design.md](references/phase-4-design.md)

2. **读取所有 agents 推荐的架构文件** - 理解现有架构模式

3. **整合所有方案**：
   - 对比三个方案的优劣势
   - 进行权衡分析（开发时间、代码质量、可维护性、风险）
   - 给出推荐意见及理由

4. **向用户展示多方案对比**：
   - 方案对比表格
   - 每个方案的详细设计
   - 权衡分析
   - 推荐意见及理由
   - 询问用户选择哪个方案

**产出**（根据模式选择）：

**模式1产出**（简单/中等需求）：
- 主进程 ultrathink 的深度分析结果
- 单个 code-architect agent 的详细架构设计
- 读取的架构相关文件理解
- 数据库设计（实体/表结构、字段、关联、索引）
- API 端点设计（方法、路径、请求/响应、认证）
- 服务层设计（服务接口、依赖关系、业务逻辑流程）
- **详细实施步骤**（编号列表，每步明确任务和产出）
- 设计理由和说明
- 用户确认

**模式2产出**（复杂需求）：
- 2-3 个 code-architect agents 的深度架构设计和建议
- 读取的架构相关文件理解
- **多方案对比和权衡分析**（对比表格 + 优劣势分析）
- [针对每个方案] 数据库设计（实体/表结构、字段、关联、索引）
- [针对每个方案] API 端点设计（方法、路径、请求/响应、认证）
- [针对每个方案] 服务层设计（服务接口、依赖关系、业务逻辑流程）
- [针对每个方案] **详细实施步骤**（编号列表，每步明确任务和产出）
- **推荐意见及理由**（基于权衡分析）
- 用户选择确认

**详细指南**：[references/phase-4-design.md](references/phase-4-design.md)

---

### 阶段 5: 实施

**目标**：按照架构设计实施功能

**前置条件**：用户已确认架构方案

**任务管理**：
```markdown
# 开始阶段时
tasks = TaskList()
task = findTaskBySubject(tasks, "阶段 5: 实施开发")
TaskUpdate(task.id, status="in_progress", owner="feat-dev")

# 完成阶段时
TaskUpdate(task.id, status="completed")
```

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

**任务管理**：
```markdown
# 开始阶段时
tasks = TaskList()
task = findTaskBySubject(tasks, "阶段 6: 质量审查")
TaskUpdate(task.id, status="in_progress", owner="feat-dev")

# 完成阶段时
TaskUpdate(task.id, status="completed")
```

**执行要点**：
1. **并行启动 3 个 code-reviewer agents**：
   - **必须在单个消息中**发起所有 Task 调用
   - **每个 Task 必须设置** `run_in_background: true`
   - **然后使用 TaskOutput** 收集每个 reviewer 的结果
   - **Reviewer 分工**：Bug 和逻辑错误、代码风格和质量、项目规范遵循
   - **并行调用示例和详细指南**：[并行模式指南](../requirement-analysis/references/parallel-patterns.md)

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

**任务管理**：
```markdown
# 开始阶段时
tasks = TaskList()
task = findTaskBySubject(tasks, "阶段 7: 总结")
TaskUpdate(task.id, status="in_progress", owner="feat-dev")

# 完成阶段时
TaskUpdate(task.id, status="completed")
# 显示最终进度：100% 完成
```

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

**关键执行规则**：
- 必须严格按照 1→2→3→4→5→6→7 的顺序执行
- 每个阶段必须完整执行，禁止跳过
- 在关键检查点（阶段3→4，阶段4→5）必须等待用户输入

**详细的工作流控制规则**：参见 [references/workflow-control.md](references/workflow-control.md)

**关键检查点**：
- **阶段 3 → 4**：如使用 AskUserQuestion，必须等待用户回应
- **阶段 4 → 5**：最关键检查点 - 必须等待用户明确确认架构方案后才能开始实施
- **阶段 5 → 6**：实施完成后进入审查

---

## 输出格式

使用标准化模板输出各阶段结果。详见：[assets/output-template.md](assets/output-template.md)

**重要**：所有输出必须包含阶段标记（见"工作流控制"章节）

---

## 重要原则

1. **自适应语言交互**：根据用户在 Claude 中的 response language 设置和输入消息的语言与用户沟通（技术术语和代码除外）
2. **严格遵循 CLAUDE.md**：必须阅读并遵守项目规范
3. **主动提问**：不清楚的地方必须澄清（阶段 3）
4. **善用 ultrathink**：复杂分析必须使用 Sequential Thinking
   - 阶段 1：根据复杂度可选
   - 阶段 4：模式1（简单/中等需求）必须使用；模式2（复杂需求）不使用主进程 ultrathink
5. **并行执行**：探索和审查阶段并行启动多个 agents
6. **等待确认**：架构设计确认后才开始实施（阶段 4 → 5）
7. **质量把关**：实施后必须进行代码审查（阶段 6）
8. **不中断工作流**：MCP 工具不可用时立即使用降级方案
9. **善用 Task list**：自动管理任务状态，提供进度可视化和断点恢复能力

---

## 何时使用 ultrathink

### [完成] 应该使用
- **阶段 1（需求理解）**：需求涉及多个模块或系统集成、包含复杂业务逻辑、描述模糊或不完整
- **阶段 4（架构设计）**：
  - **简单/中等需求使用模式1**：主进程必须使用 ultrathink 进行深度分析
  - **复杂需求使用模式2**：不使用主进程 ultrathink（agents 各自进行深度分析）

### [跳过] 不需要使用
- **阶段 1**：单一、明确的简单需求（如简单 CRUD、字段添加等）
- **阶段 4**：复杂需求的多方案设计（使用模式2时，主进程不用 ultrathink）

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

