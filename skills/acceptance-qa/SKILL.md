---
name: acceptance-qa
description: >-
  对功能、页面或接口做验收与故障诊断：按验收清单对照实际页面或行为，并排给出预期与实际结果，由用户判断；E2E、视觉、可访问性和性能专项按需执行。只在用户直接调用、或在执行计划的询问门选中后进行。不用于日常跑测试、开发中 TDD 或需求文档审查。
---

> 输出语言：用户显式指定优先，其次跟随近期对话，否则使用英语。报告沿对话语言，固定术语按契约。

> **外部搜索统一入口**：外部检索先加载 anysearch skill；不可用再用宿主自带的搜索工具。

> **宿主适配**：提问用宿主的提问工具，没有就发普通消息并停下等回复；有子代理能力才派发，没有就由主线程完成并注明；进度工具可用可不用，以落盘文件为准；需要其他 skill 时按名称加载，加载不到就读同级目录下的 `SKILL.md`。

# 验收与诊断

**入口只有两个**：用户直接调用本 skill，或执行计划收尾的询问门里用户选了代验。工作流的其他环节不得自行触发验收，也不得把范围扩大到用户没选的项。

**判断权在用户**。验收要回答"这是不是用户要的"，写代码的一方给自己打通过是弱证据。本 skill 的产出是清单、操作步骤、并排的预期与实际结果，由用户据此判断。

## 入口与范围

参数兼容 `[unit|integration|e2e|visual|a11y|perf-web|perf-api|diagnose|all] <目标>`。意图不清时按 clarifying 先问必要的一题，已有的决定不重问。

- 从询问门进入：范围就是用户选中的清单项。
- 直接调用：按 [验收清单](references/acceptance-checklist.md) 从 spec 的 Scenario 或用户描述生成清单，先给用户看，再执行。

| 性质 | 判据 |
|---|---|
| D 确定性 | 真实命令、退出码和业务断言 |
| A 实际操作 | 实际界面操作与可回看的证据，由模型做语义判读 |
| X 诊断 | 对失败提出可证伪的预测并实际验证 |

## 三条证据纪律

1. **不采信自述**。以实际命令、退出码、原始输出和截图为准。零测试、SKIP、工具保存成功都不算通过。
2. **证据要支持预期**。检查项四态 `pass | warn | fail | unverified`。已操作、元素可见、截图存在都不自动证明业务结果；能用确定性断言表达的用断言；没有证据只能记 unverified。
3. **缺口不变成通过**。缺工具、缺账号、缺环境的项记 unverified 并写明原因，不为了通过而缩小检查范围。根因只有假设验证一致后才确认。

## 第一步：核对依据

- **契约**。有 spec 时定位现行契约；`superseded` 的沿 `superseded_by` 跳转并记录，缺失或成环时报告缺口。没有 spec 时用用户确认的目标和原始场景。
- **页面依据**。取得定稿 HTML、确认来源、适用的角色、视口和状态，沿 [原型契约](../visual-preview/references/ui-prototype-contract.md)。没有原型（小改动、用户关闭预览）时用已确认的文字或既有界面，不在验收现场重新设计。
- **运行版本**。实际入口或 URL、候选提交、账号角色、数据条件。
- **清单覆盖**。核对清单是否覆盖关键入口、正常与失败结果、适用的权限状态；缺项先告诉用户，不擅自加跑。
- **已有结果**。实施期间的任务内测试结果可以直接引用。需要重新运行测试套件属于回归，先得到用户同意。

环境信息不足时才运行探测脚本：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/detect-env.mjs" --cwd <项目根>
```

`${CLAUDE_SKILL_DIR}` 是本 skill 的目录，宿主没有替换时取 skill 所在目录。输出含技术栈、各项目的框架、配置和目录；多项目仓库按各自的项目根执行，只处理选中检查需要的项目。

浏览器操作统一使用 ego-lite：先读取官方 `ego-browser` skill，执行 `ego-browser skill` 并完整读取当前版本指南，再按指南操作。接入与缺失处理见 [browser-setup.md](references/browser-setup.md)。缺工具、网络或账号时记 unverified，不假装执行成功，也不自动开启会写入外部业务的操作。

## 第二步：对照实际页面或行为

页面用与定稿 HTML 相同的角色、数据、操作和视口，逐项核对布局、组件、文案、导航、编辑与保存，以及适用的加载、空数据、错误、无权限状态。HTML 里模拟的保存、价格和权限结果，要另外核对真实的业务结果。

浏览器会话内串行操作，优先用确定性断言；结构、语义、视觉无法用断言表达的部分再判读快照或截图。每个检查至少有一条功能被破坏时会失败的业务断言，不能只凭元素可见判定业务成功。截图回归新建基准图只是建线，不替代与定稿的对照。

关键结论、弱证据、结果矛盾或不稳定的项做有界复核，细则见 [ai-acceptance.md](references/ai-acceptance.md)。

## 第三步：给出结果

每个检查项并排写出预期、实际（原始输出或截图）、状态和证据位置，不只报"通过"。

- 失败项先区分产品缺陷、测试前置、环境和级联失败。需要定位根因时按 [diagnose.md](references/diagnose.md) 提出预测并实际验证；证据不足就保留为候选，不猜根因。
- 修复不在本 skill 内进行。从询问门进入时把结果交回执行流程；直接调用时把发现交给用户决定。
- 报告用 [acceptance-report.md](templates/acceptance-report.md)。执行计划时落在特性目录的 `acceptance/acceptance-report.md`，直接调用可以只在对话里输出；范围小就用简短结果。
- 截图、trace 等原件放特性目录的 `acceptance/` 下，不提交进 Git。
- 只清理自己创建的测试数据和资源；共享实例不做破坏性操作。

整体结论：有 fail 即失败；有 warn 或 unverified 即未完成；用户没选的项如实写"未执行"。

## 专项能力

- unit、integration、API：[unit-integration.md](references/unit-integration.md)。
- E2E：[e2e-patterns.md](references/e2e-patterns.md)。
- visual、a11y：[visual-a11y.md](references/visual-a11y.md)。
- perf-web、perf-api：[performance.md](references/performance.md)，先有预算数字，多次采样取中位数。
- diagnose：[diagnose.md](references/diagnose.md)，只处理实际失败或明确的诊断请求。

对生产或共享环境压测、任何会写入外部系统的操作，都要用户另行授权。

## 环境兼容

各宿主都通过官方 `ego-browser` skill 使用 ego-lite，API 以 `ego-browser skill` 的完整输出为准，不套用 Playwright API 或旧的 MCP 工具名。同一目标复用一个 TaskSpace，浏览器操作始终串行。需要独立判断时用实际可用的独立执行者；没有就由主线程复核并声明非独立。
