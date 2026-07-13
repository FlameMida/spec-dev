# spec-dev 漂移守卫（guardrail）

[English](README.md) | 简体中文

阻止"接手者不走 spec-dev 流程、改了代码却不同步 spec"导致的文档漂移。分层防线，工具无关的硬拦截 + Claude/Codex 双侧工具面拦截 + 软提示。

## 一键安装到目标仓库

```bash
node guardrail/install.mjs [--repo <path>] [--no-git-hook] [--no-ci] [--no-migrate]
```

默认装进当前 git 仓库，幂等可重复运行。

> **在 Codex 沙箱内运行安装器的注意事项**：Codex workspace-write 沙箱强制 git config 与 `.codex/` 只读（防提权），`core.hooksPath` 配置与 `.codex/hooks.json` 在沙箱内会写入失败。请在沙箱外（用户终端）运行安装器；沙箱内只装成功的防线照常生效，版本化的 `.githooks/` 文件本身可正常落盘。

## 防线分层

| 层 | 机制 | 作用域 | 可绕过性 |
|---|---|---|---|
| 编辑时拦截 · Claude | `.claude/settings.json` PreToolUse hook（退出码 2 阻断）；spec 已在工作区同步则放行 | Claude Code 会话 | 换工具即绕过 |
| 收尾审计 · Claude | Stop hook 对整个工作区做漂移检查，shell 写入（`sed -i`、`cat >` 等）也逃不掉；同回合只拦一次 | Claude Code 会话 | 换工具即绕过 |
| 编辑时拦截 · Codex | `.codex/hooks.json` PreToolUse hook（退出码 2 阻断） | Codex 会话 | 换工具即绕过 |
| 提交时拦截 | 版本化 `.githooks/pre-commit`（`core.hooksPath` 启用；package.json `prepare` 在 install 时自动配置，新 clone 即带闸门） | 所有本地提交，任何编辑工具 | `--no-verify` 可绕过 |
| 推送时拦截 | 版本化 `.githooks/pre-push` 整段复查待推送区间，捕获 `--no-verify` 落下的提交 | 所有本地推送 | `--no-verify` 可绕过 |
| **最后防线** | `.github/workflows/spec-dev-drift-guard.yml` | **所有推送/PR，工具无关** | **不可绕过** |
| 会话自愈 | SessionStart hook → `session-context.mjs`：注入流程义务 + 守卫健康自检（发现 `core.hooksPath` 未启用等问题时要求 agent 当场修复） | Claude / Codex 会话 | 仅提示 |
| 软提示 | `CLAUDE.md` / `AGENTS.md` 守卫段 | 各自 AI 工具 | 仅提示 |

单一事实源是 `check-spec-drift.mjs`，所有防线全部调它，只是入参模式不同（`--staged` / `--range` / `--push` / `--hook` / `--worktree`）。

## 判定逻辑

每份 spec 的 frontmatter `spec_dev.covers`（glob）声明它拥有的代码。一批变更命中某 `status: active` spec 的 `covers`、却没同时改动该 spec，即判为漂移。

frontmatter 的 `sync_commit` 是交付锚点：最近一次确认代码与本 spec 同步的提交——由 executing-plans 收尾在合并后写入；`git diff <sync_commit>..HEAD -- <covers>` 即此后的代码变化。守卫解析该字段但不参与拦截判定。

编辑时（`--hook`）的"是否同步"认定包含工作区已有改动（暂存 + 未暂存 + 未跟踪）：**先把 spec 改好，再动覆盖代码即放行**；但工作区脏文件不会扩大触发集，编辑无关文件不受既有漂移影响。收尾审计（`--worktree`）以整个工作区为变更集，对回合内绕过工具面写入的文件兜底。

## 临时放行

- 推荐：提交信息留 `Spec-Guard: off <原因>` trailer——pre-push 与 CI 的区间检查会识别并放行该提交（打印计数供人工复核），全链路一致。
- 单次命令：`SPEC_DEV_GUARD=off git commit …`（打印告警后放行；建议同时留 trailer，否则推送/CI 区间检查仍会拦）。
- spec 作废：把 frontmatter `status` 改为 `superseded`。
- 纯文档特性无需守卫：`covers` 留 `[]`。

## 文件

```
guardrail/
├── check-spec-drift.mjs      # 核心校验器（零依赖）
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
- pre-push 对"新分支首推且解析不出 origin 默认分支"的 ref 放行（fail-open），由 CI 兜底。
