# T05 统一运行修正执行记录

原计划T05内继续实施；状态源仍为progress.yaml，不新增第二份进度账。

1. 固定本设计及旧失败，建立真实CLI/stdio边界回归，确认失败。文件scripts/tests/controlled-review.test.mjs；命令rtk proxy node --test scripts/tests/controlled-review.test.mjs。
2. scripts/lib/review_store.py负责快照、原始证据、报告验证和最终门；scripts/lib/review_broker.py负责受控工具；scripts/review-runner.py负责真实CLI进程、容量、依赖、预算及恢复。每个边界从对应失败测试实现。
3. 在skills/executing-plans/references/review-orchestration.md连接生产入口并说明客户端范围，现有语义判据和findings契约保持。
4. 只读独立复核安全边界、状态与恢复，修复成立问题；运行旧真实夹具最小/容量/大机械/有候选/D等完整路径，记录同run证据及未完成项，不以机器协议通过冒充LLM审查正确。
5. 停止所有证据写入后执行全库回归及插件检查；仅提交本次所有文件与原验收状态更新，T06仍由原门控制。

工作区沿用现有worktree，无新worktree。资源归属原progress.resources。本次新增正式运行记录存acceptance/controlled-runtime/，临时测试资源由测试finally清理。
