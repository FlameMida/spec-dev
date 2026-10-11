# 结果接收与集成

> 阅读时机：首次接收、核验或集成结果之前；异常恢复时取得相关完整规则。

持锁与恢复依 [特性锁](feature-lock.md)、[激活与恢复](parallel-activation-recovery.md)。

## 接收与集成

按当前 claim_key 区分重复回报和旧尝试：已接受同一结果幂等忽略；旧 key 不改新 claim；新尝试的 key 和旧尝试处置追加 notes。主线程归档实际 JSON/日志到 execution/<claim_key>/，只保留可恢复指针，不让子代理写共享档案。

先用 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" implementation-result` 校验实际结果文件；校验失败发回补全一次，再失败主线程接管（定义见 exploration-patterns「输出契约与校验」）。校验器不可用沿 canonical 降级并显式记录，不能省略真实 Git 核验。

`blocked` 是合法业务回报，不按格式错误要求改成 ready。主线程持锁把该票标 blocked，保存原因、原 claim 和结果/证据指针，冻结其依赖闭包；独立且不冲突的任务可继续，集成失败则遵循下文的全局暂停规则。执行中长时间无回报，先询问状态并核对运行事实；未知则按失联恢复处理，不能把等待超时当作终止证明。

**实施失败分类**：

- 目标断言失败、编译或测试环境故障：保留原件并在仍有效的 claim 内定位、修复、补验；编译/环境失败不是行为红。普通修复不新建 worktree，也不套用研究代理的“缩小范围重试一次”来截断 TDD 或减少验收。
- 代理调用失败或执行者终止：先核实调用是否启动、旧执行者及其写入进程是否已停止，保全已有代码/证据，再沿可核验结果续接或接管。同一存活且可通信者保留原 claim，不能同时启动替身；未知状态冻结恢复。
- 计划/契约/写集失效：冻结受影响依赖闭包，由主线程按偏差纪律修订和重验绑定。仅原 worktree/绑定确实不能安全续接时建立新尝试，记录原因和旧现场归属；不得因增加尝试编号就扩大 writes、缩减需求或改旧回执。

研究子题的缩域重试规则仍留在 exploration-patterns；它不决定实施票的测试次数或新 worktree 数量。

只有 ready 结果进入 Git 接收核验：然后调用模块 `scripts/lib/parallel-plan.mjs` 的 `verifyResult(report, claim, writes)`；claim 输入含 task_id/key/worktree/branch/base_commit。该函数返回 string[]，非空立即拒收。它核验真实分支、基线 ancestry、全部实现提交、净差异和中间提交、rename 两端、dirty/untracked 与持久证据存在；Git 词法路径必须属于原始精确 writes，真实路径检查另行拒绝逃逸及基线后的链接重绑定（包括中间提交），重绑定需主线程重新核验声明后处理；先做 schema 校验再调用。主线程还须阅读红绿日志确认故障类别与测试有效性、验证实际资源归属、metadata 变化与 claim 归属，不能把结构/文件存在性等同正确性。不能运行该核验时逐项检查同等 Git 事实并记录降级，不盲信 changed_files。

仅持锁主线程逐票执行保留 ancestry 的 merge，不用 squash/cherry-pick。合并前工作区干净；HEAD 为 validated_commit 或仅领先可核验的主线程进度/证据提交且业务树相同，不能含未验证实现；实际 git merge 冲突时保留冲突现场交用户，不自动选 ours/theirs。合并后运行该票集成测试并归档日志，全部通过才把 accepted integration SHA 写 tasks.TNN.commit、implementation tip 写 implementation_commit、状态 completed；在同一次原子进度更新中把 execution.validated_commit 同步设为该 accepted integration SHA，再单独提交进度，禁止自引用 SHA。后继票从更新后的 validated_commit 创建，包含已接受的前置实现；恢复补记与主线程执行例外票完成也遵循此规则，验证失败保持旧值。

集成失败时冻结受影响任务和后继，暂停新派发/新合并；已在旧 validated_commit 工作的独立票可完成并暂存报告，不能以失败 HEAD 派新票。恢复发现实现 tip 已是集成 HEAD 祖先时不重复 merge，只补缺失验证/状态；无证据不猜 pass。解释不清的提交、丢失任务文件或 worktree 冻结相关恢复，不从来源分支的陈旧 progress 新起一套。

成功保存 completed 后回到 [持续调度](parallel-execution.md#持续调度就绪任务) 检查后继，不等其他独立票结束。任务接收和外部资源释放分别核验：仍运行的服务、未终止的写入进程或待保全的现场不会因状态变成 completed/blocked 自动消失，确认释放之前保留相应排他占用。收到较旧基线的合法结果并非失败；implementer 不自行拉入集成分支，主线程在当前候选上逐票合并与验证。

上述保留 ancestry 的要求只用于票级接收；最终来源→目标 merge/squash 按 delivery-proof 核验。集成完成后由主线程先做独立 final，再审查、验收/对账和交付。

## 票级 worktree 退役

每次接收完成或旧尝试停止后的任务边界，协调器核对闲置工作区是否仍有用途；退役检查不阻止无冲突的后继补位。结果已接受、提交对象由集成历史或实际保留 ref 保存、工作区干净、执行者及相关写入进程已停止且无消费者依赖其文件/链接时，可以退役本计划 created 的 implementer worktree，不必等全特性交付。尚需保留时在现有 notes/resources 写明具体原因，不把工作区累计数量当作活跃任务数。

清理前用 execution-evidence transfer 将已登记的结果、日志和失败尝试转存至删除后仍存活的目录，核对转存回执及文件 hash，保存 evidence_paths，不提交 ignored 日志；符号链接保留了链接字节不等于目标材料已转存，需核对实际依赖。Git 用正常 worktree remove，不用 --force；实现 tip 已有保留依据且正常 git branch -d 可通过时才删除拥有的工作分支，不能用 -D 绕过未合入保护。清理只遍历 progress.resources，不动 inherited/台账外资源与共享缓存。

有未保存内容、未知写者、未接收实现、证据缺口或链接依赖时保留现场；旧失败尝试须先转存实际 tracked 修改、untracked 文件和原件并核对 hash，不能用“HEAD 已合入”替代 dirty 检查。只有已有授权覆盖、归属明确且当前字节与已保存副本一致的本 claim 改动，才可逐路径移交或恢复使工作区干净；未知改动仍保留，不用 reset/stash/clean 或强制删除处理。

清理记录沿 writing-plans 的 [台账清理模板](../../writing-plans/references/delivery-templates.md) 使用 `entry/outcome/receipt`：协调器保存实际清理命令、退出码与证据指针；实际删除成功后，从 `progress.resources` 移除原条目，并向 `progress.notes` 追加 `cleanup: ` 加该结果的 JSON（`outcome: removed`）。失败保留资源条目，追加真实失败回执（`outcome: failed`）。销账与 notes 在同一次原子更新中保存，和本次任务边界状态一并提交；不在 resources 中保留 removed 状态条目。保留历史 claim、binding、SHA 和原 cwd，不改写成新位置。

恢复已退役 completed 票时在存活仓库核对保留提交、接收证据、notes 中对应原资源的清理结果及其真实回执，不要求 resources 中仍有已销账条目，也不再检查被合法删除的目录；资源条目消失本身不证明合法退役，无退役依据的目录缺失仍按不一致处理。集成工作区、最终来源/目标交付、history_ref 和整体 proof 沿 delivery-channels 留到最终交付，不与票级退役混用。
