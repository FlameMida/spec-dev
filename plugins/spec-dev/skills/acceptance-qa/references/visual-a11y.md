# 视觉回归与可访问性验收

> **阅读时机**：矩阵含 visual/a11y 行、或意图路由到这两个维度时。

## visual（Tier D）：截图回归

### 基本形态

```typescript
// 页面级
await expect(page).toHaveScreenshot('login-page.png', { maxDiffPixelRatio: 0.01 });
// 组件级（更稳，推荐优先）
await expect(page.getByTestId('login-form')).toHaveScreenshot('login-form.png');
```

### 纪律

1. **环境一致性是第一前提**（官方警告：渲染随 OS/版本/headless/硬件而变）——基线在哪个环境生成就在哪个环境比对；快照名自带 `browser-platform` 后缀（如 `-chromium-darwin`），跨环境比对没有意义。团队要跨机器共享基线时用容器统一渲染环境，否则基线按环境各自维护
2. **动态区域必须处理**：时间戳/头像/广告/动画用 `mask: [locator]` 遮罩或 `stylePath` 注入 CSS 隐藏（`animations: 'disabled'` 默认已关动画）；不处理动态区域的视觉测试必然 flaky
3. **建线与回归是两回事**：无基线时首跑生成基线——这一轮**只算建线，不构成回归结论**，报告如实声明；基线文件提交进版本控制
4. **基线更新是受控操作**：`npx playwright test --update-snapshots` 只在确认"变化是预期的"之后执行；验收中发现 diff 时先判定"预期变更 or 回归"，不许为了转绿静默刷基线——刷基线=销毁证据
5. 阈值从严起步：`maxDiffPixelRatio: 0.01` 或组件级 `maxDiffPixels: 100`；放宽须在报告注明理由
6. 非图像快照：文本/结构用 `expect(value).toMatchSnapshot(name)`，适合导出内容、错误文案等

## visual（Tier A）：AI 视觉判读

截图回归回答"变没变"，AI 判读回答"对不对"——两者互补，不互替。

### 能可靠判定（可作为 warn/fail 依据）

- 明显布局破坏：元素重叠、溢出容器、错位、截断
- 缺失/多余的可见元素（与预期描述对照）
- 暗色/亮色模式适配明显失败（配合 chrome-devtools MCP `emulate` colorScheme 或 playwright MCP 切换后截图）
- 响应式断点的结构性塌陷（改 viewport 后对照）
- 文案与预期语义明显不符

### 不能可靠判定（不允许下 fail 结论，最多 warn+人工项）

- 像素级偏移、精确色值/对比度数字（对比度问题交给 axe 的 color-contrast 规则）
- 字体渲染细节、亚像素差异
- "美不美"类主观判断

判读输出必须**指认位置**（"提交按钮与输入框重叠约半个按钮高度"），不允许"整体看起来正常"这类不可反驳的结论——不可反驳=不可审计。

## a11y（Tier D）：axe 扫描

### 标准形态（@axe-core/playwright）

```typescript
import AxeBuilder from '@axe-core/playwright';

test('登录页无 WCAG A/AA 自动可检violations', async ({ page }) => {
  await page.goto('/login');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

- 断言 `violations` 为空即通过；每条 violation 摘录 id/impact/节点定位进证据
- **已知问题排除**：确认为误报或暂不修复的用 `.exclude(selector)` 或 `.disableRules([ruleId])`，且每条排除必须在报告注明理由——静默排除等于造假
- 多页面共享配置用 fixture 封装预配置的 AxeBuilder
- 动态交互后的状态（打开的弹窗、展开的菜单）单独扫一次——只扫初始态会漏掉大半问题
- 补充证据：chrome-devtools MCP `lighthouse_audit`（mode: navigation）产出 accessibility 分与明细，可与 axe 交叉印证

### 自动化限界（官方口径：自动化不能检出全部 WCAG 违例）

axe 检不了的转 Tier A 键盘走查或标注人工项：

- **键盘走查**（Tier A 可执行）：Tab 顺序是否符合视觉顺序、焦点是否可见、Enter/Esc 是否按预期触发/关闭、焦点是否被弹窗困住——经 playwright MCP `browser_press_key` 逐步执行并快照取证
- **只能人工**（报告列为人工项，不计 pass）：读屏实际体验、替代文本是否达意、认知负担类判断
