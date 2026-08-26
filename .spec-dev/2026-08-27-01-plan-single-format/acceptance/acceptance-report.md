# plan-single-format 验收报告

- 特性:`.spec-dev/2026-08-27-01-plan-single-format/`(spec: plan-single-format-design.md;计划: plan/ 分文件形态,T00-T08)
- 执行:worktree `plan/2026-08-27-01-plan-single-format`(基线 main@c7ca092)
- 验收日期:2026-08-27

## 验收矩阵执行结果

| Scenario / 检查项 | 维度 | 结果 | 证据 |
|---|---|---|---|
| living docs 无"阈值门控/形态分流"残留 | integration | ✅ | `rg '形态分流\|阈值门控\|任务数 >8\|低于阈值维持' skills/ guardrail/templates/ README.md README.zh-CN.md` 零命中(排除 CHANGELOG 与 .spec-dev/,历史档案不清理) |
| reference 删除后无悬空引用 | integration | ✅ | `rg 'progressive-plan-format\|progressive-execution'` 同范围零命中 |
| validate-skills / check-openai-sync / check-plugin / node --test 全绿 | integration | ✅ | 51/51(基线 44 + T01 新增 4 + T02 新增 3);13 skills valid;openai 同步 13;五清单一致 |
| 阈值条款不复存在 + 唯一形态断言 | docs | ✅(任务内 TDD) | plan-single-format.test.mjs 4/4(小计划也分文件/门控清零/步骤标题式/台账定义点) |
| 存量单文件计划可执行(eval 断言) | docs | ✅(任务内 TDD) | ep-legacy-single-file-executable 用例 + executing-plans 读宽容句/冻结语义断言 3/3 |
| resource-ledger-split 断言随动 | unit | ✅(任务内 TDD) | 3/3(预登记锚定/登记落点+存量兼容句/外围指针不悬空) |
| plan-index 校验对新结构通过 | unit | ✅(任务内 TDD) | 本计划自身即分文件产物,`node scripts/validate-output.mjs plan-index plan/` ok:true(自举验证) |

## Requirement Reconciliation

4 条 Requirement(3 MODIFIED + 1 ADDED):**4 DELIVERED / 0 DEFERRED / 0 DROPPED / 0 SUPERSEDED / 0 ADDED-IN-FLIGHT**

| Requirement | 裁决 | 交付证据 |
|---|---|---|
| plan 单一形态(MODIFIED) | DELIVERED | T01:阈值门控删除、progressive-plan-format 并入后删除、任务模板去复选框(14 处)、台账定义点锚定 resources、Self-Review 第 4 查;测试 4/4 |
| 渐进执行与断点恢复(MODIFIED) | DELIVERED | T02:渐进加载升默认+resume 并入本体、progressive-execution 删除、存量轻量恢复降格为兼容分支;测试 3/3 |
| 资源登记纪律(MODIFIED) | DELIVERED | T02 资源登记句+T03 三处指针(quick-fix/acceptance-qa/executing-plans);resource-ledger-split 3/3 |
| 存量计划兼容读取(ADDED) | DELIVERED | T02 格式嗅探句+冻结侧声明+T06 ep-legacy eval;验收 rg 双零命中佐证形态假设收敛 |

## 收尾审查(4 路:维度 A/B/C + completeness critic)

4 路并行审查(A 功能正确性/B 风格质量/C 规范遵循/completeness critic),独立复跑全绿(51/51、13/13、13/13)。

**结论:方向正确、断言非恒真、reference 纪律并入无丢失、spec 4 条 Requirement 严格落地。** 合并发现 **8 中 + 10 低(0 高)**,critic 确认 Requirement/Scenario/covers 三面零缺口(验收矩阵行 5 的任务文件命令缺陷为唯一实质项)。

用户裁决:全部修。修复提交 6e79aac——复选框动作语义清零(勾选/勾清→YAML 语义+测试补强)、「三查」→「四查」三处随动、「分组」→「依赖拓扑」、渐进描述去重、三连陈述与三处重复收敛、术语统一(中文"分文件形态"/英文 "split-file layout")、openai.yaml 中文段补形态+方位语消歧、README.zh 三件套补齐、quick-fix 语境限定、evals 存量标注、T07 验收正则收窄、progress.yaml 补 commit sha。info 级 2 项记录不修(语义已覆盖)。

修复后全量:51/51 + sh 测试 + 四校验全绿。

**Spec-Guard 区间放行记录**(C-F1):T01-T04 提交命中 supersede-lifecycle 等 5 份 active spec covers 未逐提交带 trailer;其中 major-upgrade 与本 spec 随 T08 自动解除,supersede-lifecycle/test-scoping/resource-ledger 三份为分面共存/零动作——本特性不改变其行为,放行理由=纯形态重构无行为交集,随取代回写提交的 Spec-Guard trailer 留痕。
