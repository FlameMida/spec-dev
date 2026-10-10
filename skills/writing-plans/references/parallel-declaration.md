# 任务派发声明

> 阅读时机：编写新计划、生成或核对派发声明、使用运行扩展时。计划默认准备并发编排，生成声明不代表已获执行授权。

生成声明前按 [并发准备](parallel-readiness.md) 确认共享契约、可独立验证的切片和真实依赖。声明记录派发资格，实际同时运行的集合由执行器结合已完成依赖和所有未释放认领动态选择；不是固定批次表。

## 并发声明


index 头部增加至多一个标记为 `yaml spec-dev-parallel` 的 fenced block；不存在表示无并发声明。新计划结构为 `parallel: { tasks: { TNN: { resources: [排他资源键] } } }`，writes 只从 [计划格式](plan-format.md#静态任务范围与能力标识唯一定义点) 的 scopes.tasks 读取。无 scopes 的历史块继续读取原 writes；同时声明两份 writes 即拒绝。只声明可派给 implementer 且写集合非空的票，已知 TDD 例外或显式空基线范围的票不列入；未声明票由主线程串行执行且执行时排空 implementer。writing-plans 从任务文件块产生声明并在 Self-Review 核对同义一致；入口校验不预读 tasks 正文，implementer 读取自己任务后再核对文件块，任何差异阻塞该票。执行中才发现已授权例外时，子代理先回报 blocked，由主线程按 executing-plans 并发模式的例外票串行规则接管，不能伪造 ready 的测试证据。

新计划为所有符合资格的票生成此声明，不要求任务间无依赖，也不要求同时存在两张 ready 票。仅一张票或纯依赖链仍可声明，实际调度按依赖逐票运行；没有任何合格票才省略该块并写明原因，不能生成空 tasks 块。用户要求主线程串行时保留真实任务图和声明，只记录执行偏好。

写路径为精确文件名，不支持 glob/目录授权；使用 `/`、仓库根相对，拒绝空值、绝对路径、`..`、重复规范路径、大小写/Unicode 规范化碰撞；不存在的新文件按最近存在祖先解析符号链接。`.git`、`.spec-dev`（含所有计划/状态/证据）及其符号链接别名禁止进入 implementer 写集合。不同票的同一路径或祖先文件路径冲突不能同批；“不同文件读写形成语义依赖”必须在导航表声明依赖，路径不相交不证明接口独立。

resources 是该票使用的排他外部资源键（如数据库、端口、输出目录）；同键不能同时占用。能隔离时由主线程按 claim 分配；不能隔离但实体与排他边界已明确时，用同一资源键顺序调度，不把同一实体换名伪装隔离。无法确认隔离或排他使用范围的票不加入声明。资源实际标识/清理命令只记 progress.resources。

`plan-index` 无 scopes 时保留原回执；含 scopes 必须返回 `scope_protocol_version:1`，并校验结构和合法路径，写集合重叠表示调度冲突而非整份计划非法。不新增额外计划文件或解析全部 YAML 特性：读取仓库当前支持的受限映射/数组形制，拒绝重复键和不支持的语法，不默默截断。


```yaml spec-dev-parallel
parallel:
  tasks:
    T01:
      resources: []
    T02:
      resources:
        - "port:claim-scoped-b"
```

受支持语法：根 `parallel:`、两空格 `tasks:`、四空格任务键、六空格 `resources:`（仅无 scopes 的历史块允许 writes）、八空格 `- "JSON 字符串"`；空数组写作 `resources: []`。不支持 YAML anchor、tag、折叠字符串、注释或 flow mapping；不在此块内使用其他缩进。writes 非空，resources 可空；不允许重复任务、字段、规范路径或资源键。

Self-Review 的 spec 覆盖与类型一致性两查同时核对声明与任务文件块一致、依赖覆盖语义耦合、已授权例外与空基线票已排除；该检查由计划作者本地执行，不派子代理自审计划。

### 并发运行扩展（字段唯一定义点）


保留 `format_version: 1`、四种任务 status、resources、notes；可选 `execution.mode: parallel` 表示已激活任务图编排，不表示始终有两票同时运行。未出现该项的存量 progress 先按原串行语义恢复当前票/活动组，再在完成边界评估默认激活；不因缺字段推定用户要求串行。`current` 只指主线程正在执行的票；并发派发期间为 null，不用它推断所有任务空闲，活动票以 tasks 中 in_progress 的认领为准。

用户明确限制串行或撤销限制时，在现有 append-only notes 保存 `execution-preference/<id>: serial|default; authorization=<用户原话或可恢复引用>`，不新建配置文件或 schema 字段。恢复同时核对既有可恢复的明确决定，最新有效选择优先；缺记录不能伪造用户决定。生成计划时只保存实际给出的偏好，不预填运行身份或 SHA。

`execution` 字段：`mode`、`owner`（会话唯一标识）、`integration_worktree`（绝对路径）、`integration_branch`、`base_commit`（特性审查基线）、`validated_commit`（最后通过集成验证的 tip）。交付统一放顶层 progress.delivery，字段及旧 execution.delivery 的局部恢复迁移见 [计划格式](plan-format.md#回执与交付映射唯一定义点)；不再生成 execution.delivery，不以 state 自证合并。

中途激活时使用既有 `execution.activation: { from: serial, request_id: <激活意图唯一标识>, checkpoint_commit: <H>, authorization_ref: <已保存 notes 的定位> }`；H 是激活前已保存串行完成状态的提交，不是包含 activation 的提交。notes 保存 `parallel-switch/<request_id>: requested; authorization=<执行授权与默认规则来源，或用户切换原话/引用>`，成功后追加同 ID 的 activated 事件；不另建待办状态文件，实际模式仍以已提交 execution 为准。首次默认启动不要求 activation。requested 可记录主线程的默认激活意图，不能伪称用户明确说过并发；计划声明不能代替执行授权，也不能撤销用户串行限制。

`tasks.TNN` 继承 status/commit/tests/deviations，增加 `claim: { key, owner, agent_id, worktree, branch, base_commit }`、`implementation_commit`、`result_path`。claim.owner 表示最初认领的编排会话，execution.owner 表示当前持锁编排者；恢复接管可以更新后者，身份与通信已核验的存活 implementer 保留原 claim，不因主线程换会话而换 key。agent_id 在工具返回后补写；派发前 claim 已持久化，若在派发与补写之间崩溃则核对运行中 agent 与 worktree，不盲重派。completed 的 `commit` 是通过集成验证的提交，不能填包含该 SHA 字段的状态提交；实现提交和进度 checkpoint 分开，后者随特性分支保存。每次新尝试以新 key 替换 claim，旧 key 与处置原因追加 notes，历史结果文件保留。progress 使用临时文件+rename 原子更新，不允许子代理副本合并回来。

模型声明沿现有 notes 保存 `model-declaration/<declaration_id>: <角色/任务组、模型、思考强度、来源、继承或计划派发标识>`，不另造执行配置文件；新认领增加 `claim.model_declaration_id` 指向适用于该票的声明。先向用户展示；主线程取得对应进度写权限后，在首次相关派发前将声明及引用持久化。该记录用于追溯而非驱动模型选择，不能覆盖真实工具参数。旧认领没有该字段时，恢复从可用的原派发参数/会话记录核对，无法核实的部分标未知，不能把新主线程配置回填成原执行者事实。


未开始的计划不伪造 owner、模型声明、claim 或运行 SHA；生成时只预登记已知资源。并发 skill 在取得独占写权后填入真实值。资源只有主线程可以写入 progress，子代理新建持久资源必须先请求、主线程原子预登记并确认、最后创建；没有确认则资源操作阻塞。
