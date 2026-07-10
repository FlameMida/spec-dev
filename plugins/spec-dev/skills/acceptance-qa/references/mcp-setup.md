# MCP 配置指南

验收工作流所需的 MCP Server 配置参考。插件 `.mcp.json` 已预配置 `playwright` 与 `chrome-devtools`；本文件同时给出按需接入与不推荐清单。

> 工具名以实际连接的 MCP server 输出为准，版本升级可能更名；发现不一致时以 `/mcp` 面板或会话内工具列表为准。

---

## 1. Playwright MCP（Tier A 必需）

Microsoft 官方 MCP Server，AI Agent 通过它驱动浏览器。

### 配置

项目级 `.mcp.json` 或用户级 `~/.claude.json`（注意：不是 `settings.json`）；也可 `claude mcp add playwright -- npx @playwright/mcp@latest`。Codex 环境则写入 `~/.codex/config.toml` 的 `[mcp_servers]` 表或用 `codex mcp add`（Codex 不读取项目级 `.mcp.json`；随本插件安装时经插件清单自动生效，无需手工配置）：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### 验收相关关键参数（完整清单见官方 README）

| 参数 | 用途 |
|------|------|
| `--browser <chrome\|firefox\|webkit\|msedge>` | 指定浏览器 |
| `--secrets <path>` | dotenv 格式凭据文件——测试账号不进对话上下文 |
| `--output-dir <path>` | 截图/快照/trace 集中落盘（指向验收证据目录） |
| `--isolated` / `--storage-state <path>` | 内存 profile / 预置登录态 |
| `--test-id-attribute <attr>` | 项目自定义 testid 属性名 |
| `--timeout-action / --timeout-navigation` | 动作默认 5000ms / 导航默认 60000ms，慢应用调大 |
| `--viewport-size "1280x720"` / `--device "iPhone 15"` | 视口与设备模拟 |
| `--caps vision,pdf,devtools` | 追加能力：vision 启用坐标族（Shadow DOM 兜底）等 |
| `--cdp-endpoint <ws://...>` | 连接已运行的浏览器/Electron 调试端口 |
| `--headless` | 无头模式（默认有头） |

### 工具族速览

- **操作**：`browser_navigate` / `browser_click` / `browser_type` / `browser_fill_form`（多字段一次完成，优于逐个 fill）/ `browser_select_option` / `browser_press_key` / `browser_drag` / `browser_hover` / `browser_wait_for` / `browser_handle_dialog` / `browser_file_upload` / `browser_tabs`
- **断言（优先使用）**：`browser_verify_element_visible` / `browser_verify_text_visible` / `browser_verify_list_visible` / `browser_verify_value`
- **取证**：`browser_snapshot`（可访问性树）/ `browser_take_screenshot` / `browser_start_tracing`+`browser_stop_tracing` / `browser_start_video`+`browser_video_chapter` / `browser_console_messages` / `browser_network_requests`
- **网络与状态**：`browser_route`（mock）/ `browser_network_state_set` / cookies、localStorage、sessionStorage 全族 / `browser_set_storage_state`
- **辅助**：`browser_generate_locator`（给 Tier D 用例产选择器）/ `browser_evaluate` / `browser_resize`

### 验证

```bash
npx @playwright/mcp@latest --help
```

---

## 2. Chrome DevTools MCP（perf-web 与诊断推荐）

Google 官方 MCP Server（`chrome-devtools-mcp`），性能分析与深度调试。仅官方支持 Chrome / Chrome for Testing。

### 配置

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

### 工具族速览

- **性能**：`performance_start_trace`（CWV lab 值：LCP/INP/CLS；参数 reload/autoStop/filePath）/ `performance_stop_trace` / `performance_analyze_insight`（LCPBreakdown、DocumentLatency 等）
- **模拟**：`emulate`（cpuThrottlingRate、networkConditions "Slow 3G"~"Fast 4G"、viewport、colorScheme dark/light、geolocation）/ `resize_page`
- **网络**：`list_network_requests` / `get_network_request`
- **调试**：`evaluate_script` / `list_console_messages`（source-mapped）/ `take_screenshot` / `take_snapshot` / `screencast_start`+`screencast_stop`
- **内存**：`take_heapsnapshot` / `compare_heapsnapshots` / `get_heapsnapshot_retainers` 等堆分析全族
- **审计**：`lighthouse_audit`（accessibility/SEO/best-practices 评分与报告，**不含性能**——性能走 trace）

### 注意

- 性能工具默认会向 Google CrUX API 发送 trace URL 获取真实用户数据对照，`--no-performance-crux` 关闭；使用统计默认开启，`--no-usage-statistics` 或 `CI` 环境变量关闭
- 与 playwright MCP 不要同时驱动同一浏览器实例；诊断切换工具时先结束前一会话

### 验证

```bash
npx chrome-devtools-mcp@latest --help
```

---

## 3. mobile-mcp（移动端验收，按需接入）

社区活跃项目 `@mobilenext/mobile-mcp`：平台无关的 iOS/Android/模拟器/真机自动化，基于结构化 accessibility snapshot（与 playwright MCP 的 snapshot 思路同构）。**仅在验收目标是移动应用时接入**：

```json
{
  "mcpServers": {
    "mobile": {
      "command": "npx",
      "args": ["-y", "@mobilenext/mobile-mcp@latest"]
    }
  }
}
```

前提：本机有 Xcode 模拟器 / Android 模拟器或已连真机。Tier A 编排纪律（串行、证据强制、四态）同构适用。

---

## 4. 不推荐清单（截至 2026-07 的判断，引入前重新核查）

| 候选 | 结论 | 理由 |
|------|------|------|
| k6 MCP server（社区 QAInsights/k6-mcp-server） | 不推荐 | 长期无维护；k6 CLI 本身就是确定性工具（thresholds→退出码），包一层 MCP 无收益反增依赖 |
| 独立 Lighthouse MCP | 不推荐 | chrome-devtools MCP 的 trace + lighthouse_audit 已覆盖；再引入是重复 |
| 第三方 CDP 穿透工具（如 browser-harness） | 极端场景可选 | 信任边界与使用前提见 [diagnose.md](diagnose.md)，引入前必须征得用户同意 |

---

## 配置验证清单

- [ ] `npx @playwright/mcp@latest --help` 正常输出（Tier A）
- [ ] `npx chrome-devtools-mcp@latest --help` 正常输出（perf-web/诊断）
- [ ] `.mcp.json` / `~/.claude.json` 中 `mcpServers` 配置正确
- [ ] 重启 Claude Code 后 MCP 自动连接，`/mcp` 面板可见工具
- [ ] 会话内测试："打开浏览器导航到 example.com"

## 常见问题

- **MCP 连接失败**：检查 Node.js >= 18；直接运行 `npx @playwright/mcp@latest` 看错误
- **浏览器未安装**：`npx playwright install chromium`
- **Tier A 中页面卡住**：加大 `--timeout-navigation`；确认 dev server 存活
- **Electron**：应用以 `--remote-debugging-port` 启动后用 `--cdp-endpoint` 连接
