# 阶段 2: 代码库探索 (Codebase Exploration)

## 目标

深入理解现有代码库的架构、模式和规范，为实施做好准备。

---

## 首要任务：查找 CLAUDE.md

**必须首先执行**：

```bash
# 在项目根目录查找 CLAUDE.md
Read: /path/to/project/CLAUDE.md
```

**CLAUDE.md 包含**：
- 项目架构规范
- 代码组织约定
- API 设计规范
- 数据库设计规范
- 依赖注入模式
- 测试要求
- 等等...

**如果 CLAUDE.md 不存在**：
- 记录下来
- 通过代码探索推断规范
- 在总结阶段建议创建 CLAUDE.md

---

## 并行 Agent 执行

启动 **2-3 个 code-explorer agents** 并行探索不同层面：

### Agent 1: 探索相关实体和数据模型

```
Task tool:
- subagent_type: feat-dev:code-explorer
- model: haiku
- prompt: "任务：探索与 [功能名称] 相关的实体定义和数据模型

具体要求：
1. 查找现有的实体定义（Entity/Model 文件）
2. 识别数据库表结构和关联关系
3. 查找数据库迁移文件
4. 识别命名约定和组织模式
5. 列出可以参考的实体实现

关注点：
- 实体文件位置和命名规范
- 字段定义模式（类型、验证、默认值）
- 关联关系定义方式（一对多、多对多等）
- JSON 序列化/反序列化模式
- 数据库标签和约束"

- run_in_background: true
```

### Agent 2: 探索服务层和业务逻辑

```
Task tool:
- subagent_type: feat-dev:code-explorer
- model: haiku
- prompt: "任务：探索与 [功能名称] 相关的服务层实现和业务逻辑

具体要求：
1. 查找现有的服务层文件（Service/Repository）
2. 识别业务逻辑组织模式
3. 查找依赖注入和初始化方式
4. 识别事务管理模式
5. 列出可以参考的服务实现

关注点：
- 服务接口定义模式
- 依赖注入方式（构造函数、字段注入等）
- 错误处理模式
- 日志记录约定
- 数据访问层（DAL）模式"

- run_in_background: true
```

### Agent 3: 探索 API 层和控制器

```
Task tool:
- subagent_type: feat-dev:code-explorer
- model: haiku
- prompt: "任务：探索与 [功能名称] 相关的 API 端点和控制器

具体要求：
1. 查找现有的控制器/路由处理器
2. 识别路由注册模式
3. 查找请求/响应结构定义
4. 识别中间件使用模式
5. 列出可以参考的 API 实现

关注点：
- 路由定义和组织方式
- 请求验证模式
- 响应格式约定
- 认证和授权中间件
- 错误响应格式"

- run_in_background: true
```

---

## Agent 输出要求

**关键要求**：每个 agent 必须返回 **5-10 个关键文件路径**。

### Agent 输出格式

```markdown
## 代码探索报告：[探索层面]

### ⭐ 关键文件清单（必须提供，5-10 个）
1. `path/to/file1.ext` - [为什么这个文件重要，主进程阅读它能了解什么]
2. `path/to/file2.ext` - [为什么这个文件重要]
3. `path/to/file3.ext` - [为什么这个文件重要]
...（至少 5 个，最多 10 个）

**文件选择标准**：
- 包含核心业务逻辑的文件
- 定义关键抽象和接口的文件
- 展示项目模式和约定的代表性文件
- 新功能开发必须参考的文件

[其余分析内容...]
```

### 为什么需要返回文件列表？

1. **Context 优化**：Agents 探索消耗大量 context，但只需返回路径
2. **人类判断**：主进程通过阅读文件形成自己的理解，而不是完全依赖 agent 总结
3. **信息完整性**：Agent 总结可能遗漏细节，读原文件确保完整性
4. **建立深度理解**：只有真正阅读代码才能理解模式和抽象

---

## 读取 Agent 识别的文件

**必须执行**：等待所有 agents 完成后，**主进程必须亲自阅读这些文件**。

### 读取流程

```markdown
1. 收集所有 agents 返回的文件列表
   - Agent 1 返回：5-10 个数据层文件
   - Agent 2 返回：5-10 个业务层文件
   - Agent 3 返回：5-10 个 API 层文件

2. 去重合并文件列表（可能有重复）

3. 批量读取文件
   使用 Read 工具逐个读取：
   ```
   Read: path/to/file1
   Read: path/to/file2
   Read: path/to/file3
   ...
   ```

4. 分析理解
   - 识别命名约定
   - 理解设计模式
   - 发现代码风格
   - 提取可复用的模式
```

### 整合理解

读取所有文件后，形成综合理解：
- 不是简单复述 agent 报告
- 基于亲自阅读的文件内容
- 识别 agents 可能遗漏的细节
- 形成对代码库的深度理解

---

## MCP 工具使用

### 优先尝试：context7.get-library-docs

**目的**：获取项目依赖库的最新文档和 API 参考

**使用场景**：
- 需要了解框架的使用方式
- 需要查询库的 API 文档
- 需要了解库的最佳实践

**调用步骤**：
```
1. context7.resolve-library-id: 解析库名（如 "gin"、"gorm"、"next.js"）
2. context7.get-library-docs: 获取文档
   - mode='code': 获取 API 参考和代码示例
   - mode='info': 获取概念指南和架构信息
```

**降级方案**：
```
1. WebSearch: "[库名] official documentation 2025"
2. Grep: 搜索项目依赖文件
   - package.json（Node.js）
   - 项目依赖配置文件（如 package.json, requirements.txt, go.mod, pom.xml）（Go）
   - requirements.txt（Python）
   - pom.xml（Java）
3. Read: 阅读已安装的库文件
   - node_modules/[库名]/README.md
   - vendor/[库路径]/README.md
```

**示例**：

```bash
# 查询 Web 框架 框架文档
context7.resolve-library-id: "gin"
context7.get-library-docs: "/gin-gonic/gin" mode="code"

# 如果 context7 不可用
WebSearch: "Web 框架 framework documentation 2025"
Grep: "项目依赖配置文件（如 package.json, requirements.txt, go.mod, pom.xml）" 查找 Web 框架 版本
Read: 已安装库的文档文件
```

### 优先尝试：exa.get_code_context_exa

**目的**：搜索特定框架/库的代码示例

**示例查询**：
```
"Web 框架 framework middleware authentication example"
"ORM many-to-many relationship Go code"
"Next.js API route with authentication"
```

**降级方案**：
```
WebSearch: [相同查询内容]
```

---

## 汇总探索结果

等待所有 agents 完成后，汇总结果：

### 1. 收集 Agent 报告

使用 TaskOutput 工具获取每个 agent 的输出：

```
TaskOutput: [agent-1-task-id]
TaskOutput: [agent-2-task-id]
TaskOutput: [agent-3-task-id]
```

### 2. 读取 Agent 识别的文件

**这是关键步骤**：主进程必须亲自阅读 agents 返回的所有关键文件。

```
# 收集文件列表
从 3 个 agents 的报告中提取所有推荐的关键文件

# 批量读取
Read: path/to/file1
Read: path/to/file2
Read: path/to/file3
...（15-30 个文件，取决于 agent 推荐）
```

### 3. 整合发现

基于 **agent 报告** 和 **亲自阅读的文件**，综合形成理解：

```markdown
## 🔍 阶段 2: 代码库探索结果

### CLAUDE.md 规范
[存在/不存在]

关键规范要点：
- [规范 1]
- [规范 2]
- ...

### 项目架构
- **实体层**：[位置和模式]
- **服务层**：[位置和模式]
- **API 层**：[位置和模式]

### 相关组件
- **实体**：
  - `path/to/entity1.{ext}` - [描述]
  - `path/to/entity2.{ext}` - [描述]

- **服务**：
  - `path/to/service1.{ext}` - [描述]
  - `path/to/service2.{ext}` - [描述]

- **控制器**：
  - `path/to/controller1.{ext}` - [描述]
  - `path/to/controller2.{ext}` - [描述]

### 识别的设计模式
- **依赖注入**：[方式]
- **错误处理**：[模式]
- **数据验证**：[方式]
- **响应格式**：[约定]

### 必读文件清单
1. `path/to/file1` - [为什么要读]
2. `path/to/file2` - [为什么要读]
3. ...

### 技术栈确认
- **框架**：[框架名和版本]
- **ORM**：[ORM 名和版本]
- **数据库**：[数据库类型]
- **其他关键依赖**：[列表]
```

---

## 常见问题

### Q: 没有找到 CLAUDE.md 怎么办？

A: 通过代码探索推断规范，记录发现的模式，在总结阶段建议创建 CLAUDE.md。

### Q: Agents 发现的信息相互矛盾怎么办？

A: 亲自阅读相关文件验证，以实际代码为准。记录不一致的地方在阶段 3 向用户确认。

### Q: 代码库太大，探索时间很长怎么办？

A: 聚焦于与当前功能最相关的部分。可以在实施阶段按需探索更多细节。

### Q: 项目使用了不熟悉的框架怎么办？

A: 优先使用 context7 或 WebSearch 查询框架文档，然后参考项目中已有的实现。

---

## 进入下一阶段

完成代码库探索后，进入 **阶段 3: 澄清问题**。

参见：[phase-3-clarify.md](phase-3-clarify.md)
