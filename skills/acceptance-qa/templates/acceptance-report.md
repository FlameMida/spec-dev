# Acceptance Report: {{target-feature}}

> 报告内容沿对话语言。小修可用对话中的同等简短结果，不强制生成本模板全部章节。
> Time: {{time}} | Trigger: {{workflow / direct}} | Scope: {{实际验收范围}}
> Spec: {{实际 active spec 或无 spec 的已确认依据；取代跳转链如适用}}
> Prototype: {{定稿 HTML 路径、版本/manifest、确认来源；或不适用/用户关闭/小改动依据}}
> Runtime: {{实际 URL/入口、候选源码或构建、账号角色、数据与视口条件}}

## Result

{{通过 / 未完成 / 失败；必需项 fail 阻塞，warn/unverified/manual-pending 或遗漏保持未完成。说明结论实际覆盖的范围。}}

## Prototype / Behavior Comparison

| Scenario / State | Required | Expected | Observed | Status | Evidence |
|---|---|---|---|---|---|
| {{场景与角色/状态}} | {{true/false}} | {{原型或行为预期}} | {{实际观察}} | {{pass/warn/fail/unverified}} | {{真实原件引用}} |

## Business Evidence

| Check | Reused / New | Candidate / Conditions | Evidence / Result |
|---|---|---|---|
| {{保存后重读等真实结果}} | {{复用/新增}} | {{版本与条件适用性}} | {{record/日志/断言原件及实际结果}} |

## Gaps / Findings

{{实际差异、未验证项、原因、需补验证；经验证的根因与仍为候选的解释分开。修复后说明哪些证据失效、补验范围及理由。}}

## Requirement Reconciliation

{{工作流主线程填写；独立触发可省略。逐条核对后写 DELIVERED/DEFERRED/DROPPED/SUPERSEDED/ADDED-IN-FLIGHT；延期/放弃附用户决定来源，不默认预填全部 DELIVERED。}}

## Evidence Index / coverage_note

{{检查 JSON、实际回执、截图/trace/归档 HTML 和适用版本。声明裁剪、复核范围、环境缺件、mock 边界及 manual-pending；校验器 ok 不替代语义和覆盖核对。}}
