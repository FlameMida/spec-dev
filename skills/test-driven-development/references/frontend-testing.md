# 前端测试处方（Vitest/MSW/Playwright 为主，原则通用）

> **阅读时机**：要写前端组件测试、网络替身或 E2E 测试步骤时。

- **分层**：组件测试和静态检查在任务内提供反馈；第一条真实业务闭环就绪后写一条目标 E2E。主干用例按风险选择，不用固定数量代替关键状态的覆盖。完整 E2E 套件属于收尾回归，是否运行由用户决定。
- **有界面定稿时**：组件测试的断言取自定稿里可观察的结构、文案和状态，按 role、label 查询，不断言样式类名。视觉是否一致靠任务里的还原自查和收尾时用户选择的对照，不靠堆快照。
- **mock 网络必须 fail-closed**：MSW `server.listen({ onUnhandledRequest: 'error' })`。默认的 'warn' 会把没 mock 的请求发到真实网络，是假绿的来源；`afterEach(() => server.resetHandlers())`。
- **mock 的类型来自契约生成**（如 openapi-typescript）：契约一变，调用点和 mock 在同一次类型检查里一起红。
- **E2E 选择器面向语义**（role、label），不面向样式类名；E2E 只覆盖主干流程，边缘情况走组件层。
- **异步断言前显式等待框架刷新**（如 Vue 的 `flushPromises`），不用固定 sleep。
