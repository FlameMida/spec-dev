# spec-dev 漂移守卫（guardrail）

阻止"接手者不走 spec-dev 流程、改了代码却不同步 spec"导致的文档漂移。分层防线，工具无关的硬拦截 + Claude/Codex 双侧工具面拦截 + 软提示。

## 一键安装到目标仓库

```bash
node plugins/spec-dev/guardrail/install.mjs [--repo <path>] [--no-git-hook] [--no-ci]
```

默认装进当前 git 仓库，幂等可重复运行。

## 防线分层

| 层 | 机制 | 作用域 | 可绕过性 |
|---|---|---|---|
| 编辑时拦截 · Claude | `.claude/settings.json` PreToolUse hook（退出码 2 阻断） | Claude Code 会话 | 换工具即绕过 |
| 编辑时拦截 · Codex | `.codex/hooks.json` preToolUse hook（退出码 2 阻断） | Codex 会话 | 换工具即绕过 |
| 提交时拦截 | `.git/hooks/pre-commit` | 所有本地提交 | `--no-verify` 可绕过 |
| **最后防线** | `.github/workflows/spec-dev-drift-guard.yml` | **所有推送/PR，工具无关** | **不可绕过** |
| 会话上下文 | SessionStart hook → `session-context.mjs` | Claude / Codex 会话 | 仅提示 |
| 软提示 | `CLAUDE.md` / `AGENTS.md` 守卫段 | 各自 AI 工具 | 仅提示 |

单一事实源是 `check-spec-drift.mjs`，四条防线全部调它，只是入参模式不同（`--staged` / `--range` / `--hook`）。

## 判定逻辑

每份 spec 的 frontmatter `spec_dev.covers`（glob）声明它拥有的代码。一批变更命中某 `status: active` spec 的 `covers`、却没同时改动该 spec，即判为漂移。

## 临时放行

- 单次提交与行为契约无关：`SPEC_DEV_GUARD=off git commit …`（打印告警后放行）。
- spec 作废：把 frontmatter `status` 改为 `superseded`。
- 纯文档特性无需守卫：`covers` 留 `[]`。

## 文件

```
guardrail/
├── check-spec-drift.mjs      # 核心校验器（零依赖）
├── session-context.mjs       # SessionStart 上下文注入
├── install.mjs               # 安装器
└── templates/
    ├── claude-settings.json  # Claude hooks 片段
    ├── codex-hooks.json      # Codex hooks 片段
    ├── pre-commit            # git hook
    ├── github-workflow.yml   # CI
    ├── CLAUDE.md.snippet     # Claude 软提示
    └── AGENTS.md.snippet     # Codex 软提示
```
