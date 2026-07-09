# AI 自主验收编排（Tier A）

> **阅读时机**：进入阶段 3 前。本文件是 Tier A 的完整编排定义：清单生成、执行取证、对抗复核、证据审计、契约回写。

## 为什么这套编排长这样

AI 验收的主导失败模式是**假阳性**——宣称通过但实际没验证，或证据只能证明"操作过"不能证明"符合预期"。执行者判读自己的证据存在系统性确认偏差。因此：证据强制（无证据只能 unverified）、fail/warn 重执行复核、pass 由主体独立的审计兜底，三道防线缺一不可。

## 断言优先级（自上而下）

1. **`browser_verify_*` 工具**（确定性断言原语，工具失败即 fail，不容判读）：
   - `browser_verify_element_visible`（参数 role + accessibleName）
   - `browser_verify_text_visible`（官方提示：能用 element_visible 则优先）
   - `browser_verify_list_visible`（element + target + items）
   - `browser_verify_value`（type + element + target + value；checkbox 用 "true"/"false"）
2. **`browser_snapshot` 可访问性树片段**——结构性事实（元素存在、层级、状态），引用关键片段作证据
3. **`browser_take_screenshot` + 判读**——只兜 verify/snapshot 表达不了的：布局观感、视觉层级、文案语义是否达意

能落在第 1 层的检查项不允许用第 2/3 层替代——"看快照感觉没问题"不是断言。

## 完整编排（全程串行——playwright MCP 是单浏览器会话，并行驱动互相破坏状态）

```
checklist = 验收矩阵 Tier A 行；无矩阵时两段式生成：
  1) 定制检查项 3-6 条（从目标描述提取功能要点）
  2) 通用项筛选：只挑适用的（响应式布局/跳转正确性/加载反馈/无视觉异常/无 console 错误）
  每条写明：操作序列 + 预期表现 + 证据形态

results = []
for item in checklist:                       # 串行逐项
    执行 item.ops（browser_navigate / click / type / fill_form / select_option / wait_for ...）
    断言：按上方优先级取证（verify 工具结果 / snapshot 片段 / 截图文件名）
    results += {check, dimension, tier:"A", ops, result, evidence_ref, notes}
    # 无证据 → result 只能是 unverified（不允许无证据的 pass）

落盘 acceptance-check-items 契约 JSON
→ node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs acceptance-check-items <file>
→ 校验失败：按 errors 清单补全一次；再失败将缺失项标记 unverified 并在报告说明

# 对抗复核（仍串行，同一浏览器）：仅 result ∈ {fail, warn} 的项
for item in results where item.result in {fail, warn}:
    以"不信任原结论"的视角重新执行 item.ops 一次:
      - 原判 fail → 优先尝试证明功能其实正常（操作时序？选择器选错？等待不足？）
      - 复现成功 → 维持原判并补第二份证据
      - 复现失败 → 降级为 warn 并注明"结果不稳定"

# 证据审计（独立子代理，只读已落盘证据、不操作浏览器——可与上面的复核并行发起）：
#   全部 pass 项批量交给 1 个子代理，输入 = 契约 JSON + 截图文件 + 各检查项的预期表现，指令为
#   "试图反驳每个 pass：证据是否真能支撑该检查项的预期表现？证据缺失、内容与预期对不上、
#    或只能证明'操作过'不能证明'符合预期'，该项即降级为 unverified 并注明证据缺口"
# 重执行式 pass 复核仅在 deep 档抽查 2 项（占浏览器会话，成本控制）

# 复核/审计结论回写契约 JSON 的 items[].recheck（status: 维持/降级/翻案 + evidence_ref）并重新校验
```

## 取证细则

- 每个检查项的结论必须附证据引用：verify 工具的调用与结果、snapshot 关键片段、或截图文件名
- **凭据不进上下文**：测试账号密码经 playwright MCP 的 `--secrets <dotenv 文件>` 注入，对话与契约 JSON 中只出现变量名
- **产物集中**：以 `--output-dir` 指向本次验收的证据目录（工作流触发时=特性目录 `acceptance/`），截图/快照文件与报告同处
- **流程级证据**（可选，多步流程建议开启）：`browser_start_tracing` / `browser_stop_tracing` 产出 Playwright trace；关键演示可用 `browser_start_video` + `browser_video_chapter`
- 弹窗（`browser_handle_dialog`）、文件上传（`browser_file_upload`）、多标签（`browser_tabs`）按需使用；需要 mock 的场景用 `browser_route`，并在 notes 注明"该项在 mock 网络下验收"

## 报告呈现（并入阶段 5 汇总）

| 检查项 | 维度 | 结果 | 证据 | 复核 | 备注 |
|--------|------|------|------|------|------|
| 数量修改后小计实时更新 | e2e | ✅ | verify_text_visible("¥116") | 审计维持 | 数量 1→2 |
| 错误提示对比度 | visual | ⚠️ | screenshot: login-error.png | 维持（二次截图一致） | 建议 WCAG AA |
| 加载反馈 | e2e | ❌ | snapshot: 按钮无 disabled/loading | 维持（复现成功） | 可能重复提交 |
| 响应式布局（桌面端） | visual | ✅→未验证 | 首屏截图 | 审计降级（未覆盖完整布局） | 需补证 |

结果四态与铁律 2 一致；复核列记录：fail/warn 项=重执行复核结论（维持/降级/翻案），pass 项=证据审计结论（审计维持/审计降级 + 缺口说明）。

## 移动端与桌面客户端的同构应用

- **移动端**（mobile-mcp 已接入时）：本编排同构适用——操作工具换为 mobile-mcp 的快照/点击/输入族，断言优先级同样是"结构化快照 > 截图判读"；无设备/模拟器环境时该部分标记 unverified 并说明
- **Electron**：Tier A 仍走 playwright MCP（`--cdp-endpoint` 连接 Electron 的调试端口）或降级为 Tier D 的 `_electron` API 用例（见 e2e-patterns.md）
