# major-upgrade 验收报告

- 特性:`.spec-dev/2026-08-26-01-major-upgrade/`(spec: major-upgrade-design.md,plan: major-upgrade-plan.md,28 任务 T0-T27)
- 执行:worktree `plan/2026-08-26-01-major-upgrade`(基线 main@469d121)
- 验收日期:2026-08-26
- 编排:executing-plans 收尾审查(5 路维度 fan-out + 对抗复核 + completeness critic,20 子代理/507 工具调用/约 1.01M tokens)+ 用户裁决修复(R1-R9,10 提交)+ 受影响维度复审(进行中,结论见文末)

## 验收矩阵执行结果(T26 矩阵 13 行)

| Scenario / 检查项 | 维度 | 结果 | 证据 |
|---|---|---|---|
| 既有平台装载不回归 | integration | ✅(结构级;重装升级见已知限制) | validate-skills 13/13(skill 结构合法);Codex 校验链在 pre-commit `check-plugin --codex-validate` 每次通过(Plugin package checks passed / Official Codex CLI install check passed);**Claude Code 端的"升级后重装"未实测**——验收会话加载的是插件缓存版(非本仓库 HEAD),真实升级装载待 `/plugin` 更新后的下次会话确认(见已知限制) |
| 官方 AP schema 校验 | integration | ✅(修复后) | T26 修复:官方 schema 落盘 `scripts/schemas/agent-plugin-1.0.0.json`、plugin.json 按 const 修正($schema 指向 plugin.schema.json、删 schema 外 skills 键);R2 补 const/pattern/maxLength/additionalProperties 后判别约束真实生效,`ok:true` 退出码 0;坏 manifest 四场景回归测试(validate-keywords.test.mjs 2/2) |
| pi 装载发现 skills / grok 兼容清单走查 | integration | ✅(文档走查级) | pi.dev 官方文档(https://pi.dev/docs/latest/packages、badlogic-pi-mono docs)证实 `package.json` 的 `pi` manifest 与 `pi.skills` 字段格式一致;grok 按官方声明零配置复用 `.claude-plugin/`(README 平台矩阵标注 official claim)。**证据等级:文档走查,无实机环境** |
| MCP 残留引用为零 | integration | ✅(修复后) | T26 修复 README 双语 4 处(/check-mcp 引用、.mcp.json 目录树行)后,验收 rg 命令零命中 |
| 四命令全绿 | integration | ✅ | validate-skills(13 valid)/ check-openai-sync(13)/ check-plugin(五清单一致)/ node --test 42/42(修复后全量)|
| 双语 README 与 description 同步 | docs | ✅ | check-openai-sync 通过;README 平台矩阵双语对照;R8 修复术语(bundled→vendored×5)与丢句 |
| 全运行时缺失降级不中断 | docs | ✅(修复后) | eval st-degrade-no-runtime 断言全承载(R5/R6 补「注明工具降级原因」于四处降级文本);acc-evals 走查复核 |
| 无 MCP 环境的对抗验证 | docs | ✅ | requirement-analysis 阶段 4 降级句 + codex-compat 三段结构;acc-evals 走查证据 |
| Lane 归属翻译 / 原则裁决行 | docs | ✅ | ts-lane-annotation/ts-governance-order eval 全承载(acc-evals 逐条 file:line 证据)|
| 胶囊续接不重扫 / 交付回写追加注意事项 | docs | ✅ | ra-roadmap-capsule-continuation eval 全承载;胶囊回写为行为条款(executing-plans:97/103),证据等级:文档承载(无独立 eval 用例,critic 已声明)|
| 披露继承 / 分岔转漏斗 / near-miss | docs | ✅ | cl-disclosure/ex-fork-funnel/ex-no-fork-no-funnel 全承载(acc-evals 证据)|
| 单文件/分文件登记纪律两场景 | docs | ✅ | acc-resume 演练全符合预期(plan-index 校验通过/拦截、恢复判读、doctor 未安装指引);R4 补齐计划侧资源预登记分流并配 docs 回归测试 |
| 新会话恢复 + 不一致停下 | integration | ✅ | acc-resume 演练:构造 T01-T04 completed 的 progress.yaml → 从 T05 续跑;删 tasks/T03.md → 不一致被拦截 exit 1 |

## Grok / 声明式 SessionStart hook 走查记录(README 平台矩阵 "see acceptance walkthrough" 指针的落点)

- **声明式 hook 本体**(hooks/hooks.json):结构合法(`hooks.SessionStart[].hooks[].{type:command,command,timeout}`),`command` 使用 `${CLAUDE_PLUGIN_ROOT}` 平台变量;doctor `hooks.declarative=ok` 实跑判定;`session-context.mjs --explain` 有输出(doctor `injectionReplay` 实证)。
- **打包通道**:check-plugin/pre-commit 的 skill-creator 与 Codex CLI 校验链均接受 hooks/hooks.json(插件包完整性);T9 提交时的验证手段即此二项,无 Grok 实机。
- **Grok Build 字段级生效**(README:84 指针指向的本节):依据 Grok 官方"Claude Code 兼容"声明推断其消费 `.claude-plugin/` 同族清单与插件 hooks 字段;**无实机验证**,生效字段以用户实机反馈为准。证据等级:文档走查+结构校验,非实机。

## Requirement Reconciliation

17 条现行 Requirement(11 ADDED + 6 MODIFIED)+ 2 REMOVED:**17 DELIVERED / 0 DEFERRED / 0 DROPPED / 0 SUPERSEDED / 0 ADDED-IN-FLIGHT**;2 REMOVED 的移除行为(check-mcp 命令、插件分发 MCP 配置)均已交付。

| Requirement | 裁决 | 交付证据 |
|---|---|---|
| 根级 Agent plugins 1.0.0 manifest | DELIVERED | T6 + T26 验收修复(官方 schema 入库、字段以 schema 为准)+ R2 校验器关键字补全 |
| pi 平台分发清单 | DELIVERED | T6(package.json pi.skills)+ 官方文档走查(证据等级:文档走查级) |
| doctor 诊断命令 | DELIVERED | T7 六域骨架 + R3 补齐 anysearch 版本滞后与 SessionStart hook 挂载域(doctor.test 6/6) |
| 会话注入决策可诊断 | DELIVERED | T8 --explain 重放(session-explain 测试)+ doctor hooks.injectionReplay |
| sequential-thinking vendored skill | DELIVERED | T1 SHA 快照 + T2 端口 + R7 think.mjs 重做为 esbuild 生成物(用户裁决;契约测试 2/2) |
| vendored skill 统一同步脚本 | DELIVERED | T3(subtree/snapshot 双模式,update-vendored 测试)+ R9 --check CLI 契约用例 |
| test-strategy skill | DELIVERED | T20 本体 + T21 三处方 + T22 四挂载点(13 skill 全过校验) |
| 设计原则声明块 | DELIVERED | T19 reference + 三消费点 + 计划头部模板 |
| 同日顺序编号 | DELIVERED | T13 全套件 + R8 NN 口径修正(产物含 reports/roadmaps 文件名) |
| roadmap 上下文胶囊 | DELIVERED | T14 模板两节 + 续接改写 + evals 两用例 |
| plan 分文件形态(阈值门控) | DELIVERED | T23 规范 + T25 plan-index 校验 + R4 资源预登记分流补齐(resource-ledger-split 测试 3/3) |
| 渐进执行与断点恢复 | DELIVERED | T24 规范 + executing-plans 四处接线 + acc-resume 实测演练 |
| 澄清核心纪律(第 0 条) | DELIVERED | T16 + T17 锚定语 + eval 用例 |
| exploring 姿态 | DELIVERED | T18 + R8 枚举辖域改写 |
| 子代理与全 skill 统一搜索优先级 | DELIVERED | T10/T11/T12 + R8 search-clause 补 test-strategy(10 文件条款 md5 一致) |
| anysearch description 触发增强 | DELIVERED | T3 normalize 通道(update-vendored 测试断言增强重放) |
| visual-preview 产物归位特性目录 | DELIVERED | T15 --feature-dir + R1 相对路径绝对化修复(真实启动验证落位正确)+ 归档约定 |
| 资源登记纪律(按计划形态分流) | DELIVERED | T24 执行侧 + R4 计划侧(writing-plans 三处 + progressive-plan-format 生成规则) |
| 结构化推理消费点改写 | DELIVERED | T4 六处 + R5/R6 注明降级原因(eval 子断言闭环) |
| REMOVED: check-mcp 健康检查命令 | DELIVERED(移除) | T5 删除命令与全部引用(README 残留在 T26 修复) |
| REMOVED: 插件分发 MCP 配置 | DELIVERED(移除) | T5 删 .mcp.json;残留 rg 零命中 |

## 审查与修复记录

- **ultracode 收尾审查**(20 子代理):原始发现 26 → 去重 24 → 对抗复核 confirmed 24(高 1 / 中 7 / 低 16,0 被反驳);完整报告见 [review-summary.md](review-summary.md)
- **用户裁决**:中高 8 组全部修;think.mjs 重做 esbuild;低 16 条全部打包修(不动建议类);对账缺口补记录+关键测试
- **修复提交 R1-R9**(10 个 fix/test 提交):R1 start-server 路径绝对化(高)、R2 校验器四关键字、R3 doctor 两域、R4 资源预登记分流、R5/R6 evals 键名+旧命名+降级原因、R7 think.mjs esbuild 重做、R8 低级 16 条、R9 --check 契约测试
- **未修(用户裁决范围内显式排除)**:阈值三处陈述无同步守护、update-vendored localFiles 死配置(均为建议类)
- **已知限制(2026-08-27 复核后修订)**:
  - ~~vendored 快照与上游 pinned SHA 的网络一致性未核对~~ → **已核验通过**:sequential-thinking pinned SHA `d0fd5d4` 与上游 HEAD 一致(`--check` exit 0),且经 git 通道逐文件比对——think.ts / example-session.md / LICENSE 与上游 SHA **逐字节一致**,SKILL.md 仅 +4 行 frontmatter(NOTICE 登记的 local adaptation);anysearch 内嵌 v3.0.1 **滞后上游 v3.1.0**(`--check` exit 1),是否同步由用户决定(`node scripts/update-vendored-skill.mjs --skill anysearch`),doctor 已常态监测
  - pi/grok 无实机环境,证据为文档走查级(不可升级,grok 走查记录见上方专节)
  - **Claude Code 端升级后重装未实测**:验收会话加载的是插件缓存版而非本仓库 HEAD;13 skill 结构校验通过,但"装载不回归"在 Claude Code 侧属结构级证据,待 `/plugin` 更新后实机确认
  - 胶囊回写与原则裁决行无独立 eval 用例(行为条款已承载,critic 声明)

## 受影响维度复审

两路独立复审(A 功能正确性 / C2 文档交叉引用一致性),对修复区间 536a6fd..HEAD 逐 diff 核验并独立复跑全量:

**结论:R1-R9 核心发现全部真解决。** 关键实证:A 路用独立 esbuild 从 think.ts 再生成与 think.mjs 逐字节一致(R7 生成物声明属实);R2 新关键字回归面全仓仅 agent-plugin-1.0.0 使用、零误伤;R3 lag 三态链路端到端实跑(lagging 为真实网络检出);独立复跑 43/43 测试、validate-skills 13/13、check-plugin、AP schema ok:true、doctor hooks=ok 全绿。

复审追加发现 5 项收尾项(3 项属用户已裁决范围的漏网、1 项修复引入的新问题、1 项低危残留),已全部以 R10 修复(1d181e1):
1. **[合并阻塞] visual-path.test.sh 硬编码本 worktree 绝对路径**——合并回 main 删 worktree 后必挂;改为 cd 后捕获 `$SCRIPT` 变量锚定
2. **bundled→vendored 辖域漏网且会自我复制**——anysearch description 链三处联动改(同步源 enhancedDescription → normalize 重放 SKILL.md → openai.yaml 副本),中文同步升「内嵌 CLI」
3. exploring:78 降级句为第 5 个平行表述点,补「并注明工具降级原因」
4. writing-plans:126 分支名举例(非 grandfather 语境)升 `plan/YYYY-MM-DD-NN-<feature>`
5. doctor markerState 补顺序检查(END 先于 START 判 broken,与 install.mjs 拒改写判定对齐;含 TDD 用例)

R10 后全量:44/44 mjs 测试 + visual-path.sh PASS + validate-skills + check-openai-sync 全绿。**边缘项(未修,复审判定可不动)**:server.cjs:484 普通英语注释"bundled third-party assets"(非术语辖域);update-vendored usage 对 --check 网络失败退出码语义描述不全(测试已锁定该语义);anysearch/SKILL.md:21/:97 上游正文"bundled cross-platform CLI tools"(上游内容,改需 local adaptation 登记,且系 CLI 分发描述非 skill 称呼)。
