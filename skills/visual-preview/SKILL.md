---
name: visual-preview
description: >-
  Browser visual preview - during requirement design or brainstorming, show mockups, wireframes, layout comparisons and architecture diagrams in a local browser page and collect click-through choices. Use when a question is genuinely visual (clearer to see than to say); text-only requirement, tradeoff or concept questions stay in the terminal. / 浏览器可视化预览——在需求设计/头脑风暴过程中，用本地浏览器页面向用户展示 mockup、线框图、布局对比、架构图并收集点击选择。当一个问题"用看的比用说的更清楚"时使用（真实的布局/视觉/图示对比问题，而非仅话题涉及 UI）；纯文字的需求、取舍、概念选择问题不适用，应留在终端提问。
---

> **Language Protocol / 语言协议**: Respond in the user's conversation language — an explicit user instruction (including the platform `language` setting) takes precedence, then the language of the user's recent messages; default to English when neither indicates a language. All deliverables written to the repo (specs, plans, reports, notes) follow the conversation language at creation; incremental edits keep the artifact's existing language. Fixed-wording prompts in this skill are semantic templates — express their meaning in the conversation language, don't quote them verbatim.
> 语言协议：以对话语言输出——用户显式指定（含平台 `language` 设置）优先，其次跟随用户近期消息语言；均无法判定时默认英语。落盘产物以创建时对话语言为准，增量修改保持产物既有语言。本 skill 中的固定话术是语义模板，用对话语言表达其意，不逐字照搬。

# 可视化预览（Visual Preview）

基于浏览器的视觉工具：在设计对话中向用户展示 mockup、图示与可点击的选项，选择结果回流到会话。这是一件**工具**而不是一种模式——启用后也只有真正视觉的问题才走浏览器。

## 提议规则（JIT，铁律）

**不要在开场提议。** 等到某个问题真的"用看的比用说的更清楚"——真实的 mockup/布局/图示对比问题，而不只是"话题涉及 UI"——首次出现时才提议，且**提议必须独立成一条消息**（只含提议，不夹带澄清问题、总结或其他内容）：

> 「接下来这部分我画给你看可能更直观——我可以在浏览器页面里做 mockup、图示和并排对比，边聊边更新。这个功能还比较新、也比较费 token，要用吗？同意的话我会为你打开页面。」

等待用户回复。接受则用 `--open` 启动服务器（浏览器自动打开首屏）；拒绝则继续纯文字，**此后不再提议**，除非用户主动提起。

## 逐题判断：浏览器还是终端

用户接受后，仍要**对每个问题单独判断**。判据：**用户看到它会比读到它理解得更好吗？**

- **用浏览器**：内容本身是视觉的——mockup、线框图、布局对比、架构图、并排视觉方案、观感/间距/视觉层级问题
- **用终端**：内容是文字的——需求问题、概念选择、取舍清单、A/B/C 文字选项、范围决策

涉及 UI 的话题 ≠ 视觉问题。"这个向导的『个性化』指什么？"是概念问题——用终端；"哪种向导布局更好？"是视觉问题——用浏览器。

## 启动会话

```bash
# 用户同意后再启动。--open 自动打开浏览器；--project-dir 使 mockup 持久化并支持同端口重启。
# 可选 --theme-css <file>：注入项目的 design tokens/CSS 变量，让 mockup 用项目自己的配色。
bash <skill-base-directory>/scripts/start-server.sh --project-dir /path/to/project --open
```

返回 JSON 含 `port`、`url`、`screen_dir`、`state_dir`——保存后两者。会话文件落在 `<project>/.spec-dev/visual/`；提醒用户将 `.spec-dev/` 加入 `.gitignore`（如尚未加入）。

**URL 含会话密钥（`?key=…`）**：始终把 `url` 字段的**完整 URL** 给用户，不得裁掉 query string——密钥同时守卫 HTTP 与 WebSocket 访问。

**平台差异**：

| 平台 | 启动方式 |
|------|----------|
| Claude Code | 直接运行，脚本自行后台化；Windows 下自动转前台，需在 Bash 调用加 `run_in_background: true`，下一轮读 `$STATE_DIR/server-info` 取 URL |
| Codex | 脚本检测 `CODEX_CI` 自动转前台，正常运行即可、无需额外参数 |
| 其他 | 若环境回收后台进程，用 `--foreground` + 平台自身的后台执行机制 |

远程/容器环境浏览器连不上时：`--host 0.0.0.0 --url-host localhost`（此时启动 JSON 的 `lan_urls` 列出局域网地址，可给用户在手机上打开，看移动端 mockup 更真实）。

## 循环

1. **确认服务器存活**（`$STATE_DIR/server-info` 存在且 `server-stopped` 不存在；已停则用**相同 `--project-dir`** 重启，端口复用、已打开的标签页自动重连），然后**写 HTML fragment** 到 `screen_dir` 的新文件——语义化命名（`layout.html`）、**永不复用文件名**、用文件创建工具而非 cat/heredoc，服务器自动展示最新文件
2. **告知用户并结束回合**：重发 URL（每一步都发）、一句话概括屏上内容、请用户看完在终端回复（想选就点击选项）
3. **下一回合**：读 `$STATE_DIR/events`（JSON lines，浏览器交互记录）——终端文字是主反馈，events 提供结构化补充；`type:"confirm"` 是用户的明确最终选择（含随附备注），`click` 带 `selected` 区分选中/取消，`annotate` 是用户点选的"要改的位置"；文件不存在说明用户没和浏览器交互
4. **迭代或推进**：反馈改当前屏就写新文件（`layout-v2.html`）；当前问题验证完才进下一题
5. **回到终端时卸载**：下一步不需要浏览器时推一张等待屏（`waiting.html`：「继续在终端讨论…」），避免用户盯着已解决的选择题
6. 重复直至完成

fragment 写法、可用 CSS 类、events 格式、命名细则见 [preview-guide.md](references/preview-guide.md)。

## 清理

```bash
bash <skill-base-directory>/scripts/stop-server.sh $SESSION_DIR
```

使用 `--project-dir` 的会话，mockup 保留在 `.spec-dev/visual/` 供日后查看；仅 `/tmp` 会话在停止时删除。服务器空闲 4 小时自动退出（`--idle-timeout-minutes` 可调）。

## Red Flags

- 开场就提议可视化预览 → 必须 JIT，首个真视觉问题出现时才提
- 提议消息里夹带其他问题 → 提议独立成消息
- 用户接受后所有问题都走浏览器 → 逐题判断，文字问题留终端
- 复用 HTML 文件名 → 每屏新文件
- 用户拒绝后再次提议 → 不再提，除非用户主动提起
