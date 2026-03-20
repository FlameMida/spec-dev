# MCP 工具集成指南

## 核心原则

**所有功能在无 MCP 环境下完全可用**。Skill 会自动检测 MCP 可用性并智能降级。

## 降级决策流程

```
尝试 MCP 工具
  ↓
成功？
  ├─ 是 → 继续使用 MCP 工具
  └─ 否 → 立即切换降级方案 → 继续工作流（不中断）
```

**重要**：不要因为 MCP 工具不可用而中断工作流程。降级方案提供完整功能。

---

## 工具清单

### 1. context7 - 库文档查询

**用途**：获取最新库文档和 API 参考
**使用阶段**：阶段 2（代码探索）、阶段 4（架构设计）、阶段 5（实施）

#### 调用方式

```
步骤 1: 使用 resolve-library-id 解析库名到 Context7 兼容的 ID
  - libraryName: 库的名称（如 "express", "react", "next.js"）
  - query: 用户的原始问题或任务（用于相关性排序）

步骤 2: 使用 query-docs 查询文档
  - libraryId: 从步骤1获取的库 ID
  - query: 具体的查询问题
```

#### 降级策略

当 context7 不可用时，按以下顺序尝试：

1. **网页搜索**：搜索官方文档
   ```
   Claude Code: WebSearch: "[库名] official documentation 2025"
   Codex: web.search_query: "[库名] official documentation 2025"
   Codex: web.search_query: "[库名] API reference latest version"
   ```

2. **Grep**：搜索项目依赖文件
   ```
   Grep: 搜索 package.json（Node.js）
   Grep: 搜索 项目依赖配置文件（如 package.json, requirements.txt, go.mod, pom.xml）（Go）
   Grep: 搜索 requirements.txt（Python）
   Grep: 搜索 pom.xml（Java）
   ```

3. **Read**：阅读已安装的库文件
   ```
   Read: node_modules/[库名]/README.md
   Read: vendor/[库路径]/README.md
   Read: 项目中已有的类似实现
   ```

#### 降级示例

**场景：需要 Gin 框架的中间件文档**

```bash
# context7 不可用时
1. 网页搜索: "[Web 框架] middleware documentation 2025"
2. Grep: "项目依赖配置文件（如 package.json, requirements.txt, go.mod, pom.xml）" 查找 Gin 版本
3. Read: 已安装库的文档文件

# 获取信息后继续工作流
```

**场景：需要 [ORM] 关联关系的 API**

```bash
# context7 不可用时
1. 网页搜索: "[ORM] associations documentation latest version"
2. Grep: "HasMany|BelongsTo" 查找项目中的关联示例
3. Read: 项目中已有的 model 文件

# 参考现有实现继续
```

---

### 2. exa - 高质量网页搜索和代码示例

**用途**：搜索高质量网页内容、代码示例、最佳实践
**使用阶段**：阶段 1（需求理解）、阶段 4（架构设计）、阶段 6（质量审查）

#### 调用方式

```
exa.web_search_exa:
  - query: 搜索查询
  - numResults: 返回结果数（默认 8）
  - type: 'auto' | 'fast' | 'deep'

exa.get_code_context_exa:
  - query: 代码搜索查询
  - tokensNum: 返回 token 数（1000-50000，默认 5000）
```

#### 降级策略

当 exa 不可用时，使用 **网页搜索** 替代：

```
网页搜索: [相同的查询内容]
```

#### 降级示例

**场景：搜索类似产品实现案例**

```bash
# exa 可用时
exa.web_search_exa: "user authentication flow best practices 2025"

# exa 不可用时
网页搜索: "user authentication flow best practices 2025"
```

**场景：搜索特定功能的代码示例**

```bash
# exa 可用时
exa.get_code_context_exa: "[前端框架] app router authentication example"

# exa 不可用时
网页搜索: "[前端框架] app router authentication example code"
```

**场景：搜索架构模式**

```bash
# exa 可用时
exa.web_search_exa: "microservices event-driven architecture patterns"

# exa 不可用时
网页搜索: "microservices event-driven architecture patterns 2025"
```

**场景：搜索安全漏洞信息**

```bash
# exa 可用时
exa.web_search_exa: "SQL injection prevention Go [ORM] security"

# exa 不可用时
网页搜索: "SQL injection prevention Go [ORM] 2025 security best practices"
```

---

### 3. sequential-thinking - 深度结构化思考（ultrathink）

**用途**：复杂问题的深度分析、架构设计、多步骤推理
**使用阶段**：阶段 1（复杂需求理解）、阶段 4（架构设计，必须使用）

#### 调用方式

```
mcp__sequential-thinking__sequentialthinking:
  - thought: 当前思考步骤
  - thoughtNumber: 当前思考序号
  - totalThoughts: 预估总思考步骤
  - nextThoughtNeeded: 是否需要下一步思考
  - isRevision: 是否修正之前的思考（可选）
  - revisesThought: 修正的思考序号（可选）
```

#### 降级策略

当 sequential-thinking 不可用时，按以下方式处理：

1. **结构化计划**：使用 `update_plan` 或分阶段计划
2. **系统性分解**：在响应中用显式步骤分析
3. **手动推理**：按需求、数据结构、API、服务层、风险逐项展开

#### 降级示例

**场景：架构设计阶段**

```markdown
# sequential-thinking 不可用时

使用结构化计划或在响应中详细分析：

## 步骤 1: 分析需求组件
[识别核心功能模块...]

## 步骤 2: 设计数据结构
[遵循项目规范...]
- Entity 定义
- 关联关系
- 索引设计

## 步骤 3: 设计 API 端点
[遵循项目规范...]
- 端点列表
- 请求/响应结构
- 验证规则

## 步骤 4: 设计服务层架构
[业务逻辑组织...]
- Service 接口
- 依赖注入
- 事务管理

## 步骤 5: 识别风险和边缘情况
[潜在问题...]
- 并发问题
- 数据一致性
- 性能瓶颈

## 步骤 6: 规划实施步骤
[编号的实施计划...]
1. 创建实体和迁移
2. 实施数据访问层
3. ...
```

**场景：复杂需求理解**

```markdown
# sequential-thinking 不可用时

使用思维链分析：

让我逐步分析这个需求：

1. **核心功能识别**
   - 用户提到了 XXX，这意味着需要实现 YYY
   - 关键词 AAA 表明需要 BBB 功能

2. **依赖关系分析**
   - 功能 A 依赖于功能 B
   - 需要先实现 C 才能实现 D

3. **技术选型考量**
   - 考虑到 XXX，应该选择 YYY
   - 现有系统使用 AAA，保持一致性

4. **潜在风险识别**
   - 风险 1: ...
   - 缓解措施: ...

5. **实施优先级**
   - 第一优先级: ...
   - 第二优先级: ...
```

---

## 何时使用 ultrathink（sequential-thinking）

### ✅ 应该使用

- 需求涉及多个模块或系统的集成
- 需求包含复杂的业务逻辑或工作流
- 需求描述模糊或不完整，需要深度分析
- 需求之间存在依赖关系或潜在冲突
- **架构设计阶段（阶段 4）- 必须使用**

### ❌ 不需要使用

- 单一、明确的需求
- 简单的 CRUD 操作
- 直接的代码修改
- 需求已经非常清晰且范围明确

---

## 工具使用最佳实践

### 1. 优先尝试，快速降级

```
永远先尝试 MCP 工具 → 失败立即降级 → 不中断工作流
```

### 2. 记录降级情况

在总结阶段记录：
- 哪些 MCP 工具不可用
- 使用了哪些降级方案
- 降级方案的效果如何

### 3. 组合使用工具

不要只依赖单一工具：
```
context7（API 文档） + exa/网页搜索（代码示例） + `rg`（项目实现）
= 完整的技术理解
```

### 4. 渐进式查询

从广到窄：
```
1. exa/网页搜索: 了解整体架构和模式
2. context7/网页搜索: 查询具体 API 用法
3. `rg`/文件阅读: 查看项目中的具体实现
```

---

## 常见问题

### Q: MCP 工具调用失败怎么办？

A: 可以尝试重试一次，若依就失败则立即切换到降级方案。降级方案提供相同的功能完整性。

### Q: 如何判断是否应该使用 ultrathink？

A: 如果需求分析或架构设计需要多个步骤的推理，使用 ultrathink。简单需求直接分析即可。

### Q: 降级后的结果质量会下降吗？

A: 不会。降级方案经过设计，确保提供相同质量的信息，只是获取方式不同。

### Q: 可以混合使用 MCP 和降级方案吗？

A: 可以。例如 context7 可用就用，exa 不可用就用网页搜索替代。按工具独立决策。
