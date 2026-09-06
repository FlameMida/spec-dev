# 公共测试落点与红绿纪律实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境从任务 0 起按序执行。任务状态只由 `plan/progress.yaml` 跟踪；任务步骤不以复选框跟踪。携带本计划时连同特性目录整体带走。
>
> **偏差处理**：路径笔误等意图明确的小偏差就地修正并记录；接口、行为或验收等级变化停下确认，不猜着修改。普通“继续”不启动并发。

**目标**：让获批公共测试落点沿设计、计划与串并行执行传递，统一红绿/纯重构、mock 和快检纪律。

**Spec**：[tdd-seam-design.md](../spec/tdd-seam-design.md)（active）；审查 [design-review.md](../spec/design-review.md) Approved，用户已确认。roadmap skill-ecosystem-absorption 第 3/8 项。

**架构**：沿现有定义点和四列任务接口传播 seam；TDD 负责执行与例外，testing-anti-patterns 负责准入，test-strategy 负责策略。执行入口引用；五步、结果 schema 与唯一进度不变。

**技术栈**：Markdown、JSON/YAML、现有 Node.js 测试和 CLI，Git worktree；计划内的 Python 3 仅用于精确编辑和验收夹具，无新依赖、无 runner。

**设计原则**：不留兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策。历史计划读取按既有契约，不是新增兼容实现。

## 文件结构与职责

| 文件组 | 职责 | 任务 |
|---|---|---|
| TDD SKILL/openai、quick-fix SKILL/openai、anti-patterns 旧循环句、plugin-root 存量断言 | 落点/红绿/纯重构/例外单点，并迁移旧断言 | T01 |
| testing-anti-patterns、test-strategy SKILL/openai | 反模式 6/7、四类依赖与静态快检 | T02 |
| RA SKILL/openai/spec-template、writing-plans SKILL/openai | 在已有批准门、四列导航及接口块传递 seam | T03 |
| executing-plans/parallel SKILL/openai、implementer、code-reviewer、review-orchestration | 消费与阻塞路径、重构收尾 | T04 |
| 各相关 evals/evals.json | 24 个具名 Scenario 作为独立输入/预期，保留旧案例 | T01-T04 |
| execution/serial、acceptance | 静态/自动/真实模型证据，互不冒充 | T01-T05 |
| spec、旧 portability spec、roadmap、progress | 交付时部分取代与锚定 | T06 |

## 全局约束

- 默认串行；任务共享 TDD/quick-fix 等文件且有明确依赖，本计划不生成可选并发声明，不用待交付规则调度自身。
- TDD、quick-fix 和所有 modified skill 的中文语言/description 保留；每次修改 SKILL 同暂存有语义更新的 openai.yaml。trigger 不变，不为本项改 trigger-evals 或 vendored 同步器。
- 任务的静态 eval 先于指令修改，旧规则差异→新规则匹配按已批准 spec 记录；它不是模型行为红绿。S24 存量 Node 断言必须观察真实失败与通过。
- 获批纯文案可追溯复用授权，但本项是技能行为变化，执行全矩阵；纯重构保绿不可充当普通并发票的 red。
- 接口/进度/结果 schema 不变；不新增 ADR、seam 注册表、工具依赖或模型 runner。ADR-0005/0006/0007 保持。
- PR Lane 真实模型五例冒烟是必需项；模型不可用即 blocked/unverified，不能改成静态“通过”。nightly 多轮非阻塞。
- 主工作区不实施；每条实施命令的 cwd 为 T00 核验后的绝对 worktree。shell 命令用 RTK 前缀。
- 本地交付，不 push；普通实施提交走既有发版钩子；spec/plan/进度/报告提交带 SKIP_RELEASE_HOOK=1，不改变钩子机制。

## 相关测试范围

配置查证：根 package.json 无依赖、scripts 或 typecheck；无需 npm install 或新建锁文件。按影响面声明 T00 基线：

```bash
rtk proxy node --test scripts/tests/plugin-root.test.mjs scripts/tests/plan-single-format.test.mjs scripts/tests/parallel-plan.test.mjs scripts/tests/parallel-integration.test.mjs scripts/tests/plan-index.test.mjs scripts/tests/search-clause.test.mjs
rtk proxy node scripts/validate-skills.mjs
rtk proxy node scripts/check-plugin.mjs
```

命令失效记录并回退现存完整 Node 套件；真实失败按基线纪律报告，不以零测试/skip 放行。最终全量不受该范围约束。编辑批次快检为现有 validate-skills/check-plugin；没有 typecheck，标注不适用。

## 提交与漂移

- 所有实施步只应用本票内的精确替换块，不执行其他任务正文；Python 块通过 `rtk proxy python3 - <<'PY'` 执行，收尾行写 `PY`。每个锚点唯一存在才写；保留未命中的内容。
- 暂存后先运行 `rtk proxy node guardrail/check-spec-drift.mjs --staged`，保存输出与退出码。技能行为变化须同步本 spec 的实施记录；其余 active covers 如仅因分面共存命中，逐一对照本 spec「取代与共存」列明文件、旧 Requirement 和未变切面。不将预期守卫拦截记 PASS。
- 对已批准的分面共存、以及已声明的纯文案例外部分取代，按既有合法提交机制用单次 `SPEC_DEV_GUARD=off` 环境及 `Spec-Guard: off` trailer 记录范围/理由；不全局关闭守卫。新发现未声明的契约变化必须停下。
- 提交正文写临时文件（置 execution/serial 并及时归档或删除），命令用 `--file`，不把多行文本拼接到 shell。模板完整语义如下，逐票填入实际触及的交集，不写无关项：
  - Spec: .spec-dev/2026-09-06-02-tdd-seam/spec/tdd-seam-design.md
  - Spec-Guard: off tdd-seam 已批准切面：TDD/公共落点/快检；所列旧 spec 的资源、取代时序、四列接口、五步、schema 和集成完成判据保持；portability 例外条款已 pending，由 T06 完成交付回写。
- 提交前包/skill/openai/diff 检查都仍执行，不用跳过包验证。post-commit 可能 amend/version/tag，读取最终 HEAD 后原子更新 progress；不能把未验证或仍运行的任务标 completed。
- progress.notes 保留最初 base_commit、来源路径/分支、各检查状态及证据；状态提交与文档提交跳过发版。tests 字段用事实摘要，STATIC_MATCH、自动测试、模型冒烟分别说明。

## 任务导航表

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 隔离与基线 | — | 已提交 spec/plan，来源 main | 已核验 worktree、原始 base_commit、相关基线 |
| T01 统一 TDD 落点、红绿与例外定义 | T00 | T00 已核验的隔离工作区；spec 的已批准 seam/红绿/纯重构/例外契约 | test-driven-development：获批 seam 消费、行为红绿/纯重构保绿分流、例外单点；quick-fix 引用 |
| T02 补齐反模式、mock 分层与静态快检策略 | T01 | T01：test-driven-development 的 seam 消费、红绿/纯重构路径与例外单点 | testing-anti-patterns：反模式 6/7 与 mock 准入；test-strategy：四类依赖策略与静态快检 |
| T03 在设计与计划接口中传递获批 seam | T01-T02 | T01：seam 公共边界定义；T02：mock 准入、四类策略与静态快检规则 | spec 测试策略 → 四列导航与本票接口：接口签名、Scenario、依赖替换边界、来源；快检命令及配置依据 |
| T04 贯通串并行消费与收尾审查 | T01-T03 | T03：spec/四列导航/本票接口的 seam、Scenario、依赖替换边界和来源；T01/T02 的验证纪律 | 串行/implementer 同源消费，缺失/冲突 blocked；原收尾接收重构候选并按公共行为审查覆盖 |
| T05 验收与真实模型冒烟 | T01-T04 | 四票产物、24 Scenario、候选 skill 与原始 base | 静态矩阵、自动回归、五例真实模型、全局审查与对账 |
| T06 本地交付与清理 | T05 | 已通过的必需验收、资源台账、取代映射 | 实际合并与 sync_commit、旧条款取代、roadmap delivered |

## 计划检查记录

Self-Review 四查于计划生成后执行：覆盖 13 Requirement/24 Scenario；无未填内容；定义点与任务输入一致；七票与导航一一对应。实际检查：plan-index ok；54 个替换锚点顺序内存模拟通过，24 个新增 eval ID 唯一且与 24 个矩阵行对应；12 个 Python 块与拟修改 Node 测试语法有效；27 个计划修改路径均在 spec covers 内。以上没有写入业务文件，也不表示模型验收或实现已通过。

计划中五步和原收尾仍按当前 skill 执行；本 spec 已批准的静态指令验证与纯重构保绿是明确任务约束，不因尚未发布的旧缓存措辞制造假失败测试。
