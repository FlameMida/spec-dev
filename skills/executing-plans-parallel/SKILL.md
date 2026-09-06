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

启动只读 index、progress、spec；任务正文按需读取。声明与 progress 字段以 writing-plans 为唯一定义点；TDD、worktree、测试 Lane 分别遵循 test-driven-development、using-git-worktrees、test-strategy；工具映射见 requirement-analysis 的 references/codex-compat.md；探索、插件根、失败隔离与输出契约见 requirement-analysis 的 references/exploration-patterns.md，不复制其完整纪律。

先使用 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index` 并传入实际计划目录。仅在用户已明确选择、声明合法、导航拓扑至少存在两张无相互依赖路径且资源隔离的实施票时进入；共同依赖 T00 不影响资格，实际派发仍须依赖全 completed。普通「继续」只沿用已持久化模式，未选模式默认串行。缺声明、能力不可用或只有依赖链则说明原因回 executing-plans，不自动改计划。

T00、验收、最终任务只由主线程执行；已授权 TDD 例外、相关基线范围显式为空或无法预先确定写集合的票也由主线程排空在途 implementer 后执行，沿用原例外/空范围规则，不伪造 pass。已激活模式下一次只剩一票也保持 parallel。

## 独占与恢复

特性锁落在解析后的共享 git common dir 的 `spec-dev-locks/<feature_key 的哈希>/`，用原子创建取得；`feature_key` 是计划所属 worktree 根下、采用 `/` 的仓库根相对特性目录（例如 `.spec-dev/2026-09-06-01-concurrent-execution`），禁止把 worktree 绝对前缀纳入哈希。同一仓库的不同 worktree 因共享 common dir 且 feature_key 相同而竞争同一锁；不能从另一个 worktree 的 cwd 直接对绝对计划路径求相对值。锁载荷中的绝对路径仅用于定位原编排者档案，锁非第二份任务状态源。主动挂起前停止/回收在途代理、写进度 checkpoint 后可释放自己的锁。意外中断后的接管要求核实旧编排 owner 已停止并对照磁盘；旧 owner 状态无法核实则报告占用，不按时间自动接管。存活 implementer 不等于旧编排 owner 仍存活：新主线程取得锁并持久化 execution.owner 后，可以对身份可核验且能够恢复通信的存活 implementer 继续编排，保留原 claim；无法核验该 implementer 则阻塞相关票，不重派。接管时核对旧锁归属，不能删除已被另一个恢复者取得的新锁；不同主线程不得同时宣称 progress 写权限。


取得锁使用同一规范路径的原子 mkdir；存在锁时先只读核对 owner。所有启动/释放/接管都经过同一特性级原子维护门，门内重新核对 owner 和锁实体；核验旧 owner 已终止才移走原锁并取得新锁。维护门本身失联也需核验其持有者，不能按超时删除。无法可靠完成排他操作就阻塞，不用先 exists 再 mkdir 作为排他保证。释放仅处理当前持有的实体；禁止按路径盲删可能已属于其他会话的新锁。


### 首次激活

首次选择并发时，取得特性锁后由主线程完成 T00；已完成且可核验的 T00 不重做。将锁定位信息绑定到实际集成 worktree，保留最初特性审查 base_commit，记录实际 integration_worktree/integration_branch、当前 owner 和通过基线验证的 validated_commit。按 writing-plans 原子保存 execution.mode=parallel、模型声明 notes 与进度并提交；首次启动不填写 from=serial 的 activation。完整状态提交成功前不得认领/派发 implementer；恢复则先核对旧 execution 与磁盘，不重新初始化。

### 串行任务边界切换

1. 用户在任务中途提出切换时，为请求生成 request_id，在 progress.notes 保存其授权原话或可恢复引用并单独提交（只暂存进度，不夹带当前业务半成品）；当前票仍由原主线程完成，不转交半成品。请求持久化前不声称已保存；若提交失败则说明尚未保存，继续保护当前任务改动。进入已提交、无未完成执行者的任务边界后，读取 index/progress 检查剩余任务的拓扑潜力、声明和资源，遵循入口三条件及例外票串行分流。无法定位原始审查基线、工作区并未隔离、存在未知改动或认领时不猜测修复，不激活并发。
2. 沿用当前有效隔离 worktree，不重新执行 T00、不拷贝未提交业务代码。保存串行检查点 H 并核对其业务代码与最近通过验证的代码一致；检查点中新出现的非业务进度记录不要求重跑已完成票。`base_commit` 继承原计划执行周期的审查基线（必须可核验），`validated_commit` 初始化为 H；二者不可混用。切换后为每个新 worktree 建立基线的验证仍按既有派发规则执行。
3. 取得同一特性锁，原子写入 execution、activation、notes，清空仅用于指向刚结束串行票的 current，保留 tasks 的全部完成记录、resources 和 delivery。此时不创建子 worktree 或外部资源。把模式切换和进度作为一个独立 checkpoint 提交；其提交不得夹带业务实现、扩大计划范围或改变发布权限。仓库自动发版钩子按获准的文档/状态提交规则处理，不能因切换生成未经验证的版本改动。
4. 只有包含完整切换状态的提交成功且状态/分支核对一致，才进入既有“先认领、再派发”。切换准备失败时不派发；能正常收尾则仅撤销本次未提交的模式准备改动并释放自己持有的锁，串行检查点 H 保留。崩溃恢复先查已提交 progress，再比对未提交准备差异；不可把文件里的 mode 单独当作已成功切换。未知差异或活跃旧 owner 按原恢复规则报告阻塞，不覆盖他人内容。

切换不重新批准原计划，也不使所有剩余任务自动具备并发资格。无声明时，若用户另外授权修订计划，由 writing-plans 的既有审查/校验路径更新声明后再评估；单纯的“转并发”不授权猜写集合。并发启动后并行数量可随 ready 集合变化，模式保持 parallel，已获授权的范围内不每轮重新询问。

切换激活前完成本 skill 的模型与思考强度声明，在取得进度写权限后将声明一起保存进模式 checkpoint；不能只改 mode 就跳过声明。用户在当前串行票中途提出切换时，声明可以等边界核验配置后输出，请求保存不等于已宣布并发启动。

恢复先定位原集成 worktree 和特性锁 owner，再核对已提交 progress、未提交差异、运行中执行者、实际 Git 提交和证据；新会话不从来源分支的陈旧 progress 副本直接另起编排。恢复所需的原工作区/提交缺失按不一致恢复规则报告，不重建一份空进度。恢复动作的分界如下：

| 中断位置 | 可核验依据 | 恢复动作 |
|---|---|---|
| 请求已保存，当前串行票未完 | notes 的 request_id/授权、current、任务工作区与提交 | 先恢复当前票；完成后重检资格，复用授权 |
| 模式准备已写，但尚未提交 | 已提交模式仍串行、准备差异仅属于该 request_id、锁归属 | 未派任何子代理；核对后补提交，或撤销仅本次准备差异 |
| 模式已提交，尚未认领 | execution.activation、H、当前集成工作区 | 以并发模式继续，保留 completed 和最初 base_commit |
| claim 已保存，agent_id 回执不完整 | 旧编排 owner 状态、claim_key、分支/worktree、可见运行中 agent | 先取得编排锁并持久化新 owner，再核实是否已派发；未知则阻塞，禁止重复 spawn |
| 子代理执行中或已完成但报告未收齐 | 新编排 owner、活跃 implementer 身份与通信、任务分支、实际 diff、持久证据 | 先完成编排接管，存活 implementer 可继续原票；确认终止后核验遗留结果，缺证据不判通过 |
| 实现已合入，completed checkpoint 未保存 | 实现提交 ancestry、集成验证证据 | 补未完成验证和状态提交，不重复 merge |

恢复不能仅凭“时间过去了”抢锁，也不能仅凭工具返回空列表就断言旧执行者终止；必须结合该平台的会话可见性及 worktree 活动核实，不能核实时显式阻塞。已完成并有持久验证证据的任务不重跑；未完成的验证或证据丢失部分才补验。测试日志与结果证据必须可在中断后定位：implementer 将其保存在主线程预登记的该 claim 专用临时位置，主线程接收后归档到 execution/<claim_key>/，不能只留在对话中的“通过”一句。清理前核对证据已归档且相关任务已接受，未集成 worktree 与未归档结果保留。


## 派发一轮

1. 主线程完成 T00 和集成基线，再从 ready 的最小任务号起选择互不冲突集合；ready 只看 completed 依赖，implementer ready 回报不算完成。保留最初 base_commit 为全特性审查基线，validated_commit 为新分支的唯一派发基线。
2. 读取所选任务正文核对声明。将 writes 逐个用 `resolveWrite(root,value)` 解析真实路径，拒绝保留路径、目录授权、逃逸、新文件祖先逃逸、票内大小写/Unicode/别名碰撞；用 `conflicting(a,b)` 检查真实写集合及排他资源。不同文件间的语义依赖仍须在导航表表达。
3. 主线程生成 claim_key，原子更新 progress.tasks 的 claim、status=in_progress、model_declaration_id，并预登记分支/worktree/专属证据目录和外部资源；提交后才创建。worktree 从 validated_commit 建立，核对实际路径、分支、HEAD，安装依赖并跑票的基线。不能把源工作区未提交改动拷进去；锁文件和 bootstrap 生成物也须获准，发版钩子越界且不能按仓库授权安全配置时串行。
4. 派发受当前平台实际可用名额约束，不写死限额。输入含 task_id/claim_key、绝对 worktree、branch/base_commit、任务/spec/index/依赖接口/研究指针、writes/resources、测试命令、预登记证据目录。要求 implementer 读取 agents/implementer.md 并遵守绑定、TDD、自检、回报协议；Codex 无 cwd 参数时每条命令显式指定工作目录。工具返回 agent_id 后立刻保存回执，缺回执不等于没启动。平台不能可靠隔离则停止派发，说明原因串行接管。
5. 外部事实调查交只读 explorer；主线程将来源笔记写入 research，再传指针，不复制全部任务正文或重复已有调查。契约偏差冻结相关票和依赖闭包，按 executing-plans 三级纪律处理；修订后重新校验声明，不自行扩大已派写集合。

## 接收与集成

按当前 claim_key 区分重复回报和旧尝试：已接受同一结果幂等忽略；旧 key 不改新 claim；新尝试的 key 和旧尝试处置追加 notes。主线程归档实际 JSON/日志到 execution/<claim_key>/，只保留可恢复指针，不让子代理写共享档案。

先用 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" implementation-result` 校验实际结果文件；校验失败发回补全一次，再失败主线程接管（定义见 exploration-patterns「输出契约与校验」）。校验器不可用沿 canonical 降级并显式记录，不能省略真实 Git 核验。

`blocked` 是合法业务回报，不按格式错误要求改成 ready。主线程持锁把该票标 blocked，保存原因、原 claim 和结果/证据指针，冻结其依赖闭包；独立且不冲突的任务可继续，集成失败则遵循下文的全局暂停规则。执行中长时间无回报，先询问状态并核对运行事实；未知则按失联恢复处理，不能把等待超时当作终止证明。缩小范围重试、重新认领或主线程接管写入之前，必须先确认原执行者及其写入进程已停止、检查并保留工作区和证据，再沿既有失败隔离的一次重试上限处理；仍存活且可通信者保留原 claim 继续，不能同时启动替身。

只有 ready 结果进入 Git 接收核验：然后调用模块 `scripts/lib/parallel-plan.mjs` 的 `verifyResult(report, claim, writes)`；claim 输入含 task_id/key/worktree/branch/base_commit。该函数返回 string[]，非空立即拒收。它核验真实分支、基线 ancestry、全部实现提交、净差异和中间提交、rename 两端、dirty/untracked 与持久证据存在；Git 词法路径必须属于原始精确 writes，真实路径检查另行拒绝逃逸及基线后的链接重绑定（包括中间提交），重绑定需主线程重新核验声明后处理；先做 schema 校验再调用。主线程还须阅读红绿日志确认故障类别与测试有效性、验证实际资源归属、metadata 变化与 claim 归属，不能把结构/文件存在性等同正确性。不能运行该核验时逐项检查同等 Git 事实并记录降级，不盲信 changed_files。

仅持锁主线程逐票执行保留 ancestry 的 merge，不用 squash/cherry-pick。合并前工作区干净；HEAD 为 validated_commit 或仅领先可核验的主线程进度/证据提交且业务树相同，不能含未验证实现；实际 git merge 冲突时保留冲突现场交用户，不自动选 ours/theirs。合并后运行该票集成测试并归档日志，全部通过才把 accepted integration SHA 写 tasks.TNN.commit、implementation tip 写 implementation_commit、状态 completed；在同一次原子进度更新中把 execution.validated_commit 同步设为该 accepted integration SHA，再单独提交进度，禁止自引用 SHA。后继票从更新后的 validated_commit 创建，包含已接受的前置实现；恢复补记与主线程执行例外票完成也遵循此规则，验证失败保持旧值。

集成失败时冻结受影响任务和后继，暂停新派发/新合并；已在旧 validated_commit 工作的独立票可完成并暂存报告，不能以失败 HEAD 派新票。恢复发现实现 tip 已是集成 HEAD 祖先时不重复 merge，只补缺失验证/状态；无证据不猜 pass。解释不清的提交、丢失任务文件或 worktree 冻结相关恢复，不从来源分支的陈旧 progress 新起一套。

## 收尾与交付

全部实施票已集成后，把完整 `base_commit..集成 HEAD`、spec、progress、研究与证据指针交回 executing-plans 的阶段 4—6，审查定义以 executing-plans/references/review-orchestration.md 为准。维度审查、独立复核、completeness critic、矩阵验收、最终全量验证均保留，票内自检不能替代。

串行与并发共用 executing-plans/references/delivery-channels.md：默认本地，PR 需既有授权；ready 不是已合并。清理只遍历 progress.resources，确认结果已接受且证据已归档后才移除 implementer worktree；未集成工作、失联代理与未归档证据保留。最终取代回写、实际 merge 证据、清理、sync_commit 与 roadmap 全部完成才宣称交付。
