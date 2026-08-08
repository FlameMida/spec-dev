# triage-routing 验收报告

**验收对象**：分支 `worktree-plan+2026-08-08-triage-routing`，HEAD `f4b3f63`（基点 `fa6ff28`，T1-T5 共 5 个任务提交）
**Spec**：`.spec-dev/2026-08-08-triage-routing/spec/triage-routing-design.md`
**执行方式说明**：原计划由子代理执行审查与验收；当前环境子代理模型路由不可用（会话级模型设置覆盖显式 model 参数、网关无法解析），沿子项目①用户裁决的先例由主线程降级执行全部静态检查。独立性降级如实记录；网关修复后可随时对已合并代码补独立审查。

## 验收矩阵结果

| # | 检查项 | 结果 | 证据 |
|---|--------|------|------|
| 1 | qf-escalate-carries-context 存在且断言完整 | PASS | evals.json 含"根因、spec 反查结果与已裁决的澄清答案""不重查""不重问" |
| 2 | ra-non-dev-report-lane 存在且断言完整 | PASS | evals.json 含"不建特性目录""零落盘""回归正常分诊" |
| 3 | triage.md 条款覆盖（空参先问/四出口可改选/拿不准列两候选/零落盘） | PASS | triage.md:12,30,31,38 |
| 4 | 引用不复制（无判据细节副本） | PASS | grep "单点 bug/单常量/跨模块改动/引入新依赖/行为契约变更且跨越" 零命中 |
| 5 | 拿不准档双向表述同向 | PASS | quick-fix:26 与 requirement-analysis:108 均为"默认先进 quick-fix + 升级门安全网"，无反向表述（对照见下节） |
| 6 | clarifying 出口 1 含报告通道 + spec 注记消除 | PASS | clarifying SKILL.md:43；clarifying spec"待子项目②落地后追加"0 命中 |
| 7 | 发布面登记四处 | PASS | README.md（用法+目录树）、README.zh-CN.md（同）、.codex-plugin keywords "triage" + defaultPrompt "Triage this request..." 条目；CHANGELOG/版本号 PENDING-MERGE（合并回 main 后由发版自动化承载） |

补充：报告通道完整落盘约定（`.spec-dev/reports/YYYY-MM-DD-<topic>.md`）全仓唯一出现在 requirement-analysis SKILL.md:109（权威定义），triage/clarifying 仅指向；三校验（check-plugin/validate-skills/check-openai-sync）全绿；新增/修改文件无损坏字符。

## 双向表述对照（矩阵行 5）

- quick-fix 分诊三角：「已承诺的开发请求、大小/设计空间拿不准时，默认先进 quick-fix——升级便宜、降级浪费；步骤 2.5 基于根因证据的升级门（含上下文交接）是安全网。与 requirement-analysis 阶段 1 小修检查的对偶表述同向。」
- requirement-analysis 小修检查：「大小/设计空间拿不准的已承诺开发请求，同样建议先走 quick-fix——其步骤 2.5 基于根因证据的升级门（含上下文交接）比入口猜测更准，升级便宜、降级浪费」

两处语义一致、互相指向，triage.md 维度 4 同向。

## Requirement Reconciliation

全部 7 条 Requirement（ADDED 6 + MODIFIED 1）均 DELIVERED：**7 DELIVERED / 0 DEFERRED / 0 DROPPED / 0 ADDED-IN-FLIGHT**。

计划内偏差（不影响交付判定）：任务 0 的 worktree 由原生工具基于 origin/main 创建、不含子项目①成果，执行时以 `git merge --ff-only main` 快进到本地 main 顶点修正基点；收尾审查/验收由主线程降级执行（子代理模型路由故障，见执行方式说明）。
