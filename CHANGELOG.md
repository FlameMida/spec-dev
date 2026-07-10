# 更新日志

本项目的所有重要更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [7.5.0] - 2026-07-10

### ✨ 新增 (Added)

- **visual-preview**：确认发送后新增常驻状态条，明示需回终端 agent 才读取选择
- **T11**：脚本 console 文案 English / 中文 双语拼接
- **T10**：播种 snippet 双语并列 + session-context 双语输出
- **T9**：guardrail README 双版同构互跳
- **T8**：README.md 英文化 + 双版互跳
- **T7**：新增 README.zh-CN.md（现中文 README 迁移 + 互跳行）
- **T6**：trigger-evals 增补英文触发正负样例
- **T5**：产物模板双语指引 + 报告模板结构英文化
- **T4**：插件清单 descriptions 中英双语化
- **T1+T3**：语言协议块内联 8 个 SKILL.md + 触发描述中英拼接（openai.yaml 同步；T1/T3 合并提交：SKILL.md 两处改动不可文件级分离，rtk add 失效返工所致）
- **T2**：agent 语言条款 + agents/command descriptions 中英拼接

### 🔧 修复 (Fixed)

- **review**：check-spec-drift 拦截文案双语化（补 spec 影响面第 3 个 guardrail 脚本）+ README 双版目录树补 zh-CN 条目

### 📝 文档 (Docs)

- 勾选计划 T0-T11 复选框（统一勾选，避免逐任务噪音提交）
- 中英双语适配实施计划（12 任务 + 验收 + 合并收尾）


## [7.4.2] - 2026-07-10

### 📝 文档 (Docs)

- spec 修订——acceptance-qa 纳入 evals 回归范围、验收维度超枚举声明、话术清单与模板路径校准


## [7.4.1] - 2026-07-10

### 📝 文档 (Docs)

- spec-dev 中英双语适配设计 + ADR-0001 指令保持中文内联语言协议


## [7.4.0] - 2026-07-10

### ✨ 新增 (Added)

- evals 定位降格为设计意图文档，trigger-evals 可判定格式推广至 requirement-analysis 与 exploring（覆盖双向互斥边界），visual-preview eval id 前缀修正
- 守护脚本补强——guardrail 守卫前置注入防 exit 旁路，openai.yaml 同步 tripwire 挂入 pre-commit，8 个 openai.yaml 补负向触发边界，check-mcp 覆盖全部 4 个 MCP 与三级配置来源
- 契约闭环——agent 定义内嵌 JSON 契约模式与 context7 工具声明，spec 漂移守卫锚点写入与激活指令，校验器支持 minLength/if-then，pass 必须有非空证据

### 🔧 修复 (Fixed)

- 小修集合——stop-server /tmp 守卫 realpath 归一（兼容 macOS /private/tmp）、start-server 死代码清理、helper.js wss 自适应、venv 竞态防护、模板 Page 导入与 k6 占位符防呆、脚本路径占位符统一、子代理措辞校准、mermaid vendor 版本 pin、fork 参数说明单源化
- 发版链路加固——amend 免重复校验、先校验后写盘+失败回滚、JSON 定点写版本、auto 护栏（分支/rebase/暂存/tag）、codex 校验超时、pre-push 远端 tag 冲突检查

### 📝 文档 (Docs)

- 修正 README 安装命令 marketplace 名称，目录树补全 git hooks 与 release 脚本


## [7.3.0] - 2026-07-10

### ✨ 新增 (Added)

- guardrail 本地强制力升级——版本化 git hooks、Stop 收尾审计、Spec-Guard trailer 放行


## [7.2.0] - 2026-07-10

### ✨ 新增 (Added)

- visual-preview 内置 Mermaid 图示、交互闭环与呈现升级


## [7.1.0] - 2026-07-10

### ✨ 新增 (Added)

- 提交后自动发布，post-commit 钩子自动升版本、更新 CHANGELOG 并打 tag
- 增加发布机制，release 脚本自动更新 CHANGELOG 并打版本 tag，pre-push 钩子兜底校验

### 🔧 修复 (Fixed)

- release 脚本同步 .codex-plugin 版本号，自动版本级别按上个 tag 以来全部提交推断

### ♻️ 重构 (Changed)

- 仓库结构扁平化，插件内容提升至仓库根目录


## [7.0.1] - 2026-07-10

### 🔧 修复 (Fixed) — Codex 兼容性描述对齐 openai/codex 源码

对全项目的 Codex 支持做了一次源码核实（比对 openai/codex 最新源码），修正若干会导致 Codex 环境实际失效或误导的技术描述。**均为文档/提示词层修正，不涉及行为变更，Claude Code 侧不受影响。**

- **web 搜索工具名纠错**——`codex-compat.md`、`requirement-analysis/SKILL.md` 中把 Codex 网页搜索写成 `web.search_query` / `open`（实为 ChatGPT 内部接口，Codex 无此工具），改为"内置 web 搜索（托管 `web_search` 工具）"；并补沙箱禁网时降级为 `rg` + 本地阅读的路径
- **hooks 事件名统一为 PascalCase**——散文中的 `preToolUse` 既非 hooks.json 文件格式也非协议格式，统一改为 `PreToolUse`（check-spec-drift.mjs 注释、guardrail README、session-context.mjs、AGENTS/CLAUDE snippet、spec-template.md、codex-hooks.json description 共 8 处）。**澄清**：`.codex/hooks.json` 模板本身的大写 key 一直正确（源码 `HookEventsToml` 的 serde rename 即 `"PreToolUse"`/`"SessionStart"`），错的只是散文写法——此前 7.0.0 guardrail 条目"HookEventName 含 preToolUse"的表述是误读
- **Codex MCP 配置澄清**——Codex 不读取项目级 `.mcp.json`；插件场景经清单 `mcpServers` 字段自动生效，手工配置须写入 `~/.codex/config.toml` 的 `[mcp_servers]` 表或用 `codex mcp add`（README、acceptance-qa/mcp-setup.md 同步）
- **spawn_agent 上下文继承参数分版本**——写死的 `fork_context=true/false` 改为版本自适应：新版多代理工具用 `fork_turns`（`"all"`/`"none"`/正整数字符串），旧版用 `fork_context`，参数被拒时换用另一套（codex-compat.md、spec-reviewer-prompt.md、review-orchestration.md）
- **沙箱 git 说明精确化**——workspace-write 下 `git commit` 一般可用，真正被强制只读的是 `.git/hooks/` 与 `.codex/`；guardrail README 补充：pre-commit hook 与 `.codex/hooks.json` 在 Codex 沙箱内会写入失败，需在沙箱外（用户终端）运行安装器，CI 防线不受影响

### 🔧 改进 (Changed) — 补齐 Codex 降级说明

- **acceptance-qa 新增"执行环境兼容性（Codex）"节**（原本零 Codex 适配）——证据审计子代理映射到 `spawn_agent`/`wait_agent`（不继承上下文）、MCP 接入路径、**workspace-write 沙箱默认禁网**对 npx 拉包/远端访问/k6/Lighthouse 的影响与 `unverified` 标记规则、`update_plan` 与对话式提问
- **三个 skill 补环境兜底句**——using-git-worktrees 与 writing-plans 注明 Codex 无原生 worktree 工具（直接走手工 git 路径）、项目内 `.worktrees/` 天然在沙箱可写根内；test-driven-development 注明"只依赖项目测试命令，两平台通用"
- **README marketplace 标识澄清**——补全 marketplace.json 完整片段并说明：顶层 `name` 是 marketplace 标识 `spec-agent-skills`（用于 `upgrade` 与 `插件名@marketplace`），插件条目 `name` 是 `spec-dev`（用于 `codex plugin add spec-dev@spec-agent-skills`）；两标识各司其职，原命令无误

---

## [7.0.0] - 2026-07-09

### 💥 破坏性变更 (Breaking) — browser-qa 重写为 acceptance-qa 全能验收工作流

- **skill 改名 `browser-qa` → `acceptance-qa`**（目录、frontmatter、marketplace/codex 清单、README、上游引用一次改齐）——原"浏览器三层"心智模型泛化为「**验收维度 × 执行性质**」矩阵：维度 = unit / integration / e2e / visual / a11y / perf-web / perf-api（桌面/移动客户端作为运行环境修饰），执行性质 = **Tier D 确定性**（真实命令+精确断言，零 LLM 判断）/ **Tier A AI 自主**（MCP 驱动+证据强制）/ **Tier X 诊断**（假设验证根因）；老前缀 layer1/2/3 兼容映射到 e2e(D)/e2e(A)/diagnose
- **契约 schema `browser-check-items` → `acceptance-check-items`**——items 新增必填 `dimension`/`tier` 与可选 `requirement_ref` 字段，四态 result 与 recheck 回写不变；schemas/README 契约清单同步

### ✨ 新增 (Added)

- **验收矩阵（Acceptance Matrix）贯通管线**——spec「测试策略」节升级为「测试与验收策略」矩阵（Scenario × 维度 × 执行方式 × 证据；性能行必须带阈值数字）；writing-plans 在最终任务前固定生成**验收任务**（矩阵含「验收任务」行时），Self-Review 增查矩阵行覆盖；executing-plans 触发条件从"UI 变更"扩为"按验收矩阵"（阶段 3 跳过验收任务、阶段 4 触发 acceptance-qa 并按变更面裁剪矩阵行），review-orchestration 联动节同步；报告与证据统一落盘特性目录 `acceptance/` 子目录
- **性能验收（perf-web / perf-api / 客户端）**——新 references/performance.md：预算先行（无数字不验收）、多次采样取中位数；前端 CWV 现行阈值（LCP≤2500ms / INP≤200ms / CLS≤0.1）经 chrome-devtools MCP `performance_start_trace` 采集、`performance_analyze_insight` 展开根因、`emulate` 节流复现，Lighthouse CI（eslint 风格断言 + median 聚合）作 CI 持久化路径；后端 k6 thresholds（`p(95)<N` 失败即非零退出码）+ 6 种测试类型表（验收默认 smoke 档，压测非本地环境须授权）+ k6-smoke.js 模板；Electron 启动/内存测量
- **单元/集成/API 验收**——新 references/unit-integration.md：多栈命令表（vitest/jest/pytest/go/cargo/java）、"本次变更相关→全量"范围规则与新增/既有失败区分、覆盖率只按项目配置或矩阵要求断言（反对验收时单方面发明门槛）、API 三层断言（状态码/业务字段/契约形态）、深档选配定位（Stryker 变异测试/Schemathesis/Pact）
- **视觉回归与可访问性验收**——新 references/visual-a11y.md：`toHaveScreenshot` 纪律（基线同环境、mask/stylePath 处理动态区域、建线≠回归、刷基线=销毁证据）、AI 视觉判读的可靠边界（能判布局破坏/不能判像素级差异，结论必须指认位置）；AxeBuilder WCAG A/AA 扫描（排除须注明理由）、`lighthouse_audit` 交叉印证、键盘走查与人工项分流
- **Tier A 断言升级**——references/ai-acceptance.md：playwright MCP `browser_verify_*` 工具族（element_visible/text_visible/list_visible/value）作为确定性断言原语优先于快照判读；`--secrets` 凭据注入不进上下文、`--output-dir` 证据集中、`browser_start_tracing`/`browser_start_video` 流程级取证；原 Layer 2 三道防线（证据强制、fail/warn 重执行复核、pass 独立证据审计）完整保留
- **诊断扩容**——references/diagnose.md：新增内存泄漏（堆快照对比 take/compare_heapsnapshots + retainers 持有链）、网络瀑布（list_network_requests）、后端性能分层归因；Shadow DOM/iframe 优先用官方能力（snapshot 穿透 + `--caps vision` 坐标族），第三方 CDP 工具降为极端场景可选（信任边界警告保留）
- **Playwright Test Agents 按需推荐档**——e2e-patterns.md 新增：官方 planner/generator/healer 工作流（`npx playwright init-agents --loop=claude`、seed test 机制）作为"项目已启用则优先走"的用例生成路径；**healer 结论（改 locator/skip）须逐条人工确认才计入验收**，被 skip 的用例按 fail 处理——防"把真缺陷治成 skip"
- **环境检测多栈化**——detect-env.mjs 重写：栈识别（node/python/go/rust/java）、测试框架与 E2E 框架识别、覆盖率门槛/a11y 依赖/视觉基线/k6 与 LHCI 配置探测，suggestions 按维度给处置建议
- **报告模板**——templates/acceptance-report.md：总览矩阵、Requirement 覆盖对照、关键发现、证据索引、coverage_note（no silent caps）

### 🛡️ 新增 (Added) — spec 漂移守卫（guardrail）

- **问题**——spec/plan 是仓库里的普通 Markdown，接手者若不走 spec-dev 流程（甚至未安装插件）直接改代码，spec 会停留在旧状态，后续 explore/accept 拿着过期契约失效。新增 `plugins/spec-dev/guardrail/` 一套分层守卫堵住此漂移
- **锚点**——spec-template.md 顶部新增 `spec_dev` frontmatter（`covers` 代码 glob / `status` active 才拦截 / `feature` / `sync_commit`），把 spec 与其覆盖的代码机器可读地绑定
- **单一事实源 check-spec-drift.mjs**——零依赖 node 校验器：解析 active spec 的 `covers`、比对 git 变更集，"改了覆盖代码却没同步 spec"即判漂移；支持 `--staged`（pre-commit）/ `--range`（CI）/ `--hook`（读 stdin JSON，两侧 preToolUse）三种入参；`SPEC_DEV_GUARD=off` 临时放行
- **双侧工具面拦截**——`.claude/settings.json` PreToolUse 与 `.codex/hooks.json` preToolUse 均以退出码 2 在编辑前阻断并把原因回灌模型（Codex hooks 能力经 openai/codex 源码核实：HookEventName 含 preToolUse、should_block/block_reason 语义、`.codex/hooks.json` 随仓库分发）；SessionStart 双侧注入流程上下文
- **工具无关硬防线**——git `pre-commit`（可 `--no-verify` 绕过）+ GitHub Actions workflow（PR/推送不可绕过，最后防线）共用同一校验器
- **软提示对等**——`CLAUDE.md` / `AGENTS.md` 各写守卫段（标记块幂等），未装插件的接手者也知道同步义务
- **一键安装器 install.mjs**——把上述全套装进目标仓库，幂等可重复运行（hooks 按 command 去重、软提示按标记块替换、pre-commit 单行、macOS 符号链接路径已处理）

### 🔧 改进 (Changed)

- **四条铁律**（原三条泛化+新增）：能确定性验收的绝不交给 AI 判断；无证据不给结论（四态制）；根因必须假设验证；**不采信实施者自报告**——验收结论只来自本次执行的退出码与证据
- **触发面重划**——性能测试/压测（原显式排除）纳入触发；日常"跑一下测试/修测试"、TDD 开发循环、代码审查、需求文档评审保持排除；trigger-evals 扩至 16 正例（含压测/视觉/a11y/全面验收）+ 10 近失负例
- **mcp-setup.md 重写**——playwright MCP 验收相关参数表与工具族速览、chrome-devtools MCP 工具族（性能/模拟/网络/内存/审计）与隐私 flag（`--no-performance-crux`、`--no-usage-statistics`）、mobile-mcp 按需接入（移动端 Tier A 同构）、不推荐清单（k6 MCP 停滞——k6 CLI 本身即确定性验收门；独立 Lighthouse MCP 与 cdt-mcp 重复）
- **evals 重写**——7 用例覆盖 e2e(D) 生成、Tier A 证据编排（verify 优先 + 新 schema）、perf-api 阈值与授权、perf-web 采样纪律、矩阵集成（变更面裁剪 + acceptance/ 落盘）、诊断路由、日常测试不触发

### 📝 说明

- 全部外部事实（Playwright 1.61 与 Test Agents、playwright-mcp/chrome-devtools-mcp 工具清单、CWV 阈值、k6 v2.1 thresholds、LHCI 断言、AxeBuilder、Vitest coverage thresholds）经官方仓库文档源逐项核实（2026-07-09 克隆），非训练记忆
- `.mcp.json` 预配置保持 5 个 MCP 不变；mobile-mcp 仅文档化按需推荐，不预配置

---

## [6.1.0] - 2026-07-09

### ✨ 新增 (Added) — exploring 探索模式

- **exploring** — 探索模式（思考伙伴）：想法未定型、尚未承诺交付时使用——只读不写码（HARD-GATE）、开支线而非审讯、ASCII 可视化、探索笔记提议制落盘 `docs/explorations/`；结晶后交接 requirement-analysis（探索结论作为阶段 1 输入），executing-plans 契约级卡壳时可回探（洞见按归位表回填 spec/plan）。SKILL.md 已随 v6.0.0 入库但未登记，本版完成 marketplace 与 codex 双清单登记，补齐 `agents/openai.yaml` 与 evals；README 特性/管线图/使用方法同步

### 🔧 改进 (Changed)

- **范围判据与影响面** — spec 模板新增「影响面」节（受影响代码/API/依赖/系统，为审查与验收划定范围）；范围判据升级为"一句话意图测试 + 过大信号清单"（贯通阶段 1 范围分解检查、阶段 7 自检、spec 审查子代理）；requirement-analysis 触发面收紧为"已明确要交付"并新增意图承诺检查（犹豫期建议切换 exploring）
- **澄清提问升级** — requirement-analysis 阶段 3 新增三条纪律：先探索后提问（能由代码库或阶段 2 探索结果回答的问题自己查证，不消耗用户澄清轮次）、按决策依赖排序（沿决策树逐支下行，上游未定不问下游）、术语挑战（用词模糊或一词多义时当场请用户裁决规范术语）；spec 模板新增「术语表」节（规范名 + 一句话定义 + Avoid 别名），阶段 7 自检增查术语全篇一致
- **ADR 决策分流** — 阶段 6 对「已确认的关键决策」逐条检查：同时满足难以逆转、缺上下文会费解、真实取舍三判据者沉淀为仓库级 `docs/adr/NNNN-<slug>.md`（全项目统一目录与编号），spec 决策节保留一行摘要并链接；三判据缺一即留在 spec 决策节——ADR 泛滥和没有 ADR 一样没用；spec 提交范围扩为 spec + 本次新增 ADR
- **计划分组与偏差三档** — writing-plans 大型计划按工作域分组导航（任务编号保持全局连续，commit/勾选引用不受影响，分组暴露并行边界）；executing-plans 偏差处理扩为三档：小偏差就地修 / 契约级停机问（可切 exploring 回探）/ 意图级另起新特性目录走 requirement-analysis——更新保留上下文、新起提供清晰
- **双确认门** — 编写计划前与执行计划前均须用户明确确认：requirement-analysis 阶段 8 交接前置确认、writing-plans 动笔前确认、executing-plans 执行确认门（呈现计划路径/任务数/worktree 分支的执行摘要后开工）；用户显式指示或上游已确认时不重复问；writing-plans 与 executing-plans 各新增确认门 eval 用例
- **计划可移植性闭合** — 每份计划在任务 0 之外固定生成首尾对称的最终任务（全量验证 → 合并回来源分支 → 清理 worktree 与分支），隔离工作区生命周期在计划文档内闭合；计划头部随行偏差处理指引（小偏差就地修、契约级停下问计划作者）与「连同特性目录整体携带」说明；任务模板提交示例对齐 `feat(TN)` 前缀；executing-plans 将最终任务推迟至收尾审查处置后执行（双方配套 evals）

---

## [6.0.0] - 2026-07-05

### 💥 破坏性变更 (Breaking) — 设计→计划→执行 skill 管线全面重构

- **requirement-analysis 按 brainstorming 范式重写为纯设计工作流** — 9 阶段（分析+实施一体）改为 8 阶段（需求理解与分诊 → 并行探索 → 澄清问题 → 对抗验证 + 2-3 方案 → 展示完整设计 → 写 spec 并提交 → self-review + 对抗验证 → 交接 writing-plans）；引入 `<HARD-GATE>`（设计获批前禁止任何实施动作）、反模式声明（"太简单不用设计"）、Red Flags 与 dot 流程图；终态唯一——调用 writing-plans。原阶段 7-9（实施/审查/总结）迁移至新的 executing-plans skill
- **移除 spec-flow 遗留物** — 删除 `spec-acceptance-reviewer` agent 与 `acceptance-findings.json` schema（spec-flow skill/command 已于本版本前移除）
- **删除 code-architect agent** — 方案设计不再派子代理：阶段 4 由主线程用 sequential-thinking 先做信息对抗校验（来源可靠性/与代码库事实冲突/版本时效/未验证假设）再出 2-3 方案
- **移除阶段 6 路径菜单** — 「与 codex 计划讨论」（v5.5.0）与「计划拆分落盘」三件套整体移除；计划能力由 writing-plans 承接，实施纪律由 executing-plans 承接；删除 `plan-handoff.md`、`parallel-patterns.md`、`task-list-management.md`、`examples.md`、`output-template.md`、`plan-split-templates.md`

### ✨ 新增 (Added) — 5 个新 skill

- **visual-preview** — 浏览器可视化预览：JIT 提议铁律（不开场提议、提议独立成消息、拒绝后不再提）、逐题浏览器 vs 终端判断、HTML fragment 循环与 events 回流；会话目录 `.spec-dev/visual/`，双平台前后台自适应
- **writing-plans** — 把 spec 拆成零上下文可执行计划：文件结构先行、任务粒度（每步 2-5 分钟）、TDD 五步内嵌、接口消费/产出契约、禁止占位符硬规则、self-review 三查（spec 覆盖/占位符/类型一致）；每份计划固定生成任务 0（建立隔离工作区，含已隔离检测与 git 降级命令），计划文档脱离插件也可按序执行；落盘特性目录 `docs/YYYY-MM-DD-<feature>/plan/<feature>-plan.md`
- **executing-plans** — 执行计划任务 0 建立隔离工作区后，主线程逐任务连续执行（每任务 commit `feat(TN): xxx` + spec 自检只查 over/under-building 与契约锚定）；收尾多维对抗审查继承原阶段 8 编排（fan-out code-reviewer + review-findings 契约校验 + loop-until-dry + 对抗复核 + completeness critic）；UI 变更触发 browser-qa Layer 2 验收；审查处置征询用户后合并 worktree 并总结
- **using-git-worktrees** — 隔离工作区纪律：Step 0 已隔离检测（含 submodule 防误判）→ 原生工具优先（如 EnterWorktree）→ git 降级（`.worktrees/` + check-ignore 强制）→ 依赖安装 → 基线测试验证
- **test-driven-development** — TDD 铁律（没有失败测试就没有生产代码）、红-绿-重构循环、借口对照表、完成前检查清单；附 testing-anti-patterns 参考（不测 mock 行为、不加测试专用方法、不盲目 mock、mock 镜像完整结构）

### 🔧 改进 (Changed)

- **requirement-analysis 探索升级** — 内部（code-explorer）与外部（external-resource-explorer）探索合并为同一波次单响应 fan-out，子代理数量不设上限（由需求结构决定）；澄清改为 brainstorming 式一次一个问题、不限轮数；新增 `exploration-patterns.md`（取代 parallel-patterns.md 的阶段 2 部分）、`spec-reviewer-prompt.md`（spec 对抗审查模板）、`spec-template.md`（spec 骨架）
- **产物目录标准化** — 一个需求的全部产物统一收纳在特性目录 `docs/YYYY-MM-DD-<feature>/` 下：spec 落 `spec/<feature>-design.md`（写入即 git commit），计划落 `plan/<feature>-plan.md`；同日同名冲突追加序号；spec self-review 后如有修改必须让用户重新 review
- **spec 行为规范结构化（Requirement + Scenario）** — spec 模板引入 `### Requirement:`（RFC 2119 关键词，一条一个 SHALL、必须可观察）与 `#### Scenario:`（GIVEN/WHEN/THEN）；writing-plans 把 Scenario 直译为各任务的失败测试（GIVEN→arrange、WHEN→act、THEN→assert，测试名沿用 Scenario 名），executing-plans 的 completeness critic 与 browser-qa 验收以 Requirement/Scenario 为覆盖锚点；修改既有功能时行为部分用 ADDED/MODIFIED/REMOVED 差量三节表达；spec 审查子代理新增可测性与差量正确性维度，requirement-analysis inline 自检新增 Requirement 质量检查
- **agents 瘦身** — code-explorer / code-reviewer 删除 Task List 支持章节与 Task* 工具声明；external-resource-explorer 描述改为服务 requirement-analysis 并行探索与回补探索
- **清单与文档对齐** — marketplace 清单 7 个 skill；README 重写为管线视角；`schemas/README.md` 契约清单去除 acceptance-findings

### 📝 说明

- 新管线保持「主线程干活、子代理只读分析」范式（v5.6.0 确立）：实现代码始终由主线程编写，子代理只承担探索与审查
- 第三方版权信息见插件包内 `LICENSE` 文件

---

## [5.6.0] - 2026-06-20

### ✨ 新增 (Added) — requirement-analysis 路径 3 实施纪律

- **worktree 隔离实施（强制）** — 路径 3「立即开始实施」进入阶段 7 时基于当前分支创建独立 git worktree（分支名 `plan/YYYYMMDD-计划名`），实施失败或计划废弃可整体丢弃而不污染主工作区；恢复时已存在则复用、不存在则补建；全部任务完成并通过整体代码审查后合并回来源分支。原生 `git worktree add`，零外部 skill 依赖
- **每任务提交（强制）** — 每完成一个任务在 worktree 分支 commit（message 对齐任务编号 `feat(T3): xxx`），动作链固定「commit 代码 → spec 自检 → 更新文档（tasks.md/progress.md）→ 同步运行时任务状态」，每任务在 git 与文档中都有独立可回溯锚点；非 git 仓库等场景降级为仅更新文档并注明
- **每任务 spec 自检（强制）** — commit 后主线程（不派子代理）对照 `T{n}` 验收标准查 over/under-building 与契约锚定（本任务确立的函数签名/数据结构/API 是否被后续任务隐式重新解释）；显式禁止重复阶段 8 的 A/B/C 维度——主线程不猎 bug，那是阶段 8 的活；light 档可省略
- **per-task spec 门的 opt-in 触发** — 默认不派 per-task spec 子代理门（主线程 spec 自检已零成本捕获主要收益）；仅当观察到跨任务契约错被合规化放大、completeness critic 契约面截断、或 deep 档含跨多文件契约定义任务时建议 opt-in（每任务 commit 后派 code-reviewer 限 SHA 区间查 spec 合规），并给出配套要求

### 🔧 改进 (Changed)

- **移除阶段 6 spec-flow 升级出口** — 路径确认菜单不再附注"建议切换 spec-flow"及阶段产出到 spec.md/plan.md 的映射表；requirement-analysis 与 spec-flow 定位为两个独立 skill，按需选用而非自动建议升级。目录约定 `docs/YYYYMMDD-计划名/` 去除中文方括号，与 plan-handoff.md 统一；README「如何选择」一并对齐

### 📝 说明

- 本次演进源自"是否引入上游 subagent-driven-development (sdd)"的评估（三轮对抗验证）：不整体引入 sdd、不新增 implementer 子代理（保住"主线程干活、子代理只读分析"范式），只把路径 3 实施所需的隔离与提交纪律固化，spec 合规缺口用主线程 spec 自检廉价捕获，per-task 子代理门留作 opt-in

---

## [5.5.0] - 2026-06-12

### ✨ 新增 (Added) — 阶段 6 路径选择菜单

- **requirement-analysis 阶段 6 计划出口升级为三路径菜单** — 展示计划后一次交互完成计划反馈与路径选择：① 直接开始实施（原行为）；② 与 codex 计划讨论——`codex exec`（read-only 沙箱）多轮评审 ≤3 轮，逐轮汇总共识/分歧，共识计划经用户确认后写入 `docs/【YYYYMMDD-计划名】/plan.md`，CLI 不可用自动降级回退；③ 计划拆分落盘——同目录生成 `plan.md` + `tasks.md` + `progress.md` 三件套（任务状态机 pending|in_progress|completed|blocked、当前任务指针、append-only 变更日志、自包含会话恢复指引），并将任务注册进运行时任务管理（Claude Code 用 `TaskCreate`/`TaskUpdate`，Codex 用 `update_plan`），文档为持久层、先改文档再同步运行时
- **新增 `references/plan-handoff.md`** — 路径 2/3 执行细则单一定义点：与 spec-flow 的边界声明（满足跨会话/验收留痕条件仍优先建议升级）、共用目录约定（同日重名追加序号、讨论后拆分不另开目录）、codex 讨论命令序列（stdin 管道防 argv 超长、`-o` 落盘取回、`exec resume` 会话延续与并发警告、单轮超时作废）、三件套生成与双轨同步规则、跨会话审查纪律
- **新增 `assets/plan-split-templates.md`** — 三件套 markdown 模板（字段定义、状态机、恢复指引固定文案）
- **菜单保留修改意见入口** — 用户对计划本身给出反馈时回到计划修订，修改后重新展示并重出菜单，不强迫三选一；Codex 环境菜单仅 ①③（自我评审无独立性收益，定义点在 codex-compat.md）；满足 spec-flow 升级条件时菜单附注升级建议（原升级出口条件与映射表不变，时序由"确认后判断"并入菜单附注，少一轮交互）
- **evals 增补** — 新增 `ra-phase6-path-menu` 用例，覆盖菜单呈现、codex 讨论轮次约束、三件套生成与双轨同步断言

---

## [5.4.0] - 2026-06-12

### 🔧 改进 (Changed) — 单一源结构改造

- **`plugins/spec-dev/` 成为插件唯一源码目录** — 删除根目录 `skills/`、`agents/`、`commands/`、`.codex-plugin/`、`scripts/validate-output.mjs`、`scripts/schemas/` 重复副本；`.claude-plugin/marketplace.json` 的 plugin source 由 `./` 改为 `./plugins/spec-dev`（Claude Code 官方支持同仓库子目录 source），与 Codex marketplace 指向同一物理目录。skill/agent/command 变更从此只改一处，git diff 单份
- **同步机制退役为校验机制** — 删除 `scripts/sync-codex-package.mjs` 全量拷贝逻辑，新增 `scripts/check-mirrors.mjs`：仅校验 `README.md`、`CHANGELOG.md`、`.mcp.json` 三个受控双份文件逐字节一致（`--fix` 以仓库根为编辑面单向对齐），保留 `--codex-validate` 官方 Codex CLI 真实安装校验与插件包 symlink 防御
- **pre-commit hook 链路简化** — 由"同步 → 双重校验 → 暂存检查"改为"check-mirrors（含 Codex 安装校验）→ validate-skills → diff check"；不再产生需要二次暂存的生成文件，提交一步完成；`SKIP_CODEX_PACKAGE_HOOK=1` 跳过语义不变
- **validate-skills.mjs 收敛** — skill 校验根从 [仓库根, 插件包] 双份收敛为插件包单份

### 📝 说明

- 已安装用户无需操作：Claude Code 侧更新 marketplace 后重装即得新结构（旧 commit 缓存自然废弃）；Codex 侧插件入口路径未变，`codex plugin marketplace upgrade spec-agent-skills` 照常
- 附带收益：Claude Code 安装拷贝范围由整个仓库缩小为 `plugins/spec-dev/`，用户插件缓存不再包含仓库级开发文件

---

## [5.3.0] - 2026-06-12

### ✨ 新增 (Added) — 第三期编排方法论增强

把 Workflow 的编排方法论（契约化输出、对抗复核、枯竭循环、失败隔离、覆盖声明、声明式控制流）内化为 skill 自己的纪律。实现形态 = **prompt 层伪代码 + 确定性校验脚本**，不调用 Workflow 工具，Claude Code 与 Codex 跑同一套编排逻辑（设计决策 D1/D2）；对抗验证只落在三个质量关口并按 severity 分级触发（D3）；deep 档才启用完整编排（D4）；browser-qa Layer 2 永远串行（D5）。

- **T3.1 契约校验器** — 新增 `scripts/validate-output.mjs`（无第三方依赖的 JSON Schema 子集校验 CLI）与 `scripts/schemas/`；子代理输出落盘后脚本确定性校验，失败退回补全；同步脚本补 scripts 条目使其随 Codex 分发包分发
- **T3.2 四类输出契约** — exploration-report / review-findings / acceptance-findings / browser-check-items，全部含必填 `coverage_note`（no silent caps：截断必须显式声明）
- **T3.3 阶段 8 伪代码编排** — fan-out 单响应、契约校验+补全重试、loop-until-dry 枯竭循环（复核否决项留 seen 防不收敛）、对抗复核（仅高/中）、completeness critic + 覆盖声明、失败隔离
- **T3.4 accept 伪代码编排** — skeptic（杀误报）+ coverage critic（抓漏报）双向对抗；「已接受的 MAJOR」完整闭环（用户确认 → accepted_risks → 结论规则）；reviewer 输出 markdown+JSON 双产物；报告模板加 Accepted Risks 节
- **T3.5 Layer 2 串行编排** — 证据契约 JSON 落盘校验；fail/warn 必做"不信任原结论"复核并产出第二份证据，pass 默认不复核；并行驱动浏览器列入"不要做的事"（单实例硬约束）
- **T3.6 deep 档编排** — 阶段 2 multi-modal sweep（4 模态盲扫，不绑定后端分层假设）+ 阶段 5 judge panel（3 视角盲评 + 4 维评分合成）；light/standard 显式禁用
- **T3.7 checkpoint --evidence** — 实施时累积证据进 `progress.evidence[]`，验收直接消费（journal 思想，消除 implement→accept 证据断层）
- **T3.8 doctor 子命令** — 7 类一致性检测；`--fix` 仅修安全项（字段漂移回写、孤儿目录重建），目录/文件缺失类只给人工建议
- **T3.9 runtime 小修集** — completionPercent 越界报错（不静默 clamp）、archive summary-path 存在性校验与迁移路径返回、时区说明、Concurrency 节
- **T3.10 编排状态 journal 化** — `checkpoint --dispatch` 登记子任务，`resume` 返回 `pendingDispatch`；恢复时已 done 子任务直接复用结果不重派
- **T3.11/T3.12 互操作** — accept 对 UI 类验收先建议 browser-qa 取证（建议非硬依赖）；requirement-analysis 阶段 6 升级出口（5 行映射表把分析成果迁移为 spec/plan 初稿）
- **T3.13 evals 基线** — 三 skill 共 12 个真实感用例（含档位路由/证据强制/意图推断/should-not-trigger 边界）
- **T3.14 触发优化** — browser-qa 20 条 trigger evals 基线；新 description should-trigger 10/10、near-miss 误触发 0/10（旧版 8/10、约 3-4/10）；requirement-analysis ↔ spec-flow 互斥条件写入双方 description
- **T3.15 detect-env.mjs** — browser-qa 前置环境检测脚本化（一次输出全部文件系统可判定项），手工清单保留为降级路径

### 🔧 改进 (Changed) — 第二期结构重构

- **T2.1 双环境样板抽离** — 新建 `skills/requirement-analysis/references/codex-compat.md` 集中收纳 Codex 环境判定、工具映射、提问规范与任务管理细则；删除跨版本脆弱的 `multi_tool_use.parallel` 内部命名
- **T2.2 requirement-analysis SKILL.md 瘦身** — 510 行 → 300 行内：9 阶段内重复的双环境任务管理样板下沉到统一节与 codex-compat.md；3 处无解释的 MUST 改写为"约束 + why"（深度思考带降级路径、单响应并行发起带理由、审查后先确认再修带理由）
- **T2.3 三档复杂度路由** — 新增 light/standard/deep 执行档位（阶段 1 判定、向用户声明、允许覆盖）；light 档全流程 ≤2 次交互；examples.md 三个示例按档位重写
- **T2.4 阶段 5 接入 code-architect** — standard 档先派 code-architect 出架构蓝图（4 项输入契约），主线程做整合决策——此前该 agent 在 skill 中无引用，是死代码
- **T2.5 审查维度对齐** — parallel-patterns.md（5 维）与 code-reviewer agent（3 维）统一为 3 维基线（A 正确性/B 风格质量含 DRY/C 规范遵循含工具复用），deep 档才扩 5 路；output-template.md 审查报告同步对齐
- **T2.6 reviewer 类 agent 模型升档** — `code-reviewer` 与 `spec-acceptance-reviewer` 由 `haiku` 升至 `sonnet`：审查与验收是错误代价最高的质量把关环节，最弱档位与其定位矛盾。成本影响：审查/验收环节 token 成本上升，换取把关质量；探索类 agent（code-explorer、external-resource-explorer）保持 haiku 不变
- **T2.7 spec-flow command 薄壳化** — 124 行 → 42 行路由表，消除与 SKILL.md/references 的双入口漂移；8 条增量规则迁移至对应 action-*.md 与 recovery-rules.md（新增 Status Query 节）；SKILL.md 增加 Query Commands 小节
- **T2.8 browser-qa description 收窄** — 删除过宽触发词（"跑一下测试""前端测试""测试这个页面"），新增 should-not-trigger 边界（单元测试/API 集成测试不触发）与诊断意图触发
- **T2.9 Layer 2 证据强制** — 验收清单改为"定制（3-6 条）+ 通用筛选"两段式；每项结论必须附证据引用（snapshot 片段或截图），无证据只能标"未验证"不能标"通过"；报告模板增加证据列
- **T2.10 参数解析意图推断** — browser-qa 改为"显式前缀 > 意图推断 > 询问"三级解析，自然语言触发不再一律跑全部层级
- **T2.11 Codex 元数据补齐** — requirement-analysis 与 browser-qa 新增 `agents/openai.yaml`（与 spec-flow 结构一致）

### 🔧 修复 (Fixed) — 第一期 P0 修错

- **T1.1 spec-flow command 插件资源路径** — `commands/spec-flow.md` 中全部 `skills/spec-flow/...` 路径加 `${CLAUDE_PLUGIN_ROOT}/` 前缀并补兜底说明，`/spec-flow init` 不再需要模型自行摸索插件安装目录；验证确认 Codex 端不加载 commands 目录，无需同步转换
- **T1.2 browser-qa MCP 配置位置** — `mcp-setup.md` 的 MCP 配置位置由错误的 `settings.json` 修正为项目级 `.mcp.json` / 用户级 `~/.claude.json`（与 README 一致），并补充 `claude mcp add` 快捷方式
- **T1.3 browser-qa 过时 MCP 工具名** — `browser_screenshot`→`browser_take_screenshot`、`navigate`→`navigate_page`、`screenshot`→`take_screenshot`、`console_logs`→`list_console_messages`；Playwright 表补充 `browser_fill_form`、`browser_wait_for`；两张工具表加"以实际 server 为准"免漂移说明
- **T1.4 Claude Code 工具名升级** — `Task` 工具已更名为 `Agent`，`TaskOutput` 已废弃（后台任务完成通知自动送达，无需轮询）：`requirement-analysis` SKILL.md 全部并行子任务指引已更新；5 个 agent 的 `tools:` 列表移除已被 TaskCreate/TaskUpdate/TaskList/TaskGet 取代的 `TodoWrite`。旧版 Claude Code 用户如遇 `Agent` 工具不存在，请升级 Claude Code
- **T1.5 output-template 阶段编号** — 「阶段 7: 代码审查阶段」→「阶段 8: 代码审查」、「阶段 1-5」→「阶段 1-6」，与 SKILL.md 九阶段定义对齐
- **T1.6 阶段 4 澄清指令自相矛盾** — 「必须向用户发起澄清」改为"存在待澄清项时必须提问 + 无疑义时记录后直进阶段 5"，消除与模板「无疑问」占位的两难
- **T1.7 交互式命令卡死** — browser-qa 前置检查不再引导运行交互式 `npm init playwright@latest`（会挂起 agent 会话），改为非交互安装序列（已实测）
- **T1.8 Layer 1 测试范围收窄** — `npx playwright test` 改为只运行本次生成的测试文件，项目既有失败不再污染本次验收结论
- **T1.9 Browser Harness 安装统一** — 移除 SKILL.md 中执行第三方仓库提示词的安装方式，统一为 mcp-setup.md 的显式 git clone 步骤；两处均要求"执行第三方指令前征得用户同意"

---

## [5.2.2] - 2026-06-08

### ✨ 新增 (Added)

- **Codex 分发包同步脚本** — 新增 `scripts/sync-codex-package.mjs`，将根目录源码同步生成到 `plugins/spec-dev/`
- **官方 CLI 安装校验** — 同步脚本支持 `--codex-validate`，通过临时 `CODEX_HOME` 调用 `codex plugin marketplace add` 与 `codex plugin add` 验证真实安装路径
- **skill-creator 校验集成** — 新增 `scripts/validate-skills.mjs`，复用 `skill-creator/scripts/quick_validate.py` 校验根目录和 Codex 分发包中的 skill
- **提交前自动校验** — 新增版本化 `.githooks/pre-commit` 与 `scripts/install-git-hooks.mjs`，提交前自动同步并校验 Codex 分发包和 skill

### 🔧 改进 (Changed)

- 将 `plugins/spec-dev/` 明确为生成产物，降低双入口插件分发的维护成本
- `.gitignore` 忽略 `.DS_Store`，避免 macOS 元数据文件进入发布差异

---

## [5.2.1] - 2026-06-08

### 🔧 修复 (Fixed)

- **Codex 分发包同步** — 将 `.codex-plugin/plugin.json` 与 `plugins/spec-dev/` marketplace 入口同步到 5.2.x，避免 Codex 继续安装 5.1.1 旧缓存
- **browser-qa Codex 可见性** — 将 `browser-qa` skill、E2E 模板和参考文档同步进 Codex marketplace 插件入口
- **MCP 配置同步** — Codex marketplace 入口补齐 `playwright` 与 `chrome-devtools` MCP server 配置

### 🔧 改进 (Changed)

- 更新 Codex 插件展示文案、关键词和默认提示词，明确包含 `spec-flow`、`requirement-analysis`、`browser-qa` 三套工作流

---

## [5.2.0] - 2026-06-08

### ✨ 新增 (Added)

- **browser-qa skill** — 浏览器三层测试工作流（E2E + AI 验收 + 调试诊断）
  - Layer 1: Playwright 原生确定性 E2E 测试
  - Layer 2: Playwright MCP AI 自主验收
  - Layer 3: Chrome DevTools MCP 调试诊断 + Browser Harness Shadow DOM 穿透
  - 包含 E2E 测试模板 (`templates/e2e-test.ts`)、代码模式参考 (`references/e2e-patterns.md`)、MCP 配置指南 (`references/mcp-setup.md`)
- **MCP Server 扩展** — `.mcp.json` 新增 `playwright`（Layer 2）和 `chrome-devtools`（Layer 3）两个 MCP Server
- **marketplace 注册** — `browser-qa` 注册到 `spec-dev` 插件，可通过 `/spec-dev:browser-qa` 触发

### 🔧 改进 (Changed)

- **Rule: 测试左移** — 全局 Rule (`browser-qa-methodology.mdc`) 在需求分析的设计阶段自动注入测试计划，实现 Shift Left
- **requirement-analysis 衔接** — 设计阶段自动追加三层测试计划，实施阶段同步添加 `data-testid`，代码审查阶段检查遗漏，总结阶段引导执行 `/browser-qa`

---

## [5.1.1] - 2026-05-12

### 🔧 修复 (Fixed)

- **Codex marketplace 入口** — 新增 `.agents/plugins/marketplace.json`，使本仓库可以直接通过 `codex plugin marketplace add https://github.com/FlameMida/spec-dev` 添加为 Codex marketplace
- **Codex 安装说明** — README 改为 Codex CLI 可直接执行的 marketplace 添加命令，并说明独立 marketplace 仓库的 `plugins/spec-dev/` 布局
- **Codex marketplace 路径修正** — 将 `source.path` 改为 `./plugins/spec-dev`，避免 `./` 被 Codex 规范化为空路径后在 `/plugin` 列表中被过滤

---

## [5.1.0] - 2026-05-12

### ✨ 新增 (Added)

- **Codex 插件能力补全** — `.codex-plugin/plugin.json` 增加 Codex 插件分发所需的完整展示元数据、默认提示词和品牌色
- **插件内 MCP 配置** — 新增 `.mcp.json`，声明 context7、exa、sequential-thinking 三个可选 MCP server
- **Codex 安装说明** — README 增加 Codex marketplace 分发结构、插件清单能力和目录结构说明

### 🔧 改进 (Changed)

- `plugin.json` 增加 `license`、`mcpServers`、`plugins` / `spec-flow` 关键词，提升 Codex 插件发现与展示质量
- 同步更新 Claude marketplace 元数据版本到 `5.1.0`

---

## [5.0.0] - 2026-04-11

### 💥 破坏性变更 (Breaking Changes)

- **移除 `feat-dev` skill** — 被 `spec-flow` 替代，原有 7 阶段开发工作流不再维护
  - 删除 `skills/feat-dev/` 全部文件（skill.md、18 个 references/assets 文件）
  - 原因：`spec-flow` 提供更完善的跨会话持久化、独立验收和归档能力

### ✨ 新增 (Added)

#### spec-flow skill — 跨会话 spec 生命周期管理

全新的 action-first 生命周期工作流，围绕 `explore → plan → implement → accept → archive` 五个 action 维护持久化 `.specs/` 状态。

**核心能力**：
- 跨会话持久化 — workspace-local runtime + 原子写入，会话中断不丢失上下文
- 独立验收 — 专用 `spec-acceptance-reviewer` agent，findings-first 报告
- 可归档 — 完整的归档流程，保留未完成项和遗留风险
- 5 领域覆盖 — 软件、研究、运维/流程、文档、跨团队协作

**新增文件**（18 个）：

| 层级 | 文件 | 说明 |
|------|------|------|
| Skill | `skills/spec-flow/SKILL.md` | 入口定义（94 行） |
| Runtime | `skills/spec-flow/assets/runtime/spec-flow-runtime.mjs` | 状态管理 CLI（773 行 Node.js） |
| Templates | `skills/spec-flow/assets/spec-template.md` | 正式 spec 模板 |
| | `skills/spec-flow/assets/plan-template.md` | 可执行 plan 模板 |
| | `skills/spec-flow/assets/acceptance-report-template.md` | 验收报告模板 |
| | `skills/spec-flow/assets/archive-summary-template.md` | 归档总结模板 |
| References | `skills/spec-flow/references/spec-schema.md` | 数据结构定义 |
| | `skills/spec-flow/references/command-contract.md` | CLI 命令约定 |
| | `skills/spec-flow/references/action-explore.md` | 探索 action 规则 |
| | `skills/spec-flow/references/action-plan.md` | 规划 action 规则 |
| | `skills/spec-flow/references/action-implement.md` | 实施 action 规则 |
| | `skills/spec-flow/references/action-accept.md` | 验收 action 规则 |
| | `skills/spec-flow/references/action-archive.md` | 归档 action 规则 |
| | `skills/spec-flow/references/recovery-rules.md` | 中断恢复规则 |
| Agent 配置 | `skills/spec-flow/agents/openai.yaml` | OpenAI 兼容接口 |

#### 新增 Agents

- `agents/spec-acceptance-reviewer.md` — 独立验收 agent（findings-first、evidence-first、无自评）
- `agents/external-resource-explorer.md` — 外部资源探索 agent（三层搜索优先级、可引用证据）

#### 新增 Slash Command

- `commands/spec-flow.md` — `/spec-flow` 命令路由（init/explore/plan/implement/accept/archive/status/resume）

### 🔧 改进 (Changed)

#### requirement-analysis skill 文本优化

- 精简主文档和参考文档中的重复内容
- 更新并行探索和审查策略描述

#### 路径可移植性修复

- `SKILL.md`：agent 引用从绝对路径改为 agent 名称引用
- `commands/spec-flow.md`：所有链接去掉绝对路径硬编码

#### recovery-rules 补全

- `recovery-rules.md`：补充 `idle` 和 `completed` runState 的恢复优先级，与 runtime 实现对齐

---

## [4.2.0] - 2026-01-27

### ✨ 新增 (Added)

#### Skill 文件结构优化

根据 [Claude Code 官方文档](https://code.claude.com/docs/en/skills)规范优化文件结构。

**新增共享参考文档**：
- `task-list-management.md` - Task List 管理完整指南（3.1KB x 2）
- `specialized-agents.md` - 专门化 Agents 完整指南（7.0KB）

#### Task List 管理功能

**新增文档内容**：
- Task List 核心功能说明（进度可视化、工作流透明化、断点恢复、任务可复用）
- 进度显示格式和示例
- 断点恢复机制详细说明
- 错误处理与降级策略
- 最终进度显示模板

**Task List 操作规范**：
- 基本任务管理操作（开始阶段、完成阶段）
- 条件执行阶段的处理（外部资源研究）
- 等待用户确认的处理
- 错误处理与降级机制

### 🔧 改进 (Changed)

**优化主文件大小**：
- `requirement-analysis/SKILL.md`：587 → 460 行（-21.6%）
- `feat-dev/skill.md`：710 → 500 行（-29.6%）
- **总计**：1297 → 960 行（**-26.0%**）

**优化内容**：
- 提取 Task List 集成章节（共131行）到独立文档
  - requirement-analysis：Task List 章节优化（67行 → 引用文档）
  - feat-dev：Task List 章节优化（64行 → 引用文档）
- 提取专门化 Agents 说明到独立文档
- 简化并行调用示例代码，引用详细指南
- 所有引用路径已更新为 `references/task-list-management.md`

**Task List 相关优化**：
- 从主文件提取：131 行 → 简化为 2 行引用
- 新增独立文档：3.1KB（复制到 2 个 skill）
- 总体效果：主文件精简，功能完整性保持
---

## [4.1.0] - 2026-01-13

### 🌟 主要变更 (Major Changes)

#### 🌐 语言策略重大改进

从**强制中文**改为**自适应语言交互**，提升国际化支持。

**核心变更**：
- ✅ 优先遵循用户在 Claude 中的 `response language` 设置
- ✅ 同时考虑用户输入消息的语言
- ✅ 技术术语和代码保持原样（不强制翻译）
- ✅ 移除所有硬编码的语言限制（🇨🇳 emoji 等）

**影响范围**：
- `requirement-analysis` skill: Line 3, 24, 187
- `feat-dev` skill: Line 3, 24, 514
- `quick-reference.md`: Line 328

**向后兼容**：中文用户行为保持不变，其他语言用户现在可正常使用。

---

### ✨ 新增 (Added)

#### requirement-analysis skill 模块化重构

**精简主文档**：-759 行 / +141 行（精简 73%）
- 移除冗余内容，保留核心 7 阶段工作流
- 优化 description，更简洁明了
- 核心特性改为要点列表

**新增参考文档**：
```
skills/requirement-analysis/
├── assets/
│   └── output-template.md          # 标准化输出格式模板 (3.6KB)
└── references/
    ├── examples.md                  # 3 个完整使用场景示例 (4.2KB)
    └── parallel-patterns.md         # 并行探索和审查详细策略 (5.1KB)
```

**改进效果**：主文档更易读，详细指南独立成文档，便于查阅和维护。

---

#### feat-dev skill 架构设计双模式策略

**阶段 4（架构设计）重大升级**：+378 行 / -47 行

**新增功能**：

1. **结构化上下文准备**
   - 整合阶段 1-3 的所有分析结果
   - 使用标准化上下文模板
   - 避免信息遗漏，提升设计准确性

2. **智能复杂度判断**
   - **简单/中等需求**：单一功能、实现路径明确
   - **复杂需求**：多种实现路径、重大架构权衡、影响多个核心模块

3. **双模式设计策略**

   **模式 1: 单方案设计**（简单/中等需求）
   - 主进程使用 ultrathink 进行深度分析
   - 单个 code-architect agent 细化设计
   - 展示单一最优方案

   **模式 2: 多方案设计**（复杂需求）
   - 并行启动 2-3 个 code-architect agents
   - 设计不同备选方案：
     - 最小改动方案（快速交付）
     - 清晰架构方案（最佳实践）
     - 实用平衡方案（推荐）
   - 提供方案对比和权衡分析
   - 用户选择最适合的方案

**改进文档**：`phase-4-design.md` 扩展约 700%，包含完整的 prompt 模板和执行指南。

---

#### 新增工作流控制文档

**文件**：`skills/feat-dev/references/workflow-control.md` (5.5KB)

**内容**：
- 详细的工作流控制规则
- 阶段间的检查点和依赖关系
- 用户确认机制
- 异常处理和降级策略

---

### 🔧 改进 (Changed)

#### feat-dev skill 主文件优化

**代码变更**：+123 行 / -194 行
- 架构设计阶段完整重构
- 简化冗余描述
- 增强可读性和可维护性

#### 语言策略表述统一

所有 skills 和参考文档统一使用新的语言策略：
- 简洁版："自适应语言交互"
- 详细版："根据用户在 Claude 中的 response language 设置和输入消息的语言与用户沟通（技术术语和代码除外）"

---

### 📊 代码统计

| 文件 | 变更 | 说明 |
|------|------|------|
| `.claude-plugin/marketplace.json` | +1 / -1 | 版本号 4.0.2 → 4.1.0 |
| `requirement-analysis/SKILL.md` | +141 / -759 | 精简 73% |
| `feat-dev/skill.md` | +123 / -194 | 优化结构 |
| `feat-dev/references/phase-4-design.md` | +378 / -47 | 扩展 700% |
| `feat-dev/references/quick-reference.md` | +1 / -1 | 语言策略同步 |

**新增文件**：
- `feat-dev/references/workflow-control.md` (5.5KB)
- `requirement-analysis/assets/output-template.md` (3.6KB)
- `requirement-analysis/references/examples.md` (4.2KB)
- `requirement-analysis/references/parallel-patterns.md` (5.1KB)

**总计**：修改 5 个文件，新增 4 个文件（~18KB 文档），净代码优化 -71 行

---

### 🔄 向后兼容性

✅ **完全向后兼容**
- 中文用户行为保持不变
- 工作流程完全保留
- API 和接口无变更
- 现有项目无需迁移

---

### 🎯 升级建议

**推荐升级**：⭐⭐⭐⭐⭐

**升级理由**：
1. 多语言支持，覆盖更广用户群
2. 架构设计质量显著提升（双模式策略）
3. 文档更精简易读（主文档精简 73%）
4. 新增大量实用指南（18KB 参考文档）
5. 完全向后兼容，无风险

---

## [3.1.2] - 2025-12-22

### 🐛 修复 (Fixed)

#### 🔧 修复 Agent Model 参数传递问题

**问题描述**：
- skills/skill.md:76 错误地声称"Model 从 agent 文件的 YAML frontmatter 自动读取"
- 所有 Task 工具调用示例都缺少 `model` 参数
- 导致 code-explorer 和 code-reviewer agents 使用 sonnet 而不是配置的 haiku

**实际行为**：
- Task 工具的 `model` 参数如果不指定，会从父进程继承（使用当前对话的 model）
- **不会**自动读取 agent 文件 YAML frontmatter 中的 `model` 配置

**影响范围**：
- code-explorer (配置 `model: haiku`)
- code-reviewer (配置 `model: haiku`)
- code-architect (配置 `model: sonnet`) - 架构设计使用更强大的 model

**修复内容**：

1. **修正说明文档** (skills/skill.md:74-77)
   ```diff
   - Model 从 agent 文件的 YAML frontmatter 自动读取
   + 必须显式指定 `model` 参数（如 `model: "haiku"`），否则会从父进程继承（使用 sonnet）
   ```

2. **添加 model 参数到所有调用示例**：
   - skills/skill.md：code-explorer x3 (haiku)、code-architect x1 (sonnet)、code-reviewer x3 (haiku)
   - skills/references/phase-2-exploration.md：code-explorer x3 (haiku)
   - skills/references/phase-4-design.md：code-architect x1 (sonnet)
   - skills/references/phase-6-review.md：code-reviewer x3 (haiku)

3. **示例修改**：
   ```markdown
   Task tool:
   - subagent_type: feat-dev:code-explorer
   + model: haiku  # 新增：显式指定 model
   - prompt: "..."
   - run_in_background: true
   ```

**修复后效果**：
- ✅ code-explorer 和 code-reviewer 使用 haiku（快速、低成本）
- ✅ code-architect 使用 sonnet（架构设计需要更强推理能力）
- ✅ 降低整体 Token 消耗（探索和审查任务占大多数）
- ✅ 提升探索和审查速度
- ✅ 符合 agent 设计意图（不同任务使用不同 model）

**修改文件**：
- `skills/skill.md`：修正说明 + 6 处示例
- `skills/references/phase-2-exploration.md`：3 处示例
- `skills/references/phase-4-design.md`：1 处示例
- `skills/references/phase-6-review.md`：3 处示例

**总计**：4 个文件，15 行新增，1 行修改

---

## [3.1.1] - 2025-12-22

### 🔧 改进 (Changed)

#### 💡 改进并行 Agent 调用机制

基于对 Anthropic 官方并行执行最佳实践的深入理解，显著改进了并行 agent 调用的描述和指导。

**问题背景**：
- 虽然 v3.1.0 提到"并行 agents"，但缺少明确的执行层面指令
- Claude 可能按顺序调用多个 agents，而非真正并行
- 缺少 `run_in_background` 和 `TaskOutput` 的具体使用说明

**核心改进**：

##### 1. 专门化 Agents 章节（skills/skill.md:62-97）
- 新增"调用方式"完整说明
- 区分"并行调用（阶段 2 和 6）"和"单个调用（阶段 4）"
- 明确 `run_in_background: true` 的使用要求
- 提供 4 步并行调用流程：
  1. 在一个消息中发起多个 Task 工具调用
  2. 每个 Task 设置 `run_in_background: true`
  3. 继续其他工作（如阅读文件）
  4. 使用 TaskOutput 收集每个 agent 的结果

##### 2. 阶段 2：代码库探索（skills/skill.md:122-161）
- 添加 **⚠️ 并行执行要求（关键）** 警告标记
- 明确要求：**必须在单个消息中**发起 2-3 个 Task 工具调用
- 提供完整的并行调用示例代码：
  ```markdown
  Task 1: 探索数据层
  - description: "探索数据层架构"
  - prompt: "分析数据层：实体、数据库模式、数据关联。返回5-10个关键文件路径。"
  - subagent_type: "feat-dev:code-explorer"
  - run_in_background: true

  Task 2: 探索业务逻辑层 ...
  Task 3: 探索API层 ...

  等待所有 agents 完成后，使用 TaskOutput 收集结果。
  ```

##### 3. 阶段 4：架构设计（skills/skill.md:189-203）
- 添加单个 agent 调用方式说明
- 明确 `run_in_background: false`（或省略）用于阻塞等待

##### 4. 阶段 6：质量审查（skills/skill.md:287-324）
- 添加与阶段 2 类似的并行执行要求
- 提供 3 个 code-reviewer agents 的完整并行调用示例
- 明确各 reviewer 的审查焦点分工

**技术原理**：
- **单消息多调用**：符合 Anthropic 官方并行执行最佳实践
- **后台执行标志**：`run_in_background: true` 让 agents 在后台运行
- **结果收集机制**：使用 TaskOutput 工具异步收集结果
- **时间优化**：从串行执行（15分钟）→ 并行执行（5分钟），节省 67% 时间

**影响范围**：
- 修改文件：1 个（`skills/skill.md`）
- 新增内容：~120 行详细说明和示例
- 影响阶段：阶段 2、4、6 以及专门化 Agents 章节

### 📊 改进统计

| 改动类型 | 位置 | 改动量 | 关键改进 |
|---------|------|--------|----------|
| 新增章节 | 专门化 Agents | ~35 行 | 调用方式完整说明 |
| 改进阶段 2 | 代码库探索 | ~40 行 | 并行调用示例 |
| 改进阶段 4 | 架构设计 | ~15 行 | 单个调用说明 |
| 改进阶段 6 | 质量审查 | ~40 行 | 并行审查示例 |
| **总计** | **skill.md** | **~120 行** | **并行执行机制** |

### 🎯 设计理念

**从"概念描述"到"执行指令"**：
- Before: "并行启动 2-3 个 agents"（太抽象）
- After: "在单个消息中发起 2-3 个 Task 调用，每个设置 run_in_background: true"（可执行）

**遵循官方最佳实践**：
- ✅ 单个消息中发起多个 Task 调用
- ✅ 使用 `run_in_background` 参数控制执行模式
- ✅ 使用 `TaskOutput` 工具收集后台 agent 结果
- ✅ 最大化时间利用和并行效率

### 💡 用户收益

1. **更清晰的指导**：明确的执行步骤，不再困惑如何实现并行
2. **更快的执行**：真正的并行执行，阶段 2 和 6 各节省 67% 时间
3. **更好的示例**：可直接参考的调用代码，降低使用门槛

---

## [3.1.0] - 2025-12-22

### 💡 重大改进 (Major Improvements)

#### 🎯 融入官方 Agent 调用最佳实践

基于 [Anthropic 官方 feature-dev](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/feature-dev/commands/feature-dev.md) 的 agent 调用原则，提升工作流质量和效率。

**核心改进**：
1. **Agent 文件返回机制** - Agents 返回关键文件列表，主进程亲自阅读建立深度理解
2. **多方案设计和权衡分析** - Phase 4 提供备选方案并说明权衡，尊重用户选择
3. **询问用户决策** - Phase 6 不自动修复，而是向用户展示问题并询问如何处理

### ✨ 新增 (Added)

#### Phase 2: 代码库探索
- **Agent 输出要求** - 每个 agent 必须返回 5-10 个关键文件路径
- **文件返回机制** - 新增"Agent 输出要求"章节，说明为什么需要文件列表
- **主进程读取步骤** - 新增"读取 Agent 识别的文件"章节，明确读取流程
- **整合理解指导** - 强调基于亲自阅读的文件形成综合理解

#### Phase 4: 架构设计
- **code-architect 必须使用** - 从"可选"改为"必须"，增加"为什么必须使用"说明
- **Agent 输出要求** - architect 必须返回 5-10 个关键架构文件
- **整合分析步骤** - 综合 ultrathink + architect + 文件阅读形成最终方案
- **多方案设计章节** - 新增完整的多方案设计指导（最小改动/清晰架构/实用平衡）
  - 方案对比表格（开发时间/代码质量/可维护性/扩展性/风险）
  - 向用户展示方案的模板
  - 询问用户选择的流程
- **单方案设计说明** - 简单功能使用单方案，但仍需说明理由

#### Phase 6: 质量审查
- **整合和分类步骤** - 新增去重、分类、标注的详细步骤
- **向用户展示并询问决策** - 完整的用户决策流程
  - 展示格式模板（按严重性分类的问题列表）
  - 4 个选项（A/B/C/D）供用户选择
  - 等待用户回应的要求
  - 根据用户决策执行的 3 种场景
- **修复策略调整** - 从"自动修复"改为"基于用户决策"

#### Agent 文件更新
- **code-explorer.md**:
  - 输出要求第一项改为"关键文件清单（5-10 个）"
  - 输出格式开头增加关键文件清单章节
  - 添加文件选择标准说明
- **code-architect.md**:
  - 核心使命增加"必须返回 5-10 个关键架构参考文件"要求
  - 输出要求第一项改为"关键架构文件清单"
  - 输出格式开头增加关键架构文件清单章节
  - 添加文件选择标准说明
  - 增加"备选方案（如适用）"输出要求
- **code-reviewer.md**:
  - 核心使命增加"必须标注严重性和置信度"要求
  - 新增"严重性分类"章节（高/中/低三级）
  - 输出格式按严重性分类（高🔴/中🟡/低🟢）
  - 每个问题同时显示严重性和置信度

### 🔧 改进 (Changed)

#### skills/skill.md 主文件
- **Phase 2 执行要点** - 5 步详细流程，强调文件返回和读取
- **Phase 4 执行要点** - 5 步详细流程，architect 必须使用，支持多方案设计
- **Phase 4 产出** - 增加 ultrathink 分析、architect 建议、备选方案等
- **Phase 6 执行要点** - 5 步详细流程，增加询问用户决策环节
- **Phase 6 修复策略** - 改为"基于用户决策"

#### skills/references/phase-2-exploration.md
- 修改"汇总探索结果"章节结构：
  - 1. 收集 Agent 报告
  - 2. **读取 Agent 识别的文件**（新增）
  - 3. 整合发现（基于 agent 报告 + 亲自阅读的文件）

#### skills/references/phase-4-design.md
- 修改"可选：code-architect Agent"为"必须使用：code-architect Agent"
- 更新 architect prompt，增加"返回 5-10 个关键架构参考文件"要求
- 新增"Agent 输出要求"和"读取 Architect 推荐的文件"章节
- 新增"整合分析"步骤说明

#### skills/references/phase-6-review.md
- 修改"汇总审查结果"章节：
  - 2. 整合发现 → 2. 整合和分类（增加详细步骤）
  - 新增 3. 向用户展示并询问决策
- 修改"处理审查结果"的修复策略为"基于用户决策"

### 📊 改进统计

| 改动类型 | 文件数 | 改动量 | 关键改进 |
|---------|-------|--------|----------|
| 新增章节 | 3 | ~250 行 | Agent 调用最佳实践 |
| 修改执行要点 | 1 | ~60 行 | 3 个阶段优化 |
| Agent 输出要求 | 3 | ~80 行 | 文件返回机制 |
| **总计** | **7** | **~390 行** | **3 大核心原则** |

### 🎓 设计理念

**从官方学到的精华**：
1. **Agent 是探索者，不是执行者** - Agents 负责识别关键文件，主进程负责阅读和理解
2. **给用户选择权** - 提供多个方案和权衡分析，让用户做决策
3. **询问而不是假设** - Phase 6 询问用户如何处理问题，而不是自动修复

**保留的创新**：
- ✅ MCP 工具集成（context7、exa、sequential-thinking）
- ✅ ultrathink 深度分析
- ✅ 置信度标准（≥80%）- 比官方更科学
- ✅ 严重性分类（高/中/低）- 结合官方和自己的优势
- ✅ 中文交互和自动触发

### 🙏 致谢

感谢 [Anthropic 官方 feature-dev](https://github.com/anthropics/claude-plugins-official) 提供的优秀 agent 调用模式和最佳实践。

---

## [3.0.1] - 2025-12-22
 -  agent 调用修复

## [3.0.0] - 2025-12-19

### 💥 破坏性变更 (Breaking Changes)

- **Skill 结构重大重构** - 采用 Progressive Disclosure Pattern
  - 原因：优化上下文使用，提高加载效率
  - 影响：skill 目录结构发生变化，新增 references/ 和 assets/ 目录
  - 迁移：所有变更向后兼容，无需用户操作

### 重大改进 (Major Improvements)

#### 🏗️ 架构重构 - Progressive Disclosure Pattern

- **重构主文件**: 将 449 行的单体 skill.md 重构为 382 行的模块化结构（减少 34%）
- **新增 references/ 目录**: 创建 10 个按需加载的参考文档
  - `mcp-tools.md` - MCP 工具详细说明和降级策略
  - `phase-1-discovery.md` - 需求理解阶段详细指南
  - `phase-2-exploration.md` - 代码库探索阶段详细指南
  - `phase-3-clarify.md` - 澄清问题阶段详细指南
  - `phase-4-design.md` - 架构设计阶段详细指南
  - `phase-5-implement.md` - 实施阶段详细指南
  - `phase-6-review.md` - 质量审查阶段详细指南
  - `phase-7-summary.md` - 总结阶段详细指南
  - `troubleshooting.md` - 故障排查和常见问题
  - `quick-reference.md` - 快速参考清单
- **新增 assets/ 目录**: 创建输出模板资源
  - `output-template.md` - 统一的阶段输出格式模板
- **优化加载策略**: 只有主 skill.md 始终加载，references 和 assets 按需加载

#### 🔄 工作流控制机制 (Workflow Control)

- **新增工作流控制章节**: 在 skill.md 中添加完整的工作流状态管理机制
- **阶段声明要求**: 每个阶段开始和结束必须输出标准化的阶段标记
  ```markdown
  ---
  ## 🚀 当前阶段：[X] - [阶段名称]
  ---
  ```
- **用户输入继续机制**: 明确规定收到用户输入后如何继续当前阶段，避免流程中断
  - 确认收到输入 → 处理输入 → 继续当前阶段 → 不跳出 skill
- **强制检查点**: 明确规定阶段 3→4 和阶段 4→5 必须等待用户确认
- **禁止跳跃**: 明确禁止从阶段 3 直接到阶段 5，或在未确认架构时开始实施

#### 🎯 实施方案强制要求

- **phase-4-design.md 重大更新**: 将实施步骤从"可选"改为"必须产出"
- **新增强制标记**: 使用 ⚠️ 标记和"必须产出，不是可选项"强调
- **明确最低要求**:
  - 至少 5-10 个详细步骤（根据功能复杂度）
  - 每步必须包含：具体任务、预期产出、验证方式
  - 步骤必须详细到可以直接执行
  - 步骤必须按依赖关系排序
- **新增示例格式**: 提供完整的 8 步实施计划示例

#### 🌍 语言无关化 (Language-Agnostic)

- **移除所有特定语言代码**: 删除所有 Go、Java、Python 等语言特定示例
- **替换为结构化描述**: 使用树状结构描述实体、服务、API
  - Before: `type Dashboard struct { ID uint \`gorm:"primaryKey"\` }`
  - After: `Entity: Dashboard ├─ 字段: │ ├─ id: 主键，自增整数`
- **框架占位符**: 使用通用占位符替代特定框架名
  - `GORM` → `[ORM]`
  - `Gin` → `[Web 框架]`
  - `React` → `[前端框架]`
- **通用文件路径**: 移除 `.go`、`.java` 等扩展名，使用描述性说明
  - `models/dashboard.go` → "实体文件（在数据层目录）"
- **通用依赖引用**:
  - `go.mod` → "项目依赖配置文件（如 package.json, requirements.txt, go.mod, pom.xml）"
  - `vendor/github.com/gin-gonic/gin` → "已安装库的文档文件"

### ✨ 新增 (Added)

#### skill.md 主文件
- 新增"工作流控制"完整章节（81 行）
- 新增阶段标记规范和模板
- 新增用户输入处理流程
- 新增强制检查点列表
- 新增禁止操作清单
- 改进触发条件描述，列举 5 个具体场景
- 保留 `/feat-dev [功能描述]` 手动触发方式

#### phase-3-clarify.md
- 新增"继续工作流"章节，明确用户反馈后的流程
- 新增禁止操作清单（禁止跳过阶段 4、禁止直接到阶段 5）
- 新增标准化的阶段继续输出格式

#### phase-4-design.md
- 新增"实施步骤（必须产出）"专门章节
- 新增完整的 8 步实施计划示例
- 新增步骤格式要求和验证标准
- 新增"等待用户确认"流程说明
- 新增三种用户反馈场景的处理方式
- 完全重写实体和 API 设计示例（语言无关化）

#### quick-reference.md
- 新增"工作流控制要点"作为文档首部
- 新增阶段标记模板
- 新增强制检查点列表
- 新增禁止跳跃规则

#### output-template.md
- 新增完整的 7 个阶段输出模板
- 每个阶段包含阶段标记和完成标记
- 统一输出格式和结构

### 🔧 改进 (Changed)

#### 所有 phase 文档
- 统一阶段标记格式
- 统一输出模板结构
- 改进 MCP 工具使用说明
- 改进降级策略描述

#### mcp-tools.md
- 更新所有示例查询为通用格式
- 移除特定框架名称
- 使用占位符 [Web 框架]、[ORM]、[前端框架]

#### phase-2-exploration.md
- 移除 `.go` 文件扩展名
- 使用通用的文件描述
- 更新 code-explorer agent 提示词模板

#### phase-5-implement.md
- 批量替换语言特定术语为通用术语
- 更新所有代码示例为伪代码或结构化描述
- 通用化文件路径和命令示例

#### phase-6-review.md
- 更新安全检查清单为通用格式
- 移除特定语言的安全问题描述
- 使用通用的代码质量标准

#### troubleshooting.md
- 移除特定语言的故障排查示例
- 使用通用的问题描述和解决方案
- 更新依赖文件引用为通用格式

### 📝 文档 (Documentation)

- 添加详细的工作流控制说明
- 增强实施步骤的要求和示例
- 改进 MCP 工具使用指南
- 完善故障排查文档
- 新增快速参考清单

### ⚡ 性能优化 (Performance)

- 主文件大小减少 34%（449 → 382 行）
- 按需加载机制减少不必要的上下文占用
- 模块化结构提高可维护性

### 🧹 技术债务清理 (Technical Debt)

- 移除所有硬编码的语言和框架名称
- 统一所有阶段的输出格式
- 规范化所有工具使用说明
- 标准化所有降级策略描述

### 📦 迁移指南

**从 v2.0.0 升级到 v3.0.0**：

#### 结构变化
- 主文件 `skills/skill.md` 保持在同一位置
- 新增 `skills/references/` 目录（10 个文件）
- 新增 `skills/assets/` 目录（1 个文件）

#### 行为变化
1. **工作流控制**：现在会输出阶段标记，用于状态跟踪
2. **用户输入处理**：收到用户输入后会明确继续当前阶段，不会中断流程
3. **实施计划**：阶段 4 现在强制要求输出详细实施步骤（5-10 步）
4. **语言无关**：所有示例都是通用的，适用于任何编程语言和框架

#### 无需用户操作
- ✅ 所有变更都向后兼容
- ✅ 用户体验保持一致
- ✅ 功能增强是透明的

### 🙏 致谢

感谢用户反馈帮助识别关键问题：
- 实施方案强制要求的重要性
- 工作流中断问题的根因
- 语言无关化的必要性

这些反馈直接推动了 3.0.0 版本的重大改进。

---

## [2.0.0] - 2025-12-17

### 💥 破坏性变更 (Breaking Changes)

- **移除插件内置 `.mcp.json` 配置文件**
  - 原因：彻底避免与用户全局配置的 MCP 重复安装问题
  - 影响：依赖插件自动 MCP 配置的用户需要在全局配置中手动安装
  - 迁移：参见 README 中的"推荐配置（最佳体验）"章节

- **移除 SessionStart hook 和 `scripts/` 目录**
  - 原因：简化架构，提升跨平台兼容性
  - 影响：会话启动时不再自动检查 MCP 配置
  - 替代：使用 `/check-mcp` 命令手动检查配置状态

### ✨ 新增 (Added)

- **MCP 智能降级方案** - Skill 在 MCP 不可用时自动使用备用工具
  - context7 不可用 → WebSearch + 项目依赖分析
  - exa 不可用 → WebSearch
  - sequential-thinking 不可用 → EnterPlanMode + 思维链分析

- **100% 跨平台兼容性**
  - 完全移除 Bash 脚本依赖
  - 支持 Windows（CMD、PowerShell、Git Bash）
  - 支持 macOS（所有终端）
  - 支持 Linux（所有主流终端）
  - 支持 WSL

- **MCP 可选化设计**
  - 所有功能在无 MCP 环境下完全可用
  - 提供清晰的"快速开始"和"最佳体验"两种使用路径
  - 详细的使用体验对比表格

### 🔧 改进 (Changed)

- 完全重写 README.md 的 MCP 配置章节
  - 强调 MCP 是可选的（推荐但不必需）
  - 提供完整的全局配置示例（Windows 路径说明）
  - 添加智能降级策略说明
  - 添加跨平台支持说明

- 更新 plugin.json
  - 版本号升级至 2.0.0
  - 移除 SessionStart hook 配置
  - 添加 "cross-platform" 关键词

- 优化目录结构
  - 移除 `.mcp.json`
  - 移除 `scripts/` 目录
  - 简化至核心组件

### 📝 文档 (Documentation)

- 新增 MCP 工具降级策略表格
- 新增使用体验对比表格（有/无 MCP）
- 新增跨平台支持说明
- 更新"与官方 feat-dev 的区别"对比表
- 添加 Windows 用户的特别说明（路径、环境变量）

### 🎯 设计理念变更

从 **"MCP 必需，冲突时优先级处理"** 转变为 **"MCP 可选，降级时功能完整"**

这个设计理念的转变使插件：
- 更容易上手（零配置即可使用）
- 更可靠（不依赖外部服务）
- 更灵活（用户自主选择是否使用 MCP）
- 更简洁（无外部脚本依赖）

### 📦 迁移指南

**从 v1.1.0 升级到 v2.0.0**：

1. **如果您使用全局 MCP 配置**：
   - ✅ 无需任何操作，直接升级即可

2. **如果您依赖插件的 .mcp.json**：
   - ⚠️ 需要手动将 MCP 配置添加到全局配置 `~/.claude.json`
   - 📖 配置示例见 README 的"推荐配置"章节

3. **如果您不使用 MCP**：
   - ✅ 无需任何操作，降级方案自动生效

---

## [1.1.0] - 2025-12-17

### ✨ 新增 (Added)
- 添加 SessionStart hook，会话启动时自动检查 MCP 配置状态
- 新增 `/check-mcp` 命令，手动查看 MCP 配置详情和状态
- 智能 MCP 冲突检测和处理机制
- 完善 MCP 依赖管理文档，包含详细的配置说明和常见问题解答
- 创建 `scripts/check-mcp-setup.sh` - 自动检测脚本
- 创建 `commands/check-mcp.md` - MCP 配置检查斜杠命令

### 🔧 改进 (Changed)
- 利用 Claude Code 作用域优先级机制自动处理 MCP 重复问题
- 添加详细的 MCP 配置说明（3 种配置方式）
- 友好的彩色终端输出和提示信息
- 更新项目目录结构文档

### 🔨 技术细节 (Technical)
- 更新 `plugin.json` 添加 SessionStart hooks 配置
- 使用 `${CLAUDE_PLUGIN_ROOT}` 环境变量确保路径正确性
- 实现环境变量检测（CONTEXT7_API_KEY、EXA_API_KEY）
- Bash 脚本支持彩色输出和错误处理

### 📝 文档 (Documentation)
- 新增 "MCP 依赖管理" 章节到 README
- 添加 MCP 配置常见问题解答
- 说明 Claude Code 作用域优先级机制
- 提供配置方式对比和建议

---

## [1.0.0] - 2025-12-17

### ✨ 新增 (Added)
- 🎉 7 阶段功能开发工作流
  - 阶段 1: 需求理解 (Discovery)
  - 阶段 2: 代码库探索 (Codebase Exploration)
  - 阶段 3: 澄清问题 (Clarifying Questions)
  - 阶段 4: 架构设计 (Architecture Design)
  - 阶段 5: 实施 (Implementation)
  - 阶段 6: 质量审查 (Quality Review)
  - 阶段 7: 总结 (Summary)
- 🤖 3 个专门化 Agent
  - `code-explorer` - 深度分析代码库，追踪执行路径
  - `code-architect` - 设计架构蓝图，制定实施方案
  - `code-reviewer` - 代码审查，识别 bug 和规范问题
- 🧠 集成 ultrathink 深度分析（Sequential Thinking）
- 🔌 MCP 工具增强
  - `context7` - 获取最新库文档和 API 参考
  - `exa` - 高质量网页搜索和代码示例
  - `sequential-thinking` - 深度结构化思考
- 🌐 完整的中文支持和输出
- ⚡ 并行 Agent 执行能力
- 🎯 自动触发机制（通过 skill）
- 📝 `/feat-dev` 斜杠命令

### 🎯 特性 (Features)
- 语言无关 - 适用于任何编程语言和项目结构
- 灵活的模型配置（Sonnet/Opus）
- 支持复杂度判断的智能 ultrathink 使用
- 完整的 MCP 服务器配置（.mcp.json）

---

## 版本说明

### 版本号格式
遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)：

- **主版本号（MAJOR）**：不兼容的 API 修改
- **次版本号（MINOR）**：向下兼容的功能性新增
- **修订号（PATCH）**：向下兼容的问题修正

### 更新类型

- **新增 (Added)**：新功能
- **改进 (Changed)**：对现有功能的变更
- **弃用 (Deprecated)**：即将删除的功能
- **移除 (Removed)**：已删除的功能
- **修复 (Fixed)**：任何 bug 修复
- **安全 (Security)**：安全相关的修复

---

[5.1.0]: https://github.com/FlameMida/spec-dev/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/FlameMida/spec-dev/compare/v4.2.0...v5.0.0
[4.2.0]: https://github.com/FlameMida/feat-dev/compare/v4.1.0...v4.2.0
[4.1.0]: https://github.com/FlameMida/feat-dev/compare/v4.0.0...v4.1.0
[4.0.0]: https://github.com/FlameMida/feat-dev/compare/v3.1.2...v4.0.0
[3.1.2]: https://github.com/FlameMida/feat-dev/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/FlameMida/feat-dev/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/FlameMida/feat-dev/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/FlameMida/feat-dev/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/FlameMida/feat-dev/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/FlameMida/feat-dev/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/FlameMida/feat-dev/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/FlameMida/feat-dev/releases/tag/v1.0.0
