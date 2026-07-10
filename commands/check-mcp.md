---
description: Check MCP configuration status - details and fallback plans for all 4 MCPs / 检查 MCP 配置状态，显示全部 4 个 MCP 的详细信息和降级方案
---

# MCP 配置检查

正在检查您的 MCP 配置状态...

## 重要说明

**本插件的所有功能在没有 MCP 的情况下也能正常工作！**

插件使用智能降级策略，当 MCP 不可用时自动切换到备用方案。

## 任务说明

请执行以下操作来检查 MCP 配置：

### 1. 读取配置文件（三个来源，任一来源配置即视为已配置）

- 用户全局配置：`~/.claude.json`（Windows: `%USERPROFILE%\.claude.json`）（如果存在）
- 项目级配置：当前项目根的 `.mcp.json`（如果存在）
- 插件自带配置：本插件根目录的 `.mcp.json`（`${CLAUDE_PLUGIN_ROOT}/.mcp.json`）——插件安装后其中的 MCP 经插件清单生效，**用户没有全局配置不代表 MCP 不可用**

### 2. 检查以下 MCP 服务器（共 4 个）

| MCP 服务器 | 功能 | 主要消费方 | 降级方案 |
|-----------|------|-----------|---------|
| `context7` | 最新库文档和 API 参考 | 探索/设计/审查各环节 | WebSearch + 项目依赖分析 |
| `sequential-thinking` | 深度结构化思考 | requirement-analysis 对抗验证 | 回复中显式分点推演 |
| `playwright` | 浏览器自动化验收（verify 断言、trace/video 取证） | acceptance-qa Tier A | 原生 Playwright 测试 |
| `chrome-devtools` | 性能追踪（CWV/insight）、堆快照、调试诊断 | acceptance-qa 性能与诊断 | Playwright trace / 控制台日志 |

### 3. 生成配置状态报告

请以清晰的格式展示：

#### 配置状态表格

| MCP 服务器 | 配置来源（全局/项目/插件） | 状态 | 使用方案 |
|-----------|------------------------|------|---------|
| context7 | ✅/❌ + 来源 | 正常/降级/需API Key | 最新文档/WebSearch |
| sequential-thinking | ✅/❌ + 来源 | 正常/降级 | 结构化思考/分点推演 |
| playwright | ✅/❌ + 来源 | 正常/降级 | MCP 驱动验收/原生测试 |
| chrome-devtools | ✅/❌ + 来源 | 正常/降级 | 性能 trace/替代取证 |

#### 环境变量检查

检查必需的环境变量：
- `CONTEXT7_API_KEY` - context7 所需

对于每个环境变量：
- ✅ 已配置
- ❌ 未配置（如果 MCP 需要但未设置，将使用降级方案）
- ➖ 不适用（如果该 MCP 未在使用中）

### 4. 提供配置建议

根据检查结果提供个性化建议：

**如果所有 MCP 都已正确配置**：
```
✅ 所有 MCP 配置正常！您将获得最佳开发体验。
```

**如果有 MCP 未配置**：
```
ℹ️  以下 MCP 未配置，将使用降级方案：
  • context7 → WebSearch + 项目依赖分析
  • playwright → 原生 Playwright 测试（acceptance-qa Tier A 将降级）

✅ 所有功能仍可正常工作！

💡 如需最佳体验，建议在全局配置中安装 MCP：
  参见 README 的"推荐配置"章节
```

**如果缺少 API Key**：
```
⚠️  以下环境变量未配置，相关 MCP 将使用降级方案：
  • CONTEXT7_API_KEY → 将使用 WebSearch

✅ 功能完全可用，只是搜索质量可能略低。

设置方式：
# macOS/Linux: 在 ~/.zshrc 或 ~/.bashrc 中添加
# Windows: 在系统环境变量中添加
export CONTEXT7_API_KEY="your-api-key"

获取 API Key:
  • Context7: https://context7.com/
```

### 5. 总结

显示整体状态：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  spec-dev - MCP 配置总结
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

配置状态: [已配置 X/4 个 MCP]
功能状态: ✅ 完全可用（[使用降级方案 Y 项]）

💡 提示：
- MCP 是可选的，所有功能都有降级方案
- 安装 MCP 可获得更快、更精准的体验（playwright/chrome-devtools 直接影响 acceptance-qa 的验收上限）
- 运行此命令随时检查配置状态
```

## 注意事项

- 如果无法读取 ~/.claude.json（权限问题或文件不存在），不代表 MCP 未配置——继续检查项目级与插件自带 `.mcp.json`
- 使用清晰的图标和格式，便于快速理解
- 保持输出简洁，强调**所有功能都可用**
- 提供可操作的建议，而不是抽象的说明
- **不要**让用户觉得缺少 MCP 是问题，而应强调降级方案的完整性
