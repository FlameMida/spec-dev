# 验收矩阵（Acceptance Matrix）

> **阅读时机**：第一步核对验收依据与证据时。本文件是 acceptance-qa 与上游（requirement-analysis 的 spec、writing-plans 的计划、executing-plans 的收尾编排）之间的集成契约单一定义点。

## 矩阵结构

验收矩阵是「检查项 × 维度 × 执行性质 × 证据」的表格，写在 spec 的「测试与验收策略」节（无 spec 时由本 skill 现场生成迷你矩阵）：

```markdown
| Scenario / 检查项 | 维度 | 执行方式 | required | Lane | 验收证据 |
|-------------------|------|---------|----------|------|---------|
| 拒绝过期 token | integration | 任务内 TDD | true | fast | 测试通过 |
| 正确凭据登录后跳转仪表盘 | e2e | 验收任务 (D) | true | final | E2E 通过 + trace |
| 错误提示清晰可读、无布局破坏 | visual | 验收任务 (A) | true | final | 截图 + 判读记录 |
| 登录表单 WCAG AA 无违例 | a11y | 验收任务 (D) | true | final | axe 扫描报告 |
| 登录页 LCP ≤ 2.5s（lab, 中位数） | perf-web | 验收任务 (D) | true | manual | trace/LHCI 报告 |
| /api/login p(95) < 300ms @ 50 VU | perf-api | 验收任务 (D) | true | manual | k6 thresholds 输出 |
```

**列定义**：

- **Scenario / 检查项**：优先直接引用 spec 行为规范中的 `#### Scenario:` 名称（GIVEN/WHEN/THEN 即验收步骤；仅现行 Requirement 下的 Scenario——被 `Superseded` 标注者不引用）；性能/视觉等非行为项写成可判定的一句话（含阈值数字）
- **维度**：`unit | integration | e2e | visual | a11y | perf-web | perf-api`（客户端环境以括注修饰，如 `e2e (electron)`）
- **执行方式**：二选一——`任务内 TDD`（由 writing-plans 翻译为任务内失败测试，acceptance-qa 核验并复用有效回执，缺口才补验）或 `验收任务 (D|A)`（进入计划尾部验收任务，由 acceptance-qa 执行，括注执行性质）
- **required**：该项是否为交付必需；不得因耗时或环境缺件改为 false。延期/放弃消费用户明确决定。
- **Lane**：fast/final/manual 是时机/条件，不等于 D/A/X，也不改变 required。
- **验收证据**：判定依据的产物形态；Tier A 行的证据必须是可回看的（快照片段/截图/trace），"操作过了"不算证据

**行数纪律**：每个**现行** Scenario 至少一行，并核对关键角色/入口/状态及最终结果是否有遗漏（被 `Superseded` 标注的 Requirement 不出行）；一行只验一件事；没有阈值数字的性能行是无效行（"性能要好"不可判定）——写不出数字就回到澄清。

## 上游分工（谁写、谁翻译、谁执行）

```
requirement-analysis（写矩阵）
  └─ spec「测试与验收策略」节按上表结构落矩阵；
     unit/integration 行通常逐 Scenario 生成，e2e 行覆盖关键用户流程，
     visual/a11y/perf 行仅在需求形态需要时出现（见下方维度取舍）；
     有 UI 时同时引用定稿 HTML/版本/确认来源及适用状态；每行标注 required 与 Lane 归属（fast/final/manual，语义见 test-strategy skill），性能行必须带阈值数字
writing-plans（翻译矩阵）
  ├─ 「任务内 TDD」行 → 对应任务的失败测试步骤（GIVEN→arrange、WHEN→act、THEN→assert）；
  │  翻译时继承 Lane 归属并对照 test-strategy 的栈处方
  └─ 「验收任务」行 → 计划固定生成的「验收任务」A（依赖独立 final 验证票 F，先于最大号交付 D），
     逐行列出验收点：维度、目标、阈值/预期、required 与证据；第一条真实闭环在最早可运行切片先验证，收尾消费有效原件
executing-plans（触发执行）
  └─ 全部实施任务与 F 完成、独立审查后触发 acceptance-qa：
     输入 = spec + 验收任务 + 适用原型/确认来源/状态 + 当前候选与运行版本 + 有效 F 回执 + 变更范围 + 证据目录
acceptance-qa（执行与回填）
  └─ 核对依据与证据 → 对照实际页面/行为 → 补验缺口并给结论 → 报告逐行记录
```

**变更面裁剪**：按实际影响链确定需重新执行的行，仍有效证据直接复用；共享入口、权限、布局和配置影响不能只看文件交集。保留每个必需 Scenario 的最终依据，裁剪/不适用/已取代原因进入 coverage_note。首次 F 全量、修复后补验沿 test-strategy，不在验收无条件重跑完整套件。

## 独立触发：迷你矩阵生成

无 spec 时从目标描述现场生成，规则：

1. **定制检查项**（按目标的真实流程和状态）：从目标描述提取功能要点逐条生成（如"购物车数量修改后小计实时更新"），维度按检查项性质归位
2. **通用项筛选**：只挑适用的附加——响应式布局（至少桌面端）、页面跳转正确性、加载状态反馈、无明显视觉异常、无 console 错误
3. **每条检查项写明**：required + 操作序列（具体步骤）+ 预期表现（可观察结果）+ 证据形态
4. 迷你矩阵随报告前置呈现——用户能看到"验了什么、没验什么"

## 维度取舍判据

| 需求形态 | 默认纳入 | 默认裁剪 |
|---------|---------|---------|
| 纯后端接口/服务 | unit、integration、perf-api（有 SLO 时） | e2e(浏览器)、visual、a11y、perf-web |
| Web UI 功能 | unit/integration（有逻辑时）、e2e、visual、a11y | perf-api（除非同时改了接口） |
| 首屏/加载体验类 | perf-web、visual | perf-api |
| 桌面/移动客户端 | unit、e2e(对应环境)、visual | perf-web（无浏览器指标） |
| 纯样式/文案调整 | visual、a11y | unit、perf-* |

裁剪不是删除信息：被裁维度与理由一并写入报告 coverage_note。

## 状态回填

验收完成后逐行回填矩阵状态：`pass | warn | fail | unverified`（语义同契约 schema）。有 spec 时在报告「Requirement 覆盖对照」节呈现全表；fail/warn 行链接到诊断结论；unverified 行必须给原因（环境缺件/证据不足/被裁剪）。

## 整体结论

required 行 fail 则阻塞；warn/unverified/manual-pending 或必需行遗漏时整体未完成。确认过的局部预览不等于业务交付。已有有效真实业务证据复用；无证据才补验，不用单测计数或新截图基线代替原型对照。report/JSON 格式通过只表示机械检查完成，核对原件支持预期及运行版本后才可定稿。

存量矩阵未写 required 时，从原批准的完成条件核对并在新检查记录显式填写；缺字段不等于 optional，也不批量迁移或改写历史报告。D/A/X 是结论来源，不得在计划中解释为自动/人工授权。
