# 技能指令精简与文档统一验收报告

范围：本特性 spec 的 19 项修改及 R01；只读本次新档案和合成夹具。代码审查固定范围 `37bfc650...aa4ed425`，真实模型候选 `b5548373` 与其产品树相同。

## 当前证据

- T00 基线 46/46；T12 相关回归 113/113，原始命令、退出码、stdout/stderr 位于 `execution/serial/`。
- A/B质量/B简洁性/C/S 五路独立审查零发现，报告见 `review-*.json`。原生工具编排，不声称具有受控运行器隔离保证。
- A 独立补跑 37/37，原始证据 `independent-tests/A/`；补跑用于可移交归档，不倒推前次已有文件回执。
- 30 个排除文件哈希一致，见 `integrity.json`；五个来源版本回退文件保持未提交。
- 真实 PR 模型冒烟的 6 个 Scenario、10 个子例通过独立审计及主线程证据核对；共 26 次 actor 调用、12 次独立判读。详见 `main-semantic-audit.json`。
- 夜间全 43 场景评测未运行，按批准矩阵非阻塞、明确未验证；最终全量测试 T14 尚未到期。

## 偏差与失败保留

- 用户确认来源六文件版本回退差异；T00 用精确哈希限定，未暂存它们。
- 原始日志空白使用本特性 `.gitattributes` 保留；提取文档多余末尾空行已修正。
- T03 首次 green 4/5：模板漏写零测试/SKIP，不符合已批准 S37；补齐后 5/5、回归 89/89。
- T04 首次红含 ENOENT，不计有效行为红；测试改为从真实 RA 入口观察规则缺失后取得 ERR_ASSERTION，再实施并转绿。
- 用户追加 CHANGELOG 汇总已在来源 `1778a18a` 单独完成；8.5.0 三点、8.4.0 五点，8.3.0及更早逐字不变。该项是独立纯文案整理。

## Requirement Reconciliation

20 DELIVERED / 0 DEFERRED / 0 DROPPED / 0 SUPERSEDED / 0 ADDED-IN-FLIGHT。实现与必需验收完成；实际本地合并及最终验证仍由 T14 执行。

| ID | 要求 | 当前状态 |
|---|---|---|
| A02 | 执行计划描述只承担触发和职责说明 | DELIVERED（实现及适用 PR 验收已核对） |
| A03 | 验收描述保留验收与日常测试分界 | DELIVERED（实现及适用 PR 验收已核对） |
| A04 | 探索描述聚焦未承诺交付状态 | DELIVERED（实现及适用 PR 验收已核对） |
| A05 | 需求描述保留设计空间与相邻入口边界 | DELIVERED（实现及适用 PR 验收已核对） |
| A06 | 计划技能按任务形态加载详细规范 | DELIVERED（实现及适用 PR 验收已核对） |
| A07 | 需求主文件保留阶段门并按需装载生命周期 | DELIVERED（实现及适用 PR 验收已核对） |
| A09 | 小修反查和守卫规则按条件提供 | DELIVERED（实现及适用 PR 验收已核对） |
| A10 | 共享入口按动作选择完整权威 | DELIVERED（实现及适用 PR 验收已核对） |
| A11 | 并发详细协议按状态边界加载 | DELIVERED（实现及适用 PR 验收已核对） |
| A13 | 独立子题按实际容量尽早派发 | DELIVERED（实现及适用 PR 验收已核对） |
| A14 | 步骤和粒度依据任务类型 | DELIVERED（实现及适用 PR 验收已核对） |
| A15 | 项目就绪动作由实际配置决定 | DELIVERED（实现及适用 PR 验收已核对） |
| A16 | 探索报告按有界问题组织 | DELIVERED（实现及适用 PR 验收已核对） |
| A17 | 精简劝诫而保持测试纪律 | DELIVERED（实现及适用 PR 验收已核对） |
| A18 | 验收遵循矩阵和计划指定时机 | DELIVERED（实现及适用 PR 验收已核对） |
| A19 | 证据驱动的契约影响分流 | DELIVERED（实现及适用 PR 验收已核对） |
| C01 | 浏览器 MCP 能力按实际配置说明 | DELIVERED（实现及适用 PR 验收已核对） |
| C02 | 计划模板要求具体行为断言失败 | DELIVERED（实现及适用 PR 验收已核对） |
| C03 | DDD 统一文档位置、保存与生命周期 | DELIVERED（实现及适用 PR 验收已核对） |
| R01 | 本次整改的引用与排除边界可验证 | DELIVERED（实现及适用 PR 验收已核对） |

## coverage_note

本次不涉及实际产品 UI、数据库或性能工作负载；验收对象为技能规则、文档契约和模型决策。未运行浏览器或性能测试；不把结构缩减量视为模型质量指标。不存在独立确认的高/中发现，因此当前无需反驳；coverage critic 已完成静态覆盖核查，无阻塞缺口；模型补充覆盖核查见 `completeness-model-supplement.json`，6 场景 10 子例无覆盖缺口。

## 模型案例与边界

| Scenario | 子例 | 结果 |
|---|---|---|
| S03 | diagnose | PASS（有界模型动作） |
| S03 | feature | PASS（有界模型动作） |
| S15 | default | PASS（有界模型动作） |
| S31 | default | PASS（有界模型动作） |
| S32 | change | PASS（有界模型动作） |
| S32 | conflict | PASS（有界模型动作） |
| S32 | insufficient | PASS（有界模型动作） |
| S38 | ra | PASS（有界模型动作） |
| S38 | standalone | PASS（有界模型动作） |
| S39 | default | PASS（有界模型动作） |

S03 首轮 feature 因缺少购物车矩阵为 unverified；修正合成矩阵及 diagnose 请求混杂后仅重跑 S03，原始结果保留。此为夹具补证，不修改候选产品规则。

完整夜间模型评测：S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21, S22, S23, S24, S25, S26, S27, S28, S29, S30, S31, S32, S33, S34, S35, S36, S37, S38, S39, S40, S41, S42, S43 均未运行（non-blocking）；PR 冒烟不替代它们的完整分支覆盖。
