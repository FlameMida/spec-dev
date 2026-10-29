---
name: visual-preview
description: >-
  浏览器可交互 HTML 原型与定稿交接。新增页面、重设计、主要布局或核心交互变化时自动启用，联动 clarifying 逐题确认界面；局部小改动可跳过，用户关闭时沿用选择。也用于探索中的真实界面比较或用户请求的图示；普通文字澄清仍在对话中完成。
---

> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

> **外部搜索统一入口**：需要联网检索（资料、库/框架文档、时效信息）时一律先用 anysearch skill（插件内嵌），不可用再降级 WebSearch/WebFetch；降级链与派发词要求见 requirement-analysis 的 references/exploration-patterns.md。

# 可视化预览（Visual Preview）

基于浏览器的视觉工具：在设计对话中向用户展示 mockup、图示与可点击的选项，选择结果回流到会话。这是一件**工具**而不是一种模式——启用后也只有真正视觉的问题才走浏览器。

## 自动入口与共享契约

首次判断入口或交接时读取 [界面原型与交接契约](references/ui-prototype-contract.md)。新增页面、重新设计、主要布局/导航/信息层级/核心交互变化，在通用澄清已有必要信息时自动启动并展示第一版，无须再问是否启用。局部小改动可跳过原型，修后实际查看/操作验证仍执行；用户明确关闭时消费已有选择；已有适用定稿直接复用。

exploring 先澄清探索目的，实际需要界面比较时再展示；纯概念问题留在对话。预览联动 [界面澄清](../clarifying/references/ui-clarification.md)，一次解决一个实质决策，控制权留在调用方。自动启用不代表设计已获批准。

## 逐题判断：浏览器还是终端

预览启用后，仍要**对每个问题单独判断**。判据：**用户看到它会比读到它理解得更好吗？**

- **用浏览器**：内容本身是视觉的——mockup、线框图、布局对比、架构图、并排视觉方案、观感/间距/视觉层级问题
- **用终端**：内容是文字的——需求问题、概念选择、取舍清单、A/B/C 文字选项、范围决策

涉及 UI 的话题 ≠ 视觉问题。"这个向导的『个性化』指什么？"是概念问题——用终端；"哪种向导布局更好？"是视觉问题——用浏览器。

## 启动会话

代理查看、操作和验证原型时，先读取官方 `ego-browser` skill，执行 `ego-browser skill` 并完整读取当前版本指南，通过 ego-lite 打开下方服务器返回的 URL；同一目标复用一个 TaskSpace。接入与缺失处理见 [浏览器接入](../acceptance-qa/references/browser-setup.md)。用户打开预览链接不等于代理已完成页面验证；缺少浏览器能力时明确说明未验证。

```bash
# 命中自动入口或已有明确预览请求后启动；将返回 URL 交给 ego-lite。--project-dir 支持持久化和同端口重启。
# 可选 --theme-css <file>：注入项目的 design tokens/CSS 变量，让 mockup 用项目自己的配色。
# ${CLAUDE_SKILL_DIR} 由平台替换为本 skill 目录；未替换时取 skill base directory。
bash "${CLAUDE_SKILL_DIR}/scripts/start-server.sh" --project-dir /path/to/project
```

当前处于特性上下文（本次会话正在做某特性的需求设计/计划）时**必须**额外传 `--feature-dir .spec-dev/<当日特性目录>`——产物落 `<feature-dir>/visual/<session-id>/`（端口/密钥记忆文件仍固定在 `.spec-dev/visual/` 根，跨特性共享端口）；无特性上下文时不传，回退 `<project>/.spec-dev/visual/`。

返回 JSON 含 `port`、`url`、`screen_dir`、`state_dir`——保存后两者。会话文件落在 `<feature-dir>/visual/`（特性上下文）或 `<project>/.spec-dev/visual/`（回退）；两个 visual 根（`.spec-dev/visual/` 与 `<feature-dir>/visual/`）的 `.gitignore`（内容 `*`）由脚本自建，无需修改仓库 `.gitignore`。**不要忽略整个 `.spec-dev/`**——spec/plan/roadmap 等产物需要提交入库，漂移守卫也依赖已提交的 spec。

**URL 含会话密钥（`?key=…`）**：始终把 `url` 字段的**完整 URL** 给用户，不得裁掉 query string——密钥同时守卫 HTTP 与 WebSocket 访问。

**平台差异**：

| 平台 | 启动方式 |
|------|----------|
| Claude Code | 直接运行，脚本自行后台化；Windows 下自动转前台，需在 Bash 调用加 `run_in_background: true`，下一轮读 `$STATE_DIR/server-info` 取 URL |
| Codex | 脚本检测 `CODEX_CI` 自动转前台，正常运行即可、无需额外参数 |
| 其他 | 若环境回收后台进程，用 `--foreground` + 平台自身的后台执行机制 |

远程/容器环境浏览器连不上时：`--host 0.0.0.0 --url-host localhost`（此时启动 JSON 的 `lan_urls` 列出局域网地址，可给用户在手机上打开，看移动端 mockup 更真实）。

## 循环

1. **确认服务器存活**（`$STATE_DIR/server-info` 存在且 `server-stopped` 不存在；已停则用**相同 `--project-dir`** 重启，端口复用、已打开的标签页自动重连），然后**写 HTML fragment** 到 `screen_dir` 的新文件——语义化命名（`layout.html`）、**永不复用文件名**、**区分与检查浅色/深色主题的配色**、用文件创建工具而非 cat/heredoc，服务器自动展示最新文件
2. **告知用户并结束回合**：重发 URL（每一步都发）、一句话概括屏上内容、请用户看完在终端回复（想选就点击选项）
3. **下一回合**：读 `$STATE_DIR/events`（JSON lines，浏览器交互记录）——终端文字是主反馈，events 提供结构化补充；`type:"confirm"` 仅确认当前屏上的问题（含随附备注），核对 `screen_file/screen_sha256/render_sha256/binding_verified`，`click` 带 `selected` 区分选中/取消，`annotate` 是用户点选的"要改的位置"；文件不存在说明用户没和浏览器交互
4. **迭代或推进**：反馈改当前屏就写新文件（`layout-v2.html`）；当前问题验证完才进下一题
5. **回到终端时卸载**：下一步不需要浏览器时推一张等待屏（`waiting.html`：「继续在终端讨论…」），避免用户盯着已解决的选择题
6. 重复直至完成

fragment 写法、可用 CSS 类、events 格式、命名细则见 [preview-guide.md](references/preview-guide.md)。

**主题适配**：fragment 的文字与背景使用主题变量，不锁定全局浅色或深色；接入组件库时检查内容区和弹层是否跟随 frame 切换，具体规则见 [preview-guide.md「设计要点」](references/preview-guide.md#设计要点)。

## 清理

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/stop-server.sh" "$SESSION_DIR"
```

项目内会话同规则：特性目录下的 `visual/` 会话与 `.spec-dev/visual/` 会话的 mockup 均保留供日后查看（`stop-server.sh` 的删除逻辑只认 `/tmp` 前缀，特性目录会话自然保留）；仅 `/tmp` 会话在停止时删除。

**归档约定**：被设计采纳的定稿及必要资源保存到 `spec/assets/` 入库；会话状态与密钥不入库。对明确历史屏使用：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/archive-preview.mjs" --url "<含 key 的 /screen/定稿文件.html URL>" --out "<特性目录>/spec/assets/<定稿名称>"
```

产物为 `index.html`、`assets/` 和 `manifest.json`，已有目标拒绝覆盖。导出器保留静态资源与来源版本、禁用离线反馈传输，不产生批准记录；外部资源或 srcset 需先本地化/打包。动态 import/fetch 和路由仍须实际打开归档验证。关闭原服务后检查关键交互，将确认来源与适用状态写入现有 spec，交接细则沿共享契约。仅有内联资源的独立 HTML 可保留单文件形态。

## Red Flags

- 新页面已具备必要信息仍询问是否启用 → 沿自动入口展示，批准设计仍交用户
- 未澄清目标就生成空原型 → 先解决必要的通用问题
- 预览启用后所有问题都走浏览器 → 逐题判断，文字问题留对话
- 复用 HTML 文件名 → 每屏新文件
- 用户关闭后重复询问 → 沿用原决定，直到用户改变选择
- 把局部 confirm 当全设计批准 → 核对屏幕版本、问题范围和明确批准来源
