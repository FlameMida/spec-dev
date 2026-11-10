---
name: using-git-worktrees
description: >-
  隔离工作区——开始需要与当前工作区隔离的功能开发、或执行实施计划之前使用。先检测已有隔离；新建固定放在项目根 .worktrees，用 git worktree 创建；核对实际工作目录并装好依赖即就绪，不运行测试。
---

> 输出语言：用户显式指定（含平台语言设置）优先，其次跟随近期对话，否则使用英语。新产物使用创建时语言，增量修改沿用原文语言；固定话术按语义表达。

> **宿主适配**：提问用宿主的提问工具，没有就发普通消息并停下等回复；有子代理能力才派发，没有就由主线程完成并注明；进度工具可用可不用，以落盘文件为准；需要其他 skill 时按名称加载，加载不到就读同级目录下的 `SKILL.md`。

# 使用 Git Worktrees

让开发发生在隔离的工作区里，保护当前分支不被改动。三步：检测已有隔离，在项目根 `.worktrees/` 下创建，核对目录并装依赖。宿主已经把会话放进隔离工作区时直接复用，不和宿主对着干。

## 第 1 步：检测已有隔离

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
git rev-parse --show-superproject-working-tree   # 有输出说明在 submodule 里
```

- 两个目录不同，且不在 submodule 里：已经在链接的 worktree 中。直接跳到第 3 步，不再套一层。报告路径和分支；游离 HEAD 时说明收尾需要建分支。
- 两个目录相同，或在 submodule 里：这是普通检出，进入第 2 步。

是否建立隔离：执行实施计划时默认建立；用户或项目规范声明了偏好就照做；独立使用且没有声明时先问一句「要建一个隔离 worktree 吗？它能保护你当前的分支。」用户拒绝就原地工作，跳到第 3 步。

## 第 2 步：创建

```bash
PROJECT_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_PATH="$PROJECT_ROOT/.worktrees/$BRANCH_NAME"

git -C "$PROJECT_ROOT" check-ignore -q "$PROJECT_ROOT/.worktrees/"   # 必须已被忽略
git -C "$PROJECT_ROOT" worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
git -C "$PROJECT_ROOT" worktree list --porcelain                     # 确认实际路径
```

- 位置固定为项目根的 `.worktrees/<分支名>`，从子目录启动也用同一个根。不因为已有别的目录或宿主的默认位置而改选。
- `.worktrees/` 没被忽略时，先把 `/.worktrees/` 加进项目根的 `.gitignore` 并提交，否则 worktree 内容会污染 `git status`。
- 目标路径已被占用或归属不明时停下报告，不覆盖、不移动、不删除。
- 宿主提供原生的隔离工具且能指定上面这个路径时可以用它；指定不了就用 `git worktree add`。
- 创建被拒绝时说明真实原因，不改选别的目录、不关沙箱来绕过。无法隔离时，只有用户同意才原地工作。

## 第 3 步：进入并就绪

1. **核对实际工作目录**。分别运行 `pwd`、`git rev-parse --show-toplevel`、`git branch --show-current`，与预期的工作区和分支对照。一次 `cd` 不保证后续命令和文件工具都在新目录；宿主不保持工作目录时，命令用 `git -C <路径>`，文件用绝对路径。
2. **装依赖**。先看项目声明的包管理器、安装命令和锁文件；环境已经可用就不重装。缺依赖时用项目实际的命令，有 `package.json` 不等于一定用 npm。依赖目录不与其他工作区共享可变内容。
3. **报告就绪**。给出工作区路径和分支。这一步不运行测试。

## 清理

交付完成后清理自己创建的工作区：`git -C "$PROJECT_ROOT" worktree remove "$WORKTREE_PATH"`，分支按交付结果保留或删除。不是本次创建的工作区不动；工作区里还有未提交的改动时先报告，不强行删除。
