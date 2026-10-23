# 实际界面对照与风险复核（Tier A）

> 阅读时机：页面三步验收的实际操作或证据复核。主流程在 SKILL.md；本文件只定义操作取证与有界复核。

## 清单与断言

从定稿 HTML、现行 Scenario 和已确认关键状态取得清单，先检查遗漏的入口/角色/失败状态。没有原型时使用已确认的文字/既有界面契约，不自动生成新设计。每项写清操作、expected、required；不要用检查数量代表完整覆盖。

单浏览器会话全程串行；按实际工具能力优先真实确定性断言，其次结构化快照，再用截图判读视觉与语义。browser_verify_* 可用时优先使用，不存在时使用已连接工具或原生 Playwright 的等价断言，不能编造工具结果。原型模拟成功不证明真实保存、授权或计算；复用适用业务原件，缺失才补验。

## 取证与记录

每项保存实际操作、observed、result、evidence_ref 和 evidence_sha256，referenced artifact 必须是非空可回看原件。工具回执、截图、trace 均可；多步交互的关键前后状态要足以支持结论。mock 网络注明边界，不推导真实外部联验。

凭据按当前浏览器工具的安全机制注入，不进报告；记录环境/候选来源，原件放调用方 evidence 目录。含隐私的截图按实际授权处理，不用脱敏后的自述代替原始结果证明。

## 风险复核

light/standard 不机械审计每个 pass；聚焦关键流程、弱证据、矛盾或不稳定结果，以及失败的真实原因。deep 扩大适用状态和独立审计范围，也不固定抽两条来代表全部关键路径。

- pass 的证据只能证明操作或覆盖不足：降为 unverified，补对应证据。
- fail/warn：先区分产品、测试前置、环境和级联；确有选择器/时序疑点时有界重执行，不要求每个失败都再完整重跑一次。
- 需要独立语义判断时：审计者取得预期、原件、范围和版本，尝试反驳结论；不只读原报告，也不另起全套浏览器流程。无独立能力时标主线程复核。
- 新结论回写 result/observed；recheck 包含 status（维持/降级/翻案）、实际 evidence_ref/evidence_sha256。旧失败与原件保留。

## 契约校验

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" acceptance-check-items <file>
```

校验失败按 errors 补全一次，再失败将缺失项标记 unverified 并在报告说明（acceptance-qa 变体；通用规则见 exploration-patterns「输出契约与校验」）。文件与 hash 检查不证明语义或覆盖；reported_result 只是必需行自报告状态的汇总，真正结论须完成主流程核对。没有证据不能写 pass/warn/fail。

移动端/桌面环境沿同一操作和证据纪律，换实际可用工具；无设备或无法连接目标时保留 unverified，不因环境不同降低必需程度。
