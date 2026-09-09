# exploring-clarifying 验收记录

状态：T06 验收进行中，尚未交付。T00—T05 已完成；下文已核事实不替代尚未闭合的统一矩阵、最终完整性对账和 T07 本地合并。

## 候选与证据边界

统一运行 `final-r4` 冻结产品提交 `93baa9a9d9d25a70078c8c968b43daa5be5c22b0`。完整 180 项产品映射、固定 6 项 harness 映射见 [final-candidate-r4.json](final-candidate-r4.json)。每次调用核对运行前后完整映射，不能以单个文件相同或旧候选的 PASS 替代当前候选证据。

注册表共 61 项：59 个必需模型用例（56 个独立用例与 3 个真实回复续接）、S26 宿主迁移 CLI、P00 工具预检。模型用例对应 32 个 Scenario；P00 不计作产品行为验收。判断读取原始用户输入、工具调用及返回、前后文件状态和归档，并逐项记录 GIVEN/WHEN/THEN，不以模型自报完成推断通过。

入口白名单不是强隔离沙箱。违规读取 oracle、evals、候选 spec/plan，或改动候选根会使该运行失效。验收断言只进入 oracle；`host_scripts` 仅允许夹具中已声明的相对 JavaScript 文件。旧 `checks` 字段在创建输出、资源或调用模型之前拒绝。

本次独立审查使用原生代理，不声称具有 controlled review-runner 的隔离保证。模型配置以原始 CLI 配置和 `assistant.message.model` 为准；请求 alias 与供应方报告模型分别记录，物理路由未独立验证。

## 当前验证

| 项目 | 当前事实 | 证据 |
|---|---|---|
| 统一 59 个模型用例 | 进行中，尚不能聚合 PASS | `model/final-r4/` 与各组 progress |
| 14 Requirement / 32 Scenario | 待统一矩阵与最终独立完整性对账 | `requirements-reconciliation.md` |
| 相关静态回归 | 31/31，exit 0 | `../execution/serial/T06/related-dispatch-fields-fixed/` |
| S26 迁移 CLI | 4 次实际调用，独立 PASS；目标存在/不存在 × dry-run/实际 | `cli26/` |
| harness 完整性 | 7 项确定性测试通过，61 项注册表校验 exit 0 | `../execution/serial/T06/harness-integrity-green/`、`registry-integrity/` |
| 全库最终测试 | T07 待运行；不借用局部回归冒充全库 | `../plan/tasks/T07.md` |
| 进程与资源最终审计 | 待所有运行结束后重算；当前 resources.json 为旧预审快照 | `../execution/serial/T06/fixture-preflight/` |
| nightly 多 trial 组 | NOT_RUN，按批准矩阵非阻塞；不推断模型成功率 | `../plan/tasks/T06.md` |

## 审查与缺陷处置

完整初审 A/B/C/S 基于原始 base 到当时候选。C 指出入口重复完整恢复知识后追加有具体原因的 D；A/S 同因发现保留契约出处并合并处置。修复后执行一次受影响维度复审。原件、独立反驳和处置见 `reviews/disposition-r1.json`；后续只做实际验收缺陷和 harness 问题的有界复核，没有以重复广扫取代完整矩阵。

来源保证与返回形态混同、实际项目文档分支未承接时效规则、派发重试漏掉合法类型/预算/真实 CLI 路径均已修正。聚焦原件保留于 `model/t06-source-boundaries/` 与 `model/t06-dispatch-fields/`；最后静态文本修正发生于聚焦运行之后，不能称这些聚焦结果与最终候选全文同 hash。当前两份来源文档的独立差异复核见 `reviews/source-boundary-delta-check.json`，无新增发现；最终行为仍由 `final-r4` 证明。

## 原失败、失效与判读纠正

- `final` 的 6 例均自然结束。普通 exploring 入口读取规则过晚；宿主调度器最终退出 143 的过程见 `final-paused.json`，不归因为模型失败或强行中止这 6 例。
- `final-r2` 的 5 例自然结束后按暂停标记退出 75。S30 实际保留缺陷为范围答案绑定尚未裁决的实现机制；编号数量本身不证明多题。S09-ra 初始 FAIL 被独立反驳推翻：权限政策上限不同，不按实际数据集合包含关系机械认定重叠。原 `judge.initial.json` 保留。
- `final-r3` 的 11 例自然结束后退出 75。S09-scope 推荐理由可由完整上下文支持，S15-failure 限定于文档声明的支持不要求运行证明，两个初始 FAIL 被独立反驳推翻并保留原判断。S16 的实现保证扩张和 S17-ex 的实际时效承接缺口维持，修复后另冻 r4。
- `final-r4/S17-ex` 的原始判定为 FAIL：实际派发未填入 AnySearch CLI 绝对目录。来源支持边界、定义读取、后台闭合均通过；本例显式排除项目 `.spec-dev`，不追加文档时效失败。独立反驳确认当前规则已明确且实际取得，未发现具体规则缺项。13 例自然结束后调度器退出 75，最后一例为已先行派发的 S02；同一冻结候选随后恢复剩余独立用例。后续复现只能记录新一次行为，不能自动关闭未修复失败；本次失败未被覆盖、降级或豁免。证据见 `reviews/rebuttal-final-r4-cli-path.json`、`final-r4-paused.json`。
- `final-r4/S04` 的原始判定为 FAIL：D2 已批准指定路径的独立内存实验，模型却把它收窄成只运行已有文件；确认文件缺失后执行仍报缺文件，随后再次要求同范围重建授权。独立反驳确认该批准包含必要原型的创建，不要求冒称恢复了旧原件。诚实报告失败与生产保护仍通过，目标实验未完成，不能仅凭 Node 报错归为环境阻塞。证据见 `reviews/rebuttal-final-r4-authorization.json`。
- `final-r4/S21` 初始数值 FAIL 被独立反驳撤回，现为 unverified，原 `judge.initial.json` 保留。D4 的“每月 1000 元超预算 100 元”有角色歧义，D1 离线同步的预算上限不能无条件用于 D4 远程数据库；不能从假设的数字角色推导确定错误。实际保存、A 已排除/B 未决及来源保留成立。后续以报价与预算上限分开写明的 GIVEN 消除输入歧义，不把判断预期注入模型，也不反改历史输入。证据见 `reviews/rebuttal-final-r4-exclusion-values.json`。
- `final-r4/S23` 确认 FAIL：D5 仅批准术语定义，实际提交的 spec 却新增 `waitlisted`、容量计数、FIFO 晋级、批窗口和错误处理契约，并登记取代旧预留契约。共享词汇表形状与同次范围提交仍成立，不能用这些通过面代替批准范围检查。证据见 `reviews/rebuttal-final-r4-term-scope.json`。
- `final-r4/S28` 确认 FAIL：最终摘要把文档与仅返回对象的源码并列为状态更新保证的明确依据；此前正文的正确分层不能修复摘要中的新断言。未验证原型隔离仍成立，不要求运行验证才允许报告官方文档的明确声明。证据见 `reviews/rebuttal-final-r4-handoff-support.json`。
- 4 个历史运行曾把判断文本误作宿主脚本路径，污染模型可读观察文件。全部通过 `invalidated-results.json` 及每例 `invalidation.json` 撤出验收，最终有效状态为 unverified；原始输出与原 judge 未覆盖。旧 A-r2/S-r2/critic 中引用这些 PASS 的部分也撤回，不能复用为最终验收证据。

独立判读允许根据完整原件纠正；不以固定措辞、编号数量、任务 ID 数量或未执行的被拒调用替代语义事实。官方文档可以支持明确归属于文档的声明，代码是否实现该声明须分别判断。

有限复现规则核对见 `reviews/acceptance-retry-policy-check.json`：批准门槛未要求首试成功或历史 trial 全过，但未修复的有效语义失败不能仅靠挑后续 PASS 关闭，也不能临时发明 pass@k 门槛。`reviews/dispatch-reliability-options.json` 提出的最终参数核对重组尚是待验证改进；所有确认缺陷将在本批独立检查完成后集中处置，再验证实际改动后的候选。

## 资源与交付待办

两个异常旧运行产生的自有 CLI 会话已有宿主停止回执；其历史保留，不改写成模型自然结束。T06/T07 将重新查询精确 UUID，按实际不再活动作非删除式销账。全部自有 fixture 必须先核对实时文件、归档、Git bundle 与 HEAD，再于 T07 逐项清理并保存台账。来源 main 当前仍未合并。

本任务只完成 roadmap #7；未 push、未发布，不自动实施 #8。
