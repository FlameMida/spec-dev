# triage-routing 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。步骤用复选框（`- [ ]`）语法跟踪；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：新增 `/triage` 显式分诊薄命令，补齐 quick-fix 升级上下文交接与"拿不准档默认 quick-fix"倾向，为非开发交付开报告通道，并回填 clarifying 出口 1。

**Spec**：`.spec-dev/2026-08-08-triage-routing/spec/triage-routing-design.md`

**架构**：1 个新命令（引用式，判据以各 SKILL.md 为准）+ 3 个 skill 的定点文本改造（quick-fix / requirement-analysis / clarifying）+ clarifying spec 数据流行同步 + 双端发布面。报告通道权威定义唯一落在 requirement-analysis 阶段 1。

**技术栈**：Markdown 命令/skill 文档、JSON（evals、plugin 清单）；校验依赖仓库既有 Node 脚本。

## 全局约束

- **纯文档特性，TDD 铁律例外**（spec 已裁决）：每任务以"写文件 → 跑校验 → 提交"替代红绿循环；行为断言落在引用方 evals。
- **pre-commit 三校验必须全绿**：`node scripts/check-plugin.mjs --codex-validate`、`node scripts/validate-skills.mjs`、`node scripts/check-openai-sync.mjs`。
- **openai-sync 豁免**：任务 2/3/4 暂存了 SKILL.md 但 frontmatter description 未变（触发面不受影响），提交用 `SKIP_OPENAI_SYNC_CHECK=1` 并在此注明原因；任务 1 只新增 commands/ 文件，不触发该检查。
- **CHANGELOG 与版本号由 post-commit 自动发版承载**：不手写、不使用 `SKIP_RELEASE_HOOK`。worktree 内发版 hook 不生效（子项目①实测：版本停在基点、无 tag）属预期——合并回 main 后的提交会触发发版。
- **空提交护栏（子项目①事故经验）**：worktree 内每次 `git commit` 后核验 `git show --stat HEAD` 列出了预期文件；若 diff 为空（提交树等于父树），用 `git write-tree` 取树 SHA → `SKIP_RELEASE_HOOK=1 git commit-tree <tree> -p <parent> -m "<message>"` → `git update-ref HEAD <commit>` 兜底重做，再核验。
- **术语沿用 spec 术语表**：报告通道、非开发交付、拿不准档；不得混入 Avoid 别名。
- 分支名：`plan/2026-08-08-triage-routing`。

---

### 任务 0：建立隔离工作区

- [ ] **步骤 1：检测已有隔离**

运行：`git rev-parse --git-dir` 与 `git rev-parse --git-common-dir`
两者不同、且 `git rev-parse --show-superproject-working-tree` 无输出（排除 submodule）
→ 已在隔离工作区，跳过本任务。

- [ ] **步骤 2：建立 worktree**

有原生 worktree 工具（如 EnterWorktree）或 using-git-worktrees skill 时优先使用（Codex 无原生 worktree 工具，直接走下面的手工路径）；否则手工降级：
确认 `.worktrees/` 已被忽略（`git check-ignore -q .worktrees`，未忽略先加入 `.gitignore` 并提交），然后
`git worktree add .worktrees/plan/2026-08-08-triage-routing -b plan/2026-08-08-triage-routing` 并切换到该目录。

- [ ] **步骤 3：安装依赖并验证基线**

本仓库无依赖安装步骤（根目录无 package.json），基线即三校验：

```bash
node scripts/check-plugin.mjs --codex-validate && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs
```

预期：三者退出码 0。基线失败 → 停下报告，先问再继续。

---

## 命令主体

### 任务 1：创建 commands/triage.md

**文件**：
- 创建：`commands/triage.md`

**接口**：
- 消费：无（首任务）
- 产出：命令名 `/triage`；正文中"四维度判定""四出口""报告通道指向 requirement-analysis 阶段 1 任务类型检查"的表述，任务 2/3/4 的引用方文本与之同向。

- [ ] **步骤 1：写命令文件**

写入 `commands/triage.md`，完整内容：

````markdown
---
description: Explicit triage entry - judge commitment / task type / design space and route to the right lane (quick-fix / requirement-analysis / exploring / report lane); advisory only, zero files written / 显式分诊入口——判定承诺状态/任务类型/设计空间，把需求路由到正确通道（quick-fix / requirement-analysis / exploring / 报告通道）；判定仅为建议、全程零落盘
---

# 需求分诊（Triage）

把用户的一个需求判定到正确的处理通道。本命令是**可选的显式入口**：不调用它时，各 skill 的入口自检照常自动兜底；用户已点名某个 skill 的请求也不必经过本命令——显式调用优先级最高。

## 输入

- `$ARGUMENTS` 非空 → 直接对其分析；
- 为空 → 先问一句"要分诊什么需求"，得到答复后再判定。

## 判定（四维度）

**判据的权威定义在各 SKILL.md，本命令只列维度与指向、不复制判据细节**——判据在各 skill 中演进时，本命令无需同步修改。

1. **承诺状态**：还没决定要不要做（探索性措辞、无交付承诺）→ **exploring**（分界判据见 exploring 的 SKILL.md）
2. **任务类型**：已承诺交付、但交付物不是代码变更（调研报告、方案对比、日志分析等）→ **报告通道**（权威定义与落盘约定见 requirement-analysis SKILL.md 阶段 1 的任务类型检查）
3. **设计空间**：已承诺的开发任务——明显是无设计空间的小修 → **quick-fix**（判据见其入口分诊自检）；明显有设计空间（新功能、行为变更、技术选型落地）→ **requirement-analysis**
4. **大小拿不准**：已承诺的开发请求、无法从措辞判定大小/设计空间 → 默认建议 **quick-fix 起步**——升级便宜、降级浪费，其步骤 2.5 的证据式升级门（含上下文交接）是安全网

## 输出（语义模板，以对话语言表达）

呈现分诊结果并等待用户确认：

- **判定**：对需求的一句话定性（承诺状态 / 任务类型 / 设计空间）；
- **建议路线**：推荐的通道放首位并说明理由；
- **判定依据**：命中了哪个维度、为什么；
- **四出口确认**：quick-fix / requirement-analysis / exploring / 报告通道，用户可改选任意出口；
- **拿不准时**：说明拿不准的原因，列出两个候选出口供用户挑选，不硬判单一路线。

## 路由（用户确认后）

- **quick-fix / requirement-analysis / exploring** → 调用对应 skill，把**请求原文 + 分诊依据**作为其输入传递；
- **报告通道** → 按 requirement-analysis 阶段 1 任务类型检查定义的约定执行，传递同等上下文。

本命令全程**不落盘任何文件**，判定只存在于对话中；用户改选出口时照选，不坚持原判定。

## Codex 说明

Codex 端 `commands/` 不随插件加载、本命令不可见：同等分诊行为由各 SKILL.md 的入口自检兜底 + 插件 defaultPrompt 提示词引导承载。
````

- [ ] **步骤 2：运行校验确认通过**

```bash
node scripts/check-plugin.mjs --codex-validate && node scripts/validate-skills.mjs
```

预期：退出码 0（commands/ 不参与 skill 校验与 marketplace skills[] 同步，新文件不引入失败项）。

- [ ] **步骤 3：提交**

```bash
git add commands/triage.md
git commit -m "feat(T1): 新增 /triage 显式分诊命令——四维度判定、四出口建议式路由、引用不复制判据"
```

提交后核验 `git show --stat HEAD` 含 `commands/triage.md | 1 file changed`；为空则按全局约束的空提交护栏兜底。

---

## 引用方改造

### 任务 2：quick-fix——默认倾向 + 升级交接 + eval

**文件**：
- 修改：`skills/quick-fix/SKILL.md`（分诊三角节表格后、步骤 2.5 末句）
- 修改：`skills/quick-fix/evals/evals.json`（末尾追加 1 条）

**接口**：
- 消费：任务 1 的"拿不准档默认 quick-fix"表述方向（两处必须同向）
- 产出：升级交接句（根因 + spec 反查结果 + 已裁决澄清答案 → requirement-analysis 阶段 1 输入），任务 3 的 requirement-analysis 侧对偶句与之互相印证。

- [ ] **步骤 1：分诊三角节表格后追加默认倾向段**

在 `## 定位：分诊三角里的位置` 节的表格之后（`| requirement-analysis | 已承诺 + 有设计空间 | 有 | 交接 writing-plans |` 行与下一个 `## ` 标题之间）插入：

```markdown

**拿不准档默认倾向**：已承诺的开发请求、大小/设计空间拿不准时，默认先进 quick-fix——升级便宜、降级浪费；步骤 2.5 基于根因证据的升级门（含上下文交接）是安全网。与 requirement-analysis 阶段 1 小修检查的对偶表述同向。
```

- [ ] **步骤 2：步骤 2.5 末句补上下文交接**

将步骤 2.5 节末句：

> 升级经用户同意后调用 requirement-analysis skill。

替换为：

```markdown
升级经用户同意后调用 requirement-analysis skill，**并把已定位的根因、spec 反查结果与步骤 3 已裁决的澄清答案作为其阶段 1 输入——其阶段 2 不重查已查证部分、阶段 3 不重问已裁决问题，升级不等于重来**。
```

- [ ] **步骤 3：evals.json 追加升级交接用例**

在 `skills/quick-fix/evals/evals.json` 的 evals 数组末尾（`"id": "qf-new-feature-routes-away"` 对象之后）追加：

```json
    {
      "id": "qf-escalate-carries-context",
      "prompt": "（quick-fix 升级门命中跨模块，用户同意升级 requirement-analysis）",
      "expected_output": "升级携带上下文交接：把已定位的根因、spec 反查结果与已裁决的澄清答案作为 requirement-analysis 阶段 1 输入；其阶段 2 不重查已查证部分、阶段 3 不重问已裁决问题——升级不等于重来"
    }
```

（注意前一对象后补逗号，保持 JSON 合法。）

- [ ] **步骤 4：校验并提交**

```bash
node -e "JSON.parse(require('fs').readFileSync('skills/quick-fix/evals/evals.json')); console.log('JSON OK')"
node scripts/validate-skills.mjs
git add skills/quick-fix/SKILL.md skills/quick-fix/evals/evals.json
SKIP_OPENAI_SYNC_CHECK=1 git commit -m "feat(T2): quick-fix 拿不准档默认倾向 + 升级上下文交接——升级不等于重来，附 eval 用例"
```

（豁免原因：description 未变，触发面不受影响。）提交后核验 `git show --stat HEAD` 列出两个文件。

### 任务 3：requirement-analysis——任务类型检查 + 对偶句 + eval

**文件**：
- 修改：`skills/requirement-analysis/SKILL.md`（阶段 1 小修检查条目尾部 + 其后新增任务类型检查条目）
- 修改：`skills/requirement-analysis/evals/evals.json`（末尾追加 1 条）

**接口**：
- 消费：任务 2 的默认倾向表述（对偶句必须同向）；任务 1 对"报告通道权威定义在本条"的指向
- 产出：**报告通道权威定义**（`.spec-dev/reports/YYYY-MM-DD-<topic>.md` 落盘约定），任务 1/4 引用不复制。

- [ ] **步骤 1：小修检查条目尾部追加对偶句**

将阶段 1 小修检查条目（以 `- **小修检查**：` 开头的行）的末句：

> 建议式（不自动切换），由用户裁决

替换为：

```markdown
建议式（不自动切换），由用户裁决。大小/设计空间拿不准的已承诺开发请求，同样建议先走 quick-fix——其步骤 2.5 基于根因证据的升级门（含上下文交接）比入口猜测更准，升级便宜、降级浪费
```

- [ ] **步骤 2：新增任务类型检查条目**

在小修检查条目行之后、`- **范围分解检查**：` 行之前插入：

```markdown
- **任务类型检查（报告通道权威定义）**：需求已承诺交付、但交付物不是代码变更（调研报告、方案对比、日志分析等非开发交付）→ 建议走报告通道，不硬拉八阶段：不建特性目录、不写 spec/plan；需要时按 clarifying 纪律澄清关注点；主线程产出结论后**问一次**「落盘为 `.spec-dev/reports/YYYY-MM-DD-<topic>.md` 吗」（结构从轻：问题、结论、依据来源；目录随首个报告创建），用户婉拒则只留对话、零落盘。建议式，由用户裁决。结论要落地成代码时回归正常分诊——报告通道不是实施后门
```

- [ ] **步骤 3：evals.json 追加报告通道用例**

在 `skills/requirement-analysis/evals/evals.json` 的 evals 数组末尾（`"id": "ra-adversarial-info-check"` 对象之后）追加：

```json
    {
      "id": "ra-non-dev-report-lane",
      "prompt": "调研一下 Kafka 和 RabbitMQ 哪个更适合我们的场景，给我结论就行",
      "expected_output": "阶段 1 任务类型检查命中非开发交付：建议走报告通道——不建特性目录、不写 spec/plan、不硬拉八阶段；需要时按 clarifying 纪律澄清关注点；产出结论后问一次是否落盘 .spec-dev/reports/YYYY-MM-DD-<topic>.md，婉拒则零落盘；结论要落地成代码时回归正常分诊"
    }
```

（前一对象后补逗号。）

- [ ] **步骤 4：校验并提交**

```bash
node -e "JSON.parse(require('fs').readFileSync('skills/requirement-analysis/evals/evals.json')); console.log('JSON OK')"
node scripts/validate-skills.mjs
git add skills/requirement-analysis/SKILL.md skills/requirement-analysis/evals/evals.json
SKIP_OPENAI_SYNC_CHECK=1 git commit -m "feat(T3): requirement-analysis 任务类型检查与报告通道权威定义 + 拿不准档对偶句，附 eval 用例"
```

（豁免原因同任务 2。）提交后核验非空。

### 任务 4：clarifying 出口 1 回填 + 其 spec 数据流同步

**文件**：
- 修改：`skills/clarifying/SKILL.md`（独立会话模式节三出口的出口 1）
- 修改：`.spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md`（方案设计-数据流行）

**接口**：
- 消费：任务 3 产出的报告通道权威定义（引用不复制）
- 产出：无（终端改造；两文件同 commit，符合漂移守卫纪律——clarifying spec covers `skills/clarifying/**` 且 active）。

- [ ] **步骤 1：改写出口 1**

将 `skills/clarifying/SKILL.md` 三出口中的：

> - **转主流程**——按承诺状态与设计空间建议 requirement-analysis（已承诺、有设计空间）或 quick-fix（已承诺、无设计空间），经用户确认后调用；共识结论作为下游输入，**已裁决过的问题不在下游重问**

替换为：

```markdown
   - **转主流程**——按承诺状态、任务类型与设计空间建议 requirement-analysis（已承诺、有设计空间）、quick-fix（已承诺、无设计空间）或报告通道（已承诺的非开发交付，约定见 requirement-analysis 阶段 1 任务类型检查），经用户确认后进入；共识结论作为下游输入，**已裁决过的问题不在下游重问**
```

（保持原有三空格缩进的列表层级。）

- [ ] **步骤 2：同步 clarifying spec 数据流行**

将 `.spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md` 数据流节中的：

> 三出口分发（requirement-analysis / quick-fix ｜ 结束 ｜ `.spec-dev/explorations/<topic>.md`；报告通道待 roadmap 子项目②落地后追加为转主流程目标）

替换为：

```markdown
三出口分发（requirement-analysis / quick-fix / 报告通道 ｜ 结束 ｜ `.spec-dev/explorations/<topic>.md`）
```

- [ ] **步骤 3：校验并提交（两文件同 commit）**

```bash
node scripts/validate-skills.mjs
git add skills/clarifying/SKILL.md .spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md
SKIP_OPENAI_SYNC_CHECK=1 git commit -m "feat(T4): clarifying 出口 1 追加报告通道目标——spec 数据流行同步，消除待追加注记"
```

（豁免原因：clarifying description 未变。）提交后核验非空。

---

## 发布面

### 任务 5：README 双语 + Codex defaultPrompt/keywords

**文件**：
- 修改：`README.md`（用法区约 239 行、目录树约 270 行）
- 修改：`README.zh-CN.md`（对应两处）
- 修改：`.codex-plugin/plugin.json`（keywords、interface.defaultPrompt）

**接口**：
- 消费：任务 1 的命令名 `/triage`
- 产出：无（终端发布面）。CHANGELOG/版本号由 post-commit 自动发版承载，本任务不动。

- [ ] **步骤 1：README.md 两处**

在 `Check MCP configuration status: ` + '`/check-mcp`' 行之后追加一行：

```markdown
Triage a request to the right lane: `/triage <request>`
```

目录树注释行 `├── commands/                        # /check-mcp command` 改为：

```markdown
├── commands/                        # /check-mcp, /triage commands
```

- [ ] **步骤 2：README.zh-CN.md 两处**

在 `检查 MCP 配置状态：` + '`/check-mcp`' 行之后追加一行：

```markdown
把一个需求分诊到正确通道：`/triage <需求>`
```

目录树注释行 `├── commands/                        # /check-mcp 命令` 改为：

```markdown
├── commands/                        # /check-mcp、/triage 命令
```

- [ ] **步骤 3：.codex-plugin/plugin.json 两处**

keywords 数组在 `"clarifying"` 之后插入一行：

```json
    "triage",
```

interface.defaultPrompt 数组在 clarifying 条目（`"Use clarifying to grill this idea..."`）之后插入：

```json
      "Triage this request to the right workflow lane (quick-fix / requirement-analysis / exploring / report) / 把这个需求分诊到正确的工作流通道（quick-fix / requirement-analysis / exploring / 报告通道）",
```

- [ ] **步骤 4：校验并提交**

```bash
node -e "JSON.parse(require('fs').readFileSync('.codex-plugin/plugin.json')); console.log('JSON OK')"
node scripts/check-plugin.mjs --codex-validate && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs
git add README.md README.zh-CN.md .codex-plugin/plugin.json
git commit -m "feat(T5): 发布面登记 /triage——README 双语用法与目录树、Codex defaultPrompt 与 keywords"
```

提交后核验非空。

---

## 测试与验收

### 任务 6：验收（acceptance-qa）

> 本任务由 executing-plans 收尾审查阶段触发 acceptance-qa 按下表执行，
> 不参与逐任务连续执行；报告与证据落盘特性目录 `acceptance/` 子目录。

| Scenario / 检查项 | 维度 | 执行方式 | 目标 | 阈值/预期 | 验收证据 |
|-------------------|------|---------|------|----------|---------|
| 升级后不重查不重问 | eval | 验收任务（quick-fix evals 用例） | `skills/quick-fix/evals/evals.json` | qf-escalate-carries-context 存在且断言含"根因、spec 反查结果、已裁决的澄清答案""不重查""不重问" | eval 用例记录 |
| 调研请求不产出 spec / 婉拒落盘零产物 / 回归分诊 | eval | 验收任务（requirement-analysis evals 用例） | `skills/requirement-analysis/evals/evals.json` | ra-non-dev-report-lane 存在且断言含"不建特性目录""婉拒则零落盘""回归正常分诊" | eval 用例记录 |
| 带参数直接分诊 / 无参数先问 / 改选照选 / 零落盘 / 拿不准列两候选 | 文档审查 | 验收任务（triage.md 条款覆盖检查） | `commands/triage.md` | 输入节含空参先问；输出节含四出口可改选与拿不准列两候选；路由节含零落盘 | 检查记录 |
| 判据变更不需改命令（引用不复制） | 文档审查 | 验收任务（grep 检查） | `commands/triage.md` | 正文不含"单点 bug、单常量"等小修判据细节、不含升级门三信号清单原文 | grep 记录 |
| 拿不准档双向表述同向 | 文档审查 | 验收任务（对照检查） | quick-fix 三角节 vs RA 小修检查对偶句 | 两处均为"默认先进 quick-fix + 升级门安全网"语义，无反向表述 | 对照记录 |
| 非开发共识转报告通道 + clarifying spec 注记消除 | 文档审查 | 验收任务 | `skills/clarifying/SKILL.md` 出口 1 + clarifying spec 数据流行 | 出口 1 含报告通道目标；spec 数据流行无"待……追加"字样 | 检查记录 |
| 发布面登记 + CHANGELOG/版本号已随发版自动化递增 | 文档审查 | 验收任务 | README ×2、.codex-plugin/plugin.json、CHANGELOG.md | /triage 出现在四处登记点；合并回 main 后 CHANGELOG 顶部含本特性提交条目、版本号高于 7.17.0 | 检查记录 |

### 任务 7：合并与清理

- [ ] **步骤 1：全量验证**

在 worktree 内运行：

```bash
node scripts/check-plugin.mjs --codex-validate && node scripts/validate-skills.mjs && node scripts/check-openai-sync.mjs
```

预期：三者退出码 0。失败 → 修复后才进入合并。

- [ ] **步骤 2：合并回来源分支**

```bash
cd "$(dirname "$(git rev-parse --git-common-dir)")"   # 回到主工作区
git merge plan/2026-08-08-triage-routing
```

合并冲突、或主工作区有未提交改动 → 停下向计划作者确认，不强行合并。（版本号/CHANGELOG 若冲突：保留 main 侧较高版本号，特性内容侧并入——同子项目①先例。）

- [ ] **步骤 3：清理**

```bash
git worktree remove .worktrees/plan/2026-08-08-triage-routing
git branch -d plan/2026-08-08-triage-routing
```

（原生工具建立的隔离用原生方式退出。）

- [ ] **步骤 4：sync_commit 锚定**

```bash
SYNC=$(git rev-parse HEAD)   # 合并完成后的主工作区 HEAD
# 把 spec frontmatter 的 sync_commit: null 更新为 $SYNC
git add .spec-dev/2026-08-08-triage-routing/spec/triage-routing-design.md
git commit -m "chore(spec): sync_commit 锚定 ${SYNC:0:7}"
```

此后 `git diff <sync_commit>..HEAD -- commands/triage.md` 即"spec 上次确认同步以来的代码变化"。
