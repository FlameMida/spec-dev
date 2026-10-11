# 并发执行模式

本文件是 executing-plans 的默认任务图编排分支。已授权执行且具备派发条件，或恢复已持久化 parallel 时取得全文；沿主入口说明调度方式，并在首次编排动作、切换激活或恢复前展示下面的模型表。

## 模型与思考强度声明


本节是声明的唯一定义点，执行主入口只引用本节。固定沿用用户选定的三列表格形态（下面尖括号为生成时填入的值，不是指定某个模型）：

| 角色 | 模型 | 思考强度 |
|---|---|---|
| 👤 主线程 | `<当前模型标识或未知>` | `<当前强度或未知/不支持>` |
| 🤖 并发实现子代理 | `<计划模型；继承时注明继承主线程>` | `<计划强度；继承时注明继承主线程>` |

表格下用简短说明交代来源和状态，例如“主线程配置已由当前会话记录核实；子代理尚未启动，将按表中配置派发”。该示例只有事实成立时才可使用。不同配置按任务组增加 🤖 行；恢复时把原存活 implementer 与拟派发者分别标明，不能让读者误以为存活者随新主线程换了配置。来源不另增第四列，表格仍保持角色、模型、思考强度三列。

值使用平台实际暴露的标识（包括不支持可调思考强度的明确事实），不把各厂商等级强行换算为同一强度。证据优先使用当前会话/运行工具提供的元数据；只能读取默认配置或拟派发参数时明确标“配置值/待派发”，不作运行时保证。核验只读取相关模型字段，不读取或输出凭据。

声明不依赖先取得写权限，也不改变中断恢复中的锁顺序：恢复开始可只读核对并展示，新主线程取得锁后才保存新声明和更新 owner。若用户对模型/强度有硬约束，而当前工具不支持指定、实际配置不满足或无法验证约束是否满足，报告限制并阻塞相关派发；没有这类约束时，信息不完整仅注明边界并继续已授权流程。观察到实际运行配置与先前计划不同，重新说明差异并沿既有约束处理，不能悄悄把声明改成已满足。


后续派发配置变化时，在受影响执行者继续工作前重新展示三列表；相同配置的连续派发不逐票重复。恢复时存活 implementer 保留原声明，新认领关联本次声明；字段与 notes 格式见 writing-plans。声明本身不提供模型变更授权。

## 入口与定义点

启动只读 index、progress、spec；任务正文按需读取。声明与 progress 字段按 [计划格式](../../writing-plans/references/plan-format.md)、[并发声明](../../writing-plans/references/parallel-declaration.md) 及适用的 [集成组声明](../../writing-plans/references/integration-declaration.md) 取得唯一完整定义；TDD、worktree、测试 Lane 分别遵循 test-driven-development、using-git-worktrees、test-strategy；工具映射见 requirement-analysis 的 references/codex-compat.md；探索、插件根、研究子题失败隔离与输出契约见 requirement-analysis 的 references/exploration-patterns.md，实施失败沿 [结果接收](parallel-result-integration.md) 分类，不复制完整纪律。

先使用 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index` 并传入实际计划目录。执行授权有效、没有明确串行限制、声明合法且至少一张普通实施票具备可核验的写集合/资源边界时，默认进入；不需要额外并发选择或两张独立票。共同依赖 T00 不影响初始化，实际派发仍须依赖全 completed。依赖链或排他资源让实际并行数降为一，不改变模式。明确串行、缺声明、无可派发票或平台不支持隔离时沿主入口串行分流；声明损坏先修订校验，未知执行者先恢复核验，不自动改计划或覆盖状态。

T00、独立 final 验证、验收、最终任务只由主线程执行；已授权 TDD 例外、相关基线范围显式为空或无法预先确定写集合的票也由主线程排空在途 implementer 后执行，沿用原例外/空范围规则，不伪造 pass。已激活模式下一次只剩一票也保持 parallel。

## 独占与恢复

首次受保护写入前实际取得 [特性锁协议](feature-lock.md)，沿 common-dir/feature_key 竞争同一锁；持锁主线程独占进度与集成。未知旧 owner 不按时间抢锁，释放后不写状态。
首次激活、模式切换及中断恢复之前取得 [激活与恢复](parallel-activation-recovery.md) 完整规则，已有当前定义可复用。

### 首次激活与任务边界切换

按 [激活与恢复](parallel-activation-recovery.md) 读取对应分支；请求、授权、检查点和模型声明保持，未核实状态不重派任务。

## 集成组主线程分流

含组 v2 在普通调度前使用 plan-state；组员和组验证票不进入 parallel 声明/implementer 集合。按 executing-plans 的 [integration-groups.md](integration-groups.md) 收拢在途票、独占集成分支、保存待验与统一验证；期间禁止新派发和其他合入，validated_commit 不随待验提交前移。状态字段由 writing-plans 单点定义，integration 与 execution 投影同次更新。组完成后保留原 mode、base_commit、模型声明与授权恢复普通派发；不把票内待验当成切模式完成边界。

## 持续调度就绪任务

把计划作为依赖图，frontier 指依赖已完成的 pending 候选。每次集成验证并保存 completed、确认资源释放或阻塞解除后重新计算，不等待上一批全部结束。implementer 回报 ready 只触发接收核验，不解锁后继；调度集合从 progress 和真实认领推导，不另存批次状态。

1. 主线程完成 T00 和集成基线，再从 ready 的最小任务号起扫描；资源冲突的候选暂缓，继续检查后面的独立票，直到可用名额用完或无合法候选。ready 只看 completed 依赖，implementer ready 回报不算完成。保留最初 base_commit 为全特性审查基线，validated_commit 为新分支的唯一派发基线。
2. 读取所选任务正文核对声明。将 writes 逐个用 `resolveWrite(root,value)` 解析真实路径，拒绝保留路径、目录授权、逃逸、新文件祖先逃逸、票内大小写/Unicode/别名碰撞；用 `conflicting(a,b)` 与所有仍占用写集合/资源的认领及本次拟派集合比较，包括运行中、已回报但尚未接收、停止事实未核实的 blocked/失联票。不能只比较同轮新票，或因收到报告/超时就推定资源释放。不同文件间的语义依赖仍须在导航表表达。
3. 主线程生成 claim_key，原子更新 progress.tasks 的 claim、status=in_progress、model_declaration_id，并预登记分支/worktree/专属证据目录和外部资源；提交后才创建。worktree 从 validated_commit 建立，核对实际路径、分支、HEAD，安装依赖并跑票的基线。不能把源工作区未提交改动拷进去；锁文件和 bootstrap 生成物也须获准，发版钩子越界且不能按仓库授权安全配置时串行。
4. 派发前从 spec、本票及依赖接口行核对 seam 来源：显式批准直接使用，存量只唯一提取已有决定；不能唯一确定或互相冲突时由主线程处理，停止受影响票。派发受当前平台实际可用名额约束，不写死限额。输入含 task_id/claim_key、绝对 worktree、branch/base_commit、任务/spec/index/依赖接口/研究指针、writes/resources、测试命令、预登记证据目录。输入同时携带获批 seam、Scenario、依赖替换边界及来源指针，要求 implementer 读取 agents/implementer.md 并遵守绑定、TDD、自检、回报协议；Codex 无 cwd 参数时每条命令显式指定工作目录。工具返回 agent_id 后立刻保存回执，缺回执不等于没启动。平台不能可靠隔离则停止派发，说明原因串行接管。
5. 外部事实调查交只读 explorer；主线程将来源笔记写入 research，再传指针，不复制全部任务正文或重复已有调查。契约偏差冻结相关票和依赖闭包，按 executing-plans 三级纪律处理；修订后重新校验声明，不自行扩大已派写集合。

有报告先按接收协议逐票集成，成功保存后立即检查新 frontier 并补位；无报告且有在途票时等待其事件，不重复派发。无合法候选时区分依赖未完成、容量/资源占用和真实 blocked，不能把“目前无 ready”当作全部完成。主线程专属票或集成组一旦被选为下一执行项，先停止补位、收拢在途工作再进入，避免不断补票使其无法开始；它们完成后恢复原并发模式。集成失败按接收协议全局暂停新派发/合入。

**实际调度诊断**：首次派发、接收补位及阻塞原因变化时，简短列明活跃票、可派发票与暂缓原因；原因定位到依赖任务、相交文件、资源键或平台容量。ready 不等于可同时运行，mode=parallel 和工作区数量不作为并行证据。这个诊断从已提交 progress 和真实认领推导，不另存第二套调度状态。发现等待来自未消费的依赖或可消除共享写入时，带证据交回 writing-plans 修订未派发票；已有声明修订前不越界派发，不通过放宽安全边或改资源名制造并发。

**通信**：派发以任务/spec/index/研究/证据指针加真实 binding 和必要限制为主；续接只发新增事实、待处理问题及其指针，不反复复制整票指令。无新事实时等待事件，不轮询子代理来复述同一等待。日志落盘不等于每次候选都要额外提交；检查点纪律沿主入口的资源登记节。

例如 T01/T02 在途，T03 仅依赖 T01：T01 集成、验证并保存 completed 后，若 T03 与仍运行的 T02 无冲突且有名额，立即从新 validated_commit 派 T03。T02 保留原 claim.base_commit；不要求它自行 merge/rebase 集成分支，也不 reset 已有工作来追赶 tip。其结果仍由主线程按真实 ancestry 和当前集成候选验证。

## 接收与集成

在首次接收/合入前取得 [结果接收与集成](parallel-result-integration.md) 全文。
主线程按 claim 核验 schema、真实 Git、红绿日志及资源归属；blocked 是有效回报，不能要求改成 ready。
合入和适用集成验证通过后才更新 completed 与 validated_commit，状态提交不自引用；失败保留旧基线，失联者未核实停止前不重派。

## 收尾与交付

全部实施票已集成并由主线程完成独立 final 验证后，把完整 `base_commit..集成 HEAD`、spec、progress、研究与证据指针交回 executing-plans 的阶段 4—6，审查定义以 executing-plans/references/review-orchestration.md 为准。维度审查、独立复核、completeness critic、矩阵验收、final 全量与修复后补验均保留，票内自检不能替代。

串行与并发共用 executing-plans/references/delivery-channels.md：默认本地，PR 需既有授权；ready 不是已合并。票级闲置工作区按 [票级退役](parallel-result-integration.md#票级-worktree-退役) 在任务边界处理，集成工作区留待最终交付；未集成工作、失联代理与未归档证据保留。最终取代回写、实际 merge 证据、清理、sync_commit 与 roadmap 全部完成才宣称交付。

新计划要求 scopes 能力回执，parallel 仅声明 resources。主线程核对静态 scope_commit 先于已验证派发基线，claim_checkpoint 对应真实认领，再提交 binding 取得 authority。implementer 只在指定工作区激活本地引用，不写进度；claim 检查点不必是实现初始 HEAD 的祖先，不能修改 validated_commit 来迁就绑定。
