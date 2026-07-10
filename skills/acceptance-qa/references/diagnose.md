# 诊断手册（Tier X）

> **阅读时机**：Tier D/A 存在失败项、或用户直接要求诊断时。**仅对失败项执行。**

## 流程：分类 → 工具 → 假设验证 → 报告

### Step 1：失败分类

- **渲染问题**：元素不可见、布局错乱、样式异常
- **前端性能**：加载慢、交互卡顿、资源过大
- **内存问题**：随操作增长不回落、长会话变卡
- **网络问题**：请求失败、超时、CORS、慢接口
- **逻辑问题**：功能不正确、状态管理错误
- **后端性能**：压测不过线、错误率抬升

### Step 2：按类别选工具

| 类别 | 工具与操作 |
|------|-----------|
| 渲染 | playwright MCP：`browser_snapshot` 结构对照 + 截图对比；`browser_console_messages` 查报错；必要时 `browser_evaluate` 读计算样式 |
| 渲染（Shadow DOM/iframe） | 先用 playwright MCP 官方能力：snapshot 可穿透开放 Shadow DOM，`--caps vision` 启用坐标族（`browser_mouse_click_xy`）兜底闭合边界；仍不可达再考虑外部 CDP 工具（见下方信任边界） |
| 前端性能 | chrome-devtools MCP：`performance_start_trace` → `performance_analyze_insight`（LCPBreakdown/DocumentLatency 等）；`emulate` CPU/网络节流复现（区分环境慢/代码慢）——细则见 [performance.md](performance.md) |
| 内存 | chrome-devtools MCP：操作前后 `take_heapsnapshot` × 2 → `compare_heapsnapshots` 看增长类 → `get_heapsnapshot_retainers` 找持有链 |
| 网络 | chrome-devtools MCP：`list_network_requests` 瀑布（慢/失败/串行链）→ `get_network_request` 看单请求明细；对照后端日志 |
| 逻辑 | playwright MCP 交互复现 + 源码分析（复现路径 → 定位到 file:line） |
| 后端性能 | k6 输出按时间轴分层（错误率何时抬升、p95 拐点对应 VU 数）+ 服务端日志/慢查询/资源指标对照 |

同一浏览器实例不要同时被 playwright MCP 与 chrome-devtools MCP 驱动——诊断切换工具时结束前一会话。

### Step 3：根因假设验证（铁律 3）

**根因必须经假设验证后才能写入报告**：按"若根因成立，做 X 应观察到 Y"做一次可观察的预测并实际验证——读源码确认对应行确实缺失该逻辑、或复现一次确认现象与根因吻合。验证不一致 → 回到 Step 1 重新分类。未经验证的推理会让用户按错误方向修复并掩盖真因。

### Step 4：诊断报告

```
### 问题 N: <一句话现象>

**根因**: <经验证的根因>
**诊断工具**: <所用工具链>
**定位**: src/components/LoginForm.tsx:42 — handleSubmit 缺少 isSubmitting 状态
**验证**: 预测"点击提交后按钮无 disabled 属性变化"——snapshot 复核一致；源码确认 42 行无绑定
**修复建议**: <具体步骤，按影响排序>
**优先级**: P1/P2/P3 + 一句话影响
```

## 外部 CDP 工具的信任边界

穿透闭合 Shadow DOM/跨域 iframe/Electron 内嵌页的极端场景，官方 MCP 能力不够时可引入第三方 CDP 工具（如 browser-use/browser-harness）。**引入前必须向用户说明并获得同意**——克隆并执行第三方仓库代码是外部代码进入本机的信任边界；同时先检查该仓库是否仍在维护（已归档或长期无更新时提示风险）。使用方式：Chrome 以 `--remote-debugging-port=9222` 启动，工具经 CDP WebSocket 连接，坐标级 `Input.dispatchMouseEvent` 穿透 DOM 边界。
