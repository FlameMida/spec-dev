# 审查符合性验收报告

## Overview

**T05 未完成，T06 未开始。** T01–T04 已实现并本地提交；修复提交 `945467ea9fc386f9bdc8c8597dadb3471408bd7d`。原始基线 `88cf00a9f5ba7a340720dd49cf8be068cb8a9e20`，隔离分支 `plan/2026-09-06-03-review-conformance`。没有合并主分支、推送或宣布交付。

确定性检查：修复前后全量均 **94 passed、0 failed、0 skipped**；技能、插件、元数据同步、计划及格式检查通过。独立代码审查采用 T00 冻结旧规则，A/B/C 覆盖20产品文件，修复两文件再次静态复审无新增发现。静态符合不是模型行为通过。

## 28 Scenario 覆盖

当前目标行为：{'pass': 15, 'fail': 6, 'unverified': 7}；PR必需行：{'pass': 15, 'fail': 6, 'unverified': 3}。完整GIVEN/WHEN/THEN、候选file:line、任务/eval与证据见 `scenario-matrix.json`；机器条目见 `check-items.json`。S10/S13/S25/S27完整多trial未运行，属已批准nightly非阻塞。

| 场景 | 状态 | 证据/边界 |
|---|---|---|
| S01 | pass | model-smoke/independent-verdicts/g1-conformance-native-settings.json |
| S02 | pass | model-smoke/independent-verdicts/g1-conformance-native-settings.json |
| S03 | pass | model-smoke/independent-verdicts/g1-conformance-native-settings.json |
| S04 | pass | model-smoke/independent-verdicts/g1-conformance-native-settings.json; model-smoke/independent-verdicts/g1-approved-repair-r1.json |
| S05 | fail | model-smoke/independent-verdicts/g1-missing-impl-native-settings.json; model-smoke/independent-verdicts/g1-missing-impl-repair-r1.json |
| S06 | fail | model-smoke/independent-verdicts/g4-coupled-native-settings.json |
| S07 | unverified | real model evidence pending independent review |
| S08 | pass | model-smoke/independent-verdicts/g4-adapter-native-settings.json |
| S09 | pass | model-smoke/independent-verdicts/g4-adapter-native-settings.json |
| S10 | unverified | nightly full trials not run |
| S11 | pass | model-smoke/independent-verdicts/g5-invalid-ref-native-settings.json; model-smoke/independent-verdicts/g5-missing-spec-native-settings.json |
| S12 | pass | model-smoke/independent-verdicts/g5-empty-native-settings.json |
| S13 | unverified | nightly full trials not run |
| S14 | pass | model-smoke/independent-verdicts/g3-small-repair-r1.json |
| S15 | unverified | real model evidence pending independent review |
| S16 | unverified | real model evidence pending independent review |
| S17 | pass | model-smoke/independent-verdicts/g2-covered-pointer-aligned.json; model-smoke/independent-verdicts/g2-no-test-native-settings.json; check-0.json |
| S18 | fail | model-smoke/independent-verdicts/g2-gap-native-settings.json; model-smoke/independent-verdicts/g2-gap-repair-r1.json |
| S19 | pass | check-0.json |
| S20 | pass | check-0.json |
| S21 | pass | model-smoke/independent-verdicts/g2-covered-pointer-aligned.json; model-smoke/independent-verdicts/g2-no-test-native-settings.json; check-0.json |
| S22 | fail | model-smoke/independent-verdicts/g2-duplicate-native-settings.json |
| S23 | fail | model-smoke/independent-verdicts/g2-gap-native-settings.json; model-smoke/independent-verdicts/g2-gap-repair-r1.json |
| S24 | pass | model-smoke/independent-verdicts/g5-dispatch-native-settings.json |
| S25 | unverified | nightly full trials not run |
| S26 | fail | model-smoke/independent-verdicts/g3-switch-native-settings.json |
| S27 | unverified | nightly full trials not run |
| S28 | pass | model-smoke/independent-verdicts/g4-adapter-native-settings.json |

## 12 Requirement Reconciliation

| 现行 Requirement | 场景 | 当前对账 |
|---|---|---|
| 实现符合性三向核对 | S01, S02, S03, S04 | PR目标行为已核对；nightly边界另列 |
| S 发现的契约依据 | S05 | 失败/补证未完成 |
| 可选架构深化 | S06, S07 | 失败/补证未完成 |
| 共享模块判据 | S08, S09, S10 | PR目标行为已核对；nightly边界另列 |
| 审查输入预检 | S11, S12 | PR目标行为已核对；nightly边界另列 |
| 发现措辞基于证据 | S13 | 静态符合；nightly完整模型未运行 |
| 规模化维度编排（改了什么：各档覆盖 S，大变更五路重分配，容量不足不丢维度） | S14, S15, S16 | PR行为证据未完成 |
| 完整性审查的证据覆盖（改了什么：明确零发现与未覆盖的区别，保留现行 Scenario 核对） | S17, S18 | 失败/补证未完成 |
| 发现与覆盖契约（改了什么：新增符合性类别并具体化证据内容） | S19, S20, S21 | PR目标行为已核对；nightly边界另列 |
| 跨维度复核与收口（改了什么：符合性发现与覆盖补查进入既有复核） | S22, S23 | 失败/补证未完成 |
| 通用派发完成条件（改了什么：在原主题与来源要求上增加完成条件、排除项和对照示例） | S24, S25 | PR目标行为已核对；nightly边界另列 |
| 串并行入口共同消费（改了什么：上游与审查入口接入新增单点规则） | S26, S27, S28 | 失败/补证未完成 |

## 发现与处置

- 原 CLI 固定候选批次20例均已停止：16正常退出、4在300秒超时。正常退出仍经独立语义判断；完整流水线与各Scenario子判据分别记录。
- 有效失败后仅修改 reviewer 与共享编排两文件，保留schema及所有既有维度。获批接口误报和小规模缺独立回执已取得有效红绿；覆盖补查与缺失实现的同输入复跑仍失败。D触发、因果去重、切换后critic及机械规模偏差保留原红，尚未完成修复后行为复验。
- 本机CLI实际模型为glm-5.3-flash；本机各别名均指向该模型。用户明确要求继承本机设置，已遵从，不以其permissionMode本身判失败。早期bare缺子代理工具、契约范围混用及日志指针歧义均保留原件，调用修正与语义红分开。
- 常规四路/大档五路实际完成证据，以及预算2内四维分批完成证据均存在，但收口未完成的超时例保持unverified。
- 原生Codex对照实际模型gpt-6-astra，真实critic与反驳工具记录可复核；调用器遗漏所指测试日志副本，且主线程超过300秒后中止。它只是有边界的执行器对照，不作为干净同输入PASS，也不覆盖原CLI失败。
- g4-adapter初始夹具无真实调用链，已保留原件并修正唯一adapter及共享rules真实消费者，公开3测试不变且通过。g4-mechanical原输入没有充分固定大档前提；661行降小档是有效红，但未来单独校准“大变更档”不能冒充原输入红绿。

## 模型证据索引

34份CLI原始流见 `model-evidence-index.json`；逐例独立判读见 `model-smoke/independent-verdicts/`，命令/候选哈希/前后文件哈希见各meta，完整输入及真实Git源码/diff见对应artifacts。Native对照及三段真实工具日志见 `model-smoke/native/g2-gap/r1/`；仅原始工具事件与公开最终输出入库，不包含私有推理或无关系统指令。

宿主批量校验见 `model-smoke/host-validation.json`。其中g4-adapter自定义最终汇总不满足review-findings结构，不能当作该契约通过；其实际维度报告校验通过。自定义反驳处置记录与标准review-findings报告分别按其声明契约判断。

14份原始TAP含尾随空白，本地原文件保留，Git以UTF-8内容和SHA256无损JSON归档；映射见 `raw-evidence-map.json`，恢复/核验命令：`rtk proxy python3 .spec-dev/2026-09-06-03-review-conformance/acceptance/restore-raw-evidence.py`。所有20夹具Git HEAD及预期初始状态核对通过；构造后写入的报告输入原本未跟踪，不是模型改写。

## coverage_note

全部12现行Requirement/28Scenario均列入，没有把Superseded算缺口，没有静默裁剪。原完整三路审查及两文件复审通过，但T05行为门未过，critic只能出未完成快照；不标DEFERRED、不合并T06。通过项按各自实际候选哈希声明，未将部分目标通过扩为全调用通过或所有模型稳定遵循。原始失败、污染、调用故障和未运行nightly均保留。后续需先确定执行器/单例时限，补齐原判据的必需行，再做critic最终收口与T06。
