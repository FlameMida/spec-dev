# 收尾审查编排（阶段 4）

> **阅读时机**：executing-plans 的实施票全部完成后。串并行使用本文件唯一的维度、路数和收口规则。每个编排动作前用一句话说明进度。

## 输入预检

主线程在扇出前从原执行记录核实 base、HEAD、完整 diff、计划入口（index.md 或存量单文件）、关联 spec 和批准变更来源。基线必须属于当前特性；保留 `git diff <base>...HEAD` 范围表达与变更文件清单。固定已核实的审查范围，代码变化则说明新范围并复审受影响维度，不混用前后证据。

错误 ref、不可读 diff、计划显式关联但丢失的 spec 先查记录恢复，无法可靠恢复则说明阻塞，不猜用 HEAD 或其他文件。无 spec 的历史计划可使用其已批准任务/验收标准并声明来源边界；连批准依据也无法恢复时不能做 S 结论。空 diff 明示无代码变更，跳过无效代码扇出，仍按已有实现/证据做必要覆盖核对与交付对账，不自动全部 DELIVERED。

## 维度与路数

- **A 功能正确性**：逻辑、边界、竞态、资源与错误处理；独立复跑相关测试，不采信自报告。
- **B 代码质量**：命名、可读性、复杂度、DRY、抽象与公共行为测试覆盖；共享判据引用 writing-plans/references/design-principles.md。
- **C 项目规范**：项目约定、已有工具、架构与抽象边界、接口及依赖组织。
- **S 实现符合性**：核对现行契约的少做、多做、语义偏离。具体引用及报告要求见 agents/code-reviewer.md 的 S 定义；不把必要内部辅助函数当未批准行为。
- **D 架构深化**：仅用户明确要求或本次变更有具体结构摩擦证据时追加，主线程记录触发依据与范围；使用 design-principles「模块判据」与摩擦五问。大 diff 或重构候选存在本身不触发 D。reviewer 只分析与复跑；建议走既有候选与授权处置。

| 规模 | 派发覆盖 |
|---|---|
| 小 diff（<100 行） | 一路明确覆盖 A+S，兼查 B/C 显著问题 |
| 常规 | 四路 A/B/C/S |
| 大变更或用户要求彻底/全面/审计 | 五路 A/B质量/B简洁性/C/S；C 保留整体职责 |
| D 已触发 | 在相应安排外追加一路 D |

路数表只统计维度审查，独立反驳和 completeness critic 另计；它们同样占用平台实际并发容量。资源允许时同一响应扇出全部选定路；不足时告知并分批完成同一集合，不丢维度、不把待启动当完成。大变更无统一行数阈值，主线程按风险面和模块影响声明档位及理由；“彻底”明确进五路，但不自动触发 D。

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
  高/中候选各做独立反驳，成立者才记 confirmed
  同根因只保留一条处置记录，保留所有来源与 S 契约依据
```

不得把同行不同根因误合并；S 原始报告使用 `Spec符合性`，合并处置项可保留已有主类别但不能丢契约依据。报告按现行严重性/置信度规则筛选；schema 通过不保证引用真实，主线程核实语义证据。

每份报告执行：

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" review-findings <file>
```

校验失败发回补全一次，再失败主线程接管（定义见 exploration-patterns「输出契约与校验」）；降级也按该单点规则，不静默跳过。失败先缩小范围重试 1 次，再失败主线程接管（定义见 exploration-patterns「派发要求与失败隔离」）；接管以维度为单位，缩小的是批次，总覆盖不缩减，缺口保留可见。

## completeness critic

维度审查之后由一个 critic 对照变更文件/风险面、现行 Requirement/Scenario、各路 coverage_note、测试/验收证据核查覆盖。被 Superseded 标注的条款及 Scenario 排除。已审且零发现、实际未覆盖、明确截断分开记录：没有 finding 不等于未审，审查已覆盖也不证明测试已覆盖。

S 负责判定实现偏差，critic 负责发现覆盖证据缺口。后者交主线程有界补查；产生高/中实现候选时仍独立反驳并按授权处置，不能直接当 confirmed，也不无限重启整套扇出。未完成的补查、复核、测试证据或截断显式保留为未完成，不因 confirmed 为零就进入无缺口交付。

收尾输入同时包含实施期重构候选（位置、理由、保护证据）；候选自身不另造审查轴，D 按上面的条件触发。覆盖依据是获批 seam 的公共行为和现行 Scenario，不是新增函数数量。

## acceptance-qa 联动与处置

计划有验收任务，或 spec 矩阵含「验收任务」行时，在维度审查之外触发 acceptance-qa；输入 spec、计划验收任务、完整变更文件清单与特性 acceptance 证据目录。裁剪记 coverage_note，Tier A 沿现行 GIVEN/WHEN/THEN，失败自动追加诊断；旧计划无矩阵时，涉及 UI 按其验收点触发。验收及 Requirement 覆盖结论并入报告。

报告按严重性列 confirmed，包含 file:line、描述、影响、建议，合并 critic 覆盖声明与验收结果。沿 executing-plans 既有授权和例外驱动处置门：行为缺陷先复现失败测试；纯重构按 TDD「收尾纯重构」保留前后绿，缺保护先刻画，不造红。修复后受影响维度复审一次。零 confirmed 但有未完成覆盖不等于全交付；最终全量保留原计划时机。

## Codex 降级

spawn_agent/wait_agent 及上下文参数沿 requirement-analysis/references/codex-compat.md；按平台实际容量分批，不硬编码上限。对抗复核可用一个独立 critic 顺序反驳高/中候选，保持独立性。插件根占位符按 exploration-patterns「插件根解析」解析后代入上述双引号命令；不静默跳过校验。

## 并发分支的审查输入

executing-plans-parallel 全票集成后使用本文件完整编排，输入最初 base_commit 到当前集成 HEAD 的完整 diff、spec、progress、research 与 execution 指针。串行切换不把 base 换成切换检查点；implementer 自检不抵销任何审查维度、completeness critic、矩阵验收或最终全量。本地/PR 完成判据继续见 delivery-channels.md。
