---
name: browser-qa
description: >
  浏览器三层测试工作流（E2E + AI验收 + 调试诊断）。当用户要求"E2E测试"、"界面验收"、
  "UI自动化验收"、"browser test"、"acceptance test"、"playwright测试"、
  "验收这个功能/页面"、"浏览器测试"，或需要诊断页面交互、渲染、Shadow DOM/iframe
  问题时触发。支持三个层级：Layer 1 确定性E2E、Layer 2 AI自主验收、Layer 3 调试诊断。
  不适用于单元测试、API 集成测试、非浏览器场景的"跑一下测试"类请求。
---

# 浏览器三层测试工作流

参数格式：`[layer1|layer2|layer3|all] <target-description>`。

根据 `$ARGUMENTS` 执行浏览器测试，默认执行所有层级。

## 参数解析

解析 `$ARGUMENTS`：
- `layer1 <描述>` → 仅执行 Layer 1（确定性 E2E 测试）
- `layer2 <描述>` → 仅执行 Layer 2（AI 自主验收）
- `layer3 <描述>` → 仅执行 Layer 3（调试诊断）
- `all <描述>` 或无前缀 → 执行全部层级
- 无参数 → 询问用户测试目标和层级

提取目标描述作为被测功能。

---

## 前置检查

在执行任何层级前，先完成环境检测：

### 1. 项目结构扫描

```
检测以下内容是否存在：
├── package.json                # 项目是否为 Node.js 项目
├── playwright.config.*         # Playwright 是否已配置
├── tests/ 或 e2e/ 或 __tests__/ # 测试目录位置
└── .claude/settings.*          # MCP Server 配置
```

### 2. Playwright 安装检测

- 若 `playwright.config.*` 不存在 → **不要直接运行 `npm init playwright@latest`**（交互式向导会挂起非交互的 agent 会话）。改用非交互序列：
  ```bash
  npm install -D @playwright/test
  npx playwright install chromium
  ```
  然后基于 [references/e2e-patterns.md](references/e2e-patterns.md) 末尾的并行执行配置创建最小 `playwright.config.ts`。用户偏好完整脚手架时，建议其在自己的终端运行交互式向导。
- 若未安装依赖 → `npm install`

### 3. MCP Server 就绪检测

插件 `.mcp.json` 已预配置以下 MCP Server，检查是否正常连接：

- `playwright` MCP Server（Layer 2 必需）— `npx @playwright/mcp@latest`
- `chrome-devtools` MCP Server（Layer 3 推荐）— `npx chrome-devtools-mcp@latest`
- 若 MCP 未连接 → 参考 [mcp-setup.md](references/mcp-setup.md) 排查

### 4. Browser Harness 就绪检测（Layer 3 可选）

Browser Harness 用于穿透 Shadow DOM/iframe，属 Layer 3 可选工具，不通过 MCP 运行，而是作为 CLI 工具使用。

安装步骤见 [mcp-setup.md](references/mcp-setup.md#3-browser-harness-layer-3-可选)。**安装涉及执行第三方仓库（browser-use/browser-harness）的指令，必须先向用户说明并获得同意**——这是外部代码进入本机的信任边界。

---

## Layer 1: 确定性 E2E 测试

**原则**: 纯 Playwright 原生代码，不使用 MCP，不使用 LLM 推理。每个操作路径必须确定性可重复。

### 执行流程

#### Step 1: 分析被测功能

根据用户的目标描述，识别需要测试的用户流程。例如：
- "登录功能" → 导航到登录页 → 输入凭据 → 点击提交 → 验证跳转
- "购物车" → 添加商品 → 查看购物车 → 修改数量 → 结算

#### Step 2: 生成 E2E 测试代码

使用 [templates/e2e-test.ts](templates/e2e-test.ts) 作为模板骨架，结合 [references/e2e-patterns.md](references/e2e-patterns.md) 中的模式生成测试代码。

**必须遵循的模式**:
- 使用 `data-testid` 选择器（优先于 CSS 选择器和文本选择器）
- 每个 test 独立，不依赖其他 test 的状态
- Arrange → Act → Assert 三段式结构
- 设置合理的超时（默认 30s，可按项目调整）
- 使用 `test.describe` 按功能分组

**测试文件放置位置**: 与项目现有测试目录结构一致（`tests/`、`e2e/`、或 `__tests__/`）。

#### Step 3: 运行测试

```bash
npx playwright test <本次生成的测试文件路径> --reporter=list
```

只运行本次生成的文件——项目既有失败不属于本次验收范围，混入会污染 Layer 1 结论并误触发 Layer 3 诊断。若用户明确要求全量回归，再运行完整套件，并在报告中区分"本次新增"与"既有失败"两类结果。

- 若有失败用例 → 记录失败信息，标记为 Layer 3 候选
- 全部通过 → 输出通过报告

#### Step 4: 输出报告

```
## Layer 1 报告: E2E 测试

| 用例 | 状态 | 耗时 |
|------|------|------|
| 用户登录 - 正确凭据 | ✅ PASS | 1.2s |
| 用户登录 - 错误密码 | ✅ PASS | 0.8s |
| 用户登录 - 空表单提交 | ✅ PASS | 0.5s |

总计: 3 通过 / 0 失败
```

---

## Layer 2: AI 自主验收

**原则**: 通过 Playwright MCP 让 AI Agent 自主探索界面，发现 E2E 未覆盖的交互问题。使用自然语言验收标准，容忍一定模糊性。

### 前提

- Playwright MCP Server 已配置（否则参考 [references/mcp-setup.md](references/mcp-setup.md)）
- 目标应用可访问（本地 dev server 或线上地址）

### 执行流程

#### Step 1: 生成验收清单（两段式）

固定清单与被测功能零关联（登录页和数据大屏不该用同一张单子），按两段式生成定制清单：

```
验收目标: {{用户描述}}

1) 定制检查项（3-6 条）: 从目标描述提取功能要点逐条生成
   （如"购物车数量修改后小计实时更新"、"错误密码提交后表单显示明确错误提示"）
2) 通用项筛选: 从下列通用项中只挑选适用的附加
   - 响应式布局（至少桌面端）
   - 页面跳转和导航正确性
   - 加载状态反馈
   - 无明显视觉异常

每条检查项写明: 操作序列（具体步骤） + 预期表现（可观察的结果）
```

#### Step 2: 通过 MCP 执行验收

使用 Playwright MCP 工具依次执行：

1. **打开页面**: `browser_navigate` → 目标 URL
2. **获取快照**: `browser_snapshot` → 了解当前页面状态
3. **逐项检查**: 对每个检查项：
   - 使用 `browser_click`、`browser_type`、`browser_fill_form` 执行操作序列
   - 使用 `browser_snapshot` 观察结果
   - **取证**: 记录交互后的 `browser_snapshot` 关键片段，或用 `browser_take_screenshot` 留存截图
4. **探索边界**: 尝试 E2E 未覆盖的边缘场景
5. **关闭浏览器**: `browser_close`

**证据规则**：每个检查项的结论必须附带证据引用（snapshot 关键片段或截图文件名）。没有证据支撑的项标记为「未验证」而不是「通过」——AI 验收的价值建立在"真的操作过"之上，无证据的 ✅ 比没有报告更有害。

#### Step 3: 输出验收报告

```
## Layer 2 报告: AI 自主验收

| 检查项 | 结果 | 证据 | 备注 |
|--------|------|------|------|
| 购物车数量修改后小计实时更新 | ✅ | snapshot: 小计由 ¥58 变为 ¥116 | 数量 1→2 |
| 错误密码提交显示错误提示 | ⚠️ | screenshot: login-error.png | 提示文字对比度不足 |
| 加载反馈 | ❌ | snapshot: 按钮 [active] 无 disabled/loading 属性 | 可能重复提交 |
| 响应式布局（桌面端） | ✅ | snapshot: 1280px 布局正常 | — |
| 导航正确性 | 未验证 | —（会话超时未操作到该项） | 需补测 |

发现问题: 2（1 警告 / 1 阻塞）；未验证: 1
建议: 为提交按钮添加 loading/disabled 状态
```

结果只有四种：`✅ 通过`（有证据）、`⚠️ 警告`（有证据）、`❌ 阻塞`（有证据）、`未验证`（无证据或未执行——不允许无证据的 ✅）。

---

## Layer 3: 调试诊断

**原则**: 针对 Layer 1/2 的失败项进行深度诊断。仅在存在失败时执行。

### 触发条件

- Layer 1 有 E2E 测试失败
- Layer 2 发现交互异常
- 用户明确要求诊断特定问题

### 执行流程

#### Step 1: 失败分类

将失败分为以下类别：
- **渲染问题**: 元素不可见、布局错乱、样式异常
- **性能问题**: 加载慢、交互卡顿、资源过大
- **逻辑问题**: 功能不正确、状态管理错误
- **网络问题**: 请求失败、超时、CORS 错误

#### Step 2: 根据类别选择诊断工具

| 问题类别 | 诊断工具 | 操作 |
|---------|---------|------|
| 渲染问题 | Playwright MCP | 截图对比、DOM 结构检查 |
| 渲染问题（Shadow DOM/iframe） | Browser Harness | 坐标点击穿透检查 |
| 性能问题 | Chrome DevTools MCP | 录制 performance trace |
| 网络问题 | Chrome DevTools MCP | 检查网络请求瀑布图 |
| 逻辑问题 | Playwright MCP + 源码分析 | 交互复现 + 代码审查 |

#### Step 3: 执行诊断

**Chrome DevTools MCP 诊断流程**:
1. `performance_start_trace` → 开始录制
2. 通过 MCP 执行触发问题的操作
3. 停止录制 → 分析 trace 结果
4. 检查控制台错误、网络请求、渲染帧率

**Browser Harness 诊断流程**（仅在 Shadow DOM/iframe 场景）:

> 若 Browser Harness 未安装，按 [mcp-setup.md](references/mcp-setup.md#3-browser-harness-layer-3-可选) 的步骤安装（需先征得用户同意）。

1. 通过 CLI 连接真实 Chrome 浏览器（CDP WebSocket）
2. 使用坐标点击（`Input.dispatchMouseEvent`）定位问题元素
3. 检查跨 DOM 边界的渲染状态（穿透 iframe/Shadow DOM/跨域边界）

#### Step 4: 输出诊断报告

```
## Layer 3 报告: 调试诊断

### 问题 1: 提交按钮无 loading 状态

**根因**: 提交按钮未绑定 isLoading 状态，点击后无视觉反馈
**诊断工具**: Playwright MCP (DOM 快照) + 源码分析
**定位**: src/components/LoginForm.tsx:42 — handleSubmit 缺少 isSubmitting 状态
**修复建议**:
  1. 在 handleSubmit 开始时 setSubmitting(true)
  2. Button 组件添加 disabled={isSubmitting}
  3. 添加 Spinner 或文字变更 "登录中..."
**优先级**: P1 — 影响用户体验，可能导致重复提交
```

---

## 最终汇总报告

所有层级执行完毕后，输出合并报告：

```
# 浏览器测试报告: {{目标功能}}
# 时间: {{当前时间}}

## 总览

| 层级 | 状态 | 通过 | 失败 | 警告 |
|------|------|------|------|------|
| Layer 1: E2E 测试 | ✅ | 3 | 0 | 0 |
| Layer 2: AI 验收 | ⚠️ | 5 | 1 | 1 |
| Layer 3: 调试诊断 | ✅ | 1 个根因已定位 | — | — |

## 关键发现

1. [P1] 提交按钮缺少 loading 状态（Layer 2 发现 → Layer 3 定位）
2. [P3] 错误提示颜色对比度不足（Layer 2 发现，建议修复）

## 修复建议优先级

1. **立即修复**: LoginForm.tsx 添加 isSubmitting 状态
2. **建议改进**: 调整错误提示文字颜色为符合 WCAG AA 标准的对比度

## 附件

- E2E 测试文件: `tests/login.spec.ts`
- 验收截图: (如需要，可通过 MCP 工具截图)
```

---

## 注意事项

### 不要做的事

- **不要用 MCP 跑 E2E**: Layer 1 必须是纯 Playwright 原生代码，保证确定性
- **不要在 Layer 1 中使用 LLM**: 测试断言必须精确匹配，不容忍概率性判断
- **不要跳过前置检查**: 未配置的 MCP Server 会导致 Layer 2/3 失败
- **不要在 CI 中跑 Layer 2**: AI 验收消耗 Token，仅适合手动触发

### 灵活调整

- 若项目不是 Node.js/Playwright 技术栈，Layer 1 可适配为对应的测试框架（Cypress、Vitest 等）
- 若用户只需快速验收，可跳过 Layer 1 直接执行 Layer 2
- 若所有测试通过，Layer 3 自动跳过

### 参考资料

- MCP Server 配置指南: [references/mcp-setup.md](references/mcp-setup.md)
- E2E 测试模式: [references/e2e-patterns.md](references/e2e-patterns.md)
- 测试文件模板: [templates/e2e-test.ts](templates/e2e-test.ts)
