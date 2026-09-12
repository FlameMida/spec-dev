# 收尾审查编排（阶段 4）

> **阅读时机**：executing-plans 的实施票全部完成后。串并行使用本文件唯一的维度、路数和收口规则。每个编排动作前用一句话说明进度。

## 受控运行入口

需要程序核验证据和收尾时，使用插件内 `scripts/review-runner.py`。此入口在 macOS/Linux 依赖 Python 3.9+、本机已认证 Claude CLI、Node 和 Git；本仓库命令经 rtk。其他客户端可继续下文原生编排，但不能声称具有受控运行器的证据写入隔离与状态保证。维度、D依据、相关测试命令及原始范围由主线程在预检后固定，不能让运行器替代这些语义裁决。

配置JSON包含 `repo`（被审仓库绝对路径）、`base`、`head`、`spec`、`plan`（后两者是仓库相对路径）、`tier`（small/regular/large）、`capacity`（本次实际worker容量）、`tests`（如 `[{"id":"related","argv":["rtk","proxy","node","--test","test/cart.test.js"]}]`）、`critic`（`on-findings` 默认 / `always`；large 档默认 `always`）、`evidence`（可选，execution 回执数组，元素 `{task,phase,command,exit_code,stdout_sha256,stderr_sha256}`；提供时 `tests` 可为空数组）。可选 `d_request` 为真实结构摩擦的 `{file,line,quote}` 引用数组；`model`/`effort` 仅沿用户既有选择，省略时继承本机默认。运行目录必须在被审仓库之外，scope需对应干净HEAD。使用：

```bash
rtk proxy python3 "${CLAUDE_PLUGIN_ROOT}/scripts/review-runner.py" init --config review-config.json --run /absolute/review-run
rtk proxy python3 "${CLAUDE_PLUGIN_ROOT}/scripts/review-runner.py" run --run /absolute/review-run
rtk proxy python3 "${CLAUDE_PLUGIN_ROOT}/scripts/review-runner.py" status --run /absolute/review-run
```

worker只拥有内嵌stdio提供的context/read_source/run_test/submit_report，无任意Bash/Write/Agent。程序固定执行者和测试定义，原始证据按内容哈希保存，报告引用真实ID；tests 非空时 A/AS 仍须亲自请求测试；tests 为空且提供 evidence 时以该回执为证据。受控入口只对逐成员现行Scenario集合非空且相同、并有独立因果说明的重复候选执行合并；不同Scenario或无Scenario的质量候选保守分列，保留全部来源，不把同一行或一次编辑当同因。程序核查引用原文、实际进程回执、独立反驳依赖、critic覆盖依据及最终未完成项；所有维度的语义判断、严重性与同根因因果仍由独立审查承担。

一次run调用默认且最多1800秒（30分钟），可用`--budget-seconds`指定更短预算；中断保留未完成，最多允许3个显式片段。入口不设置Claude CLI费用上限；时间上限独立生效。沿同一目录重新run仅继续未完成任务，已完成不重跑；候选规则、控制器或被审快照变化须新run，不把后继成功拼回旧运行。先前测试已开始而无完整回执则不自动复跑。`completed`仅表示审查链闭合；`review_result`、confirmed、observations及原始测试退出码分别决定后续修复，不能当代码交付PASS。超过预算、未复核新候选或覆盖缺口必须保留incomplete/blocked，不自动无限重启。

本入口保留本机认证、设置和hooks，信任宿主扩展与获批测试代码；受控工具不是OS沙箱。实际worker工具清单不符则中止。原生入口与受控入口均遵守下列语义判据，受控入口由程序完成机械校验和派发，不要求worker重复这些步骤。

大工具结果通过同一受控 `context({resource,cursor})` 接口分页；模型读完全部页后才形成完整上下文依据，无须读取客户端转存路径。完成回执绑定原始stdout/stderr哈希；测试预算统一服从宿主执行片段，不另设隐含的短超时。

初审各维度仅消费共同事实及自身已封存回执，避免后启动的初审跟随他人结论；D另外取得有来源的结构触发范围。反驳与critic读取实际依赖报告和所引用的测试，补查同时读取原维度报告与critic缺口。分页送达记录绑定当前worker进程，恢复须重新读取；错误响应也分页。需要删除的越界代码，其假设保留后的测试或文档缺口不另算当前独立问题。

## 输入预检

主线程在扇出前从原执行记录核实 base、HEAD、完整 diff、计划入口（index.md 或存量单文件）、关联 spec 和批准变更来源。基线必须属于当前特性；保留 `git diff <base>...HEAD` 范围表达与变更文件清单。固定已核实的审查范围，代码变化则说明新范围并复审受影响维度，不混用前后证据。

错误 ref、不可读 diff、计划显式关联但丢失的 spec 先查记录恢复，无法可靠恢复则说明阻塞，不猜用 HEAD 或其他文件。无 spec 的历史计划可使用其已批准任务/验收标准并声明来源边界；连批准依据也无法恢复时不能做 S 结论。空 diff 明示无代码变更，跳过无效代码扇出，仍按已有实现/证据做必要覆盖核对与交付对账，不自动全部 DELIVERED。

## 维度与路数

- **A 功能正确性**：逻辑、边界、竞态、资源与错误处理；以特性目录 execution/ 下 facts.json 记录的命令、退出码、stdout/stderr sha256 为测试证据；回执缺失、退出码非零或未覆盖本次变更文件时才复跑，并说明复跑原因。
- **B 代码质量**：命名、可读性、复杂度、DRY、抽象与公共行为测试覆盖；共享判据引用 writing-plans/references/design-principles.md。
- **C 项目规范**：项目约定、已有工具、架构与抽象边界、接口及依赖组织。
- **S 实现符合性**：核对现行契约的少做、多做、语义偏离。具体引用及报告要求见 agents/code-reviewer.md 的 S 定义；不把必要内部辅助函数当未批准行为。
- **D 架构深化**：仅用户明确要求或本次变更有具体结构摩擦证据时追加，主线程记录触发依据与范围；使用 design-principles「模块判据」与摩擦五问。大 diff 或重构候选存在本身不触发 D。reviewer 只分析与复跑；建议走既有候选与授权处置。

| 规模 | 派发覆盖 |
|---|---|
| 小 diff（<100 行） | 一路 AS：A 与 S 合并，兼查 B/C 显著问题 |
| 常规 | 两路 AS + BC（B 与 C 合并） |
| 大变更或用户要求彻底/全面/审计 | 五路 A/B质量/B简洁性/C/S |
| D 已触发 | 在相应安排外追加一路 D |

路数表只统计维度审查，独立反驳和 completeness critic 另计；它们同样占用平台实际并发容量。资源允许时同一响应扇出全部选定路；不足时告知并分批完成同一集合，不丢维度、不把待启动当完成。大变更无统一行数阈值，主线程按风险面和模块影响声明档位及理由；“彻底”明确进五路，但不自动触发 D。小档的 <100 行按完整 diff 计数，不能先剔除注释、机械修改或“无行为变化”再降为小档；超过该阈值至少保留常规两路。已给定大变更档时保留五路，内容机械也不缩减维度。

规模档位与 D 条件分开判断：小变更也可能需要追加 D。将本次实际 diff 及 reviewer 报告中的结构证据纳入触发核对；已有消费者依赖内部表示等具体泄漏证据时，记录位置与受影响边界并实际追加 D，不能一边承认该证据、一边宣称“无结构摩擦”。尚未核查的部分记未知；仅有机械行数或优化设想仍不触发 D。

## 派发与复核

每路携带固定范围、聚焦维度、输出契约及证据路径、计划/spec 指针、完成条件和排除项；通用要求沿 requirement-analysis/references/exploration-patterns.md「完成条件与排除项」与时效规则。S 使用现行 Requirement/Scenario、任务及批准变更，逐条排除 Superseded 项；只给必要摘要和锚点，不复制全篇。

```text
selected = 按上表确定全部维度
seen = 已见候选（含被反驳否决者）
confirmed = []
repeat 最多 2 轮:
  按实际容量派出 selected 的全部维度，均只分析与复跑
  每份报告一返回就校验，可先进入复核，不无故等齐
  fresh = 按 file:line+category 索引，再核对跨维度同根因
  无 fresh 则结束；否决候选也记 seen，避免反复出现
  无高/中候选（首轮即空）→ 不派反驳、不派 critic，直接收口
  高/中候选各做独立反驳，成立者才记 confirmed
  同根因只保留一条处置记录，保留所有来源与 S 契约依据
```

去重前做因果核对：修复其中一项是否会同时消除另一项？若不会，保留独立处置；同一源码位置、同一提交或相似标签都不证明同根因。去重只是候选整理，不等于已确认。不得把同行不同根因误合并；S 原始报告使用 `Spec符合性`，合并处置项可保留已有主类别但不能丢契约依据。报告按现行严重性/置信度规则筛选；schema 通过不保证引用真实，主线程核实语义证据。

每份报告执行：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" review-findings <file>
```

高/中候选的独立反驳必须由独立于候选提出者的 reviewer 实际执行，主线程自查及仅负责覆盖检查的 critic 不能代替。处置记录保留可追溯的派发、复核回执及证据指针；收到独立结果并核实成立后才能记入 confirmed。未派发、无回执或未完成时保留待复核，不能仅用文字宣称“已独立反驳”。此要求同样适用于 critic 或覆盖补查新提出的候选。

校验失败发回补全一次，再失败主线程接管（定义见 exploration-patterns「输出契约与校验」）；降级也按该单点规则，不静默跳过。失败先缩小范围重试 1 次，再失败主线程接管（定义见 exploration-patterns「派发要求与失败隔离」）；接管以维度为单位，缩小的是批次，总覆盖不缩减，缺口保留可见。

## completeness critic

存在高/中候选、大变更档或用户要求彻底时，维度审查之后派发一个独立 critic 并收取回执；小 diff 与常规档零候选时不派 critic，由 AS 路逐条 Scenario 的 coverage_note 充当覆盖声明；派发时主线程自行填写覆盖总结不替代该动作，缺派发或回执时收尾仍未完成。critic 对照变更文件/风险面、现行 Requirement/Scenario、各路 coverage_note、测试/验收证据核查覆盖。被 Superseded 标注的条款及 Scenario 排除。已审且零发现、实际未覆盖、明确截断分开记录：没有 finding 不等于未审，审查已覆盖也不证明测试已覆盖。

Scenario 覆盖以实际核查该行为的记录和证据为准；共享文件、函数或源码位置，不意味着各 Scenario 均已审查。后续补查可以补齐缺口，但不能倒推前次已经覆盖，或把前次如实声明的未覆盖判为失实。报告区分原报告缺口与本次补查结果。

S 负责判定实现偏差，critic 负责发现覆盖证据缺口。后者交主线程有界补查；产生高/中实现候选时仍独立反驳并按授权处置，不能直接当 confirmed，也不无限重启整套扇出。未完成的补查、复核、测试证据或截断显式保留为未完成，不因 confirmed 为零就进入无缺口交付。

收尾输入同时包含实施期重构候选（位置、理由、保护证据）；候选自身不另造审查轴，D 按上面的条件触发。覆盖依据是获批 seam 的公共行为和现行 Scenario，不是新增函数数量。

## acceptance-qa 联动与处置

计划有验收任务，或 spec 矩阵含「验收任务」行时，在维度审查之外触发 acceptance-qa；输入 spec、计划验收任务、完整变更文件清单与特性 acceptance 证据目录。裁剪记 coverage_note，Tier A 沿现行 GIVEN/WHEN/THEN，失败自动追加诊断；旧计划无矩阵时，涉及 UI 按其验收点触发。验收及 Requirement 覆盖结论并入报告。

报告按严重性列 confirmed，包含 file:line、描述、影响、建议，合并 critic 覆盖声明与验收结果。沿 executing-plans 既有授权和例外驱动处置门：行为缺陷先复现失败测试；纯重构按 TDD「收尾纯重构」保留前后绿，缺保护先刻画，不造红。修复后受影响维度复审一次。零 confirmed 但有未完成覆盖不等于全交付；最终全量保留原计划时机。

## Codex 降级

spawn_agent/wait_agent 及上下文参数沿 requirement-analysis/references/codex-compat.md；按平台实际容量分批，不硬编码上限。对抗复核可用一个独立 critic 顺序反驳高/中候选，保持独立性。插件根占位符按 exploration-patterns「插件根解析」解析后代入上述双引号命令；不静默跳过校验。

## 并发分支的审查输入

executing-plans-parallel 全票集成后使用本文件完整编排，输入最初 base_commit 到当前集成 HEAD 的完整 diff、spec、progress、research 与 execution 指针。串行切换不把 base 换成切换检查点；implementer 自检不抵销任何审查维度、completeness critic、矩阵验收或最终全量。本地/PR 完成判据继续见 delivery-channels.md。
