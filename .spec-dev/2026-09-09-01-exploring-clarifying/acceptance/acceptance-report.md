# exploring-clarifying 验收记录

状态：T06 必需矩阵与最终独立完整性复核已通过；T07 全库 180 项测试、技能及插件校验已通过，本地合并和资源清理待执行。本文不将模型进程退出或静态检查单独当作行为通过。

## 当前候选与结论

用户明确选择 GPT-6 Astra 继续完整验收。统一运行 `final-astra` 冻结于 `a1a2ce3423dd6b4d68e1f5830724e003e4960754`，产品内容与 `397cc818b596bd56851272bf59cb00c5e8b4c95e` 的 180 项映射相同。固定 6 项 harness 的完整哈希见 [候选清单](final-candidate-astra.json)；切换模型只修改任务内 `probe.py` 配置和一致性检查，未改产品或全局设置。

- **59/59 必需行为用例独立 PASS**：56 个独立用例和 3 个真实回复续接；当前各组 actions 19、clarification 13、research 7、context 20 全部通过。
- **32/32 Scenario 映射完整**，包括独立通过的 S26 四次真实迁移 CLI 调用。注册表总数 61，另一个 P00 只作通道预检，不计产品通过。
- 每例核对真实输入、工具调用与返回、文件前后状态、归档、起止回执、完整 180/6 映射和实际模型响应；各 `judge.json` 是独立语义依据，聚合器只做机械对账。
- 续接使用同候选、同夹具的真实上一轮回复；属于新进程回放，不声称保存了模型隐藏状态。

证据：[60 次 Astra 调用闭合记录](final-astra-completion.json)、[32 场景结果](scenario-results.json)、[14 项 Requirement 对账](requirements-reconciliation.md)、[聚合命令回执](../execution/serial/T06/astra-aggregate/facts.json)。初始串行批次在续接检查点安全退出 75，三个续接自然退出 0，恢复后剩余独立批次退出 0。

## 配置与验证边界

主线程和 worker 的别名在本任务调用内固定为 `claude-fable-5-dd-artsa-6-tpg`，effort 为 `xhigh`。实际每条有模型字段的 assistant 响应由独立判读核对为 `gpt-6-astra`；研究用例按真实父子上下文分别核对。身份缺失、错模型或混合模型会阻止通过；续接也必须匹配父例的 harness 与模型配置。

[Astra 无工具预检](../execution/serial/T06/model-astra-diagnostic/receipt.json) 实际请求为 adaptive thinking/xhigh，max_tokens 64000，响应报告 Astra，exit 0；[P00](model/final-astra/P00/judge.json) 验证了真实父子 Astra、后台启动后的独立讨论、结果回收和终态。请求别名与供应方报告身份分别保留，物理后端路由未独立证明。全局配置哈希在完整矩阵前后保持相同。

入口白名单不是 OS 沙箱。模型不得读取 oracle、evals、候选 spec/plan 或其他夹具；真实输入不含验收断言。仅 S27/S28-mixed 运行注册的宿主脚本，观察归因于宿主。全套测试未改变原 GIVEN/THEN、工具权限、每次 worker turn 预算或源码以迎合 Astra；未以 Luna 的 PASS 拼接当前结果。

## 已执行检查与待执行项

| 检查 | 实际结果 | 证据 |
|---|---|---|
| 相关产品回归 | 31/31，exit 0；产品 180 映射此后不变 | [回执](../execution/serial/T06/recovery-order-related-final/facts.json) |
| 技能、插件及漂移 | exit 0 | [技能](../execution/serial/T06/recovery-order-skills-final/facts.json)、[官方 CLI 插件检查](../execution/serial/T06/recovery-order-plugin-final/facts.json)、[漂移](../execution/serial/T06/recovery-order-drift-final/facts.json) |
| 当前 harness 与输入注册 | 9 项通过、61 项合法，exit 0；独立复跑及错模型/旧续接拒绝核查通过 | [测试](../execution/serial/T06/astra-harness-final/facts.json)、[注册表](../execution/serial/T06/astra-registry-final/facts.json)、[独立检查](reviews/astra-harness-check.json) |
| S26 公共迁移 CLI | 4 次真实调用独立 PASS，目标存在/不存在 × dry-run/实际 | [判读与原件](cli26/judge.json) |
| 模型矩阵聚合 | 59 行为例 + S26，共 32 场景，exit 0 | [回执](../execution/serial/T06/astra-aggregate/facts.json) |
| 夹具归档 | 349 个自有夹具实时内容、tar、bundle 与 HEAD 核验通过，exit 0 | [清单](resources.json)、[回执](../execution/serial/T06/astra-fixture-audit/facts.json) |
| 进程与 CLI | 363 个历史模型进程记录闭合，0 个未解决项；两条旧 CLI 会话均不再活动 | [进程](process-audit.json)、[CLI 查询](cli-resources.json) |
| 最终完整性 critic | PASS，无新增必需覆盖缺口，validator exit 0 | [回执](reviews/final-completeness.json)、[覆盖表](reviews/final-completeness-coverage.json) |
| 最终全库测试 | 180/180，0 fail、0 skip，exit 0；技能和插件校验通过 | [全库回执](../execution/serial/T07/full/facts.json)、[收尾检查](../execution/serial/T07/closure-checks.json) |
| nightly 多 trial 组 | NOT_RUN，按批准矩阵非阻塞 | [T06](../plan/tasks/T06.md) |

## 审查覆盖与本轮判读校准

完整初审 A/B/C/S 基于最初 base `988acdf6a5ebccd235fd1db11161959dd52d12da`；具体结构摩擦触发 D，修复后执行一次受影响维度复审。见 [处置记录](reviews/disposition-r1.json)。后续只针对实际行为缺口和 harness 变更有界复核，没有重启广域扫查；主要增量见 `consolidated-C/S.json`、`question-history-C/S.json`、`disclosure-C/S.json`、`proposal-semantics-C/S.json`、`worker-authority-C/S.json`、`recovery-order-options.json`、`recovery-order-S.json` 和 `astra-harness-check.json`。使用原生独立代理，不声称 controlled review-runner 的隔离保证。

本轮仅 S11-qf 有判读校准：[独立覆盖反驳](reviews/rebuttal-final-astra-qf-reference.json) 确认它贡献 quick-fix 的被引用角色行为。输入只确认根因和修法，不能补造契约影响答案；模型由 quick-fix 原规则决定继续询问该项，未重问已决内容或添加独立 clarifying 出口。因此该入口角色 PASS；**不声称本例步骤 3 已全部结束或已进入步骤 4**。完整分岔结束后的返回由 S11 与 S11-ra 的当前实际证据覆盖。初始 unverified 原字节保留在 `model/final-astra/S11-qf/judge.initial.json`，没有改输入或豁免原流程。

## 历史失败与证据资格

历史过程快照见 [当时的验收记录](acceptance-history-snapshot.md)，其中的“等待/当前”仅指各自记录时点；哈希见 [快照记录](acceptance-history-snapshot.json)。所有旧输入、输出、FAIL、UNVERIFIED 和纠正前 judge 保留。

| 运行 | 保留的实际结果或边界 |
|---|---|
| final / r2 / r3 | 分别 6/5/11 例自然闭合；入口顺序、范围绑定、来源支持或规则承接的实际缺口保留；部分过强的措辞/选项判断经独立反驳纠正 |
| r4 | 51 例正常闭合，S28-mixed 发生宿主字符串消息解析故障；最初退出码和初始映射未保存，恢复仍为 null/UNVERIFIED，不补造成功；S04/S17-ex/S23/S28 语义失败保留 |
| r4-tail | 5 项诊断 PASS，harness 已变，不拼接为 r4 统一通过 |
| r5 | 8 PASS、3 FAIL、1 UNVERIFIED；历史归因/范围选项问题及输入歧义分别处理 |
| r6 | 9 PASS、1 FAIL；包括 2 项真实续接，缺失披露的 RA 父例未解锁续接 |
| r7 | 8 PASS、1 FAIL，3 项真实续接已通过；当前/拟议语义归称错误保留 |
| r8 | 7 PASS、1 FAIL；实际 worker 时效规则取得缺口成立，不扩大判为历史文档升格 |
| r9 | 4 PASS、1 FAIL；主线程在重试前接管并反述顺序，修正后另行冻结 |
| r10 | 8 PASS、1 FAIL；新服务端确认前提归称旧保证的错误未靠挑选重试关闭，用户随后明确选择 Astra |

另外 4 个旧运行把判断文字误作宿主脚本路径，污染模型可读观察；见 [失效清单](invalidated-results.json)。这些结果及引用它们的旧审查/critic 部分撤出验收，原件不覆盖。原 S21 的数值角色歧义后来只修正 GIVEN 的报价/预算表述，未经证实的数值失败没有变成产品缺陷。

本次是使用明确获批的新模型配置完成完整统一矩阵，不宣称 Luna 的有效失败已被修复、首次执行成功或获得通用模型可靠率。此前模型名诊断证明 Luna 默认也发送 xhigh，不能把语义错误归咎于缺失 effort。历史正文元数据成对暂存例外及原始证据空白格式例外均为单次命令、原文保留，未改全局配置。

## 资源与交付边界

模型写者已经停止。初次进程审计因旧 PID 40812 无可见性而 exit 1，原 [审计快照](process-audit.initial.json) 和 stderr 保留；[身份复核](process-identity-resolution.json) 证明原进程在 05:15 启动且自然结束，当前是 10:46 启动的另一 `cfprefsd` 系统进程。没有向该进程发信号，最终无未解决项。

两条旧 CLI 会话按实际宿主停止回执与最新精确 UUID 查询记录，客户端历史保留，不改称模型自然结束。三个配置诊断目录的进程、临时监听器及目录均已关闭/移除，证据在最终进程审计中登记。

349 个夹具尚未删除。T07 会重新核对实际文件、Git HEAD 和归档后逐项清理，并保存每项台账；随后处理自有 worktree/分支。当前尚未合并到来源 main，未 push、未发布，也不启动 roadmap #8。
