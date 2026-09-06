# 并发执行验收报告

状态：DELIVERED，本地 main 已接受，T00—T08 全部完成，台账资源已清理。

范围：原始基线 `eac136eeed060c24c7f4d94b3b753a51f46a25f9` 起的完整特性变更。目标是本地插件、真实临时 Git 仓库/worktree 与受控 Node 进程。没有访问生产环境或托管 PR。

| 检查 | 实际结果 | 证据 |
|---|---|---|
| 全量 Node 回归 | 91/91，0 fail，0 skip | full-tests.log、checks.json |
| visual-path 壳路径回归 | PASS，exit 0 | visual-path.log |
| 插件及官方 Codex CLI 安装结构检查 | exit 0 | plugin.log；提交钩子实际执行 |
| 14 个 skill / openai 元数据同步 | exit 0 | skills.log、openai-sync.log、blocked-skills.log、blocked-sync.log |
| 插件 manifest / 当前计划导航 | exit 0 | manifest.log、final-plan-index.log |
| 五维独立审查与修复复审 | 三项产品缺口已修复；复审43/43 | review-summary.md、review-findings.json、review-fixes-verified.json |
| 48 条 eval/trigger 静态走查 | STATIC_MATCH；不代表模型遵循 | eval-review.md |
| 实际并发、锁、切换、中断与集成 | 第四轮10组通过，独立复核无剩余发现 | protocol-replay.md、replay-results.json、replay-transcript.json、replay-snapshots.json |
| 额外绑定/旧报告/准入/阻塞检查 | 最新轮补充检查通过 | protocol-extra.mjs、extra-results.json |

## Scenario 对账

STATIC_MATCH 指人工逐条对照真实规则；CONTROLLED_PASS 指按 skill 编排的真实 Git/文件系统/进程动作及受控元数据，不表示存在自动调度服务或模型行为保证。以下全部 Scenario 按批准矩阵的相应证据层级通过；实际模型遵循仍单列 UNVERIFIED。

| Scenario | 证据层级与定位 |
|---|---|
| S01 普通计划 | parser 回归 + eval-review |
| S02 损坏声明 | plan-index/parser 负例回归 + eval-review |
| S03 合并后中断 | replay 提交图/ancestry/一次 merge/补验日志 |
| S04 不一致与阻塞恢复 | replay 移走 worktree、extra blocked/schema 与原 claim 保留 + eval-review |
| S05 资源确认前中断 | replay-resource-request、零 provider actions |
| S06 正式登记 | plugin/skills/openai/manifest 与集合回归 |
| S07 普通继续不并发 | 7 个 trigger 输入及静态走查 |
| S08 真实并发 | 两个 worktree/worker 时间戳、实际提交及后继工作区 |
| S09 写与资源冲突 | conflicting 回归、extra 准入事实 |
| S10 越界路径 | 真实 Git 净差异/逐提交/rename/symlink 回归，review-fix-red 历史失败 |
| S11 重复启动 | 两轮真实进程竞争同 common-dir 锁，维护门记录 |
| S12 旧结果与重复结果 | verifyResult 旧 key 回归、extra 重复接收前后 HEAD/进度相同 |
| S13 绑定错误 | 分支/dirty 回归、extra 实际错误 cwd 绑定后零写入 |
| S14 红绿与自检 | schema 负例、两票真实断言红绿、集成日志；extra 真实 ENOENT 不作红证据 |
| S15 不提前解锁 | ready 时 pending、completed checkpoint 后从新 validated_commit 建后继 |
| S16 冲突/集成失败 | 实际 git merge exit1 和 UU 现场、Node 断言失败；基线不推进 |
| S17 探索偏差 | eval-review + extra research 指针/受影响票冻结的受控决定 |
| S18 无差异/无授权 | 受控 PR 输入与零外部动作记录 |
| S19 ready 尚未合并 | replay-pr-open 保持 awaiting_merge |
| S20 实际合并后收尾 | 本地夹具真实目标树核验、后续文档等待状态 |
| S21 全局收尾 | 原始 base 到完整 tip 审查、48 eval、全量回归；最终任务仍保留 |
| S22 免测/空基线 | eval-review + extra 主线程分流的受控决定，不伪造 TDD |
| S23 边界切换 | 原 worktree/已完成票保留、base 与 H 分离、激活后派发 |
| S24 准入不足 | parser/conflict 事实、依赖链/缺声明静态判断、extra 零激活派发 |
| S25 激活三个断点 | 三个独立 Git 仓库 committed/disk progress 快照 |
| S26 先保存请求 | 请求提交仅包含 progress，业务半成品保留后续完成 |
| S27 回执缺失/失联 | 旧控制进程已退出、原 worker 存活，保留 claim；未知零重复派发 |
| S28 首次模型声明 | eval-review，三列表与来源说明 |
| S29 多配置/未知 | eval-review，分别标实际/继承/待派发/未知，不猜强度 |
| S30 恢复重声明 | 恢复前分列旧存活和拟派发，接管后保存 notes，旧/新 claim 引用独立 |

## Requirement Reconciliation

14 条 Requirement 均有实现和对应验收定位（逐条见 eval-review.md），当前未发现 DEFERRED/DROPPED/SUPERSEDED 的漏交项。14 项 Requirement 均为 DELIVERED，无延期或丢弃项；T08 本地合并、取代回写与资源清理全部完成。

## 验证边界与偏差

- 真实模型多轮并发与中断恢复遵循：UNVERIFIED，批准矩阵 nightly 非阻塞。Node 进程没有模型/思考强度；skill 的配置表不会虚构运行配置。
- 真实托管 PR/远端发布：未运行；S18—S20 是批准的受控 PR 适配回放和真实本地 Git 树核验，没有 push 或创建 PR。
- 本交付是 skill 协议、声明/schema/Git 校验器及评估输入；不是操作系统沙箱或后台调度服务。单写者、持锁与接管顺序由编排者遵循，确定性校验负责拒收不合格结果。
- 验收脚本保存在 acceptance/ 以可复跑、审查；临时资源仍在预登记 .parallel-qa 内。旧轮夹具偏差及第三轮 ENOENT 失败证据保留，最终只使用修正后最新轮作为协议通过依据。
- T06 曾提前写完成和37/37；真实初次结果38/39，已立即更正并保留失败日志，修复后39/39。验收使用本次全量91/91，不沿用错误计数。
- staged drift 曾命中 major-upgrade 的广义 scripts covers，已逐项核验分面共存并在修复提交写具体 Spec-Guard 说明；未关闭全局守卫。最终文档 staged drift 另行执行。
- 测试退役：此次保留旧串行与存量读取行为，无已失效且应退役的 Scenario 测试，未删除测试。

最终协议复核：replay-review-final.json findings=[]；270 条命令/动作、18 份状态快照，两执行者重叠222ms，全部11个可追踪 worker PID 已退出。红绿原始日志已校验与归档一致；归档仅去行尾空白以符合仓库检查，归档 SHA-256 和原路径映射见 replay-evidence-map.json。

本地交付锚点：d9428058cfd485c09b72700fb321ffac5871b67d。实施分支已快进合入 main，所有文档/证据随提交保留；临时资源与实施 worktree/分支已清理。最终文档提交仅锚定已接受提交，不把自己的 SHA 写入自身。
