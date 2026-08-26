# plan-single-format 实施计划

> **执行方式**:使用 spec-dev 的 executing-plans skill 逐任务执行本计划;无该 skill 的环境直接从任务 0 起按序执行至最终任务。**本计划为分文件形态:progress.yaml 是唯一状态源,任务文件不含复选框**;脱离项目携带时连同特性目录(含 spec)整体带走。
>
> **偏差处理**:执行中发现计划与现实不符——小偏差(路径笔误、明显遗漏但意图清楚)就地修正并在提交信息中注明;接口、数据结构等契约级偏差停下向计划作者确认,不猜着改。

**目标**:plan 双形态收敛为唯一分文件形态(写收敛、读宽容),两个 progressive reference 合并进各自 SKILL.md 后删除。

**Spec**:`.spec-dev/2026-08-27-01-plan-single-format/spec/plan-single-format-design.md`(status: active)

**架构**:writing-plans 主体重组为唯一分文件生成形态(结构/导航表/键结构/生成规则并入本体);executing-plans 并入渐进加载纪律、保留存量单文件读分支(冻结侧);外围五处指针与 README/snippet/evals 随动;测试断言联动。

**技术栈**:纯 markdown 指令文档 + JSON evals + node:test docs 断言;无代码变更、无新依赖。

**设计原则**:本计划遵循 spec-dev 设计原则(不留向后兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策);任务与代码不得违反,冲突时停下向计划作者确认。读分支保留是"读历史数据"而非兼容垫片(design-principles 第 1 条注解)。

## 全局约束

- 写收敛:writing-plans 只产 `plan/index.md + plan/tasks/TNN.md + plan/progress.yaml`,删除阈值门控(>8 任务/25KB)与"低于阈值维持单文件"条款
- 读宽容:executing-plans 保留格式嗅探(`plan/tasks/` 存在→分文件;否则→单文件按原样执行);单文件侧冻结——不新增条款
- 任务文件步骤用「**步骤 N:**」标题式,全局去复选框(progress.yaml 唯一状态源)
- 任务文件模板迁移时 TDD 五步结构、禁止占位符、接口块契约全部继承
- executing-plans 的 description 变更必须与 `agents/openai.yaml` 同步(否则 check-openai-sync 红)
- 存量 grandfather:`.spec-dev/` 现有单文件计划不迁移不改名
- 提交信息前缀 `feat(TN)`;本特性 spec covers 命中大量文件,契约语义变更走 spec 已同步路径(spec 已 active 且本次为其实施),守卫拦截时按双声明规则(与 supersede-lifecycle 共存)处理

## 相关测试范围

- `node --test scripts/tests/*.test.mjs`(全量 docs/unit 断言;rtk 代理下目录形式不可用,用 glob 形式)
- `bash scripts/tests/visual-path.test.sh`
- `node scripts/validate-skills.mjs`
- `node scripts/check-openai-sync.mjs`
- `node scripts/check-plugin.mjs`

推导说明:纯文档特性但 covers 含 `scripts/tests/resource-ledger-split.test.mjs`(断言联动对象),故范围为全量测试+四校验命令。

## 任务导航表

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 建立隔离工作区 | — | — | worktree `.worktrees/plan-2026-08-27-01-plan-single-format`(分支 `plan/2026-08-27-01-plan-single-format`) |
| T01 writing-plans 唯一形态重组 | T00 | progressive-plan-format.md 现文(45 行,并入后删除) | 文本锚:`plan/ 目录唯一形态`、`「**步骤 N:**」标题式`、`progress.yaml resources 台账规范定义点`;文件删除:`skills/writing-plans/references/progressive-plan-format.md` |
| T02 executing-plans 渐进默认+读宽容 | T01 | T01 的形态术语与台账定义点位置 | 文本锚:`按原样读取`读分支、渐进加载为主语义;文件删除:`skills/executing-plans/references/progressive-execution.md`;`agents/openai.yaml` description 同步 |
| T03 外围指针五处随动 | T01, T02 | T01 台账定义点、T02 读宽容句 | 文本锚:quick-fix/acceptance-qa/executing-plans:61 指针指向"writing-plans 的资源台账定义(progress.yaml resources 键)";requirement-analysis:184 与 review-orchestration:54 措辞 |
| T04 guardrail snippet 双语四行 | T01 | T01 形态术语 | snippet 文本:`plan/ directory (index + tasks + progress.yaml); legacy single-file plans are read as-is`(双语) |
| T05 README 双语随动 | T01 | T01 形态术语 | README 文本:管线图/流程详述产物形态+命令示例补分文件 |
| T06 evals 两件 | T02 | T02 读宽容语义 | `skills/writing-plans/evals/evals.json` 用例 wp-* 改分文件产物;`skills/executing-plans/evals/evals.json` 新增用例 `ep-legacy-single-file-executable` |
| T07 验收(acceptance-qa) | T01-T06 | 全部 | 验收报告落盘 `acceptance/` |
| T08 合并与清理 | T00-T07 | T07 报告、spec「取代与共存」节 | 取代回写(major-upgrade 三条 Superseded 标注+pending 回收)、合并、sync_commit 锚定 |

## 资源预登记说明

分文件形态:资源台账承载于 `progress.yaml` 的 `resources` 键(worktree 行已预登记;执行中创建即追加),最终任务(T08)清理步骤遍历该清单,任务文件内不嵌复选框台账。
