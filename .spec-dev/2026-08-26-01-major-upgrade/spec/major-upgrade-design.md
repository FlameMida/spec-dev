---
# —— spec-dev 漂移守卫锚点（机器可校验，勿删）——

> **Superseded-pending (2026-08-27)** — 本 spec 的「Requirement: plan 分文件形态（阈值门控）」「Requirement: 渐进执行与断点恢复」「Requirement: 资源登记纪律（按计划形态分流）（改了什么：登记与模板载体由"计划文件台账行"扩展为随计划形态分流，创建即登记语义不变）」三条将被 .spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md 部分取代（待其交付）；新工作以新 spec 为准，本 spec 仍描述当前已实现行为。
spec_dev:
  version: 1
  feature: major-upgrade
  status: active
  covers:
    - "plugin.json"
    - "package.json"
    - ".claude-plugin/plugin.json"
    - ".claude-plugin/marketplace.json"
    - ".codex-plugin/plugin.json"
    - ".agents/plugins/marketplace.json"
    - "commands/doctor.md"
    - "scripts/**"
    - "guardrail/install.mjs"
    - "guardrail/session-context.mjs"
    - "guardrail/templates/**"
    - "skills/test-strategy/**"
    - "skills/sequential-thinking/**"
    - "skills/clarifying/SKILL.md"
    - "skills/exploring/SKILL.md"
    - "skills/quick-fix/SKILL.md"
    - "skills/writing-plans/SKILL.md"
    - "skills/writing-plans/references/**"
    - "skills/executing-plans/SKILL.md"
    - "skills/executing-plans/references/**"
    - "skills/requirement-analysis/SKILL.md"
    - "skills/requirement-analysis/assets/**"
    - "skills/requirement-analysis/references/exploration-patterns.md"
    - "skills/requirement-analysis/references/codex-compat.md"
    - "skills/visual-preview/SKILL.md"
    - "skills/visual-preview/scripts/start-server.sh"
    - "skills/visual-preview/references/preview-guide.md"
    - "skills/acceptance-qa/SKILL.md"
    - "skills/acceptance-qa/references/acceptance-matrix.md"
    - "skills/acceptance-qa/references/unit-integration.md"
    - "skills/acceptance-qa/references/mcp-setup.md"
    - "agents/code-explorer.md"
    - "agents/external-resource-explorer.md"
    - "README.md"
    - "README.zh-CN.md"
  sync_commit: 76eb9e2200e896143b06e35f7d6a7f919659d1bb
  supersedes:
    - ".spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md"
  superseded_by: null
---

# spec-dev 重大升级（多平台适配 · MCP 清零 · 工作流增强）设计

## 背景与目标

spec-dev 现为 Claude Code + Codex 双平台 skill 插件（v7.21.1）。本次升级一次性解决 12 项问题：适配 Agent plugins 1.0.0 开放标准与 grok build / pi 两个新平台；修复"CLAUDE.md/AGENTS.md 注入不可观测"；anysearch 统一搜索入口失效的六个根因；roadmap 续接丢上下文；同日产物无顺序编号；澄清纪律缺自我披露且 exploring/quick-fix 覆盖不全；visual-preview 产物游离于特性目录外；设计原则与测试策略缺规范载体；plan 单文件在大计划下的上下文峰值与断点恢复缺失；以及以 vendored skill 替代 sequential-thinking MCP 实现插件零 MCP 依赖。

**成功标准**：全部 Requirement 的 Scenario 通过验收矩阵；`validate-skills.mjs`、`check-openai-sync.mjs`、`check-plugin.mjs` 全绿；Claude Code 与 Codex 实际装载验证通过；仓库内 `mcp` 残留引用为零（文档中的 opt-in 指引除外）。

## 非目标

不 fork anysearch 上游；不做 executor 版本域、编译快照、一次性执行 skill 注册（writing-plan-plus 已降档为价值内核）；不为 pi 平台重写 hooks 为 TS extension（文档声明限制）；不上架 grok 官方 marketplace（外部仓库 PR，交付后跟进）；存量 5 个特性目录不改名；不自研 sequential-thinking 实现；不改 check-spec-drift.mjs 判定逻辑。

## 术语表

- **MCP 清零**：插件自身不分发任何 MCP server 配置；浏览器类 MCP 转为用户按需自配。_Avoid_：去 MCP 化、无 MCP
- **vendored skill**：以上游仓库快照形式内嵌进本插件的第三方 skill，经统一同步脚本更新。_Avoid_：内置 skill、捆绑 skill
- **上下文胶囊**：roadmap 中每子项目携带的续接上下文小节（关键裁决、探索指针、已扫范围）。_Avoid_：handoff 块
- **双形态**：plan 按阈值门控产出单文件或分文件（index + tasks/ + progress.yaml）两种形态。_Avoid_：新旧格式（旧格式仅指存量单文件）
- **自我披露**：开出第一题前先陈述默认假设、关键信息缺口、易犯错误三段。_Avoid_：预披露、假设声明
- **关键分岔**：满足三条件的探索分歧点——选项互斥、不可同时探、用户不裁决则探索无法继续。

## 影响面

四类 manifest（根级新增、.claude-plugin、.codex-plugin、.agents/plugins）；guardrail 注入链与模板；`scripts/` 全部校验/发布/同步脚本；10 个既有 skill 的 SKILL.md 与部分 references；2 个新 skill 目录；2 个子代理定义；commands（新增 doctor、删除 check-mcp）；双语 README。外部系统：GitHub 上游 anysearch-skill 与 sequential-thinking-skill 仓库（只读同步）；四个 agent 平台的装载行为。

## 已确认的关键决策

- 不拆分子项目：用户裁决整合分析，单 spec 单 plan 一次交付——功能点重合处（anysearch↔子代理↔注入、原则↔plan 架构）需要同时设计
- writing-plan-plus 降档采纳价值内核（分文件渐进加载、显式 progress、轻量依赖声明），拒绝 executor 版本域/skill 注册/编译快照——与"最简实现"原则冲突且有 v6.0.0 裁撤前车之鉴（详见 `../../adr/0004-plan-dual-format-threshold.md`）
- MCP 清零：sequential-thinking 以 vendored skill 替代，浏览器 MCP 转 opt-in（详见 `../../adr/0003-mcp-zero-vendored-skills.md`）
- 测试策略两层形态：普适纪律进 SKILL.md、栈特定处方进 references——插件是通用工作流，栈处方只对特定项目有效
- exploring 全套接入澄清：保留发散默认，关键分岔转逐题漏斗（用户裁决超出"仅披露"推荐项）
- anysearch 增强走 normalize 通道而非 fork：上游同步后自动重放增强，保留上游更新能力
- 「默认不保留向后兼容」原则的 spec-dev 语境解释：管实现层（不加兼容层/回退垫片/仅兼容性迁移）；active spec 是"明确记录的当前合同"，删除旧路径的前提是经取代分流显式取代旧 spec；读取历史产物（旧 plan）不属于兼容垫片
- 同日编号 `YYYY-MM-DD-NN-<名称>`，存量目录 grandfather；本特性目录 `2026-08-26-01-major-upgrade` 即首个应用
- 注入链修复方向为可观测性优先（doctor + 去静默），声明式 hook 为待验证升级项，不可行时回退安装引导

## 取代与共存

- [部分取代] `.spec-dev/2026-08-09-resource-ledger/spec/resource-ledger-design.md`：Requirement「执行中创建即登记」与 Requirement「writing-plans 最终任务模板含资源台账（改了什么：清理步骤由固定 worktree 命令扩为台账遍历，新增台账小节）」——两条整条取代，替换行为由本 spec MODIFIED「资源登记纪律（按计划形态分流）」完整重述（含单文件形态原语义）并由 ADDED「plan 分文件形态」承接 progress.yaml 的台账结构。取代理由：登记与模板载体自本 spec 起随计划形态分流，旧条文"就地编辑计划文件"不再是唯一现行契约。其余三条 Requirement（清理只遍历台账、acceptance-qa 隔离复用判定、quick-fix 收尾清单式清理）语义不变，分面共存。
- [分面共存] `.spec-dev/2026-08-05-clarifying-skill/spec/clarifying-skill-design.md`：本 spec 仅新增自我披露纪律与嵌套式 exploring 分界（新增切面）；其全部既有 Requirement（逐题澄清、事实自查、三出口、被引用模式不触发出口、Codex 降级、两处引用方声明）在改造后语句保持为真，无冲突型变更；covers 重叠按双声明规则处理。
- [分面共存] `.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`：本 spec 仅移动「相关测试范围」声明在分文件形态下的物理位置（承载于 ADDED「plan 分文件形态」的 index.md 头部描述），判定语义零变化。
- [分面共存] `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md`：本 spec 大量编辑其 covers 文件但不触碰取代生命周期行为；提交命中其 covers 时按双声明规则同步或 `Spec-Guard: off` trailer 放行。
- [零动作] `.spec-dev/2026-08-08-triage-routing/spec/triage-routing-design.md`：不改 `commands/triage.md`，doctor 为新增命令无行为交集。

## ADDED Requirements

### Requirement: 根级 Agent plugins 1.0.0 manifest

插件 SHALL 提供符合 Agent plugins 1.0.0 开放标准的根级 `plugin.json`（`$schema` 与 `name` 必填，字段以官方 schema 为准），与既有 `.claude-plugin/`、`.codex-plugin/` manifest 并存。

#### Scenario: 官方 schema 校验通过

- **GIVEN** 根级 `plugin.json` 已落盘
- **WHEN** 用官方 `$schema` 对其做 JSON Schema 校验
- **THEN** 校验零错误

#### Scenario: 既有平台装载不回归

- **GIVEN** 三 manifest 并存
- **WHEN** Claude Code 与 Codex 分别安装/升级本插件
- **THEN** 两平台 skill 发现数量与升级前一致

### Requirement: pi 平台分发清单

插件 SHALL 提供根级 `package.json`，其 `pi.skills` 字段指向 `skills/` 目录，使 pi 用户可经 `pi install git:...` 发现全部 skill；agents/hooks 在 pi 上的限制 SHALL 记录于 README 平台矩阵。

#### Scenario: pi 装载发现 skills

- **GIVEN** 具备 pi 环境（0.84+）
- **WHEN** `pi install git:<本仓库>` 后列出可用 skill
- **THEN** spec-dev 的 skill 出现在列表（无 pi 环境时以清单走查替代，见验收矩阵）

### Requirement: doctor 诊断命令

插件 SHALL 提供 `doctor` 命令（`commands/doctor.md` + `scripts/doctor.mjs`），报告六类状态并给修复指引：运行平台、guardrail 安装状态、CLAUDE.md/AGENTS.md 标记块完整性、SessionStart hook 挂载、anysearch 可用性（含双副本歧义与版本滞后）、sequential-thinking 运行时链（bun/tsx→node 端口→纯推演）。

#### Scenario: 未安装 guardrail 的项目

- **GIVEN** 项目从未运行过 guardrail 安装
- **WHEN** 运行 doctor
- **THEN** 输出明确的"未安装"判定与安装命令指引，而非报错或静默

#### Scenario: anysearch 双副本歧义

- **GIVEN** 插件内嵌版与独立版 anysearch 并存
- **WHEN** 运行 doctor
- **THEN** 输出两副本路径与取舍建议

### Requirement: 会话注入决策可诊断

session-context 注入链 SHALL 在每个跳过分支留下可事后查询的一行原因记录；doctor SHALL 能回放最近一次注入决策。

#### Scenario: 非 git 目录的静默跳过去静默化

- **GIVEN** 会话工作目录不是 git 仓库
- **WHEN** SessionStart 注入被跳过后运行 doctor
- **THEN** 显示"最近一次注入：跳过——非 git 仓库"

### Requirement: sequential-thinking vendored skill

插件 SHALL 内嵌 `skills/sequential-thinking/`（vendored 自 thedotmack/sequential-thinking-skill，MIT，SHA-pinned 快照），提供带分支/修订/持久状态的结构化推理；执行链 SHALL 为 bun/tsx 直跑上游 `think.ts` → 本地零依赖 Node 端口 `think.mjs` → 降级为回复内显式分点推演，任何一级缺失不得中断工作流。

#### Scenario: 无 TS 运行时环境

- **GIVEN** 环境无 bun/tsx、有 node
- **WHEN** skill 被调用记录一轮思考
- **THEN** `think.mjs` 端口完成状态记录，行为与上游 `think.ts` 同输入同输出

#### Scenario: 全部运行时缺失

- **GIVEN** bun/tsx/node 均不可用
- **WHEN** requirement-analysis 阶段 4 需要结构化推理
- **THEN** 主线程在回复中显式分点推演完成对抗验证，流程不中断

### Requirement: vendored skill 统一同步脚本

`scripts/update-vendored-skill.mjs` SHALL 以配置驱动支持两种同步模式——anysearch（tag-pinned git subtree）与 sequential-thinking（SHA-pinned 子目录快照）——并复用三类持久适配：frontmatter normalize（幂等重建，含 description 增强注入）、openai.yaml 本地适配、LICENSE/NOTICE。

#### Scenario: normalize 幂等

- **GIVEN** 已完成一次同步与 normalize
- **WHEN** 连续再运行两次 `--normalize`
- **THEN** 工作区零 diff

#### Scenario: 上游新版本检测

- **GIVEN** anysearch 上游发布了更新的稳定 tag
- **WHEN** 运行 `--check`
- **THEN** 退出码 1 并输出目标版本

### Requirement: test-strategy skill

插件 SHALL 新增 `skills/test-strategy/`：SKILL.md 承载普适测试纪律（三 Lane 按 IO 类型调度、治理顺序 flaky→时长→选择、AI Agent 模型边界与五层测试骨架、与验收矩阵的对接规则），栈特定处方（DB 容器拓扑/模板克隆/两速隔离、前端 MSW 纪律、Agent eval 分级）进 references 按需加载；writing-plans 翻译验收矩阵时与 acceptance-qa 阶段 0 SHALL 引用之。

#### Scenario: 计划任务标注 Lane 归属

- **GIVEN** spec 验收矩阵含 integration 行且项目存在 DB 依赖
- **WHEN** writing-plans 翻译该行为任务测试步骤
- **THEN** 测试步骤标注目标 Lane（fast/PR/nightly）且 DB 类测试引用 db-testing 处方

### Requirement: 设计原则声明块

`skills/writing-plans/references/design-principles.md` SHALL 承载八条设计原则（默认不留向后兼容、最简实现、分层构建、不以未完成复杂性换可工作产品、模块化、优先成熟库、优先已有依赖、长期架构决策）及 spec-dev 语境注解；requirement-analysis 阶段 4 SHALL 将原则纳入方案评价维度、阶段 5 纳入设计检查；writing-plans 产出的计划头部 SHALL 含「设计原则」声明块。

#### Scenario: 方案对比引用原则裁决

- **GIVEN** 阶段 4 存在两个候选方案、其一引入推测性抽象
- **WHEN** 呈现方案对比
- **THEN** 对比含"是否引入投机抽象"的裁决行并影响推荐

#### Scenario: 计划头部携带原则块

- **GIVEN** writing-plans 为任意 spec 产出计划
- **WHEN** 检查计划头部（单文件）或 index.md 头部（分文件）
- **THEN** 存在「设计原则」声明块

### Requirement: 同日顺序编号

新建的日期前缀产物（特性目录、roadmap、reports）SHALL 命名为 `YYYY-MM-DD-NN-<语义名>`，NN 为当日两位序号（扫描当日已有取最大加一，落盘前重扫防并发撞号）；存量目录不改名。

#### Scenario: 同日第二个特性

- **GIVEN** `.spec-dev/` 已存在 `2026-08-26-01-major-upgrade`
- **WHEN** 同日创建第二个特性目录
- **THEN** 目录名为 `2026-08-26-02-<名称>`

#### Scenario: 并发撞号

- **GIVEN** 两个会话同日各自准备创建编号 02 的目录
- **WHEN** 后落盘的会话在写入前重扫发现 02 已存在
- **THEN** 顺延为 03 并同步修正自引路径

### Requirement: roadmap 上下文胶囊

roadmap 模板 SHALL 新增「原始需求」节（登记时保存用户原话全文）与每子项目「上下文胶囊」小节（关键裁决、探索产物指针、已扫探索范围）；requirement-analysis 续接检查 SHALL 载入胶囊并读取前置子项目 spec 与验收报告结论，已登记的探索范围不重扫、阶段 2 只补缺口；executing-plans 交付回写 SHALL 在胶囊追加「留给后继的注意事项」。

#### Scenario: 续接第二子项目不丢上下文

- **GIVEN** roadmap 子项目 #1 已交付且胶囊完整
- **WHEN** 用户说"继续 #2"进入 requirement-analysis
- **THEN** 流程不要求用户重新提供原始需求，且不对胶囊已登记的探索范围重新派发扫描

#### Scenario: 交付回写追加后继注意事项

- **GIVEN** 子项目 #1 经 executing-plans 完成交付
- **WHEN** 执行交付回写 roadmap
- **THEN** #1 的胶囊新增「留给后继的注意事项」行

### Requirement: plan 分文件形态（阈值门控）

writing-plans SHALL 在预估任务数大于 8 或计划正文预估超过 25KB 时产出分文件形态——`plan/index.md`（头部含全局约束与「相关测试范围」声明 + 任务导航表，导航表含任务/依赖/消费接口/产出接口四列，不复制任务正文）、`plan/tasks/TNN.md`（每任务一文件，沿用既有任务模板）、`plan/progress.yaml`（唯一运行时状态：任务状态、当前指针、commit 映射、资源台账、偏差记录；writing-plans 预登记资源写入其初始 resources，最终任务清理步骤引用其清单）；低于阈值 SHALL 维持单文件形态。`validate-output.mjs` SHALL 提供 plan-index 校验：tasks/ 文件与导航表一一对应、依赖引用存在、依赖图无环。

#### Scenario: 大计划自动分文件

- **GIVEN** spec 推导出 13 个任务
- **WHEN** writing-plans 产出计划
- **THEN** 生成 index + 13 个任务文件 + progress.yaml，且 plan-index 校验通过

#### Scenario: 悬空依赖被拦截

- **GIVEN** 导航表中任务 T05 声明依赖 T99
- **WHEN** 运行 plan-index 校验
- **THEN** 校验失败并指出悬空引用

### Requirement: 渐进执行与断点恢复

executing-plans 对分文件形态 SHALL：启动只读 index 与 progress；执行 TN 时只读 `tasks/TN.md` 与其依赖任务的产出接口行（不读其正文）；每任务完成原子更新 progress 并提交。检测到未完成的 progress.yaml 时 SHALL 校验 worktree/分支/最后 commit 可解析后从下一 ready 任务续跑；单文件形态 SHALL 补充复选框判读的轻量恢复规程。

#### Scenario: 新会话恢复执行

- **GIVEN** progress.yaml 显示 T01-T04 完成、T05 待执行，会话为全新上下文
- **WHEN** 用户要求继续执行该计划
- **THEN** 流程从 T05 续跑且不读取 T06 及之后的任务正文

#### Scenario: 状态与文件不一致

- **GIVEN** progress 引用的 `tasks/T05.md` 文件缺失
- **WHEN** 恢复执行
- **THEN** 停下向用户报告不一致，不猜测继续

## MODIFIED Requirements

### Requirement: 澄清核心纪律（新增第 0 条自我披露）

clarifying 的核心纪律 SHALL 为七条且两种角色共用：**第 0 条——开出第一题前先输出三段自我披露（我默认了哪些未说出口的假设；哪些信息会显著改变方案；这类问题最容易犯什么错）**；其余六条不变（一次一题、选择题优先且推荐项放首位、事实自查决策交用户、按决策依赖排序、术语挑战、不编造问题）。引用方（requirement-analysis 阶段 3、quick-fix 步骤 3）的锚定语列举 SHALL 同步新条目。

#### Scenario: 被引用模式自动继承披露

- **GIVEN** quick-fix 步骤 3 以被引用模式使用澄清纪律
- **WHEN** 开始逐题校对
- **THEN** 第一题前先出现三段自我披露

### Requirement: exploring 姿态（发散默认 + 关键分岔转漏斗）

exploring SHALL 保持发散陪伴默认姿态并新增两项强制行为：开场自我披露（继承核心纪律第 0 条）；探索中浮现**关键分岔**（选项互斥、不可同时探、用户不裁决则无法继续，三条件同时满足）时 SHALL 切入 clarifying 被引用模式逐题澄清，完成后回到发散。原"开支线而非审讯"表述 SHALL 改写为"非分岔不审讯"，与 clarifying 的分界表从对立改为嵌套。

#### Scenario: 互斥选型转漏斗

- **GIVEN** 探索中浮现两种互斥的存储方案且方向选择阻塞后续探索
- **WHEN** 三条件判定成立
- **THEN** 切入逐题澄清（选择题+推荐首位），用户裁决后回到发散探索

#### Scenario: 非分岔不审讯（near-miss）

- **GIVEN** 用户在开放地聊一个尚无分岔的想法
- **WHEN** 探索推进
- **THEN** 不出现连续追问式的逐题澄清

### Requirement: 子代理与全 skill 统一搜索优先级

`agents/code-explorer.md` 工具白名单 SHALL 含 Bash（使其能执行 anysearch CLI）；全部工作流 skill（含 exploring、quick-fix、executing-plans、writing-plans、acceptance-qa、clarifying）SHALL 各含一行统一条款——外部搜索 anysearch 优先、降级 WebSearch/WebFetch、细则指向 exploration-patterns 单一定义点；guardrail 的 CLAUDE.md/AGENTS.md snippet SHALL 含主线程全局搜索优先级规则；Codex 派发词模板 SHALL 显式携带 anysearch 提醒。

#### Scenario: code-explorer 可执行 CLI

- **GIVEN** Claude Code 正常加载 agent 定义
- **WHEN** code-explorer 需要查询外部库文档
- **THEN** 能通过 Bash 执行 anysearch CLI 而非只能落到 WebFetch

#### Scenario: 非 requirement-analysis 工作流中的搜索

- **GIVEN** 主线程在 quick-fix 中需要查外部资料
- **WHEN** 发起搜索
- **THEN** 依据 quick-fix 内的统一条款先试 anysearch

### Requirement: anysearch description 触发增强（normalize 通道）

update-vendored-skill 的 normalize 步骤 SHALL 将 anysearch 的 description 重建为含中英双语、"Use when"触发从句的增强版本；上游 subtree 同步之后重跑 normalize SHALL 恢复增强版（增强不因上游覆盖而丢失）。

#### Scenario: 上游同步后增强保留

- **GIVEN** 上游发布新 tag 且其 SKILL.md description 为原版
- **WHEN** 执行同步 + normalize
- **THEN** 落盘的 description 为增强版且其余上游变更正常并入

### Requirement: visual-preview 产物归位特性目录

visual-preview SHALL 在存在特性上下文时把会话产物写入 `.spec-dev/<特性目录>/visual/<session-id>/`，无特性上下文时回退 `.spec-dev/visual/<session-id>/`；被设计采纳的定稿 mockup SHALL 复制为特性目录 `spec/assets/` 下的入库文件；gitignore 建议 SHALL 同步覆盖两种 visual 路径；port/token 记忆文件保持 `.spec-dev/visual/` 根不变。

#### Scenario: 特性上下文中的产物落位

- **GIVEN** 当前正在 `.spec-dev/2026-08-26-01-major-upgrade/` 特性上下文中做需求设计
- **WHEN** 启动 visual-preview 并生成 mockup
- **THEN** 产物位于该特性目录 `visual/<session-id>/` 下

#### Scenario: 无特性上下文回退

- **GIVEN** 会话不处于任何特性目录上下文（如独立头脑风暴）
- **WHEN** 启动 visual-preview 生成产物
- **THEN** 产物位于 `.spec-dev/visual/<session-id>/`（现状路径），服务正常可用

### Requirement: 资源登记纪律（按计划形态分流）（改了什么：登记与模板载体由"计划文件台账行"扩展为随计划形态分流，创建即登记语义不变）

executing-plans 执行任务期间创建计划未预登记的持久资源时，执行者 SHALL 当场登记、不延迟到收尾补记——单文件形态写入计划最终任务的资源台账行（就地编辑计划文件，含预登记模板小节），分文件形态写入 progress.yaml 的 resources 键（计划任务文件不被编辑）；清理步骤只遍历所在载体的台账条目的既有语义不变。

#### Scenario: 单文件形态创建即登记

- **GIVEN** 单文件形态计划执行中需临时启动一个数据库容器
- **WHEN** 执行者创建该容器
- **THEN** 计划最终任务的资源台账即刻多出一行（含清理命令）

#### Scenario: 分文件形态登记进 progress

- **GIVEN** 分文件形态计划执行中创建了未预登记的持久资源
- **WHEN** 执行者完成创建动作
- **THEN** progress.yaml 的 resources 键即刻新增条目（含清理命令），任何计划任务文件无 diff

### Requirement: 结构化推理消费点改写

requirement-analysis（阶段 1/阶段 4/Checklist）、exploring、quick-fix、clarifying、codex-compat 与相关 evals 中对 `mcp__sequential-thinking__sequentialthinking` 的引用 SHALL 全部改写为指向内嵌 sequential-thinking skill；"不可用降级为回复内分点推演"的降级语义 SHALL 保持不变。

#### Scenario: 无 MCP 环境的对抗验证

- **GIVEN** 用户环境未配置任何 MCP
- **WHEN** requirement-analysis 进入阶段 4
- **THEN** 经内嵌 skill（或其降级链）完成信息对抗验证，流程不因 MCP 缺失中断

## REMOVED Requirements

### Requirement: check-mcp 健康检查命令

移除 `commands/check-mcp.md`。原因：MCP 清零后检查对象消失；健康检查职能（含可选浏览器 MCP 的 opt-in 检测）并入 doctor 命令。

### Requirement: 插件分发 MCP 配置

移除 `.mcp.json` 及 `.codex-plugin/plugin.json` 中的 mcpServers 配置（`.agents/plugins/marketplace.json` 经核实无 mcpServers 键，交付时仅核实无残留引用）。原因：零 MCP 依赖策略——sequential-thinking 由 vendored skill 承接；playwright/chrome-devtools 转为 acceptance-qa `references/mcp-setup.md` 指引下的用户按需自配（Tier A 浏览器自动化的智能降级语义不变，Tier D 的 Playwright CLI 不受影响）。

## 方案设计

### 架构与组件

八个模块。**M1 平台适配**：根级 plugin.json（AP 1.0.0）+ package.json（pi）+ grok 验证清单 + README 平台矩阵；check-plugin/release 扩为四处版本同步。**M2 注入可观测**：doctor 命令与去静默化改造 install.mjs/session-context.mjs；声明式 hook 为验证性升级项（可行则插件自带 SessionStart hook，不可行回退 doctor 引导）。**M3 anysearch 统一**：白名单修复 + normalize 增强 + 全 skill 条款 + snippet 全局规则 + 派发词模板。**M4 产物组织**：编号规则、roadmap 胶囊模板、visual-preview 路径参数化（start-server.sh 加特性目录入参，server.cjs 仅消费 BRAINSTORM_DIR 无需改）。**M5 澄清纪律**：clarifying 核心纪律第 0 条 + exploring 姿态改写 + 引用方锚定语同步。**M6 规范载体**：design-principles.md reference + test-strategy skill（SKILL.md + references ×3 + openai.yaml + evals/trigger-evals）。**M7 plan 双形态**：writing-plans 阈值分流与 progressive-plan-format.md、executing-plans 渐进执行与 progressive-execution.md（均阅读时机门控）、validate-output plan-index schema。**M8 MCP 清零**：sequential-thinking vendored skill（SHA 快照 + think.mjs 端口）+ update-vendored-skill.mjs 泛化 + 六处消费点改写 + manifest/README 清理。

### 数据流

设计期：requirement-analysis 读 design-principles（阶段 4/5）→ spec 验收矩阵引用 test-strategy Lane 语义 → writing-plans 按阈值产出单文件或 index+tasks+progress → executing-plans 按形态分流执行（`plan/tasks/` 存在即分文件形态），progress.yaml 为分文件形态唯一运行时状态、复选框仅存于单文件形态。运维期：update-vendored-skill 按配置同步两个上游 → normalize 重放增强 → check-openai-sync/validate-skills 校验；doctor 汇聚平台/注入/搜索/推理四域健康态。

### 关键接口

`doctor.mjs`：无参运行，人类可读分节输出，退出码 0（健康/仅提示）、1（存在需修复项）。`update-vendored-skill.mjs --skill <name> [--check|--tag <v>|--sha <sha>|--normalize]`：配置表驱动（upstream、模式、子目录映射、增强 description 文本）。`progress.yaml` 键：`format_version`、`tasks.<TNN>.{status,commit,tests,deviations}`、`current`、`resources[]`、`notes[]`。index.md 导航表列契约：`任务 | 依赖 | 消费接口 | 产出接口`。think.mjs 与上游 think.ts 同 CLI 入参与状态文件格式。

### 错误处理

声明式 hook 验证失败→回退 doctor 引导安装（双路径均为已设计行为）；think 运行时全缺→分点推演兜底（工作流永不因工具缺失中断）；上游 sequential-thinking 静止或消亡→SHA 快照自持，--check 仅提示；progress.yaml 不参与 worktree 合并（执行档案，最终任务归档）；编号并发撞号→落盘前重扫顺延；漏斗误触发→三条件判定 + near-miss eval 兜底；平台实测不可得（无 grok/pi 环境）→对应 Scenario 以官方文档清单走查替代并在验收报告注明证据等级；分文件校验失败→计划不得交付执行。

## 测试与验收策略

| Scenario / 检查项 | 维度 | 执行方式 | 验收证据 |
|-------------------|------|---------|---------|
| 官方 schema 校验通过 | integration | 任务内 TDD | 校验命令输出 |
| 既有平台装载不回归（Claude Code/Codex 实装） | integration | 验收任务 (D) | 安装/升级日志 |
| pi 装载发现 skills / grok 兼容清单走查 | integration | 验收任务 (A) | 走查记录+证据等级 |
| doctor 六类状态两场景（未装 guardrail/双副本） | integration | 任务内 TDD | doctor 输出断言 |
| 注入跳过去静默化回放 | integration | 任务内 TDD | doctor 回放输出 |
| think.mjs 与上游同输入同输出 | unit | 任务内 TDD | 对齐测试通过 |
| 全运行时缺失降级不中断 | docs | 验收任务 (A) | eval 断言 |
| normalize 幂等 / --check 退出码 | unit | 任务内 TDD | node 测试通过 |
| Lane 归属翻译 / 原则裁决行 | docs | 验收任务 (A) | eval 断言 |
| 同日编号两场景 | docs | 任务内 TDD | 规则文本+eval |
| 胶囊续接不重扫 / 交付回写追加注意事项 | docs | 验收任务 (A) | eval 断言 |
| 无 MCP 环境的对抗验证（消费点改写） | docs | 验收任务 (A) | eval 断言 |
| 单文件/分文件登记纪律两场景 | docs | 验收任务 (A) | eval + 演练记录 |
| 计划头部携带原则块 | docs | 任务内 TDD | rg 断言 |
| 大计划分文件+悬空依赖拦截 | unit | 任务内 TDD | plan-index 校验测试 |
| 新会话恢复+不一致停下 | integration | 验收任务 (A) | 恢复走查记录 |
| 披露继承 / 分岔转漏斗 / near-miss | docs | 验收任务 (A) | evals 全绿 |
| code-explorer 白名单含 Bash | unit | 任务内 TDD | 定义文件断言 |
| 全 skill 统一条款覆盖 | docs | 任务内 TDD | rg 断言逐文件命中 |
| 上游同步后增强保留 | integration | 任务内 TDD | 同步演练 diff |
| visual 产物落位两场景 | integration | 任务内 TDD | 脚本测试 |
| MCP 残留引用为零 | integration | 验收任务 (D) | rg 零命中报告 |
| validate-skills / check-openai-sync / check-plugin 全绿 | integration | 验收任务 (D) | CI 输出 |
| 双语 README 与 skill description 同步 | docs | 验收任务 (D) | check-openai-sync |

## 风险与边缘情况

Agent plugins 1.0.0 字段细节以官方 schema 为准，探索结论若与 schema 冲突以 schema 为准（Codex 对根级 manifest 的加载证据缺失，已列为验收走查）；grok 对 agents/*.md 字段的实际生效缺官方规范，验证清单标注推断级证据；上游 anysearch 大版本改 frontmatter 结构可能使 normalize 注入规则失配（--check CI + 幂等测试兜底）；exploring 漏斗有审讯回潮风险（near-miss eval）；分文件形态在极小团队可能觉得仪式重（阈值门控保证小计划零感知）；本次改动横跨 5 份 active spec 的 covers，提交序列需按双声明规则组织避免守卫误拦。

## 开放问题

根级 manifest 是否须同时提供标准命名的 `mcp.json`（MCP 清零后倾向不提供，以官方 schema 必填性为准）；think.ts 的状态文件路径是否需要按项目隔离（实施时按上游实现定）；doctor 是否顺带检测 Codex 端插件缓存版本滞后（低成本则做）。
