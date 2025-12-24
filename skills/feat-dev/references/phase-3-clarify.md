# 阶段 3: 澄清问题 (Clarifying Questions)

## 目标

填补需求空白，解决模糊和歧义，确保实施方向正确。

---

## 何时提问

在以下情况下**必须**使用 **AskUserQuestion 工具**向用户提问：

### ✅ 必须澄清的情况

1. **模糊或规格不足的需求**
   - 需求描述不够具体
   - 缺少关键业务规则
   - 边缘情况处理不明确

2. **多个有效实施方法**
   - 有多种技术方案可选
   - 不同方案有不同的权衡
   - 用户偏好会影响选择

3. **业务规则细节**
   - 验证规则的具体要求
   - 权限控制的粒度
   - 数据处理的特殊逻辑

4. **与现有功能的关系**
   - 是否应该复用现有组件
   - 是否需要保持向后兼容
   - 是否应该重构现有代码

5. **技术选型或架构决策**
   - 认证方式选择（JWT vs Session）
   - 存储方式选择（Redis vs 数据库）
   - 通信方式选择（WebSocket vs SSE）

### ❌ 不需要澄清的情况

- 需求已经非常明确
- 有明显的最佳实践可遵循
- CLAUDE.md 或项目规范已经规定
- 可以从现有代码推断出模式

---

## 使用 AskUserQuestion 工具

### 工具用法

```
AskUserQuestion:
  questions: [
    {
      question: "完整的问题？",
      header: "简短标签（≤12字符）",
      options: [
        {
          label: "选项 1",
          description: "选项 1 的说明和影响"
        },
        {
          label: "选项 2",
          description: "选项 2 的说明和影响"
        }
      ],
      multiSelect: false  // true 表示可多选
    }
  ]
```

### 最佳实践

#### 1. 一次提问多个问题

一次提出多个问题，尽可能详细的了解整个需求。

#### 2. 提供具体的选项

给出 2-4 个具体选项，而不是开放式问题，根据具体问题的复杂度可以适当增加选项。

#### 3. 说明每个选项的影响

让用户了解选择的后果和权衡。

#### 4. 推荐首选方案

如果有推荐的选项，放在第一位并标注 "(推荐)"。

---

## 示例场景

### 场景 1: 认证方式选择

```
AskUserQuestion:
  questions: [
    {
      question: "用户认证应该使用哪种方式？",
      header: "认证方式",
      options: [
        {
          label: "JWT Token (推荐)",
          description: "无状态，适合分布式系统。Token 存储在客户端，服务器无需维护会话。"
        },
        {
          label: "Session",
          description: "传统方式，需要服务器端会话存储。适合单体应用，更容易管理用户登录状态。"
        }
      ],
      multiSelect: false
    }
  ]
```

### 场景 2: 数据同步策略

```
AskUserQuestion:
  questions: [
    {
      question: "用户数据更新后，如何同步到前端？",
      header: "数据同步",
      options: [
        {
          label: "轮询 (推荐)",
          description: "客户端定期请求数据。实现简单，但可能有延迟。适合更新不频繁的场景。"
        },
        {
          label: "WebSocket",
          description: "实时双向通信。即时更新，但需要维护长连接。适合实时性要求高的场景。"
        },
        {
          label: "Server-Sent Events",
          description: "服务器主动推送。单向通信，比 WebSocket 简单。适合只需要服务器推送的场景。"
        }
      ],
      multiSelect: false
    }
  ]
```

### 场景 3: 权限控制粒度

```
AskUserQuestion:
  questions: [
    {
      question: "权限控制应该到什么粒度？",
      header: "权限粒度",
      options: [
        {
          label: "角色级别 (推荐)",
          description: "基于用户角色（管理员、用户等）控制。实现简单，易于管理。"
        },
        {
          label: "资源级别",
          description: "针对每个资源单独授权。更灵活，但管理复杂度高。"
        },
        {
          label: "字段级别",
          description: "控制到具体字段的访问。最细粒度，实现和维护成本最高。"
        }
      ],
      multiSelect: false
    }
  ]
```

### 场景 4: 多个相关问题

```
AskUserQuestion:
  questions: [
    {
      question: "是否需要支持文件上传？",
      header: "文件上传",
      options: [
        {
          label: "需要",
          description: "用户可以上传头像、附件等文件"
        },
        {
          label: "不需要",
          description: "暂时不支持文件上传功能"
        }
      ],
      multiSelect: false
    },
    {
      question: "如果需要文件上传，应该存储在哪里？",
      header: "存储位置",
      options: [
        {
          label: "对象存储 (推荐)",
          description: "使用 S3/OSS 等对象存储。适合生产环境，可扩展性好。"
        },
        {
          label: "本地文件系统",
          description: "存储在服务器本地。实现简单，但不适合分布式部署。"
        }
      ],
      multiSelect: false
    }
  ]
```

### 场景 5: 功能范围确认

```
AskUserQuestion:
  questions: [
    {
      question: "这个功能需要包含哪些操作？",
      header: "功能范围",
      options: [
        {
          label: "创建",
          description: "允许用户创建新的记录"
        },
        {
          label: "读取",
          description: "允许用户查看记录"
        },
        {
          label: "更新",
          description: "允许用户修改记录"
        },
        {
          label: "删除",
          description: "允许用户删除记录"
        }
      ],
      multiSelect: true  // 可多选
    }
  ]
```

---

## 处理用户反馈

### 1. 记录用户选择

将用户的回答记录在笔记中，供后续阶段参考。

### 2. 更新需求理解

基于用户反馈，更新阶段 1 的需求理解。

### 3. 补充到架构设计

将澄清的细节纳入阶段 4 的架构设计。

### 4. 继续工作流

**重要**：收到用户反馈后，必须明确继续当前 skill 的工作流：

```markdown
---
📥 已收到用户反馈

🔄 继续阶段 3 - 澄清问题
---

### 用户反馈
- **[主题 1]**：[用户的选择/回答]
- **[主题 2]**：[用户的选择/回答]

已更新需求理解。

---
✅ 阶段 3 完成

📍 下一阶段：4 - 架构设计
---
```

**禁止**：
- ❌❌❌ **CRITICAL**：收到用户反馈后直接跳到阶段 5（实施）
- ❌❌❌ **CRITICAL**：跳过阶段 4（架构设计）
- ❌❌❌ **CRITICAL**：在未完成阶段 3 时进入下一阶段
- ❌❌❌ **CRITICAL**：收到用户反馈后跳出当前 skill

**⚠️ MANDATORY CHECKPOINT（强制检查点）**：
```markdown
如果在阶段 3 使用了 AskUserQuestion：

1. MUST 停止并等待用户回应
2. 收到回应后 MUST 输出：
   ---
   📥 已收到用户反馈

   ⚠️ WORKFLOW CHECKPOINT: 继续阶段 3 - 澄清问题
   （禁止跳出当前 skill，禁止跳过阶段 4）
   ---

3. MUST 处理用户反馈并更新需求理解
4. MUST 完成阶段 3 并输出完成标记（见下方）
5. 然后才能进入阶段 4
```

---

## 输出示例

### 有需要澄清的情况

```markdown
## ❓ 阶段 3: 澄清问题

我发现以下几点需要确认：

1. **认证方式**：用户登录应该使用哪种认证方式？
2. **数据同步**：数据更新后如何同步到前端？
3. **权限控制**：权限控制应该到什么粒度？

[使用 AskUserQuestion 工具提问]

---

### 用户反馈

- **认证方式**：JWT Token
- **数据同步**：轮询（每 30 秒）
- **权限控制**：角色级别

已更新需求理解和架构设计计划。
```

### 无需澄清的情况

```markdown
## ❓ 阶段 3: 澄清问题

经过分析，需求描述清晰，项目规范完善，无需额外澄清。

可以直接进入架构设计阶段。
```

---

## 进入下一阶段

完成问题澄清后，进入 **阶段 4: 架构设计**。

参见：[phase-4-design.md](phase-4-design.md)
