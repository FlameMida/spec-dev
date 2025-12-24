# 阶段 5: 实施 (Implementation)

## 目标

按照架构设计计划实施功能，编写高质量、符合规范的代码。

---

## 前置条件

**必须**：用户已确认阶段 4 的架构方案。

如果用户未确认，返回阶段 4 等待确认。

---

## 使用模型

**推荐模型**：Sonnet

---

## 实施顺序

按照阶段 4 规划的步骤顺序实施，通常为：

### 1. 创建实体和数据库迁移

- 创建 Entity 文件
- 定义字段、类型、约束
- 定义关联关系
- 创建数据库迁移文件
- 运行迁移测试

### 2. 实施数据访问层

- 创建 Repository 接口
- 实现 CRUD 方法
- 实现查询方法
- 添加事务支持

### 3. 实施服务层业务逻辑

- 创建 Service 接口
- 实现业务逻辑方法
- 添加业务验证
- 添加错误处理
- 实现依赖注入

### 4. 创建请求/响应结构

- 创建 DTO（Data Transfer Object）
- 定义请求结构
- 添加验证规则（binding tags）
- 定义响应结构

### 5. 实施控制器

- 创建 Controller 文件
- 实现路由处理函数
- 添加请求验证
- 添加响应格式化
- 添加错误处理

### 6. 注册路由

- 在路由文件中注册端点
- 配置中间件（认证、授权、日志等）
- 分组和版本管理

### 7. 添加验证和错误处理

- 自定义验证规则
- 统一错误响应格式
- 添加日志记录
- 添加性能监控

---

## MCP 工具使用

### 📚 优先尝试：context7.get-library-docs

**目的**：实时查询 API 文档，确保使用最新语法

**使用场景**：
- 不确定某个 API 的用法
- 需要查看参数选项
- 需要了解返回值结构
- 需要查看错误处理方式

**示例**：

```bash
# 查询 ORM 的关联关系用法
context7.resolve-library-id: "gorm"
context7.get-library-docs: "/go-gorm/gorm" mode="code" topic="associations"

# 查询 Web 框架 的验证规则
context7.resolve-library-id: "gin"
context7.get-library-docs: "/gin-gonic/gin" mode="code" topic="validation"
```

**降级方案**：

```bash
# context7 不可用时
1. WebSearch: "ORM associations documentation latest version"
2. Grep: "HasMany|BelongsTo" 查找项目中的关联示例
3. Read: 查找项目中的关联示例
```

### 🔍 优先尝试：exa.get_code_context_exa

**目的**：搜索特定功能的实现示例

**示例查询**：
```
"ORM many-to-many relationship example code"
"Web 框架 custom validation rule implementation"
"context timeout handling example"
```

**降级方案**：
```
WebSearch: [相同查询内容]
```

---

## 实施原则

### 1. 严格遵循 CLAUDE.md 规范

- 代码组织结构
- 命名约定
- 错误处理模式
- 日志记录格式
- 注释风格

### 2. 遵循代码库现有模式

- 查看类似功能的实现
- 保持一致的代码风格
- 复用现有组件和工具函数

### 3. 每完成一个模块及时测试

不要等到所有代码都写完才测试

### 4. 保持代码简洁，避免过度设计

- 不要添加未请求的功能
- 不要过早优化
- 不要创建不必要的抽象
- 只在必要时添加注释

### 5. 安全第一

检查并避免常见安全漏洞：

- ✅ SQL 注入：使用参数化查询（ORM 自动处理）
- ✅ XSS：前端正确转义用户输入
- ✅ CSRF：使用 CSRF token
- ✅ 认证：验证用户身份
- ✅ 授权：验证用户权限
- ✅ 输入验证：验证所有用户输入
- ✅ 敏感信息：不要在日志中记录密码、token 等

---

A: 根据项目要求。如果 CLAUDE.md 要求测试，必须编写。否则可选。

---

## 进入下一阶段

实施完成后，进入 **阶段 6: 质量审查**。

参见：[phase-6-review.md](phase-6-review.md)
