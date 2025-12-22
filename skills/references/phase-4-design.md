# 阶段 4: 架构设计 (Architecture Design)

## 🎯 目标

设计详细的实施方案，包括数据库设计、API 端点设计、服务层架构和**详细的实施步骤**。

**重要**：本阶段的所有产出都是**必须的**，不是可选的。特别是详细的实施步骤，这是阶段 5 实施的直接依据。

---

## 阶段标记

**开始时输出**：
```markdown
---
## 🚀 当前阶段：4 - 架构设计
---
```

**结束时输出**（用户确认后）：
```markdown
---
✅ 阶段 4 完成

📍 下一阶段：5 - 实施
---
```

---

## 必须使用 ultrathink

**这是 ultrathink 的必用阶段**。架构设计需要深度思考和多步推理。

---

## MCP 工具使用

### 🧠 必须尝试：sequential-thinking

**目的**：使用 ultrathink 进行深度架构分析

**使用方式**：

```
mcp__sequential-thinking__sequentialthinking 工具进行以下分析：

Thought 1: 分析需求组件
- 将需求拆解为独立的功能模块
- 识别模块间的依赖关系
- 确定实施优先级

Thought 2: 设计数据结构
- 设计实体（Entity）定义
- 设计字段、类型、约束
- 设计关联关系（一对多、多对多等）
- 设计索引和性能优化
- **遵循 CLAUDE.md 规范**

Thought 3: 设计 API 端点
- 列出所有需要的端点
- 设计请求参数和验证规则
- 设计响应格式
- 设计错误处理
- **遵循 CLAUDE.md 规范**

Thought 4: 设计服务层架构
- 设计服务接口
- 设计业务逻辑流程
- 设计依赖注入方式
- 设计事务管理
- **遵循 CLAUDE.md 规范**

Thought 5: 识别风险和边缘情况
- 并发问题
- 数据一致性
- 性能瓶颈
- 安全风险
- 边缘情况处理

Thought 6: 规划实施步骤
- 详细的实施顺序
- 每步的产出
- 每步的验证方式
```

**降级方案**：

如果 sequential-thinking 不可用：

1. **使用 EnterPlanMode**（推荐）
   ```
   EnterPlanMode 进入规划模式
   在规划模式中详细设计架构
   等待用户批准后退出规划模式
   ```

2. **在响应中使用思维链分析**
   ```markdown
   让我系统性地设计架构：

   ## 步骤 1: 分析需求组件
   [详细分析...]

   ## 步骤 2: 设计数据结构
   [详细设计...]

   ## 步骤 3: 设计 API 端点
   [详细设计...]

   [继续后续步骤...]
   ```

### 🔍 优先尝试：exa.web_search_exa

**目的**：搜索架构模式和设计最佳实践

**示例查询**：
```
"microservices authentication architecture patterns"
"database schema design best practices multi-tenant"
"RESTful API design guidelines 2025"
```

**降级方案**：
```
WebSearch: [相同查询内容]
```

### 📚 优先尝试：context7.get-library-docs

**目的**：获取框架的架构指南

**示例**：
```
context7.get-library-docs: "/gin-gonic/gin" mode="info"
context7.get-library-docs: "/vercel/next.js" mode="info"
```

**降级方案**：
```
WebSearch: "Gin framework architecture best practices official documentation"
WebSearch: "Next.js architecture guide official docs 2025"
```

---

## 必须使用：code-architect Agent

**Phase 4 必须执行的步骤**：在完成 ultrathink 分析后，必须启动 code-architect agent 获取专业架构建议。

### 为什么必须使用？

1. **多视角验证**：ultrathink 是自我分析，architect 提供外部视角
2. **发现盲点**：architect 可能识别出 ultrathink 遗漏的架构问题
3. **架构模式**：architect 专注于识别和应用架构模式
4. **文件推荐**：architect 会推荐关键的架构参考文件

### 执行方式

启动 **code-architect agent** 获取详细架构蓝图：

```
Task tool:
- subagent_type: feat-dev:code-architect
- model: sonnet
- prompt: "任务：为 [功能名称] 设计详细的架构蓝图

基于 ultrathink 的分析：
[粘贴 ultrathink 的核心发现]

需求概述：
[阶段 1 的需求理解]

代码库探索结果：
[阶段 2 的探索结果]

澄清的问题：
[阶段 3 的用户反馈]

设计要求：
1. 验证 ultrathink 的设计思路
2. 识别潜在的架构风险
3. 推荐架构模式和最佳实践
4. **返回 5-10 个关键架构参考文件**
5. 如果是复杂功能，提供不同的架构方案选择

请提供完整的架构建议和文件清单。"
```

### Agent 输出要求

code-architect agent 必须返回：
1. **关键架构文件清单**（5-10 个文件）
2. 架构评审意见
3. 推荐的架构模式
4. 潜在风险和改进建议
5. 备选方案（如适用）

### 读取 Architect 推荐的文件

```
# 收集 architect 返回的架构文件列表
Read: path/to/architecture/file1
Read: path/to/architecture/file2
...

# 理解这些文件中的架构模式和设计决策
```

### 整合分析

综合以下三方面：
1. **ultrathink 的深度分析** - 自我思考的结果
2. **code-architect 的专业建议** - 外部视角
3. **架构文件的实际代码** - 项目实践

形成最终的架构设计方案。

---

## 多方案设计（复杂功能推荐）

**何时使用**：
- 功能复杂，有多种实现路径
- 存在明显的权衡（性能 vs 可维护性、快速交付 vs 长期扩展）
- 用户可能有不同的偏好

### 设计 2-3 个备选方案

#### 方案 A：最小改动方案
- **核心思想**：在现有架构上做最小必要的修改
- **优势**：
  - 开发时间最短
  - 风险最低
  - 与现有代码高度一致
- **劣势**：
  - 可能不够优雅
  - 未来扩展性受限
  - 可能累积技术债务
- **适用场景**：快速交付、MVP、临时方案

#### 方案 B：清晰架构方案
- **核心思想**：重新设计架构，追求最佳实践
- **优势**：
  - 代码清晰、易维护
  - 扩展性强
  - 符合最佳实践
- **劣势**：
  - 开发时间较长
  - 可能需要重构现有代码
  - 学习曲线可能较陡
- **适用场景**：长期项目、核心功能、技术重构

#### 方案 C：实用平衡方案（通常推荐）
- **核心思想**：在速度和质量之间找到平衡
- **优势**：
  - 合理的开发时间
  - 可接受的代码质量
  - 保留未来优化空间
- **劣势**：
  - 可能不是最优解
  - 需要仔细权衡
- **适用场景**：多数情况

### 向用户展示方案

```markdown
## 🎯 架构方案设计

我设计了 3 个备选方案，每个方案有不同的权衡：

### 方案对比

| 维度 | 方案 A（最小改动） | 方案 B（清晰架构） | 方案 C（实用平衡）⭐ |
|------|-------------------|-------------------|-------------------|
| **开发时间** | 2-3 天 | 5-7 天 | 3-4 天 |
| **代码质量** | 一般 | 优秀 | 良好 |
| **可维护性** | 中等 | 高 | 较高 |
| **扩展性** | 低 | 高 | 中等 |
| **风险** | 低 | 中 | 低 |

### 我的推荐：方案 C（实用平衡）

**理由**：
1. [具体理由 1]
2. [具体理由 2]
3. [具体理由 3]

**详细设计**：
[展示方案 C 的详细设计...]

---

**你希望使用哪个方案？**
- 方案 A：追求快速交付
- 方案 B：追求最佳架构
- 方案 C：平衡方案（推荐）
- 其他：你有不同的想法？
```

---

## 单方案设计（简单功能）

**何时使用**：
- 功能简单明确
- 只有一种合理的实现方式
- 无明显权衡

直接使用 ultrathink + architect 设计一个方案，但仍需：
- 说明设计理由
- 标注潜在风险
- 请求用户确认

---

## 设计产出

### 1. 数据库设计

**实体定义示例**（遵循 CLAUDE.md）：

#### 实体 1：Dashboard（仪表板）

```
Entity: Dashboard
├─ 字段：
│  ├─ id: 主键，自增整数
│  ├─ user_id: 外键，整数，非空，索引
│  ├─ name: 字符串，最大长度 100，非空
│  ├─ description: 字符串，最大长度 500
│  ├─ is_default: 布尔值，默认 false
│  ├─ created_at: 时间戳
│  ├─ updated_at: 时间戳
│  └─ deleted_at: 时间戳，可为空（软删除）
├─ 索引：
│  ├─ idx_user_id: (user_id)
│  └─ idx_deleted_at: (deleted_at)
└─ 关联：
   ├─ User: 多对一（belongs_to / many-to-one）
   └─ Widgets: 一对多（has_many / one-to-many）
```

#### 实体 2：Widget（组件）

```
Entity: Widget
├─ 字段：
│  ├─ id: 主键，自增整数
│  ├─ dashboard_id: 外键，整数，非空，索引
│  ├─ type: 字符串，最大长度 50，非空
│  ├─ position: 整数，非空
│  ├─ config: 文本（JSON 格式）
│  ├─ created_at: 时间戳
│  ├─ updated_at: 时间戳
│  └─ deleted_at: 时间戳，可为空（软删除）
├─ 索引：
│  ├─ idx_dashboard_id: (dashboard_id)
│  └─ idx_deleted_at: (deleted_at)
└─ 关联：
   └─ Dashboard: 多对一（belongs_to / many-to-one）
```

**数据库迁移**：

根据项目使用的迁移工具创建相应的迁移文件：
- 创建 dashboards 表的迁移
- 创建 widgets 表的迁移
- 确保外键约束正确设置

### 2. API 端点设计

**端点列表**：

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /api/dashboards | 获取用户仪表板列表 | 必须 |
| POST | /api/dashboards | 创建新仪表板 | 必须 |
| GET | /api/dashboards/:id | 获取仪表板详情 | 必须 |
| PUT | /api/dashboards/:id | 更新仪表板 | 必须 |
| DELETE | /api/dashboards/:id | 删除仪表板 | 必须 |
| GET | /api/dashboards/:id/data | 获取仪表板数据 | 必须 |
| POST | /api/dashboards/:id/widgets | 添加组件 | 必须 |
| PUT | /api/dashboards/:id/widgets/:wid | 更新组件 | 必须 |
| DELETE | /api/dashboards/:id/widgets/:wid | 删除组件 | 必须 |

**请求/响应结构**：

```
// POST /api/dashboards - 创建仪表板
Request:
{
  "name": string (必须，最大 100),
  "description": string (可选，最大 500),
  "is_default": boolean (可选)
}

Response (201 Created):
{
  "id": integer,
  "name": string,
  "description": string,
  "is_default": boolean,
  "created_at": timestamp,
  "updated_at": timestamp
}

// GET /api/dashboards/:id - 获取仪表板详情
Response (200 OK):
{
  "id": integer,
  "name": string,
  "description": string,
  "is_default": boolean,
  "widgets": [
    {
      "id": integer,
      "type": string,
      "position": integer,
      "config": object
    }
  ],
  "created_at": timestamp,
  "updated_at": timestamp
}

// Error Response (400/401/403/404/500):
{
  "error": "错误类型",
  "message": "详细错误信息"
}
```

### 3. 服务层设计

**服务接口**：

```
Service: DashboardService

Methods:
├─ CRUD 操作
│  ├─ create(userId, request) → Dashboard
│  ├─ getById(id, userId) → Dashboard
│  ├─ list(userId) → Dashboard[]
│  ├─ update(id, userId, request) → Dashboard
│  └─ delete(id, userId) → void
└─ 业务逻辑
   ├─ getDashboardData(id, userId) → DashboardData
   └─ setAsDefault(id, userId) → void
```

**依赖注入**：

```
Service: DashboardService
Dependencies:
├─ database: DatabaseConnection
├─ widgetRepository: WidgetRepository
└─ dataService: DataService

Constructor:
  new DashboardService(database, widgetRepository, dataService)
```

**业务逻辑流程**：

```
创建仪表板流程：
1. 验证用户权限
2. 验证输入数据
3. 如果 is_default = true：
   a. 查找用户的当前默认仪表板
   b. 将其 is_default 设为 false
4. 创建新仪表板记录
5. 返回创建的仪表板
```

### 4. 实施步骤

**⚠️ 这是必须产出，不是可选项**

详细的实施计划必须包含：
- **至少 5-10 个步骤**（根据功能复杂度）
- 每步必须明确：
  - 具体任务（创建哪些文件、实现哪些功能）
  - 预期产出（代码、配置、测试等）
  - 验证方式（如何确认完成）
- 步骤必须**详细到可以直接执行**
- 步骤必须**按依赖关系排序**（先数据层，后业务层，最后 API 层）

**示例格式**：

```markdown
## 实施步骤（必须产出）

### 步骤 1: 创建实体和数据库schema
**任务**：
- 创建 Dashboard 实体文件（在数据层目录）
- 创建 Widget 实体文件（在数据层目录）
- 创建数据库迁移文件（dashboards 表）
- 创建数据库迁移文件（widgets 表）

**产出**：
- 2 个实体定义文件
- 2 个迁移文件

**验证**：
- 运行迁移，确认表创建成功
- 验证字段类型和约束正确

### 步骤 2: 实施数据访问层
**任务**：
- 创建 Dashboard Repository/DAO
- 创建 Widget Repository/DAO
- 实现 CRUD 方法（Create, Read, Update, Delete）
- 实现查询方法（按用户 ID 查询、按默认状态查询等）

**产出**：
- 2 个 Repository/DAO 文件
- 基础 CRUD 方法
- 自定义查询方法

**验证**：
- 编写并运行单元测试
- 验证数据库操作正确

### 步骤 3: 实施服务层业务逻辑
**任务**：
- 创建 DashboardService
- 实现服务接口方法
- 添加业务验证逻辑
- 实现事务管理
- 处理业务异常

**产出**：
- 服务层实现文件
- 业务逻辑方法
- 错误处理逻辑

**验证**：
- 编写服务层单元测试
- 验证业务规则正确执行

### 步骤 4: 创建请求/响应结构
**任务**：
- 创建 DTO（Data Transfer Object）文件
- 定义创建请求结构（CreateDashboardRequest）
- 定义更新请求结构（UpdateDashboardRequest）
- 定义响应结构（DashboardResponse）
- 添加数据验证规则

**产出**：
- DTO 定义文件
- 验证规则配置

**验证**：
- 验证数据验证规则有效
- 测试序列化/反序列化

### 步骤 5: 实施控制器/路由处理器
**任务**：
- 创建 Dashboard Controller/Handler
- 实现所有端点的处理函数
- 添加请求参数验证
- 实现响应格式化
- 添加错误处理

**产出**：
- Controller/Handler 文件
- 9 个端点处理函数

**验证**：
- 测试每个端点的基本功能
- 验证错误处理

### 步骤 6: 注册路由
**任务**：
- 在路由配置文件中注册所有端点
- 配置认证中间件
- 配置授权中间件（如需要）
- 配置日志中间件
- 设置路由分组

**产出**：
- 更新的路由配置文件
- 中间件配置

**验证**：
- 验证路由注册正确
- 测试中间件生效

### 步骤 7: 添加验证和错误处理
**任务**：
- 添加自定义验证规则（如需要）
- 统一错误响应格式
- 添加日志记录
- 添加性能监控（如需要）

**产出**：
- 验证器文件
- 错误处理中间件
- 日志配置

**验证**：
- 测试各种错误场景
- 验证日志正确记录

### 步骤 8: 集成测试
**任务**：
- 测试完整的请求-响应流程
- 测试并发场景
- 测试边缘情况（空数据、超长输入等）
- 测试权限控制
- 性能测试（如需要）

**产出**：
- 集成测试文件
- 测试报告

**验证**：
- 所有测试通过
- 性能达标
```

**注意**：
- 根据项目的实际架构和技术栈调整文件组织方式
- 文件路径和命名遵循项目的 CLAUDE.md 规范
- 根据项目使用的框架/库调整具体实现细节

---

## 等待用户确认

**关键**：**必须**等待用户明确确认架构方案后才能进入实施阶段（阶段 5）。

### 确认请求格式

输出：

```markdown
## ✅ 准备好实施了吗？

我已经设计了完整的架构方案，包括：

✓ 数据库设计（2 个实体，X 个字段）
✓ API 端点设计（X 个端点）
✓ 服务层设计（X 个服务）
✓ **详细的实施步骤**（X 步，已详细到可直接执行）

这个方案看起来如何？**我可以开始实施了吗？**

如果需要调整，请告诉我需要修改的地方。
```

### 等待用户回应

**必须做的**：
- ✅ 等待用户回应
- ✅ 如果用户确认，输出阶段完成标记并进入阶段 5
- ✅ 如果用户要求修改，更新设计并重新请求确认

**禁止做的**：
- ❌ 在用户确认前开始实施（阶段 5）
- ❌ 假设用户默认同意
- ❌ 跳过用户确认步骤

### 处理用户反馈

**场景 1：用户明确确认**
```markdown
---
📥 已收到用户确认

✅ 阶段 4 完成

📍 下一阶段：5 - 实施
---
```

**场景 2：用户要求修改**
```markdown
---
📥 已收到用户反馈

🔄 继续阶段 4 - 架构设计
---

根据反馈更新设计：
[列出修改内容]

[更新后的设计]

[重新请求确认]
```

**场景 3：用户没有回应**
- 停留在阶段 4
- 不要继续到阶段 5
- 等待用户回应

---

如果需要调整，请告诉我需要修改的地方。
```

---

## 常见问题

### Q: ultrathink 分析需要多少个 thoughts？

A: 通常 6-12 个 thoughts。复杂架构可能需要更多。根据实际情况调整。

### Q: 如果用户提出了架构调整要求怎么办？

A: 更新设计，重新使用 ultrathink 分析调整后的方案，再次请求确认。

### Q: 是否需要设计每个字段的详细信息？

A: 是的。字段类型、约束、索引、默认值等都应该明确。避免实施阶段的歧义。

### Q: 如果 CLAUDE.md 的规范与最佳实践冲突怎么办？

A: 优先遵循 CLAUDE.md。如果确实有问题，在总结阶段建议更新 CLAUDE.md。

---

## 进入下一阶段

用户确认架构方案后，进入 **阶段 5: 实施**。

参见：[phase-5-implement.md](phase-5-implement.md)
