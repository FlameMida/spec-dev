# 验收矩阵（Acceptance Matrix）

> **阅读时机**：阶段 0 装配验收上下文时。本文件是 acceptance-qa 与上游（requirement-analysis 的 spec、writing-plans 的计划、executing-plans 的收尾编排）之间的集成契约单一定义点。

## 矩阵结构

验收矩阵是「检查项 × 维度 × 执行性质 × 证据」的表格，写在 spec 的「测试与验收策略」节（无 spec 时由本 skill 现场生成迷你矩阵）：

```markdown
| Scenario / 检查项 | 维度 | 执行方式 | 验收证据 |
|-------------------|------|---------|---------|
| 拒绝过期 token | integration | 任务内 TDD | 测试通过 |
| 正确凭据登录后跳转仪表盘 | e2e | 验收任务 (D) | E2E 通过 + trace |
| 错误提示清晰可读、无布局破坏 | visual | 验收任务 (A) | 截图 + 判读记录 |
| 登录表单 WCAG AA 无违例 | a11y | 验收任务 (D) | axe 扫描报告 |
| 登录页 LCP ≤ 2.5s（lab, 中位数） | perf-web | 验收任务 (D) | trace/LHCI 报告 |
| /api/login p(95) < 300ms @ 50 VU | perf-api | 验收任务 (D) | k6 thresholds 输出 |
```

**列定义**：

- **Scenario / 检查项**：优先直接引用 spec 行为规范中的 `#### Scenario:` 名称（GIVEN/WHEN/THEN 即验收步骤）；性能/视觉等非行为项写成可判定的一句话（含阈值数字）
- **维度**：`unit | integration | e2e | visual | a11y | perf-web | perf-api`（客户端环境以括注修饰，如 `e2e (electron)`）
- **执行方式**：二选一——`任务内 TDD`（由 writing-plans 翻译为任务内失败测试，acceptance-qa 只复跑复核）或 `验收任务 (D|A)`（进入计划尾部验收任务，由 acceptance-qa 执行，括注执行性质）
- **验收证据**：判定依据的产物形态；Tier A 行的证据必须是可回看的（快照片段/截图/trace），"操作过了"不算证据

**行数纪律**：每条 Requirement 至少一行；一行只验一件事；没有阈值数字的性能行是无效行（"性能要好"不可判定）——写不出数字就回到澄清。

## 上游分工（谁写、谁翻译、谁执行）

```
requirement-analysis（写矩阵）
  └─ spec「测试与验收策略」节按上表结构落矩阵；
     unit/integration 行通常逐 Scenario 生成，e2e 行覆盖关键用户流程，
     visual/a11y/perf 行仅在需求形态需要时出现（见下方维度取舍）
writing-plans（翻译矩阵）
  ├─ 「任务内 TDD」行 → 对应任务的失败测试步骤（GIVEN→arrange、WHEN→act、THEN→assert）
  └─ 「验收任务」行 → 计划固定生成的「验收任务」（位于最终任务之前），
     逐行列出验收点：维度、目标（URL/端点/页面）、阈值、证据要求
executing-plans（触发执行）
  └─ 全部实施任务完成后、收尾审查期间触发 acceptance-qa：
     输入 = spec 路径 + 计划验收任务 + 本次变更文件清单 + 证据目录
acceptance-qa（执行与回填）
  └─ 按矩阵执行 → 报告落盘特性目录 acceptance/ → 每行回填最终状态
```

**变更面裁剪**（executing-plans 触发时）：只执行与本次变更面相交的矩阵行——变更未触及支付流程就不跑支付的 e2e 行；裁剪结果写入 coverage_note。全量回归仅在用户显式要求或计划注明时执行。

## 独立触发：迷你矩阵生成

无 spec 时从目标描述现场生成，规则：

1. **定制检查项**（3-6 条）：从目标描述提取功能要点逐条生成（如"购物车数量修改后小计实时更新"），维度按检查项性质归位
2. **通用项筛选**：只挑适用的附加——响应式布局（至少桌面端）、页面跳转正确性、加载状态反馈、无明显视觉异常、无 console 错误
3. **每条检查项写明**：操作序列（具体步骤）+ 预期表现（可观察结果）+ 证据形态
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
