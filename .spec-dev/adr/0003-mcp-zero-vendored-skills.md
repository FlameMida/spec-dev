# ADR-0003: MCP 清零与 vendored skill 替代策略

**Status**: Accepted (2026-08-26)

插件不再分发任何 MCP server 配置：sequential-thinking 由 vendored skill（thedotmack/sequential-thinking-skill，MIT，SHA-pinned 快照 + 本地零依赖 node 端口降级链）承接，playwright/chrome-devtools 转为 acceptance-qa 文档指引下的用户按需自配。理由：四平台（Claude Code/Codex/grok/pi）对 MCP 的支持与配置面差异大而 skill 是最大公约数分发单元；npx 冷启动与网络可用性是历史故障源（v7.21.1 已先行移除 context7）；三个 MCP 在工作流中本就全部具备降级路径，非必需依赖。

被否方案：保留 MCP 并按平台条件分发（配置面爆炸、pi 无原生 MCP 键）；fork sequential-thinking MCP 为自维护服务（维护成本高于 vendoring 一个 18KB 的 skill）。
