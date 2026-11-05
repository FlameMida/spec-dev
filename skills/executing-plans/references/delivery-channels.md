# 特性级交付通道

仅本代理当前 `spec-dev collaboration: enabled` 时，最终答复前执行 [交付前遗漏检查](../../requirement-analysis/references/model-collaboration.md#交付前遗漏检查)；原请求内已授权且可完成的必要工作继续完成，不放入“后续建议”。Claude、未知模型及仅继承父代理状态者不启用此补充。

默认 channel=local。用户已授权 PR 工作流或仓库明确要求 PR 时采用 channel=pr；这不自动授权 push/create/ready/merge，各动作复用已有会话授权。缺发布授权时先准备完整变更与 PR 文案，再请求该发布动作。

受保护来源分支仍使用隔离特性分支，不能因此原地实施；远端策略查不到记未知。一个特性复用一个 PR，首个实际差异可来自已批准 spec/plan；零差异不造空提交。标题/正文围绕最终行为，附 spec、计划执行记录、验收对账指针；只有真实对应且应关闭的 issue 才写 closing 关键词。

独立 F、审查、矩阵验收与对账通过后才可按已有授权标 ready。PR 或受保护目标的文档回写 PR 尚未合并时，保留链接、分支、状态和已核验摘要；execution 按验收收口规则删除；交付仍为 awaiting_merge、D 未完成、roadmap 为 in-progress，不提前锚定 sync_commit。可以结束当前会话，恢复后继续直到代码与文档均闭环。

两种通道均按 [交付模板 D](../../writing-plans/references/delivery-templates.md#最终任务-d合并与清理) 执行版本映射、验收摘要核对、资源清理和回写；状态字段不代替证据。PR CLI 不可用时用平台可用工具完成等效操作并保存实际响应；受控回放不证明真实远端权限或托管平台验证。
