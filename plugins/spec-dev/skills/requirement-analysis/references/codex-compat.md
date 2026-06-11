# Codex 兼容指南

> **阅读时机**：仅当运行环境为 Codex 时阅读本文件；Claude Code 环境无需加载。
> 本文件集中收纳 requirement-analysis 在 Codex 环境下的全部专属规则，与 SKILL.md 的 9 阶段流程配合使用——SKILL.md 定义"做什么"，本文件定义 Codex 下"用什么工具做"。

---

## 环境判定

满足以下任一特征即视为运行在 Codex：

- 会话内不存在 `AskUserQuestion`、`TaskCreate`/`TaskUpdate`/`TaskList`、`Agent` 等 Claude Code 工具
- 存在 `update_plan`、`spawn_agent`、`wait_agent` 等 Codex 工具
- 系统提示或产品说明中标明 Codex / OpenAI 环境

无法判定时按 Claude Code 规则执行，遇到工具缺失再按本文件映射降级。

---

## 工具映射总表

| 用途 | Claude Code | Codex |
|------|-------------|-------|
| 用户澄清/确认 | `AskUserQuestion` | 直接用对话消息提问并等待回复（见下文提问规范） |
| 进度跟踪 | `TaskList` / `TaskUpdate` | `update_plan`，并在对话中输出阶段进度块 |
| 并行子任务 | `Agent`（后台加 `run_in_background: true`，完成通知自动送达） | `spawn_agent(fork_context=true, ...)`，需要结果时 `wait_agent` |
| 项目规范文件 | 优先 `CLAUDE.md`，找不到再查 `AGENTS.md` | 优先 `AGENTS.md`，找不到再查 `CLAUDE.md` |
| 网页搜索 | `exa` → `WebSearch` | `web.search_query` / `open` |

---

## 任务管理（各阶段通用）

每个阶段开始/结束时：

- 开始阶段：调用 `update_plan`，将当前阶段标记为 `in_progress`
- 完成阶段：调用 `update_plan`，将当前阶段标记为 `completed`
- 同时在对话中输出阶段进度块（格式见 [task-list-management.md](task-list-management.md)）

**条件执行阶段的跳过处理**（如阶段 3 外部资源研究）：

- `update_plan` 将该阶段标记为 `completed`
- 在 explanation 或进度消息中注明"已跳过"及原因

**断点恢复**：

- 检查最近一次 `update_plan` 和阶段进度消息
- 从最后一个 `in_progress` 或未完成阶段继续

**任务管理功能不可用时**：降级为纯文本阶段进度说明，继续执行主流程，并向用户说明情况。

---

## 提问规范（阶段 4 澄清、阶段 6 计划确认、阶段 8 审查处理）

Codex 没有结构化提问工具，用普通对话消息提问并等待用户明确回复；不要要求用户切换模式，也不要依赖环境专有输入工具。

提问格式约束：

- 一次提出相关的一组问题，每题尽量提供 2-3 个互斥选项
- 推荐选项放在第一位，并说明推荐理由与影响
- 需要多选时，将多选拆成多个单选问题或多个"是否启用 X"的二选一问题
- 没有合适选项时，用开放式问题说明需要用户补充的信息

阶段 6 的计划确认与阶段 8 的审查处理同样适用：直接发送确认问题并等待用户明确回复后再继续。

---

## 并行子任务（阶段 2 探索、阶段 8 审查）

- 使用 `spawn_agent(fork_context=true, ...)` 发起子任务；同组并行任务必须在单个响应中一次性全部发起——分批发起会退化为串行等待，丧失并行收益
- 需要结果时使用 `wait_agent` 收集
- 子代理失败后先缩小任务范围重试 1 次，仍失败由主进程接管

---

## 规范文件优先级

Codex 下查找项目规范文件的顺序：`AGENTS.md` → `CLAUDE.md` → 其他规范文件。两者并存且内容冲突时，以 `AGENTS.md` 为准（Codex 生态的标准约定）。

---

## 外部资源研究（阶段 3）

- 网页搜索：`web.search_query`；打开具体页面用 `open`
- 库文档：无 `context7` 时降级为网页搜索 + `rg` + 文件阅读
