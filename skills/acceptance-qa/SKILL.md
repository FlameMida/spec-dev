---
name: acceptance-qa
description: >-
  对功能、页面或接口执行验收与故障诊断。页面默认核对定稿 HTML 和运行版本、对照实际布局交互及状态、复用业务证据并补验缺口；后端按行为契约，E2E、视觉、可访问性和性能专项按需执行。不用于日常跑测试、开发中 TDD 或需求文档审查。
---

> 输出语言：用户显式指定优先，其次跟随近期对话，否则使用英语。报告沿对话语言，固定术语按契约。

> **插件根**：`${CLAUDE_PLUGIN_ROOT}`——本 skill 正文与其 references 中的插件根命令以此为准；若上式仍为变量字面量（平台未替换），按 requirement-analysis 的 references/exploration-patterns.md「插件根解析」序列推导。
> **外部搜索统一入口**：外部检索先用 anysearch；不可用按同一 exploration-patterns 的降级规则。

# 验收与缺口补验

页面默认只有三步：**核对依据与证据 → 对照实际页面 → 补验缺口并给结论**。单测、API、数据库和完整回归由实施/最终验证阶段承担；当前有效原件直接复用。纯后端沿行为契约，明确的专项请求直接进入对应细则，不为每次页面验收遍历全部工具。

## 入口与执行性质

参数兼容 `[unit|integration|e2e|visual|a11y|perf-web|perf-api|diagnose|all] <目标>`。页面/功能验收使用三步路径；明确的 E2E 编写、视觉回归、性能、诊断按对应维度进入。意图不明确时按 clarifying 先问必要目标；已有决定不重问。

| 性质 | 判据 |
|---|---|
| D 确定性 | 真实命令、退出码和业务断言 |
| A AI 自主 | 实际界面操作与可回看证据，模型负责语义判读 |
| X 诊断 | 对失败提出可证伪预测并实际验证 |

D/A/X、unit/e2e/visual 等维度、fast/final/manual 时机与 required 必需程度是不同字段，不重新解释。矩阵与来源见 [acceptance-matrix.md](references/acceptance-matrix.md)，验证时机及复验范围沿 [test-strategy](../test-strategy/references/verification-scope.md)。

## 三条证据纪律

1. **不采信无回执的自报告**：核对真实 execution record 与 stdout/stderr、命令、退出码、范围和候选；旧 facts.json 也核原件。工具保存成功的 exit0 不等于测试通过，零测试/SKIP 不计通过。
2. **证据须支持预期**：检查项四态 `pass | warn | fail | unverified`。已操作、元素可见、截图文件存在均不自动证明业务结果。确定性断言能表达的事用实际断言；无证据只能 unverified。
3. **缺口不能变成整体通过**：矩阵必需项 fail 阻塞；warn/unverified/manual-pending 保持未完成。延期/放弃沿用户明确决定记录，不自行改为 optional。根因只有实际假设验证一致后才确认。

## 第一步：核对依据与证据

工作流输入包含 spec、验收任务、当前候选/实际运行版本、完整变更范围、有效 F 回执和证据目录；UI 另外取得定稿 HTML、确认来源、适用角色/视口/状态与模拟边界，沿 [原型契约](../visual-preview/references/ui-prototype-contract.md)。核对原型和文字契约是否一致，缺依据时澄清受影响事项，不在验收现场自行重设计。

存在相关 spec 时定位当前 active 契约；superseded 沿 superseded_by 跳转并记录链，缺失/环报告具体缺口。只排除明确 Superseded 的条款；取代进行中保留未完成事实。没有 spec 时从用户确认的目标和原始场景形成小型清单，不把机械的 3-6 条当覆盖保证。

先核对清单是否覆盖关键用户入口、正常与失败结果及适用权限状态。矩阵每个现行 Scenario 至少一行；用户看到页面的角色/状态必须有对应证据。缺项先补入检查范围，不能只审计已有 pass。按影响裁剪需声明理由和保留必需链路，不单凭文件未改就排除共享入口。

把已有证据分为仍适用、已失效、缺失；旧回执按实际版本/范围核验。首次 final 在独立 F 执行，验收不无条件追加全量；局部独立验收尚未到期的 final 标待执行，不能宣称计划验收完成。manual 消费已有明确执行授权和实际条件，条件不齐记 manual-pending。

环境信息不足或确有缺口时才运行：

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/acceptance-qa/scripts/detect-env.mjs" --cwd <项目根>
```

输出含 stacks、projects 和各项目的框架/配置/目录。Go 根加 web 前端按各自 project_root 执行，不在仓库根误装一套工具；suggestions 只处置选中检查需要的项目。浏览器操作统一使用 ego-lite：先读取官方 `ego-browser` skill，执行 `ego-browser skill` 并完整读取当前版本指南，再按指南操作。接入与缺失处理见 [browser-setup.md](references/browser-setup.md)；缺工具/网络/账号标 unverified，不能假装执行成功或自动开启外部业务写入。项目已有 Playwright Test/CLI 等确定性测试继续复用，不作为页面操作的前置依赖。

持久资源沿 [资源台账总则](../writing-plans/references/plan-format.md#资源台账总则)：可隔离则复用并只登记自建隔离单元，无法确认隔离才建自有实例；共享实例不做破坏性操作。计划内登记 progress.resources，独立验收对话记账并在报告保留清理去向。

## 第二步：对照实际页面或行为契约

页面使用定稿 HTML 与实际应用的相同角色、数据、操作和视口，逐个核对约定布局、组件、文案、导航、编辑/保存以及适用的加载/空数据/错误/无权限状态。HTML 中模拟的保存、价格和权限结果另外核对真实业务证据；已有有效结果直接引用，没有才补真实闭环。用户关闭预览/小修改无原型时，以已确认文字和既有界面契约为依据，不虚构原型批准。

浏览器会话内串行操作，优先用当前工具实际提供的确定性断言；结构/语义/视觉无法表达的部分再判读快照或截图。测试至少有一条功能破坏会失败的业务断言，禁止仅凭元素可见判定业务成功。截图回归新建基线只是建线，不替代定稿对照。

关键结论、弱证据、结果矛盾或不稳定项进行有界复核；需要独立判断时只交对应原件和预期给审计者。已解决的覆盖缺口和稳定结果不机械整套复跑。编排细则见 [ai-acceptance.md](references/ai-acceptance.md)。

## 第三步：补验缺口并给结论

只补失效/缺失的证据，范围沿 test-strategy；先区分产品缺陷、helper/fixture、环境与级联失败。局部修复不自动重跑无关完整套件；新影响才扩大验证。发现失败才按 [diagnose.md](references/diagnose.md) 提出预测并实际验证；证据不足保留候选，不猜根因。

报告使用 [acceptance-report.md](templates/acceptance-report.md)：依据与运行版本、实际差异、复用/新增证据、剩余缺口、必需项结论。有 spec 时逐 Scenario 对照；executing-plans 主线程填写 Requirement 对账。报告完成不代表验收通过，必需行缺失不得整体 DELIVERED；经用户批准的 DEFERRED/DROPPED/SUPERSEDED 分别记录。

结构化检查记录包含 check、dimension、tier、ops、expected、observed、required、result、evidence_ref；有证据时记录 evidence_sha256。工具回执/快照落为实际原件，evidence_ref 为相对 JSON 或绝对文件路径；recheck 同样保存其原件与哈希。

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" acceptance-check-items <检查记录.json>
```

校验检查结构、非空项、证据文件和 SHA-256；reported_result 汇总必需行的自报告状态。`ok:true` 与 `evidence_verified:true` 不证明原件支持结论、来源真实、清单完整或运行版本正确，`semantic_review_required:true` 必须由上述核对完成。校验失败补全一次，再失败将缺失项标记 unverified 并说明（acceptance-qa 变体；通用规则见 exploration-patterns「输出契约与校验」），不能为了格式转绿而填假证据。历史报告原样保留，新产物使用现行契约。

工作流触发时报告/原件落特性 acceptance/ 并回传路径；直接触发可对话输出。小修用简短结果，不强制整套 JSON/大型报告。acceptance/ 除 acceptance-report.md 外不进 Git，原件仍按台账保留/转存。

## 按需专项能力与档位

- unit/integration/API：[unit-integration.md](references/unit-integration.md)，核验/复用真实回执，缺口才执行。
- E2E：[e2e-patterns.md](references/e2e-patterns.md)，沿既有工具与业务断言；healer 修改断言/skip 后不能直接算通过。
- visual/a11y：[visual-a11y.md](references/visual-a11y.md)，原型对照、截图回归和自动扫描各自有边界。
- perf-web/perf-api：[performance.md](references/performance.md)，明确预算，多次采样取中位数，沿执行授权。
- diagnose：[diagnose.md](references/diagnose.md)，只处理实际失败或明确诊断请求。

light/standard 默认采用上述三步和风险复核；deep 扩大适用状态与独立证据审计，仍复用有效证据。档位不能降低必需程度，全面验收也不自动授权外部写入。任何裁剪、缺件、降级和未执行项进入 coverage_note；不得靠缩检查范围取得通过。

## 环境兼容

各宿主均通过官方 `ego-browser` skill 使用 ego-lite，API 以 `ego-browser skill` 的完整输出为准，不套用 Playwright API 或旧 MCP 工具名。能用真实断言时优先；没有对应能力明确记录缺口。需要独立证据审计时用实际可用的独立执行者，不继承原结论；不可用则主线程复核并声明非独立。同一目标复用一个 TaskSpace，浏览器操作始终串行，证据审计只读原件。真实模型评估与静态/工具测试分开记账。
