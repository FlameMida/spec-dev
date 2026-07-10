# 可视化预览详细指南

> **Language / 语言**: The Chinese copy in the HTML examples below is structural placeholder only — write actual mockup copy (headings, option labels, annotations) in the conversation language. / 下文 HTML 示例中的中文文案仅为结构示意，实际 mockup 文案（标题、选项、标注）以对话语言书写。

> **阅读时机**：用户接受可视化预览提议、准备推第一屏之前。

## 工作原理

服务器监视一个目录并把最新的 HTML 文件推送给浏览器。你把 HTML 写入 `screen_dir`，用户在浏览器里看到并点击选择，选择被记录到 `$STATE_DIR/events`，你在下一回合读取。

**fragment vs 完整文档**：文件以 `<!DOCTYPE` 或 `<html` 开头则原样输出（只注入 helper 脚本）；否则服务器自动用 frame 模板包裹（页头、CSS 主题、连接状态、交互基建）。**默认写 fragment**，只有需要完全控制页面时才写完整文档。

## 写 fragment

只写页面内容本身，无需 `<html>`、CSS、`<script>`：

```html
<h2>哪种布局更好？</h2>
<p class="subtitle">考虑可读性与视觉层级</p>

<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>单栏</h3>
      <p>干净、聚焦的阅读体验</p>
    </div>
  </div>
  <div class="option" data-choice="b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>双栏</h3>
      <p>侧边导航 + 主内容区</p>
    </div>
  </div>
</div>
```

## 可用 CSS 类

**选项组（A/B/C 选择）**：如上例；容器加 `data-multiselect` 支持多选。

**卡片（视觉方案）**：

```html
<div class="cards">
  <div class="card" data-choice="design1" onclick="toggleSelect(this)">
    <div class="card-image"><!-- mockup 内容 --></div>
    <div class="card-body"><h3>名称</h3><p>说明</p></div>
  </div>
</div>
```

**mockup 容器与并排对比**：

```html
<div class="mockup">
  <div class="mockup-header"><span class="dots"></span>预览：仪表盘布局</div>
  <div class="mockup-body"><!-- mockup HTML --></div>
</div>

<div class="split">
  <div class="mockup"><!-- 左 --></div>
  <div class="mockup"><!-- 右 --></div>
</div>
```

`mockup-header` 里加 `<span class="dots"></span>` 可得浏览器窗口三圆点，观感更接近真实窗口。

**架构图/流程图（Mermaid 模式）**：架构图、数据流、状态机、时序图**优先用 Mermaid**，不要用 div 手拼。frame 会在页面含 `.mermaid` 元素时自动加载本地打包的 Mermaid（无需网络；主题跟随深浅色；加载失败时降级显示源码）：

```html
<div class="diagram">
  <pre class="mermaid">
flowchart LR
  Client --> API --> DB[(数据库)]
  API --> Cache
  </pre>
</div>
```

用 `<pre class="mermaid">` 包住图源码（`pre` 保留换行且不被当成 HTML 解析）；节点文字含 `<`、`>`、`&` 时用 `&lt;` 等实体转义。Mermaid 图与 mockup、选项组可在同一屏混用——例如上半屏 `.diagram` 展示两种架构，下半屏 `.options` 让用户点选。

**优缺点**：

```html
<div class="pros-cons">
  <div class="pros"><h4>优点</h4><ul><li>…</li></ul></div>
  <div class="cons"><h4>缺点</h4><ul><li>…</li></ul></div>
</div>
```

**线框积木**：

- 骨架：`mock-shell`（flex 外壳）、`mock-nav`（顶栏，`.spacer` 撑开右侧）、`mock-sidebar`（含 `.item` / `.item.active` 菜单项）、`mock-content`
- 控件：`mock-button`（`.secondary` 次要样式）、`mock-input`、`mock-form-row`（label + 控件）
- 内容占位：`mock-line`（骨架文本行，`.heading` 加粗、`.w-25/.w-50/.w-75/.w-100` 控宽）、`mock-img`（对角线图片占位）、`placeholder`
- 数据展示：`mock-table`（斑马纹表格）、`mock-list`（`.row` 行）、`mock-chart`（柱状图，`.bar` 用内联 `style="height:60%"` 定高，`.muted` 灰柱）
- 组合件：`mock-tabs`（`.mock-tab.active`）、`mock-avatar`、`mock-badge`（`.success/.warning/.error` 变体）、`mock-modal-backdrop` + `mock-modal`（原位弹窗演示）

**排版**：`h2` 页标题、`h3` 节标题、`.subtitle` 副标题、`.section` 内容块、`.label` 小型大写标签。

**frame 内建交互（无需你写代码）**：每个 framed 屏自带底部操作栏——用户可勾选后点「确认选择」、填自由备注、开「标注模式」点击画面元素回传位置；header 有历史屏导航（上一屏/下一屏）、视口切换（桌面/平板/手机）、主题切换（系统/浅色/深色）。

完整 CSS 参考：`scripts/frame-template.html`；客户端逻辑：`scripts/helper.js`。

## events 格式

用户交互被记录到 `$STATE_DIR/events`（每行一个 JSON 对象；推新屏时归档到 `$STATE_DIR/events-archive/<毫秒时间戳>.jsonl`，不会丢失）。时间戳为毫秒（`Date.now()`），`screen` 是产生事件的页面路径（`/` 为最新屏，`/screen/<文件名>` 为历史屏）：

```jsonl
{"type":"click","choice":"a","text":"Option A - Simple Layout","selected":true,"id":null,"timestamp":1706000101000,"screen":"/"}
{"type":"click","choice":"a","text":"Option A - Simple Layout","selected":false,"id":null,"timestamp":1706000104000,"screen":"/"}
{"type":"confirm","choices":["b"],"note":"侧栏可以窄一点","timestamp":1706000108000,"screen":"/"}
{"type":"annotate","tag":"div","classes":"mock-sidebar","text":"导航 设置","timestamp":1706000112000,"screen":"/"}
```

- **`confirm` 是最强信号**——用户点了确认按钮，`choices` 就是最终选择，`note` 是随附备注（可能为空串）
- **`click` 的 `selected` 字段**区分选中（true）与取消选中（false），多选场景务必看它
- **`note`**：用户只发备注没选选项时的独立事件；**`annotate`**：标注模式下用户点击的元素（标签、类名、文本片段）——表示"这个位置要改"
- 没有 `confirm` 时退回旧启发式：完整点击流展示探索路径，最后一个选中的 `choice` 通常是意向，反复点击可能暴露犹豫，值得追问
- 文件不存在 = 用户没和浏览器交互，只看终端文字

## 设计要点

- **保真度匹配问题**——布局问题用线框，观感问题才做视觉打磨
- **图示优先 Mermaid**——架构图、流程图、状态机、时序图用 `<pre class="mermaid">`，不要 div 手拼
- **每屏解释问题**——写"哪种布局更专业？"而不是只写"选一个"
- **先迭代后推进**——反馈改当前屏就写新版本，验证完才进下一题
- **每屏最多 2-4 个选项**
- **该用真内容时用真内容**——摄影作品集用真图（Unsplash），占位内容会掩盖设计问题；项目已有视觉规范时用 `--theme-css` 注入 design tokens，让 mockup 用项目自己的配色
- **mockup 保持简单**——聚焦布局与结构，不追求像素级精致

## 文件命名

- 语义化：`platform.html`、`visual-style.html`、`layout.html`
- **永不复用文件名**——每屏都是新文件；迭代加版本号：`layout-v2.html`
- 服务器按修改时间展示最新文件

## 连接信息查找

服务器启动 JSON 同时写入 `$STATE_DIR/server-info`——后台启动没截到 stdout 时从该文件取 URL 与端口；使用 `--project-dir` 时会话目录在 `<project>/.spec-dev/visual/` 下。
