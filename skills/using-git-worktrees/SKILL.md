---
name: using-git-worktrees
description: >-
  Isolated workspace - before feature work that needs isolation from the current workspace or before executing a plan: detect existing isolation first, prefer native worktree tools (e.g. Claude Code EnterWorktree), fall back to manual git worktree; ensure dependencies installed and the test baseline is green. / 隔离工作区——开始需要与当前工作区隔离的功能开发、或执行实施计划之前使用。先检测已有隔离，优先平台原生 worktree 工具（如 Claude Code 的 EnterWorktree），无原生工具才降级手工 git worktree。确保隔离工作区就绪、依赖安装完成、测试基线干净。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

# 使用 Git Worktrees

## 概述

确保工作发生在隔离的工作区中。优先平台原生 worktree 工具，没有原生工具才降级手工 git worktree。

**核心原则**：先检测已有隔离 → 再用原生工具 → 最后 git 降级。**永远不要和 harness 对着干。**

**开始时声明**：「我正在使用 using-git-worktrees skill 建立隔离工作区。」

## Step 0：检测已有隔离

**创建任何东西之前，先检查是否已经在隔离工作区里。**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule 防误判**：`GIT_DIR != GIT_COMMON` 在 git submodule 里也可能成立。判定"已在 worktree"前先排除 submodule：

```bash
# 有输出 = 在 submodule 里而非 worktree —— 按普通仓库处理
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**若 `GIT_DIR != GIT_COMMON`（且非 submodule）**：已在链接 worktree 中。跳到 Step 2（项目就绪），**不要再套一层 worktree**。报告分支状态：

- 在分支上：「已在隔离工作区 `<path>`，分支 `<name>`。」
- 游离 HEAD：「已在隔离工作区 `<path>`（游离 HEAD，外部管理），收尾时需建分支。」

**若 `GIT_DIR == GIT_COMMON`（或在 submodule 里）**：在普通仓库检出中。用户指令/项目规范里已声明 worktree 偏好则直接遵循；否则先征求同意：

> 「要我建一个隔离 worktree 吗？它能保护你当前分支不被改动。」

用户拒绝则原地工作，跳到 Step 2。

## Step 1：创建隔离工作区

**两种机制，按序尝试。**

### 1a. 原生 worktree 工具（优先）

已有创建 worktree 的原生工具吗？可能叫 `EnterWorktree`、`WorktreeCreate`、`/worktree` 命令或 `--worktree` 参数。有就用它，然后跳到 Step 2。（Codex 目前没有原生 worktree 工具——直接进入 Step 1b。）

原生工具自动处理目录放置、分支创建与清理。**有原生工具还手写 `git worktree add` 是第一大错误**——会制造 harness 看不见、管不了的幽灵状态。

只有确认没有任何原生 worktree 工具，才进入 Step 1b。

### 1b. git worktree 降级

#### 目录选择（显式偏好 > 既有目录 > 默认值）

1. **指令中已声明 worktree 目录偏好** → 直接用，不再问
2. **检查项目内既有目录**：`ls -d .worktrees 2>/dev/null`（首选）、`ls -d worktrees 2>/dev/null`；两者都在时 `.worktrees` 胜出
3. **均无** → 默认项目根下 `.worktrees/`

#### 安全校验（仅项目内目录）

**创建前必须确认目录被 git 忽略**：

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**未被忽略** → 先加入 `.gitignore` 并提交，再继续。否则 worktree 内容会被跟踪、污染 git status。

#### 创建

```bash
path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**沙箱降级**：`git worktree add` 因权限被拒（沙箱拦截）→ 告知用户沙箱阻止了创建、将在当前目录原地工作，然后原地执行 Step 2/3。Codex workspace-write 沙箱的可写根通常只含项目目录（与 `/tmp`）——项目内 `.worktrees/` 天然在可写根内；若显式偏好指向项目外目录被拒，先改用项目内目录重试一次，仍被拒才原地降级。

## Step 2：项目就绪

自动检测并执行相应安装：

```bash
[ -f package.json ]     && npm install
[ -f Cargo.toml ]       && cargo build
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f pyproject.toml ]   && poetry install
[ -f go.mod ]           && go mod download
```

## Step 3：验证干净基线

运行项目对应的测试命令（`npm test` / `cargo test` / `pytest` / `go test ./...`）：

- **测试失败** → 报告失败详情，询问继续还是先排查——基线不干净就无法区分新 bug 与既有问题
- **测试通过** → 报告就绪：

```
Worktree 就绪：<完整路径>
测试通过（<N> 个测试，0 失败）
可以开始实施 <feature-name>
```

## 速查表

| 情形 | 动作 |
|------|------|
| 已在链接 worktree | 跳过创建（Step 0） |
| 在 submodule 里 | 按普通仓库处理（Step 0 防误判） |
| 有原生 worktree 工具 | 用它（Step 1a） |
| 无原生工具 | git 降级（Step 1b） |
| `.worktrees/` 已存在 | 用它（校验 ignore） |
| 两个目录都在 | `.worktrees/` 胜出 |
| 目录未被忽略 | 加 .gitignore + 提交 |
| 创建遇权限错误 | 沙箱降级，原地工作 |
| 基线测试失败 | 报告 + 询问 |
| 无依赖清单文件 | 跳过安装 |

## Red Flags

**绝不**：

- Step 0 检测到已有隔离还创建 worktree（套娃）
- 有原生工具（如 `EnterWorktree`）还手写 `git worktree add`——第一大错误
- 跳过 Step 1a 直奔 Step 1b 的 git 命令
- 未校验 ignore 就建项目内 worktree
- 跳过基线测试验证
- 测试失败还不问就继续

**总是**：

- 先跑 Step 0 检测
- 原生工具优先于 git 降级
- 目录优先级：显式指令 > 既有项目内目录 > 默认
- 自动检测并执行项目安装
- 验证干净测试基线
