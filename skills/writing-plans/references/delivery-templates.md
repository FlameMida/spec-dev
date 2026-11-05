# 单文件的 final、验收与交付

> 阅读时机：生成独立 F、验收 A 或最终交付 D 前。所有模板中的任务号、路径、命令和预期结果在生成计划时填实；不创建 progress.yaml。

## 记录方式

复选框、执行记录及 clear→窄提交→重新绑定沿 [计划格式](plan-format.md#单文件进度与资源台账)。记录真实命令、cwd、退出码、SHA 与原件引用；每次日志使用唯一尝试名，保留失败。临时原件统一放特性 `execution/` 并沿忽略规则，不进 Git；验收收口后按 [临时产物规则](plan-format.md#execution-临时产物) 全部删除。证据适用性及版本比较沿 [回执规则](plan-format.md#回执与交付映射唯一定义点)，不因计划记录变化无条件重跑全量。

## 独立 final F

F 依赖全部实施任务及集成组出口，位于独立审查、验收 A 和交付 D 之前。

- [ ] **步骤 1：核对候选**：核对所有实施出口、受测提交和实际工作区，记录本次完整套件的真实命令。
- [ ] **步骤 2：运行完整验证**：在已提交候选运行计划指定的全量命令，保存真实 argv/cwd/退出码及 stdout/stderr；零测试、SKIP、缺工具、信号中断不记通过。manual 沿已有执行授权和矩阵条件，必需缺项保持未完成。
- [ ] **步骤 3：处置失败并保存结果**：范围内失败或本次回归修复后补验；疑似既有失败与 T00 的实际来源比较，保护 dirty 与原件。只有尚未裁定的阻塞取舍交用户；获准不阻塞仍保留非零结果、比较与裁决引用，不写 pass。核对适用版本后记录受测 SHA、结果与证据，再勾选并提交计划。

审查/验收修复产生新候选后，按 test-strategy 的验证归属补验、复审受影响维度并更新验收/对账；不凭旧 F 勾选放行。原件复用按上述回执规则。

## 验收 A

矩阵含验收任务行时生成 A，依赖 F，由独立审查之后的 acceptance-qa 执行；否则不造空票。任务内保留 `Scenario / 检查项 | 维度 | 执行方式 | 目标 | 阈值/预期 | 验收证据` 表，逐行填实。

- [ ] **步骤 1：核对依据与已有证据**：输入现行 spec、候选 SHA、F 原件（已收口清理时为已核验摘要及本轮补验原件）、变更清单、适用定稿 HTML/确认来源和关键状态。
- [ ] **步骤 2：执行并补验缺口**：页面按实际页面对照与业务结果核验，其他目标按行为矩阵；有效证据直接复用，required 与 D/A/X 含义不变。
- [ ] **步骤 3：保存验收与对账并清理**：报告落 `acceptance/acceptance-report.md`，必需缺证据项不勾选完成；Requirement 对账在 D 前完成。全部 A 与审查处置收口后，将已核验结果汇总为简短记录，删除整个 execution 并核实不存在；失败/延期结论不改写为通过。没有 A 时由主线程在 F、审查与对账收口后完成同样清理。

## 最终任务 D：合并与清理

D 为最大号，依赖 F 与全部 A，在审查、验收及 Requirement 对账完成后执行。沿 [资源台账定义](plan-format.md#单文件进度与资源台账) 在本任务内预登记资源，清理仅遍历本台账。

- [ ] **步骤 1：消费已核验结论**：逐项核对 F、独立审查、适用 critic、A 与 Requirement 对账摘要及受测版本。execution 应已清理，不要求重新读取已删除原件；后续候选变化先按影响补验、更新结论并清理本轮临时产物。
- [ ] **步骤 2：核对测试退役与取代材料**：仅现行 Scenario 已消失且对应 Requirement 已 REMOVED/Superseded 的测试进入退役候选，删除沿明确授权。spec.supersedes、covers 接管及 pending 标记沿既有取代规则；这些材料在 F 前准备验证，D 新增契约修改须返回补验。
- [ ] **步骤 3：确认来源与保存历史锚**：从 T00 实际记录取得来源根、来源分支、实施根及 created/inherited 归属，核对 Git common-dir、dirty 和实际 tip。用 `git -C <实施根> rev-parse HEAD` 取得 source_tip；检查 `refs/spec-dev/archive/<特性标识>/source` 未占用或等于同一 tip，再用 `git update-ref <ref> <source_tip> <全零旧值>` 创建。登记为保留资源，不覆盖不同来源。复用隔离交原机制收尾。
- [ ] **步骤 4：真实合并并核验映射**：在实际来源根执行已授权的 ff/merge/squash，当场核对真实 Git 命令、退出码与原始输出，摘要写入计划；PR 通道核对实际合并响应并记录 URL 与 SHA，仍 open 保持未完成。记录 source_tip、target_branch、merge_method、merge_commit 与 verified_target。普通合并用 `git merge-base --is-ancestor <source_tip> <merge_commit>` 核对；squash 保留来源历史，比较实际业务内容映射。目标有业务差异先补验、复审和对账；不凭状态字段判断完成。
- [ ] **步骤 5：按台账清理**：核实本特性 execution 已不存在；若交付期间补验又产生文件，先更新结论再删除，不转存原件。工作区无待保存改动后执行台账中的精确资源清理命令；成功、核实不存在或有因保留/移交才勾选，失败不销账。一次保存、一次提交本批清理摘要，报告已清理/保留或移交/失败计数。台账外及共享缓存不动。
- [ ] **步骤 6：锚定与报告回写**：在存活来源将 spec.sync_commit 更新为已核验的 merge_commit 或 verified_target，窄暂存并独立提交；不自引用未来提交。验收报告仅追加“实际交付”节，包含来源/目标 SHA、实际合并事实与清理结果。其余正文变化返回补验。
- [ ] **步骤 7：完成记录**：在存活工作区核对步骤、已核验摘要与剩余资源处置，保存 delivery 事实、实际 SHA 和最终勾选，窄提交计划。交付事实沿原 `json spec-dev-delivery` 字段，不新造状态格式；缺口仍写明未完成，roadmap 只在完整交付后标 delivered。

生成计划时把每步实际命令及失败分支写全，共用命令可以放计划头部，任务给节名及实参。无 spec 或非 Git 的适用步骤如实注明不适用，不伪造绑定、提交或合并回执。上述交付记录本身不证明测试通过；始终保留受测版本与实际交付版本的比较依据。

## Git 交付结果

本地合并可用下面片段执行并在工具结果中返回真实命令、退出码、输出哈希与目标 SHA，不生成文件。原始 stdout/stderr 输出到当前工具结果；计划只摘录必要事实。失败停止后续操作，保留失败结论，核查原因后再继续。

调用：`python3 - <实际来源根> <source_tip> <ff|merge|squash> <operations的JSON数组>`，标准输入为下列代码。operations 例如 `[["git","merge","--ff-only","<实施分支>"]]`；squash 包含实际 merge --squash 与 commit。操作成功仍须完成步骤 4 的映射核验。

```python
import sys,json,hashlib,subprocess
repo,source_tip,method,operations_json=sys.argv[1:]
operations=[]
for argv in json.loads(operations_json):
    result=subprocess.run(argv,cwd=repo,capture_output=True)
    item={'argv':argv,'cwd':repo,'exit_code':result.returncode}
    for name,raw in [('stdout',result.stdout),('stderr',result.stderr)]:
        sys.stderr.buffer.write(raw)
        item[name+'_sha256']=hashlib.sha256(raw).hexdigest()
    operations.append(item)
    if result.returncode:
        print(json.dumps({'source_tip':source_tip,'method':method,'operations':operations}))
        raise SystemExit(1)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
print(json.dumps({'source_tip':source_tip,'target_commit':head,'method':method,'operations':operations}))
```
