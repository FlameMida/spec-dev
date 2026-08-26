# 前端测试处方（Vitest/MSW/Playwright 为主，原则通用）

> **阅读时机**：spec 验收矩阵含前端 unit/e2e 行、或计划任务要写前端测试步骤时加载。

- 分层：tsc/静态 → 组件测试 + mock 网络（fast）→ 主干 E2E 3-5 条（PR）→ 全 E2E（nightly）。
- **mock 网络必须 fail-closed**：MSW `server.listen({ onUnhandledRequest: 'error' })`——默认 'warn' 会把未 mock 的请求发到真实网络（假绿之源）；`afterEach(() => server.resetHandlers())`。
- mock 的类型来自契约生成（如 openapi-typescript）：契约变 → 调用点与 mock 同次类型检查一起红。
- E2E 选择器面向语义（role/label），不面向样式类名；E2E 只覆盖主干流程，边缘走组件层。
- 异步断言前显式等待框架刷新（如 Vue `flushPromises`），不用固定 sleep。
