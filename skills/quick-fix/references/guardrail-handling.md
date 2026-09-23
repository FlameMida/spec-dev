# 契约不变修复的守卫处理

> 阅读时机：命中相关编辑或提交守卫后，首次受影响动作之前；不用摘要代替完整机制。

### 步骤 5b：核验绑定，再选择提交路径

强制 TDD 同 5a。契约未变时不伪造 spec 修改；事实判断本身不新增授权。使用新协议的仓库先在实际工作区运行 `node scripts/spec-dev/task-binding.mjs inspect`，核对计划、任务、版本、工作区及 writes/specs。`no active task receipt` 与绑定损坏/过期是不同结果，不能把任意失败当作“无绑定”。完整字段和建立步骤见 [plan-format](../../writing-plans/references/plan-format.md)。

| 已核验状态 | 编辑与提交路径 |
|---|---|
| 有效绑定，修复属于已有授权及精确写集合 | 正常编辑、暂存和提交，由消息 hook 保存 `Spec-Task`；不设 `SPEC_DEV_GUARD=off`，不加宽跳过 trailer |
| 存在绑定但过期、工作区不符、超出 writes 或未处理另一份 spec | 停止受影响写入，沿已有授权修订必要范围/契约并重新绑定；未授权扩大范围须先裁决，不能靠 off 或 shell 绕过 |
| 确认没有任务关联，且未命中 active covers | 普通提交 |
| 确认没有任务关联，命中 covers，契约不变且已有例外授权 | 使用 `SPEC_DEV_GUARD=off git commit` 放行提交期 `--staged`，同时保存 `Spec-Guard: off <原因>` 供 push/CI 核验 |

`Spec-Task` 与两种宽跳过均不得混用。只有已完成/明确退出该任务、且原授权允许转入例外路径时，才用 `clear --plan <原计划> --task <原任务>` 清除本地引用；不为消除过期/越界报错而撤掉绑定。退出后再次核对无关联，历史提交原关联仍保留。

无任务关联的既有编辑期例外继续适用：hook 进程环境由平台设置，给写入命令添加 off 前缀不能影响 hook。仅沿已核实的例外授权选择 shell 写入或会话/hook 层临时 off，未有授权才说明原因并取得裁决；前者仍保留提交 trailer，后者用完撤销。Stop 的一次旧漂移提示不豁免无效新绑定。

**不静默绕过、不伪造 spec 同步。**
