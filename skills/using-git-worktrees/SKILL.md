---
name: using-git-worktrees
description: >-
  隔离工作区——开始需要与当前工作区隔离的功能开发、或执行实施计划之前使用。先检测已有隔离，优先平台原生 worktree 工具（如 Claude Code 的 EnterWorktree），无原生工具才降级手工 git worktree。确保隔离工作区就绪、依赖安装完成、测试基线干净。
---

> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。

# 使用 Git Worktrees

## 概述

确保工作发生在隔离的工作区中。优先平台原生 worktree 工具，没有原生工具才降级手工 git worktree。

**核心原则**：先检测已有隔离 → 再用原生工具 → 最后 git 降级。**永远不要和 harness 对着干。**

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

#### 跨特性残留只读报告

创建前枚举仓库根 `.worktrees/` 的直接兄弟条目（不跟随符号链接），结合 `git worktree list --porcelain` 和 `node "<实际插件根>/scripts/status.mjs" --repo "<实际仓库根>"`，报告已终态/明确废弃但仍存活的候选及未注册目录；列路径、来源进度、可取得的占用，未知归属注明未知。主检出中的历史档案不算残留，终态记录本身也不证明可删。**只读报告，不删除台账外/其他特性的目录**；执行计划 T00 复用这份结果，已隔离而跳过创建时也做同一检查。同一现场已取得报告可复用，不另建报告文件或重复扫描；工具不可用时用 Git 列表与可读取的进度给等效报告并注明缺口。

#### 安全校验（仅项目内目录）

**创建前必须确认选定的目录被 git 忽略**——校验的目录必须与将要使用的目录同名，不要用"任一候选被忽略"代替：

```bash
git check-ignore -q "$LOCATION"   # $LOCATION 即上一步选定的 .worktrees 或 worktrees
```

**未被忽略** → 先把该目录加入 `.gitignore` 并提交，再继续。否则 worktree 内容会被跟踪、污染 git status。

#### 创建

```bash
path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**沙箱降级**：`git worktree add` 因权限被拒（沙箱拦截）→ 告知用户沙箱阻止了创建、将在当前目录原地工作，然后原地执行 Step 2/3。Codex workspace-write 沙箱的可写根通常只含项目目录（与 `/tmp`）——项目内 `.worktrees/` 天然在可写根内；若显式偏好指向项目外目录被拒，先改用项目内目录重试一次，仍被拒才原地降级。

## Step 2：项目就绪

先核对项目明确声明的包管理器、安装/构建命令、锁文件和既有依赖状态。
已有环境可用时直接进入基线验证，不强制重复安装。
确实缺依赖时使用项目声明的实际命令；package.json 不等于必须 npm，pyproject.toml 不等于必须 Poetry。
多个声明冲突时先查实际配置与项目说明；仍无法确定才报告缺口，不擅自更换工具或锁文件。
按任务目标定位正确 package/工作目录，保留安装命令、结果及必要的失败边界。

## Step 3：验证干净基线

运行基线验证：本次隔离服务于某份计划、且该计划头部声明了「相关测试范围」时，按声明范围执行
（声明为空 → 跳过测试、直接报告就绪并注明"纯文档特性，基线测试跳过"；声明命令报错 → 改跑该计划列出的自有测试文件，注明声明已失效、建议修订计划，不回退全量）；计划无该节 → 跑其任务文件中出现的测试文件；无计划 → 运行项目完整测试命令（`npm test` / `cargo test` /
`pytest` / `go test ./...`）：

- **测试失败** → 报告失败详情，询问继续还是先排查——基线不干净就无法区分新 bug 与既有问题
- **测试通过** → 报告就绪：

```
Worktree 就绪：<完整路径>
测试通过（<N> 个测试，0 失败）
可以开始实施 <feature-name>
```
