# test-scoping 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。步骤用复选框（`- [ ]`）语法跟踪；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：为 spec-dev 套件引入"计划声明的相关测试范围"（基线分域执行 + 最终全量安全网 + 归属裁决）与 Scenario 锚点测试退役纪律。

**Spec**：`.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`

**架构**：纯 skill 文档改动。writing-plans 是判据主体（计划头部节模板、任务 0 措辞、最终任务模板），using-git-worktrees 的 Step 3 参数化，executing-plans 作为消费方以引用表达（不复制判据）。

**技术栈**：Markdown（skill 文档），无代码产物。

## 全局约束

- 判据原文只允许存在于 `skills/writing-plans/SKILL.md` 与 `skills/using-git-worktrees/SKILL.md`；`skills/executing-plans/SKILL.md` 只写引用（spec Requirement「executing-plans 消费声明语义」）
- 所有新增语义必须带旧版计划兼容句：计划无「相关测试范围」节 → 按全量执行，行为与现状一致
- 术语统一用「相关测试范围」「孤儿测试」「归属裁决」（spec 术语表规范名），不得使用"测试分组、模块测试、任务间验证、过期测试、废弃测试"等 Avoid 别名
- 本仓库为 skill 文档仓库、无可执行测试套件；各任务验证为 grep 一致性检查
- **环境中立（Codex 兼容）**：新增文案不得引用 Claude Code 专属工具（AskUserQuestion / Agent / EnterWorktree 等）；用户交互一律写"询问用户"等语义表述，由各环境按 codex-compat 映射承载；既有的 Codex 兼容句（如任务 0 模板"Codex 无原生 worktree 工具"）必须原样保留

## 相关测试范围

空——本特性为纯文档改动（spec `covers` 全为 skill 文档路径），且本仓库无测试套件。任务 0 基线验证跳过测试执行并注明；最终任务全量验证同样注明跳过。

---

### 任务 0：建立隔离工作区

- [ ] **步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，跳过本任务。

- [ ] **步骤 2：建立 worktree**

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用（Codex 无原生 worktree 工具，直接走手工路径）；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/plan/2026-08-09-test-scoping -b plan/2026-08-09-test-scoping` 并切换到该目录。

- [ ] **步骤 3：安装依赖并验证基线**

无依赖清单文件，跳过安装。基线验证：本计划「相关测试范围」声明为空（纯文档特性）→ 跳过测试执行并注明。

### 任务 1：writing-plans 计划头部加「相关测试范围」节模板

**文件**：
- 修改：`skills/writing-plans/SKILL.md:83-88`（「## 全局约束」模板块之后、`---` 之前）

**接口**：
- 产出：计划头部模板新节名「## 相关测试范围」及其推导规则文案——任务 2、3、4 的措辞都引用该节名，必须逐字一致

- [ ] **步骤 1：插入模板节**

在计划文档头部模板（```markdown 围栏内）的「## 全局约束」块与结尾 `---` 之间插入：

```markdown
## 相关测试范围

[写计划时推导的本特性相关测试执行声明——命令级、随计划被审、可改。推导优先级：
1) 项目已有测试影响分析工具 → 写具体命令（如 `nx affected -t test`、`jest --changedSince`、
   `pytest --testmon`）。工具存在性以项目依赖/配置清单判定（package.json scripts、nx.json、
   pytest 插件等），拿不准时询问用户；
2) 无工具 → 按 spec `covers` 与影响面推导测试文件/目录清单（路径判定，不做依赖分析）。
纯文档特性（`covers` 为空数组或全为文档路径）→ 显式声明为空并注明原因。
本声明约束任务 0 基线验证；最终任务的全量验证不受本节约束（全量安全网）。]
```

- [ ] **步骤 2：验证**

运行：`grep -n "## 相关测试范围" skills/writing-plans/SKILL.md`
预期：命中 1 处，位于计划文档头部模板围栏内。

- [ ] **步骤 3：提交**

```bash
git add skills/writing-plans/SKILL.md
git commit -m "feat(T1): writing-plans 计划头部模板加「相关测试范围」节（TIA 工具优先/glob 兜底/空范围声明）"
```

### 任务 2：writing-plans 任务 0 措辞 + 最终任务模板改造

**文件**：
- 修改：`skills/writing-plans/SKILL.md:110-113`（任务 0 模板步骤 3）
- 修改：`skills/writing-plans/SKILL.md:187-219` 附近（「### 任务 N+2：合并与清理」模板块）

**接口**：
- 消费：任务 1 的节名「相关测试范围」
- 产出：最终任务模板新步骤序（1 全量验证与归属裁决 → 2 测试退役检查 → 3 合并 → 4 清理 → 5 sync_commit 锚定）——任务 4 的 executing-plans 引用按此表述

- [ ] **步骤 1：改写任务 0 模板步骤 3**

将任务 0 模板中「步骤 3：安装依赖并验证基线」的正文（原文"按项目类型安装依赖……先问再继续。"）替换为：

```
按项目类型安装依赖（npm install / cargo build / pip install -r requirements.txt / go mod download），
然后按计划头部「相关测试范围」运行基线验证：有声明 → 只跑声明范围（声明为空 → 跳过测试并注明，
最终任务全量验证照跑；声明命令执行报错或工具不可用 → 回退运行完整测试套件，并注明声明已失效、
建议修订计划）；计划无该节（旧版计划）→ 运行完整测试套件，行为与现状一致。
基线测试失败 → 停下报告，先问再继续。
```

- [ ] **步骤 2：替换最终任务模板**

将「### 任务 N+2：合并与清理」markdown 围栏块整体替换为（围栏外的引导语与收尾说明段不动）：

````markdown
### 任务 N+2：合并与清理

- [ ] **步骤 1：全量验证（安全网）与归属裁决**

在 worktree 内运行完整测试套件（不受「相关测试范围」约束）。
- 全绿 → 进入步骤 2。
- 失败测试在相关测试范围内（或计划无该节）→ 修复后才进入合并。
- 失败测试在范围之外 → 归属裁决：在主工作区的源分支检出上复跑该测试
  （主工作区有未提交改动 → 先询问用户）。源分支同样失败 → 报告"既有失败"，
  请用户裁决是否阻塞合并，不自行静默忽略；源分支通过 → 判定为本次引入的回归，
  修复并复跑通过后才进入合并。

- [ ] **步骤 2：测试退役检查**

扫描路径落在本计划「相关测试范围」内的测试，找孤儿测试：测试名对不上任何 active spec
的 Scenario（判定基础是本 skill"测试名沿用 Scenario 名"约定；不合该命名约定的历史测试
不进候选，保守豁免），且对应 Requirement 已 REMOVED 或所属 spec 已 superseded——双条件
缺一不可。候选清单非空 → 列清单征询用户，同意后删除并计入本任务提交；用户未确认则不删除
任何测试。无候选 → 声明"无孤儿测试"后跳过。计划无「相关测试范围」节 → 跳过本步骤。

- [ ] **步骤 3：合并回来源分支**

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"   # 回到主工作区
git merge <分支名>                                     # 任务 0 创建的分支
```

合并冲突、或主工作区有未提交改动 → 停下向计划作者确认，不强行合并。

- [ ] **步骤 4：清理**

```bash
git worktree remove .worktrees/<分支名>
git branch -d <分支名>
```

- [ ] **步骤 5：sync_commit 锚定**

```bash
SYNC=$(git rev-parse HEAD)   # 合并完成后的主工作区 HEAD
# 把 spec frontmatter 的 sync_commit: null（或旧值）更新为 $SYNC
git add <spec 路径> && git commit -m "chore(spec): sync_commit 锚定 ${SYNC:0:7}"
```

此后 `git diff <sync_commit>..HEAD -- <covers glob>` 即"spec 上次确认同步以来的代码变化"。非 git 仓库跳过。
````

同步修改该模板块之后的收尾说明段：把"只执行步骤 1 与步骤 4，步骤 2-3 交回原有隔离机制收尾"更新为"只执行步骤 1、2 与步骤 5，步骤 3-4 交回原有隔离机制收尾"（步骤编号因插入退役检查而顺延）。

- [ ] **步骤 3：验证**

运行：`grep -n "归属裁决\|测试退役检查\|孤儿测试" skills/writing-plans/SKILL.md`
预期：三个术语均命中且都在最终任务模板块内；`grep -n "步骤 5：sync_commit" skills/writing-plans/SKILL.md` 命中 1 处。

- [ ] **步骤 4：提交**

```bash
git add skills/writing-plans/SKILL.md
git commit -m "feat(T2): writing-plans 任务 0 基线分域 + 最终任务模板加归属裁决与测试退役检查"
```

### 任务 3：using-git-worktrees Step 3 参数化

**文件**：
- 修改：`skills/using-git-worktrees/SKILL.md:100-104`（Step 3 开头）
- 修改：`skills/using-git-worktrees/SKILL.md:113-126`（速查表）

**接口**：
- 消费：任务 1 的节名「相关测试范围」

- [ ] **步骤 1：改写 Step 3 引导句**

将 L102 原文"运行项目对应的测试命令（`npm test` / `cargo test` / `pytest` / `go test ./...`）："替换为：

```
运行基线验证：本次隔离服务于某份计划、且该计划头部声明了「相关测试范围」时，按声明范围执行
（声明为空 → 跳过测试、直接报告就绪并注明"纯文档特性，基线测试跳过"；声明命令报错 → 回退完整
测试套件并注明）；无计划或计划无该节 → 运行项目完整测试命令（`npm test` / `cargo test` /
`pytest` / `go test ./...`）：
```

失败/通过的处置两行（L104-105）保持原文不动。

- [ ] **步骤 2：速查表加一行**

在「| 基线测试失败 | 报告 + 询问 |」之前插入一行：

```
| 计划声明了「相关测试范围」 | 基线只跑声明范围（空声明→跳过并注明） |
```

- [ ] **步骤 3：验证**

运行：`grep -n "相关测试范围" skills/using-git-worktrees/SKILL.md`
预期：命中 2 处（Step 3 与速查表）。

- [ ] **步骤 4：提交**

```bash
git add skills/using-git-worktrees/SKILL.md
git commit -m "feat(T3): using-git-worktrees Step 3 基线验证按计划声明范围参数化"
```

### 任务 4：executing-plans 消费方引用 + 三文件一致性检查

**文件**：
- 修改：`skills/executing-plans/SKILL.md:40`（阶段 2）
- 修改：`skills/executing-plans/SKILL.md:90`（阶段 6 第 2 点）

**接口**：
- 消费：任务 2 确立的最终任务步骤表述（全量验证与归属裁决、测试退役检查）

- [ ] **步骤 1：阶段 2 补引用句**

在 L40 段落末尾（"……直接调用 using-git-worktrees 补齐同等效果。"之后）追加：

```
基线验证范围遵循计划头部「相关测试范围」声明（判据见 using-git-worktrees Step 3 与 writing-plans 任务 0 模板）；旧版计划无该节 → 按全量执行。
```

- [ ] **步骤 2：阶段 6 第 2 点改引用**

将 L90 中"执行计划的最终任务（全量验证 → 合并回来源分支 → ……"的起始部分替换为"执行计划的最终任务（全量验证——范围外失败的归属裁决与测试退役检查按 writing-plans 最终任务模板执行 → 合并回来源分支 → ……"，其余保持原文。

- [ ] **步骤 3：一致性检查（验证）**

```bash
grep -n "相关测试范围" skills/executing-plans/SKILL.md   # 预期：仅引用句命中，无判据原文
grep -c "孤儿测试" skills/executing-plans/SKILL.md        # 预期：0（判据不复制）
grep -n "旧版计划" skills/executing-plans/SKILL.md        # 预期：含"按全量执行"兼容句
grep -rn "测试分组\|模块测试\|任务间验证" skills/writing-plans/SKILL.md skills/using-git-worktrees/SKILL.md skills/executing-plans/SKILL.md   # 预期：0 命中（Avoid 别名未混入）
```

- [ ] **步骤 4：提交**

```bash
git add skills/executing-plans/SKILL.md
git commit -m "feat(T4): executing-plans 引用相关测试范围/归属裁决/退役检查新语义（引用不复制）"
```

### 任务 5：合并与清理

- [ ] **步骤 1：全量验证（安全网）与归属裁决**

本仓库无测试套件（「相关测试范围」为空的纯文档特性）→ 注明跳过。以人工/AI 对照替代：逐条核对 spec 行为规范的 8 个 Scenario 与三文件新文案的对应关系，全部可对上才进入合并。

- [ ] **步骤 2：测试退役检查**

本仓库无测试 → 声明"无孤儿测试"后跳过。

- [ ] **步骤 3：合并回来源分支**

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"
git merge plan/2026-08-09-test-scoping
```

合并冲突、或主工作区有未提交改动 → 停下向计划作者确认，不强行合并。

- [ ] **步骤 4：清理**

```bash
git worktree remove .worktrees/plan/2026-08-09-test-scoping
git branch -d plan/2026-08-09-test-scoping
```

任务 0 若经原生工具（EnterWorktree）建立 → 用原生方式退出，本步骤按其机制收尾。

- [ ] **步骤 5：sync_commit 锚定**

```bash
SYNC=$(git rev-parse HEAD)
# 把 .spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md frontmatter 的
# sync_commit: null 更新为 $SYNC
git add .spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md
git commit -m "chore(spec): sync_commit 锚定 ${SYNC:0:7}"
```
