# 特性级交付通道（串行与并发共用）

默认 channel=local。用户已授权 PR 工作流或仓库明确要求 PR 时采用 channel=pr；这不自动授权 push/create/ready/merge，各动作复用已有会话授权。缺发布授权时先准备完整变更与 PR 文案，再请求该发布动作。

受保护来源分支仍使用隔离特性分支，不能因此原地实施；远端策略查不到记未知。一个特性复用一个 PR，首个实际差异可来自已批准 spec/plan；零差异不造空提交。标题/正文围绕最终行为，附 spec、progress、验收对账指针；只有真实对应且应关闭的 issue 才写 closing 关键词。

progress 的 delivery 由 writing-plans 定义，主线程独占写入。implementing、awaiting_merge、merged、completed 只记录事实，不构成证据。全局审查、矩阵验收、全量验证与对账通过后才可按授权标 ready；PR 仍 open 时 state=awaiting_merge，最终任务仍 in_progress，roadmap 仍 in-progress，sync_commit 不锚定。可以结束当前会话，保留恢复所需分支、状态与证据。

本地通道按计划最终任务验证来源工作区、合并、取代回写、台账清理与 sync_commit。PR 通道取得真实目标分支合并提交后，核对已验收树与实际合并树；平台最终 squash 允许，不能套用 implementer 票级 ancestry 判据。树有差异则补验证，再完成取代回写、台账清理、sync_commit 与 roadmap delivered。回写受保护目标需要后续 PR 时记录链接，仍 awaiting_merge，直到代码与文档闭环都有证据。

sync_commit 指向实际目标上核验过的代码提交；文档锚定提交不自引用。未集成 worktree、失联实现者、未归档证据不能清理；已归档并接受的闲置 worktree 可按台账清理，失败保留台账并报告。未取得实际合并证据不宣称交付完成。PR CLI 不可用时使用平台可用工具执行等效操作并记录证据；受控回放不证明真实远端权限或托管平台验证。
