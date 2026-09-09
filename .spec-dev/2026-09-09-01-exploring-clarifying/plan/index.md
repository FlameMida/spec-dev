# 探索、澄清与上下文复用实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 从T00逐任务串行执行；无技能环境按各票完整步骤执行。状态只在 plan/progress.yaml，任务文件不用复选框。脱离仓库携带时保留整个特性目录。
>
> **偏差处理**：路径/唯一锚点的机械漂移按实际核对后修正并留痕；语义、公共seam、授权或必需证据变化回设计，不猜着改。

**目标**：交付 skill-ecosystem-absorption 第7/8项，探索所得可追溯、澄清进度可见并安全交接正式设计。

**Spec**：[exploring-clarifying-design.md](../spec/exploring-clarifying-design.md)，active；14 Requirement / 32 Scenario；[独立设计审查](../spec/design-review.md)修正后Approved，用户已review并同意编写计划。

**架构**：现有skill增量修改，context-reuse单点定义概念双查与共享术语；TDD/资源/派发权威继续引用。后台测试走真实通用子代理派发，模型不会由宿主预加载专用agent定义。

**技术栈**：Markdown/JSON、Node.js node:test、Python 3标准库、Git、现有Claude CLI。不新增依赖、公共runner、输出schema或skill。

**设计原则**：不留兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策；共享判据见 skills/writing-plans/references/design-principles.md。

## 文件结构与职责

| 文件 | 职责 | 票 |
|---|---|---|
| context-reuse.md；RA/quick-fix/triage入口；RA模板 | 双查、否决、共享术语及获批保存 | 共享上下文 |
| clarifying；RA引用 | 可见清单、单题、用户裁决与去枚举 | 澄清 |
| exploring；RA模板 | 授权实验、实际观察、结晶与窄交接 | 探索 |
| external-resource-explorer；exploration-patterns/codex-compat；exploring | 一手纪律单点与真实派发加载 | 调研 |
| 对应openai.yaml/evals；README双语；migrate说明；新迁移回归 | 当前行为同步及旧同名文件保护 | 各票及公开说明 |
| 本特性execution/state.py、record.py、probe.py、cases.json | 主线程状态/记录、固定夹具和真实模型探针，不分发为产品 | 隔离 |
| 本特性acceptance/、spec/progress/roadmap及相交spec声明 | 独立证据、交付与取代状态 | 验收及交付 |

## 全局约束

- 不重开已批准的邻近独立spike、按需隔离、可选保存、单题和glossary不自动迁移裁决；正式实现仍走原流程。
- 无前置重构阻碍，无expand–contract/多票集成组；使用普通v1 JSON子集progress，不声明parallel。相邻票修改相同skill，串行依赖同时承载真实接口与安全顺序。
- 所有命令从T00实际绑定的实施仓库根运行；进入任何夹具时明确cwd，返回不能靠shell变量存活。资源创建前登记，完成记录指向已存在的验证提交，状态写入之后单独提交。
- 来源工作区默认当前 /Users/maverick/feature-dev，但以T00实际binding为准，分支不猜main；已有隔离复用但仍做绑定/基线，删除权不自动取得。
- 每次SKILL修改同票同步openai.yaml；保留中文元数据、语言协议、搜索单点及明确现行契约。文档和实施示例提交均SKIP_RELEASE_HOOK=1，本地交付不push/发布。
- 拟创建的execution工具仅在T00执行时物化；本次计划编写不建worktree、不运行模型/实验、不改产品规则。
- 一次只运行一个probe；每个run独立目录和原件。副作用仅在已登记fixture，oracle/plan/evals不进入模型输入；用户给定情境与宿主实际观察明确归因。
- 规则变化需有效行为失败，已有行为前后保护；环境/供应方失败为BLOCKED。静态装配、模型回复、实际动作和独立判读分别记录，不把exit0当PASS。
- 除P00客户端能力预检外，全部行为场景由候选入口实际读取规则后执行；后台来源场景必须走RA/exploring两入口真实派发并由子代理读取定义，不能让宿主替派发。
- 共存spec列表在T00逐份双向声明，双方已有covers承接各自切面；后续票触碰共存文件时，若只改单面，按现行Spec-Guard精确豁免规则说明另一面无变化，不虚构同步。可以在真实修改时同步相应spec事实记录，任何契约变化回设计。

## 关联skill与时机

| Skill | 时机 | 权威 |
|---|---|---|
| executing-plans | 全计划及收尾编排 | skills/executing-plans/SKILL.md |
| using-git-worktrees | 隔离与所有权、交付 | skills/using-git-worktrees/SKILL.md |
| test-driven-development | 行为票有效红绿、原型例外 | skills/test-driven-development/SKILL.md |
| test-strategy | IO/Lane与模型边界 | skills/test-strategy/SKILL.md |
| acceptance-qa | 独立验收及失败处置 | skills/acceptance-qa/SKILL.md |
| writing-plans | progress资源总则与五查 | skills/writing-plans/SKILL.md |

## 相关测试范围

package.json当前无依赖/scripts/typecheck；不安装空依赖。按covers/引用推导，相关范围非空：

```bash
rtk proxy node --test scripts/tests/plugin-root.test.mjs scripts/tests/search-clause.test.mjs
rtk proxy node scripts/validate-skills.mjs
rtk proxy node scripts/check-plugin.mjs --codex-validate
rtk proxy node scripts/check-openai-sync.mjs
```


新增迁移回归在公开说明票创建后加入范围，不在T00运行不存在文件。命令失效回退全库并记声明失效；真实基线失败仍阻塞，不以回退掩盖。最终全量安全网为：

```bash
rtk proxy node --test scripts/tests/*.test.mjs
```


## 任务导航表

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 隔离与基线 | — | 已提交active spec/plan；实际Git来源 | binding notes；state.py TASK STATUS --commit SHA --tests pass；record.py TASK LABEL -- COMMAND；probe.py RUN CASE --timeout SECONDS；cases.json；相关基线及后台预检 |
| T01 共享概念上下文与入口接入 | T00 | T00实际绑定与state/record/probe；批准概念复用协议 | context-reuse.md 三节协议；RA/quick-fix/triage引用；共享术语保存边界；概念用例证据 |
| T02 澄清清单与用户裁决 | T01 | T01共享引用及RA/clarifying现行文本；state/record/probe | 清单单题/用户裁决单点；RA去枚举；真实多轮回放与等待证据 |
| T03 受控实验、结晶与探索记录 | T02 | T02单题/引用模式；T01共享记录协议；state/record/probe | spike准入/观察/收场与结晶交接；实验和笔记实际写入证据 |
| T04 后台研究与一手来源派发 | T03 | T03探索主体与spike边界；既有派发/路径规则；state/record/probe | 来源定义单点与RA/exploring真实派发承接；后台和一手来源回执 |
| T05 公开说明与迁移保护 | T04 | T04完整候选行为与各任务证据；state/record/probe | 双语摘要/元数据/evals一致；S26迁移公共回归；完整候选 |
| T06 验收与对账 | T05 | T05完整候选；全部逐场景原始回执；批准验收矩阵 | 32Scenario逐项结果与独立判读；全维度审查；resources.json；acceptance-report.md |
| T07 本地交付与清理 | T06 | T00实际来源/资源归属；T06完整验收与审查；前序全部完成 | 真实本地合并/取代回写/资源处置/sync_commit；roadmap delivered；全部completed |

依赖理由：共享上下文消费真实绑定与探针；澄清消费共享引用；探索消费清单/引用和记录协议；调研消费探索主体；公开说明对应完整行为；验收汇聚全部候选，交付只在完整验收/审查后进行。没有为了并发而删除安全边。

## Scenario对账与模型接口

| 实现票 | Scenario | 验收 |
|---|---|---|
| 共享概念上下文与入口接入 | S18、S19、S20、S22、S23、S24、S25、S29、S32 | 本票red/green及收尾final当前候选 |
| 澄清清单与用户裁决 | S09、S10、S11、S12、S13 | 本票red/green及收尾final当前候选 |
| 受控实验、结晶与探索记录 | S01、S02、S03、S04、S05、S06、S07、S08、S21、S27、S28、S31 | 本票red/green及收尾final当前候选 |
| 后台研究与一手来源派发 | S14、S15、S16、S17 | 本票red/green及收尾final当前候选 |
| 公开说明与迁移保护 | S26、S30 | 本票red/green及收尾final当前候选 |

probe.py RUN CASE --timeout SECONDS：RUN只能含字母数字下划线连字符，CASE在cases.json；默认600秒，上限值由运行参数记录。每例目录禁止覆盖，前置用户上下文与oracle分离。共54个具名输入（含P00能力预检、S26宿主CLI和多轮/入口/来源变体）。S09-next/S09-storage消费真实前轮回复、同候选及同一fixture，要求前轮独立judge通过；这是真实回复的续接回放，不伪称常驻会话。

judge.json由独立检查者填写：case、scenario、verdict(pass/fail/unverified)、reason、evidence（run内可回查相对路径数组）、checks（每个THEN子条件、verdict和evidence）。输入与预期都在执行时物化的cases.json，模型只能看到input和fixture事实；测试宿主不替模型补行为。模型身份从实际init记录，不写死历史默认值。

## 执行期校准

T01现状证据揭示路径输入歧义及S32缺夹具合同，已在execution/serial/T01/input-calibration.md记录；不更改产品THEN。S29由T01提供双查/共享引用贡献、T02提供去枚举静态贡献，T06以当前候选多入口证据完成全Scenario，不提前报全通过。T00已独立通过的后台预检路径从execution/serial/T00/preflight-approved.json读取，原P00时序失败保留。

## Self-Review

主线程五查已完成，实际结果见 [self-review.json](self-review.json) 与 [自检说明](self-review.md)：Spec/Scenario覆盖、无占位步骤、完整代码与接口一致、导航文件/校验、依赖最小性。检查在内存中解析代码与顺序模拟替换，未执行未来任务；静态检查和路径校验不等于产品验收。状态全部pending；获得明确实施指令后才从T00开始。

T03校准：S03补明确运行性p95问题，S02-agent补明确目标，S28-mixed补真实混合原型交接覆盖，THEN未变。T01另加S32-repair实际修复回归，现共53个具名输入。路由与问题记录的真实失败/修正见execution/serial/T03/，不将多版本任务期证据称作最终候选验收。

T05修正最终交付目标的报告/开发路由后，补S30-report现有非开发报告保护；当前execution/cases.json共54个具名输入。T06按实际注册表汇聚，不把新增变体当新Requirement。
