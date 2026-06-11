---
description: 管理跨会话、可恢复、可验收、可归档的 spec 生命周期工作流
---

# Spec Flow

管理长期任务的 spec 生命周期，工作流围绕 `explore -> plan -> implement -> accept -> archive` 五个 action。

## First Principles

- 把 `/spec-flow ...` 作为唯一用户入口。
- 把 `.specs/bin/spec-flow.mjs` 作为唯一状态写入器。
- 永远不要手改 `.specs/registry.json` 或 `progress.json`。
- 让 markdown 文档承载业务内容，让 runtime 只负责状态与目录。

## Runtime Bootstrap

执行任何会持久化状态的操作前，先检查 `.specs/` 与 `.specs/bin/spec-flow.mjs` 是否存在。不存在时：

1. 创建 `.specs/bin/`、`.specs/active/`、`.specs/archive/`。
2. 将 `${CLAUDE_PLUGIN_ROOT}/skills/spec-flow/assets/runtime/spec-flow-runtime.mjs` 复制到 `.specs/bin/spec-flow.mjs`。
3. 运行 `node .specs/bin/spec-flow.mjs init`。

只有 `/spec-flow init`、首次使用、或 runtime 缺失/损坏时才执行 bootstrap。

> `${CLAUDE_PLUGIN_ROOT}` 指向本插件安装根目录；若该变量在当前环境不可用，先定位插件安装目录（如 `~/.claude/plugins/cache/.../spec-dev/<hash>/`），再以其为根解析本文件中的全部插件资源路径。

## Command Router

每个子命令的行为规范在对应 reference 文件中（路径以 `${CLAUDE_PLUGIN_ROOT}/skills/spec-flow/` 为根），runtime CLI 约定统一见 `references/command-contract.md`：

| 子命令 | 行为规范 | runtime 调用 |
|--------|----------|--------------|
| `init` | 本文件 Runtime Bootstrap 节；输出 runtime 路径、registry 路径与是否新建，不创建 spec | `init` |
| `explore` | `references/action-explore.md` | `new --mode draft`（按需） |
| `plan [spec-id]` | `references/action-plan.md` | `new` / `amend` / `checkpoint` |
| `implement [spec-id]` | `references/action-implement.md` | `checkpoint` |
| `accept [spec-id]` | `references/action-accept.md` | `accept` |
| `archive [spec-id]` | `references/action-archive.md` | `archive` |
| `status [spec-id]` / `resume [spec-id]` | `references/recovery-rules.md`（只读查询，非生命周期 action） | `status` / `resume` |

业务文档模板（spec/plan/acceptance-report/archive-summary）见 `${CLAUDE_PLUGIN_ROOT}/skills/spec-flow/assets/`，各 action 文件内已注明对应模板。
