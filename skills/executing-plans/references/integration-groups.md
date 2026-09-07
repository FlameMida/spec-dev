# 集成组执行协议

> 字段和格式唯一定义在 writing-plans 的集成组声明与 v2 进度节；这里定义执行时序。适用于已批准且机器预检支持的组，不适用于无组 v1 或旧单文件。普通 implementer 协议与模型声明仍遵循 executing-plans-parallel。

## 执行入口

先解析 index/progress/spec；含组必须识别 format_version=2 与 protocol_version=1。每个状态边界运行插件根的 `scripts/validate-output.mjs plan-state <plan-dir>`：exit 0 且协议号匹配才消费 ready_tasks。ok=true 且 ready_tasks=[] 可表示合法业务阻塞，不强行找下一票。未知能力/非Git/无法隔离的组停止，不用旧普通流程猜执行。

先读取 [executing-plans-parallel 的集成工作区与特性锁规则](../../executing-plans-parallel/SKILL.md)，按同一 common-dir/feature_key 规则取得特性锁，核实 owner 后才写 progress。取得、释放、接管都必须经过同一特性级原子维护门，在门内重新核对 owner 与锁实体；仅原子 mkdir 特性锁不能代替维护门。平台无法证明旧 owner 停止时保持阻塞，不按超时抢锁。普通模式、原始审查基线、授权请求、模型声明、资源与 claim 保留。并发进入组前停止新派发，收拢并核验全部在途票到已验证基线；未知执行者或未接收实现阻止进组。

主动暂停顺序：持锁完成本次进度保存与提交 → 运行 plan-state，所有修正及其提交也须在锁内完成 → 核对工作区干净 → 经过维护门释放自己持有的锁实体 → 停止写入。释放后保留已提交的 integration.owner 作为历史归属，不写 null；它不是实时持锁证明。释放后发现需要更正，即使只是 amend 进度，也必须先重新取得锁并核对最新检查点。

组进入、组内操作、失败修复、恢复和完成按以下规则进行。current 仅指主线程当前票；组员不创建 implementer claim，不写 ready 的 implementation-result。


1. 活动组为空：普通票按 completed 依赖；整组只能在其全部外部前置 completed、资源可用、组基线实际通过且没有在途执行者/未接收实现时进入。保存组启动检查点后才开始业务写入。
2. 活动组存在：仅返回此组下一个可执行成员，成员的组内依赖必须 awaiting_verification 或 completed；未完成前序成员阻止越序。全部成员待验后仅 verify 可执行。blocked 时 ready 为空，由主线程明确修复/恢复后再算。
3. 普通票和其他组不消费成员中间状态。验证票通过和进度持久化前，不清 active_group、不推进验证基线、不切模式或从当前失败 HEAD 派票。
4. 每票先记录批准检查命令、期望允许的暂时失败及归因；命令、cwd、exit、实际实现 SHA/业务树标识、stdout/stderr 路径及 SHA-256 归档到特性 `execution/groups/GNN/TNN/<attempt>/`。原日志和失败尝试不可覆盖。组验证覆盖批准的全部组 Scenario、相关回归及旧形/调用者清理，没有必需测试记 skip/未运行而宣称通过的出口。
5. 状态转移只能在工作区已解释且实现提交存在时持久化；未提交业务改动在崩溃恢复时先核对本票归属，不 reset/stash/覆盖。日志存在与哈希只证明可恢复/未变更，不自证命令曾真实执行；主线程与独立审查核对实际工具回执、失败原因和语义。

计划必须为每个组给出组验证命令、公共 seam/Scenario、保护基线、局部必通过检查以及延期检查原因，不能仅把 `reason` 当免测许可。序列中有行为变化时在写该变化前保留有效红；纯机械迁移保护测试先于组首改动。没有足够保护/有效红则处理缺口后才写代码，不把组协议当 TDD 例外授权。

### 修复、恢复与资源

- 组验证失败后，组与 verify blocked；原待验票不因失败被误标 completed 或全部清空。只读诊断可继续。验证票若需改业务代码，先回到承担该写集合的成员；若涉及新接口/范围，沿契约偏差门修订计划后再继续。
- 回到成员时保存旧尝试，成员 in_progress、受影响依赖闭包 blocked；主线程记录修复归属和动作，组恢复 in_progress、verify 回 pending 后持久化这个修复检查点，才允许写入。依赖闭包仍 blocked 的成员只在其前置重新待验后由主线程显式置 in_progress 进行有效性复核，普通 ready 不能自动跳过它。按声明接口/提交/检查逐票重新确认，仍有效的工作复用，缺证据补验，不重复应用已有补丁。再次进入待验后全部组验证重跑；不能仅重跑上次失败一条就接受改变后的代码树。
- 恢复从实际集成工作区的已提交 progress 起步，磁盘中未提交的状态只视作待核验准备；原 owner 停止、锁实体归属、工作区与分支绑定、SHA ancestry、角色记录与证据都核对。不能核实的冻结，仍活跃的执行者不按超时替换。组中不存在 implementer claim，普通历史认领不清空。
- 未知差异必须原样保留并阻塞，不能把它猜成模式切换准备后撤销。只有逐项核实属于本次且尚未提交的模式准备差异，才适用并发激活失败的撤销规则；这不是集成组恢复的通用回滚操作。
- 完成证据已齐而状态没提交，核对代码树没有改变后补完成检查点；发现原接受实现已经存在，不重复 merge。组成功后清 active_group、保留组档案，恢复原模式；原审查基线、交付通道、模型声明历史保持。
- 上述免重跑只适用于证据完整且业务树仍等于 V。证据缺失或已解释且获准的业务树改变时，先恢复证据/处理归属并重新运行所需组验证，再保存完成检查点；无法解释的差异先保留并阻塞，不能用旧通过结果解锁，也不能把“不重复测试”理解为禁止补验。
- 工作区和持久证据目录均沿 progress.resources 登记；组不新建额外 worktree。未通过或证据未归档的现场不清理；最终仍只遍历台账并完成全量、实际合并、取代、sync_commit 与 roadmap 回写。


## 一次普通成员操作

1. 从已提交检查点读取本票、依赖接口与既有获批 seam；标 in_progress/current，并先单独提交进度。
2. 沿任务写集合实施，运行所有能运行的检查。普通行为改变先观察有效行为红；纯迁移使用组首保护，不能拿编译失败充当红。只有计划明确的组间暂时失败可以记待验；意外局部失败时成员与整组均 blocked，保留失败原因和旧证据，不扩大允许失败的范围。修复/复核按本协议恢复待验，不能将成员改走普通完成流程来解锁后继。
3. 核对 over/under-building 和接口；保存实际实现提交 C，归档每条检查的命令、cwd、exit、C/业务树与日志，不覆盖旧尝试。
4. 核实证据后，成员 awaiting_verification/tests=pending_group、implementation_commit=C、commit=null；更新组 checkpoint_commit=C、current=null，原子保存再单独提交进度。组外依赖仍等待 verify。
5. 运行 plan-state 检查已提交状态，再按 ready_tasks 进入本组下一票。

## 组验证与完成

所有成员待验后执行独立 verify 任务，覆盖计划规定的全部组 Scenario、相关回归、旧形和调用者清理。失败则组/verify blocked、保留组员待验和旧验证基线；只读诊断可继续。修复先回到有写集合的成员并保存修复检查点，接口/范围偏差仍交用户。

成功后以实际通过的业务树对应提交 V 同次原子完成所有成员、verify、组，填写各自 commit=V、保留各成员 implementation_commit，更新 integration.validated_commit（parallel 也同步 execution 投影），清 active_group/current；进度提交与 V 分开。之后重新预检才恢复普通调度，项目最终全量与审查/验收/交付仍执行。

## 证据记录形状

每条 evidence_paths 指向特性内 `execution/groups/GNN/TNN/<attempt>/record.json`；每次尝试独立目录。记录包含 command（实际 argv 字符串数组）、cwd、exit_code、commit、tree、stdout/stderr 相对特性路径和两个 sha256。tree 是 `git ls-tree -r -z C` 中排除本特性 plan/progress.yaml 与 execution/ 后的记录用 NUL 连接再 SHA-256；其余文件（包括 spec/index/任务接口）改变都会使树不同。日志可恢复/哈希吻合只证明字节没变，主线程和审查者仍核对工具回执、命令与失败类别；不手写“pass”冒充测试。

completed 组必须有 verify 自己目录中的通过证据，记录的业务树等于 V；成员历史非零记录仍保留，不改成零。CLI 不会运行测试、取得锁或执行恢复写入。未提交进度返回 checkpoint_uncommitted；恢复者核对磁盘、已提交档案、真实提交和日志后补检查点，不用未提交 completed 解锁。
