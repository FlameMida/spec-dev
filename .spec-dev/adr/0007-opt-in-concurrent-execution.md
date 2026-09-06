# ADR-0007: 可选并发执行——独立 skill，主线程唯一写状态并集成

**Status**: Accepted (2026-09-06)

executing-plans 默认仍由主线程逐票实现；用户明确选择且任务依赖、写集合与资源隔离允许时，委托正式 skill executing-plans-parallel，由每票独占 worktree 的 implementer 完成 TDD 五步及契约自检，主线程唯一写 progress.yaml、核验并逐票集成，再复用原收尾审查与验收。写集合是 index.md 中的可选声明，认领与完成事实只在 progress；任务只有集成验证后才 completed，PR ready 不等于已合并交付。

理由：上游 beta 的并发形态不能直接替代本项目的 TDD 与契约纪律；把并发限定为显式分支，既保留串行默认，又通过唯一写者和集成完成判据消除多 worktree 的状态竞争。该决定继承 ADR-0005 的三件套、四列导航、唯一运行状态与拒绝编译快照，继承 ADR-0006 的插件根定义，不取代两者。

被否方案：默认改为并行（推翻既有裁决）；独立调度文件或 progress 分片（增加状态同步面）；扩充导航表列（扰动现有四列契约）；merger 子代理或自动裁决冲突（割裂责任与契约裁决）；只以实现提交成功标 completed（后继可能消费未集成接口）。
