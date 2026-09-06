# 审查符合性实施计划

> **执行方式**：使用 spec-dev 的 executing-plans 从任务 0 起逐任务执行；无该 skill 时按同等步骤执行至最终任务。任务状态仅由 plan/progress.yaml 跟踪，任务正文不使用复选框。携带计划时连同特性目录与 spec 整体带走。
>
> **偏差处理**：意图明确的路径笔误就地修正并记录；接口、契约与验收等级变化停止猜测，交用户裁决。

**目标**：为共享收尾增加 S 符合性审查，并以单点判据、派发要求和证据覆盖形成可追溯闭环。

**Spec**：[review-conformance-design.md](../spec/review-conformance-design.md)，active；用户已 review 并批准编写计划，激活提交 `43122c0`。roadmap skill-ecosystem-absorption 第 4/8 项。

**架构**：design-principles 定义判据，reviewer 定义 S/D 输出，exploration-patterns 定义通用派发，review-orchestration 唯一决定路数和收口；串并行引用。不新增调度器、schema 字段或 agent。

**技术栈**：Markdown、JSON/YAML、现有 Node CLI/测试、Python 3 精确编辑、Git、现有 Claude CLI 或可提供同等实证的平台工具；无新依赖。

**设计原则**：不留兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策。共享模块判据在 T01 交付后消费；不以未验收的新编排调度本计划自己的收尾。

## 文件结构与职责

| 文件组 | 职责 | 任务 |
|---|---|---|
| design-principles、RA/WP SKILL+openai、spec-reviewer-prompt、RA/WP eval | 判据与上游消费 | T01 |
| code-reviewer、review-findings schema、schemas README、review-findings.test、EP eval | S/D 角色及 CLI 契约 | T02 |
| exploration-patterns、RA SKILL+openai+eval | 完成条件与排除项 | T03 |
| review-orchestration、EP SKILL+openai+eval、parallel eval、README 双语 | 编排唯一入口及分发 | T04 |
| execution/serial、acceptance | 原始验证与模型证据 | T00-T05 |
| spec、roadmap、progress | 交付对账与锚定 | T06 |

## 全局约束

- 默认串行；共享文件有顺序依赖，本计划无并发声明。普通继续不授权写码 implementer。
- 所有实施命令在 T00 核实的隔离 worktree 内，shell 始终用 rtk；主工作区只做计划、合并与交付记录。
- 中文 description/语言协议保持，修改 SKILL 同暂存语义同步的 openai.yaml；不修改无关默认提示或元数据，不动 vendored 同步器。
- 已批准 seam：真实 validate-output CLI 的 exit/JSON（S19-S21）；加载候选规则后的派发/报告行为（其余 Scenario），来源 spec 测试策略。真实文件/Git/LLM IO 均属 PR/nightly。
- 每条 Scenario 有预先固定的输入与期望。静态缺规则、模型行为失败、机器测试失败分开记录；静态匹配不能充当模型红绿。若旧模型已通过某例，记录已有行为，不人为制造红或宣称修复；需要有效红的行为更改先取得相关失败证据。
- T01-T04 的无工具决策探针不证明实际派发、文件访问或写权限下自律；T05 五组使用真实夹具与工具记录补足动作证据。模型 API 失败/超时/权限拒绝不是有效行为红。
- PR 五组核心冒烟必需，nightly 完整多轮非阻塞；未运行和 SKIP 不能记 PASS；不无界重试直到绿。
- TDD 公共行为覆盖、纯重构保护、原始 base、每票/最终全量时序和 ADR-0005/0006/0007 不变。无 spec 取代回写。
- 本地交付，不 push；产品提交走现有自动发版，文档/状态提交 SKIP_RELEASE_HOOK=1。post-commit 可能 amend，状态记录使用实际最终 HEAD。

## 相关测试范围

package.json 没有 dependencies、scripts 或 typecheck；不运行 npm install、不创建锁文件。T00 跑现存范围：

```bash
rtk proxy node --test scripts/tests/plugin-root.test.mjs scripts/tests/plan-single-format.test.mjs scripts/tests/plan-index.test.mjs scripts/tests/parallel-plan.test.mjs scripts/tests/search-clause.test.mjs scripts/tests/validate-keywords.test.mjs
rtk proxy node scripts/validate-skills.mjs
rtk proxy node scripts/check-plugin.mjs
```

T02 起加 `rtk proxy node --test scripts/tests/review-findings.test.mjs`。编辑批次静态快检使用现有 validate-skills/check-plugin，typecheck 不适用。命令失效须声明并回退完整现存 Node 套件；真实基线失败按既有纪律裁决，不以零测试/skip 放行。最终全量为 `rtk proxy node --test scripts/tests/*.test.mjs`，仍在收尾。

## 编辑、证据与提交纪律

- 每票内 Python 代码通过 `rtk proxy python3 - <<'PY'` 执行，结束行 `PY`；写前检查唯一锚点，漂移不得强行覆盖。只执行本票代码，不读取其他任务正文。
- 修改产品前保存本票旧规则/候选输入/模型结果；每次调用使用独立证据名，不覆盖失败。模型实际 ID 从 init/result 提取，未知标未知，版本号不能替代候选路径与 SHA-256。
- progress 是唯一状态源，主线程整文件原子替换；current/任务状态、原始 base、实际提交、证据及资源在本票提交或随后状态提交中保存。
- 暂存后 `rtk proxy node guardrail/check-spec-drift.mjs --staged`；产品行为与本 spec 同步留实施记录。共存命中按 spec 八份共存清单逐项说明，只在已经批准的分面范围内用单次 `SPEC_DEV_GUARD=off` 和 `Spec-Guard: off` trailer，不全局禁用守卫，不把预期拦截报 PASS。
- 用结构化提交消息文件和 `git commit --file`；保存 Spec 指针及实际命中的旧契约未变说明。pre-commit 的插件、技能、openai、diff 检查不跳过。

## 任务导航表

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 隔离工作区与相关基线 | — | 已提交 spec/plan，main 来源 | 已核实 worktree、原始 base_commit、相关基线 |
| T01 共享模块判据与上游消费 | T00 | 已核实 worktree、原始 base_commit、相关基线 | design-principles 模块判据；RA/计划/spec-reviewer 指针消费；S08-S10/S27 |
| T02 S/D 审查契约与 schema | T00-T01 | design-principles 模块判据；RA/计划/spec-reviewer 指针消费；S08-S10/S27 | review-findings 新类别 Spec符合性；description/coverage_note 语义；CLI exit/JSON；S01-S05/S13/S19-S21 |
| T03 通用派发完成条件 | T00-T02 | review-findings 新类别 Spec符合性；description/coverage_note 语义；CLI exit/JSON；S01-S05/S13/S19-S21 | exploration-patterns 完成条件/排除项单点；保留时效和重试；S24-S25 |
| T04 统一收尾编排与分发说明 | T00-T03 | exploration-patterns 完成条件/排除项单点；保留时效和重试；S24-S25 | 统一一路/四路/五路及 D 条件覆盖；S/critic/复核收口；剩余 Scenario 与并发继承 |
| T05 全局审查与真实模型验收 | T00-T04 | 统一一路/四路/五路及 D 条件覆盖；S/critic/复核收口；剩余 Scenario 与并发继承 | 28 Scenario 对照、PR 五组真实证据、独立审查和交付对账 |
| T06 本地交付、清理与锚定 | T00-T05 | 28 Scenario 对照、PR 五组真实证据、独立审查和交付对账 | 实际合并、资源清理、sync_commit 与 roadmap delivered |

## 计划检查记录

主线程已完成四查：12 Requirement 均落在 T01-T04 与 T05 收尾，28 个唯一 Scenario 全部有固定 GIVEN/WHEN/THEN eval/测试输入并映射至 spec 的 PR/nightly 矩阵；任务接口与七行导航一致，无实施占位内容。引用的既有技能模板内含示意占位符，属于精确替换所需的原文，不是本计划待填内容。

实际检查：plan-index ok；21 个唯一替换锚点按任务顺序在内存中应用通过，20 个产品路径均在 spec covers 中；16 个 Python 块与新增 Node 测试/夹具 JavaScript 语法有效；20 个真实 Git 夹具的构造代码完整。没有运行这些实施或模型调用代码，没有创建实施 worktree。机器 schema 红绿、真实 Git 行为与模型行为仍待执行，不能从上述语法和结构检查推断 PASS。

自检修正：保留既有 plugin-root 回归要求的失败隔离/契约校验 gist；采用六反引号围栏避免内嵌 Markdown 截断 Python；补全批准变更、缺代码、测试证据缺口、同根因与迟到候选的具体夹具；报告目录与被审仓库分开，保留原始输入/源码/diff 以供交付后复核。
