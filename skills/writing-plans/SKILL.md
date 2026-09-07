---
name: writing-plans
description: >-
  编写实施计划——当已有 spec 或明确需求、准备开始多步骤开发任务、但尚未动代码时使用。把设计拆解为零上下文工程师也能执行的 bite-sized 任务（精确文件路径、完整代码、TDD 步骤、预期输出），落盘特性目录的 plan/ 子目录并交接 executing-plans 执行。通常由 requirement-analysis 在 spec 获批后调用；也可对既有 spec/需求单独触发。
---

> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

> **插件根**：`${CLAUDE_PLUGIN_ROOT}`——本 skill 正文与其 references 中的插件根命令以此为准；若上式仍为变量字面量（平台未替换），按 requirement-analysis 的 references/exploration-patterns.md「插件根解析」序列推导。

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

任务分解与方案形态遵循 [design-principles.md](references/design-principles.md) 八条设计原则；同时按实际问题使用其「模块判据」。原则违反时重划；启发式须有证据，不为凑 adapter 数量新建抽象，不否决已批准 seam。计划头部保留八原则声明并引用该判据定义点。

## 文件结构先行

宽面机械迁移先尝试普通独立验证任务；不成立时 expand 保留新旧形、按实际影响范围分批 migrate、最后 contract 删除旧形，每批通过相关验证再提交；必要的安全顺序仍写依赖。连批次都不能独立通过时，记录证据并采用下方多票集成组。识别解除实际实施阻碍的前置重构，有需要才安排 T01，T00 固定隔离；无需要不制造空重构票。

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

TDD 循环的完整纪律遵循 test-driven-development skill——普通行为任务显式内嵌上述五步；批准的纯重构、集成组成员和组验证票按下文类型化步骤写全操作、验证、提交及真实结果。

**Scenario 直译为验证**：每个 `#### Scenario:` 都有实际验证步骤；行为变化翻译为有效失败测试，纯重构使用前后保护，组内不能独立通过的相关验证明确归属组验证票，不漏掉 Scenario。映射固定：GIVEN→arrange（构造前置状态）、WHEN→act（触发动作）、THEN→assert（断言可观察结果）；测试名沿用 Scenario 名。规范到测试零翻译损耗——不要自己另编测试场景后把 Scenario 丢在一边。测试步骤的 Lane 归属与 DB/前端/Agent 处方遵循 test-strategy skill（矩阵行标注的 lane 直接继承；DB 类步骤对照其 references/db-testing.md，不得出现每测试一容器）。

## plan 目录结构

每份计划的产物三件套结构：

```
.spec-dev/<特性目录>/plan/
├── index.md        # 头部 + 全局约束 + 相关测试范围 + 设计原则块 + 任务导航表；不复制任务正文
├── tasks/T00.md …  # 每任务一文件，正文结构与下文任务模板逐字一致（文件块/接口块/TDD 五步）
└── progress.yaml   # 唯一运行时状态
```

## 可选集成组声明与 v2 进度

这是集成组字段的唯一定义点；执行时序遵循 [integration-groups.md](../executing-plans/references/integration-groups.md)。仅在普通切片和每批绿的 expand–contract 均不可行且设计已批准时生成；不以文件多、测试慢或想并发为理由启用。

含组时，写任务正文前必须实际读取 integration-groups.md 的执行协议、可执行参考步骤及其引用的 executing-plans-parallel 锁规则；下方字段表不能代替执行协议。把适用的取锁、T00 真实绑定、组激活、实现/证据/状态分开提交、暂停与完成操作写进可执行步骤；脱离 skill 时仍能操作，不能仅写“按协议更新”。每条 record.json 必须按定义生成结构化记录，原始 stdout/stderr 另存，不能把 tee 输出命名为 record.json。


index 中至多一个 `json spec-dev-integration` fenced block，内容为 JSON（使用 JSON 避免引入第二套复杂 YAML 语法；重复键显式拒绝）。声明示例为确定的结构示意，不是本特性的实施计划：

```json spec-dev-integration
{
  "protocol_version": 1,
  "task_roles": {
    "T00": "isolation",
    "T10": "acceptance",
    "T11": "delivery"
  },
  "groups": {
    "G01": {
      "members": ["T03", "T04", "T05"],
      "verify": "T06",
      "reason": "共享类型的三个消费者全部迁移后才能通过相关验证"
    }
  }
}
```

GNN 与 TNN 分别唯一；每组至少两名成员，members 为确定的执行顺序，必须与导航 DAG 的拓扑顺序一致但不凭此数组虚构依赖边。组员保持常规小票粒度；组验证显式依赖全部成员；组外任务只能通过 verify 依赖该组。声明中的 `task_roles` 必填，T00 唯一 isolation、最大号唯一 delivery、项目 acceptance 如有则列出，角色不得重叠；这些票不得进入 members/verify。组验证文件显式标 `任务类型：group-verification`，组员标 `任务类型：integration-member`，不重复写进 task_roles；普通票由余集确定。task_roles/组声明与任务正文在计划 Self-Review/运行读取本票时核对。上例 T10/T11 是示例角色，实际 ID 必须存在于四列导航表。组声明不产生第二份进度。

组间及普通任务构成的收缩 DAG 同样无环；外部前置取组员和 verify 对组外依赖的并集，全部 completed 才进入组。禁止外部依赖成员的隐藏绕行；不同组通过 verify 相连。活动组期间即使存在独立 ready 普通票也先完成活动组，避免未验证 HEAD 被外部使用。

### 运行数据与读取边界

无组新计划继续 v1；含组使用 `progress.yaml` 的 `format_version: 2`。v2 的机器写入格式限定为缩进 JSON（JSON 属于 YAML 子集，文件位置不变），字符串必须双引号、拒绝重复键与未知协议字段；不接收 YAML anchor/tag/注释等额外语法，不引入新 YAML 依赖。新读取器支持 v2，v1/单文件仍走既有分支。格式号只标识数据，不绑定 executor/skill 版本，也不生成编译快照。

生成含组计划时不要套用下方无组 v1 的 YAML 初始化模板；按本节生成完整 JSON，tasks 须包含导航表全部任务，不能省略成示例片段。组首改动若已破坏其他消费者的检查，它也必须属于组，不能包装成已独立通过的普通票。

v2 完整继承 tasks/resources/notes 和原 parallel 可选 execution 扩展字段；无组计划不准出现 awaiting_verification。新增字段如下：

| 位置 | 字段与约束 |
|---|---|
| 根 | `integration: {owner, worktree, branch, base_commit, validated_commit, active_group, groups}`；生成时 owner/路径运行值/SHA 为 null，active_group=null，组 status=pending；resources 可预登记已知资源 |
| integration.groups.GNN | `status: pending\|in_progress\|blocked\|completed`；`base_commit`（本组启动已验证点）、`checkpoint_commit`（最后已保存实现点）、`validated_commit`（本组完成点，完成前 null）、`evidence_paths: []` |
| tasks.TNN | 原 status 加 awaiting_verification；`implementation_commit` 记本票实现点，`commit` 仅完成后填接受点；`tests: pending_group\|pass\|fail` 对组员适用，保留原字段；`evidence_paths: []` 与 `deviations` 支持恢复 |
| notes | 追加授权来源、组激活/恢复/失效/晚到回执事件及证据路径，不覆盖旧记录 |

parallel 模式下 `integration.owner/worktree/branch/base_commit/validated_commit` 分别与 `execution.owner/integration_worktree/integration_branch/base_commit/validated_commit` 一致，后者为旧消费者的投影，不允许独立更新；CLI 检查一致性并要求同次原子更新。integration.base_commit 为特性原始审查点，groups.GNN.base_commit 为组进入点，不混用。串行 v2 也使用既有同一 common-dir 特性锁及其维护门，身份只在持锁后填写，不以存在 JSON owner 自证锁。v2 普通票完成同样更新 integration.validated_commit；在首次状态写入前取得锁，T00 建立/确认隔离后绑定真实工作区，保留该特性同一锁身份。

`current` 只指正在施工或补查的主线程票，不用它表示所有已待验票。运行 SHA 不指向正在包含它们的状态提交：先保存真实实现提交 C，再将 C 写入状态并另行提交；证据归档引起的后续提交不改变代码树时允许继续引用 C，但需可核验只变更本特性的进度/证据路径。


### 类型化任务步骤

普通行为票沿下方五步。前置纯重构票明确写：确认授权/公共行为基线，缺保护先刻画当前行为通过，执行结构调整，复跑保护通过，提交；不制造假红。集成组成员票明确写：声明本票写集合/接口/延期检查原因，执行适用行为红或组首保护，实施和局部检查，两项契约自检/保存实现提交，记录 awaiting_verification 与证据检查点。组验证票明确写：确认全员待验，执行完整组验证/清理旧形检查，失败回归属成员修复，通过后原子完成全组/基线，再提交状态。具体代码、命令、期望与来源仍须全部内嵌，不可用类型名代替内容。

组票里的可执行命令须遵循 [integration-groups.md 的证据记录形状与提交顺序](../executing-plans/references/integration-groups.md)：先保存实现提交 C，再对该业务树实际检查并归档；原行为基线另存为历史记录，不能拿改动前 HEAD 的记录支撑改动后的 C。磁盘证据放在本特性目录下，evidence_paths 则相对该特性（如磁盘 `.spec-dev/demo/execution/groups/G01/T01/a1/record.json` 对应 `execution/groups/G01/T01/a1/record.json`）。组成功后的所有成员和验证票 commit 都填共同 V，保留各自 implementation_commit，状态提交另做。T00 先识别当前真实隔离路径和分支，已隔离时复用实际值，不能把拟建分支名当现存绑定。

生成时先跑 plan-index；含组还必须验证执行环境支持 plan-state/protocol_version=1。未开始的运行值留 null，不伪造 owner/路径/提交/模型或测试通过。执行技能不可用时普通计划仍可按完整步骤读取；组的机器能力不可用则停止，不按 v1 猜执行。

## 可选并发声明


index 头部增加至多一个标记为 `yaml spec-dev-parallel` 的 fenced block；不存在表示无并发声明。其结构为 `parallel: { tasks: { TNN: { writes: [路径], resources: [排他资源键] } } }`。只声明可派给 implementer 且写集合非空的票，已知 TDD 例外或显式空基线范围的票不列入；未声明票由主线程串行执行且执行时排空 implementer。writing-plans 从任务文件块产生声明并在 Self-Review 核对同义一致；入口校验不预读 tasks 正文，implementer 读取自己任务后再核对文件块，任何差异阻塞该票。执行中才发现已授权例外时，子代理先回报 blocked，由主线程按 executing-plans-parallel 的例外票串行规则接管，不能伪造 ready 的测试证据。

写路径为精确文件名，不支持 glob/目录授权；使用 `/`、仓库根相对，拒绝空值、绝对路径、`..`、重复规范路径、大小写/Unicode 规范化碰撞；不存在的新文件按最近存在祖先解析符号链接。`.git`、`.spec-dev`（含所有计划/状态/证据）及其符号链接别名禁止进入 implementer 写集合。不同票的同一路径或祖先文件路径冲突不能同批；“不同文件读写形成语义依赖”必须在导航表声明依赖，路径不相交不证明接口独立。

resources 是该票使用的排他外部资源键（如数据库、端口、输出目录）；同键不能同批。主线程用 claim 命名空间分配可隔离资源，不能把同一实体换名伪装隔离；无法确认隔离范围的票不加入并发声明。资源实际标识/清理命令只记 progress.resources。

`plan-index` 继续输出现有 `{ok,schema,file,errors}` 契约；新声明存在时校验其结构和合法路径，写集合重叠表示调度冲突而非整份计划非法。不新增额外计划文件或解析全部 YAML 特性：读取仓库当前支持的受限映射/数组形制，拒绝重复键和不支持的语法，不默默截断。


```yaml spec-dev-parallel
parallel:
  tasks:
    T01:
      writes:
        - "src/a.mjs"
        - "tests/a.test.mjs"
      resources: []
    T02:
      writes:
        - "src/b.mjs"
        - "tests/b.test.mjs"
      resources:
        - "port:claim-scoped-b"
```

受支持语法：根 `parallel:`、两空格 `tasks:`、四空格任务键、六空格 `writes:`/`resources:`、八空格 `- "JSON 字符串"`；空数组写作 `resources: []`。不支持 YAML anchor、tag、折叠字符串、注释或 flow mapping；不在此块内使用其他缩进。writes 非空，resources 可空；不允许重复任务、字段、规范路径或资源键。

Self-Review 的 spec 覆盖与类型一致性两查同时核对声明与任务文件块一致、依赖覆盖语义耦合、已授权例外与空基线票已排除；该检查由计划作者本地执行，不派子代理自审计划。

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

**关联 skill**：逐项列名称、适用任务/时机、单点定义路径；包含执行方式、适用 TDD/纯重构/集成组、测试策略、隔离及验收。任务只写本票新增关联，不复制整套规则；获批 seam 仍沿导航/接口块继承。

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

index.md 头部之后是**任务导航表**——四列：`任务 | 依赖 | 消费接口 | 产出接口`。规则：任务 ID 形如 `T\d\d` 全局唯一且与 tasks/ 文件名一一对应；依赖只引用表内 ID，可用闭区间写法（`T01-T06` 表示 T01 至 T06 闭区间——区间内每个编号都必须是表内任务，起点不得大于终点）；禁止环；接口列写精确签名（执行者只读自己的任务文件 + 依赖行的产出接口，不读其它任务正文）。生成后运行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index <plan目录>`（结构校验：文件↔导航表一致、依赖存在且区间可展开、无环），失败不得交付执行。

### 测试落点的接口传递

spec 测试策略中的获批 seam 沿四列导航的消费/产出接口及本票接口块传递：保留精确签名/协议，列出覆盖 Scenario、依赖替换边界和 spec 来源指针；执行者只读本票、spec 与依赖接口行就能获得同一边界，不把声明藏在前置任务正文。产出接口不是逐函数直测清单；不新增导航列、清单文件或 progress 字段。

### 静态快检命令

计划头部与本票测试命令中提供项目已有、适用的 typecheck/静态命令及配置来源，无则写不适用。编辑批次间快检的节奏与边界遵循 test-strategy；保留任务五步的有效红绿、相关测试、最终全量和失败归属裁决，不把编译报错写为预期红。

## 任务 0：建立隔离工作区（每份计划固定生成）

导航表首行为任务 0，固定生成 `tasks/T00.md`——与结尾的最终任务（合并与清理）首尾对称，隔离工作区的生命周期在计划目录内闭合、脱离本插件也能按序执行；有 using-git-worktrees skill 或原生工具的环境按其完整纪律执行（已隔离检测、目录选择、沙箱降级都定义在该 skill）：

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

### 并发运行扩展（字段唯一定义点）


保留 `format_version: 1`、四种任务 status、resources、notes；增加可选 `execution`，其 `mode: parallel` 为并发语义的明确判别项。未出现该项的存量 progress 原样串行读取。`current` 只指主线程正在执行的串行票；并发派发期间为 null，不用它推断所有任务空闲，活动票以 tasks 中 in_progress 的认领为准。

`execution` 字段：`mode`、`owner`（会话唯一标识）、`integration_worktree`（绝对路径）、`integration_branch`、`base_commit`（特性审查基线）、`validated_commit`（最后通过集成验证的 tip）。可选 `delivery`：`channel: local|pr`、`state: implementing|awaiting_merge|merged|completed`、`source_branch`、`pr_url`、`merge_commit`；记录事实变化，不以 state 自证合并。

中途升级时增加可选 `execution.activation: { from: serial, request_id: <切换请求唯一标识>, checkpoint_commit: <H>, authorization_ref: <已保存请求 notes 的定位> }`；H 是切换前已保存串行完成状态的提交，不是包含 activation 的提交。notes 以现有 append-only 字符串项保存 `parallel-switch/<request_id>: requested; authorization=<原话或可恢复引用>`，成功切换时追加同 ID 的 activated 事件；不另建待办状态文件，实际模式仍以已提交 execution 为准。初始就选择并发不要求该 activation 字段。用户的切换授权和任务声明是两个独立条件，声明存在不能代替授权。

`tasks.TNN` 继承 status/commit/tests/deviations，增加 `claim: { key, owner, agent_id, worktree, branch, base_commit }`、`implementation_commit`、`result_path`。claim.owner 表示最初认领的编排会话，execution.owner 表示当前持锁编排者；恢复接管可以更新后者，身份与通信已核验的存活 implementer 保留原 claim，不因主线程换会话而换 key。agent_id 在工具返回后补写；派发前 claim 已持久化，若在派发与补写之间崩溃则核对运行中 agent 与 worktree，不盲重派。completed 的 `commit` 是通过集成验证的提交，不能填包含该 SHA 字段的状态提交；实现提交和进度 checkpoint 分开，后者随特性分支保存。每次新尝试以新 key 替换 claim，旧 key 与处置原因追加 notes，历史结果文件保留。progress 使用临时文件+rename 原子更新，不允许子代理副本合并回来。

模型声明沿现有 notes 保存 `model-declaration/<declaration_id>: <角色/任务组、模型、思考强度、来源、继承或计划派发标识>`，不另造执行配置文件；新认领增加 `claim.model_declaration_id` 指向适用于该票的声明。先向用户展示；主线程取得对应进度写权限后，在首次相关派发前将声明及引用持久化。该记录用于追溯而非驱动模型选择，不能覆盖真实工具参数。旧认领没有该字段时，恢复从可用的原派发参数/会话记录核对，无法核实的部分标未知，不能把新主线程配置回填成原执行者事实。


未开始的计划不伪造 owner、模型声明、claim 或运行 SHA；生成时只预登记已知资源。并发 skill 在取得独占写权后填入真实值。资源只有主线程可以写入 progress，子代理新建持久资源必须先请求、主线程原子预登记并确认、最后创建；没有确认则资源操作阻塞。

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

所有实施任务与验收任务（如有）之后，固定以下述任务收尾（编号顺延全局任务号：有验收任务时为 N+2、无则为 N+1，下方模板以 N+2 示意）——与任务 0 首尾对称，worktree 从建立到合并的生命周期在计划目录内闭合。使用 executing-plans 编排执行时，本任务不参与阶段 3 连续执行，推迟到收尾审查处置完成后运行：

````markdown
### 任务 N+2：合并与清理

**资源台账**（承载于 `plan/progress.yaml` 的 `resources` 键——规范定义点见「progress.yaml 键结构」节；行格式 `<类型>: <标识> —— <清理命令>`）；下方清理步骤遍历该清单。

progress.yaml 已预登记首行（示意）：`worktree: .worktrees/<分支名> —— git worktree remove .worktrees/<分支名> && git branch -d <分支名>`

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

按 spec「取代与共存」节逐项执行（形制见 spec-template「取代标注形制」节；实施任务中已完成的回写在此逐项核对）：
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

逐条执行 progress.yaml resources 清单各行的清理命令（worktree 行即清单首行）。命令执行失败 → 该行保留在清单中并报告用户，不静默跳过；资源已不存在 → 从清单移除并在 notes 记一行"已不存在"。台账外的文件、容器、数据一律不动。

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

1. **Spec 覆盖**：逐条 Requirement 过——能指到实现它的任务吗？每个 Scenario 都有适用的行为红绿、纯重构保护或组验证步骤吗（GIVEN/WHEN/THEN → arrange/act/assert）？验收矩阵的「验收任务」行都进入验收任务表了吗？差量三节的 MODIFIED/REMOVED 有对应的改造/清理任务吗？列出缺口
2. **占位符扫描**：按"禁止占位符"清单搜索计划全文，发现即修
3. **类型一致性**：后续任务用到的类型、方法签名、属性名与前序任务定义一致吗？任务 3 叫 `clearLayers()`、任务 7 叫 `clearFullLayers()` 就是 bug
4. **导航表与任务文件一致**：导航表接口列与各任务文件的接口块逐条一致吗？tasks/ 文件名与表内任务 ID 一一对应吗（plan-index 校验过再交付）？

5. **依赖最小性**：每条边能否指出实际消费接口、验证或安全顺序理由？补漏边、删无理由的边；保留 T00/迁移/验收/最终任务及组出口的必要约束。不能靠删安全边制造并发或消除环；若必要依赖构成环，报告结构不成立并重划任务边界。成员实际消费前序成员接口时也要显式写依赖，members 顺序不代替接口边。

逐票从声明的仓库根 cwd 手工追踪路径和状态提交：文件在 `<特性目录>/plan/progress.yaml` 时，Git 命令必须包含完整仓库根相对路径；进入子目录后显式返回，不能假定工具会重置 cwd。每次状态写入之后给出单独的 Git 提交步骤，完成 SHA 指向已存在的实现/验证提交，不能指向尚未产生且会包含该字段的提交。T00 复用隔离仍执行绑定、基线与完成状态保存，最后的合并/清理仅消费实际登记的所有权。

内部改名或 expand–contract 保持公开行为时，使用改动前后均通过的公开行为保护；新导出缺失引发的 ESM 链接错误不是有效行为红。若确有新行为，先让测试可执行并观察对应业务断言失败。

对计划中的检查命令同时核对“该步执行前/后的真实文件内容”：未迁移的本票消费者仍可能触发声明的暂时导入失败，不能提前要求它已改好。旧形清零检查应识别被迁移的导入/导出符号，不能用整行同时含 export 和旧名字的宽泛匹配，把保留的方法调用也判作旧导出。逐段检查 shell 引号、括号与目录切换，合并/清理必须消费 T00 记录的实际路径和资源所有权。

发现问题就地修复，无需复审；发现 spec 需求没有对应任务就补任务。

## 执行交接

保存计划后先展示最新 index 链接与简短变更摘要，列 2–3 个针对粒度、依赖或边界的陈述式检查点，再作一次整体确认。检查点不附“请确认”“是否接受”等问题；确有未决点则先按一次一题澄清。保存、校验和提交状态以实际工具回执为准，稿件审阅认可不等于开始实施授权。向用户交接：

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
- 想跳过 Self-Review 直接交接 → 五查跑完再交
