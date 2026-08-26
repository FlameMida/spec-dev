---
description: Diagnose spec-dev health — platform, guardrail install, injection markers, SessionStart hook mount (incl. injection decision replay), anysearch (duplicates + upstream lag), sequential-thinking runtime / 诊断 spec-dev 健康态：平台、guardrail 安装、注入标记、SessionStart hook 挂载（含注入决策回放）、anysearch（双副本歧义与版本滞后）、sequential-thinking 运行时
---

运行 `node ${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs` 并把输出原样呈现给用户，对每个 ✗/hint 项逐条解释修复指引；用户要求机器可读输出时加 `--json`。

要点：

- 退出码 1 表示存在需修复项——引导用户按各节 hint 修复后复跑本命令验证。
- `hooks.declarative` 三态判定插件级 `hooks/hooks.json` 的 SessionStart 声明（ok / declared-empty / missing）：非 ok 说明装载平台不会自动注入会话上下文，重装插件恢复；`hooks.injectionReplay` 是对 `guardrail/session-context.mjs --explain` 的重放（同输入同决策），其中 `skip` 及其 reason 解释了"为什么会话没有注入上下文"（非 git 仓库、无已跟踪 spec 等）。
- `anysearch.duplicates` 非空说明存在插件内嵌版之外的独立副本，会造成 skill 选择歧义——向用户说明取舍；`anysearch.lag` 三态判定内嵌版与上游的版本关系（up-to-date / lagging / unknown——unknown 通常是离线或检查超时，不算健康问题）：lagging 时按 hint 运行 `node scripts/update-vendored-skill.mjs --skill anysearch` 同步。
- `sequentialThinking.chain` 为 `prose-fallback` 时说明推理 skill 无可用运行时，工作流会降级为回复内分点推演（不中断）——如用户需要持久思考状态，建议安装 node/bun。
- 浏览器自动化 MCP（playwright / chrome-devtools）为按项目 opt-in，配置指引见 `skills/acceptance-qa/references/mcp-setup.md`（本命令不检测 MCP）。
