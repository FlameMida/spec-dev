/**
 * Playwright E2E 测试模板
 *
 * 使用方法:
 *   1. 复制此模板到项目的测试目录
 *   2. 替换 {{占位符}} 为实际值
 *   3. 根据被测功能补充测试用例
 *
 * 命名约定: <feature>.spec.ts
 * 放置位置: tests/ 或 e2e/ 目录下
 */

import { test, expect } from '@playwright/test';

// ============================================================
// 配置区域 — 根据项目修改
// ============================================================

/** 被测功能的页面路径 */
const PAGE_PATH = '{{/login}}';

/** 测试用户凭据（从环境变量读取，不要硬编码） */
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'test-password',
};

// ============================================================
// 测试套件
// ============================================================

test.describe('{{登录功能}}', () => {
  // ============================================================
  // 前置/后置
  // ============================================================

  test.beforeEach(async ({ page }) => {
    // 每个测试前导航到目标页面
    await page.goto(PAGE_PATH);
    // 等待关键元素加载完成
    await expect(page.getByTestId('{{login-form}}')).toBeVisible();
  });

  // ============================================================
  // 正向测试 — Happy Path
  // ============================================================

  test('正确凭据登录成功', async ({ page }) => {
    // Arrange — 准备测试数据
    const emailInput = page.getByTestId('{{email-input}}');
    const passwordInput = page.getByTestId('{{password-input}}');
    const submitButton = page.getByTestId('{{submit-button}}');

    // Act — 执行操作
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await submitButton.click();

    // Assert — 验证结果
    await expect(page).toHaveURL('{{/dashboard}}');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  // ============================================================
  // 反向测试 — 错误处理
  // ============================================================

  test('空表单提交显示验证错误', async ({ page }) => {
    // Act — 直接提交空表单
    await page.getByTestId('{{submit-button}}').click();

    // Assert — 验证错误提示
    await expect(page.getByTestId('{{email-error}}')).toBeVisible();
    await expect(page.getByTestId('{{email-error}}')).toHaveText('{{请输入邮箱}}');
  });

  test('错误密码显示错误提示', async ({ page }) => {
    // Arrange
    await page.getByTestId('{{email-input}}').fill(TEST_USER.email);
    await page.getByTestId('{{password-input}}').fill('wrong-password');

    // Act
    await page.getByTestId('{{submit-button}}').click();

    // Assert
    await expect(page.getByText('{{用户名或密码错误}}')).toBeVisible();
    // 验证仍在登录页
    await expect(page).toHaveURL(PAGE_PATH);
  });

  // ============================================================
  // UI 状态测试
  // ============================================================

  test('提交时按钮显示 loading 状态', async ({ page }) => {
    // 拦截 API 延迟响应以观察 loading 状态
    await page.route('**/api/{{auth}}/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.getByTestId('{{email-input}}').fill(TEST_USER.email);
    await page.getByTestId('{{password-input}}').fill(TEST_USER.password);
    await page.getByTestId('{{submit-button}}').click();

    // Assert — 验证 loading 状态
    await expect(page.getByTestId('{{submit-button}}')).toBeDisabled();
    // 或验证 loading 文案
    // await expect(page.getByTestId('submit-button')).toHaveText('登录中...');
  });

  // ============================================================
  // 可访问性基础测试
  // ============================================================

  test('表单可访问性', async ({ page }) => {
    // 所有输入框都有关联 label
    const emailInput = page.getByTestId('{{email-input}}');
    const passwordInput = page.getByTestId('{{password-input}}');

    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // 提交按钮可通过键盘触发 —— 填入有效凭据后走纯键盘路径提交，
    // 断言真的登录成功（键盘可达性坏了这条会失败，而不是无断言空跑）
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await emailInput.focus();
    await page.keyboard.press('Tab'); // 焦点移到密码输入
    await expect(passwordInput).toBeFocused();
    await page.keyboard.press('Tab'); // 焦点移到提交按钮
    await expect(page.getByTestId('{{submit-button}}')).toBeFocused();
    await page.keyboard.press('Enter'); // 通过键盘提交

    // Assert — 键盘提交与鼠标提交结果一致
    await expect(page).toHaveURL('{{/dashboard}}');
  });
});

// ============================================================
// 扩展: 使用 authenticatedPage fixture
// ============================================================

// 取消注释以下代码以使用已登录状态的 fixture:
//
// import { test as base, expect, type Page } from '@playwright/test';
//
// const test = base.extend<{ authenticatedPage: Page }>({
//   authenticatedPage: async ({ page }, use) => {
//     await page.goto(PAGE_PATH);
//     await page.getByTestId('{{email-input}}').fill(TEST_USER.email);
//     await page.getByTestId('{{password-input}}').fill(TEST_USER.password);
//     await page.getByTestId('{{submit-button}}').click();
//     await expect(page).toHaveURL('{{/dashboard}}');
//     await use(page);
//   },
// });
//
// test('已登录用户操作', async ({ authenticatedPage }) => {
//   // 使用已认证的页面进行后续测试
// });
