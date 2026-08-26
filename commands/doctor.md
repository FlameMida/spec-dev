---
description: Diagnose spec-dev health — platform, guardrail install, injection markers, session-injection decision, anysearch, sequential-thinking runtime / 诊断 spec-dev 健康态：平台、guardrail 安装、注入标记、会话注入决策、anysearch、sequential-thinking 运行时
---

运行 `node ${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs` 并把输出原样呈现给用户，对每个 ✗/hint 项逐条解释修复指引；用户要求机器可读输出时加 `--json`。

要点：

- 退出码 1 表示存在需修复项——引导用户按各节 hint 修复后复跑本命令验证。
- `injection.lastDecision` 是对 `guardrail/session-context.mjs --explain` 的重放（同输入同决策）：`skip` 及其 reason 解释了"为什么会话没有注入上下文"（非 git 仓库、无已跟踪 spec 等）。
- `anysearch.duplicates` 非空说明存在插件内嵌版之外的独立副本，会造成 skill 选择歧义——向用户说明取舍。
- `sequentialThinking.chain` 为 `prose-fallback` 时说明推理 skill 无可用运行时，工作流会降级为回复内分点推演（不中断）——如用户需要持久思考状态，建议安装 node/bun。
- 浏览器自动化 MCP（playwright / chrome-devtools）为按项目 opt-in，配置指引见 `skills/acceptance-qa/references/mcp-setup.md`（本命令不检测 MCP）。
