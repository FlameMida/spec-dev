# spec-dev 漂移守卫（guardrail）

[English](README.md) | 简体中文

阻止"接手者不走 spec-dev 流程、改了代码却不同步 spec"导致的文档漂移。分层防线，工具无关的硬拦截 + Claude/Codex 双侧工具面拦截 + 软提示。

## 一键安装到目标仓库

```bash
node guardrail/install.mjs [--repo <path>] [--no-git-hook] [--no-ci]
```

默认装进当前 git 仓库，幂等可重复运行。安装保留 `docs/` 历史产物原位；明确授权迁移后再单独运行 `node scripts/spec-dev/migrate-to-spec-dev.mjs --repo <path>`，迁移命令不自动提交。

> **在 Codex 沙箱内运行安装器的注意事项**：Codex workspace-write 沙箱强制 git config 与 `.codex/` 只读（防提权），`core.hooksPath` 配置与 `.codex/hooks.json` 在沙箱内会写入失败。请在沙箱外（用户终端）运行安装器；沙箱内只装成功的防线照常生效，版本化的 `.githooks/` 文件本身可正常落盘。

## 模型协作增强

安装器还复制按模型启用的协作增强脚本和唯一规则副本，并合并两端生命周期 hooks。它独立于 spec 发现，不新增拦截门；GPT/Codex、Kimi、GLM 启用，Claude/未知模型不启用。配置、切换与子代理边界见 [模型策略](model-policy.md)。

## 防线分层

| 层 | 机制 | 作用域 | 可绕过性 |
|---|---|---|---|
| 编辑时拦截 · Claude | `.claude/settings.json` PreToolUse hook（退出码 2 阻断）；spec 已在工作区同步则放行 | Claude Code 会话 | 换工具即绕过 |
| 收尾提醒 · Claude | Stop 运行 `--worktree --warn-only` 检查整个工作区（含 shell 写入）；漂移通过 `systemMessage` 提醒，退出码 0，不阻断结束 | Claude Code 会话 | 仅提示 |
| 编辑时拦截 · Codex | `.codex/hooks.json` PreToolUse hook（退出码 2 阻断） | Codex 会话 | 换工具即绕过 |
| 提交时拦截 | 版本化 `.githooks/pre-commit`（`core.hooksPath` 启用；package.json `prepare` 在 install 时自动配置，新 clone 即带闸门） | 所有本地提交，任何编辑工具 | `--no-verify` 可绕过 |
| 推送时拦截 | 版本化 `.githooks/pre-push` 整段复查待推送区间，捕获 `--no-verify` 落下的提交 | 所有本地推送 | `--no-verify` 可绕过 |
| **最后防线** | `.github/workflows/spec-dev-drift-guard.yml` | **所有推送/PR，工具无关** | 需仓库策略将该检查设为必需 |
| 会话自愈 | SessionStart hook → `session-context.mjs`：注入流程义务 + 守卫健康自检（发现 `core.hooksPath` 未启用等问题时要求 agent 当场修复） | Claude / Codex 会话 | 仅提示 |
| 软提示 | `CLAUDE.md` / `AGENTS.md` 守卫段 | 各自 AI 工具 | 仅提示 |

`check-spec-drift.mjs` 是唯一的校验器，入口模式为（`--staged` / `--range` / `--push` / `--hook` / `--worktree`）。

## 判定逻辑

每份 spec 的 frontmatter `spec_dev.covers`（glob）声明它拥有的代码。一批变更命中某 `status: active` spec 的 `covers`、却没同时改动该 spec，即判为漂移。spec 被取代（superseded）时其 covers 退出拦截——后继 spec 必须接管仍存在的路径，否则出现无人守护的真空；取代回写由 spec-dev 的 executing-plans 收尾强制执行。

只有带 frontmatter 且 `status: active` 的 spec 参与判定。默认的一页 spec 不带 frontmatter，不受守卫约束；`draft` 的 spec 也不拦截。

编辑时（`--hook`）的"是否同步"认定包含工作区已有改动（暂存 + 未暂存 + 未跟踪）：**先把 spec 改好，再动覆盖代码即放行**；但工作区脏文件不会扩大触发集，编辑无关文件不受既有漂移影响。显式执行 `node scripts/spec-dev/check-spec-drift.mjs --worktree` 仍严格审计整个工作区，发现漂移返回 2。安装后的 Stop 使用 `--worktree --warn-only`，输出可见提醒并返回 0，旧改动不会阻断本轮只读问答。绕过 PreToolUse 的 shell 写入，可能到显式交付审计或提交时才被阻断。

插件更新后，重新运行 `node guardrail/install.mjs --repo <目标仓库>` 更新已安装副本。安装器只把自身精确匹配的旧阻断 Stop 命令迁移为提醒命令，保留用户自定义 hooks 和配置。业务项目 pre-push 继续保留；只有受保护分支已要求通过区间 CI 检查时，才考虑移除本地这一层。

## 按计划实施时

按计划实施或修订某份带守卫的 spec 时，不需要逐个提交放行：

- 实施期间该 spec 在特性分支上保持 `draft`，守卫只看 `active`，任务提交不会被拦。
- 修订一份已经 `active` 的 spec 时，特性分支的第一次提交把它改回 `draft`；被完全取代的旧 spec 在这次提交置为 `superseded` 并填 `superseded_by`。
- 交付提交把 spec 翻为 `active`，此后的改动重新受守卫保护。

这些状态改动只在特性分支上，主分支在合并前保持原样。任务提交触及的是另一个特性的 active spec 时，守卫照常拦截：行为变了就同步那份 spec，没变就用下面的临时放行。

历史上由任务绑定打过 `Spec-Task` 标记的提交，区间检查会告警放行，不再核验。更新插件后重跑安装器，会移除早先装进 `prepare-commit-msg`、`commit-msg` 的守卫段和 `task-binding` 脚本副本；你自己写的 hook 内容原样保留。

## 临时放行

- 推荐：提交信息留 `Spec-Guard: off <原因>` trailer——pre-push 与 CI 的区间检查会识别并放行该提交（打印计数供人工复核），全链路一致。
- 单次命令：`SPEC_DEV_GUARD=off git commit …`（打印告警后放行；建议同时留 trailer，否则推送/CI 区间检查仍会拦）。
- 纯文档特性无需守卫：`covers` 留 `[]`。

## 取代（superseded）

`superseded` 是生命周期终态、不是放行手段：置 superseded 必须同一变更内填 `superseded_by` 指向后继 spec（仓库根相对路径），后继的 covers 接管旧 spec 仍存在的路径。读到 superseded spec 沿指针跳转后继，不得据其行为规范开展新工作；特性纯删除时先写一份仅含 REMOVED 的轻量后继 spec 记录原因。

## 文件

```
guardrail/
├── check-spec-drift.mjs      # 核心校验器（零依赖）
├── lib/                      # installed shared parsers and Git views
├── session-context.mjs       # SessionStart 上下文注入 + 守卫健康自检
├── install.mjs               # 安装器
└── templates/
    ├── claude-settings.json  # Claude hooks 片段（PreToolUse + Stop + SessionStart）
    ├── codex-hooks.json      # Codex hooks 片段
    ├── pre-commit            # 版本化 git hook（串联 .git/hooks 历史 hook）
    ├── pre-push              # 版本化 git hook（第二道闸）
    ├── github-workflow.yml   # CI
    ├── CLAUDE.md.snippet     # Claude 软提示
    └── AGENTS.md.snippet     # Codex 软提示
```

## 已知边界

- 注入进已有自定义 hooks 目录（如 husky）的 pre-push 守卫段会先捕获 stdin 喂给守卫，再经 `exec <<heredoc` 还原给宿主 hook——宿主脚本仍能读到 refs；极老的不支持 heredoc-`exec` 的 sh 需手工调整。模板版 hook 无此顾虑（先捕获 stdin 再转发）。
- 新 ref 没有可信远端边界时，pre-push 检查其全部可达历史；已有 ref 按各自提交区间检查，不合并不同 ref 的变更集。
