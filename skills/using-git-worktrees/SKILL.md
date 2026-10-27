---
name: using-git-worktrees
description: >-
  隔离工作区——开始需要与当前工作区隔离的功能开发、或执行实施计划之前使用。先检测已有隔离并核对执行能力；新建始终放在项目根 .worktrees，仅在能遵守该路径时优先使用宿主原生工具，否则使用 Git worktree。保留管理方式并验证实际工作区、依赖和基线。
---

> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。

# 使用 Git Worktrees

## 概述

确保工作发生在隔离的工作区中。新建 worktree 始终放在项目根 `.worktrees/`；原生工具能遵守目标路径时优先使用，否则使用 `git worktree`。

**核心原则**：先检测已有隔离 → 固定项目内 `.worktrees` 目标并校验 → 按路径能力选择原生或 Git。**永远不要和 harness 对着干。**

创建前先按 [工具与命令边界](references/tool-boundaries.md) 核对本次流程所需的会话 cwd、文件工具、Git、任务绑定和原子状态操作能力。创建工具存在或创建成功，只证明工作区存在；不能据此推定后续执行入口兼容。

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

**若 `GIT_DIR != GIT_COMMON`（且非 submodule）**：已在链接 worktree 中。跳到 Step 2（项目就绪），**不要再套一层 worktree**。已有工作区即使在项目外也不自动迁移；目录规则约束新建。报告分支状态：

- 在分支上：「已在隔离工作区 `<path>`，分支 `<name>`。」
- 游离 HEAD：「已在隔离工作区 `<path>`（游离 HEAD，外部管理），收尾时需建分支。」

**若 `GIT_DIR == GIT_COMMON`（或在 submodule 里）**：在普通仓库检出中。用户指令/项目规范里已声明 worktree 偏好则直接遵循；否则先征求同意：

> 「要我建一个隔离 worktree 吗？它能保护你当前分支不被改动。」

用户拒绝则原地工作，跳到 Step 2。

## Step 1：创建隔离工作区

### 统一目录与创建前检查

**目录约束先于工具选择，两种创建机制共用。** 在 Step 0 已确认的普通检出中取得项目根；从项目子目录启动也使用同一根。Submodule 按自己的项目根处理。

```bash
PROJECT_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_ROOT="$PROJECT_ROOT/.worktrees"
WORKTREE_PATH="$WORKTREE_ROOT/$BRANCH_NAME"
```

`BRANCH_NAME` 使用已确定的合法分支名。不得因既有 `worktrees/` 或宿主默认目录而改选位置；不为适配此规则改动宿主全局配置。先核对目标占用与实际路径，`.worktrees` 及目标父级不得通过符号链接逃逸到项目外；有冲突或归属不明时报告，不覆盖、移动或删除已有资源。

#### 跨特性残留只读报告

创建前枚举仓库根 `.worktrees/` 的直接兄弟条目（不跟随符号链接），结合 `git worktree list --porcelain` 和 `node "<实际插件根>/scripts/status.mjs" --repo "<实际仓库根>"`，报告已终态/明确废弃但仍存活的候选及未注册目录；列路径、来源进度、可取得的占用，未知归属注明未知。主检出中的历史档案不算残留，终态记录本身也不证明可删。**只读报告，不删除台账外/其他特性的目录**；执行计划 T00 复用这份结果，已隔离而跳过创建时也做同一检查。同一现场已取得报告可复用，不另建报告文件或重复扫描；工具不可用时用 Git 列表与可读取的进度给等效报告并注明缺口。

#### 安全校验（原生与 Git 共用）

**创建前必须确认项目根 `.worktrees/` 被 Git 忽略**——不能用其他目录已被忽略代替：

```bash
git -C "$PROJECT_ROOT" check-ignore -q "$WORKTREE_ROOT/"
```

**未被忽略** → 先把 `/.worktrees/` 加入项目根 `.gitignore` 并提交，再继续。否则 worktree 内容会被跟踪、污染 git status。

### 1a. 原生 worktree 工具（路径满足时优先）

核对当前实际暴露的原生入口及其路径参数或已生效配置，不按宿主名称推断能力。仅当能明确指定或确认使用 `WORKTREE_PATH` 时调用；只有名称参数、路径能力未知或默认落在 `~/.codex/worktrees`、`.claude/worktrees` 等其他位置时，直接进入 Step 1b，**不先试建到别处**。

原生创建后核对回执及 `git worktree list --porcelain` 的实际路径确为目标，再进入 Step 2。路径不符则停止该工作区的后续写入并报告，不自动搬移、删除或重复创建。符合目标时沿用原生的分支和清理方式。

**自动降级保留**：原生入口不存在、不支持目标路径或创建失败时，记录具体原因；若已尝试创建，先核对是否留下工作区。确认不存在可复用隔离，且上述目标可由 Git 安全创建后，自动进入 Step 1b，不重复询问已有隔离授权。若失败来自目标目录越界或明确的安全拒绝，先解决该约束，不能借 Git 绕过同一拒绝。

### 1b. git worktree 降级

#### 创建

```bash
git -C "$PROJECT_ROOT" worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
```

核对 `git worktree list --porcelain` 中的实际路径与 `WORKTREE_PATH` 一致后，再通过支持的工作目录入口进入该目录。

降级创建成功后沿用 **Git 管理**：通过宿主支持的 cwd/启动入口在这个目录运行普通会话，或由操作者从该目录启动 `claude`；不为了恢复而无条件再调用 `EnterWorktree`、加 `--worktree` 或重建目录。已有原生隔离会话仍按原管理方式恢复；切换需先保全状态并确认旧执行者退出，不以新会话绕过其正在生效的拒绝。

**创建被拒时**：先说明真实拒绝及目标范围，仍以项目根 `.worktrees` 为目标；不能改选其他目录、关闭沙箱或更换执行器来绕过同一拒绝。仍无法隔离时，只有用户/计划已允许未隔离执行才原地进入 Step 2/3；隔离是明确约束时冻结依赖它的写入，保留只读调查，不自动改到主检出实现。

## Step 2：项目就绪

创建成功或复用已有隔离后，在现有资源/恢复记录中注明实际管理方式（宿主原生或 Git 管理）、绝对目录、分支和恢复入口；不新增状态载体。路径名不能单独证明管理方式，恢复时结合宿主上下文和已有记录核对。

首次绑定或写入前读取 [工具与命令边界](references/tool-boundaries.md)，核对实际 cwd/Git 根、项目与插件路径、原生文件编辑及宿主拒绝的处理；已有 worktree 同样执行，不以“已隔离”替代工具上下文核验。

先核对项目明确声明的包管理器、安装/构建命令、锁文件和既有依赖状态。
已有环境可用时直接进入基线验证，不强制重复安装。
复用依赖前核对实际路径与资源归属；指向另一活动 worktree 的可变依赖目录不因位于本目录下就成为本票可写资源。安装、自动依赖同步及测试夹具应使用自己的依赖目录，或已有明确授权的共享依赖；不能用符号链接把依赖修剪、安装或清理落到其他任务的现场。
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
