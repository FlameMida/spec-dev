# 阶段 2: 代码库探索 (Codebase Exploration)

## 目标

深入理解现有代码库的架构、模式和规范,为实施做好准备。

---

## 首要任务:查找 CLAUDE.md

**必须首先执行**:

```bash
Read: /path/to/project/CLAUDE.md
```

**CLAUDE.md 包含**:项目架构规范、代码组织约定、API 设计规范、数据库设计规范、依赖注入模式、测试要求等

**如果不存在**:通过代码探索推断规范,在总结阶段建议创建 CLAUDE.md

---

## 并行 Agent 执行

启动 **2-3 个 code-explorer agents** 并行探索不同层面:

### Agent 示例(根据需要调整探索焦点)

```
Task:
- subagent_type: spec-dev:code-explorer
- model: haiku
- prompt: "探索 [实体层/服务层/API层]

  要求:
  1. 查找现有实现
  2. 识别组织模式和命名规范
  3. 查找可参考的实现
  4. **返回 5-10 个关键文件路径**

  关注点:
  - 文件位置和命名规范
  - 设计模式和架构
  - 依赖注入和错误处理"
- run_in_background: true
```

**建议分工**:
- Agent 1: 探索实体和数据模型
- Agent 2: 探索服务层和业务逻辑
- Agent 3: 探索 API 层和控制器

---

## Agent 输出要求

**关键要求**:每个 agent 必须返回 **5-10 个关键文件路径**

```markdown
### ⭐ 关键文件清单(必须,5-10 个)
1. `/path/to/file1.ext` - [为什么这个文件重要]
2. `/path/to/file2.ext` - [为什么这个文件重要]
...
```

**文件选择标准**:包含核心业务逻辑、定义关键抽象、展示项目模式、新功能必须参考的文件

---

## 读取 Agent 识别的文件

**必须执行**:主进程必须亲自阅读 agents 返回的所有关键文件

```
1. 收集所有 agents 返回的文件列表
2. 去重合并
3. 批量读取:Read: /path/to/file1, Read: /path/to/file2, ...
4. 分析理解:识别命名约定、设计模式、代码风格
```

---

## MCP 工具使用

### 优先尝试:context7.get-library-docs

**目的**:获取项目依赖库的最新文档和 API 参考

```
1. context7.resolve-library-id: "库名"
2. context7.get-library-docs: "/库路径" mode='code/info'
```

**降级方案**:WebSearch + Grep + Read

### 优先尝试:exa.get_code_context_exa

**目的**:搜索特定框架/库的代码示例
**降级方案**:WebSearch

---

## 汇总探索结果

```markdown
## 🔍 阶段 2: 代码库探索结果

### CLAUDE.md 规范
[存在/不存在]
关键规范要点: [...]

### 项目架构
- **实体层**: [位置和模式]
- **服务层**: [位置和模式]
- **API 层**: [位置和模式]

### 相关组件
- **实体**: `/path/to/entity.ext` - [描述]
- **服务**: `/path/to/service.ext` - [描述]
- **控制器**: `/path/to/controller.ext` - [描述]

### 识别的设计模式
- **依赖注入**: [方式]
- **错误处理**: [模式]
- **数据验证**: [方式]

### 技术栈确认
- **框架**: [名称和版本]
- **ORM**: [名称和版本]
- **数据库**: [类型]
```

---

## 进入下一阶段

完成代码库探索后,进入 **阶段 3: 澄清问题**。
