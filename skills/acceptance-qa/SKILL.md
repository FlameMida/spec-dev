---
name: acceptance-qa
description: >-
  All-round acceptance workflow - multi-dimension acceptance over the dimension x execution-nature matrix: unit/integration/API regression, E2E, visual regression, accessibility, performance (web CWV/Lighthouse, k6 load, client), plus AI autonomous acceptance and failure diagnosis. For acceptance-flavored requests (accept a feature/page/endpoint, E2E, load test, visual regression) or executing-plans wrap-up; also diagnoses page interaction, rendering, performance, Shadow DOM/iframe issues. Not for TDD red-green cycles, routine test runs, static code review, or doc review. / 全能验收工作流——按「验收维度 × 执行性质」矩阵对交付物做多维验收：单元/集成/API 回归、 E2E 端到端、视觉回归、可访问性、性能验收（前端 CWV/Lighthouse、后端 k6 压测、客户端）， 外加 AI 自主验收与失败诊断。当用户要求"验收这个功能/页面/接口"、"E2E 测试"、 "acceptance test"、"性能测试/压测/能扛多少 QPS"、"视觉回归"、"界面/浏览器测试"， 或 executing-plans 收尾按验收矩阵触发时使用；也用于诊断页面交互、渲染、性能、 Shadow DOM/iframe 问题。不适用于开发中的 TDD 红绿循环（用 test-driven-development）、 无验收语义的日常"跑一下测试/修测试"、代码静态审查、需求文档评审。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

# 全能验收工作流（acceptance-qa）

参数格式：`[<维度>...|all] <target-description>`（维度前缀可选：`unit|integration|e2e|visual|a11y|perf-web|perf-api|diagnose`；自然语言触发时按意图推断）。

## 心智模型：验收维度 × 执行性质

每个验收项都落在一个**维度**（验收什么）和一种**执行性质**（怎么得出结论）上：

| 执行性质 | 定义 | 结论来源 |
|---------|------|---------|
| **D 确定性** | 真实命令 + 精确断言，零 LLM 判断，每次运行结果相同 | 退出码与断言输出 |
| **A AI 自主** | Agent 经 MCP 驱动真实界面/设备探索验收 | 证据（快照/截图/trace）+ 判读 |
| **X 诊断** | 对失败项追根因 | 经假设验证的根因链 |

| 维度 | Tier D 工具 | Tier A 兜底 | 细则 |
|------|------------|-------------|------|
| unit 单元 | 项目测试框架 + 覆盖率门槛 | — | [unit-integration.md](references/unit-integration.md) |
| integration 集成/API | 测试框架、Playwright request、schema 断言 | — | [unit-integration.md](references/unit-integration.md) |
| e2e 端到端 | Playwright 原生代码（PW Test Agents 按需） | MCP 探索式流程验收 | [e2e-patterns.md](references/e2e-patterns.md) / [ai-acceptance.md](references/ai-acceptance.md) |
| visual 视觉 | `toHaveScreenshot` 截图回归 | AI 视觉判读（限界内） | [visual-a11y.md](references/visual-a11y.md) |
| a11y 可访问性 | AxeBuilder（WCAG A/AA）、lighthouse_audit | 键盘走查 | [visual-a11y.md](references/visual-a11y.md) |
| perf-web 前端性能 | CWV lab 数据（trace/LHCI）对阈值 | — | [performance.md](references/performance.md) |
| perf-api 后端性能 | k6 thresholds（失败即非零退出码） | — | [performance.md](references/performance.md) |

桌面客户端（Electron/Tauri）与移动端不是独立维度，而是 e2e/visual/perf 维度的**运行环境修饰**——适配方式见各维度细则与 [mcp-setup.md](references/mcp-setup.md)。

### 四条铁律

1. **能确定性验收的绝不交给 AI 判断**——脚本能断言的事不用 LLM 判读；Tier A 只兜"脚本测不了的语义与体验"。
2. **无证据不给结论**——AI 层结果只有四态：`✅ 通过`（有证据且经审计）、`⚠️ 警告`、`❌ 阻塞`（均有证据）、`未验证`（无证据/证据不支撑/未执行）。无证据的 ✅ 比没有报告更有害。
3. **根因必须经假设验证才能写入报告**——按"若根因成立，做 X 应观察到 Y"实际验证一次，不一致则重新分类诊断。
4. **不采信实施者自报告**——验收结论只能来自本次执行产生的退出码、输出与证据；"实施时已经测过"不是验收依据。

## 参数解析（三级：显式前缀 > 意图推断 > 询问）

解析 `$ARGUMENTS`：

1. **显式前缀**：`unit|integration|e2e|visual|a11y|perf-web|perf-api|diagnose|all <描述>` → 按指定维度执行（兼容老用法：`layer1`→e2e(D)、`layer2`→e2e(A)、`layer3`→diagnose）
2. **无前缀 → 意图推断**：
   - "补充/编写 E2E、回归测试" → e2e(D)
   - "验收/检查/看看这个页面|功能" → e2e(A) + visual(A)（发现失败自动追加诊断）
   - "压测/负载/能扛多少 QPS/RPS" → perf-api
   - "首屏/加载慢/性能分/卡不卡" → perf-web（交互卡顿类失败转诊断）
   - "视觉回归/UI 长得对不对/样式炸没炸" → visual
   - "无障碍/可访问性/a11y/键盘可用" → a11y
   - "诊断/排查/为什么…不工作" → diagnose
   - "全面验收/完整验收/彻底测试" → 按验收矩阵全维度（无矩阵则装配，见阶段 0）
3. **意图模糊**（如只给一个 URL、无动词）→ 询问验收目标与期望维度

## 阶段 0：验收上下文装配

验收范围由**验收矩阵**（哪些检查项 × 哪个维度 × 哪种性质 × 什么证据）决定，按触发方装配：

| 触发方 | 矩阵来源 |
|--------|---------|
| executing-plans 收尾（或其他工作流） | 读特性目录 spec 的「测试与验收策略」矩阵 + 计划「验收任务」的验收点，按本次变更面裁剪；报告与证据落盘特性目录 `acceptance/` 子目录并回传路径 |
| 用户直接触发且存在相关特性目录 | 定位对应 spec（`.spec-dev/YYYY-MM-DD-<feature>/spec/`；仍在历史位置 `docs/` 的先自动迁移到 `.spec-dev/`——有 `scripts/spec-dev/migrate-to-spec-dev.mjs` 则运行之，否则 `git mv` 等效迁移），沿用其矩阵；用户描述可收窄范围 |
| 独立触发（无 spec） | 从目标描述**现场生成迷你矩阵**（维度选择 + 每维度 3-6 条检查项），随报告前置呈现 |

矩阵结构、Scenario→检查项的映射规则、与 writing-plans「验收任务」的分工见 [acceptance-matrix.md](references/acceptance-matrix.md)。**维度取舍原则**：矩阵行来自需求实际形态——纯后端接口不硬凑 visual 行，静态页面不硬凑 perf-api 行；被裁掉的维度在报告 `coverage_note` 中声明。

## 阶段 1：环境检测

**脚本优先**（一次输出全部文件系统可判定项）：

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/acceptance-qa/scripts/detect-env.mjs [--cwd <project>]
```

（`${CLAUDE_PLUGIN_ROOT}` 不可用时，先定位插件安装目录再以其为根解析路径。）

输出 JSON 含 `stacks`（node/python/go/rust/java）、`test_frameworks`、`e2e_framework`、`coverage_config`、`perf_tools`、`visual_baseline`、`suggestions`，按 `suggestions` 逐条处置后进入执行。脚本不可用时手工检测同等项。

**MCP 就绪**（脚本无法探测，会话内确认）：`playwright` MCP（Tier A 必需）、`chrome-devtools` MCP（perf-web 与诊断推荐）。未连接 → [mcp-setup.md](references/mcp-setup.md) 排查；不可用时的降级见各维度细则。

**缺件处置**：所需工具缺失时——可静默安装的项目内 devDependency（如 `@playwright/test`、`@axe-core/playwright`）征得同意后安装；全局工具（如 k6）给出安装命令请用户执行；无法补齐 → 该维度标记 `unverified`（原因：环境缺件）而不是跳过不提。**不要运行交互式向导**（如 `npm init playwright@latest`），改用非交互序列（细则见各 reference）。

## 阶段 2：Tier D 确定性验收

按矩阵选中的维度依次执行（维度间无依赖，产物互不影响；同一测试进程内的并行由各框架自身管理）：

1. **unit / integration**：运行项目测试套件与覆盖率检查。**范围规则**——验收本次交付时先跑「本次变更涉及的测试」再跑全量，报告中区分「本次新增失败」与「既有失败」；覆盖率只在项目已配置门槛或矩阵有要求时断言。
2. **e2e**：无既有用例则生成（模板 [templates/e2e-test.ts](templates/e2e-test.ts)、模式与选择器纪律见 [e2e-patterns.md](references/e2e-patterns.md)），只运行本次生成/涉及的文件：`npx playwright test <文件> --reporter=list`。每条用例至少一个会因功能破坏而失败的业务断言，禁止仅断言元素可见。
3. **visual**：有基线 → 跑截图对比；无基线 → 生成基线并声明"本次为建线，不构成回归结论"。
4. **a11y**：AxeBuilder `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])` 扫描目标页，violations 为空即通过；无法自动化的项（焦点顺序合理性等）转 Tier A 或标注人工项。
5. **perf-web / perf-api**：按 [performance.md](references/performance.md) 的阈值纪律执行——先明确预算（矩阵/项目配置/CWV 默认阈值），多次采样取中位数，报告附原始数字。

每个维度记录：执行命令、退出码、关键输出摘录、产物路径。**失败项 → 标记为诊断候选**，不在本阶段猜原因。

## 阶段 3：Tier A AI 自主验收

**前提**：playwright MCP 已连接、目标应用可访问。**全程串行——单浏览器会话是硬约束，并行驱动会互相破坏状态。**

流程骨架（完整编排伪代码、对抗复核与证据审计细则见 [ai-acceptance.md](references/ai-acceptance.md)）：

```
checklist = 矩阵中 Tier A 行（无矩阵：两段式生成——定制项 3-6 条 + 适用通用项）
for item in checklist:   # 串行
    执行 item.ops（navigate / click / fill_form ...）
    断言优先用 browser_verify_* 工具（element_visible/text_visible/list_visible/value）
    取证：verify 结果 + browser_snapshot 关键片段 或 截图文件名
    无证据 → 只能记 unverified

落盘 acceptance-check-items 契约 JSON → validate-output.mjs 校验 → 失败按 errors 补全一次
fail/warn 项 → 以"不信任原结论"视角重执行复核（第二份证据）
pass 项   → 独立子代理证据审计（只读证据不占浏览器，试图反驳每个 pass）
复核/审计结论回写 items[].recheck 并重新校验
```

`browser_verify_*` 是确定性断言原语——**能用 verify 工具判定的检查项不允许用"看快照感觉没问题"替代**；verify 无法表达的（布局观感、文案语义、交互流畅性）才落快照/截图判读。AI 视觉判读的可靠边界见 [visual-a11y.md](references/visual-a11y.md)。

## 阶段 4：Tier X 诊断

**触发**：阶段 2/3 存在失败项，或用户直接要求诊断。仅对失败项执行。

| 失败类别 | 诊断工具 | 细则 |
|---------|---------|------|
| 渲染/布局 | playwright MCP 快照与截图对比；Shadow DOM/iframe 穿透 | [diagnose.md](references/diagnose.md) |
| 前端性能 | chrome-devtools MCP：`performance_start_trace` → insight（LCPBreakdown 等）；`emulate` CPU/网络节流复现 | [performance.md](references/performance.md) |
| 内存泄漏 | chrome-devtools MCP 堆快照对比（take/compare_heapsnapshots） | [diagnose.md](references/diagnose.md) |
| 网络/接口 | `list_network_requests` 瀑布 + 后端日志对照 | [diagnose.md](references/diagnose.md) |
| 逻辑/状态 | MCP 交互复现 + 源码分析 | [diagnose.md](references/diagnose.md) |
| 后端性能 | k6 结果分层（p95 分布、错误率拐点）+ 服务端指标 | [performance.md](references/performance.md) |

根因遵循铁律 3：预测 → 验证 → 一致才写报告；验证不一致回到分类重来。

## 阶段 5：汇总报告

结构（模板 [templates/acceptance-report.md](templates/acceptance-report.md)）：

1. **总览矩阵**：维度 × {通过/失败/警告/未验证} 计数 + 每维度执行方式（D/A）与耗时
2. **Requirement 覆盖对照**（有 spec 时）：矩阵每行的最终状态；未覆盖行显式列出
3. **关键发现**：按严重性排序，标注来源维度与诊断根因（如有）
4. **证据索引**：契约 JSON 路径、测试文件、截图/trace/报告产物清单
5. **coverage_note**：被裁剪的维度、未验证项及原因——截断必须显式声明

**输出约定**：由 executing-plans（或其他工作流）触发 → 报告+证据落盘调用方指定目录（默认特性目录 `acceptance/`）并回传路径；直接面向用户 → 对话输出，产物路径附后。

## 执行档位（对齐上游 light/standard/deep）

- **light**：矩阵仅 1-2 个维度、Tier A 清单 ≤4 条、跳过 pass 审计（在 coverage_note 声明）
- **standard**（默认）：按矩阵执行、全套复核与审计
- **deep**（用户说"彻底/全面/审计"）：全维度 + Tier A 清单扩展 + pass 项抽 2 条重执行复核 + 性能多轮采样

## 不要做的事

- **不要用 MCP/LLM 跑确定性测试**——Tier D 必须是真实框架命令，断言精确匹配（铁律 1）
- **不要并行驱动浏览器**——Tier A 的检查与重执行复核全部串行（证据审计子代理只读已落盘证据，可并行发起）
- **不要在 CI 中跑 Tier A**——AI 验收消耗 token 且非确定性，仅手动/工作流触发；进 CI 的是 Tier D 产物（测试文件、k6 脚本、LHCI 配置）
- **不要把性能单次采样当结论**——lab 数据必须多次采样取中位数（细则见 performance.md）
- **不要静默缩范围**——裁剪维度、跳过检查项、降档执行都必须写进 coverage_note
- **不要让 healer 自动改断言后直接计入通过**——Playwright Test Agents 的 healer 结论（含改 locator/skip）须经确认才算验收结果（见 e2e-patterns.md）

## 灵活调整

- 非 Node 技术栈：unit/integration 用对应框架（pytest/go test/cargo test 等，见 unit-integration.md）；e2e 可适配 Cypress 等既有框架，无则默认 Playwright
- 用户只要快速验收：跳过 Tier D 直接 Tier A（在 coverage_note 声明）
- 全部通过：诊断自动跳过
- 移动端目标：Tier A 经 mobile-mcp（按需接入，见 mcp-setup.md）；无设备环境则声明不可验收

## 执行环境兼容性（Codex）

本 skill 两平台通用，Codex 环境按以下映射降级：

- **子代理**：pass 项证据审计的"独立子代理"用 `spawn_agent` 派发（审计者不应继承主会话立场，不继承上下文：`fork_turns: "none"`；参数的新旧版本兼容见 requirement-analysis 的 codex-compat.md），`wait_agent` 收集；子代理能力不可用时降级为主进程以"不信任原结论"视角自行复审，并在 coverage_note 声明
- **MCP**：playwright / chrome-devtools 随插件清单自动生效；未生效时按 [mcp-setup.md](references/mcp-setup.md) 的 Codex 配置路径（`config.toml [mcp_servers]`）接入
- **沙箱网络**：Codex workspace-write 沙箱**默认禁网**——依赖网络的步骤（npx 临时拉包、访问非本地 URL、k6 打远端、Lighthouse 拉外部资源）会失败。处置：请用户为会话开启网络或在沙箱外执行该步骤；无法放行时相关维度标记 `unverified`（原因：沙箱禁网），不要静默跳过
- **进度与提问**：任务管理用 `update_plan`；意图模糊时的询问用对话消息（一次一个问题）

## 参考资料

- 验收矩阵与上下游集成契约: [references/acceptance-matrix.md](references/acceptance-matrix.md)
- 单元/集成/API: [references/unit-integration.md](references/unit-integration.md)
- E2E 模式与 Playwright Test Agents: [references/e2e-patterns.md](references/e2e-patterns.md)
- 视觉回归与可访问性: [references/visual-a11y.md](references/visual-a11y.md)
- 性能验收（CWV/Lighthouse/k6/客户端）: [references/performance.md](references/performance.md)
- AI 自主验收编排: [references/ai-acceptance.md](references/ai-acceptance.md)
- 诊断手册: [references/diagnose.md](references/diagnose.md)
- MCP 配置: [references/mcp-setup.md](references/mcp-setup.md)
