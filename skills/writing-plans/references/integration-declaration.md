# 可选集成组声明与 v2 进度

> 阅读时机：已批准采用集成组，生成/消费组声明或对应任务之前。

## 可选集成组声明与 v2 进度

这是集成组字段的唯一定义点；执行时序遵循 [integration-groups.md](../../executing-plans/references/integration-groups.md)。仅在普通切片和每批绿的 expand–contract 均不可行且设计已批准时生成；不以文件多、测试慢或想并发为理由启用。

含组时，写任务正文前必须实际读取 integration-groups.md 的执行协议、可执行参考步骤及其引用的 executing-plans-parallel 锁规则；下方字段表不能代替执行协议。把适用的取锁、T00 真实绑定、组激活、实现/证据/状态分开提交、暂停与完成操作写进可执行步骤；脱离 skill 时仍能操作，不能仅写“按协议更新”。每条 record.json 必须按定义生成结构化记录，原始 stdout/stderr 另存，不能把 tee 输出命名为 record.json。


index 中至多一个 `json spec-dev-integration` fenced block，内容为 JSON（使用 JSON 避免引入第二套复杂 YAML 语法；重复键显式拒绝）。声明示例为确定的结构示意，不是本特性的实施计划：

```json spec-dev-integration
{
  "protocol_version": 1,
  "task_roles": {
    "T00": "isolation",
    "T10": "acceptance",
    "T11": "delivery"
  },
  "groups": {
    "G01": {
      "members": ["T03", "T04", "T05"],
      "verify": "T06",
      "reason": "共享类型的三个消费者全部迁移后才能通过相关验证"
    }
  }
}
```

GNN 与 TNN 分别唯一；每组至少两名成员，members 为确定的执行顺序，必须与导航 DAG 的拓扑顺序一致但不凭此数组虚构依赖边。组员保持常规小票粒度；组验证显式依赖全部成员；组外任务只能通过 verify 依赖该组。声明中的 `task_roles` 必填，T00 唯一 isolation、最大号唯一 delivery、项目 acceptance 如有则列出，角色不得重叠；这些票不得进入 members/verify。组验证文件显式标 `任务类型：group-verification`，组员标 `任务类型：integration-member`，不重复写进 task_roles；普通票由余集确定。task_roles/组声明与任务正文在计划 Self-Review/运行读取本票时核对。上例 T10/T11 是示例角色，实际 ID 必须存在于四列导航表。组声明不产生第二份进度。

组间及普通任务构成的收缩 DAG 同样无环；外部前置取组员和 verify 对组外依赖的并集，全部 completed 才进入组。禁止外部依赖成员的隐藏绕行；不同组通过 verify 相连。活动组期间即使存在独立 ready 普通票也先完成活动组，避免未验证 HEAD 被外部使用。

### 运行数据与读取边界

无组新计划继续 v1；含组使用 `progress.yaml` 的 `format_version: 2`。v2 的机器写入格式限定为缩进 JSON（JSON 属于 YAML 子集，文件位置不变），字符串必须双引号、拒绝重复键与未知协议字段；不接收 YAML anchor/tag/注释等额外语法，不引入新 YAML 依赖。新读取器支持 v2，v1/单文件仍走既有分支。格式号只标识数据，不绑定 executor/skill 版本，也不生成编译快照。

生成含组计划时不要套用下方无组 v1 的 YAML 初始化模板；按本节生成完整 JSON，tasks 须包含导航表全部任务，不能省略成示例片段。组首改动若已破坏其他消费者的检查，它也必须属于组，不能包装成已独立通过的普通票。

v2 完整继承 tasks/resources/notes 和原 parallel 可选 execution 扩展字段；无组计划不准出现 awaiting_verification。新增字段如下：

| 位置 | 字段与约束 |
|---|---|
| 根 | `integration: {owner, worktree, branch, base_commit, validated_commit, active_group, groups}`；生成时 owner/路径运行值/SHA 为 null，active_group=null，组 status=pending；resources 可预登记已知资源 |
| integration.groups.GNN | `status: pending\|in_progress\|blocked\|completed`；`base_commit`（本组启动已验证点）、`checkpoint_commit`（最后已保存实现点）、`validated_commit`（本组完成点，完成前 null）、`evidence_paths: []` |
| tasks.TNN | 原 status 加 awaiting_verification；`implementation_commit` 记本票实现点，`commit` 仅完成后填接受点；`tests: pending_group\|pass\|fail` 对组员适用，保留原字段；`evidence_paths: []` 与 `deviations` 支持恢复 |
| notes | 追加授权来源、组激活/恢复/失效/晚到回执事件及证据路径，不覆盖旧记录 |

parallel 模式下 `integration.owner/worktree/branch/base_commit/validated_commit` 分别与 `execution.owner/integration_worktree/integration_branch/base_commit/validated_commit` 一致，后者为旧消费者的投影，不允许独立更新；CLI 检查一致性并要求同次原子更新。integration.base_commit 为特性原始审查点，groups.GNN.base_commit 为组进入点，不混用。串行 v2 也使用既有同一 common-dir 特性锁及其维护门，身份只在持锁后填写，不以存在 JSON owner 自证锁。v2 普通票完成同样更新 integration.validated_commit；在首次状态写入前取得锁，T00 建立/确认隔离后绑定真实工作区，保留该特性同一锁身份。

`current` 只指正在施工或补查的主线程票，不用它表示所有已待验票。运行 SHA 不指向正在包含它们的状态提交：先保存真实实现提交 C，再将 C 写入状态并另行提交；证据归档引起的后续提交不改变代码树时允许继续引用 C，但需可核验只变更本特性的进度/证据路径。


### 类型化任务步骤

普通行为票沿下方五步。前置纯重构票明确写：确认授权/公共行为基线，缺保护先刻画当前行为通过，执行结构调整，复跑保护通过，提交；不制造假红。集成组成员票明确写：声明本票写集合/接口/延期检查原因，执行适用行为红或组首保护，实施和局部检查，两项契约自检/保存实现提交，记录 awaiting_verification 与证据检查点。组验证票明确写：确认全员待验，执行完整组验证/清理旧形检查，失败回归属成员修复，通过后原子完成全组/基线，再提交状态。具体代码、命令、期望与来源仍须全部内嵌，不可用类型名代替内容。

组票里的可执行命令须遵循 [integration-groups.md 的证据记录形状与提交顺序](../../executing-plans/references/integration-groups.md)：先保存实现提交 C，再对该业务树实际检查并归档；原行为基线另存为历史记录，不能拿改动前 HEAD 的记录支撑改动后的 C。磁盘证据放在本特性目录下，evidence_paths 则相对该特性（如磁盘 `.spec-dev/demo/execution/groups/G01/T01/a1/record.json` 对应 `execution/groups/G01/T01/a1/record.json`）。组成功后的所有成员和验证票 commit 都填共同 V，保留各自 implementation_commit，状态提交另做。T00 先识别当前真实隔离路径和分支，已隔离时复用实际值，不能把拟建分支名当现存绑定。

生成时先跑 plan-index；含组还必须验证执行环境支持 plan-state/protocol_version=1。未开始的运行值留 null，不伪造 owner/路径/提交/模型或测试通过。执行技能不可用时普通计划仍可按完整步骤读取；组的机器能力不可用则停止，不按 v1 猜执行。
