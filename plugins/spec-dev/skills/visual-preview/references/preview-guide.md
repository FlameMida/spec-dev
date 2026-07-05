# 可视化预览详细指南

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
  <div class="mockup-header">预览：仪表盘布局</div>
  <div class="mockup-body"><!-- mockup HTML --></div>
</div>

<div class="split">
  <div class="mockup"><!-- 左 --></div>
  <div class="mockup"><!-- 右 --></div>
</div>
```

**优缺点**：

```html
<div class="pros-cons">
  <div class="pros"><h4>优点</h4><ul><li>…</li></ul></div>
  <div class="cons"><h4>缺点</h4><ul><li>…</li></ul></div>
</div>
```

**线框积木**：`mock-nav`、`mock-sidebar`、`mock-content`、`mock-button`、`mock-input`、`placeholder`。

**排版**：`h2` 页标题、`h3` 节标题、`.subtitle` 副标题、`.section` 内容块、`.label` 小型大写标签。

完整 CSS 参考：`scripts/frame-template.html`；客户端逻辑：`scripts/helper.js`。

## events 格式

用户点击被记录到 `$STATE_DIR/events`（每行一个 JSON 对象；推新屏时自动清空）：

```jsonl
{"type":"click","choice":"a","text":"Option A - Simple Layout","timestamp":1706000101}
{"type":"click","choice":"c","text":"Option C - Complex Grid","timestamp":1706000108}
```

完整事件流展示了用户的探索路径——最后一个 `choice` 通常是最终选择，但反复点击的模式可能暴露犹豫，值得追问。文件不存在 = 用户没和浏览器交互，只看终端文字。

## 设计要点

- **保真度匹配问题**——布局问题用线框，观感问题才做视觉打磨
- **每屏解释问题**——写"哪种布局更专业？"而不是只写"选一个"
- **先迭代后推进**——反馈改当前屏就写新版本，验证完才进下一题
- **每屏最多 2-4 个选项**
- **该用真内容时用真内容**——摄影作品集用真图（Unsplash），占位内容会掩盖设计问题
- **mockup 保持简单**——聚焦布局与结构，不追求像素级精致

## 文件命名

- 语义化：`platform.html`、`visual-style.html`、`layout.html`
- **永不复用文件名**——每屏都是新文件；迭代加版本号：`layout-v2.html`
- 服务器按修改时间展示最新文件

## 连接信息查找

服务器启动 JSON 同时写入 `$STATE_DIR/server-info`——后台启动没截到 stdout 时从该文件取 URL 与端口；使用 `--project-dir` 时会话目录在 `<project>/.spec-dev/visual/` 下。
