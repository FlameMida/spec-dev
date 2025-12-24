# 阶段 4: 架构设计 (Architecture Design)

## 🎯 目标

设计详细的实施方案,包括数据库设计、API 端点设计、服务层架构和详细的实施步骤。

---

## 阶段标记

**开始时输出**:
```markdown
---
## 🚀 当前阶段:4 - 架构设计
---
```

**结束时输出**(用户确认后):
```markdown
---
✅ 阶段 4 完成

📍 下一阶段:5 - 实施
---
```

---

## MCP 工具使用

### 📚 优先尝试:context7.get-library-docs
**目的**:获取框架的架构指南
**降级方案**:WebSearch

### 🔍 优先尝试:exa.web_search_exa
**目的**:搜索架构模式和设计最佳实践
**降级方案**:WebSearch

---

## 必须使用:code-architect Agent

**Phase 4 核心步骤**:并行启动 2-3 个 code-architect agents 进行深度架构设计。

### 执行方式

**并行执行**(单个消息发起多个 Task,设置 `run_in_background: true`):

```markdown
Task: 设计架构方案
- prompt: "为 [功能] 设计架构蓝图

  方案类型: [最小改动/清晰架构/实用平衡]
  需求: [阶段1的需求理解]
  代码库: [阶段2的探索结果]

  要求:
  1. 数据结构设计(实体、字段、关联、索引)
  2. API 端点设计(方法、路径、请求/响应)
  3. 服务层架构(接口、业务流程、事务管理)
  4. 风险和边缘情况
  5. 详细实施步骤(5-10步)
  6. 返回 5-10 个关键架构参考文件"
- subagent_type: "spec-dev:code-architect"
- run_in_background: true
```

**简单功能**:启动 1 个 agent,设置 `run_in_background: false`

### Agent 输出要求

1. 关键架构文件清单(5-10 个)
2. 完整架构设计(数据库、API、服务层)
3. 架构模式和最佳实践
4. 风险分析
5. 详细实施步骤
6. 方案优劣势分析

---

## 多方案设计(复杂功能推荐)

**何时使用**:功能复杂,有多种实现路径

### 设计 2-3 个备选方案

| 方案 | 核心思想 | 适用场景 |
|------|----------|----------|
| A: 最小改动 | 在现有架构上最小修改 | 快速交付、MVP |
| B: 清晰架构 | 追求最佳实践 | 长期项目、核心功能 |
| C: 实用平衡⭐ | 速度和质量平衡 | 多数情况 |

### 向用户展示方案

```markdown
## 🎯 架构方案设计

### 方案对比

| 维度 | 方案 A | 方案 B | 方案 C⭐ |
|------|--------|--------|---------|
| 开发时间 | 短 | 长 | 中 |
| 代码质量 | 一般 | 优秀 | 良好 |
| 可维护性 | 中等 | 高 | 较高 |

**推荐**:方案 C(实用平衡)

**你希望使用哪个方案?**
```

---

## 单方案设计(简单功能)

**何时使用**:功能简单明确,只有一种合理实现方式

直接设计一个方案,但仍需:
- 说明设计理由
- 标注潜在风险
- 请求用户确认

---

## 设计产出

### 1. 数据库设计

**实体定义示例**:

```
Entity: Dashboard
├─ 字段:
│  ├─ id: 主键,自增整数
│  ├─ user_id: 外键,整数,非空,索引
│  ├─ name: 字符串,最大 100,非空
│  └─ created_at: 时间戳
├─ 索引:
│  └─ idx_user_id: (user_id)
└─ 关联:
   └─ User: 多对一(belongs_to)
```

### 2. API 端点设计

```
| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /api/dashboards | 获取列表 | 必须 |
| POST | /api/dashboards | 创建 | 必须 |
| PUT | /api/dashboards/:id | 更新 | 必须 |
```

**请求/响应结构**:

```
POST /api/dashboards
Request: { "name": string, "description": string }
Response (201): { "id": integer, "name": string, ... }
Error (400/401): { "error": string, "message": string }
```

### 3. 服务层设计

```
Service: DashboardService
Methods:
├─ create(userId, request) → Dashboard
├─ getById(id, userId) → Dashboard
├─ list(userId) → Dashboard[]
└─ update(id, userId, request) → Dashboard

Dependencies:
├─ database: DatabaseConnection
└─ repository: DashboardRepository
```

### 4. 实施步骤

**⚠️ 必须产出**,至少 5-10 个步骤:

```markdown
## 实施步骤

### 步骤 1: 创建实体和数据库schema
**任务**: 创建 Dashboard 实体、数据库迁移文件
**产出**: 实体文件、迁移文件
**验证**: 运行迁移,确认表创建成功

### 步骤 2: 实施数据访问层
**任务**: 创建 Repository,实现 CRUD 方法
**产出**: Repository 文件、基础方法
**验证**: 单元测试通过

[... 继续其他步骤 ...]
```

---

## ⚠️ 等待用户确认(CRITICAL CHECKPOINT)

### 关键规则

**MUST DO**:
1. ✅ 完成架构设计
2. ✅ 向用户展示方案
3. ✅ 明确请求确认:"**我可以开始实施了吗?**"
4. ✅ 等待用户明确回复("确认"、"可以"、"开始"等)
5. ✅ 收到确认后输出阶段完成标记

**ABSOLUTELY PROHIBITED**:
- ❌ 未确认前开始实施
- ❌ 假设用户默认同意
- ❌ 跳过确认步骤

### 确认请求格式

```markdown
## ✅ 准备好实施了吗?

我已经设计了完整的架构方案:

✓ 数据库设计(X 个实体)
✓ API 端点设计(X 个端点)
✓ 服务层设计(X 个服务)
✓ 详细的实施步骤(X 步)

**我可以开始实施了吗?**
```

### 等待用户回应

**⚠️ THIS IS A HARD STOP - DO NOT PROCEED WITHOUT CONFIRMATION**

**必须做**:
- ✅ STOP - 停止所有操作
- ✅ WAIT - 等待用户明确回应
- ✅ 确认后输出阶段完成标记

**绝对禁止**:
- ❌ 确认前开始实施
- ❌ 假设默认同意
- ❌ 跳过确认步骤

### 处理用户反馈

**场景 1:用户明确确认**

```markdown
---
📥 已收到用户确认

✅ 阶段 4 完成

📍 下一阶段:5 - 实施
---
```

**场景 2:用户要求修改**

```markdown
---
📥 已收到用户反馈

⚠️ 继续阶段 4 - 架构设计(更新设计)
---
```

**场景 3:用户回复不明确**

再次请求确认:"**那我可以开始实施了吗?**"

---

## 进入下一阶段

用户确认架构方案后,进入 **阶段 5: 实施**。
