# 第三期：编排方法论增强（预计 1–2 周）

> 返回总览：[README.md](./README.md)
> 本期目标：把 Workflow 的编排方法论（契约化输出、对抗复核、枯竭循环、失败隔离、覆盖声明、声明式控制流）内化为 skill 自己的纪律。**实现形态 = prompt 层伪代码 + 确定性校验脚本**（设计决策 D1/D2），不调用 Workflow 工具，Claude Code 与 Codex 跑同一套编排逻辑。
> 执行顺序：T3.1→T3.2 是地基必须最先；T3.3/T3.4/T3.5 三个关口改造可交错；T3.7–T3.10 runtime 系列一组；T3.11–T3.16 收尾。

## 任务状态表

| ID | 任务 | 状态 | 完成日期 |
|----|------|------|----------|
| T3.1 | 编排基建：validate-output.mjs 契约校验器 | ✅ | 2026-06-12 |
| T3.2 | 定义 4 类输出契约 schema | ✅ | 2026-06-12 |
| T3.3 | 阶段 8 重写为伪代码编排（对抗复核+枯竭循环） | ⬜ | — |
| T3.4 | spec-flow accept 重写为伪代码编排 | ⬜ | — |
| T3.5 | browser-qa Layer 2 重写（证据契约+串行复核） | ⬜ | — |
| T3.6 | deep 档：judge panel + multi-modal sweep | ⬜ | — |
| T3.7 | runtime: checkpoint 增加 --evidence | ⬜ | — |
| T3.8 | runtime: 新增 doctor 子命令 | ⬜ | — |
| T3.9 | runtime: 小修集（百分比校验/summary-path/时区/并发声明） | ⬜ | — |
| T3.10 | journal 化：编排状态入 progress.json | ⬜ | — |
| T3.11 | 互操作：spec-flow accept ↔ browser-qa 取证 | ⬜ | — |
| T3.12 | 互操作：requirement-analysis → spec-flow 升级出口 | ⬜ | — |
| T3.13 | 建立 evals（每 skill 3–5 个测试用例） | ⬜ | — |
| T3.14 | description 触发优化（browser-qa 优先） | ⬜ | — |
| T3.15 | browser-qa 前置检测脚本化 detect-env.mjs | ⬜ | — |
| T3.16 | 第三期收尾：同步 + 校验 + CHANGELOG + 看板 | ⬜ | — |

---

### T3.1 编排基建：validate-output.mjs 契约校验器 ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 3h　**依赖**: 无
- **目标文件**: 新建 `scripts/validate-output.mjs`、新建 `scripts/schemas/` 目录
- **设计意图**: 这是对 Workflow「schema 校验发生在工具层而非模型自觉」的最忠实复刻——子代理的 JSON 输出落盘后由脚本做**确定性校验**，失败退回补全，而不是靠主进程模型目测。
- **改动步骤**:
  1. 实现 CLI：`node scripts/validate-output.mjs <schema-name> <json-file>`
     - 从 `scripts/schemas/<schema-name>.json` 加载契约定义
     - 校验逻辑（不引第三方依赖，手写校验器，与 runtime.mjs 同风格）：必填字段存在性、类型（string/number/array/enum）、数组 minItems/maxItems、数值范围、枚举值
     - 输出契约对齐 runtime：成功 `{ok:true, schema, file}`；失败 `{ok:false, schema, file, errors:[{path, expected, actual}]}` + 非零退出码
  2. schema 文件格式用 JSON Schema 子集（type/required/properties/enum/minimum/maximum/minItems/maxItems 即可，不实现完整规范）。
  3. 编写 `scripts/schemas/README.md`：说明 schema 子集范围、新增 schema 的步骤、skill 中的引用方式（`${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs`，沿用 T1.1 的占位符惯例与 Codex 注意事项）。
  4. 自测：构造 1 个合法 + 3 个非法（缺字段/类型错/枚举外）样例 JSON 跑通。
- **注意事项**: 校验器放插件根 `scripts/`（三 skill 共用，避免三份拷贝）；skill 内引用统一走 `${CLAUDE_PLUGIN_ROOT}`。若 T1.1 验证发现 Codex 不支持该占位符，本任务沿用 T1.1 记录的转换方案。
- **验收标准**:
  - [x] 4 个自测样例行为正确（1 过 3 拦，错误信息含字段路径：`$.name` 缺字段 / `$.score` 类型错 / `$.severity` 枚举外）
  - [x] 无第三方依赖，`node scripts/validate-output.mjs` 缺参时输出用法说明（exit 2）
  - [x] schemas/README.md 完整说明引用方式（含 `${CLAUDE_PLUGIN_ROOT}` 用法与 Codex 推导说明）
  - 备注：发现并修复双环境缺口——sync-codex-package.mjs 的 generatedEntries 原不含 scripts/，Codex 分发包会缺校验器；已加 `scripts/validate-output.mjs` 与 `scripts/schemas` 两个同步条目，`--codex-validate` 官方安装检查通过。校验器额外支持嵌套 object/array 的递归校验（T3.2 的 4 个契约都是嵌套结构，properties/items 递归是必需能力）。

---

### T3.2 定义 4 类输出契约 schema ✅

- **状态**: ✅ 完成（2026-06-12）　**预估**: 2h　**依赖**: T3.1
- **目标文件**: 新建 `scripts/schemas/exploration-report.json`、`review-findings.json`、`acceptance-findings.json`、`browser-check-items.json`
- **改动步骤**: 按下表定义 4 个 schema（字段名最终以实现为准，语义不变）：
  1. **exploration-report**（探索报告，code-explorer 输出）：
     ```
     keyFiles:       array(5..10) of {path, reason}     # 必填
     entryPoints:    array of {location, description}   # location 格式 file:line
     patterns:       array of {name, appliedWhere}
     dependencies:   {internal: array, external: array}
     risks:          array of string
     coverage_note:  string                              # 必填，"未探索的范围及原因"或"无"
     ```
  2. **review-findings**（审查发现，code-reviewer 输出）：
     ```
     findings: array of {
       file: string, line: number,
       severity: enum[高,中,低], confidence: number(0..100),
       category: enum[Bug,安全,性能,规范,质量,建议],
       description: string, fix_suggestion: string
     }
     coverage_note: string                               # 必填
     ```
  3. **acceptance-findings**（验收发现，spec-acceptance-reviewer 输出）：
     ```
     result: enum[pass, changes_required, blocked]
     coverage: array of {spec_item, status: enum[pass,fail,partial], evidence}
     findings: array of {severity: enum[CRITICAL,MAJOR,MINOR,SUGGESTION],
                         description, evidence, suggested_action}
     accepted_risks: array of {finding_ref, accepted_by, reason}   # 配合 T3.4 定义"已接受的 MAJOR"
     coverage_note: string
     ```
  4. **browser-check-items**（浏览器验收项，Layer 2 输出）：
     ```
     items: array of {
       check: string, ops: string,                       # 检查项与操作序列
       result: enum[pass, warn, fail, unverified],       # unverified = 无证据降级
       evidence_ref: string,                             # snapshot 摘录或截图文件名；result≠unverified 时必填语义在 skill 文档约束
       notes: string
     }
     ```
  5. 每个 schema 中 `coverage_note` 一律必填——这是「no silent caps」模式的落点：截断必须显式声明。
- **验收标准**:
  - [x] 4 个 schema 均能被 validate-output.mjs 加载并正确校验对应正反样例（8 样例实测：4 正例过、4 反例拦截，反例覆盖 minItems 违反/缺 coverage_note/confidence 超界/枚举外/嵌套必填缺失）
  - [x] 每个 schema 含 coverage_note 必填项（browser-check-items 在 items 之外补顶层 coverage_note）
  - [x] schemas/README.md 列出 4 个契约的用途与消费方

---

### T3.3 阶段 8 重写为伪代码编排 ⬜

- **状态**: ⬜ 待办　**预估**: 2.5h　**依赖**: T3.1、T3.2、T2.5（维度已对齐）
- **目标文件**: `skills/requirement-analysis/SKILL.md`（阶段 8）、`skills/requirement-analysis/references/parallel-patterns.md`
- **设计意图**: 散文式流程改为**伪代码控制流**（模型遵循 `repeat/if/for` 的可靠性远高于叙述段落），并落入 6 个编排模式：fan-out 纪律、输出契约+补全重试、pipeline 优先、loop-until-dry（seen 去重）、对抗复核分级、覆盖声明 + completeness critic。
- **改动步骤**:
  1. SKILL.md 阶段 8 正文替换为以下底稿（按 T2.2 后的行文风格微调）：
     ````markdown
     ### 阶段 8 编排（按伪代码执行；每个编排动作前用一句话告知用户进度）

     DIMENSIONS = 按 T2.5 对齐后的维度表选取（light: [A]；standard: [A,B,C]；deep: 5 路）
     seen = []        # 已见发现集合（含被否决的），按 file:line+category 去重

     repeat (最多 2 轮):
       # fan-out：单条消息内并行派出全部维度（每维度一个 code-reviewer 子代理）
       #          分批发起会退化为串行，丧失并行收益
       reports = parallel for d in DIMENSIONS:
           Agent(code-reviewer, 范围=本次变更, 维度=d,
                 输出=review-findings 契约 JSON，落盘到临时目录)
       # 校验：每份报告落盘后运行
       #   node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs review-findings <file>
       #   失败 → 把错误清单发回该子代理补全一次；再失败 → 主进程接管该维度
       # pipeline 优先：单维度报告校验通过即可进入复核，无需等齐所有维度——
       #   仅去重需要跨维度信息时才等待（barrier 判定标准）
       fresh = dedupe(所有 findings, against=seen)
       if fresh 为空: break          # loop-until-dry：枯竭即停
       seen += fresh                  # 注意：复核否决的也留在 seen，防止下轮重现
       # 对抗复核：仅 severity ∈ {高, 中}，每条派 1 个独立子代理，指令为
       #   "试图反驳此发现：给出 file:line 证据证明它不成立或属误报；
       #    无法证实存在即判误报"
       confirmed += [f for f in fresh if 复核(f) == 成立]

     # completeness critic（1 个子代理）：
     #   "对照本次变更文件清单与维度表，哪些文件/风险面没有被任何发现覆盖？
     #    哪些维度的 coverage_note 声明了截断？" → 输出并入报告"覆盖声明"节
     失败隔离：某维度子代理失败 → 缩小该维度范围重试 1 次 → 仍失败则主进程接管
     该维度，其余维度流水线不受影响。
     最后：按 output-template 输出报告（confirmed 按严重性分组 + 覆盖声明），
     向用户征求处理方式（保持既有规则：先确认再修复）。
     ````
  2. parallel-patterns.md 的「阶段 8: 并行深度审查」节改为指向 SKILL.md 伪代码 + 补充 Codex 形态说明（spawn_agent 串行复核版，对抗复核降级为单 critic）。
  3. 删除被伪代码取代的旧散文步骤（执行步骤 1–5 列表）。
- **验收标准**:
  - [ ] 阶段 8 正文为伪代码形态，含全部 6 个模式（逐一核对：fan-out 单响应/契约校验重试/枯竭判据/seen 去重语义/复核分级/completeness critic + 覆盖声明）
  - [ ] 复核否决项留在 seen 的注释存在（防不收敛的关键细节）
  - [ ] 在一个含 2+ 真实问题的 diff 上试跑：发现→复核→报告全链路走通，报告含覆盖声明
  - [ ] Codex 降级路径在 parallel-patterns.md 有对应说明

---

### T3.4 spec-flow accept 重写为伪代码编排 ⬜

- **状态**: ⬜ 待办　**预估**: 2.5h　**依赖**: T3.1、T3.2、T2.6（reviewer 已升档）
- **目标文件**: `skills/spec-flow/references/action-accept.md`、`agents/spec-acceptance-reviewer.md`（输出契约对齐）、`skills/spec-flow/assets/acceptance-report-template.md`（加 accepted_risks 节）
- **设计意图**: 验收是 pass/changes_required 的关口决策，当前为单 agent 单轮判定。引入**双向对抗**：skeptic 杀误报（findings 复核）+ coverage critic 抓漏报（声称覆盖但无证据），同时定义清楚悬空的「未接受的 MAJOR」语义。
- **改动步骤**:
  1. action-accept.md 的 Do 节替换为伪代码：
     ````markdown
     ## Acceptance 编排

     输入 = spec.md + plan.md + 产物 + progress.json 中的 evidence（T3.7 落地后）

     1. findings = Agent(spec-acceptance-reviewer, 输入,
                         输出=acceptance-findings 契约 JSON 落盘)
        校验: validate-output.mjs acceptance-findings <file>
              失败 → 退回补全一次 → 再失败 blocked（理由：验收输出不可靠）
     2. 对抗复核（仅 CRITICAL 与 MAJOR）:
        for f in findings.findings where severity in {CRITICAL, MAJOR}:
            verdict = Agent(独立复核, "试图反驳：给出证据证明该问题不存在或不影响
                            spec 条目；无法证实即维持原判")
            被反驳成立 → 从 findings 移除并记录到复核日志
     3. coverage critic（1 个子代理，方向与 skeptic 相反——查漏报）:
        "逐条检查 coverage 中 status=pass 的 spec 条目：evidence 是否真实支撑？
         哪些条目没有出现在 coverage 里？" → 不达标条目降级为 partial/fail
     4. 结论规则（保持现有）: 无 CRITICAL 且无未接受的 MAJOR 且核心条目全覆盖 → pass
        - "已接受的 MAJOR" 定义：用户在对话中明确表示接受该风险的 MAJOR finding，
          记入报告 accepted_risks（finding 引用、接受人=user、理由）；
          未走此流程的 MAJOR 一律视为未接受
     5. 用最终 findings 填 acceptance-report-template.md（新增 Accepted Risks 节）
     6. node .specs/bin/spec-flow.mjs accept --spec-id ... --result ... --report-path ...
     ````
  2. spec-acceptance-reviewer.md 的 Output Format 节改为：「最终输出同时给出 markdown 报告与 acceptance-findings 契约 JSON（JSON 为机器消费源，markdown 由 JSON 渲染）」。
  3. acceptance-report-template.md 在 Findings 与 Coverage Check 之间插入 `## Accepted Risks` 节。
  4. 降级路径写明：环境不支持子代理委派时（SKILL.md 第 53 行既有规则），单线程模拟时复核步骤改为"主进程换一个反驳视角自查每条 CRITICAL/MAJOR"，并在报告注明"复核为同线程模拟"。
- **验收标准**:
  - [ ] action-accept.md 为伪代码形态，含 skeptic（杀误报）与 coverage critic（抓漏报）双向
  - [ ] 「已接受的 MAJOR」有完整定义闭环（用户确认 → accepted_risks 记录 → 结论规则引用）
  - [ ] 模板含 Accepted Risks 节；reviewer agent 输出契约对齐
  - [ ] 在一个测试 spec 上完整试跑 accept，三种结果（pass/changes_required/blocked）的状态流转与 runtime 写入正确

---

### T3.5 browser-qa Layer 2 重写（证据契约 + 串行复核） ⬜

- **状态**: ⬜ 待办　**预估**: 2h　**依赖**: T3.1、T3.2、T2.9（证据强制已落）
- **目标文件**: `skills/browser-qa/SKILL.md`（Layer 2 节）
- **设计意图**: 在 T2.9 证据强制的基础上补对抗复核，针对 AI 验收的幻觉风险。**硬约束 D5：单浏览器有状态会话，检查执行与复核全部串行**，对抗性体现在"换一个不信任原结论的视角重新操作"，不体现在并行。
- **改动步骤**:
  1. Layer 2 执行流程替换为伪代码：
     ````markdown
     #### Layer 2 编排（全程串行——Playwright MCP 是单浏览器会话，并行驱动会互相破坏状态）

     checklist = 定制检查项(3-6 条，来自目标描述) + 适用的通用项     # T2.9 已落地
     results = []
     for item in checklist:                       # 串行逐项
         执行 item.ops（browser_navigate/click/type/fill_form...）
         取证: browser_snapshot 关键片段 或 截图文件名
         results += {check, ops, result, evidence_ref, notes}
         # 无证据 → result 只能是 unverified（不允许无证据的 pass）

     落盘 browser-check-items 契约 JSON → validate-output.mjs 校验 → 失败补全一次

     # 对抗复核（仍串行，同一浏览器）：仅 result ∈ {fail, warn} 的项
     for item in results where result in {fail, warn}:
         以"不信任原结论"的视角重新执行 item.ops 一次:
           - 原判 fail → 尝试证明功能其实正常（操作时序/选择器问题？）
           - 复现成功 → 维持原判并补第二份证据；复现失败 → 降级为 warn 并注明不稳定
     # pass 项默认不复核（成本控制）；用户要求"严格验收"时抽查 2 项 pass
     ````
  2. Step 3 报告模板增加「复核」列（维持/降级/翻案 + 第二份证据引用）。
  3. 「注意事项-不要做的事」追加一条：「不要并行驱动浏览器：多个子代理同时操作同一 Playwright MCP 会话会互相破坏页面状态（单实例硬约束）」。
- **验收标准**:
  - [ ] Layer 2 为伪代码形态；串行约束在编排开头与"不要做的事"两处显式声明
  - [ ] fail/warn 必复核、pass 默认不复核的分级规则明确
  - [ ] 契约 JSON 落盘 + 校验步骤存在
  - [ ] 在示例页面试跑：制造一个真实 fail 项，验证复核环节产出第二份证据

---

### T3.6 deep 档：judge panel + multi-modal sweep ⬜

- **状态**: ⬜ 待办　**预估**: 2h　**依赖**: T2.3（档位已落）、T2.4（architect 已接入）
- **目标文件**: `skills/requirement-analysis/SKILL.md`（阶段 2、阶段 5 的 deep 分支）、`skills/requirement-analysis/references/parallel-patterns.md`
- **改动步骤**:
  1. **阶段 2 deep 档 = multi-modal sweep**（替换"按架构层次分解"的单一策略）：
     ```
     deep 档探索：3-4 个 code-explorer 各持一个模态、彼此盲扫:
       模态1 按入口追踪（API/UI/CLI 入口 → 调用链）
       模态2 按数据流（实体/存储 → 读写路径）
       模态3 按配置与约定（规范文件、DI、构建配置）
       模态4 按测试用例（测试反推行为契约；项目无测试则跳）
     每个 agent 输出 exploration-report 契约 → 校验 → 主进程合并去重
     standard 档保留现有按层次/模块分解（2-3 agent）
     ```
  2. **阶段 5 deep 档 = judge panel**：
     ```
     2-3 个 code-architect 并行、各持一个优先级视角独立出蓝图:
       视角A 风险最小化（最小改动、最大复用）
       视角B 长期可维护（理想分层，允许更大重构）
       视角C 交付速度（MVP 路径）        # 时间敏感需求才派第3个
     主进程评分维度: 与现有模式一致性 / 风险面 / 实施成本 / 可测试性
     从最高分方案合成，吸收落选方案的可取局部，记录评分依据进阶段 6 展示
     ```
  3. parallel-patterns.md 增补两个模式的何时使用/不使用（light/standard 禁用 judge panel——多方案对小需求是浪费）。
- **验收标准**:
  - [ ] deep 档两个模式有完整伪代码与触发边界（仅 deep）
  - [ ] 模态分解不再绑定"数据层/服务层/API 层"的后端假设（前端/CLI/库项目同样适用）
  - [ ] judge panel 的评分维度与合成规则明确（不是简单三选一）

---

### T3.7 runtime: checkpoint 增加 --evidence ⬜

- **状态**: ⬜ 待办　**预估**: 1.5h　**依赖**: 无（建议在 T3.4 前完成以便其消费）
- **目标文件**: `skills/spec-flow/assets/runtime/spec-flow-runtime.mjs`、`skills/spec-flow/references/command-contract.md`、`skills/spec-flow/references/action-implement.md`
- **设计意图**: journal 思想——实施时积累证据，验收时直接消费，消除 implement 与 accept 之间的证据断层。
- **改动步骤**:
  1. runtime `handleCheckpoint` 支持可重复参数 `--evidence "<desc>::<path-or-command>"`（如 `--evidence "B.3 单测通过::npm test 输出见 .specs/active/<id>/evidence/b3-test.txt"`），解析后 append 到 `progress.evidence[]`：`{step: currentStep, desc, ref, at: ISO时间}`。
  2. `baseProgress` 初始化 `evidence: []`；多次传参支持（parseArgs 需扩展为同 key 多值收集，注意不破坏现有单值参数行为）。
  3. command-contract.md 的 checkpoint 节补充 `--evidence` 说明与示例。
  4. action-implement.md 的 Do 节第 3 步补充：「step 涉及可验证产物（测试/命令/构建）时，将输出存入 `.specs/active/<id>/evidence/` 并在 checkpoint 时用 `--evidence` 登记——accept 阶段直接消费，避免重复收集」。
- **验收标准**:
  - [ ] `node .specs/bin/spec-flow.mjs checkpoint --spec-id X --evidence "a::b" --evidence "c::d"` 后 progress.json 含 2 条 evidence 记录
  - [ ] 不传 --evidence 时行为与现状完全一致（回归：现有 checkpoint 用例不破坏）
  - [ ] 两个 reference 文档已更新

---

### T3.8 runtime: 新增 doctor 子命令 ⬜

- **状态**: ⬜ 待办　**预估**: 3h　**依赖**: 无
- **目标文件**: `skills/spec-flow/assets/runtime/spec-flow-runtime.mjs`、`skills/spec-flow/references/command-contract.md`、`skills/spec-flow/references/recovery-rules.md`
- **问题**: recovery-rules.md 列出 4 类不一致（registry 有 spec 但目录缺失 / progress 与 registry 的 action 不一致 / 验收报告路径存在但文件缺失 / 归档目录与 registry 路径不一致），但 runtime 没有检测修复命令，修复全靠模型手改文件——违背"永远不要手改 registry/progress"的自立规矩。
- **改动步骤**:
  1. 实现 `doctor`（只读检查）：遍历 registry 与 `.specs/active|archive` 实际目录，输出 `{ok, issues:[{specId, type, detail, suggestedFix}]}`；检查项覆盖 recovery-rules 的 4 类 + 孤儿目录（目录存在但 registry 无记录）+ progress.json 缺失/损坏。
  2. 实现 `doctor --fix`（仅安全修复）：孤儿目录 → 按 progress.json 重建 registry 条目；registry/progress 字段不一致 → 以 progress.json 为准回写 registry（progress 更接近执行现场）；**目录缺失、文件损坏类不自动修**，输出人工处理建议。
  3. command-contract.md 增加 doctor 节；recovery-rules.md 的 Repair Rule 改为「先运行 `doctor` 获取问题清单与建议，安全项用 `doctor --fix`，其余按建议人工处理」。
- **验收标准**:
  - [ ] 手工构造 4 类不一致场景，doctor 全部检出且 suggestedFix 合理
  - [ ] `doctor --fix` 只修安全项（验证：目录缺失场景不被自动"修复"）
  - [ ] 两个 reference 文档已更新

---

### T3.9 runtime: 小修集 ⬜

- **状态**: ⬜ 待办　**预估**: 1.5h　**依赖**: 无
- **目标文件**: `skills/spec-flow/assets/runtime/spec-flow-runtime.mjs`、`skills/spec-flow/references/command-contract.md`
- **改动步骤**（4 个独立小修，一次提交）:
  1. **completionPercent 校验**：`handleCheckpoint` 中超出 0–100 直接报错（与 ensureEnum 同风格），不静默 clamp——静默修正会掩盖调用方 bug。
  2. **summary-path 落实**：`handleArchive` 当提供 `--summary-path` 时校验文件存在（不存在则报错"先生成 archive-summary.md 再归档"）；该文件若在 spec 目录内随 rename 自然迁移，返回值中的 summaryPath 改为迁移后真实路径。
  3. **时区一致**：spec-id 的 `localDateStamp` 保持本地日期（用户直觉），在 command-contract.md 注明「spec-id 日期为本地时区，createdAt 等时间戳为 UTC ISO」，消除歧义而非强行统一。
  4. **并发声明**：command-contract.md 末尾加「Concurrency」节：「runtime 无文件锁，设计为单会话顺序调用；多会话并行写同一 `.specs/` 可能丢失更新，跨会话场景先 `status` 确认无其他活跃会话」。
- **验收标准**:
  - [ ] `checkpoint --completion-percent 150` 报错退出
  - [ ] `archive --summary-path 不存在的路径` 报错；存在时返回迁移后路径
  - [ ] command-contract.md 含时区说明与 Concurrency 节

---

### T3.10 journal 化：编排状态入 progress.json ⬜

- **状态**: ⬜ 待办　**预估**: 2h　**依赖**: T3.7
- **目标文件**: `skills/spec-flow/assets/runtime/spec-flow-runtime.mjs`、`skills/spec-flow/references/recovery-rules.md`、`skills/requirement-analysis/references/task-list-management.md`
- **设计意图**: Workflow 的 journal/resume 思想——派发过的子任务及结果位置持久化，断点恢复后**不重派已完成的 fan-out**。
- **改动步骤**:
  1. runtime checkpoint 支持 `--dispatch "<id>::<task-desc>::<status>::<result-path>"`（可重复），写入 `progress.orchestration.dispatched[]`；status ∈ {running, done, failed}。
  2. `handleResume` 返回值增加 `pendingDispatch`（status≠done 的子任务清单）。
  3. recovery-rules.md 的 Resume Output 增补：「存在 orchestration.dispatched 时，已 done 的子任务直接读取 result-path 复用结果，仅重派 running/failed 项」。
  4. requirement-analysis 侧（无 runtime）：task-list-management.md 的断点恢复节增补轻量版——「fan-out 前把子任务清单与预期落盘路径写入任务列表 metadata（或临时目录 manifest.json），恢复时先查结果文件是否已存在，存在即复用」。
- **验收标准**:
  - [ ] checkpoint 写入 dispatched、resume 返回 pendingDispatch（构造 2 done + 1 failed 场景验证）
  - [ ] 两份文档的恢复规则均含"不重派已完成子任务"
  - [ ] 不使用编排的旧流程完全不受影响（不传 --dispatch 时 progress 结构不变）

---

### T3.11 互操作：spec-flow accept ↔ browser-qa 取证 ⬜

- **状态**: ⬜ 待办　**预估**: 1h　**依赖**: T3.4、T3.5
- **目标文件**: `skills/spec-flow/references/action-accept.md`、`skills/browser-qa/SKILL.md`（最终汇总报告节）
- **改动步骤**:
  1. action-accept.md 在「Acceptance 编排」第 1 步前插入前置判断：「spec.md 的验收标准含 UI/页面/交互/浏览器类条目时，先建议运行 browser-qa（Layer 2，必要时 +Layer 1）收集证据，报告与截图存入 `.specs/active/<id>/evidence/browser/`，再进入验收编排——浏览器证据由专门工作流收集比验收 agent 临时操作更可靠」。
  2. browser-qa 最终汇总报告节增加输出约定：「若由 spec-flow accept 触发，报告文件落盘到调用方指定的 evidence 目录并回传路径（而非仅打印对话中）」。
- **验收标准**:
  - [ ] 双向引用成立：accept 知道何时调 browser-qa，browser-qa 知道如何回交证据
  - [ ] 措辞为"建议运行"而非硬依赖（browser-qa 未安装/不适用时 accept 仍可走通）

---

### T3.12 互操作：requirement-analysis → spec-flow 升级出口 ⬜

- **状态**: ⬜ 待办　**预估**: 45min　**依赖**: T2.3
- **目标文件**: `skills/requirement-analysis/SKILL.md`（阶段 6 末尾）
- **改动步骤**:
  1. 阶段 6 用户确认后增加升级判断：
     ```
     满足任一 → 建议切换 spec-flow:
       - 实施预计跨多个会话（步骤多/依赖外部等待）
       - 用户要求正式验收、变更留痕或归档
     升级动作: 提示用户运行 /spec-flow plan，并将阶段 1-6 产出
     （需求摘要、关键文件、澄清结论、技术设计、实施步骤）整理为 spec.md/plan.md
     初稿——分析成果直接成为 spec 的探索与方案章节，不重做。
     用户拒绝升级 → 按原流程继续阶段 7。
     ```
  2. 与 README「如何选择」一节口径核对（不一致处以本任务为准更新 README）。
- **验收标准**:
  - [ ] 升级判定条件客观；上下文迁移映射明确（阶段产出 → spec 章节）
  - [ ] README 选择指南与之一致

---

### T3.13 建立 evals（每 skill 3–5 个测试用例） ⬜

- **状态**: ⬜ 待办　**预估**: 3h　**依赖**: 第二期完成（评测的是新结构）
- **目标文件**: 新建 `skills/requirement-analysis/evals/evals.json`、`skills/spec-flow/evals/evals.json`、`skills/browser-qa/evals/evals.json`
- **问题**: `validate-skills.mjs` 只做结构校验；三个 skill 从未做过行为评测（skill-creator 核心循环），不知道实际增益与失效场景。
- **改动步骤**:
  1. 按 skill-creator 的 evals.json 格式（skill_name/evals[]/id/prompt/expected_output/files）各写 3–5 个**真实感** prompt（含具体文件路径、口语化表述），覆盖：
     - requirement-analysis：light 档小需求、standard 档多模块需求、模糊需求（考察澄清行为）
     - spec-flow：init+explore 新任务、中断后 resume（考察恢复精度）、accept 一个有缺陷的产物（考察 findings 质量）
     - browser-qa：Layer 1 生成（考察契约遵循）、Layer 2 验收（考察证据强制）、意图推断（无前缀请求路由正确性）
  2. expected_output 写可判定的行为描述（如"light 档全程 ≤2 次提问""每个验收项含 evidence_ref"）。
  3. 暂不写 assertions（按 skill-creator 流程，运行期再补）；本任务先建基线用例库。
- **验收标准**:
  - [ ] 三个 evals.json 共 9–15 个用例，prompt 具备真实感（非抽象指令）
  - [ ] 每个用例的 expected_output 可客观判定
  - [ ] 用 skill-creator 流程对其中至少 3 个用例跑一轮 with-skill 运行，确认用例本身可执行

---

### T3.14 description 触发优化（browser-qa 优先） ⬜

- **状态**: ⬜ 待办　**预估**: 2h（含后台优化循环等待）　**依赖**: T2.8
- **目标文件**: `skills/browser-qa/SKILL.md`（frontmatter），可选扩展到另两个 skill
- **改动步骤**:
  1. 按 skill-creator 的 Description Optimization 流程：生成 20 条 trigger evals（8–10 should-trigger 含口语/错别字变体；8–10 should-not-trigger 用 near-miss——"跑一下单元测试""测一下这个接口""写个 vitest 用例"这类共享关键词但不该触发的）。
  2. 与用户过一遍 eval 集（HTML 审核页）→ 运行 `run_loop.py` 优化循环（后台）→ 取 best_description 回填 frontmatter。
  3. requirement-analysis 与 spec-flow 的触发竞争（"复杂功能开发"双匹配）作为第二批：在两者 description 中互写排他条件（需持久化/验收/归档 → spec-flow；一次性分析 → requirement-analysis），是否跑完整优化循环视第一批效果决定。
- **验收标准**:
  - [ ] browser-qa 新 description 的 held-out 测试分不低于旧版，且 near-miss 误触发率下降
  - [ ] 优化前后 description 与分数记录在本任务条目下
  - [ ] requirement-analysis / spec-flow 的互斥条件已写入（至少手工版）

---

### T3.15 browser-qa 前置检测脚本化 detect-env.mjs ⬜

- **状态**: ⬜ 待办　**预估**: 1.5h　**依赖**: 无
- **目标文件**: 新建 `skills/browser-qa/scripts/detect-env.mjs`、`skills/browser-qa/SKILL.md`（前置检查节）
- **设计意图**: D2 分层——环境检测是纯机械操作，脚本一次跑完输出 JSON，替代模型多回合探查（每次触发省 3–5 个工具调用）。
- **改动步骤**:
  1. 实现 `node <skill-base>/scripts/detect-env.mjs [--cwd <project>]`，输出：
     ```json
     { "ok": true,
       "node_project": true, "package_manager": "npm|pnpm|yarn|none",
       "playwright_config": "playwright.config.ts|null",
       "playwright_installed": true, "test_dir": "tests|e2e|__tests__|null",
       "suggestions": ["..."] }
     ```
     （MCP 连接状态无法从脚本探测，仍由模型在会话内确认——脚本只管文件系统可判定项。）
  2. SKILL.md 前置检查节改为：「运行 detect-env.mjs（skill base directory 下相对路径），按 JSON 结果走分支；脚本不可用时退回手工检测清单（保留现有清单为降级路径）」。
- **验收标准**:
  - [ ] 在有/无 playwright 配置的两个项目实测输出正确
  - [ ] SKILL.md 引用使用 skill 相对路径（scripts/ 在 skill 目录内，随 skill 分发）
  - [ ] 手工检测清单保留为降级路径

---

### T3.16 第三期收尾：同步 + 校验 + CHANGELOG + 看板 ⬜

- **状态**: ⬜ 待办　**预估**: 1h　**依赖**: T3.1–T3.15
- **改动步骤**:
  1. 三个校验命令全跑（同 T1.10）；`validate-skills.mjs` 确认新增的 scripts/schemas/evals 不破坏结构校验。
  2. 端到端验证：spec-flow 完整生命周期（init→explore→plan→implement(含 evidence)→accept(含对抗复核)→archive）跑一个小型真实任务。
  3. CHANGELOG 记录第三期（编排方法论内化的设计决策 D1–D5 摘要 + 任务清单）。
  4. 更新总览看板，勾选 M3、M4；回顾"不建议做清单"确认未越界。
- **验收标准**:
  - [ ] 校验全过；端到端生命周期走通且 acceptance-report 含复核与覆盖声明
  - [ ] CHANGELOG 完整；看板 M3/M4 勾选
