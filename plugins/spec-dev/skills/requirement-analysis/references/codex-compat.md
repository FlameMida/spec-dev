# Codex 兼容指南

> **阅读时机**：仅当运行环境为 Codex 时阅读本文件；Claude Code 环境无需加载。
> 本文件集中收纳 requirement-analysis 在 Codex 环境下的全部专属规则，与 SKILL.md 的 8 阶段流程配合使用——SKILL.md 定义"做什么"，本文件定义 Codex 下"用什么工具做"。

---

## 环境判定

满足以下任一特征即视为运行在 Codex：

- 会话内不存在 `AskUserQuestion`、`TaskCreate`/`TaskUpdate`、`Agent` 等 Claude Code 工具
- 存在 `update_plan`、`spawn_agent`、`wait_agent` 等 Codex 工具
- 系统提示或产品说明中标明 Codex / OpenAI 环境

无法判定时按 Claude Code 规则执行，遇到工具缺失再按本文件映射降级。

---

## 工具映射总表

| 用途 | Claude Code | Codex |
|------|-------------|-------|
| 用户澄清/确认 | `AskUserQuestion`（单题带选项） | 直接用对话消息提问并等待回复（见下文提问规范） |
| 进度跟踪 | `TaskCreate` / `TaskUpdate` | `update_plan` |
| 并行子任务 | `Agent`（单响应一次性发起） | `spawn_agent(fork_context=true, ...)`，需要结果时 `wait_agent` |
| 项目规范文件 | 优先 `CLAUDE.md`，找不到再查 `AGENTS.md` | 优先 `AGENTS.md`，找不到再查 `CLAUDE.md` |
| 网页搜索 | `exa` → `WebSearch` | `web.search_query` / `open` |

---

## 任务管理（Checklist 各项通用）

- 阶段开始：`update_plan` 将该项标记 `in_progress`；阶段完成：标记 `completed`
- 被跳过的项：标记 `completed` 并在 explanation 中注明"已跳过"及原因
- **断点恢复**：检查最近一次 `update_plan`，从最后一个 `in_progress` 或未完成项继续，已完成项不重做
- 任务管理功能不可用时：降级为纯文本阶段进度说明，继续主流程并向用户说明

---

## 提问规范（阶段 3 澄清、阶段 4 方案选定、阶段 5 设计批准、阶段 7 spec review）

Codex 没有结构化提问工具，用普通对话消息提问并等待用户明确回复；不要求用户切换模式，也不依赖环境专有输入工具。

- **保持 SKILL.md 的"一次一个问题"纪律**——每条消息只问一个问题
- 每题尽量提供 2-3 个互斥选项，推荐选项放首位并说明推荐理由与影响
- 没有合适选项时用开放式问题，说明需要用户补充的信息
- 方案选定 / 设计批准 / spec review 三道门同样以对话消息呈现，等待用户明确回复后再继续

---

## 并行子任务（阶段 2 探索及回补探索）

- 使用 `spawn_agent(fork_context=true, ...)` 发起子任务；同组并行任务必须在单个响应中一次性全部发起——分批发起会退化为串行等待
- 需要结果时使用 `wait_agent` 收集
- 子代理失败后先缩小任务范围重试 1 次，仍失败由主进程接管

---

## 外部探索（阶段 2 外部波次）

- 网页搜索：`web.search_query`；打开具体页面用 `open`
- 库文档：无 `context7` 时降级为网页搜索 + `rg` + 文件阅读

---

## 深度思考（阶段 1 分诊、阶段 4 对抗验证与方案设计）

`mcp__sequential-thinking__sequentialthinking` 在 Codex 下同样通过插件 MCP 配置提供；不可用时降级为在回复中显式分点推演（信息质询 → 冲突消解 → 方案对比），不得因工具缺失跳过分析。

---

## 可视化预览（阶段 3 JIT 提议）

visual-preview 的服务器脚本自动检测 `CODEX_CI` 并切换前台模式，正常运行即可、无需额外参数；细节见 visual-preview skill 自身的说明。

---

## spec 审查子代理（阶段 7 对抗验证）

用 `spawn_agent(fork_context=false)` 派发（审查者不应继承主会话立场），提示词按 [spec-reviewer-prompt.md](spec-reviewer-prompt.md) 模板构造，`wait_agent` 收集结果。

---

## git 提交（阶段 6）

Codex 沙箱可能限制写权限：`git commit` 失败时向用户说明并请其授权或自行提交，spec 文件本身照常落盘。
