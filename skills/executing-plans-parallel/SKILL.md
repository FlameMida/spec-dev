---
name: executing-plans-parallel
description: >-
  并发执行已批准的分文件实施计划——仅在用户明确选择、依赖拓扑允许独立任务且写集合与资源可隔离时使用；主线程先声明模型与思考强度，独占进度与集成，implementer 在独立 worktree 中完成单票 TDD。支持任务边界切换与中断恢复；普通继续、缺声明或纯依赖链仍走 executing-plans。
---

> 语言协议：以用户对话语言输出；显式语言要求优先。落盘产物沿用创建时语言，JSON 字段名不翻译。

> **插件根**：`${CLAUDE_PLUGIN_ROOT}`——本 skill 正文与其 references 中的插件根命令以此为准；若上式仍为变量字面量（平台未替换），按 requirement-analysis 的 references/exploration-patterns.md「插件根解析」序列推导。

> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。

# 可选并发执行

开始声明「我正在使用 executing-plans-parallel 编排已批准的实施计划」，并在首次执行动作、切换激活或恢复编排前展示下面的模型表。

## 模型与思考强度声明


本节是声明的唯一定义点，executing-plans 的并发委托只引用本节。固定沿用用户选定的三列表格形态（下面尖括号为生成时填入的值，不是指定某个模型）：

| 角色 | 模型 | 思考强度 |
|---|---|---|
| 👤 主线程 | `<当前模型标识或未知>` | `<当前强度或未知/不支持>` |
| 🤖 并发实现子代理 | `<计划模型；继承时注明继承主线程>` | `<计划强度；继承时注明继承主线程>` |

表格下用简短说明交代来源和状态，例如“主线程配置已由当前会话记录核实；子代理尚未启动，将按表中配置派发”。该示例只有事实成立时才可使用。不同配置按任务组增加 🤖 行；恢复时把原存活 implementer 与拟派发者分别标明，不能让读者误以为存活者随新主线程换了配置。来源不另增第四列，表格仍保持角色、模型、思考强度三列。

值使用平台实际暴露的标识（包括不支持可调思考强度的明确事实），不把各厂商等级强行换算为同一强度。证据优先使用当前会话/运行工具提供的元数据；只能读取默认配置或拟派发参数时明确标“配置值/待派发”，不作运行时保证。核验只读取相关模型字段，不读取或输出凭据。

声明不依赖先取得写权限，也不改变中断恢复中的锁顺序：恢复开始可只读核对并展示，新主线程取得锁后才保存新声明和更新 owner。若用户对模型/强度有硬约束，而当前工具不支持指定、实际配置不满足或无法验证约束是否满足，报告限制并阻塞相关派发；没有这类约束时，信息不完整仅注明边界并继续已授权流程。观察到实际运行配置与先前计划不同，重新说明差异并沿既有约束处理，不能悄悄把声明改成已满足。


后续派发配置变化时，在受影响执行者继续工作前重新展示三列表；相同配置的连续派发不逐票重复。恢复时存活 implementer 保留原声明，新认领关联本次声明；字段与 notes 格式见 writing-plans。声明本身不提供模型变更授权。

## 入口与定义点

启动只读 index、progress、spec；任务正文按需读取。声明与 progress 字段按 [计划格式](../writing-plans/references/plan-format.md)、[并发声明](../writing-plans/references/parallel-declaration.md) 及适用的 [集成组声明](../writing-plans/references/integration-declaration.md) 取得唯一完整定义；TDD、worktree、测试 Lane 分别遵循 test-driven-development、using-git-worktrees、test-strategy；工具映射见 requirement-analysis 的 references/codex-compat.md；探索、插件根、失败隔离与输出契约见 requirement-analysis 的 references/exploration-patterns.md，不复制其完整纪律。

先使用 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index` 并传入实际计划目录。仅在用户已明确选择、声明合法、导航拓扑至少存在两张无相互依赖路径且资源隔离的实施票时进入；共同依赖 T00 不影响资格，实际派发仍须依赖全 completed。普通「继续」只沿用已持久化模式，未选模式默认串行。缺声明、能力不可用或只有依赖链则说明原因回 executing-plans，不自动改计划。

T00、验收、最终任务只由主线程执行；已授权 TDD 例外、相关基线范围显式为空或无法预先确定写集合的票也由主线程排空在途 implementer 后执行，沿用原例外/空范围规则，不伪造 pass。已激活模式下一次只剩一票也保持 parallel。

## 独占与恢复

首次受保护写入前实际取得 [特性锁协议](references/feature-lock.md)，沿 common-dir/feature_key 竞争同一锁；持锁主线程独占进度与集成。未知旧 owner 不按时间抢锁，释放后不写状态。
首次激活、模式切换及中断恢复之前取得 [激活与恢复](references/activation-recovery.md) 完整规则，已有当前定义可复用。

### 首次激活与任务边界切换

按 [激活与恢复](references/activation-recovery.md) 读取对应分支；请求、授权、检查点和模型声明保持，未核实状态不重派任务。

## 集成组主线程分流

含组 v2 在普通调度前使用 plan-state；组员和组验证票不进入 parallel 声明/implementer 集合。按 executing-plans 的 [integration-groups.md](../executing-plans/references/integration-groups.md) 收拢在途票、独占集成分支、保存待验与统一验证；期间禁止新派发和其他合入，validated_commit 不随待验提交前移。状态字段由 writing-plans 单点定义，integration 与 execution 投影同次更新。组完成后保留原 mode、base_commit、模型声明与授权恢复普通派发；不把票内待验当成切模式完成边界。

## 派发一轮

1. 主线程完成 T00 和集成基线，再从 ready 的最小任务号起选择互不冲突集合；ready 只看 completed 依赖，implementer ready 回报不算完成。保留最初 base_commit 为全特性审查基线，validated_commit 为新分支的唯一派发基线。
2. 读取所选任务正文核对声明。将 writes 逐个用 `resolveWrite(root,value)` 解析真实路径，拒绝保留路径、目录授权、逃逸、新文件祖先逃逸、票内大小写/Unicode/别名碰撞；用 `conflicting(a,b)` 检查真实写集合及排他资源。不同文件间的语义依赖仍须在导航表表达。
3. 主线程生成 claim_key，原子更新 progress.tasks 的 claim、status=in_progress、model_declaration_id，并预登记分支/worktree/专属证据目录和外部资源；提交后才创建。worktree 从 validated_commit 建立，核对实际路径、分支、HEAD，安装依赖并跑票的基线。不能把源工作区未提交改动拷进去；锁文件和 bootstrap 生成物也须获准，发版钩子越界且不能按仓库授权安全配置时串行。
4. 派发前从 spec、本票及依赖接口行核对 seam 来源：显式批准直接使用，存量只唯一提取已有决定；不能唯一确定或互相冲突时由主线程处理，停止受影响票。派发受当前平台实际可用名额约束，不写死限额。输入含 task_id/claim_key、绝对 worktree、branch/base_commit、任务/spec/index/依赖接口/研究指针、writes/resources、测试命令、预登记证据目录。输入同时携带获批 seam、Scenario、依赖替换边界及来源指针，要求 implementer 读取 agents/implementer.md 并遵守绑定、TDD、自检、回报协议；Codex 无 cwd 参数时每条命令显式指定工作目录。工具返回 agent_id 后立刻保存回执，缺回执不等于没启动。平台不能可靠隔离则停止派发，说明原因串行接管。
5. 外部事实调查交只读 explorer；主线程将来源笔记写入 research，再传指针，不复制全部任务正文或重复已有调查。契约偏差冻结相关票和依赖闭包，按 executing-plans 三级纪律处理；修订后重新校验声明，不自行扩大已派写集合。

## 接收与集成

在首次接收/合入前取得 [结果接收与集成](references/result-integration.md) 全文。
主线程按 claim 核验 schema、真实 Git、红绿日志及资源归属；blocked 是有效回报，不能要求改成 ready。
合入和适用集成验证通过后才更新 completed 与 validated_commit，状态提交不自引用；失败保留旧基线，失联者未核实停止前不重派。

## 收尾与交付

全部实施票已集成后，把完整 `base_commit..集成 HEAD`、spec、progress、研究与证据指针交回 executing-plans 的阶段 4—6，审查定义以 executing-plans/references/review-orchestration.md 为准。维度审查、独立复核、completeness critic、矩阵验收、最终全量验证均保留，票内自检不能替代。

串行与并发共用 executing-plans/references/delivery-channels.md：默认本地，PR 需既有授权；ready 不是已合并。清理只遍历 progress.resources，确认结果已接受且证据已归档后才移除 implementer worktree；未集成工作、失联代理与未归档证据保留。最终取代回写、实际 merge 证据、清理、sync_commit 与 roadmap 全部完成才宣称交付。
