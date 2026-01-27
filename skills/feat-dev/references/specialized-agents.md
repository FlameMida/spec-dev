# 专门化 Agents (Specialized Agents)

## 概述

本 skill 使用三个外部专门化 agents（位于 `agents/` 目录），每个 agent 负责特定任务，提升整体效率和质量。

## Agents 清单

| Agent | 用途 | 使用阶段 | 并行数量 |
|-------|------|---------|---------|
| **code-explorer** | 深度分析代码库，追踪执行路径，映射架构层次 | 代码库探索 | 2-3 个 |
| **code-architect** | 设计功能架构蓝图，分析现有模式，制定实施方案 | 架构设计 | 1-3 个 |
| **code-reviewer** | 代码审查，识别 bug、安全漏洞、代码质量问题和规范违反 | 质量审查 | 3-5 个 |

## 调用方式

### 基本原则

- 使用 **Task 工具**调用 agents
- **必须显式指定 `model` 参数**（如 `model: "haiku"` 或 `model: "sonnet"`），否则会从父进程继承（使用 sonnet）
- 并行执行时必须设置 `run_in_background: true`
- **必须在单个消息中发起所有并行任务**

### 并行调用（探索和审查阶段）

```markdown
关键要求：必须在单个消息中发起所有 Task 调用

示例（启动 3 个并行 agents）：
1. 在一个消息中发起 3 个 Task 工具调用
2. 每个 Task 设置 run_in_background: true
3. 继续其他工作（如阅读文件）
4. 使用 TaskOutput 收集每个 agent 的结果
```

### 单个调用（架构设计阶段）

```markdown
启动 1 个 agent，阻塞等待结果：
- run_in_background: false（或省略此参数）
- 等待 agent 完成后继续
```

## Agent 详细说明

### code-explorer

**用途**：深度分析代码库，追踪执行路径，映射架构层次，理解设计模式和抽象

**使用阶段**：代码库探索（阶段 2）

**并行策略**：
- 按架构层次分解（数据层、服务层、API 层）
- 按功能模块分解（核心模块、关联模块）
- 按关注点分解（现有实现、错误处理、测试、配置）

**输出要求**：
- 返回 5-10 个关键文件路径
- 识别设计模式和代码风格
- 梳理技术栈和依赖
- 标注必须阅读的文件

**调用示例**：
```markdown
Task(
    subagent_type="spec-dev:code-explorer",
    description="探索数据层架构",
    prompt="分析数据层：实体、数据库模式、数据关联。返回5-10个关键文件路径。",
    model="haiku",
    run_in_background=true,
    enableTaskList=true,      # 可选：启用子任务跟踪
    parentTaskId=task.id      # 父任务ID
)
```

### code-architect

**用途**：设计功能架构蓝图，分析现有模式，制定实施方案

**使用阶段**：架构设计（阶段 4）

**调用模式**：

**模式 1：单方案设计**（简单/中等需求）
- 主进程使用 ultrathink 深度分析
- 启动 1 个 code-architect agent 细化设计
- `run_in_background: false`（阻塞等待）

**模式 2：多方案设计**（复杂需求）
- 并行启动 2-3 个 code-architect agents
- 每个 agent 设计不同的备选方案
- `run_in_background: true`（并行执行）

**输出要求**：
- 数据库设计（实体、表结构、关联、索引）
- API 端点设计（方法、路径、请求/响应、认证）
- 服务层设计（服务接口、依赖关系、业务逻辑）
- 详细实施步骤（编号列表）

**调用示例（单方案）**：
```markdown
Task(
    subagent_type="spec-dev:code-architect",
    description="设计架构方案",
    prompt="[使用结构化上下文模板]",
    model="sonnet",
    run_in_background=false  # 阻塞等待
)
```

**调用示例（多方案）**：
```markdown
# 在单个消息中发起所有 Task 调用：

Task 1: 设计最小改动方案
- description: "设计最小改动架构方案"
- prompt: "[使用结构化上下文模板，方案类型为'最小改动方案']"
- subagent_type: "spec-dev:code-architect"
- model: "sonnet"
- run_in_background: true

Task 2: 设计清晰架构方案
- description: "设计清晰架构方案"
- prompt: "[使用结构化上下文模板，方案类型为'清晰架构方案']"
- subagent_type: "spec-dev:code-architect"
- model: "sonnet"
- run_in_background: true

Task 3: 设计实用平衡方案
- description: "设计实用平衡方案"
- prompt: "[使用结构化上下文模板，方案类型为'实用平衡方案']"
- subagent_type: "spec-dev:code-architect"
- model: "sonnet"
- run_in_background: true
```

### code-reviewer

**用途**：代码审查，识别 bug、安全漏洞、代码质量问题和规范违反

**使用阶段**：质量审查（阶段 6）

**并行策略**：
- 简单需求：1 个 agent（全面审查）
- 复杂需求：3-5 个 agents（每个聚焦特定维度）

**审查维度**：
1. Bug 和逻辑错误 - 功能正确性
2. 代码风格和质量 - 简洁性/DRY/优雅性
3. 项目规范遵循 - CLAUDE.md、架构模式、命名约定
4. 安全性审查 - 注入、XSS、认证授权等（可选）
5. 性能审查 - 查询优化、缓存策略等（可选）

**输出要求**：
- 问题列表
- 每个问题标注严重性（高/中/低）
- 每个问题标注置信度（0-100）
- 改进建议

**调用示例（并行审查）**：
```markdown
# 在单个消息中发起所有 Task 调用：

Task 1: Bug 和逻辑错误审查
- description: "审查Bug和逻辑错误"
- prompt: "审查代码中的Bug、逻辑错误、空值处理等问题。返回问题列表，每个问题标注严重性（高/中/低）和置信度（0-100）。"
- subagent_type: "spec-dev:code-reviewer"
- model: "haiku"
- run_in_background: true
- enableTaskList: true  # 启用子任务跟踪

Task 2: 代码风格和质量审查
- description: "审查代码风格和质量"
- prompt: "审查代码重复、函数复杂度、命名清晰度等质量问题。返回问题列表，每个问题标注严重性和置信度。"
- subagent_type: "spec-dev:code-reviewer"
- model: "haiku"
- run_in_background: true
- enableTaskList: true

Task 3: 项目规范遵循审查
- description: "审查项目规范遵循"
- prompt: "审查是否遵循项目规范（CLAUDE.md等）、架构模式、命名约定等。返回问题列表，每个问题标注严重性和置信度。"
- subagent_type: "spec-dev:code-reviewer"
- model: "haiku"
- run_in_background: true
- enableTaskList: true
```

## 结果收集

使用 **TaskOutput** 工具收集并行 agent 的结果：

```markdown
# 收集所有并行 agents 的结果
results = []
for task_id in parallel_task_ids:
    result = TaskOutput(task_id=task_id, block=true)
    results.append(result)

# 整合结果
integrated_results = integrate(results)
```

## 重要注意事项

1. **必须在单个消息中发起所有并行任务** - 这是最关键的要求
2. **每个 agent 必须返回具体产出** - 文件路径、问题列表、设计方案等
3. **主进程必须亲自阅读关键文件** - 不能仅依赖 agent 的摘要
4. **整合所有 agent 的发现** - 去重、分类、优先级排序
5. **根据复杂度选择合适的并行策略** - 不要过度并行化
