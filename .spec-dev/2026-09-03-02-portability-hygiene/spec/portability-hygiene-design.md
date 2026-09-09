---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——
spec_dev:
  version: 1
  feature: portability-hygiene
  status: active
  covers:
    - "skills/requirement-analysis/SKILL.md"
    - "skills/requirement-analysis/references/exploration-patterns.md"
    - "skills/requirement-analysis/references/codex-compat.md"
    - "skills/writing-plans/SKILL.md"
    - "skills/executing-plans/SKILL.md"
    - "skills/executing-plans/references/review-orchestration.md"
    - "skills/acceptance-qa/SKILL.md"
    - "skills/acceptance-qa/references/ai-acceptance.md"
    - "skills/quick-fix/SKILL.md"
    - "skills/visual-preview/SKILL.md"
    - "skills/visual-preview/scripts/start-server.sh"
    - "agents/code-explorer.md"
    - "agents/code-reviewer.md"
    - "agents/external-resource-explorer.md"
    - "commands/doctor.md"
    - "scripts/validate-output.mjs"
    - "scripts/schemas/README.md"
    - "scripts/tests/plan-index.test.mjs"
    - "scripts/tests/plugin-root.test.mjs"
    - "scripts/tests/visual-path.test.sh"
    - "README.md"
    - "README.zh-CN.md"
  sync_commit: 3d05186dfa3e3e0013ad0f5267c35653c1404f7e
  supersedes:
    - ".spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md"
  superseded_by: null
---

# 便携性修复与工程卫生（portability-hygiene）设计



> roadmap `../../roadmaps/2026-09-03-01-skill-ecosystem-absorption.md` 子项目 #1；吸收生态对比报告 AB-38 / 36 / 37 / 39 / 40 / 42 及第四轮核验（报告 §8.5）发现的文档漂移。

## 背景与目标

writing-plans 指令中的 `node scripts/validate-output.mjs plan-index …` 是裸相对路径，在任何用户项目 cwd 下必然 `MODULE_NOT_FOUND`（实测 exit 1）；而其余 11 处 `${CLAUDE_PLUGIN_ROOT}` 写法也只在 Claude Code 加载 skill/agent 正文时被替换——references 与 Codex 端都不替换、该变量也不导出到模型的 Bash——所以它们今天与裸路径同病，只是被"变量看起来正确"掩盖。本特性把插件根解析定义一次、让每个 skill 载入即持有绝对路径，并顺手把散落的共享纪律复述（失败隔离、契约校验降级、Codex 映射表、TDD 例外清单）收敛为单点引用，修正核验发现的 README 漂移，结构化隔离 visual 会话产物，让导航表依赖范围写法被校验器理解。

**成功标准**：任何用户项目 cwd 下按 skill 指令解析出的校验命令可执行（exit 0）；skills/agents/commands 中零裸相对路径且插件根写法唯一；四条共享纪律各只有一个定义点、其余为 gist + 指针；README 双语含运行时依赖表与成熟度分区节且核验列出的漂移归零；visual 项目内会话文件被自建 `.gitignore` 覆盖；`T01-T06` 写法被 plan-index 校验器展开；全套校验与测试绿。

## 非目标

- 不随 guardrail 安装器向目标仓库分发 `validate-output.mjs` 副本（已裁决：单点定义 + 统一写法）
- 不改 `codex-compat.md` 文件名与位置（4 处引用 + major-upgrade covers 路径）
- 不改写 vendored anysearch 的 `<skill_dir>` 占位符（上游所有权）
- 不新建 `skills-in-progress/` 目录（README 约定即可；并发模式已裁决为正式 skill）
- 不改任何 skill 的 `description` 与 `agents/openai.yaml`（触发面不变）
- 不把 visual 项目内会话搬到临时目录（SKILL.md:74 与 stop-server.sh 的"回看"设计保留）
- 不给主线程止损设阈值数字；不给依赖表配探测脚本（doctor 已承担运行时检测）
- 不裁决"纯文案"是否并入 TDD 例外清单（留给子项目 #3 tdd-seam）

## 术语表

- **插件根（plugin root）**：插件安装目录的绝对路径，即 `skills/`、`agents/`、`scripts/` 的父目录。_Avoid_：插件目录、skill 根、`<插件根>`（自造占位符）
- **插件根解析序列**：执行者取得插件根绝对路径的三级顺序（正文已替换值 → skill base directory 上两级 → 已安装插件目录），单点定义于 exploration-patterns。_Avoid_：路径降级、找插件目录
- **载入即声明**：skill 正文顶部固定一行 `${CLAUDE_PLUGIN_ROOT}` 引用，平台替换后即成为该会话的插件根事实来源。_Avoid_：插件根声明行、根变量行
- **gist + 指针**：复述处保留一句与定义点同措辞的摘要并指向定义点的引用形态（沿 requirement-analysis 阶段 3 对 clarifying 的既有模式）。_Avoid_：裸指针、全文复述
- **canonical（定义点）**：某条纪律唯一允许出现完整陈述的位置。_Avoid_：权威版本、主副本
- **visual 根**：visual 会话目录的父目录——`<feature-dir>/visual/` 或 `<project>/.spec-dev/visual/`。_Avoid_：会话根、visual 目录

## 影响面

- **skills**：requirement-analysis（SKILL.md 载入即声明 + 映射表改指针 + 失败隔离 gist；references/exploration-patterns.md 新增「插件根解析」节、「输出契约与校验」节补校验器不可用降级句并成为契约校验 canonical、止损句；references/codex-compat.md 前言、:54 gist、:61 占位符与命令写法）、writing-plans（SKILL.md 载入即声明 + :118 写法与范围定义）、executing-plans（SKILL.md 载入即声明 + :93；references/review-orchestration.md :20-21/:58）、acceptance-qa（SKILL.md 载入即声明 + :78-81 + :117 gist 指针；references/ai-acceptance.md :37-38）、quick-fix（:38 gist、:66 例外清单引用、:99-103 映射表收敛）、visual-preview（SKILL.md :38/:43/:71；scripts/start-server.sh 自建 .gitignore）
- **agents**：code-explorer.md :148、external-resource-explorer.md :31 的回退句统一；code-explorer.md :116 与 code-reviewer.md :147 契约输出段的"补全一次"句补指向定义点的指针
- **commands**：doctor.md :5 写法统一
- **scripts**：validate-output.mjs 依赖列范围展开；schemas/README.md :8/:14/:16 指针化；tests/plan-index.test.mjs 新用例；tests/visual-path.test.sh 新断言；tests/plugin-root.test.mjs 新建
- **README 双语**：新增「运行时依赖」「成熟度分区与发布纪律」两节；修正 trigger-evals 计数、目录结构、"四查"、schema 计数
- **不触碰**：guardrail/**、hooks/hooks.json、任何 openai.yaml、任何 description、TDD skill、vendored skill

## 已确认的关键决策

- 插件根修法取"单点定义解析序列 + 统一写法"，不随守卫分发校验器副本——用户裁决；分发副本要随插件升级同步、牵动 install.mjs/两份 guardrail README/doctor 健康项（详见 [ADR-0006](../../adr/0006-plugin-root-resolution.md)）
- 统一写法之上必须加"载入即声明"机制——对抗验证发现官方替换只覆盖 skill/agent 正文、不导出到模型 Bash、references 不替换；没有这一机制，统一写法只是把裸路径 bug 换成变量字面量 bug（ADR-0006）
- 复述收敛用 gist + 指针而非裸指针——agent 一次只加载一个 SKILL.md，裸指针逼迫额外读取；仓库既有模式（requirement-analysis 阶段 3 引用 clarifying）即 gist + 指针
- 失败隔离 canonical 留在 exploration-patterns.md:89（已是最完整陈述，被 10 个搜索块与 RA 指向）；契约校验的"失败 → 补全一次 → 主线程接管"canonical 留在其「输出契约与校验」节 :72（天然归属），新增的"校验器不可用 → 人工核对"句也放该节，新「插件根解析」节只管路径——同一文件不出现两份完整陈述；不新建"运行时约定"reference（exploration-patterns 已承担该角色，第二个文件是投机抽象，且要改 10 个搜索块与 search-clause 测试特征串）
- Codex 映射表 canonical 留 codex-compat.md，前言从"requirement-analysis 专属"改为"全 skill 共用"；acceptance-qa 与 review-orchestration 的 skill 专属降级节保留（非重复）
- visual 会话隔离改为结构化——脚本在 visual 根自建 `.gitignore`（内容 `*`），不搬临时目录：核验证实脚本裸默认已是 `/tmp`，落项目内是 SKILL 标准调用所致且"回看"是有意设计
- 导航表依赖范围写法 `T01-T06` 由校验器展开为闭区间而非禁止——保存量 index.md 有效（plan-single-format 计划已用该写法）
- 本特性不改 description，触碰 SKILL.md 的提交以 `SKIP_OPENAI_SYNC_CHECK=1` 通过 check-openai-sync（其豁免条件"确认不影响触发描述"成立）
- 文档类提交（本 spec/ADR/roadmap）带 `SKIP_RELEASE_HOOK=1`；实施阶段代码提交按仓库默认自动发版——用户裁决

## 取代与共存

- [部分取代] `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md`：Requirement「visual-preview 产物归位特性目录」——其"gitignore 建议 SHALL 同步覆盖两种 visual 路径"条款被本 spec MODIFIED「visual-preview 产物归位特性目录」替换为脚本自建 `.gitignore`（冲突型替换，新版完整重述，产物落位/定稿归档/port-token 条款原样继承）。理由：手动 gitignore 提醒是靠用户动作的隔离，改为结构化隔离后该建议不应再存在。其余 Requirement（编号规则、设计原则块、澄清纪律、manifest、test-strategy 等）无行为交集，零动作；本 spec 编辑其 covers 中的 RA/writing-plans/executing-plans/quick-fix SKILL.md、两份 references、两个 agent、doctor.md、scripts/**、visual-preview、README 双语属分面共存，提交命中其 covers 时按双声明规则同步或 `Spec-Guard: off` trailer 放行
- [分面共存] `.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md`：本 spec 编辑其 covers 中的 writing-plans/executing-plans/RA/quick-fix/acceptance-qa SKILL.md、review-orchestration.md 与 README 双语，只扩展 plan-index 校验器接受的依赖写法（闭区间展开）并统一命令写法，不改三件套结构、导航表四列契约、progress.yaml 键结构与读宽容语义；其「plan 单一形态」Requirement 的"生成后 SHALL 运行 plan-index 校验"陈述不变
- [分面共存] `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md`：本 spec 编辑其 covers 中的 RA/writing-plans/executing-plans/quick-fix/acceptance-qa SKILL.md、exploration-patterns.md、review-orchestration.md，不触碰取代生命周期行为（文档时效规则、pending 标注、covers 接管核对均原样保留）
- [分面共存] `.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md`：本 spec 编辑其 covers 四个 SKILL.md，不触碰资源台账语义（progress.yaml resources 定义句与 quick-fix 收尾清理原样保留）
- [分面共存] `.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`：本 spec 编辑 writing-plans/executing-plans SKILL.md，不触碰「相关测试范围」声明与归属裁决语义
- [零动作] clarifying-skill、triage-routing：covers 无交集
- 本 spec 接管保护的未覆盖路径：`skills/acceptance-qa/references/ai-acceptance.md`（原不在任何 active spec covers 内；`scripts/schemas/README.md` 已由 major-upgrade `scripts/**` 覆盖）

## ADDED Requirements

### Requirement: 插件根解析序列单点定义

exploration-patterns.md SHALL 含唯一的「插件根解析」节，定义三级解析序列——① skill 正文中被平台替换后的绝对路径；② skill base directory 上两级（skill 固定位于 `<插件根>/skills/<name>/`）；③ 已安装插件目录（Claude Code 的 plugins cache、Codex 的插件安装目录）——并声明：references 与派发词中出现的 `${CLAUDE_PLUGIN_ROOT}` 是占位符（平台不替换），执行者按序列解析后代入；三级均失败 SHALL 向用户报告"无法定位插件根"，不得静默跳过或改用相对路径。契约校验的完整陈述 SHALL 只存在于同文件「输出契约与校验」节：既有"校验失败 → 把 errors 清单发回补全一次 → 再失败由主线程接管"保持原位，并新增"校验器不可用（node 缺失或插件根无法定位）时主线程按 schema 人工核对必填键与 `coverage_note` 并在报告注明'契约校验降级'"一句；「插件根解析」节只管路径，SHALL NOT 复述契约校验规则。

#### Scenario: 解析序列只有一个定义点

- **GIVEN** 仓库当前文本
- **WHEN** 在 skills/ agents/ commands/ scripts/ 中检索"上两级"与"已安装插件目录"的完整序列陈述
- **THEN** 只命中 exploration-patterns.md 的「插件根解析」节，其余位置均为 gist + 指针

#### Scenario: 契约校验完整陈述唯一

- **GIVEN** 仓库当前文本
- **WHEN** 检索"补全一次"
- **THEN** exploration-patterns.md 只在「输出契约与校验」节命中一次；其余每处命中（review-orchestration、executing-plans、acceptance-qa、schemas/README）同行都带指向 exploration-patterns 的指针

#### Scenario: 三级全失败不静默

- **GIVEN** 正文变量未被替换、skill base directory 不可知、已安装插件目录也找不到
- **WHEN** 执行者需要运行契约校验命令
- **THEN** 向用户报告"无法定位插件根"并停下，不以相对路径尝试、不跳过校验

### Requirement: 载入即声明

requirement-analysis、writing-plans、executing-plans、acceptance-qa 四个 SKILL.md SHALL 在语言协议块之后固定含一行插件根声明引用块——「**插件根**：`${CLAUDE_PLUGIN_ROOT}`——本 skill 正文与其 references 中的插件根命令以此为准；若上式仍为变量字面量（平台未替换），按 exploration-patterns「插件根解析」序列推导」——使 Claude Code 加载该 skill 时该行成为会话内的插件根绝对路径事实来源，后续读取 references 或构造派发词时的 `${CLAUDE_PLUGIN_ROOT}` SHALL 以该值代入。

#### Scenario: Claude Code 加载后声明行为绝对路径

- **GIVEN** 插件已安装于 Claude Code
- **WHEN** 加载 writing-plans skill
- **THEN** 加载文本中的插件根声明行显示为以 `/` 起始的绝对路径而非 `${CLAUDE_PLUGIN_ROOT}` 字面量，且该路径下存在 `scripts/validate-output.mjs`

#### Scenario: 变量未替换时按序列推导

- **GIVEN** Codex 环境加载 acceptance-qa，声明行仍为变量字面量，skill base directory 已知
- **WHEN** 执行者构造 `detect-env.mjs` 命令
- **THEN** 命令中的插件根为 base directory 上两级的绝对路径，命令可执行

#### Scenario: 四个 skill 都有声明行

- **GIVEN** 仓库当前文本
- **WHEN** 检查 RA/writing-plans/executing-plans/acceptance-qa 的 SKILL.md
- **THEN** 每份都含"**插件根**：`${CLAUDE_PLUGIN_ROOT}`"引用块；其余 skill 不含（它们的正文无插件根命令）

### Requirement: 插件根引用统一写法

skills/、agents/、commands/ 中所有指向**插件内文件**的命令 SHALL 使用 `"${CLAUDE_PLUGIN_ROOT}/<相对插件根路径>"` 形态（变量双引号包裹），SHALL NOT 出现相对于 cwd 的裸路径，也 SHALL NOT 出现自造占位符（`<插件根>`、`<plugin-root>`、`<skill-base-directory>`）；各处 SHALL NOT 再各自复述降级说明——SKILL.md 与其 references 依赖载入即声明，两个 agent 与 commands/doctor.md（agent 与命令正文均由平台直接替换，无需声明行）各保留一句固定回退句「未替换时按插件根解析序列推导（定义见 exploration-patterns）」。codex-compat.md:61 的 anysearch CLI 命令 SHALL 同样改为变量写法（Codex 下该变量为占位符，按序列代入）。visual-preview 自造的 `<skill-base-directory>` SHALL 改为官方 `${CLAUDE_SKILL_DIR}` 并附"未替换时取 skill base directory"半句。本条不涉及：指向**目标仓库**的路径（守卫安装位置 `scripts/spec-dev/**`、迁移脚本，如 quick-fix:40、executing-plans:35，必须保持相对）；vendored skill（anysearch 的 `<skill_dir>`、sequential-thinking 的 `bun scripts/think.ts`）；commands/doctor.md:11 转述 doctor.mjs 输出的仓库开发期维护提示（`node scripts/update-vendored-skill.mjs`，仅对插件仓库开发者有意义，保持原样）。

#### Scenario: 用户项目 cwd 下校验命令可执行（bug 修复实证）

- **GIVEN** cwd 为一个不含 `scripts/validate-output.mjs` 的用户项目，且其中有一份 plan-index 校验通过的计划目录
- **WHEN** 按 writing-plans 指令解析插件根后执行校验命令
- **THEN** 命令 exit 0 并输出 `{ok:true, schema:"plan-index"}`；HEAD 095eb40 的裸路径写法在同一 cwd 下 exit 1 且报 `Cannot find module`

#### Scenario: 零裸路径与零自造占位符

- **GIVEN** 仓库当前文本
- **WHEN** 在 skills/ agents/ commands/ 中检索指向插件内文件的裸路径命令（`node|bash|python3 scripts/…`、`skills/…/scripts/…` 无变量前缀）与自造占位符（`<插件根>`、`<plugin-root>`、`<skill-base-directory>`），排除 `scripts/spec-dev/` 目标仓库路径、vendored 的 anysearch 与 sequential-thinking 目录、以及 commands/doctor.md:11 的维护提示
- **THEN** 零命中；`${CLAUDE_PLUGIN_ROOT}` 与 `${CLAUDE_SKILL_DIR}` 的每次命令出现都带双引号包裹

#### Scenario: 降级说明不再各处复述

- **GIVEN** 仓库当前文本
- **WHEN** 检索"先定位插件安装目录再以其为根解析路径"与"先找插件安装目录"
- **THEN** 零命中；agent、doctor.md 与 schemas/README 只以固定回退句或指针指向 exploration-patterns

### Requirement: 导航表依赖闭区间

plan-index 校验器（validate-output.mjs）SHALL 把依赖列中的 `TNN-TMM` 写法展开为闭区间内的全部任务 ID 参与悬空与环检测；倒序区间（起点大于终点）SHALL 报错（errors path 为 `<任务>.deps`，expected `ascending range`）；区间内存在表内不存在的编号 SHALL 由悬空检测报错（`dangling TNN`）；en/em dash 或链式区间等变体写法 SHALL 报错而非静默降级为端点。writing-plans SHALL 在导航表规则处定义该写法（"`T01-T06` 表示 T01 至 T06 闭区间，区间内每个编号都必须是表内任务"）。

#### Scenario: 区间展开参与闭包

- **GIVEN** 导航表 T07 依赖列写 `T01-T06`，T01-T06 均存在
- **WHEN** 运行 plan-index 校验
- **THEN** 校验通过，且 T07 的依赖集合为 {T01,T02,T03,T04,T05,T06}（移除 T03 行与 tasks/T03.md 后再校验即报 T07 悬空 `dangling T03`）

#### Scenario: 倒序区间被拦截

- **GIVEN** 依赖列写 `T06-T01`
- **WHEN** 运行 plan-index 校验
- **THEN** 校验失败，errors 含 path `<任务>.deps`

#### Scenario: 区间内缺号被拦截

- **GIVEN** 依赖列写 `T01-T04` 而表内无 T03
- **WHEN** 运行 plan-index 校验
- **THEN** 校验失败并指出 T03 悬空

#### Scenario: 存量计划仍通过

- **GIVEN** `.spec-dev/2026-08-27-01-plan-single-format/plan/`
- **WHEN** 运行 plan-index 校验
- **THEN** 校验通过（其 T07/T08 的范围写法被正确展开）

### Requirement: 运行时依赖分级表

README.md 与 README.zh-CN.md SHALL 各含「运行时依赖」节（平台矩阵之后），以表格声明：hard 依赖（缺失即主流程不可用）= git、Node.js ≥ 18；soft 依赖各自的用途与降级链——bun/tsx → `think.mjs` → 回复内分点推演，python3 → anysearch Node 版 → WebSearch/WebFetch，Playwright/k6/Lighthouse/浏览器 MCP → Tier D 工具链或标记 unverified，codex CLI 与 skill-creator 仅仓库开发期（缺失软跳过）；校验器不可用的降级一句指向 exploration-patterns。

#### Scenario: 双语表存在且分级一致

- **GIVEN** 两份 README
- **WHEN** 读取「运行时依赖」/"Runtime dependencies"节
- **THEN** 两表行数相同，hard 行均为 git 与 Node.js ≥ 18，每条 soft 行都写有降级链

### Requirement: 成熟度分区与发布纪律

README 双语 SHALL 各含「成熟度分区与发布纪律」节（插件包维护之下）：陈述四条 skill 发现路径全部指向 `skills/`（Claude 侧 marketplace `skills[]` 显式登记并由 check-plugin 双向校验；Codex 目录自动发现；pi `pi.skills`；Agent Plugins 根 `plugin.json`）；实验 skill 放仓库顶层 `skills-in-progress/<name>/` 即不进任何插件清单、不承诺稳定、用户按路径手装；毕业清单（移入 `skills/` → marketplace 登记 → `agents/openai.yaml` → evals → README 三处 → CHANGELOG）；纯壳委托编写约定——编排类 skill 只写流程，纪律以「遵循 X skill、定义以 X 为准」引用不复述，并列出共享定义点清单（clarifying 核心纪律、design-principles、exploration-patterns、codex-compat、writing-plans 资源台账、acceptance-matrix、test-strategy Lane）。

#### Scenario: 分区约定可读且不误导

- **GIVEN** 两份 README
- **WHEN** 读取该节
- **THEN** 明确写出 Claude 侧靠显式清单（而非目录约定）且新增 skill 未登记 marketplace 会被 check-plugin 拦截

### Requirement: 主线程止损

exploration-patterns.md「派发要求与失败隔离」节 SHALL 含一句主线程止损：主线程明显降质（重复遗忘既定结论、同一错误反复）时，在最近的阶段边界把产物落盘并提交后再继续或重开会话，不硬撑；不设阈值数字。

#### Scenario: 止损句单点存在

- **GIVEN** 仓库当前文本
- **WHEN** 检索"不硬撑"
- **THEN** 只命中 exploration-patterns.md 该节一处

### Requirement: visual 根自建 .gitignore

start-server.sh 在非 `/tmp` 会话创建目录后 SHALL 在两个 visual 根（`<feature-dir>/visual/` 与 `<project>/.spec-dev/visual/`，按本次会话实际涉及者）各确保存在内容为 `*` 的 `.gitignore`（已存在则不覆盖）；写入失败 SHALL 只输出警告、不阻断启动；`--dry-run` SHALL 打印 `GITIGNORE=<路径>` 行且不落盘。

#### Scenario: 会话文件被忽略

- **GIVEN** 临时 git 仓库，以 `--project-dir` 与 `--feature-dir` 启动会话
- **WHEN** 运行 `git check-ignore <会话目录>/state/server.pid`
- **THEN** 命中；`git status --short` 不出现 visual 会话文件；仓库自身 `.gitignore` 未被修改

#### Scenario: 已有 .gitignore 不被覆盖

- **GIVEN** `.spec-dev/visual/.gitignore` 已存在且内容为自定义规则
- **WHEN** 再次启动会话
- **THEN** 该文件内容不变

#### Scenario: dry-run 不落盘

- **GIVEN** `--dry-run`
- **WHEN** 启动
- **THEN** 输出含 `GITIGNORE=` 行，文件系统无新建 `.gitignore`

#### Scenario: 写入失败只警告

- **GIVEN** 项目内 `.spec-dev/` 为只读目录（无法新建 `.spec-dev/visual/`），但特性目录已存在且可写
- **WHEN** 以 `--project-dir` + `--feature-dir` 启动会话
- **THEN** stderr 出现 `warn: cannot create <project>/.spec-dev/visual; skip .gitignore`，服务器仍正常启动（返回 `server-started`），特性目录 visual 根的 `.gitignore` 照常生成

#### Scenario: /tmp 会话无 visual 根

- **GIVEN** 不传 `--project-dir` 与 `--feature-dir`（回退 `/tmp` 会话）
- **WHEN** `--dry-run`
- **THEN** 输出不含任何 `GITIGNORE=` 行

## MODIFIED Requirements

### Requirement: 失败隔离单点化（改了什么：canonical 不变，四处全文复述与四处姊妹句改为 gist + 指针）

失败隔离纪律的完整陈述 SHALL 只存在于 exploration-patterns.md「派发要求与失败隔离」节（"某子代理失败 → 缩小该主题范围重试 1 次 → 仍失败由主线程接管该主题，其余子代理不受影响"）；requirement-analysis 阶段 2、quick-fix 步骤 2、codex-compat 并行子任务节、review-orchestration 失败隔离节 SHALL 各保留一句同措辞 gist（"失败先缩小范围重试 1 次，再失败主线程接管"）并指向定义点，SHALL NOT 出现措辞分化（如"主进程"）；契约校验的"失败 → 补全一次 → 主线程接管"姊妹句在 review-orchestration:21、executing-plans:93、schemas/README:14 处 SHALL 同样为 gist + 指针（canonical 为 exploration-patterns「输出契约与校验」节）；acceptance-qa:117 SHALL 用变体 gist（"校验失败发回补全一次，再失败标记 unverified（acceptance-qa 变体；通用规则见 exploration-patterns「输出契约与校验」）"），与 ai-acceptance 的结局一致；agents/code-explorer.md 与 agents/code-reviewer.md 契约输出段提及"补全一次"的句子 SHALL 带指向该定义点的指针；ai-acceptance 的"再失败标记 unverified"结局 SHALL 保留并标注为 acceptance-qa 有意变体。规则本身（重试次数、接管主体、隔离范围）不变。

#### Scenario: 四处 gist 与 canonical 字面一致

- **GIVEN** 仓库当前文本
- **WHEN** 提取 RA、quick-fix、codex-compat、review-orchestration 四处 gist 与 canonical 的核心句
- **THEN** 四处 gist 字面相同且各带指向 exploration-patterns 的指针；"主进程接管"零命中

#### Scenario: 有意变体被标注

- **GIVEN** ai-acceptance.md 契约校验段
- **WHEN** 读取其失败结局
- **THEN** 保留"再失败将缺失项标记 unverified"并紧接与 acceptance-qa/SKILL.md:117 相同的字面量"（acceptance-qa 变体；通用规则见 exploration-patterns「输出契约与校验」）"

### Requirement: Codex 映射表单点化（改了什么：canonical 前言改为全 skill 共用，两处复述表改指针，skill 专属行保留）

codex-compat.md 的工具映射总表 SHALL 是唯一完整映射表，其前言 SHALL 声明"全 skill 共用"并以一句指向 README 平台矩阵说明 pi/Grok 差异；requirement-analysis「执行环境兼容性」节 SHALL 改为一句 gist + 指针（不再复述整表）；quick-fix「执行环境兼容性」节 SHALL 只保留其自有行（根因探索子代理 `fork_turns: "none"`）与指针；acceptance-qa 与 review-orchestration 的 skill 专属降级节 SHALL 保留。映射内容本身不变。

#### Scenario: 通用映射行只在一处

- **GIVEN** 仓库当前文本
- **WHEN** 检索 "`TaskCreate` / `TaskUpdate` | `update_plan`" 整行
- **THEN** 只命中 codex-compat.md；RA 与 quick-fix 的兼容性节含指向它的指针

#### Scenario: quick-fix 自有行保留

- **GIVEN** quick-fix 执行环境兼容性节
- **WHEN** 读取
- **THEN** 仍含 code-explorer 子代理 `fork_turns: "none"` 一行

### Requirement: quick-fix TDD 例外清单引用（改了什么：不再复述清单，改为引用 + 显式化自有差异）

> **Superseded (2026-09-06)** — by .spec-dev/2026-09-06-02-tdd-seam/spec/tdd-seam-design.md#requirement-quick-fix-tdd-例外清单引用；原文保留仅作历史参考。

quick-fix 步骤 5a 的 TDD 例外陈述 SHALL 改为"例外清单以 test-driven-development skill 为准；quick-fix 另视纯文案改动为例外（需用户同意）"，SHALL NOT 再并列复述 TDD 的清单项。行为不变，差异显式化；"纯文案"是否并入 TDD canonical 由子项目 #3 裁决。

#### Scenario: 清单不再复述

- **GIVEN** quick-fix 步骤 5a
- **WHEN** 读取 TDD 例外句
- **THEN** 不出现"一次性原型""生成代码""配置文件"三项并列，含指向 test-driven-development 的引用与"纯文案"自有例外

### Requirement: visual-preview 产物归位特性目录（改了什么：gitignore 建议条款替换为脚本自建 .gitignore，其余条款自 major-upgrade 完整继承）

visual-preview SHALL 在存在特性上下文时把会话产物写入 `.spec-dev/<特性目录>/visual/<session-id>/`，无特性上下文时回退 `.spec-dev/visual/<session-id>/`；被设计采纳的定稿 mockup SHALL 复制为特性目录 `spec/assets/` 下的入库文件；两种 visual 根的 `.gitignore` SHALL 由 start-server.sh 自建（行为定义见 ADDED「visual 根自建 .gitignore」），SKILL.md SHALL NOT 再要求用户手动把 visual 路径加入仓库 `.gitignore`，但 SHALL 保留"不要忽略整个 `.spec-dev/`"提醒；port/token 记忆文件保持 `.spec-dev/visual/` 根不变；清理节的"项目内会话保留供回看"与归档约定 SHALL 不变。

#### Scenario: 提醒句更新

- **GIVEN** visual-preview SKILL.md
- **WHEN** 检索"加入 `.gitignore`"
- **THEN** 零命中；含"脚本自建"表述与"不要忽略整个 `.spec-dev/`"

#### Scenario: 落位与归档条款继承（继承）

- **GIVEN** 当前正在某特性目录上下文中做需求设计
- **WHEN** 启动 visual-preview 并生成 mockup
- **THEN** 产物位于该特性目录 `visual/<session-id>/` 下，port/token 记忆文件仍在 `.spec-dev/visual/` 根

### Requirement: README 漂移修正（改了什么：四处与仓库事实不符的陈述对齐）

> **Superseded**：由 [concurrent-execution](../../2026-09-06-01-concurrent-execution/spec/concurrent-execution-design.md) 的对应 Requirement 部分取代；其余行为继续有效。

README 双语 SHALL：trigger-evals 覆盖描述列出六个 skill（acceptance-qa、clarifying、exploring、quick-fix、requirement-analysis、test-strategy）；目录结构含全部 13 个 skill 目录与 scripts 下的 doctor.mjs、update-vendored-skill.mjs；writing-plans 介绍的自检列出四项（spec 覆盖 / 占位符 / 类型一致 / 导航表与任务文件一致）；schemas 描述为"3 个输出契约 schema + 1 个 vendored manifest schema"。

#### Scenario: 计数与磁盘一致

- **GIVEN** 两份 README 与磁盘
- **WHEN** 对照 trigger-evals 文件数、skills/ 子目录数、schemas/ json 数
- **THEN** 三者陈述均与磁盘计数一致

## 方案设计

### 架构与组件

- **定义点**（exploration-patterns.md）：新增「插件根解析」节（解析序列 + 占位符语义，只管路径），放在「输出契约与校验（deep 档）」之前；「输出契约与校验」节保留既有"失败 → 补全一次 → 主线程接管"canonical 并新增"校验器不可用 → 人工核对"一句；「派发要求与失败隔离」节末尾加止损句。它继续作为 10 个搜索块与 RA 已指向的共享 reference，不新建文件。
- **声明行**（4 个 SKILL.md）：紧随语言协议块、位于"外部搜索统一入口"块之前（RA 无搜索块则紧随语言协议）。形制为独立 blockquote，保证 Claude Code 替换后一眼可见。
- **引用点**（13 处）：命令统一 `node "${CLAUDE_PLUGIN_ROOT}/…"`；agent 与 doctor.md 回退句、schemas/README、acceptance-qa:81 指针化；codex-compat:61 去自造占位符；visual-preview 用 `${CLAUDE_SKILL_DIR}`。
- **收敛点**：失败隔离 4 处 gist、契约校验 4 处 gist（含 acceptance-qa:117）、Codex 映射 2 处指针、quick-fix 例外清单 1 处引用、codex-compat:61 占位符 1 处。
- **校验器**：validate-output.mjs `validatePlanIndex` 的 deps 抽取从 `match(/T\d\d/g)` 改为先展开 `T\d\d-T\d\d` 区间再抽取；倒序与缺号入 errors。
- **脚本**：start-server.sh 在 SESSION_DIR 分支判定之后、DRY_RUN 块（:168-173，打印后 `exit 0`）之前计算本次涉及的 visual 根清单（FEATURE_DIR 分支为 `${FEATURE_DIR}/visual` 与 `${FEATURE_DIR%/*}/visual`，PROJECT_DIR 分支为 `${PROJECT_DIR}/.spec-dev/visual`，`/tmp` 分支为空）；dry-run 每根打印一行 `GITIGNORE=` 后退出；非 dry-run 在既有 `mkdir -p "${SESSION_DIR}/content" "$STATE_DIR"`（:182）之后逐根 `mkdir -p "$root"` 再 `[ -e "$root/.gitignore" ] || printf '*\n' > "$root/.gitignore"`，失败 `echo "warn: …" >&2` 继续。
- **README**：两个新节 + 四处修正，双语逐节对应。

### 数据流

Claude Code：加载 SKILL.md → 平台替换声明行 → 会话持有插件根绝对路径 → 读 references 时把 `${CLAUDE_PLUGIN_ROOT}` 占位符替换为该值 → 构造命令/派发词（内联实路径）→ 执行。Codex：加载 SKILL.md（声明行保持字面量）→ 读 exploration-patterns 解析序列 → 以 skill base directory 上两级得插件根 → 同上。校验器：index.md 依赖列 → 区间展开 → ID 集合 → 悬空/环检测。visual：SESSION_DIR 计算 → visual 根推导 → `.gitignore` 确保存在 → 启动服务器。

### 关键接口

- 声明行字面量：`> **插件根**：\`${CLAUDE_PLUGIN_ROOT}\`——本 skill 正文与其 references 中的插件根命令以此为准；若上式仍为变量字面量（平台未替换），按 requirement-analysis 的 references/exploration-patterns.md「插件根解析」序列推导。`
- 命令形态：`node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" <schema> <file>`；`node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index <plan目录>`；`bash "${CLAUDE_SKILL_DIR}/scripts/start-server.sh" …`
- gist 句（失败隔离）：`失败先缩小范围重试 1 次，再失败主线程接管（定义见 exploration-patterns「派发要求与失败隔离」）`
- gist 句（契约校验）：`校验失败发回补全一次，再失败主线程接管（定义见 exploration-patterns「输出契约与校验」）`；acceptance-qa 变体：`校验失败发回补全一次，再失败标记 unverified（acceptance-qa 变体；通用规则见 exploration-patterns「输出契约与校验」）`
- 校验器 deps 展开：`expandRange("T01-T06") → ["T01",…,"T06"]`；`"T06-T01"` → errors `{path:"T07.deps", expected:"ascending range", actual:"T06-T01"}`
- dry-run 输出新增行：`GITIGNORE=<visual 根>/.gitignore`（每个涉及的根一行）

### 错误处理

- 插件根三级失败：报告并停，不猜路径。
- `.gitignore` 写失败（只读文件系统）：stderr 警告，服务器照常启动。
- 范围写法错误：校验器 exit 1 并给出 path/expected/actual，计划不得交付执行（沿既有规则）。
- pre-commit：改 SKILL.md 的提交用 `SKIP_OPENAI_SYNC_CHECK=1`（本特性不改触发描述）；四份 docs 断言测试的特征串保留（"外部搜索统一入口"、progress.yaml resources 定义句、渐进加载、YYYY-MM-DD-NN）。

## 测试与验收策略

| Scenario / 检查项 | 维度 | 执行方式 | Lane | 验收证据 |
|-------------------|------|---------|------|---------|
| 零裸路径与零自造占位符 + 双引号包裹 + 四个 skill 声明行 + 降级说明不复述 + 解析序列与契约校验完整陈述唯一 + 四处 gist 与 canonical 字面一致 + 止损句单点 + 映射行单点 + 例外清单不复述 + 提醒句更新 + README 双表/双节/计数一致 | docs | 任务内 TDD（新建 scripts/tests/plugin-root.test.mjs） | fast | node --test 通过 |
| 区间展开 / 倒序拦截 / 缺号拦截 / 存量计划仍通过 | unit | 任务内 TDD（plan-index.test.mjs 新用例） | fast | node --test 通过 |
| dry-run 打印 GITIGNORE 且不落盘 / /tmp 会话无 visual 根 | unit | 任务内 TDD（visual-path.test.sh 新断言） | fast | bash 测试 PASS |
| 用户项目 cwd 下校验命令可执行（bug 修复实证） | integration | 验收任务 (D)：临时目录 + 已知合法计划 fixture，按 skill 指令解析插件根后执行，对照 HEAD 095eb40 写法 | fast | 两次 exit code（0 vs 1）记录 |
| Claude Code 加载后声明行为绝对路径 | integration | 验收任务 (D + 独立证据审计)：真实 Claude Code 加载 writing-plans，捕获客户端已展开正文并核对声明行 | PR | 加载文本片段 |
| 会话文件被忽略 / 已有 .gitignore 不覆盖 / 写入失败只警告 | integration | 验收任务 (D)：临时 git 仓库真实 start + stop（第三次以 `.spec-dev` 只读、特性目录可写形态启动） | PR | git check-ignore 输出、stderr 单行 warn |
| validate-skills / check-openai-sync / check-plugin / node --test 全绿 | integration | 验收任务 (D) | fast | 命令退出码 0 |
| RA / writing-plans / executing-plans / acceptance-qa / quick-fix 的 evals.json 人工走查 | docs | 验收任务 (D)：逐条核对未被本次改动破坏 | fast | 走查清单 |

## 风险与边缘情况

- **R1** 官方文档称 skill 正文"出现处即替换"，声明行放在普通 blockquote 是否被替换以验收 Scenario 实测；若不替换则改为 frontmatter 相邻的首行段落再测（机制不变、位置可调）。
- **R2** Codex 端 skill base directory 是否注入未实测；第三级"已安装插件目录"兜底，且 scripts/schemas/README.md:16 既有条款已依赖 base directory 推导，风险不新增。
- **R3** 本 spec covers 20 文件与五份 active spec 重叠，后续子项目 #2-#7 每次都要再做分面共存声明（roadmap 备注已记）。
- **R4** Node ≥ 18 下限依据是 `node --test` 与 ESM 顶层 await；若后续脚本使用更高 API 需同步表。
- **R5** 区间展开后存量 index.md 的 T07 依赖闭包变大（新增 T03-T05），语义更正确，不影响已完成执行。
- **R6** 触碰 SKILL.md 但不改 openai.yaml 依赖 `SKIP_OPENAI_SYNC_CHECK=1`，计划须逐任务写明，否则 pre-commit 红。
- 边缘：声明行在 vendored/非插件安装（用户把仓库当 `~/.claude/skills/` 本地 skill 用）时不替换——此时 `${CLAUDE_SKILL_DIR}` 仍替换，序列第二级可用。

## 开放问题

- "纯文案"是否并入 TDD 例外 canonical（子项目 #3 裁决）。
- 成熟度分区节是否同步在 `.codex-plugin/plugin.json` 的 `defaultPrompt` 加一条提示（实施时按篇幅裁决，非阻塞）。

## 与 exploring-clarifying 的分面共存

现行未取代条款继续有效；.spec-dev/2026-09-09-01-exploring-clarifying/spec/exploring-clarifying-design.md 负责概念双查、共享术语、可见清单及受控探索/来源交接切面，双方covers按各自行为声明。仅major-upgrade中被明确点名的澄清核心纪律走部分取代，其他条款不因同文件被触碰而失效。triage可读取相关上下文，但仍零自动落盘；历史“不读产物”的范围解释不再用于本切面。

### exploring-clarifying T01 切面同步

本次T01更新skills/requirement-analysis/references/context-reuse.md、skills/requirement-analysis/SKILL.md、skills/quick-fix/SKILL.md、commands/triage.md、skills/clarifying/SKILL.md、skills/requirement-analysis/assets/spec-template.md、skills/requirement-analysis/agents/openai.yaml、skills/quick-fix/agents/openai.yaml、skills/clarifying/agents/openai.yaml、skills/exploring/evals/evals.json、skills/requirement-analysis/evals/evals.json、skills/quick-fix/evals/evals.json的获批探索/澄清切面；其余现行条款保持，未将已取代条款重新激活。最终有效用例选择见 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T01/green-selection.json（S29仅本票贡献）；原行为核查与装配证据见 .spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t01-red、.spec-dev/2026-09-09-01-exploring-clarifying/acceptance/model/t01-green 及 .spec-dev/2026-09-09-01-exploring-clarifying/execution/serial/T01/；这些任务期结果不替代最终候选验收。
