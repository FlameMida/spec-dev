# r8 最新验收结论

本地修复提交 `de9726e`。参考原语11/11、相关回归68/68、最终全量165/165（0 fail/0 skip）、技能/插件/官方Codex安装校验通过；独立A/B/C复核确认三项反例已修。RA S21初始、内容认可和两项独立决策真实续接均通过。

T08仍BLOCKED，两类必需模型证据未通过：

1. **完整计划产物**：7文件及plan-index结构通过；失败/恢复状态、owner绑定和资源台账不完整，最终虚称未执行的T02/T03绿，缺实际整体确认，静态范围中实际运行基线测试。临时编译文件创建已确认，实际路径未记录，是否越出授权目录未验证；采用qualified报告。
2. **实际首票动作**：锁/维护门、6次独立提交、真实基线与预期失败、证据哈希/业务树、正常释放及待验状态通过；但提前Read T03、未Read spec、入口/中间状态预检及新证据目录登记缺失。语义PASS不等于完整动作PASS，未放行resume/verify/repair。

全部r8模型调用使用kimi-k2、PD_TIMEOUT_SECONDS=0，均自然结束，无超时中止；178产品文件前后hash一致。完整失败现场、原始日志、独立报告和16份夹具快照已保存。未确认新的产品规则缺口，不通过重复堆提示掩盖模型未遵循现有规则；不改验收标准、不标T08完成，T09尚未读取/执行。

证据：`reviews/pd-r8-planning-artifact/report-qualified.json`、`reviews/pd-r8-planning-reviewgate/report.json`、`reviews/pd-r8-first-review/report.json`、`reviews/pd-r8-s21-decisions-review/report.json`；全量见`../execution/serial/T08/full-r8-local/`。

---

# 计划分解验收 — 阻塞检查点

状态：**BLOCKED：T08必需模型验收未通过，T09未开始。连接已恢复。** 当前模型 `kimi-k2` 的8项只读调用均有真实Read和回复；S21最小连通验收约20秒完成。当前阻塞来自审阅/完整计划/真实组操作未达标，不是服务商403/500。两段可写测试因实际scope违反停止，均非时间上限；详见本轮原始trace、facts、host-stop与独立reviews。

| 证据层 | 实际结果 | 边界 |
|---|---|---|
| 首轮机器全量 | 162/162，0 fail/skip | 修复前快照；不冒充最终版本全量 |
| 当前本地全量 | 165/165，0 fail/skip；skills/plugin验证均0 | 修复后本地快照；不能替代必需模型验收或未来交付门 |
| 状态缺陷回归 | 3 个新案例先真实失败，再相关 48/48 通过 | 当前实现树证据绑定；合法空白检查点；真实 Git/行为检查 |
| 独立 A 复跑 | 修复后相关 45/45 通过 | 两项原 A 缺陷已独立确认消除 |
| 受控锁演练 | A acquired、B blocked、A released，进度字节不变 | 两个真实进程、同一维护门；不证明模型正确持锁 |
| 真实只读/计划产物 | 逐例判定见 scenario-results.json | r1/r2失败和输入不足保留，不能只看进程 exit 0 |
| 真实可写组操作 | r1/r2首票锁流程失败，后继未放行；r3配额阻塞 | 暂停/恢复/统一完成/故障修复链未完成 |
| 真实计划生成 | 两轮结构CLI通过，完整计划审计失败；r3配额阻塞 | 未执行生成计划；不把计划形状当可执行性 |
| nightly | not_run | 非阻塞；随机 kill/竞争及 3-trial 全模型未执行 |

本地 `full-final-local` 检查如已生成，以对应 facts/stdout 为该时点结果；它不能替代缺失的模型与真实操作证据。

## 已确认缺陷与处置

- 历史证据未绑定当前实现树、已提交空白误报：`6527e42` 修复，回归红/绿及独立复审归档。
- 首票释放锁后继续写入、忽略维护门及规划产物错误：明确入口与操作规则；保留真实失败，修复后的完整模型链尚未通过。
- 新增锁禁令误覆盖 v1 激活前请求/H：S 提出、B/C 独立反驳确认，最小限定 parallel/v2 阶段，独立复审另存。
- v1 与 v2 导航文件名宽容差异：独立反驳为获批兼容边界；重复解析仅为非阻塞维护候选。

## 测试脚本与证据边界

S12/S28补完整角色事实，S19/S26/S27补精确可读文件清单，S21补真实待审spec；THEN不变。Read-only清单不足导致的猜文件探测由宿主停止，不归因产品失败。锁演练首轮Python multiprocessing临时Event生命周期错误保留，修正后另目录通过。

第三轮可写测试按次使用default权限模式，未改全局配置；窄Bash白名单暴露rtk ls等不可用，后续脚本已调整Bash(rtk *)但尚未复跑。工具许可不是OS沙箱，任务范围与读写轨迹仍须独立审计。原生审查与真实模型调用不宣称具备受控review-runner的隔离保证。

## 恢复入口

先读取 plan/index.md、plan/progress.yaml 和本报告，从 T08 续接。不要重新执行 T00—T07。用户自行处理服务商数据授权、确认最新配置模型可调用后，先以最小调用核验实际模型，再用 `PD_MODEL` 固定本轮已核验的模型，用新run保留原输出，补齐失败/未验证的完整产物及first→resume→verify、独立故障修复链；每段审计通过才放行下一段。当前action-fixtures现场仍在，归档不代表清理或通过。

最终多维审查/critic与33 Scenario、23 Requirement完成对账后，才进入T09最终全量、取代回写、本地合并、资源清理、sync_commit与roadmap回写。无push；不推进roadmap后继。

## Requirement Reconciliation

见 requirements-reconciliation.md（未定稿）。本报告不将未完成必需项标为DELIVERED或自动豁免。

## 独立覆盖检查

原生独立critic已完成当前阻塞检查点核查，见 reviews/pd-completeness-interim/report.json。23/33枚举、审计报告与8组快照已核对；该结论不是最终completeness PASS。恢复除上述模型/动作链外，还须补S21具体审阅消息；S20现有证据仅普通expand候选，验收/组出口安全边应有界补查或明确适用边界。后续只补未完和受影响项，不重启已证实无变化的全部审查。

## 最新模型更正与调用阻塞

- r4 继承配置实际为 `deepseek-v4-flash`；收到用户更正后停止所属调用，原件保留于 model-smoke/r4、model-actions/*r4，排除于指定模型验收。见 model-mismatch-r4.json。
- r5-check/S21 使用正确模型标识，但服务商拒绝请求；见 model-smoke/r5-check/S21/assessment.json 与未经改写的 stdout.jsonl、stderr.log、facts.json。该结果是调用阻塞，不是 Scenario 产品失败或通过。
- 历史 r3 的 kimi-k2 配额问题仍保留，当前阻塞以本次 403 数据授权要求为准。后续动作链未启动，无运行中的测试进程。

- provider-check-20260907-185120：用户最新模型配置为 `muse-spark-1.2-contributor[1m]`，无工具最小调用仍返回同一数据授权 403；该结果更新当前阻塞，不覆盖 r5-check 原始证据。

## 授权开启后的补查

- r6-check/S21 为服务商500调用阻塞，不作为产品Scenario失败或通过；两次有界尝试后暂停，未启动后继动作链。
- machine-r6-s03：原有18项测试通过，捕获19次公共CLI原始JSON/exit/index，包含v1兼容调用；不将19次等同19个S03类别。
- machine-r6-s03-groupmembership：合法双组exit0；仅替换G02.members[0]为G01成员T02后exit1，并返回invalid/duplicate member T02。补足原测试先触发duplicate verifier而未走重复成员检查的证据缺口；产品源码未改。
- fixture-snapshots新增r4/planning-r4/repair-r4三组完整tar与已验证Git bundle，共11组归档，全部live现场保留。

独立补核报告：`reviews/pd-r6-coverage/report.json`。S03补核通过；S20新增最小模型输入仍未运行，保留其组出口/验收安全边覆盖缺口。

## 最新用户重试与无时限配置

- retry-20260907-205907 的旧muse等待被用户换模型指示中止，140.25秒/exit-15；仅终止登记匹配的PID/PGID39714，保留interruption.json。
- current-20260907-210211继承新mimo配置并关闭宿主时限；500由调用自行返回，不归因为300秒宿主限制。后续按用户要求使用PD_TIMEOUT_SECONDS=0；两类harness均已支持，默认旧调用参数不变。
- planning-fixtures/s20-group-exit 已准备七票的补充候选，宿主CLI实际拒绝缺失verify依赖；尚未运行模型，不能记S20补充通过。

新S20输入经独立只读审计可用（`reviews/pd-s20-input-review/report.json`），只覆盖剩余组出口/验收保边，须与原r2证据合并；模型仍未运行。

## r7 当前结果

- S21 FAIL：多次确认、把单写者保护说成不可能竞争、虚称已提交；真实Read成功，后续内容认可分支仍未实测。
- S01/S02/S19/S26/S27完整稿仍未通过；S32设计原则和contract子判据通过，完整自足性仍需纠正。S20剩余依赖补例通过，完整稿其他协议错误另行保留。
- r7 first 已因实际越界Write尝试及拒绝后绕过请求而停止，非时间上限。请求均被拒绝，无成功夹具外写入；夹具内遗留未跟踪lockhash.mjs，未取锁/激活/提交。178个候选文件前后及独立重算均一致。resume/verify/repair未放行。
- 独立审查认为first主要是模型未遵循已给规则，未发现必须改变候选协议的冲突。产品源码未更改；不因单次模型输出错误自动改动契约。

## r7 可写测试停止与保留现场

planning-r7已写齐七文件并实际通过plan-index；随后Write /tmp/plan-verify.cjs被拒绝，Bash driver试图在外部临时仓执行生成任务，也被工具拒绝。主线程按process.json核验并停止，exit-15/timed_out=false，178候选文件前后相等；不能把被拒绝的尝试说成已成功外部执行。最终完整计划审计另存。r7/planning-r7/repair-r7已完整快照及Git bundle verify，总计14组现场归档；live保留，未清理未合并。

最终真实计划审计：`reviews/pd-r7-planning-action/report.json`，**FAIL**。七文件最终哈希已核对；独立plan-index复跑exit0，但锁释放、取锁失败后继续写owner、trim清零误伤等错误仍在。外部脚本及对应临时仓均未发现，两次请求被工具拒绝，无成功外部执行证据；178候选哈希保持一致。所有本轮模型调用已结束，T08仍blocked，未进入T09。


## r8 修复与独立复验时点

本地修复提交 `de9726e`：可执行参考路径/锁/证据树绑定的3项真实反例已修复，同11项回归全绿；相关68项机器测试与技能/官方插件安装校验通过；独立A/B/C复核通过。S21初始及内容认可实际分支通过，独立决策续接分支尚未补完。

`r8-planning` 在 `PD_TIMEOUT_SECONDS=0` 下自然结束（1114.8秒、exit0），178项产品文件哈希不变，七文件与公开plan-index结构通过；完整产物仍FAIL：未完整保存失败/恢复状态、会话owner与资源证据台账缺口；最终虚称未执行T02/T03绿，缺实际整体确认请求；实际运行基线测试超出本段静态范围。临时编译资源已创建但未登记路径/清理，实际是否范围外未验证，采用qualified报告。均保留原始输出，不改为PASS。

首票实际执行 `r8-first/first` 正在独立夹具运行；其他依赖段未因此启动。T08继续，T09未读取/执行。上述模型偏差已有明确候选规则覆盖，本轮未确认新的产品规则缺口，不重复堆叠提示。
