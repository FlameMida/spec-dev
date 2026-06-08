# Playwright E2E 常用模式

生成 Layer 1 E2E 测试时的代码模式参考。所有代码为 Playwright 原生（TypeScript），不使用 MCP。

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

  // Assert
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

// 等待 URL 变化
await expect(page).toHaveURL('/success');

// 等待元素数量
await expect(page.getByTestId('list-item')).toHaveCount(5);
```

---

## API Mock 拦截

```typescript
test('数据加载失败时显示错误', async ({ page }) => {
  // Mock API 返回错误
  await page.route('**/api/data', (route) =>
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    })
  );

  await page.goto('/dashboard');
  await expect(page.getByText('加载失败')).toBeVisible();
});

test('使用 fixture 数据', async ({ page }) => {
  await page.route('**/api/users', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),
    })
  );

  await page.goto('/users');
  await expect(page.getByText('Alice')).toBeVisible();
});
```

---

## 多页面/标签页

```typescript
test('新标签页打开', async ({ page, context }) => {
  await page.goto('/dashboard');

  const page2Promise = context.waitForEvent('page');
  await page.getByTestId('external-link').click();
  const page2 = await page2Promise;

  await expect(page2).toHaveURL(/external-site/);
});
```

---

## iframe 处理

```typescript
test('iframe 内部交互', async ({ page }) => {
  await page.goto('/page-with-iframe');

  const iframe = page.frameLocator('[data-testid="embed-iframe"]');
  await iframe.getByTestId('inner-button').click();
  await expect(iframe.getByText('操作成功')).toBeVisible();
});
```

---

## 视觉对比测试

```typescript
test('页面视觉回归', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveScreenshot('login-page.png', {
    maxDiffPixelRatio: 0.01,
  });
});

test('组件视觉回归', async ({ page }) => {
  await page.goto('/login');
  const form = page.getByTestId('login-form');
  await expect(form).toHaveScreenshot('login-form.png');
});
```

---

## 文件上传

```typescript
test('上传文件', async ({ page }) => {
  await page.goto('/upload');

  const fileInput = page.getByTestId('file-input');
  await fileInput.setInputFiles({
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('test content'),
  });

  await page.getByTestId('upload-button').click();
  await expect(page.getByText('上传成功')).toBeVisible();
});
```

---

## 并行执行配置

```typescript
// playwright.config.ts
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

---

## 测试数据管理

```typescript
// 使用 test.extend 创建 fixtures
type TestFixtures = {
  authenticatedPage: Page;
};

const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // 登录
    await page.goto('/login');
    await page.getByTestId('email-input').fill('test@example.com');
    await page.getByTestId('password-input').fill('test-password');
    await page.getByTestId('submit-button').click();
    await expect(page).toHaveURL('/dashboard');

    // 传递已认证的 page
    await use(page);
  },
});

test('已登录用户可以查看个人资料', async ({ authenticatedPage }) => {
  await authenticatedPage.getByTestId('profile-link').click();
  await expect(authenticatedPage.getByText('test@example.com')).toBeVisible();
});
```

---

## ⚠️ 反模式警告

以下模式在 E2E 测试中**严禁使用**：

```typescript
// ❌ 不要使用硬编码等待
await page.waitForTimeout(5000); // 用 waitForSelector/expect 替代

// ❌ 不要依赖 CSS 类名（可能频繁变化）
await page.locator('.btn-primary-v2').click(); // 用 data-testid 替代

// ❌ 不要在测试间共享状态
// test 1: 登录
// test 2: 依赖 test 1 的登录状态 ← 错误！每个 test 应独立

// ❌ 不要使用任意文本选择器
await page.locator('text=随便一段文案').click(); // 文案会变

// ❌ 不要用 MCP/LLM 驱动 E2E 断言
// LLM 推理是不确定性的，E2E 必须每次运行结果相同
```
