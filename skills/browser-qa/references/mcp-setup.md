# MCP Server 配置指南

浏览器三层测试工作流所需的 MCP Server 配置参考。

---

## 1. Playwright MCP（Layer 2 必需）

Microsoft 官方 MCP Server，AI Agent 通过它自主控制浏览器。

### Claude Code 配置

在项目级 `.mcp.json` 或用户级 `~/.claude.json` 中添加（注意：不是 `settings.json`，`mcpServers` 写进 settings 文件不会生效）；也可以直接运行 `claude mcp add playwright -- npx @playwright/mcp@latest`：

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

### 带浏览器选项的配置

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser", "chrome"
      ]
    }
  }
}
```

可选浏览器: `chrome`（默认）、`firefox`、`webkit`。

### 可用工具

> 工具名以实际连接的 MCP server 输出为准，版本升级可能更名；发现不一致时以 `/mcp` 面板或会话内工具列表为准。

| 工具 | 用途 |
|------|------|
| `browser_navigate` | 导航到 URL |
| `browser_snapshot` | 获取可访问性树快照 |
| `browser_click` | 点击元素 |
| `browser_type` | 输入文本 |
| `browser_fill_form` | 批量填写表单（多字段一次完成，优于逐个 fill） |
| `browser_select_option` | 选择下拉选项 |
| `browser_wait_for` | 等待文本出现/消失或定时等待 |
| `browser_take_screenshot` | 截图 |
| `browser_close` | 关闭浏览器 |

### 验证

```bash
npx @playwright/mcp@latest --help
```

---

## 2. Chrome DevTools MCP（Layer 3 推荐）

Google 官方 MCP Server，用于调试和性能分析。

### 配置

配置位置同 Playwright MCP（项目级 `.mcp.json` 或用户级 `~/.claude.json`）：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

### 可用工具

> 工具名以实际连接的 MCP server 输出为准，版本升级可能更名；发现不一致时以 `/mcp` 面板或会话内工具列表为准。

| 工具 | 用途 |
|------|------|
| `performance_start_trace` | 开始录制性能 trace |
| `performance_stop_trace` | 停止录制并分析 |
| `navigate_page` | 导航到 URL |
| `take_screenshot` | 截图 |
| `list_console_messages` | 获取控制台日志 |

### 注意

- 仍处于 Public Preview 阶段，可能存在超时 Bug
- 聚焦调试/性能分析，不适合通用自动化
- 需要本地 Chrome 浏览器

### 验证

```bash
npx chrome-devtools-mcp@latest --help
```

---

## 3. Browser Harness（Layer 3 可选）

轻量级 CDP 工具，用于穿透 Shadow DOM/iframe。

### 安装

**安装前必须向用户说明并获得同意**——以下步骤会把第三方仓库（browser-use/browser-harness）的代码引入本机，这是外部代码进入本机的信任边界。同时先检查该仓库是否仍然存在与维护（已归档或长期无更新时向用户提示风险）。

```bash
# 克隆到本地
git clone https://github.com/browser-use/browser-harness.git ~/browser-harness

# 添加到 PATH（可选）
export PATH="$HOME/browser-harness:$PATH"
```

### Claude Code 集成

在项目的 `CLAUDE.md` 中添加：

```markdown
## Browser Harness

Browser Harness 安装路径: ~/browser-harness/bh
使用方式: 通过 CLI 调用，不是 MCP Server
```

### 使用前提

1. Chrome 需以远程调试模式启动：
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-debug
   ```
2. Browser Harness 会通过 WebSocket 连接到该 Chrome 实例

### 适用场景

- 页面包含 Shadow DOM 且 Playwright 无法触及内部元素
- 跨域 iframe 内容需要交互
- Electron 应用内嵌网页测试

---

## 配置验证清单

完成配置后，逐项检查：

- [ ] `npx @playwright/mcp@latest --help` 正常输出（Layer 2）
- [ ] `npx chrome-devtools-mcp@latest --help` 正常输出（Layer 3）
- [ ] `.mcp.json` / `~/.claude.json` 中 `mcpServers` 配置正确
- [ ] 重启 Claude Code / Claude Desktop 后 MCP Server 自动连接
- [ ] 在 Claude 中测试: "打开浏览器导航到 example.com"

## 常见问题

### Q: MCP Server 连接失败

检查 Node.js 版本（需要 >= 18），运行 `npx @playwright/mcp@latest` 看错误信息。

### Q: 浏览器未启动

Playwright MCP 会自动启动浏览器。若失败，手动安装浏览器：
```bash
npx playwright install chromium
```

### Q: Layer 2 中浏览器卡住

可能是页面加载超时。在配置中添加 `--timeout` 参数：
```json
{
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--timeout", "60000"]
}
```
