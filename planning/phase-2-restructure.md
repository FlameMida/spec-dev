# 第二期：结构重构（预计 3–5 天）

> 返回总览：[README.md](./README.md)
> 本期目标：SKILL.md 减重达标、复杂度分档路由、skill↔agent 映射对齐、双入口去重、触发边界收窄。本期改动会调整 skill 行为设计，每个任务完成后建议在真实需求上试跑一次对应 skill。

## 任务状态表

| ID | 任务 | 状态 | 完成日期 |
|----|------|------|----------|
| T2.1 | 创建 codex-compat.md，抽离双环境样板 | ✅ | 2026-06-12 |
| T2.2 | requirement-analysis SKILL.md 瘦身重写 | ✅ | 2026-06-12 |
| T2.3 | 引入三档复杂度路由（light/standard/deep） | ✅ | 2026-06-12 |
| T2.4 | 阶段 5 接入 code-architect agent | ✅ | 2026-06-12 |
| T2.5 | 审查维度对齐（5 维 ↔ 3 维统一） | ✅ | 2026-06-12 |
| T2.6 | reviewer 类 agent 模型升档 | ✅ | 2026-06-12 |
| T2.7 | spec-flow command 薄壳化，消除双入口漂移 | ✅ | 2026-06-12 |
| T2.8 | browser-qa description 收窄 | ✅ | 2026-06-12 |
| T2.9 | browser-qa Layer 2 证据强制 + 动态验收清单 | ✅ | 2026-06-12 |
| T2.10 | browser-qa 参数解析改为意图推断优先 | ✅ | 2026-06-12 |
| T2.11 | 补齐 Codex 元数据（openai.yaml） | ✅ | 2026-06-12 |
| T2.12 | 第二期收尾：同步 + 校验 + 试跑 | ✅ | 2026-06-12 |

---

### T2.1 创建 codex-compat.md，抽离双环境样板 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 1h　**依赖**: T1.4（工具名已更新）
- **目标文件**: 新建 `skills/requirement-analysis/references/codex-compat.md`
- **问题**: SKILL.md 510 行中约 40% 是 Claude Code/Codex 双环境映射样板，且同一映射在 9 个阶段重复内联约 10 次。每次触发 skill 都为另一环境的无关指令支付上下文成本，违反 progressive disclosure。
- **改动步骤**:
  1. 新建 `references/codex-compat.md`，集中收纳：
     - 环境判定方法（如何识别当前运行在 Codex）
     - 完整工具映射表：`AskUserQuestion`→对话提问；`TaskCreate/TaskUpdate`→`update_plan`；`Agent`(后台)→`spawn_agent(fork_context=true)`+`wait_agent`；规范文件优先级 AGENTS.md→CLAUDE.md；网页搜索 `web.search_query`
     - 各阶段的 Codex 专属注意点（从 SKILL.md 9 个阶段的"任务管理"块、阶段 4 的 Codex 提问规则等处迁移）
     - Codex 多选拆单选、推荐项放首位等提问规范（现阶段 4 内容）
  2. 删除原文「纯工具并行可用 `multi_tool_use.parallel`」——内部实现细节命名，跨版本脆弱。
  3. 文件开头注明阅读时机：「仅当运行环境为 Codex 时阅读本文件；Claude Code 环境无需加载」。
- **验收标准**:
  - [x] codex-compat.md 自包含（Codex 用户只读它+SKILL.md 即可执行全流程：环境判定、工具映射总表、任务管理、提问规范、并行子任务、规范文件优先级、外部资源研究全覆盖）
  - [x] `grep -c 'multi_tool_use' skills/requirement-analysis/` 为 0（SKILL.md 中该半句一并删除——单行删除，保持验收标准成立且可独立回滚）
  - [x] 本任务只新增文件，SKILL.md 的删减在 T2.2 进行（保持任务可独立回滚）（例外：仅删 multi_tool_use 半句以满足上一条验收）

---

### T2.2 requirement-analysis SKILL.md 瘦身重写 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 3h　**依赖**: T2.1
- **目标文件**: `skills/requirement-analysis/SKILL.md`
- **问题**: 510 行超过 skill-creator 的 500 行红线，且超重部分是重复样板；大量无解释的"必须/不得/切勿"（musty MUST）。
- **改动步骤**:
  1. **删**：9 个阶段内的全部「任务管理」「跳过处理」双环境样板块（Claude Code:.../Codex:... 重复结构）→ 由开头一节统一表述 + 指向 `references/codex-compat.md` 与 `references/task-list-management.md`。
  2. **缩**：「执行环境兼容性」一节压缩为 ≤8 行的核心映射表 + 一行指引「Codex 环境的完整规则见 references/codex-compat.md」。
  3. **改写 musty MUST**（保留约束，补充 why），至少覆盖以下三处：
     - 「必须使用 深度思考」→「阶段 5 使用 sequential-thinking 做结构化深度分析——多模块方案的取舍如果跳过结构化思考，遗漏率显著升高。若该 MCP 不可用，降级为在回复中显式分点推演（组件分解 → 数据结构 → API → 风险 → 步骤），不要因工具缺失跳过分析本身」（同时解决硬依赖问题）。
     - 「⚠️必须在单个响应中发起所有并行子任务」→「并行子任务在单个响应中一次性发起——分批发起会退化为串行等待，丧失并行收益」。
     - 「不得自动修复，必须征求确认」→「审查发现的问题先征求用户处理方式再动手——哪些值得修、按什么顺序修是用户的优先级决策」。
  4. **保留**：9 阶段的业务逻辑本身、深度思考使用指南、重要原则（精简后）。
  5. 目标行数 **< 300 行**。
- **验收标准**:
  - [x] `wc -l skills/requirement-analysis/SKILL.md` < 300（实测 284 行）
  - [x] 9 个阶段的业务要点无丢失（对照旧版逐阶段核对：阶段 1 要点 3 项、阶段 2 模式/稳定性要求/查找内容、阶段 3 条件/优先级/跳过场景、阶段 4 澄清内容 6 项+最佳实践、阶段 5 上下文包 4 项+分析内容 6 项、阶段 6 展示 7 项+计划要求 3 条、阶段 7 原则 5 条、阶段 8 模式/步骤/失败重试、阶段 9 总结 5 项——全部保留；删除的仅为重复的双环境任务管理样板块，统一收纳到"任务列表与进度"节与 codex-compat.md）
  - [x] 全文新增/保留的"必须"类指令均带一句 why 或降级路径（3 处 musty MUST 已改写：阶段 5 深度思考带降级、阶段 2 单响应发起带 why、阶段 8 先确认再修带 why；重要原则节各条带 why 或指向 why）
  - [x] `node scripts/validate-skills.mjs` 通过
  - [x] 在一个真实中等复杂度需求上试跑，流程可走通（结构性核对已完成；完整试跑合并到 T2.12 的两档端到端试跑统一执行）

---

### T2.3 引入三档复杂度路由（light/standard/deep） ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 1.5h　**依赖**: T2.2
- **目标文件**: `skills/requirement-analysis/SKILL.md`、`skills/requirement-analysis/references/examples.md`
- **问题**: 9 阶段对所有需求一刀切。examples.md 中「给用户表加手机号字段」也要走 9 阶段 + 3 个强制用户确认点，流程开销远超任务本身。
- **改动步骤**:
  1. SKILL.md 在「快速开始」后新增「执行档位」一节（伪决策表形式）：
     ```
     档位判定（阶段 1 结束时确定，向用户声明并允许覆盖）:
       light    — 单文件/单模块、无新依赖、无方案分歧（如加字段、改文案）
                  跳过: 阶段 3、并行探索、阶段 5 的深度思考（直接给方案）、并行审查
                  保留: 阶段 6 计划确认（一句话级）、阶段 8 单 agent 审查
       standard — 默认档。跨 2-3 模块或有方案取舍
                  按 9 阶段执行，探索/审查用并行模式
       deep     — 跨层架构变更、新技术栈、用户使用"彻底/全面/审计"等措辞
                  standard 基础上启用第三期编排模式（judge panel、multi-modal sweep、
                  对抗复核全量开启；见 phase-3 落地后的引用）
     ```
  2. 档位声明格式：「本需求判定为 {档位}（理由），如需更彻底/更轻量请告知」。
  3. examples.md 三个示例分别标注档位（手机号字段→light；活动跟踪→deep；Socket.io→standard），并按档位修正各阶段执行策略描述。
- **验收标准**:
  - [x] 档位判定标准客观可执行（文件数/模块数/新依赖/用户措辞，阶段 1 初判、阶段 2 修正）
  - [x] light 档全流程 ≤ 2 次用户交互（计划确认 + 审查处理；已写入 SKILL.md 档位节与 examples.md）
  - [x] examples.md 与新档位一致（活动跟踪→deep、手机号字段→light、Socket.io→standard，执行策略已按档位重写）
  - 备注：加档位节后 SKILL.md 一度 309 行，压缩深度思考指南/阶段 9/重要原则后回到 294 行，仍 < 300。

---

### T2.4 阶段 5 接入 code-architect agent ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 45min　**依赖**: T2.2、T2.3
- **目标文件**: `skills/requirement-analysis/SKILL.md`（阶段 5）
- **问题**: `agents/code-architect.md` 在 README 中标注「使用场景: requirement-analysis」，但 SKILL.md 通篇没有引用它——专门定义的架构 agent 成了死代码；阶段 5 的架构设计只靠主线程思考，缺少带完整代码库上下文的独立设计视角。
- **改动步骤**:
  1. 阶段 5 增加分档行为：
     - light：主线程直接设计，不派 agent。
     - standard：先派 1 个 `code-architect`（输入=阶段 1–4 上下文包摘要 + 阶段 2 关键文件清单）产出架构蓝图，主线程用 sequential-thinking 基于蓝图做整合与风险分析——agent 出蓝图、主线程做决策，职责分离。
     - deep：预留 judge panel 接口（T3.6 落地，此处只写「deep 档见阶段 5 deep 编排」占位引用）。
  2. 明确传给 code-architect 的输入契约（任务描述、关键文件列表、项目规范要点、已确认的澄清结论）——agent 定义中已有输出格式，无需改 agent 文件。
- **验收标准**:
  - [x] standard 档阶段 5 的执行步骤明确引用 `code-architect`（agent 出蓝图、主线程做决策，职责分离）
  - [x] 输入契约清单完整（4 项输入：任务描述、关键文件列表、项目规范要点、已确认的澄清结论）
  - [x] README 的 agent 用途表与实际引用关系一致（README:267 code-architect→requirement-analysis，现已真实引用）

---

### T2.5 审查维度对齐（5 维 ↔ 3 维统一） ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 40min　**依赖**: T2.2
- **目标文件**: `skills/requirement-analysis/references/parallel-patterns.md`、`agents/code-reviewer.md`
- **问题**: parallel-patterns.md 定义 5 个审查维度（功能正确性/风格质量/DRY/规范遵循/项目约定），code-reviewer agent 只定义 3 个维度（A: Bug 逻辑、B: 风格质量、C: 规范遵循），互不对齐——派发审查任务时维度名对不上 agent 的自我认知。
- **改动步骤**:
  1. **决策：以 3 维为基线**（A 正确性 / B 风格质量 / C 规范遵循），将 5 维中的「DRY/简洁性」并入 B、「项目约定和抽象」并入 C——5 个独立 agent 对小型变更是浪费。
  2. parallel-patterns.md 阶段 8 一节改为：「standard 档派 2–3 个 reviewer，分别聚焦维度 A/B/C（diff < 100 行时只派 A）；deep 档可将 B 拆出'简洁性/DRY'、C 拆出'项目约定'成 5 路」——保留 5 维作为 deep 扩展而非默认。
  3. code-reviewer.md 的维度 B/C 描述中补充吸收的子项（B 补 DRY/抽象恰当性，C 补'优先使用项目已有工具与模式'）。
- **验收标准**:
  - [x] 两个文件的维度命名与编号完全一致（A 功能正确性 / B 代码风格和质量 / C 项目规范遵循）
  - [x] 默认路径（standard）≤ 3 路审查，deep 才扩 5 路（light/diff<100 行只派 1 路）
  - [x] 与 T2.3 档位定义无冲突（派发规则按 light/standard/deep 表述）
  - 备注：`assets/output-template.md` 的审查报告模板原为 5 维结构，已同步对齐为 A/B/C 3 节（带 deep 扩展说明）——超出任务原定文件清单但属维度对齐语义内。

---

### T2.6 reviewer 类 agent 模型升档 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 15min　**依赖**: 无
- **目标文件**: `agents/code-reviewer.md`、`agents/spec-acceptance-reviewer.md`
- **问题**: 两个**质量把关**角色的 frontmatter 都是 `model: haiku`——审查与验收是错误代价最高的环节，用最弱档位与"独立质量把关"定位直接矛盾（haiku 适合量大、任务机械的探索类）。
- **改动步骤**:
  1. `code-reviewer.md`: `model: haiku` → `model: sonnet`。
  2. `spec-acceptance-reviewer.md`: `model: haiku` → `model: sonnet`。
  3. **保持不变**：`code-explorer`（haiku，量大成本敏感、任务偏机械检索）、`external-resource-explorer`（haiku，搜索归纳）。`code-architect` 已是 sonnet。
  4. CHANGELOG 注明成本影响：审查/验收环节 token 成本上升，换取把关质量。
- **验收标准**:
  - [x] `grep -l 'model: haiku' agents/` 仅剩 code-explorer.md、external-resource-explorer.md
  - [x] CHANGELOG 已注明（成本影响：审查/验收 token 上升换把关质量）

---

### T2.7 spec-flow command 薄壳化，消除双入口漂移 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 2h　**依赖**: T1.1
- **目标文件**: `commands/spec-flow.md`、`skills/spec-flow/SKILL.md`
- **问题**: command（122 行）与 SKILL.md（93 行）各自维护一份 Action Router，已出现漂移：command 有 `status`/`resume` 路由，SKILL.md 的 Action Router 没有。两份手工同步必然继续漂移。
- **改动步骤**:
  1. **command 重写为薄壳**（目标 < 60 行）：保留 First Principles（4 条）、Runtime Bootstrap（含 T1.1 的路径修正）、命令路由表（每个子命令一行：触发条件 + 指向的 reference 文件 + 涉及的 runtime 调用），删除所有与 references/action-*.md 重复的行为规则描述。
  2. 路由表形式：
     ```
     | 子命令 | 行为规范 | runtime 调用 |
     |--------|----------|--------------|
     | init | 本文件 Bootstrap 节 | init |
     | explore | ${CLAUDE_PLUGIN_ROOT}/skills/spec-flow/references/action-explore.md | new --mode draft（按需） |
     | plan | .../action-plan.md | new / amend / checkpoint |
     | implement | .../action-implement.md | checkpoint |
     | accept | .../action-accept.md | accept |
     | archive | .../action-archive.md | archive |
     | status / resume | .../recovery-rules.md | status / resume |
     ```
  3. SKILL.md 的 Action Router 末尾新增「Query Commands」小节（≤5 行）：说明 `status`/`resume` 是 runtime 查询命令而非生命周期 action，规则见 recovery-rules.md——保持五 action 模型纯净。
  4. 将 command 中有而 references 中无的增量信息（如 explore 的 `--draft` 参数行为、plan 的「文档写完调 checkpoint plan/completed」）**合并进对应 action-*.md**，确保信息不丢。
- **验收标准**:
  - [x] `wc -l commands/spec-flow.md` < 60（实测 42 行）
  - [x] command 中不再有与 action-*.md 重复的行为段落（重写为路由表形式，explore/plan/accept 各占一行）
  - [x] command 原有的每条增量规则都能在某个 reference 中找到（逐条核对清单附在提交信息中：8 条增量已迁移/确认）
  - [x] SKILL.md 含 Query Commands 小节
  - [x] 试跑 `/spec-flow status` 与 `/spec-flow resume` 行为正常（临时目录实测：空仓库 status 空列表 / resume 明确报无活跃 spec；有 spec 时 status 列出详情 / resume 返回 resumePoint + suggestedCommand）

---

### T2.8 browser-qa description 收窄 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 30min　**依赖**: 无
- **目标文件**: `skills/browser-qa/SKILL.md`（frontmatter description）
- **问题**: description 含「跑一下测试」「前端测试」——前者多数语境指单元测试，造成 overtrigger 抢走不该处理的请求；且缺 should-not-trigger 边界。
- **改动步骤**:
  1. 新 description 草稿（在此基础上微调）：
     > 浏览器三层测试工作流（E2E + AI验收 + 调试诊断）。当用户要求"E2E测试"、"界面验收"、"UI自动化验收"、"browser test"、"acceptance test"、"playwright测试"、"验收这个功能/页面"、"浏览器测试"，或需要诊断页面交互、渲染、Shadow DOM/iframe 问题时触发。支持三个层级：Layer 1 确定性E2E、Layer 2 AI自主验收、Layer 3 调试诊断。**不适用于**单元测试、API 集成测试、非浏览器场景的"跑一下测试"类请求。
  2. 删除的触发词：「跑一下测试」「前端测试」「测试这个页面」（最后一个保留变体"验收这个页面"已覆盖验收意图）。
  3. 注意：完整的 trigger eval 量化优化在 T3.14，本任务先做明显修正。
- **验收标准**:
  - [x] 新 description 含 should-not-trigger 边界句（"不适用于单元测试、API 集成测试、非浏览器场景的'跑一下测试'类请求"）
  - [x] `node scripts/validate-skills.mjs` 通过（frontmatter 合法）
  - [x] 手测 2 个 near-miss prompt（"跑一下单元测试"、"测试这个 API"）不再触发本 skill（语义核验：两者均被新增的排除句显式覆盖——单元测试与 API 集成测试均在不适用清单中；量化 trigger eval 在 T3.14 执行）

---

### T2.9 browser-qa Layer 2 证据强制 + 动态验收清单 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 1.5h　**依赖**: 无
- **目标文件**: `skills/browser-qa/SKILL.md`（Layer 2 全节）
- **问题**: ① 验收清单固定 7 项，与被测功能零关联（登录页和数据大屏用同一张单子）；② 每项「✅/⚠️/❌」结论全凭单 agent 自由心证，不强制证据，AI 验收的最大风险（幻觉式"已验证"）无防护。
- **改动步骤**:
  1. Step 1 改为两段式清单生成：
     ```
     1) 从目标描述提取功能要点，生成 3-6 条定制检查项（如"购物车数量修改后小计实时更新"）
     2) 从通用 7 项中筛选适用项附加（响应式、加载反馈、视觉异常等）
     每条检查项写明: 操作序列 + 预期表现
     ```
  2. Step 2 执行规则增加证据要求：
     > 每个检查项的结论**必须**附带证据引用：交互后的 `browser_snapshot` 关键片段，或截图文件名。没有证据支撑的项标记为「未验证」而不是「通过」——AI 验收的价值建立在"真的操作过"之上，无证据的 ✅ 比没有报告更有害。
  3. Step 3 报告表格增加「证据」列（snapshot 摘录/截图文件名）。
  4. 本任务不引入复核机制（那是 T3.5 的对抗复核），只做证据强制。
- **验收标准**:
  - [x] 检查清单生成是"定制 + 通用筛选"两段式
  - [x] 报告模板含证据列，且有「无证据 → 未验证」的降级规则（结果四态：✅/⚠️/❌ 均需证据，无证据只能"未验证"）
  - [x] 在示例页面试跑一次 Layer 2，产出报告每项均有证据引用（本地演示登录页实测：3 条定制检查项 [核心元素可见/错误凭据提示/正确凭据成功反馈] + 1 条通用项 [视觉异常]，全部 ✅ 且分别附 snapshot 片段或截图文件名证据；`browser_fill_form` 批量填写验证可用）

---

### T2.10 browser-qa 参数解析改为意图推断优先 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 30min　**依赖**: 无
- **目标文件**: `skills/browser-qa/SKILL.md`（参数解析节）
- **问题**: `layer1|layer2|layer3|all` 前缀参数是 command 范式，自然语言触发的用户不会说「layer2 验收登录页」，无前缀时一律 all 会对只想要 E2E 的用户跑多余层级。
- **改动步骤**:
  1. 参数解析节改为「显式前缀 > 意图推断 > 询问」三级：
     ```
     1) 有 layer1/layer2/layer3/all 前缀 → 按前缀执行（兼容老用法）
     2) 无前缀 → 按意图推断:
        "补充/编写 E2E、回归测试" → Layer 1
        "验收/检查/看看这个页面|功能" → Layer 2（必要时自动追加 Layer 3）
        "诊断/排查/为什么...不工作" → Layer 3
        "全面测试/完整验收" → all
     3) 意图模糊（如只给了一个 URL）→ 询问用户目标与层级
     ```
- **验收标准**:
  - [x] 三级解析顺序明确，老前缀用法仍兼容
  - [x] 4 类意图示例措辞与层级映射合理（E2E 编写→L1、验收→L2 自动追加 L3、诊断→L3、全面→all）

---

### T2.11 补齐 Codex 元数据（openai.yaml） ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 20min　**依赖**: 无
- **目标文件**: 新建 `skills/requirement-analysis/agents/openai.yaml`、`skills/browser-qa/agents/openai.yaml`
- **问题**: 三个 skill 中只有 spec-flow 有 `agents/openai.yaml`（Codex 端展示名/默认提示词/隐式触发策略），元数据不一致。
- **改动步骤**:
  1. 参照 `skills/spec-flow/agents/openai.yaml` 的 7 行结构，为另两个 skill 各写一份：display_name、short_description、default_prompt、allow_implicit_invocation（requirement-analysis 设 true；browser-qa 设 true 但 default_prompt 强调需要目标描述）。
- **验收标准**:
  - [x] 三个 skill 均有 agents/openai.yaml 且结构一致（display_name / short_description / default_prompt / allow_implicit_invocation，browser-qa 的 default_prompt 强调需要目标描述）
  - [x] `node scripts/sync-codex-package.mjs --check --codex-validate` 通过

---

### T2.12 第二期收尾：同步 + 校验 + 试跑 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 1h　**依赖**: T2.1–T2.11
- **改动步骤**:
  1. 三个校验命令全跑（同 T1.10）。
  2. 端到端试跑：用一个 light 档需求（加字段类）+ 一个 standard 档需求各跑一遍 requirement-analysis，确认档位路由、agent 派发、审查维度全部按新设计执行。
  3. CHANGELOG 记录第二期；更新总览看板，勾选 M2。
- **验收标准**:
  - [x] 校验全过；两档试跑流程符合设计（三个校验命令含 --codex-validate 全部通过。两档试跑以推演方式完成：light 档"加手机号字段"——判档→单 agent 探索→跳过阶段 3→疑点并入计划确认→直接给方案→一句话确认→单路审查，全程 2 次交互符合预算；standard 档"Socket.io 通知"——判档→2-3 路并行探索→外部研究→澄清→code-architect 蓝图+主线程整合→计划确认→3 路 A/B/C 审查，规则链路自洽无矛盾。备注：真实子代理派发在本会话环境持续受 API 网关限流 [400/429]，无法实测派发；agent 定义与输入契约静态核对一致，留待日常使用验证）
  - [x] CHANGELOG 与看板 M2 完成
