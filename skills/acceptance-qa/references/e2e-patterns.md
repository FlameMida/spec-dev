# Playwright E2E 模式（Tier D）

生成 e2e 维度确定性用例时的代码模式参考。所有代码为 Playwright 原生（TypeScript），不使用 MCP。

---

## 选择器策略（优先级从高到低）

```typescript
// 1. data-testid（最推荐 — 不受样式和文案变化影响）
page.getByTestId('submit-button')

// 2. role + name（语义化，可访问性好）
page.getByRole('button', { name: '提交' })
page.getByRole('textbox', { name: '邮箱' })

// 3. label 关联
page.getByLabel('密码')

// 4. placeholder
page.getByPlaceholder('请输入邮箱')

// 5. 文本内容（最后选择 — 文案可能频繁变化）
page.getByText('登录')
```

---

## 基础模式

### 页面导航 + 断言

```typescript
test('页面正确加载', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/登录/);
  await expect(page.getByTestId('login-form')).toBeVisible();
});
```

### 表单填写 + 提交

```typescript
test('成功登录', async ({ page }) => {
  await page.goto('/login');

  // Arrange
  const email = page.getByTestId('email-input');
  const password = page.getByTestId('password-input');
  const submit = page.getByTestId('submit-button');

  // Act
  await email.fill('user@example.com');
  await password.fill('correct-password');
  await submit.click();

  // Assert — 会因功能破坏而失败的业务断言
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Welcome')).toBeVisible();
});
```

### 验证错误提示

```typescript
test('空表单提交显示错误', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('submit-button').click();

  await expect(page.getByTestId('email-error')).toHaveText('请输入邮箱');
  await expect(page.getByTestId('password-error')).toHaveText('请输入密码');
});
```

---

## 等待策略

```typescript
// 等待网络空闲（页面完全加载）
await page.goto('/dashboard', { waitUntil: 'networkidle' });

// 等待特定元素出现
await expect(page.getByTestId('data-table')).toBeVisible({ timeout: 10000 });

// 等待 API 响应
const responsePromise = page.waitForResponse('**/api/users');
await page.getByTestId('refresh-button').click();
const response = await responsePromise;
expect(response.status()).toBe(200);

// 等待 URL 变化 / 元素数量
await expect(page).toHaveURL('/success');
await expect(page.getByTestId('list-item')).toHaveCount(5);
```

---

## API Mock 拦截

```typescript
test('数据加载失败时显示错误', async ({ page }) => {
  await page.route('**/api/data', (route) =>
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    })
  );

  await page.goto('/dashboard');
  await expect(page.getByText('加载失败')).toBeVisible();
});
```

mock 网络下验收的用例在报告 notes 注明——mock 掩盖真实接口问题，全链路行为以非 mock 用例为准。

---

## 多页面 / iframe

```typescript
// 新标签页
const page2Promise = context.waitForEvent('page');
await page.getByTestId('external-link').click();
const page2 = await page2Promise;
await expect(page2).toHaveURL(/external-site/);

// iframe 内部交互
const iframe = page.frameLocator('[data-testid="embed-iframe"]');
await iframe.getByTestId('inner-button').click();
await expect(iframe.getByText('操作成功')).toBeVisible();
```

---

## 文件上传

```typescript
await page.getByTestId('file-input').setInputFiles({
  name: 'test.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('test content'),
});
await page.getByTestId('upload-button').click();
await expect(page.getByText('上传成功')).toBeVisible();
```

---

## 测试数据管理（fixtures）

```typescript
type TestFixtures = { authenticatedPage: Page };

const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill(process.env.TEST_USER_EMAIL!);
    await page.getByTestId('password-input').fill(process.env.TEST_USER_PASSWORD!);
    await page.getByTestId('submit-button').click();
    await expect(page).toHaveURL('/dashboard');
    await use(page);
  },
});
```

凭据一律走环境变量，不硬编码。

---

## 并行执行配置（最小 playwright.config.ts）

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

非交互安装序列（禁用交互式向导——`npm init playwright@latest` 会挂起非交互 agent 会话）：

```bash
npm install -D @playwright/test
npx playwright install chromium
```

---

## Playwright Test Agents（按需推荐档）

Playwright 1.56+ 自带三个官方 Test Agents，适合"项目已启用/用户愿意启用"时作为 e2e 用例的生成路径；**本 skill 不主动执行 init-agents**（会在用户项目内生成 agent 定义文件，属于侵入性改动），仅在项目无 E2E 且用户询问方案时推荐：

```bash
npx playwright init-agents --loop=claude   # 生成 agent 定义（Playwright 升级后需重新生成）
```

- **planner**：探索应用产出 Markdown 测试计划（`specs/*.md`）——输入给它一个 `seed.spec.ts`（准备好环境/fixtures 的种子测试）；有 spec 的项目可把 spec/PRD 作为 planner 的上下文输入
- **generator**：把 Markdown 计划转成 `tests/` 下的 Playwright 用例，边执行边校验选择器与断言
- **healer**：重放失败测试并尝试修复（更新 locator、调整等待、跳过），认为功能真坏时输出 skip

**验收纪律**：healer 的产出（改 locator/改等待/skip）**必须逐条人工确认后才计入验收结果**——它有把真缺陷"治"成 skip 或弱断言的风险；被 healer skip 的用例在验收报告中按 fail 处理，除非确认功能确实按预期变更。生成的用例仍须满足本文件的选择器策略与"至少一个业务断言"底线。

---

## 桌面客户端（Electron / Tauri）

```typescript
import { test, expect, _electron as electron } from '@playwright/test';

test('Electron 应用启动并加载主窗口', async () => {
  const app = await electron.launch({ args: ['main.js'] });
  const window = await app.firstWindow();
  await expect(window.getByTestId('app-root')).toBeVisible();
  await app.close();
});
```

- Electron：`_electron.launch()` 拿到 app 与首窗口后，模式与 web 相同；主进程状态经 `app.evaluate()` 断言
- Tauri：无官方 Playwright 支持，走 WebDriver（tauri-driver）；不可行时该矩阵行降级 Tier A 或标注人工项并写入 coverage_note

---

## 视觉与 a11y 断言

`toHaveScreenshot` 截图回归与 AxeBuilder 扫描的纪律统一定义在 [visual-a11y.md](visual-a11y.md)，e2e 用例中直接复用其模式，不在此重复定义。

---

## ⚠️ 反模式警告

```typescript
// ❌ 硬编码等待 —— 用 expect/waitFor 替代
await page.waitForTimeout(5000);

// ❌ 依赖 CSS 类名（频繁变化）—— 用 data-testid 替代
await page.locator('.btn-primary-v2').click();

// ❌ 测试间共享状态 —— 每个 test 独立
// ❌ 任意文案选择器 —— 文案会变
// ❌ 用 MCP/LLM 驱动 E2E 断言 —— Tier D 必须每次运行结果相同
// ❌ 仅断言元素可见 —— 每条用例至少一个会因功能破坏而失败的业务断言
```
