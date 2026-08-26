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

(进行中,结论待补)
