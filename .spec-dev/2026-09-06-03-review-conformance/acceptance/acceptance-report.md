# 审查符合性验收报告

**T00–T06全部完成并本地交付；实际合并、资源清理与任务状态分别见本特性目录的acceptance/delivery.json和plan/progress.yaml。** 用户已批准每段1800秒、最多3段、Claude CLI费用不限，继承本机设置。冻结产品129bbe2上两复杂案例均第二段completed，真实D/无误D、容量、A本人测试、A/B/S empty合并及最终critic独立核实。全库 **128通过、0失败、0跳过**，含34项受控回归，全部静态与官方Codex安装检查通过。原始模型附属语义错误已独立排除/收窄，准确性仍记partial；见[真实复验](controlled-runtime/long-budget-review.md)。

下表28个Scenario为控制器实施前的历史目标证据：**24 pass / 0 fail / 4 unverified**，后4项是已批准非阻塞nightly。它们不代表新控制器单独覆盖全部28场景，也不是完整验收通过；新旧运行级门分别记在 `run-gates.json`。

## 协议开销修正前的控制器验证

- 宿主保存测试原件、强制actor身份、绑定固定源码与双日志哈希；模型不能用报告覆盖证据。成功及错误大响应在四个受控工具内分页，恢复进程不能继承旧已读页；补查必须读取原报告与critic缺口。
- 修复真实误合并、错误D触发和假设保留越界接口后的测试误报；初审不读取其他维度结论，复核与critic按实际依赖接收证据。语义判断仍须独立审查，模型附属文案存在已记录的过强表述及文件计数/角色标签错误。
- small-r4：AS、独立反驳、critic全部实际完成，三条准确Spec缺陷分别确认，累计866.725秒；原300秒整例指标未通过。
- mechanical-r3：五路完成、无D，但反驳与critic欠回执；combined-r1：峰值2、真实D触发及派发，A/B/C完成，S/D/反驳/critic未完成。两例均耗尽三片段，不判PASS。
- 完整回归见 `controlled-runtime/full-regression.json`；原始对象/测试字节/CLI日志/归档源码哈希均通过核验，见 `artifact-audit.json`。各run保留失败与源码版本，不能跨版本借用完整通过结论。

## 控制器实施前的历史验证

- 采集器由模型实际调用，完整stdout/stderr及真实exit与工具回执对应；13项验收工具回归通过。
- 真实语义红：C将纯注释未列任务当新增批准门；初审/反驳主锚错位。产品改公共证据核对及C适用约束，原输入逆替换一致的重放证实修复。
- 全量94 passed/0 failed/0 skipped，技能/插件/openai同步/计划/diff通过，见 `continuation-full-checks.json`。独立审查无新增高置信度产品缺陷。
- 本轮14次模型调用，实际glm-5.3-flash、继承bypassPermissions、每例300秒；4次正常exit0、10次timeout124。exit0不自动代表语义通过。
- 角色化加载原文章节，减少无关探索策略装配；与compact严格重放分开，不将caller调整宣称为同输入产品红绿。

## 控制器实施前的历史运行级门

| 门 | 状态 | 证据 |
|---|---|---|
| 完整收尾 | unverified | coupled/regular/capacity/large/mechanical存在critic或主线程回收超时 |
| 采集完整性 | fail | 42次完整采集回执中6个最终路径被覆盖或缺失，见continuation-capture-integrity.json/capture-recovery |
| 执行者与声明 | fail | large A无独立测试；mechanical critic误认归档完整；switch附属引用错误 |

这些历史记录保持原判定；最新控制器的复杂运行已独立收口，见run-gates.json。没有把历史失败改成PASS，也没有自动DEFERRED。

## 28 Scenario 覆盖

| 场景 | 目标状态 | 证据 |
|---|---|---|
| S01 | pass | model-smoke/independent-verdicts/g1-conformance-native-settings.json |
| S02 | pass | model-smoke/independent-verdicts/g1-conformance-native-settings.json |
| S03 | pass | model-smoke/independent-verdicts/g1-conformance-native-settings.json |
| S04 | pass | model-smoke/independent-verdicts/g1-conformance-native-settings.json; model-smoke/independent-verdicts/g1-approved-repair-r1.json |
| S05 | pass | model-smoke/independent-verdicts/g1-missing-impl-native-settings.json; model-smoke/independent-verdicts/g1-missing-impl-repair-r1.json; model-smoke/independent-verdicts/g1-missing-impl-harness-fixed-r1.json; model-smoke/independent-verdicts/g1-missing-impl-capture-r1.json |
| S06 | pass | model-smoke/independent-verdicts/g4-coupled-native-settings.json; model-smoke/independent-verdicts/g4-coupled-capture-r1.json |
| S07 | pass | model-smoke/independent-verdicts/g4-mechanical-compact-r1.json; model-smoke/independent-verdicts/g4-mechanical-role-scoped-r1.json |
| S08 | pass | model-smoke/independent-verdicts/g4-adapter-native-settings.json |
| S09 | pass | model-smoke/independent-verdicts/g4-adapter-native-settings.json |
| S10 | unverified |  |
| S11 | pass | model-smoke/independent-verdicts/g5-invalid-ref-native-settings.json; model-smoke/independent-verdicts/g5-missing-spec-native-settings.json |
| S12 | pass | model-smoke/independent-verdicts/g5-empty-native-settings.json |
| S13 | unverified |  |
| S14 | pass | model-smoke/independent-verdicts/g3-small-repair-r1.json |
| S15 | pass | model-smoke/independent-verdicts/g3-regular-evidence-repair-r1.json; model-smoke/independent-verdicts/g3-large-role-scoped-r1.json |
| S16 | pass | model-smoke/independent-verdicts/g3-capacity-role-scoped-r1.json |
| S17 | pass | model-smoke/independent-verdicts/g2-covered-pointer-aligned.json; model-smoke/independent-verdicts/g2-no-test-native-settings.json; check-0.json |
| S18 | pass | model-smoke/independent-verdicts/g2-gap-native-settings.json; model-smoke/independent-verdicts/g2-gap-repair-r1.json; model-smoke/independent-verdicts/g2-gap-harness-fixed-r1.json |
| S19 | pass | check-0.json |
| S20 | pass | check-0.json |
| S21 | pass | model-smoke/independent-verdicts/g2-covered-pointer-aligned.json; model-smoke/independent-verdicts/g2-no-test-native-settings.json; check-0.json |
| S22 | pass | model-smoke/independent-verdicts/g2-duplicate-native-settings.json; model-smoke/independent-verdicts/g2-duplicate-capture-r1.json |
| S23 | pass | model-smoke/independent-verdicts/g2-gap-native-settings.json; model-smoke/independent-verdicts/g2-gap-repair-r1.json; model-smoke/independent-verdicts/g2-gap-harness-fixed-r1.json; model-smoke/independent-verdicts/g2-late-bug-capture-r1.json |
| S24 | pass | model-smoke/independent-verdicts/g5-dispatch-native-settings.json |
| S25 | unverified |  |
| S26 | pass | model-smoke/independent-verdicts/g3-switch-native-settings.json; model-smoke/independent-verdicts/g3-switch-evidence-repair-r1.json |
| S27 | unverified |  |
| S28 | pass | model-smoke/independent-verdicts/g4-adapter-native-settings.json |

完整GIVEN/WHEN/THEN、任务/eval、候选锚点见 `scenario-matrix.json`，机器条目见 `check-items.json`。

## 12 Requirement Reconciliation

| Requirement | Scenario | 对账 |
|---|---|---|
| 实现符合性三向核对 | S01, S02, S03, S04 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| S 发现的契约依据 | S05 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| 可选架构深化 | S06, S07 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| 共享模块判据 | S08, S09, S10 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| 审查输入预检 | S11, S12 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| 发现措辞基于证据 | S13 | DELIVERED；静态规则及独立否决机制有据；本轮附属误报已明确处置，完整nightly未运行（已批准非阻塞） |
| 规模化维度编排（改了什么：各档覆盖 S，大变更五路重分配，容量不足不丢维度） | S14, S15, S16 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| 完整性审查的证据覆盖（改了什么：明确零发现与未覆盖的区别，保留现行 Scenario 核对） | S17, S18 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| 发现与覆盖契约（改了什么：新增符合性类别并具体化证据内容） | S19, S20, S21 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| 跨维度复核与收口（改了什么：符合性发现与覆盖补查进入既有复核） | S22, S23 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| 通用派发完成条件（改了什么：在原主题与来源要求上增加完成条件、排除项和对照示例） | S24, S25 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |
| 串并行入口共同消费（改了什么：上游与审查入口接入新增单点规则） | S26, S27, S28 | DELIVERED；历史PR目标证据 + 当前run-gates必需门通过 |

## 模型与原始证据

共50份CLI原始流见 `model-evidence-index.json`；逐例verdict区分目标与整例状态。候选、harness、参数、输出、错误、真实源码/diff及只读哈希均归档。旧失败、污染、超时、未触发试验保留。

S05完整归因、S06实际D、S22去重、S23新候选反驳、S26原始base及critic均有独立证据。S15四/五路、S16预算2的历史目标证据保留；最新组合/机械run另外提供完整终态，见两份long-budget-*-verdict.json。

原生Codex对照是既有的日志缺失且超时记录，不作干净PASS。原TAP无损归档及恢复规则见 `raw-evidence-map.json`/`restore-raw-evidence.py`；新被覆盖的测试结果从原回执另存 `model-smoke/capture-recovery/`，不修写原报告或冒称模型未改写。

## 控制器补充对账

R01–R06共6项DELIVERED，单列于controlled-runtime/long-budget-runtime-reconciliation.json，不计入原12Requirement/28Scenario。189份spool、两例57内容对象及14份测试归因审计通过。恢复时的同actor测试复用与本段新增测试分别记录；不宣称原始Claude无效JSON正文的截断预览完整。

## coverage_note

原12Requirement均DELIVERED；28Scenario历史目标24pass/0fail/4非阻塞nightly未运行，静态命中不等于完整模型PASS。当前控制器128项完整回归、独立代码增量审查、两复杂真实恢复收口及A/B/S正向合并证据齐全。模型原始语义partial：C seam误关联、reviewed误读及附属授权推断等已独立否决/收窄，不据此新增批准门、测试或修改要求。通过限于固定案例、版本与配置，不承诺模型稳定零误报。T00–T06全部完成并本地交付；实际合并、资源清理与任务状态分别见本特性目录的acceptance/delivery.json和plan/progress.yaml。

## 本地交付

main已快进至 `941ec2439335a6003c195c16158505503c712fd1`，两spec.sync_commit锚定该实际交付提交。最终集成树全库128/0/0与静态检查见delivery-checks.json；主线8.3.0及七文件变更保留，产品hash一致。worktree/计划分支/夹具及登记审计临时脚本已清理；八个登记提交说明文件原已不存在。未push或发布；交付记录见delivery.json。
