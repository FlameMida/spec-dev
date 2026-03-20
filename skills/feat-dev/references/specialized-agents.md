# 专门化 Agents (Specialized Agents)

## 概述

本 skill 使用三类专门化子代理，每个子代理负责特定任务，提升整体效率和质量。

## Agents 清单

| 子代理类型 | 用途 | 使用阶段 | 并行数量 |
|-------|------|---------|---------|
| **code-explorer** | 深度分析代码库，追踪执行路径，映射架构层次 | 代码库探索 | 2-3 个 |
| **code-architect** | 设计功能架构蓝图，分析现有模式，制定实施方案 | 架构设计 | 1-3 个 |
| **code-reviewer** | 代码审查，识别 bug、安全漏洞、代码质量问题和规范违反 | 质量审查 | 3-5 个 |

## 调用方式

### 基本原则

- Claude Code：使用 **Task 工具**调用 agents
- Codex：使用 `spawn_agent` / `send_input` / `wait_agent`
- 如环境支持，显式指定合适的模型或 agent 类型
- Claude Code 并行执行时必须设置 `run_in_background: true`
- **必须在单个响应中发起所有并行任务**

### 稳定性规则

- **任务必须边界清楚**：每个子代理负责一个清晰主题或维度，但允许在该范围内做创造性分析和延伸
- **默认并发 2 个，最多 3 个**：除非任务天然独立且代码面很大，否则不要再增加
- **关键路径优先主进程处理**：如果下一步立刻依赖结果，不要下放给子代理
- **父进程必须准备上下文**：需求摘要、相关文件、预期输出格式、完成标准必须先写清楚
- **父进程必须验证结果**：不能直接信任子代理结论，必须亲自读关键文件
- **失败后立即收敛**：子代理超时、跑偏、未返回关键文件时，先缩小任务重试 1 次；仍失败则主进程接管
- **完成后及时回收**：Claude 侧收集完结果就停止继续派生；Codex 侧收集完结果后关闭不再需要的 agent

### 平台差异

- **Claude Code**
  - 适合把边车任务放到 `Task`
  - `run_in_background: true` 只用于真正独立的旁路任务
  - 阻塞型任务用单个 agent，避免一边等待一边继续派生更多任务
- **Codex**
  - 可以使用 `spawn_agent`
  - 纯文件读取仍优先考虑 `multi_tool_use.parallel`
  - 依赖当前线程上下文时，优先使用 `fork_context: true`
  - `explorer` 只用于具体代码库问题；开放式设计或综合判断优先用 `default`

### 并行调用（探索和审查阶段）

```markdown
关键要求：必须在单个响应中发起所有并行子任务，且总数默认 2 个，最多 3 个

示例（启动 3 个并行 agents）：
1. 在一个响应中发起 3 个并行子任务
2. Claude Code 使用 `Task` + `run_in_background: true`
3. Codex 使用 `spawn_agent(fork_context=true, ...)`
4. 继续其他工作（如阅读文件）
5. Claude Code 使用 `TaskOutput` 收集结果，Codex 使用 `wait_agent`
```

### 单个调用（架构设计阶段）

```markdown
启动 1 个 agent，阻塞等待结果：
- Claude Code：`run_in_background: false`（或省略）
- Codex：仅在已获用户明确委派许可时启动；需要依赖当前对话时使用 `fork_context: true`，然后立即 `wait_agent`
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
- 每个子任务都要有清晰边界，例如“围绕订单服务入口、依赖关系和关键文件做探索”

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

Codex:
spawn_agent(
    agent_type="explorer",
    fork_context=true,
    message="分析数据层：实体、数据库模式、数据关联。返回5-10个关键文件路径。"
)
```

### code-architect

**用途**：设计功能架构蓝图，分析现有模式，制定实施方案

**使用阶段**：架构设计（阶段 4）

**调用模式**：

**模式 1：单方案设计**（简单/中等需求）
- 主进程使用 ultrathink 深度分析
- 启动 1 个架构子代理细化设计
- `run_in_background: false`（阻塞等待）

**模式 2：多方案设计**（复杂需求）
- 并行启动 2-3 个架构子代理
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

Codex:
spawn_agent(
    agent_type="default",
    fork_context=true,
    message="[使用结构化上下文模板]"
) 后立即 wait_agent
```

**调用示例（多方案）**：
```markdown
# 在单个响应中发起所有并行子任务，默认 2 个，最多 3 个：

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
- 复杂需求：2-3 个 agents（每个聚焦特定维度）

**审查维度**：
1. Bug 和逻辑错误 - 功能正确性
2. 代码风格和质量 - 简洁性/DRY/优雅性
3. 项目规范遵循 - `AGENTS.md` / `CLAUDE.md`、架构模式、命名约定
4. 安全性审查 - 注入、XSS、认证授权等（可选）
5. 性能审查 - 查询优化、缓存策略等（可选）

**输出要求**：
- 问题列表
- 每个问题标注严重性（高/中/低）
- 每个问题标注置信度（0-100）
- 改进建议

**调用示例（并行审查）**：
```markdown
# 在单个响应中发起所有并行子任务：

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
- prompt: "审查是否遵循项目规范（AGENTS.md、CLAUDE.md 等）、架构模式、命名约定等。返回问题列表，每个问题标注严重性和置信度。"
- subagent_type: "spec-dev:code-reviewer"
- model: "haiku"
- run_in_background: true
- enableTaskList: true
```

Codex:
- 优先 `agent_type="default"`；只有具体代码定位类审查才考虑 `explorer`
- 每个审查子代理聚焦一个主维度，允许在该维度内延展到相关风险

## 结果收集

收集并行子代理结果：

```markdown
Claude Code:
- 对每个 task_id 调用 TaskOutput(...)

Codex:
- 对每个 agent id 调用 wait_agent(...)
- 如结果已拿到且后续不用，关闭对应 agent

然后整合结果
```

## 重要注意事项

1. **必须在单个响应中发起所有并行任务** - 这是最关键的要求
2. **每个子代理必须返回具体产出** - 文件路径、问题列表、设计方案等
3. **主进程必须亲自阅读关键文件** - 不能仅依赖子代理的摘要
4. **整合所有子代理的发现** - 去重、分类、优先级排序
5. **根据复杂度选择合适的并行策略** - 不要过度并行化
6. **子代理失败不能阻塞主流程** - 重试一次仍失败则主进程接管
