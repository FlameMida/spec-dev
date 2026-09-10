---
description: 查看同一 Git 仓库全部 worktree 的 roadmap、spec 与计划记录，保留来源并提示缺失、格式错误和进度分歧；不重新验收
---

# 状态概览

按插件根单点规则解析真实插件目录（skills/requirement-analysis/references/exploration-patterns.md「插件根解析」），运行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs"`。工具 shell 受 RTK 规则约束时加 `rtk proxy`。cwd 为用户项目；用户指定目标则加 `--repo "<真实目标路径>"`，要求机器可读输出则加 `--json`。变量未展开不能当路径发送，不向用户项目复制脚本。

实际调用后呈现结果与来源，保留固定说明「本次为进度记录快照，未重新验收，也未核验交付事实」。同一特性多个 worktree 的差异并列，不按完成量或时间择新，不补读提交/验收证据以宣称PASS。没有实际调用成功则报告工具失败，不能自行编造表格。

退出码0表示读取完成，blocked和分歧可正常存在；1表示读取不完整，仍呈现成功记录与diagnostics；2表示参数/目标错误，说明原因。格式错误仅报告，不自动修复、迁移、调度或执行计划。

Codex的commands/不是加载入口；使用插件状态查询提示或README中同一CLI调用方式。独立脚本也可直接从终端使用。
