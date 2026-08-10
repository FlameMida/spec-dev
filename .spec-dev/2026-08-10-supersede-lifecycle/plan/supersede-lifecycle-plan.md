# supersede-lifecycle 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。步骤用复选框（`- [ ]`）语法跟踪；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：为 spec-dev 体系落地 spec/ADR 取代生命周期机制——设计期声明、交付期生效、消费期强制过滤三段闭环。

**Spec**：`.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md`

**架构**：状态模型物化为 spec frontmatter 两个新字段（`supersedes`/`superseded_by`）与四种正文标注形态；流程挂点分布在 requirement-analysis（声明）、writing-plans/executing-plans（交付回写）、quick-fix/acceptance-qa/探索派发（消费过滤）；guardrail 侧仅改注入脚本计数、报错文案与装机文档，判定逻辑零改动。

**技术栈**：Markdown skill 指令文档 + Node.js ESM 脚本（guardrail/session-context.mjs）；校验工具为仓库自带 `scripts/*.mjs`。

## 全局约束

- **语言协议**：落盘正文中文，结构标签（frontmatter 键、Status 枚举、GIVEN/WHEN/THEN）英文；编辑既有英文文档（guardrail/README.md、snippet 英文段）保持英文。
- **提交纪律（每个提交步骤一律如此）**：本仓库 rtk git 代理有暂存丢失缺陷——用 `/usr/bin/git add <文件> && SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "..."` 提交，提交后 `/usr/bin/git show HEAD --stat` 验证文件数与行数符合预期。SKIP_RELEASE_HOOK=1 跳过自动发版，交付后需提醒用户手动发版。
- **守卫状态**：本仓库未安装提交期守卫闸（无 `scripts/spec-dev/`，`.githooks/pre-commit`/`pre-push` 不含 check-spec-drift）——提交无需 `SPEC_DEV_GUARD`/trailer；spec 同步纪律由任务内容本身保证（任务 4 同步 test-scoping spec 即其体现）。
- **文档任务的 TDD 映射**：grep 断言即失败测试——步骤 1 运行断言确认目标文本尚不存在（红）→ 编辑 → 重跑断言 + 结构校验（绿）→ 提交。session-context.mjs（任务 8）走真实 fixture 红绿。
- **标注形制与路径风格**：以 spec「已确认的关键决策」与任务 1 写入 spec-template 的「取代标注形制」节为准——frontmatter 字段与 blockquote 标注中的路径一律仓库根相对，正文 markdown 超链接相对当前文件，ADR 互指同目录文件名相对。
- **日期戳**：标注中的日期用执行当日 `$(date +%F)`。

## 相关测试范围

本特性为纯文档 + 单脚本特性（covers 全为 skill 文档与 guardrail 文件），无传统测试套件。声明如下命令级验证（任务 0 基线与各任务步骤复用）：

```bash
node scripts/check-plugin.mjs
node scripts/validate-skills.mjs
SKIP_OPENAI_SYNC_CHECK=1 node scripts/check-openai-sync.mjs   # 结构项校验；SKILL.md 的 description 均不变更
```

任务 8 起追加 session-context fixture 直跑断言（该任务步骤内定义）。

---

### 任务 0：建立隔离工作区

- [x] **步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，跳过本任务。

- [x] **步骤 2：建立 worktree**

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/plan-2026-08-10-supersede-lifecycle -b plan/2026-08-10-supersede-lifecycle` 并切换到该目录。

- [x] **步骤 3：安装依赖并验证基线**

本仓库零 npm 依赖，无需安装。按「相关测试范围」跑三条校验命令，预期全部通过（当前主线即为绿基线）。
基线失败 → 停下报告，先问再继续。

---

## 定义层（形制权威）

### 任务 1：spec-template.md——取代字段、取代与共存节模板、标注形制

**文件**：
- 修改：`skills/requirement-analysis/assets/spec-template.md`

**接口**：
- 产出：「取代与共存」节模板结构、「取代标注形制」节（pending/完全/部分三种 blockquote 的权威文本）、frontmatter `supersedes`/`superseded_by` 字段注释——任务 2/4/5/6/7 的文本以此为形制引用源。

- [x] **步骤 1：断言红**

```bash
grep -c "supersedes" skills/requirement-analysis/assets/spec-template.md
```
预期：0（exit 1）。

- [x] **步骤 2：编辑**

2a. frontmatter 模板块中 `sync_commit` 注释行之后（`---` 结束线之前）追加：

```yaml
  supersedes: []           # 本 spec 取代的旧 spec 路径列表（仓库根相对），设计期由阶段 6 取代分流
                           # 填写；部分取代同样登记于此，粒度细节写正文「取代与共存」节；无取代留空数组。
  superseded_by: null      # 本 spec 被取代时由交付回写填入后继 spec 路径（仓库根相对），
                           # 与 status: superseded 必须成对出现；消费方读到后沿此指针跳转后继。
```

2b. 模板导语中「填 `feature` 与 `covers`，spec 定稿转 `status: active`」句后追加一句：

```
取代关系走生命周期：`supersedes` 在设计期声明、交付时由取代回写把旧 spec 翻 `superseded` 并填 `superseded_by`——`superseded` 是有正式后继指向的终态，不是绕过守卫的手段。
```

2c. 「已确认的关键决策」节模板之后、「行为规范（Requirements）」之前插入新节模板：

```markdown
## 取代与共存

[阶段 6 取代分流结论：对探索命中的每份行为相交 active spec 三分类，逐份一行；无相交时写"无相交 active spec"。
完全取代登记 frontmatter supersedes + 一句理由；部分取代登记 supersedes + 列出被取代的具体 Requirement 标题，每条附一句取代理由；分面共存不登记 supersedes，记一行判定理由并各自声明 covers（改单面时对另一份用 Spec-Guard: off trailer 放行）。删除整个特性且无新行为承接时，本 spec 应为仅含 REMOVED Requirements 的轻量后继（记录删除理由），交付时按完全取代回写旧 spec。 / Supersede triage: full / partial / facet-coexist, one line per overlapping active spec]

- [完全取代] `<旧spec仓库根路径>`：[一句理由]
- [部分取代] `<旧spec仓库根路径>`：Requirement「[标题]」——[一句取代理由]
- [分面共存] `<旧spec仓库根路径>`：[一行判定理由]
```

2d. 文件末尾（「行为差量三节」节之后）追加新节：

```markdown
## 取代标注形制（供取代流程引用，非 spec 正文节）

- **窗口期**（新 spec 激活时打在旧 spec H1 标题下一行）：
  `> **Superseded-pending (YYYY-MM-DD)** — 本 spec 的「Requirement: [标题]」将被 <新spec仓库根路径> 部分取代（待其交付）；新工作以新 spec 为准，本 spec 仍描述当前已实现行为。`
  完全取代则中段改写为"本 spec 将被 <新spec仓库根路径> 完全取代（待其交付）"。
- **完全取代**（交付回写）：frontmatter `status: superseded` + `superseded_by: <后继仓库根路径>`；pending 行替换为
  `> **Superseded (YYYY-MM-DD)** — 本 spec 已被 <后继仓库根路径> 取代，本文仅作历史参考，现行契约以取代方为准。`
  此后 sync_commit 冻结不再更新；covers 保留原值供考古（守卫因 status 自然忽略）。
- **部分取代**（交付回写）：旧 spec 保持 `active`，每条被取代 `### Requirement:` 标题下插入
  `> **Superseded (YYYY-MM-DD)** — by <新spec仓库根路径>#<requirement 锚>；原文保留仅作历史参考。`
  H1 下的 pending 行移除。
- **路径风格**：以上标注与 frontmatter 字段中的路径一律仓库根相对；正文 markdown 超链接沿用相对当前文件路径；ADR 互指用同目录文件名相对链接。
```

- [x] **步骤 3：断言绿 + 校验**

```bash
grep -c "supersedes" skills/requirement-analysis/assets/spec-template.md   # 预期 ≥3
grep -c "取代标注形制" skills/requirement-analysis/assets/spec-template.md  # 预期 ≥1
node scripts/validate-skills.mjs
```

- [x] **步骤 4：提交**

```bash
/usr/bin/git add skills/requirement-analysis/assets/spec-template.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T1): spec-template 取代字段、取代与共存节模板与标注形制"
/usr/bin/git show HEAD --stat
```

### 任务 2：requirement-analysis SKILL——契约姿态、取代分流、ADR 状态行、pending 标注

**文件**：
- 修改：`skills/requirement-analysis/SKILL.md`

**接口**：
- 消费：任务 1 的「取代与共存」节模板与「取代标注形制」节（文本中引用其名）。
- 产出：阶段 6 取代分流条目与 ADR 状态行规则——任务 3（审查维度）、任务 4（回写步骤）与之呼应的术语（"取代分流""三分类""状态行"）。

- [x] **步骤 1：断言红**

```bash
grep -c "取代分流\|契约姿态" skills/requirement-analysis/SKILL.md
```
预期：0（exit 1）。

- [x] **步骤 2：编辑（四处）**

2a. 阶段 1 末尾「打标记，供后续阶段消费」列表（视觉候选条目）之后追加同级条目：

```markdown
  - **契约姿态判定**：需求措辞含破坏性重构信号（"重构""推翻""可破坏""不留兼容"等）且预计触及既有 active spec/ADR 时标记；进入阶段 3 后以一道澄清题（优先首题）向用户确认这些旧契约是**硬约束**（默认）还是**仅现状输入**。确认降格后：阶段 2/回补探索的派发词须携带该姿态结论，子代理不得把降格契约当设计约束报告（仅作现状与迁移分析输入）；阶段 4 方案对比不因"违反旧 spec 契约"排除选项
```

2b. 阶段 2「**每个子代理必须给定**」句改为：

```markdown
**每个子代理必须给定**：清晰的主题或模态、相关文件线索、期望输出格式、工具优先级与文档时效规则提醒（后两项定义见 exploration-patterns 派发要求）。失败的子代理先缩小范围重试 1 次，再失败由主线程接管。
```

2c. 阶段 6 的 ADR 分流条目整体替换为（保留原三判据语义，扩状态行与回写）：

```markdown
- **决策分流（ADR）**：检查"已确认的关键决策"中是否有同时满足三判据的决策——**难以逆转**（事后改主意成本高）、**缺上下文会费解**（未来读者会问"当初为什么这么做"）、**真实取舍**（存在真正的备选且因具体理由选定其一）——满足者每条沉淀为仓库级 `.spec-dev/adr/NNNN-<slug>.md`（全项目共用一个目录、统一编号：扫描现有最高编号递增，目录不存在时随首个 ADR 创建；正文 1-3 句写清背景、决定与理由即可，值得记住的被否方案附一行），spec 决策节保留一行摘要并链接过去；三判据缺一即不建 ADR——ADR 泛滥和没有 ADR 一样没用。**ADR 状态纪律**：每条 ADR 标题下带状态行，封闭三态——`**Status**: Accepted (YYYY-MM-DD)` / `**Status**: Deprecated (YYYY-MM-DD) — <一句原因，强制>` / `**Status**: Superseded by [ADR-NNNN](NNNN-<slug>.md) (YYYY-MM-DD)`（同目录文件名相对链接，编号强制；缺状态行的历史 ADR 视同 Accepted）。判据一句话：有替代决策用 Superseded，无替代者且决策语境消失用 Deprecated。Accepted 后正文不可变（仅 status 行、错别字、坏链可改）；**不做部分推翻**——推翻既有 ADR 的任何部分时，新 ADR 完整重述仍有效的结论并整体取代，标题下声明 `**Supersedes**: ADR-NNNN` 行，且在本阶段同一提交把旧 ADR 状态行回写为 Superseded by（ADR 取代随裁决即时生效，不等实施交付——见 `.spec-dev/adr/0001`）
- **取代分流（supersede triage）**：对阶段 2 探索命中的每份行为相交 active spec 做三分类判定并写入 spec——**完全取代**（新 spec 整体替换旧特性）与**部分取代**（替换旧 spec 的部分 Requirement）登记进 frontmatter `supersedes`（仓库根相对路径）与正文「取代与共存」节（部分取代必须列出被取代的具体 Requirement 标题清单，每条附一句取代理由）；**分面共存**（同文件不同行为切面、无冲突）不登记 supersedes，记一行判定理由并各自声明 covers。节模板与标注形制见 spec-template。用户要求删除整个特性且无新行为承接时，产出仅含 REMOVED Requirements 的轻量 spec 作为后继（记录删除理由，交付时按完全取代回写旧 spec）。spec 的取代回写随交付生效（executing-plans 最终任务），与 ADR 的即时回写构成双轨（`.spec-dev/adr/0001`）
```

2d. 阶段 8「激活漂移守卫」条目之后追加条目：

```markdown
- **打取代预告（仅当 spec 的 `supersedes` 非空）**：翻 active 的同一提交内，向每份被指向的旧 spec H1 标题下写入 Superseded-pending 标注（形制见 spec-template「取代标注形制」节；部分取代写明将被取代的 Requirement 标题）——窗口期的双 active 状态由此对全部消费方显式可判定；后续该计划若被废弃，由 executing-plans 意图级偏差收尾回收此标注
```

- [x] **步骤 3：断言绿 + 校验**

```bash
grep -c "取代分流" skills/requirement-analysis/SKILL.md    # 预期 ≥2
grep -c "契约姿态判定" skills/requirement-analysis/SKILL.md # 预期 ≥1
grep -c "Superseded-pending" skills/requirement-analysis/SKILL.md # 预期 ≥1
node scripts/validate-skills.mjs && SKIP_OPENAI_SYNC_CHECK=1 node scripts/check-openai-sync.mjs
```

- [x] **步骤 4：提交**

```bash
/usr/bin/git add skills/requirement-analysis/SKILL.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T2): requirement-analysis 契约姿态判定、取代分流、ADR 状态纪律、激活期 pending 标注"
/usr/bin/git show HEAD --stat
```

### 任务 3：探索派发时效规则 + 审查外部一致性维度

**文件**：
- 修改：`skills/requirement-analysis/references/exploration-patterns.md`
- 修改：`skills/requirement-analysis/references/spec-reviewer-prompt.md`

**接口**：
- 消费：任务 2 的"取代分流"术语（审查维度引用「取代与共存」节名）。

- [x] **步骤 1：断言红**

```bash
grep -c "文档时效" skills/requirement-analysis/references/exploration-patterns.md
grep -c "外部一致性" skills/requirement-analysis/references/spec-reviewer-prompt.md
```
预期：均为 0。

- [x] **步骤 2：编辑**

2a. exploration-patterns.md「派发要求与失败隔离」节的 4 项清单（第 4 项工具优先级提醒）之后追加：

```markdown
5. **（涉及 `.spec-dev/` 产物时）文档时效规则**：按 frontmatter `spec_dev.status` 分类报告——active 为现行契约；superseded、以及正文带 `Superseded-pending` / `Superseded` 标注者点名标示且仅作历史参考，不得进入"现行契约"结论；命中的 active spec/ADR 与本需求的行为交集逐一列出（供阶段 6 取代分流消费）；被 `Superseded` 标注的单条 Requirement 同样排除出现行契约。ADR 按状态行过滤（`Superseded by` / `Deprecated` 仅作历史参考，缺状态行视同 Accepted）。plan / acceptance 报告 / exploration 笔记是执行时点记录——代码现状以仓库与 active spec 为准，不得从中照抄代码片段作为现状依据。派发词已声明契约姿态降格（用户授权破坏性重构）时，命中的旧契约按"仅现状输入"报告，不作为约束
```

2b. spec-reviewer-prompt.md 审查维度表「差量正确性」行之后插入一行：

```markdown
| 外部一致性 | 对照 spec「取代与共存」节与 `.spec-dev/` 下既有 active spec/ADR：有无未声明的行为冲突（新 Requirement 与既有 active 的现行 Requirement 矛盾、但取代与共存节未提及该 spec）；完全取代时新 spec covers 是否接管旧 covers 中仍存在的路径（真空差集列为 issue）；部分取代清单中的 Requirement 标题是否与旧 spec 实文对得上 |
```

- [x] **步骤 3：断言绿 + 校验**

```bash
grep -c "文档时效" skills/requirement-analysis/references/exploration-patterns.md   # ≥1
grep -c "外部一致性" skills/requirement-analysis/references/spec-reviewer-prompt.md  # ≥1
node scripts/validate-skills.mjs
```

- [x] **步骤 4：提交**

```bash
/usr/bin/git add skills/requirement-analysis/references/exploration-patterns.md skills/requirement-analysis/references/spec-reviewer-prompt.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T3): 探索派发文档时效规则 + spec 审查外部一致性维度"
/usr/bin/git show HEAD --stat
```

---

## 交付链路

### 任务 4：writing-plans 载入检查与最终任务取代回写 + test-scoping 部分取代回写（自举）

**文件**：
- 修改：`skills/writing-plans/SKILL.md`
- 修改：`.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`

**接口**：
- 消费：任务 1 的「取代标注形制」节名。
- 产出：最终任务模板新步骤序（1 全量验证 / 2 退役检查 / 3 取代回写 / 4 合并 / 5 台账清理 / 6 sync_commit 锚定）——任务 5 的 executing-plans 引用与本计划自身最终任务（任务 12）都按此步骤序。

> 本任务同时修改 writing-plans 判据文本（test-scoping 部分取代面的实施）与 test-scoping spec 本体（Requirement 标注 + 术语表同步 + pending 行移除）——同一提交，合并时一并生效，符合 ADR-0001 交付时点。

- [x] **步骤 1：断言红**

```bash
grep -c "取代回写" skills/writing-plans/SKILL.md                                        # 预期 0
grep -c "被 \`Superseded\` 标注" .spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md  # 预期 0
```

- [x] **步骤 2：编辑 writing-plans/SKILL.md（三处）**

2a. 「Spec 状态检查」段中「无 frontmatter 的旧版/外部 spec 跳过本检查」句之前插入：

```
为 `superseded` 时停下告知用户该 spec 已被取代（附 `superseded_by` 指向；沿指针链跳转时记录已访问路径，链上出现环则列出环上文件并停止），经用户显式确认才可继续按旧 spec 编写计划；正文带 `Superseded-pending` 标注时向用户提示「该 spec 正被 <新 spec> 取代中（待交付）」后再继续。
```

2b. 最终任务模板中步骤 2（测试退役检查）的判据句改写。原文：

```
扫描路径落在本计划「相关测试范围」内的测试，找孤儿测试：测试名对不上任何 active spec
的 Scenario（判定基础是本 skill"测试名沿用 Scenario 名"约定；不合该命名约定的历史测试
不进候选，保守豁免），且对应 Requirement 已 REMOVED 或所属 spec 已 superseded——双条件
缺一不可。
```

改为：

```
扫描路径落在本计划「相关测试范围」内的测试，找孤儿测试：测试名对不上任何 active spec
的**现行** Scenario（现行=所在 Requirement 未被 `Superseded` 标注；判定基础是本 skill
"测试名沿用 Scenario 名"约定，不合该命名约定的历史测试不进候选，保守豁免），且对应
Requirement 已 REMOVED、**或其标题下带 `Superseded` 标注**、或所属 spec 已 superseded——
双条件缺一不可。
```

2c. 最终任务模板在步骤 2 与原步骤 3（合并回来源分支）之间插入新步骤 3，原步骤 3/4/5 顺延为 4/5/6（同步改模板内步骤引用文字与示意编号）：

```markdown
- [x] **步骤 3：取代回写（spec 无 `supersedes` 声明时声明"无取代回写"后跳过）**

按 spec「取代与共存」节逐项执行（形制见 spec-template「取代标注形制」节；实施任务中已完成的回写在此逐项核对后勾选）：
- 完全取代：旧 spec frontmatter `status` 翻 `superseded`、`superseded_by` 填本 spec 仓库根路径；H1 下 `Superseded-pending` 行替换为 `Superseded` 行；此后该 spec 的 sync_commit 冻结。
- 部分取代：旧 spec 保持 active，每条被取代 `### Requirement:` 标题下插入 Superseded 标注行；H1 下 pending 行移除；同步「取代与共存」节要求的关联文本（判据、术语表等）。
- covers 接管核对（仅完全取代）：列出旧 spec covers 中不被本 spec covers 覆盖且仍存在的路径差集；差集非空 → 停下征询用户（补进本 spec covers / 确认放弃保护并记录），不静默翻转。
- 回写随本分支合并进主线生效，与步骤 6 的 sync_commit 锚定构成取代提交组（revert 该组即原子恢复）。
```

- [x] **步骤 3：编辑 test-scoping spec（部分取代回写，三处）**

3a. 移除 H1 下的 `> **Superseded-pending (2026-08-10)** — …` 整行。

3b. 「### Requirement: 随周期测试退役检查」标题下插入（日期用执行日）：

```markdown
> **Superseded ($(date +%F))** — by .spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md#requirement-孤儿测试退役判据可闭环；原文保留仅作历史参考。
```

3c. 术语表「孤儿测试」定义行改为：

```markdown
- **孤儿测试**：测试名对不上任何 active spec 的现行 Scenario，且对应 Requirement 已 REMOVED、或被 `Superseded` 标注、或所属 spec 已 superseded 的测试（判据自 supersede-lifecycle 起含标注分支）。_Avoid_：过期测试、废弃测试
```

- [x] **步骤 4：断言绿 + 校验**

```bash
grep -c "取代回写" skills/writing-plans/SKILL.md                                        # ≥2
grep -c "或其标题下带 \`Superseded\` 标注" skills/writing-plans/SKILL.md                  # ≥1
grep -c "Superseded-pending" .spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md  # 0（已移除）
grep -c "原文保留仅作历史参考" .spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md # ≥1
node scripts/validate-skills.mjs && SKIP_OPENAI_SYNC_CHECK=1 node scripts/check-openai-sync.mjs
```

- [x] **步骤 5：提交**

```bash
/usr/bin/git add skills/writing-plans/SKILL.md .spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T4): writing-plans 载入取代检查与最终任务取代回写步骤；test-scoping 部分取代回写（自举）"
/usr/bin/git show HEAD --stat
```

### 任务 5：executing-plans 引用同步与 critic 过滤

**文件**：
- 修改：`skills/executing-plans/SKILL.md`
- 修改：`skills/executing-plans/references/review-orchestration.md`

**接口**：
- 消费：任务 4 的最终任务新步骤序（1 验证 / 2 退役 / 3 取代回写 / 4 合并 / 5 台账 / 6 锚定）。

- [x] **步骤 1：断言红**

```bash
grep -c "取代回写" skills/executing-plans/SKILL.md                       # 预期 0
grep -c "现行 Requirement" skills/executing-plans/references/review-orchestration.md  # 预期 0
```

- [x] **步骤 2：编辑 SKILL.md（两处）**

2a. 阶段 6 第 2 点中「执行计划的最终任务（全量验证——…」的括注步骤枚举里，在「→ 合并回来源分支」之前插入「→ **取代回写**（按 spec 取代与共存节执行翻转/标注/covers 接管核对，无声明则跳过）」；同句尾「计划缺最终任务或缺锚定步骤（旧版计划）时按同等步骤手工收尾」中"同等步骤"后追加「（含取代回写）」。

2b. 阶段 3 偏差处理「**意图级偏差**」条目句尾追加：

```
；收尾废弃计划时，若其 spec 已激活并已打出 Superseded-pending 标注，一并回收（删除旧 spec 上的 pending 行）并在最终总结注明
```

- [x] **步骤 3：编辑 review-orchestration.md（两处）**

3a. completeness critic 指令中「对照 spec 行为规范的 Requirement 清单」改为「对照 spec 行为规范的**现行** Requirement 清单（被 `Superseded` 标注的 Requirement 及其 Scenario 排除，不得报为未覆盖）」。

3b. acceptance-qa 联动句「Tier A 检查项直接引用 spec 中的 Scenario」改为「Tier A 检查项直接引用 spec 中的现行 Scenario」。

- [x] **步骤 4：断言绿 + 校验**

```bash
grep -c "取代回写" skills/executing-plans/SKILL.md                       # ≥1
grep -c "现行" skills/executing-plans/references/review-orchestration.md  # ≥2
node scripts/validate-skills.mjs && SKIP_OPENAI_SYNC_CHECK=1 node scripts/check-openai-sync.mjs
```

- [x] **步骤 5：提交**

```bash
/usr/bin/git add skills/executing-plans/SKILL.md skills/executing-plans/references/review-orchestration.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T5): executing-plans 取代回写引用、pending 回收、critic 现行过滤"
/usr/bin/git show HEAD --stat
```

### 任务 6：quick-fix 反查时效过滤

**文件**：
- 修改：`skills/quick-fix/SKILL.md`

- [x] **步骤 1：断言红**

```bash
grep -c "superseded_by" skills/quick-fix/SKILL.md
```
预期：0。

- [x] **步骤 2：编辑**

步骤 2「spec 反查」小节中「筛出 `spec_dev.status: active` 且 `covers` glob 命中嫌疑文件的 spec，把其相关 Requirement/Scenario 读入上下文」句之后插入：

```
**命中 spec 的时效处理**：status 为 `superseded` 的沿其 frontmatter `superseded_by` 跳转至 active 后继（跳转记录已访问路径集合，出现环即停下向用户报告环上文件清单）；正文带 `Superseded-pending` 标注的，以其指向的新 spec 为新工作依据、旧文为已实现行为描述，两者并陈说明。被 `Superseded` 标注的 Requirement 不作为"实现偏离 spec"的修复判据；诊断存量行为时可将已取代契约作为历史参考读取——排障允许读旧契约，修复方向以现行契约为准。同一行为面出现两份 active spec 矛盾且互无取代声明时，列出双方交用户裁决（此即升级门信号之一）。
```

- [x] **步骤 3：断言绿 + 校验**

```bash
grep -c "superseded_by" skills/quick-fix/SKILL.md   # ≥1
node scripts/validate-skills.mjs && SKIP_OPENAI_SYNC_CHECK=1 node scripts/check-openai-sync.mjs
```

- [x] **步骤 4：提交**

```bash
/usr/bin/git add skills/quick-fix/SKILL.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T6): quick-fix 反查时效过滤、链跳转防环、排障放宽"
/usr/bin/git show HEAD --stat
```

---

## 验收链路

### 任务 7：acceptance-qa 定位跳转、矩阵现行规则、SUPERSEDED verdict

**文件**：
- 修改：`skills/acceptance-qa/SKILL.md`
- 修改：`skills/acceptance-qa/references/acceptance-matrix.md`
- 修改：`skills/acceptance-qa/templates/acceptance-report.md`
- 核对：`skills/acceptance-qa/evals/evals.json`（只在断言脱节时改）

- [x] **步骤 1：断言红**

```bash
grep -c "SUPERSEDED" skills/acceptance-qa/SKILL.md skills/acceptance-qa/templates/acceptance-report.md
grep -c "现行 Requirement" skills/acceptance-qa/references/acceptance-matrix.md
```
预期：均为 0。

- [x] **步骤 2：编辑 SKILL.md（三处）**

2a. 阶段 0 用户直接触发路径「定位对应 spec…沿用其矩阵」句后追加：

```
定位后读 spec frontmatter `status`：为 `superseded` 时沿 `superseded_by` 跳转 active 后继（记录已访问路径防环，出现环停下报告环上文件），以后继矩阵验收，报告头记录原始路径、实际使用路径与跳转链；正文带 `Superseded-pending` 标注时在报告头注明"取代进行中"。
```

2b. 阶段 0 executing-plans 触发路径「按本次变更面裁剪」后追加「，并跳过被 `Superseded` 标注 Requirement 对应行（独立裁剪原因，见 acceptance-matrix 裁剪规则）」。

2c. 阶段 5 报告结构中「存在 DEFERRED / DROPPED / ADDED-IN-FLIGHT 时展开差量表」改为「存在 DEFERRED / DROPPED / SUPERSEDED / ADDED-IN-FLIGHT 时展开差量表（SUPERSEDED＝契约已移交后继 spec；与 DROPPED 的分界：行为是否继续存在——存在但契约易主记 SUPERSEDED，不再交付记 DROPPED）」。

- [x] **步骤 3：编辑 acceptance-matrix.md（三处）**

3a. Scenario 引用规则句「优先直接引用 spec 行为规范中的 `#### Scenario:` 名称」后加「（仅现行 Requirement 下的 Scenario——被 `Superseded` 标注者不引用）」。

3b. 行数纪律「每条 Requirement 至少一行」改为「每条**现行** Requirement 至少一行（被 `Superseded` 标注的 Requirement 不出行）」。

3c. 变更面裁剪句追加「；「Requirement 已被取代」是独立于变更面的裁剪原因，同样写入 coverage_note（与"本次未触及"区分）」。

- [x] **步骤 4：编辑 acceptance-report.md（两处）**

4a. 头部 `> Spec: {{spec path or "none (mini matrix)"}}` 行后追加一行：

```markdown
> Spec status: {{active / superseded→跳转链 origin→…→actual / pending-取代进行中}}
```

4b. Requirement Reconciliation 表样例行（DEFERRED / DROPPED / ADDED-IN-FLIGHT）之后补一行样例：

```markdown
| [Requirement 名] | SUPERSEDED | 契约移交 {{后继 spec 仓库根路径}}（取代交付于 YYYY-MM-DD） |
```

- [x] **步骤 5：核对 evals.json**

```bash
grep -n "Requirement 覆盖\|回填" skills/acceptance-qa/evals/evals.json
```
逐条核对 expected_output 断言与改动后报告结构是否仍一致（报告仍含 Requirement 覆盖对照表与逐行回填状态——本任务未删除这些结构，预期无脱节）；发现脱节才修改对应断言文本，无脱节则零改动并在提交信息注明"evals 核对通过"。

- [x] **步骤 6：断言绿 + 校验**

```bash
grep -c "SUPERSEDED" skills/acceptance-qa/SKILL.md                         # ≥2
grep -c "现行" skills/acceptance-qa/references/acceptance-matrix.md         # ≥2
grep -c "SUPERSEDED" skills/acceptance-qa/templates/acceptance-report.md    # ≥1
node scripts/validate-skills.mjs && SKIP_OPENAI_SYNC_CHECK=1 node scripts/check-openai-sync.mjs
```

- [x] **步骤 7：提交**

```bash
/usr/bin/git add skills/acceptance-qa/SKILL.md skills/acceptance-qa/references/acceptance-matrix.md skills/acceptance-qa/templates/acceptance-report.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T7): acceptance-qa 定位跳转、矩阵现行 Requirement 规则、SUPERSEDED verdict"
/usr/bin/git show HEAD --stat
```

---

## 装机与脚本

### 任务 8：session-context 状态计数（真 TDD）+ 守卫报错文案

**文件**：
- 修改：`guardrail/session-context.mjs`
- 修改：`guardrail/check-spec-drift.mjs`（仅 report() 文案一行）

**接口**：
- 产出：注入行格式 `${specs.length} spec(s): ${active} active, ${superseded} superseded`（任务 9 的 README 描述引用此格式）。

- [x] **步骤 1：写失败测试（fixture 红）**

```bash
REPO=$(git rev-parse --show-toplevel)   # 先在 worktree 内记录仓库根，再进 fixture
TMP=$(mktemp -d /tmp/spec-dev-fixture.XXXXXX) && echo "$TMP"   # 记下路径，登记最终任务资源台账
cd "$TMP" && git init -q && mkdir -p .spec-dev/a/spec .spec-dev/b/spec
printf -- '---\nspec_dev:\n  version: 1\n  feature: a\n  status: active\n  covers: []\n---\n# a\n' > .spec-dev/a/spec/a-design.md
printf -- '---\nspec_dev:\n  version: 1\n  feature: b\n  status: superseded\n  covers: []\n---\n# b\n' > .spec-dev/b/spec/b-design.md
git add -A && git -c user.email=t@t -c user.name=t commit -qm init
node "$REPO/guardrail/session-context.mjs" | grep "1 active, 1 superseded"
```

- [x] **步骤 2：运行确认失败**

预期：grep 无匹配（exit 1）——现版注入行只有 `2 spec(s)` 总数。

- [x] **步骤 3：写最小实现**

3a. `guardrail/session-context.mjs` 顶部 import 行 `import { existsSync } from "node:fs";` 改为 `import { existsSync, readFileSync } from "node:fs";`。

3b. `if (specs.length === 0) process.exit(0);` 行之后插入：

```js
// 状态细分计数：active 参与守卫，superseded 是历史层——接手会话第一眼需要知道两者都存在。
// 最小 frontmatter 读取（仅 status 一键），解析失败的文件不计入细分、仍在总数内。
const statusCount = { active: 0, superseded: 0 };
for (const rel of specs) {
  try {
    const m = readFileSync(path.join(root, rel), "utf8").match(/^\s{2}status:\s*([\w-]+)/m);
    if (m && statusCount[m[1]] !== undefined) statusCount[m[1]] += 1;
  } catch {
    // 单文件读取失败不影响注入
  }
}
```

3c. 注入模板中 `（共 ${specs.length} 份 spec）` 与 `(${specs.length} spec(s))` 两处替换为 `（共 ${specs.length} 份 spec：${statusCount.active} active, ${statusCount.superseded} superseded）` 与 `(${specs.length} spec(s): ${statusCount.active} active, ${statusCount.superseded} superseded)`。

3d. `guardrail/check-spec-drift.mjs` report() 中第 3 条指引行改为：

```js
  lines.push(`  3) If the spec is obsolete, set its frontmatter ${B("status")} to superseded AND fill ${B("superseded_by")} with the successor spec path (write a lightweight REMOVED-only successor spec if the feature is simply deleted). / 该 spec 已作废时，把其 frontmatter 的 status 改为 superseded 并同时填写 superseded_by 指向后继 spec（特性纯删除时先写一份仅含 REMOVED 的轻量后继 spec）。`);
```

- [x] **步骤 4：运行确认通过**

重跑步骤 1 的 fixture 命令，预期 grep 命中；另在本仓库根跑 `node guardrail/session-context.mjs | head -3`，预期含 `5 spec(s): 5 active, 0 superseded`（本仓库现状 5 份 active——含本特性 spec）。

- [x] **步骤 5：提交**

```bash
/usr/bin/git add guardrail/session-context.mjs guardrail/check-spec-drift.mjs
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T8): session-context 状态细分计数；守卫报错第 3 条补 superseded_by 义务"
/usr/bin/git show HEAD --stat
```

### 任务 9：装机侧 superseded 语义重写（snippet×2 + README×2）

**文件**：
- 修改：`guardrail/templates/CLAUDE.md.snippet`（中英两段）
- 修改：`guardrail/templates/AGENTS.md.snippet`（中英两段）
- 修改：`guardrail/README.md`、`guardrail/README.zh-CN.md`

**接口**：
- 消费：任务 8 的注入行格式（README 如有描述则同步）。

- [x] **步骤 1：断言红**

```bash
grep -rc "superseded_by" guardrail/templates/ guardrail/README.md guardrail/README.zh-CN.md
```
预期：全部 0。

- [x] **步骤 2：编辑两份 snippet（各自中英两段，共四处）**

将义务清单第 4 条中「; mark an obsolete spec's frontmatter `status` as `superseded`. / …spec 作废则把其 frontmatter `status` 改为 `superseded`。」从该条移除（该条只保留 trailer 与环境变量），并在其后新增第 5 条：

英文段：

```markdown
5. `superseded` is a lifecycle terminal state, not an escape hatch. Mark a spec superseded only together with `superseded_by` pointing to its successor spec (same change); the successor's `covers` must take over the old spec's still-existing paths (no guard vacuum), and the old spec's `sync_commit` freezes at that point. When you land on a superseded spec, follow `superseded_by` to the successor — never base new work on it (it stays readable as history). If a feature is simply deleted with no successor behavior, write a lightweight REMOVED-only spec as the successor to record the reason.
```

中文段：

```markdown
5. `superseded` 是生命周期终态，不是逃生舱。把 spec 置为 superseded 必须在同一变更内填写 `superseded_by` 指向后继 spec；后继 spec 的 `covers` 须接管旧 spec 中仍存在的路径（不留守卫真空），旧 spec 的 `sync_commit` 自此冻结。读到 superseded spec 时沿 `superseded_by` 跳转后继——不得依据其行为规范开展新工作（它仅作历史可读）。特性纯删除、无后继行为时，写一份仅含 REMOVED 的轻量 spec 作为后继以记录原因。
```

- [x] **步骤 3：编辑 README.zh-CN.md（三处）与 README.md（等价镜像同步）**

3a. 判定逻辑句「一批变更命中某 `status: active` spec 的 `covers`、却没同时改动该 spec，即判为漂移。」后追加：「spec 被取代（superseded）时其 covers 退出拦截——后继 spec 必须接管仍存在的路径，否则出现无人守护的真空；取代回写由 spec-dev 的 executing-plans 收尾强制执行。」

3b. sync_commit 定义句后追加：「superseded spec 的 sync_commit 冻结在取代提交，此后不再更新。」

3c. 「临时放行」清单中「spec 作废：把 frontmatter `status` 改为 `superseded`。」一行移出该清单，改写为独立段落（语义同 snippet 第 5 条中文段，措辞可精简为两句）。

- [x] **步骤 4：断言绿 + 校验**

```bash
grep -rc "superseded_by" guardrail/templates/CLAUDE.md.snippet guardrail/templates/AGENTS.md.snippet guardrail/README.md guardrail/README.zh-CN.md   # 每文件 ≥1
node scripts/check-plugin.mjs
```

- [x] **步骤 5：提交**

```bash
/usr/bin/git add guardrail/templates/CLAUDE.md.snippet guardrail/templates/AGENTS.md.snippet guardrail/README.md guardrail/README.zh-CN.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T9): 装机侧 superseded 重写为生命周期终态（指针义务、covers 接管、sync_commit 冻结）"
/usr/bin/git show HEAD --stat
```

### 任务 10：resource-ledger 存量对账（covers 补声明 + 决策行修正）

**文件**：
- 修改：`.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md`

- [x] **步骤 1：断言红**

```bash
grep -c "covers: \[\]" .spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md
```
预期：≥1（现状为空数组）。

- [x] **步骤 2：编辑（两处）**

2a. frontmatter `covers: []` 改为：

```yaml
  covers:
    - "skills/writing-plans/SKILL.md"
    - "skills/executing-plans/SKILL.md"
    - "skills/acceptance-qa/SKILL.md"
    - "skills/quick-fix/SKILL.md"
```

2b. 「已确认的关键决策」中「`covers: []`：本特性无新增文件，且 writing-plans/executing-plans 已被子项目④的 active spec 声明拥有，留空规避双 spec 抢占。」整行改为：

```markdown
- covers 声明四个 SKILL.md（writing-plans / executing-plans / acceptance-qa / quick-fix）：依 supersede-lifecycle 的双声明规则，与 test-scoping 等 spec 分面共存、各自声明所辖切面（改单面时对另一份用 `Spec-Guard: off` trailer 放行）。历史上曾留空规避"双 spec 抢占"，于 2026-08-10 存量对账修正。
```

- [x] **步骤 3：断言绿**

```bash
grep -c "covers: \[\]" .spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md   # 0
grep -c "双声明规则" .spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md      # ≥1
```

- [x] **步骤 4：提交**

```bash
/usr/bin/git add .spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "feat(T10): resource-ledger 存量对账——covers 双声明补全、抢占规避决策行修正"
/usr/bin/git show HEAD --stat
```

---

## 验收与收尾

### 任务 11：验收（acceptance-qa）

> 本任务由 executing-plans 收尾审查阶段触发 acceptance-qa 按下表执行，
> 不参与逐任务连续执行；报告与证据落盘特性目录 `acceptance/` 子目录。

| Scenario / 检查项 | 维度 | 执行方式 | 目标 | 阈值/预期 | 验收证据 |
|-------------------|------|---------|------|----------|---------|
| 完全取代 / 部分取代 / 分面共存三场景产物形态走查（对照 spec 全部 21 个 Scenario 逐条核对文档落位：模板形制、SKILL 挂点、标注实例） | ai-acceptance | 验收任务 (A) | 本仓库 17 个改动文件 + test-scoping/resource-ledger 两份 spec | 每个 Scenario 找到对应落位文本，零缺口 | 走查记录（逐 Scenario 引用 file:line） |
| 存量对账落地核对：resource-ledger covers 非空且决策行更新；test-scoping Requirement 标注 + 术语表同步 + pending 行已移除；clarifying/triage 确认零动作 | integration | 验收任务 (D) | `.spec-dev/` 下 4 份既有 spec | frontmatter 与正文 diff 与 spec 取代与共存节一致 | `git diff 5cb373b..HEAD -- .spec-dev/2026-08-09-*` 输出核对 |

### 任务 12：合并与清理

**资源台账**（清理依据；执行中创建即追加；行格式 `- [ ] <类型>: <标识> —— <清理命令>`）：

- [ ] worktree: .worktrees/plan-2026-08-10-supersede-lifecycle —— `git worktree remove .worktrees/plan-2026-08-10-supersede-lifecycle && git branch -d plan/2026-08-10-supersede-lifecycle`
- [ ] 临时目录: 任务 8 fixture `$TMP`（/tmp/spec-dev-fixture.*） —— `rm -rf /tmp/spec-dev-fixture.VSRPUH`

台账总则：清理只遍历本台账、台账外一律不动；共享缓存默认保留。

> 本最终任务按任务 4 引入的**新步骤序**自举执行（1 全量验证 / 2 退役检查 / 3 取代回写 / 4 合并 / 5 台账清理 / 6 sync_commit 锚定）。

- [ ] **步骤 1：全量验证（安全网）**

在 worktree 内跑「相关测试范围」三条校验命令 + 任务 8 fixture 断言。全绿 → 步骤 2；失败 → 修复复跑（本特性无范围外测试，归属裁决不适用）。

- [ ] **步骤 2：测试退役检查**

本仓库无传统测试套件，「相关测试范围」为校验脚本而非测试文件——扫描无对象，声明"无孤儿测试候选"后跳过。

- [ ] **步骤 3：取代回写核对**

本 spec 声明部分取代 test-scoping（见其「取代与共存」节），回写已在任务 4 随实施完成——逐项核对后勾选：test-scoping「随周期测试退役检查」标题下有 Superseded 标注行；H1 下 pending 行已移除；术语表已同步；本 spec 无完全取代 → covers 接管核对不适用。核对不通过 → 回任务 4 补齐后重跑。

- [ ] **步骤 4：合并回来源分支**

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"
/usr/bin/git merge plan/2026-08-10-supersede-lifecycle
```

合并冲突、或主工作区有未提交改动 → 停下向计划作者确认，不强行合并。

- [ ] **步骤 5：清理（按资源台账逐条执行）**

逐条执行台账清理命令并勾选；失败的行保留未勾选并报告；台账外一律不动。

- [ ] **步骤 6：sync_commit 锚定**

```bash
SYNC=$(git rev-parse HEAD)
# 把 .spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md
# frontmatter 的 sync_commit: null 更新为 "$SYNC"
/usr/bin/git add .spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md
SKIP_CODEX_PACKAGE_HOOK=1 SKIP_RELEASE_HOOK=1 /usr/bin/git commit -m "chore(spec): supersede-lifecycle sync_commit 锚定 ${SYNC:0:7}"
/usr/bin/git show HEAD --stat
```

锚定后提醒用户：本次交付以 SKIP_RELEASE_HOOK=1 跳过了自动发版，需手动发版（`node scripts/release.mjs`）。
