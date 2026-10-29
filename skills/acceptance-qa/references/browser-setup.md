# 浏览器接入：ego-lite 与官方 ego-browser

页面预览、实际验收、视觉走查和浏览器诊断统一使用 **ego-lite 浏览器及其官方 `ego-browser` skill**。本插件只定义验收目标和证据纪律，不复制或维护官方 skill，也不安装、注册或依赖 Chrome DevTools MCP / Playwright MCP。

## 操作入口

1. 读取当前宿主可用的官方 `ego-browser` skill。
2. 执行 `ego-browser skill`，完整读取与已安装 ego-lite 版本匹配的指南。输出必须包含 `[ego-browser:skill] end of guide`；若截断，保存到临时文件分段读取。升级后或运行时要求重读时重新执行。
3. 按指南使用 `ego-browser nodejs`。同一用户目标只创建一个 TaskSpace，后续按已返回的 ID 恢复；串行操作，保留用户已有页面。用户接管时停止并沿官方交接规则处理。
4. 从真实页面快照取得目标，再按需要操作、等待可观察结果并取证。截图用于视觉核对，实际断言用于可确定判断；动作回执不等于业务成功。
5. 成功结束时沿官方 TaskSpace 完成规则处理；需要留给用户查看的原型/结果页才保留。故障或等待用户接管不冒充成功结束。

具体 API、参数、平台命令语法和会话生命周期只以当前官方指南为准。ego-browser 不是 Playwright，不能猜用 `locator()`、`expect()` 或旧 MCP 工具。已有 Page API 不足时，按指南核对 `page.evaluate()` / `page.cdp()` 的适用能力；能力不足的项如实标记 `unverified`。

## 安装、连接失败与能力缺失

- 官方入口：[ego-lite](https://lite.ego.app/) 与[快速开始](https://lite.ego.app/document/en/docs/quick-start)。安装官方 `ego-browser` skill 后，按其 `references/install.md` 处理 CLI 缺失、旧版本和首次 onboarding；不把安装 spec-dev 当成浏览器已就绪。
- 已可用时先执行真实浏览器操作；失败后再按官方指南诊断，不先升级、重装或改全局配置。
- 缺 skill、CLI、连接、账号或所需浏览器能力：记录真实错误和受阻项；能独立执行的既有确定性测试继续，受阻页面项保持 `unverified`。不回退安装旧浏览器 MCP。
- ego-lite 的 Chromium 结果不能证明 Safari/WebKit、Firefox 或原生移动/桌面应用行为；目标不匹配时沿项目已有对应测试/设备工具取证，否则声明未验证。

## 项目测试与专项工具的边界

- 项目已有 Playwright Test/CLI、截图基线、axe、Lighthouse CI、k6 等入口继续按选中维度使用。它们是独立的测试/测量工具，不是 ego-lite 的驱动方式，也不是普通页面操作的安装前置。
- 性能、堆内存、网络事件只按当前指南实际暴露能力取证；不能假定能直接获得完整 trace、堆比较或所有 Web Vitals，详见 [performance.md](performance.md) 和 [diagnose.md](diagnose.md)。
- 原生移动端可沿项目已有 mobile-mcp/设备工具；只在对应目标需要时接入，不属于浏览器依赖。缺设备时保持 `unverified`。
