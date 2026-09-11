# 结果接收与集成

> 阅读时机：首次接收、核验或集成结果之前；异常恢复时取得相关完整规则。

持锁与恢复依 [特性锁](feature-lock.md)、[激活与恢复](activation-recovery.md)。

## 接收与集成

按当前 claim_key 区分重复回报和旧尝试：已接受同一结果幂等忽略；旧 key 不改新 claim；新尝试的 key 和旧尝试处置追加 notes。主线程归档实际 JSON/日志到 execution/<claim_key>/，只保留可恢复指针，不让子代理写共享档案。

先用 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" implementation-result` 校验实际结果文件；校验失败发回补全一次，再失败主线程接管（定义见 exploration-patterns「输出契约与校验」）。校验器不可用沿 canonical 降级并显式记录，不能省略真实 Git 核验。

`blocked` 是合法业务回报，不按格式错误要求改成 ready。主线程持锁把该票标 blocked，保存原因、原 claim 和结果/证据指针，冻结其依赖闭包；独立且不冲突的任务可继续，集成失败则遵循下文的全局暂停规则。执行中长时间无回报，先询问状态并核对运行事实；未知则按失联恢复处理，不能把等待超时当作终止证明。缩小范围重试、重新认领或主线程接管写入之前，必须先确认原执行者及其写入进程已停止、检查并保留工作区和证据，再沿既有失败隔离的一次重试上限处理；仍存活且可通信者保留原 claim 继续，不能同时启动替身。

只有 ready 结果进入 Git 接收核验：然后调用模块 `scripts/lib/parallel-plan.mjs` 的 `verifyResult(report, claim, writes)`；claim 输入含 task_id/key/worktree/branch/base_commit。该函数返回 string[]，非空立即拒收。它核验真实分支、基线 ancestry、全部实现提交、净差异和中间提交、rename 两端、dirty/untracked 与持久证据存在；Git 词法路径必须属于原始精确 writes，真实路径检查另行拒绝逃逸及基线后的链接重绑定（包括中间提交），重绑定需主线程重新核验声明后处理；先做 schema 校验再调用。主线程还须阅读红绿日志确认故障类别与测试有效性、验证实际资源归属、metadata 变化与 claim 归属，不能把结构/文件存在性等同正确性。不能运行该核验时逐项检查同等 Git 事实并记录降级，不盲信 changed_files。

仅持锁主线程逐票执行保留 ancestry 的 merge，不用 squash/cherry-pick。合并前工作区干净；HEAD 为 validated_commit 或仅领先可核验的主线程进度/证据提交且业务树相同，不能含未验证实现；实际 git merge 冲突时保留冲突现场交用户，不自动选 ours/theirs。合并后运行该票集成测试并归档日志，全部通过才把 accepted integration SHA 写 tasks.TNN.commit、implementation tip 写 implementation_commit、状态 completed；在同一次原子进度更新中把 execution.validated_commit 同步设为该 accepted integration SHA，再单独提交进度，禁止自引用 SHA。后继票从更新后的 validated_commit 创建，包含已接受的前置实现；恢复补记与主线程执行例外票完成也遵循此规则，验证失败保持旧值。

集成失败时冻结受影响任务和后继，暂停新派发/新合并；已在旧 validated_commit 工作的独立票可完成并暂存报告，不能以失败 HEAD 派新票。恢复发现实现 tip 已是集成 HEAD 祖先时不重复 merge，只补缺失验证/状态；无证据不猜 pass。解释不清的提交、丢失任务文件或 worktree 冻结相关恢复，不从来源分支的陈旧 progress 新起一套。
