---
spec_dev:
  version: 1
  feature: status-overview
  status: active
  covers:
    - "scripts/status.mjs"
    - "scripts/lib/status.mjs"
    - "scripts/lib/status-parse.mjs"
    - "scripts/tests/status*.test.mjs"
    - "commands/status.md"
    - ".codex-plugin/plugin.json"
    - "README.md"
    - "README.zh-CN.md"
  sync_commit: null
  supersedes: []
  superseded_by: null
---

# 多 worktree 状态概览设计

## 背景与目标

Skill 生态吸收 roadmap #8 的 AB-34：提供一次性、只读的项目进度概览，让用户看到同一 Git 仓库各 worktree 中的 roadmap、spec 与计划记录及其差异，减少恢复工作前逐文件翻找。现有 doctor 是健康诊断；session-context 只有 spec 状态计数，不能回答多工作区的工作进度。

**成功标准**：从仓库任意子目录或显式目标路径运行一次 CLI，取得有来源的终端表格或 JSON；不漏报可识别记录的解析错误，不把验收夹具计入真实工作，不替用户选定权威 worktree，不把记录中的完成写成重新验收通过。

## 原始需求与批准来源

- 用户通过 roadmap 的「继续」启动 #8 评估，认可只为 AB-34 进入正式设计；其他 P2 不自动实施。
- 用户选择：「需要：汇总当前工作区及该仓库的其他 worktree，标明每条进度的来源」。
- 用户选择：「展示进度记录，并提示格式错误、缺失和跨 worktree 分歧；明确标注未重新验收」。
- 用户选择：「独立 CLI：终端表格 + JSON，每次读取生成快照」。
- 主线程展示六部分完整设计；用户要求用十岁小孩能懂的语言解释，主线程以“各工作桌的作业进度表，读记录但不批改作业”说明后，用户回复 `ok`。本 spec 固化该完整设计，不把解释示例里的机器人任务当产品数据。

## 非目标

- 不核验完成提交、合并关系、验收证据真伪；不运行测试、doctor、模型或联网请求来查询项目状态。
- 不计算可调度任务、不恢复执行、不写 progress、不认领任务、不取得执行锁、不建立缓存状态源。
- 不做浏览器页面、常驻服务、持续刷新、多仓库聚合、ADR 索引或存量契约对账。
- 不修改守卫解析/执行行为、不引入通用 YAML 库、不迁移历史资料、不改变现行计划格式。
- 不实施 AB-15/24/28/41/43。

## 术语与参与者

- **记录快照**：本次有界读取所得的数据；不是多个 worktree 的原子快照，也不是验收结论。
- **来源记录**：特性在某 worktree、某正式文件位置的一份记录；同一特性可有多个来源。
- **特性组**：按仓库内特性目录相对路径归组的来源集合；不按标题或 feature 文本猜测身份。
- **进度分歧**：同组可比较来源的展示性状态不同，不等于需要修复的错误。
- **读取诊断**：无法完整读取或解析、缺少应有配套文件、内部数据矛盾等问题。

用户和 AI 调用者消费终端表格；脚本调用者消费 JSON 与退出码。Git 提供已登记 worktree 清单，文件系统提供未提交内容在内的当前文件字节。未提交状态仍是记录，不能宣称已持久化提交。

以上均为本特性局部术语，无新增仓库共享术语，不创建 glossary。

## 已确认的关键决策

1. 汇总同一 Git common-dir 下的所有已登记 worktree；标明路径、分支或 detached HEAD 和来源文件。
2. 只展示记录与结构性问题；固定声明「本次为进度记录快照，未重新验收，也未核验交付事实」。
3. 独立 Node CLI，每次生成快照，文本与 JSON 共用模型；不新增正式 skill。
4. 同组来源不自动择新、不合成一份进度。可折叠相同状态，但 JSON 保留全部来源。
5. 按已批准设计读取 v1 YAML/JSON、v2 JSON 和旧单文件复选框；不为展示升级原文件。
6. 保持零新增运行时依赖；复用现有纯读取接口，不为“复用”导入顶层执行脚本或改造守卫。

这些选择属于可逆的查询工具实现，不同时满足 ADR 的难逆转、缺上下文费解、真实取舍三判据；不新增或取代 ADR。

## 取代与共存

本项为 ADDED 只读投影，`supersedes: []`。下列为现行相交切面，已逐条排除被 Superseded 标注的旧 Requirement：

| 现行 spec | 共存理由 |
|---|---|
| `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md` | scripts/** 与 manifest/README 文件交集；doctor 六类诊断及会话解释输出保持。本项独立入口，不改变诊断结果。 |
| `.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md` | 保留「存量计划兼容读取」；本项只显示复选框，不接管其执行恢复。被取代的旧计划三条不作权威。 |
| `.spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md` | 消费插件根解析约定；公开说明增加 status 段落，不改变依赖表、成熟度与共享规则。 |
| `.spec-dev/2026-09-06-01-concurrent-execution/spec/concurrent-execution-design.md` | 保留 progress 唯一写者、认领及交付事实边界；只读展示不写并发元数据。 |
| `.spec-dev/2026-09-07-01-plan-decomposition/spec/plan-decomposition-design.md` | 消费最新 M01—M03 与 v2 待验/组协议；不调用调度/恢复，不扩展输入协议。 |
| `.spec-dev/2026-09-06-03-review-conformance/spec/review-conformance-design.md` | README 新段落不改变 S 维度、审查纪律或结果契约。 |
| `.spec-dev/2026-09-06-03-review-conformance/spec/controlled-review-design.md` | manifest/README 提示入口共存，不改变受控审查 runner。 |
| `.spec-dev/2026-09-08-01-quick-fix-diagnosis/spec/quick-fix-diagnosis-design.md` | README 文件交集，不改变诊断能力及其公开摘要。 |
| `.spec-dev/2026-09-09-01-exploring-clarifying/spec/exploring-clarifying-design.md` | README 文件交集，不改变澄清、探索及上下文复用。 |
| `.spec-dev/2026-08-10-supersede-lifecycle/spec/supersede-lifecycle-design.md` | 生命周期语义共存：active 不等于实施中，非法生命周期不归为 active；本项不改 session-context 或 guardrail。 |

ADR-0005 的 progress 唯一状态源、ADR-0006 的插件根单点、ADR-0007 的并发边界及 ADR-0008 的待验不等于完成继续适用。只显示原始 spec 生命周期，不宣称已经沿取代链审定“现行契约”；不因此新增整条取代链的语义审查。

## ADDED Requirements

### Requirement: R01 查询入口与目标定位

CLI SHALL 接受 `--repo <path>`、`--json`、`--help`，缺省以 cwd 定位目标 Git 工作区。

#### Scenario: S01 从子目录或显式路径查询
- **GIVEN** 插件与目标仓库分离，目标路径含空格，调用 cwd 是仓库子目录。
- **WHEN** 分别运行默认命令和带 `--repo` 的命令。
- **THEN** 两次解析到同一目标仓库，插件脚本路径不受 cwd 影响。

#### Scenario: S02 参数与非仓库错误
- **GIVEN** 未知参数、重复选项、缺少 repo 值或非 Git 目录。
- **WHEN** 调用 CLI。
- **THEN** 返回退出码 2 和具体原因；`--help` 单独使用返回用法及 0，不读取项目。

### Requirement: R02 全部 worktree 来源枚举

CLI SHALL 对同一 Git 仓库登记的 worktree 分别建立带来源的读取结果。

#### Scenario: S03 主工作区与 detached 工作区
- **GIVEN** 同仓库主工作区、另一普通分支 worktree 和 detached worktree，各有不同记录。
- **WHEN** 从任一可用 worktree 查询。
- **THEN** 输出包含三者，来源含绝对路径、分支或 detached/HEAD 标识；不是只扫描当前目录下的 `.worktrees/`。

#### Scenario: S04 无法访问的已登记工作区
- **GIVEN** Git 清单中一处路径不可访问，另两处可读。
- **WHEN** 查询。
- **THEN** 保留失效来源及诊断，仍返回另两处记录，退出 1；不删除或 prune 登记。

### Requirement: R03 正式产物扫描边界

扫描器 SHALL 仅从本设计列明的正式产物位置发现记录。

#### Scenario: S05 深层验收夹具排除
- **GIVEN** 正式 `.spec-dev/F/plan/progress.yaml` 以及 `acceptance/.../.spec-dev/demo/plan/progress.yaml`、execution 示例与任意深层同名文件。
- **WHEN** 查询。
- **THEN** 只统计正式特性 F，嵌套夹具不进入任务数或来源数。

#### Scenario: S06 历史位置与符号链接
- **GIVEN** 约定的 docs 历史特性及指向仓库外的特性目录链接。
- **WHEN** 查询。
- **THEN** 历史记录带原始路径显示且不迁移；候选链接不跟随并产生诊断，外部内容未读取。

### Requirement: R04 Roadmap 与 spec 原始状态

概览 SHALL 分别呈现 roadmap、子项目与 spec 的记录状态及关联路径。

#### Scenario: S07 active spec 没有计划
- **GIVEN** active spec 存在但未建立 plan，另有 roadmap 子项目 pending。
- **WHEN** 查询。
- **THEN** 显示 spec active、无计划记录及子项目 pending，不推断实施中或待批准，不因尚无计划退出 1。

#### Scenario: S08 未知状态与缺失关联
- **GIVEN** 一个 spec 使用非法状态 delivered，roadmap 某行显式关联一个不存在的特性目录。
- **WHEN** 查询。
- **THEN** 保留非法原值/关联路径并诊断，合法记录继续显示；不把 delivered 转为合法 spec 状态。

### Requirement: R05 分文件计划记录读取

概览 SHALL 依据导航表与 progress 的合法格式投影 v1/v2 计划进度。

#### Scenario: S09 v1 YAML 和 JSON
- **GIVEN** 内容等价的 v1 模板 YAML 与 JSON，分别含块映射与行内任务映射、引号、注释和 notes/resources。
- **WHEN** 读取。
- **THEN** 两者得到相同任务状态与总数；notes/resources 不被误当任务，未提交文件内容可显示。

#### Scenario: S10 并发 current 为 null
- **GIVEN** v1 `execution.mode: parallel`、current null，两个任务 in_progress。
- **WHEN** 查询。
- **THEN** 同时列出两个进行中任务，current 空不被解释为全局空闲。

#### Scenario: S11 v2 集成组待验
- **GIVEN** 合法 v2 五票计划：T00 隔离票 completed、两名组员分别 awaiting_verification/blocked、独立验证票与最终交付票 pending，组状态 blocked。
- **WHEN** 查询。
- **THEN** 显示完成 1/5、待验与阻塞各一及组记录状态，不把实现 SHA 当完成，不输出 ready 结论。

### Requirement: R06 旧单文件复选框记录

概览 SHALL 在旧单文件计划中按任务区域呈现复选框记录并标明其来源类型。

#### Scenario: S12 旧任务与代码块中的复选框
- **GIVEN** 两个旧任务，一个实际步骤全部勾选、另一个未全部勾选，代码块含示例任务及复选框。
- **WHEN** 查询。
- **THEN** 只读取正文真实任务；显示“复选框记录：全勾选 1/2”，不称其通过验收，也不自动写 progress。

#### Scenario: S13 无法辨认的旧结构
- **GIVEN** 旧计划存在但任务标题无法识别或任务没有实际复选框。
- **WHEN** 查询。
- **THEN** 显示文件入口及未知/不可解析说明，不把未知任务当零任务或全完成。

### Requirement: R07 格式与缺失诊断

概览 SHALL 对识别出的无效或不完整记录返回可定位诊断并保留其他可用记录。

#### Scenario: S14 缺配套文件与任务不一致
- **GIVEN** 分文件计划缺 index 或 progress（包括无 spec/index/progress、仅剩 plan/tasks/ 的特性），或导航与 tasks 状态键不一致，或 current 指向不存在的任务。
- **WHEN** 查询。
- **THEN** 对应计划显示不完整，具体缺口可定位，不生成可信完成比例；同工作区其他完整计划仍显示。

#### Scenario: S15 非法语法与未知协议
- **GIVEN** 重复键、未知 format_version、v2 非 JSON、v1 无组却使用 awaiting_verification 或超出支持语法的 YAML。
- **WHEN** 查询。
- **THEN** 产生各自诊断，原始版本/路径保留；不静默回退 v1、不以正则捞出部分状态当成功。

### Requirement: R08 多来源分组与分歧

概览 SHALL 按特性相对路径保留全部来源并比较本设计定义的展示状态投影。

#### Scenario: S16 相同进度折叠
- **GIVEN** 两个 worktree 的同路径特性状态相同，仅 notes 文本或文件排版不同。
- **WHEN** 查询。
- **THEN** 不报进度分歧，终端可折叠并列明两个来源，JSON 仍有两份记录；特性数 1、来源记录数 2。

#### Scenario: S17 状态或任务集合不同
- **GIVEN** 同路径特性两份计划的任务集合、状态、current 或关联 roadmap 状态不同，其中一份修改时间较晚。
- **WHEN** 查询。
- **THEN** 并列差异字段与来源，不按时间或完成量选权威、不合并任务计数；仅分歧不导致退出 1。

#### Scenario: S18 特性只存在于一个分支
- **GIVEN** 某特性仅在新分支出现，另一个 worktree 没有该目录，也没有显式悬空关联。
- **WHEN** 查询。
- **THEN** 列出已有来源，不把另一分支缺特性当读取错误，不按同名标题合并不同路径。

### Requirement: R09 终端与 JSON 一致输出

CLI SHALL 从同一规范化模型输出有稳定排序的终端概览或版本化 JSON。

#### Scenario: S19 两种输出的等价内容
- **GIVEN** 同一不变仓库包含正常、blocked、待验、分歧与解析错误记录。
- **WHEN** 分别调用默认输出和 `--json`。
- **THEN** 来源、状态、计数和诊断对应一致；JSON stdout 只有一个 JSON 文档，不夹说明或控制码。

#### Scenario: S20 空仓库与稳定排序
- **GIVEN** 一个有效仓库无正式记录，或有名称含中文/空格且目录枚举顺序不稳定的记录。
- **WHEN** 重复查询。
- **THEN** 空记录输出空数组/零计数与“未发现记录”，退出 0；非空按明确排序输出，相同输入除采集时间外一致。

### Requirement: R10 退出码区分记录与读取失败

CLI SHALL 用 0/1/2 区分完成读取、结果不完整及调用错误。

#### Scenario: S21 blocked 与分歧不是 CLI 失败
- **GIVEN** 所有记录合法可读，但存在 blocked 任务和来源差异。
- **WHEN** 查询。
- **THEN** 返回 0，阻塞与分歧仍明确显示。

#### Scenario: S22 部分失败仍有结构化结果
- **GIVEN** 某个候选文件无法读取或解析，其他文件正常。
- **WHEN** 以 JSON 查询。
- **THEN** 返回 1，输出包含成功记录及失败路径；不能只返回空结果或把错误仅写在 stderr。

### Requirement: R11 只读与验证边界

查询 SHALL 保持项目状态不变，并明确声明结果不是重新验收或交付核验。

#### Scenario: S23 已完成记录不触发验证
- **GIVEN** completed 记录中的提交/证据已不可访问，仓库含脏文件与未跟踪记录。
- **WHEN** 查询。
- **THEN** 只展示记录值，不访问验收证据、不运行测试/doctor/联网，不获取执行锁；工作文件、index、refs、配置及进度无改变；终端固定声明、JSON `verification: "not_performed"`。

### Requirement: R12 读取期间变化的有限处理

查询 SHALL 对采集中发现的记录变化最多重读一次并标明仍不稳定的来源。

#### Scenario: S24 文件在读取期间更新
- **GIVEN** 文件在一次采集前后被修改，第二次采集又变化。
- **WHEN** 查询。
- **THEN** 不无限重试、不锁住写者；该来源标记 unstable，不给可信比例，其他来源保留，退出 1。

#### Scenario: S25 第一次变化后稳定
- **GIVEN** 首次采集时文件替换，重读时稳定。
- **WHEN** 查询。
- **THEN** 使用完整的第二次结果，不混合两次文件内容；仍不宣称跨 worktree 原子一致。

### Requirement: R13 可发现的命令入口

发布入口 SHALL 引导用户或 AI 使用同一个 status CLI 并保留记录来源与验证边界。

#### Scenario: S26 跨 cwd 的实际命令调用
- **GIVEN** 插件与测试项目分离，用户要求查看状态，调用者取得 status 命令指引或插件提示入口。
- **WHEN** 真实 AI 调用者执行该请求。
- **THEN** 工具回执证明调用实际 status CLI；回复保留来源、读取问题及未重新验收说明，不自行读证据补成 PASS。

## 方案设计

### 结构与公共接口

| 文件 | 职责与依赖 |
|---|---|
| `scripts/status.mjs` | argv 校验、目标入口、选择文本/JSON、退出码；只依赖 status 库和 Node 内置模块。 |
| `scripts/lib/status.mjs` | worktree 发现、受限文件采集、规范化分组/差异、诊断及终端渲染。 |
| `scripts/lib/status-parse.mjs` | 纯文本解析 spec/roadmap/v1/v2/旧计划，返回数据或明确诊断。 |
| `commands/status.md` | 薄调用指引，按现有插件根单点解析绝对脚本路径。 |
| `.codex-plugin/plugin.json`、README 双语 | 新增状态查询提示与使用/格式边界说明，不宣称所有平台均加载 commands。 |

主公共 seam 是进程调用 `node <plugin>/scripts/status.mjs [--repo PATH] [--json]` 的 stdout/stderr/退出码及查询前后项目不变性。无需私有函数级覆盖率目标。可用现有 `parseUniqueJson`/`readNavigation` 等纯函数，但它们的不足由本项明确处理，不能因函数返回成功就宣称整个记录完整。不得导入顶层执行的 guardrail 或 validate-output，不改它们来增加导出。若 implementation 发现必须修改旧契约，回设计处理。

### 发现、身份与采集

1. 参数先严格校验，`--repo` 解析为绝对路径；支持工作区子目录。只读 Git 调用设置 `GIT_OPTIONAL_LOCKS=0`；不执行 fetch、checkout、worktree prune、status 的刷新写入或任何修复。
2. 从目标工作区查 common-dir 及 `git worktree list --porcelain -z`，安全解析含空格路径。对可访问来源核实 common-dir 相同；锁定标记不等于不可读，detached 可读。裸仓库或不能定位工作区返回 2；枚举运行失败返回 1 的结构化诊断。
3. 每个来源仅探测：`.spec-dev/roadmaps/*.md`、`.spec-dev/<特性>/spec/*-design.md`、`.spec-dev/<特性>/*-design.md`、`.spec-dev/<特性>/plan/{index.md,progress.yaml,*-plan.md}`。历史 docs 的日期特性目录按相同 spec/plan 布局读取；历史 `.specs/*.md` 只展示独立 spec，不猜测其计划位置。隐藏目录、reserved 容器目录（roadmaps/reports/explorations/adr）不当特性。候选特性需命中上述 spec 或 plan 文件之一，或存在正式位置的 plan/tasks/ 目录；tasks/ 单独存在也必须进入损坏计划诊断，不读取其正文补状态。
4. 非递归进入 acceptance/execution/tasks 正文；分文件任务文件只核对存在性，禁止用其中的步骤文本补状态。符号链接候选不跟随；候选间接父目录同样检查。读未提交/未跟踪的正式记录；不依赖 git ls-files 限定全部候选。
5. 原始路径作为身份：不把 docs 与 .spec-dev 的同名目录自动当同一特性，不按 spec.feature 合并。多个 spec 文件逐个保留。一个计划目录含多个旧计划或两种计划信号矛盾时诊断歧义，不任取一个。
6. 采集一次特性的相关文件集合，记录各文件采集前后 stat 身份/大小/mtime；发现变化或集合增删，丢弃该次特性采集并整体重读一次。仍变化标 unstable。worktree 中途消失同样是来源读取诊断；不因无锁而承诺检测所有同尺寸/同时间戳写入。

### 解析边界

- Frontmatter 只读取开头闭合块；正文代码块里的 metadata 不生效。支持现行模板标量、引号、注释及列表，spec/roadmap 使用各自根键；损坏候选保留入口及错误。合法 spec 状态为 draft/active/superseded；roadmap 为 active/done/superseded，子项目为 pending/in-progress/delivered/dropped。
- v1 支持模板所用的缩进块映射/序列、行内映射/序列、字符串（含单双引号及转义）、null、布尔、数字和行尾注释，也接受 JSON。解析整个对象才能接受记录；不实现 YAML anchor、alias、tag、多行标量等模板外语法，遇到它们明确报告 unsupported_syntax。未知非展示性的 v1 扩展字段可保留而不推断；未知 format_version 不能回退。
- v2 仅 JSON，拒绝重复键及现行协议未知字段；读取性结构检查覆盖任务、current、组引用和展示所需跨字段一致性，不检查真实提交/证据/锁。不消费 `inspectPlanState` 的 ready_tasks 或运行时结论。
- 分文件信号：tasks/ 存在或 index/progress 任一存在。缺少 index/progress/tasks 或引用任务文件时诊断；不降级去读旧计划。总数以合法导航表为准，任务 ID 唯一，状态键与导航一一对应；不完整时比例为 null。零任务导航视为无有效计划结构而不是 0/0 已完成。
- 旧格式：无分文件信号且恰有一个 `plan/*-plan.md`。识别代码围栏外的 `### 任务 N` / `### Task N` 任务标题，按区域收集正文 `- [ ]` / `- [x]` 步骤；全勾选、未全勾选、未知分别展示，不生成现代状态。支持整数编号（含 0）；重复编号和无复选框区域诊断。旧记录不与现代任务比例直接判等。
- Roadmap 读取「子项目」表的六列（编号、子项目、范围、依赖、状态、特性目录），识别 Markdown 链接与普通路径，代码围栏内示例表排除。目录占位 `—` 表示未建立，不算缺失；显式路径按文档既有根相对或 Markdown 链接的文件相对语义解析，悬空才诊断，不越出该 worktree。表格损坏时保留 roadmap metadata，子项目标不可解析。不同 roadmap 可关联同一特性，分别保留。

### 数据与展示

JSON 顶层固定：`schema_version: 1`、`verification: "not_performed"`、`repository`、`worktrees`、`roadmaps`、`features`、`diagnostics`、`summary`、`collected_at`。

- repository 记录请求路径、解析工作区及 common-dir；worktrees 项含 path、branch（detached 时 null）、head、读取状态。
- features 项含 `key`（原始特性相对路径）、`sources[]`、`divergence`；source 含 worktree、文件来源、spec 原始生命周期列表、plan 格式/任务/计数/current/组状态和关联 roadmap 行。未知字段使用 null 并带诊断，未建立的计划为 null 且无缺失诊断。
- roadmap 按相对文件路径归组并保留各 worktree 的 metadata/行记录，独立生命周期不混入 spec。
- 展示比较投影含：spec 生命周期、计划格式/任务 ID 与状态（旧格式为复选框统计）、current、组状态和关联 roadmap 状态。排除 notes/resources、文件排版、时间戳、SHA、HEAD、诊断展示文字。不可解析来源不参与“相同”判定，不以空值掩盖分歧。
- summary 区分特性组数与特性来源记录数；不对同组不同来源的完成票求和。终端单个来源的现代比例为 completed/导航总数；旧比例明确叫“全勾选任务/已识别任务”，未知时不显示可信比例。
- 所有源保留在 JSON；终端仅折叠比较投影相同者，列出全部来源。按规范相对路径、worktree 路径作 Unicode 码点排序，任务数字排序，诊断按来源/path/code 排序；不靠文件系统枚举顺序或本地 locale。终端转义控制字符，长路径可换行但不丢来源。
- 默认终端顺序：声明、仓库概览、roadmap、特性进度、诊断。无产物是合法空结果。`--json` stdout 仅一个 JSON；退出 1 同样保留完整 envelope。参数错误退出 2，stderr 用法与原因，不假装采集成功。诊断 code 至少区分 unreadable、missing、invalid_format、unsupported_version、unsupported_syntax、inconsistent、unstable、symlink_skipped；业务 blocked 和 divergence 不属于读取错误。

## 约束归属与拒绝的解读

| 已决定的边界 | 负责位置 | 验证 |
|---|---|---|
| 同仓库所有登记 worktree，而非仅 cwd | status 的发现层 | S01、S03、S04 |
| 展示记录，不重新批改/验收 | CLI 输出与调用指引 | S11、S21、S23、S26 |
| 来源保留，不择新或合成 | 分组与渲染 | S16—S19 |
| 正式产物而非任意同名文件 | 受限发现与采集 | S05、S06 |
| 旧格式读取，不写兼容迁移 | 解析器 | S09、S12—S15 |
| 一次性快照，不锁执行者 | 采集层 | S23—S25 |

用户已排除“每次查询进一步核验完成提交/合并/证据”的方案，原因是本项只需进度记录概览；不将此决定延伸成执行流程可以省验收。CLI 形态获选，网页和模型临时汇总只是本次未选方案，不登记为永久禁止。

## 测试与验收策略

实施遵循 TDD，测试公共查询行为，状态 helper 自测不代替 CLI。现有 Node node:test 与临时 Git 夹具足够，不安装空依赖或新增 typecheck。

| Scenario | Lane / 维度 | 执行方式与证据 |
|---|---|---|
| S08—S18、S20 的纯文本/投影部分 | fast / unit | 原始文本输入到规范化记录、诊断、排序；覆盖注释/引号/重复键/未知版本/围栏/旧格式；有效 RED→GREEN。 |
| S01—S25 全部公开行为 | PR / integration+CLI | 真实临时 Git 仓库、至少 3 个真实 worktree（含 detached）、真实文件，进程 stdout/stderr/exit；语法错误、空结果、入口分离和只读前后证据。 |
| S24—S25 | PR / integration | 声明的文件读取适配边界注入可控文件变化，跑完整收集行为；另以真实写者演练记录一致性边界，不用不稳定竞态当唯一 oracle。 |
| S26 | PR / AI 动作+独立判读 | 真正加载新增调用指引/提示入口，在分离插件/项目夹具上至少 3 例：正常多源、分歧+blocked、部分解析失败。每例有实际 CLI 回执、模型回答和独立结果判读；无回执不记通过，不以静态 prompt 测试代替。 |
| 全部 | PR / regression+review | 相关测试、插件/技能/metadata 校验及全库 node:test；独立审查新增状态语义、输入边界与既有守卫/执行能力是否保持。 |
| S26 多次模型 trial | nightly / 非阻塞 | 补充稳定性评估；未运行明确标 not_run，不替代上述 PR 三例。 |

测只读时对工作文件、index、refs、配置和 progress 做前后比对，并核对 Git 子命令白名单与无网络/测试/证据读取的实际调用轨迹；不以快照完全没改来单独证明没有网络。IO 轨迹边界允许注入文件读取、Git 进程与时钟，不替换状态解析/分组算法。

入口与调用指引声明的公共 seam 为 argv/stdout/stderr/exit；采集库为 `collectStatus(repoPath, io)`（异步返回上述模型），io 仅封装实际 FS/Git/时钟操作。纯解析与分组不需要虚构远端服务。CLI 真实集成始终使用真实 FS/Git，受控变化用同一 collectStatus，仅替换外部读取边界。

## 风险与实施线索

- 支持 v1 子集不能偷偷扩大为通用 YAML；不支持语法明确诊断。实现若发现现行合法模板无法覆盖，在设计 review 阶段处理，不以容错正则假绿。
- 跨 worktree 文件可能正在写，本方案有界重读而非事务快照；未发现变化不等于已经加锁一致。
- 历史计划的勾选可能陈旧，用户已选择记录展示；仍保留标识与来源，不读取 Git log 替用户修正。
- 大量源码/证据目录不进入扫描，工作量随正式产物与登记 worktree 数增长；本项未承诺未经实测的延迟 SLA。
- 现有 `scripts/lib/integration-plan.mjs` 有纯 parseUniqueJson/readNavigation，但 inspectPlanState 执行真实 Git/证据核验；`guardrail/check-spec-drift.mjs` 顶层直接运行并 process.exit，不能当库导入。
- 当前工作区曾发现 `.spec-dev/.../acceptance/.../.spec-dev/demo/plan/progress.yaml`，S05 必须保留实际形状的反例。
- 当前 commands/ 在 Codex 不作为加载入口，新增 defaultPrompt 及 README 的真实脚本用法；不新增 skill 清单项、不向用户项目复制脚本。

## 当前交付状态

用户已通过 spec review 并同意编写实施计划，现激活为 active；尚未实施、未运行产品测试。独立设计审查首轮发现两处问题，修订后增量复审 Approved；详见同目录 `design-review.md`。用户以 `ok` 批准 review 及编写计划，已交接 writing-plans；执行仍需后续明确指令。

### T00 基线修正

来源提交af57f444新增ddd-lifecycle后README目录表遗漏，来源main与隔离工作区同一计数测试均失败。本轮仅补双语目录条目以恢复既有检查，未改变该技能行为；原件见execution/serial/T00/source-counter与related。

### T01 实施记录

本票实现与验证回执位于 execution/serial/T01/；原失败保留，整体交付仍需T06与T07。

### T02 实施记录

本票实现与验证回执位于 execution/serial/T02/；原失败保留，整体交付仍需T06与T07。

### T03 实施记录

本票实现与验证回执位于 execution/serial/T03/；原失败保留，整体交付仍需T06与T07。

### T04 实施记录

本票实现与验证回执位于 execution/serial/T04/；原失败保留，整体交付仍需T06与T07。

### T05 实施记录

本票实现与验证回执位于 execution/serial/T05/；原失败保留，整体交付仍需T06与T07。

### T06 边界修复记录

独立A/B/S审查及独立反驳确认三项同范围缺陷：旧任务区域未结束、worktree中途消失未诊断、补充平面字符未按码点排序。新增公共CLI/collectStatus反例先红，修复后33项相关测试通过；仍待复审与统一最终验收，不改变R06/R02/R12/R09合同。证据见acceptance/reviews/disposition.json和execution/serial/T06/review-boundaries-*。

T06另补现有行为保护：重读后的生命周期与任务状态来自同一第二批文件、v2拒绝未知字段与非JSON；首次即绿，不伪造RED。相关验证34/34，后续统一候选验收保留这些检查。

T06模型partial原例真实FAIL且经独立反驳确认：把不可读来源的未知状态总结为不存在。按原R07/R13补充CLI和commands中的“未知不等于没有”说明，不改变记录结构或验收阈值。对应机器红绿通过35项；新候选须完整重验三例，不能拼接旧候选normal/divergent的通过。

T06最终验收已闭合：全库215/215、machine-r3 25/25、统一候选model-r2三例独立PASS；critic确认无剩余阻断缺口，允许本地交付。证据与验证边界以acceptance/acceptance-report.md为准。
