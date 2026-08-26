---
name: writing-plans
description: >-
  Write implementation plans - when a spec or clear requirement exists and multi-step work has not started: decompose the design into bite-sized tasks a zero-context engineer can execute (exact file paths, complete code, TDD steps, expected output), save under the feature directory plan/ subdir, hand off to executing-plans. Usually invoked by requirement-analysis after spec approval. / 编写实施计划——当已有 spec 或明确需求、准备开始多步骤开发任务、但尚未动代码时使用。把设计拆解为零上下文工程师也能执行的 bite-sized 任务（精确文件路径、完整代码、TDD 步骤、预期输出），落盘特性目录的 plan/ 子目录并交接 executing-plans 执行。通常由 requirement-analysis 在 spec 获批后调用；也可对既有 spec/需求单独触发。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。

# 编写实施计划

## 概述

假设执行计划的工程师**对我们的代码库零上下文、且品味存疑**：技术过硬，但几乎不了解我们的工具链和问题域，也未必懂好的测试设计。把他们需要知道的一切写进计划——每个任务动哪些文件、完整代码、怎么测试、参考哪些文档。DRY、YAGNI、TDD、频繁提交。

**开始时声明**：「我正在使用 writing-plans skill 编写实施计划。」

**动笔前确认**：编写计划须持有用户的明确同意——用户本轮显式指示编写计划、或上游流程已代为确认（requirement-analysis 阶段 8 的前置确认）时视为已同意、不重复问；除此之外（如隐式触发、只收到一个 spec 路径）先确认「基于 <spec 路径> 开始编写实施计划？」再动笔。

**计划保存至**：spec 所在特性目录的 `plan/` 目录——`plan/index.md` + `plan/tasks/TNN.md` + `plan/progress.yaml` 三件套（唯一生成形态，结构见下文「plan 目录结构」节）；特性目录由 requirement-analysis 在写 spec 时按同日序号命名规则创建；无 spec 输入的独立触发则自建特性目录。用户对计划位置的偏好优先于此默认值。

**唯一分文件形态**：每份计划（不论任务数多少）都产出 `plan/` 三件套；progress.yaml 是唯一状态源，任务文件与 index 内不使用复选框跟踪。存量单文件计划（`plan/*-plan.md`）由 executing-plans 按原样读取执行（读宽容），本 skill 不再生成该形态。

**Spec 状态检查**：载入 spec 时读其 frontmatter 的 `spec_dev.status`——仍为 `draft` 时说明漂移守卫尚未激活（requirement-analysis 阶段 8 的激活动作未执行，常见于跨会话独立触发）：与用户确认 spec 已定稿后，把 `status` 翻为 `active` 并单独 commit，再开始编写计划；不翻转则守卫对该特性静默失效。为 `superseded` 时停下告知用户该 spec 已被取代（附 `superseded_by` 指向，指针缺失或悬空时说明"无可达后继"；沿指针链跳转时记录已访问路径，链上出现环则列出环上文件并停止），经用户显式确认才可继续按旧 spec 编写计划；正文带 `Superseded-pending` 标注时向用户提示「该 spec 正被 <新 spec> 取代中（待交付）」后再继续。无 frontmatter 的旧版/外部 spec 跳过本检查。

**上下文**：编写计划阶段不建工作区——隔离以固定的「任务 0」写入每份计划，执行时才运行（见下方"任务 0"）。

## 范围检查

spec 聚焦单一交付物（绝大多数情况）→ 本节零动作。若 spec 覆盖多个独立子系统、或含阶段化结构（"第一阶段/Phase 1/先做 X 再做 Y"），这本应在需求设计阶段拆成子项目并登记 roadmap（requirement-analysis 的范围分解检查）；发现没拆时：

- **首选回炉**：建议回 requirement-analysis 补分解——spec 收缩到第一个子项目、其余登记 `.spec-dev/roadmaps/`，然后只为收缩后的 spec 编写本计划
- **用户不回炉**：只为第一个子系统/阶段编写本计划，剩余范围当场登记 roadmap（`.spec-dev/roadmaps/YYYY-MM-DD-NN-<project>.md`，无则新建：frontmatter `spec_dev_roadmap`（version/project/status: active）+ 子项目表（序号/名称/一句话范围/依赖/状态/特性目录），本子项目行记 `in-progress`、剩余行记 `pending`）并 git commit——**被延后的范围必须有落盘登记，不允许只活在对话里**

**不变式：一次只写一份计划，不为未实施的后续阶段预写计划**。计划要求每步含完整代码与精确路径，后续阶段的代码建立在前一阶段尚不存在的产物上——现在写出来必然失效。后续子项目在前置交付后按 roadmap 续接（executing-plans 收尾会核对 roadmap 并提示下一个）。

任务分解与方案形态遵循 [design-principles.md](references/design-principles.md) 八条设计原则——分解时逐条对照，违反即重划。

## 文件结构先行

定义任务前，先画出将创建/修改的文件清单及各自职责——分解决策在这里锁定：

- 单元边界清晰、接口明确，每个文件一个职责
- 你对能一次装进上下文的代码推理得最好，文件聚焦时编辑也更可靠——偏向小而聚焦的文件
- 一起变化的代码放在一起：按职责拆分，不按技术分层拆分
- 既有代码库跟随既有模式；正在改的文件已经臃肿时，把拆分纳入计划是合理的，但不做无关重构

该结构决定任务分解：每个任务产出自包含、独立可理解的变更。

## 任务的粒度

**任务**是携带独立测试周期、值得一次独立审查的最小单元。划界时：把配置、脚手架、文档步骤折叠进需要它们的任务；只在"审查者可能拒绝一个任务而通过相邻任务"处切分。每个任务以一个可独立验证的交付物收尾。

**步骤**是一个动作（2-5 分钟）：

- 「写失败测试」——一步
- 「运行确认失败」——一步
- 「写最小实现」——一步
- 「运行确认通过」——一步
- 「提交」——一步

TDD 循环的完整纪律遵循 test-driven-development skill——计划里的每个任务显式内嵌上述五步。

**Scenario 直译为测试**：spec 行为规范里的每个 `#### Scenario:` 至少翻译成一个失败测试，映射固定：GIVEN→arrange（构造前置状态）、WHEN→act（触发动作）、THEN→assert（断言可观察结果）；测试名沿用 Scenario 名。规范到测试零翻译损耗——不要自己另编测试场景后把 Scenario 丢在一边。测试步骤的 Lane 归属与 DB/前端/Agent 处方遵循 test-strategy skill（矩阵行标注的 lane 直接继承；DB 类步骤对照其 references/db-testing.md，不得出现每测试一容器）。

## plan 目录结构

每份计划固定产出以下三件套（唯一生成形态）：

```
.spec-dev/<特性目录>/plan/
├── index.md        # 头部 + 全局约束 + 相关测试范围 + 设计原则块 + 任务导航表；不复制任务正文
├── tasks/T00.md …  # 每任务一文件，正文结构与下文任务模板逐字一致（文件块/接口块/TDD 五步）
└── progress.yaml   # 唯一运行时状态
```

## 计划文档头部

**每份计划必须以此头部开始**：

```markdown
# [功能名] 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。任务状态由 `plan/progress.yaml` 跟踪（唯一状态源；任务文件步骤用「**步骤 N:**」标题式、不含复选框）；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：[一句话说明构建什么]

**Spec**：[对应 spec 文件路径]

**架构**：[2-3 句方案概述]

**技术栈**：[关键技术/库]

**设计原则**：本计划遵循 spec-dev 设计原则（不留向后兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策）；任务与代码不得违反，冲突时停下向计划作者确认。

## 全局约束

[spec 的项目级要求——版本下限、依赖限制、命名与文案规则、平台要求——
每条一行，数值从 spec 逐字复制。每个任务的要求都隐含本节。]

## 相关测试范围

[写计划时推导的本特性相关测试执行声明——命令级、随计划被审、可改。推导优先级：
1) 项目已有测试影响分析工具 → 写具体命令（如 `nx affected -t test`、`jest --changedSince`、
   `pytest --testmon`）。工具存在性以项目依赖/配置清单判定（package.json scripts、nx.json、
   pytest 插件等），拿不准时询问用户；
2) 无工具 → 按 spec `covers` 与影响面推导测试文件/目录清单（路径判定，不做依赖分析）。
纯文档特性（`covers` 为空数组或全为文档路径）→ 显式声明为空并注明原因。
本声明约束任务 0 基线验证；最终任务的全量验证不受本节约束（全量安全网）。]

---
```

index.md 头部之后是**任务导航表**——四列：`任务 | 依赖 | 消费接口 | 产出接口`。规则：任务 ID 形如 `T\d\d` 全局唯一且与 tasks/ 文件名一一对应；依赖只引用表内 ID；禁止环；接口列写精确签名（执行者只读自己的任务文件 + 依赖行的产出接口，不读其它任务正文）。生成后运行 `node scripts/validate-output.mjs plan-index <plan目录>`（结构校验：文件↔导航表一致、依赖存在、无环），失败不得交付执行。

## 任务 0：建立隔离工作区（每份计划固定生成）

头部之后、任务 1 之前，固定写入以下任务 0——与结尾的最终任务（合并与清理）首尾对称，隔离工作区的生命周期在计划文档内闭合、脱离本插件也能按序执行；有 using-git-worktrees skill 或原生工具的环境按其完整纪律执行（已隔离检测、目录选择、沙箱降级都定义在该 skill）：

````markdown
### 任务 0：建立隔离工作区

**步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，跳过本任务。

**步骤 2：建立 worktree**

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用（Codex 无原生 worktree 工具，直接走下面的手工路径）；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/<分支名> -b <分支名>` 并切换到该目录（分支名对齐计划，如 `plan/YYYY-MM-DD-NN-<feature>`）。

**步骤 3：安装依赖并验证基线**

按项目类型安装依赖（npm install / cargo build / pip install -r requirements.txt / go mod download），
然后按计划头部「相关测试范围」运行基线验证：有声明 → 只跑声明范围（声明为空 → 跳过测试并注明，
最终任务全量验证照跑；声明命令执行报错或工具不可用 → 回退运行完整测试套件，并注明声明已失效、
建议修订计划）；计划无该节（旧版计划）→ 运行完整测试套件，行为与现状一致。
基线测试失败 → 停下报告，先问再继续。
````

降级：非 git 仓库、或沙箱拒绝创建 → 在执行记录中注明"未隔离"及原因，原地继续任务 1。

## 任务结构

````markdown
### 任务 N：[组件名]

**文件**：
- 创建：`exact/path/to/file.py`
- 修改：`exact/path/to/existing.py:123-145`
- 测试：`tests/exact/path/to/test.py`

**接口**：
- 消费：[本任务使用的前序任务产物——精确签名]
- 产出：[后续任务将依赖的——精确函数名、参数与返回类型。
  任务执行者只看得到自己的任务；此块是他们了解相邻任务所用名称与类型的唯一途径。]

**步骤 1：写失败测试**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**步骤 2：运行测试确认失败**

运行：`pytest tests/path/test.py::test_name -v`
预期：FAIL，报 "function not defined"

**步骤 3：写最小实现**

```python
def function(input):
    return expected
```

**步骤 4：运行测试确认通过**

运行：`pytest tests/path/test.py::test_name -v`
预期：PASS

**步骤 5：提交**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat(TN): add specific feature"
```
````

## progress.yaml 键结构

```yaml
format_version: 1
current: T03            # 当前指针（null=未开始）
tasks:
  T01: { status: completed, commit: <sha>, tests: pass }
  T02: { status: completed, commit: <sha>, tests: pass, deviations: ["路径笔误就地修正"] }
  T03: { status: in_progress }
resources:              # 资源台账（唯一登记处；最终任务清理步骤遍历此清单）
  - "worktree: .worktrees/<分支> —— git worktree remove …"
notes: []               # 偏差与备注，append-only
```

状态枚举：pending | in_progress | completed | blocked。写入纪律：每任务完成后原子更新（整文件重写）并随任务提交；worktree 合并不携带本文件冲突——它是执行档案，最终任务把它随特性目录归档。`resources` 键即**资源台账规范定义点**（生成时预登记 worktree 行、执行中创建即追加；最终任务清理遍历此清单）。

## 验收任务（矩阵含「验收任务」行时固定生成）

spec 验收矩阵（「测试与验收策略」节）中执行方式为「任务内 TDD」的行直接翻译进各任务的失败测试步骤；执行方式为「验收任务」的行则在所有实施任务之后、最终任务（合并与清理）之前生成一个**验收任务**承载（编号顺延：最后实施任务为 N 则验收任务为 N+1、最终任务为 N+2）：

````markdown
### 任务 N+1：验收（acceptance-qa）

> 本任务由 executing-plans 收尾审查阶段触发 acceptance-qa 按下表执行，
> 不参与逐任务连续执行；报告与证据落盘特性目录 `acceptance/` 子目录。

| Scenario / 检查项 | 维度 | 执行方式 | 目标 | 阈值/预期 | 验收证据 |
|-------------------|------|---------|------|----------|---------|
| [从 spec 矩阵逐行抄录「验收任务」行，补全目标 URL/端点与阈值数字] | | | | | |
````

矩阵全部为「任务内 TDD」行、或 spec 无验收矩阵（旧版 spec）时不生成本任务；旧版 spec 的 UI 功能沿用在任务验收步骤注明「由 executing-plans 收尾触发 acceptance-qa 验收」并写明验收点（页面、交互、预期状态）。

## 最终任务：合并与清理（每份计划固定生成）

所有实施任务与验收任务（如有）之后，固定以下述任务收尾（编号顺延全局任务号：有验收任务时为 N+2、无则为 N+1，下方模板以 N+2 示意）——与任务 0 首尾对称，worktree 从建立到合并的生命周期在计划文档内闭合。使用 executing-plans 编排执行时，本任务不参与阶段 3 连续执行，推迟到收尾审查处置完成后运行：

````markdown
### 任务 N+2：合并与清理

**资源台账**（承载于 `plan/progress.yaml` 的 `resources` 键：生成时预登记 worktree 行，执行中创建即追加；行格式 `<类型>: <标识> —— <清理命令>`）；下方清理步骤遍历该清单。

已预登记：`worktree: .worktrees/<分支名> —— git worktree remove .worktrees/<分支名> && git branch -d <分支名>`

台账总则：**清理只遍历本台账、台账外一律不动**（可疑残留只报告不删）；共享缓存（~/.cargo、pnpm store、npm cache 等）默认保留，仅用户显式要求清理时才登记入账；台账限定持久资源（容器、测试库/表、临时目录、后台服务），worktree 内构建产物随 worktree 删除自然回收、不入账。

**步骤 1：全量验证（安全网）与归属裁决**

在 worktree 内运行完整测试套件（不受「相关测试范围」约束）。
- 全绿 → 进入步骤 2。
- 失败测试在相关测试范围内（或计划无该节）→ 修复并复跑全绿后进入步骤 2。
- 失败测试在范围之外 → 归属裁决：在主工作区的源分支检出上复跑该测试
  （主工作区有未提交改动 → 先询问用户）。源分支同样失败 → 报告"既有失败"，
  请用户裁决是否阻塞合并，不自行静默忽略；源分支通过 → 判定为本次引入的回归，
  修复并复跑全绿后进入步骤 2。

**步骤 2：测试退役检查**

扫描路径落在本计划「相关测试范围」内的测试，找孤儿测试：测试名对不上任何 active spec
的**现行** Scenario（现行=所在 Requirement 未被 `Superseded` 标注；判定基础是本 skill
"测试名沿用 Scenario 名"约定，不合该命名约定的历史测试不进候选，保守豁免），且对应
Requirement 已 REMOVED、**或其标题下带 `Superseded` 标注**、或所属 spec 已 superseded——
双条件缺一不可。候选清单非空 → 列清单征询用户，同意后删除并计入本任务提交；用户未确认则不删除
任何测试。无候选 → 声明"无孤儿测试"后跳过。计划无「相关测试范围」节 → 跳过本步骤。

**步骤 3：取代回写（spec 的 `supersedes` 为空——字段缺失或空数组——时声明"无取代回写"后跳过）**

按 spec「取代与共存」节逐项执行（形制见 spec-template「取代标注形制」节；实施任务中已完成的回写在此逐项核对后勾选）：
- 完全取代：旧 spec frontmatter `status` 翻 `superseded`、`superseded_by` 填本 spec 仓库根路径；H1 下 `Superseded-pending` 行替换为 `Superseded` 行；此后该 spec 的 sync_commit 冻结。
- 部分取代：旧 spec 保持 active，每条被取代 `### Requirement:` 标题下插入 Superseded 标注行；H1 下 pending 行移除；同步「取代与共存」节要求的关联文本（判据、术语表等）。
- covers 接管核对（仅完全取代）：列出旧 spec covers 中不被本 spec covers 覆盖且仍存在的路径差集；差集非空 → 停下征询用户（补进本 spec covers / 确认放弃保护并记录），不静默翻转。
- 回写随本分支合并进主线生效，与步骤 6 的 sync_commit 锚定构成取代提交组（revert 该组即原子恢复）。

**步骤 4：合并回来源分支**

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"   # 回到主工作区
git merge <分支名>                                     # 任务 0 创建的分支
```

合并冲突、或主工作区有未提交改动 → 停下向计划作者确认，不强行合并。

**步骤 5：清理（按资源台账逐条执行）**

逐条执行资源台账各行的清理命令并勾选（worktree 行即台账首行命令）。命令执行失败 → 该行保留未勾选并报告用户，不静默跳过；资源已不存在 → 勾选并注明"已不存在"。台账外的文件、容器、数据一律不动。

**步骤 6：sync_commit 锚定**

```bash
SYNC=$(git rev-parse HEAD)   # 合并完成后的主工作区 HEAD
# 把 spec frontmatter 的 sync_commit: null（或旧值）更新为 $SYNC
git add <spec 路径> && git commit -m "chore(spec): sync_commit 锚定 ${SYNC:0:7}"
```

此后 `git diff <sync_commit>..HEAD -- <covers glob>` 即"spec 上次确认同步以来的代码变化"。非 git 仓库跳过。
````

任务 0 未由本计划建立 worktree（此前已在隔离环境、原生工具建立、或降级原地执行）→ 只执行步骤 1、2、3 与步骤 6，步骤 4-5 交回原有隔离机制收尾并注明。计划无对应 spec（无 spec 输入的独立触发）→ 生成本任务时省略步骤 3 与步骤 6，或在执行记录注明"无 spec，跳过取代回写与锚定"。

## 禁止占位符

每一步必须包含工程师需要的实际内容。以下是**计划失败**，绝不允许出现：

- "TBD"、"TODO"、"稍后实现"、"补充细节"
- "添加适当的错误处理" / "添加校验" / "处理边缘情况"
- "为上述代码写测试"（没有实际测试代码）
- "类似任务 N"（把代码重复写出来——工程师可能乱序阅读任务）
- 只说做什么不给怎么做的步骤（涉及代码的步骤必须有代码块）
- 引用任何任务中都未定义的类型、函数、方法

## 牢记

- 永远给精确文件路径
- 每步给完整代码——改代码的步骤必须展示代码
- 精确命令 + 预期输出
- DRY、YAGNI、TDD、频繁提交
- 任务步骤会创建持久资源（容器、测试库/表、临时目录、后台服务）时，写计划时就在 progress.yaml 的初始 `resources` 键预登记对应行——资源不允许只活在对话里

## Self-Review

写完整份计划后，以新鲜眼光对照 spec 检查（自己跑清单，不派子代理）：

1. **Spec 覆盖**：逐条 Requirement 过——能指到实现它的任务吗？每个 Scenario 都有对应的失败测试步骤吗（GIVEN/WHEN/THEN → arrange/act/assert）？验收矩阵的「验收任务」行都进入验收任务表了吗？差量三节的 MODIFIED/REMOVED 有对应的改造/清理任务吗？列出缺口
2. **占位符扫描**：按"禁止占位符"清单搜索计划全文，发现即修
3. **类型一致性**：后续任务用到的类型、方法签名、属性名与前序任务定义一致吗？任务 3 叫 `clearLayers()`、任务 7 叫 `clearFullLayers()` 就是 bug
4. **导航表与任务文件一致**：导航表接口列与各任务文件的接口块逐条一致吗？tasks/ 文件名与表内任务 ID 一一对应吗（plan-index 校验过再交付）？

发现问题就地修复，无需复审；发现 spec 需求没有对应任务就补任务。

## 执行交接

保存计划后向用户交接：

> 「计划已完成并保存至 `.spec-dev/<特性目录>/plan/`（index.md + tasks/ + progress.yaml）。执行时我会用 executing-plans 从任务 0（隔离工作区）开始逐任务执行（TDD + 每任务提交 + 收尾多维审查）。
>
> 现在开始执行，还是先 review 计划？」

本计划属于某 active roadmap 的子项目时，话术首句追加进度锚点「（roadmap `<project>` 第 N/M 个子项目）」——让用户在交接时刻看到全局位置。

用户明确选择「开始执行」后才调用 executing-plans skill——未回复、或只给了计划修改意见时不得启动执行；用户要改计划则修订后重跑 Self-Review。

## Red Flags

- 步骤里出现"适当的""必要的""类似的" → 写出具体内容
- "spec 有三个阶段，那我写三份计划" → 一次只写一份：后续阶段的计划建立在尚不存在的代码上，写了必失效；剩余范围登记 roadmap
- 计划缺任务 0（隔离工作区）或最终任务（合并与清理） → 按固定模板补上
- 一个任务超过 5 个实施步骤 → 任务过大，继续拆
- 测试步骤没有测试代码 → 补全
- 计划里没有一处精确文件路径 → 重写
- 想跳过 Self-Review 直接交接 → 三查跑完再交
