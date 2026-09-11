# 插件根解析

> 阅读时机：使用插件命令前；已有当前定义可复用。

## 插件根解析

插件内文件（契约校验器 `scripts/validate-output.mjs`、`skills/acceptance-qa/scripts/detect-env.mjs`、anysearch CLI 等）的路径一律写作 `"${CLAUDE_PLUGIN_ROOT}/<相对插件根路径>"`（变量双引号包裹）；**插件根**即插件安装目录的绝对路径（`skills/`、`agents/`、`scripts/` 的父目录）。cwd 是用户项目、插件文件不在其中，因此禁止相对路径。含此类命令的 skill 在语言协议块之后固定一行「**插件根**：`${CLAUDE_PLUGIN_ROOT}`」声明（载入即声明）：平台加载 skill 正文时把它替换为绝对路径，该行即本会话的插件根事实来源。

references 与派发词中出现的 `${CLAUDE_PLUGIN_ROOT}` 是**占位符**——平台不替换、也不导出到模型的 Bash 环境——执行者按下列序列解析后代入：

1. skill 正文中被平台替换后的绝对路径（声明行已显示为 `/` 起始的路径即直接取用）
2. skill base directory 上两级：skill 固定位于插件根下的 `skills/<name>/`，平台加载 skill 时给出的 base directory 向上两级即插件根
3. 已安装插件目录：Claude Code 的 plugins cache（`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`）或 Codex 的插件安装目录

三级均失败 → 向用户报告"无法定位插件根"并停下，不得静默跳过、不得改用相对路径。skill 自身目录用官方变量 `${CLAUDE_SKILL_DIR}`（同样只在 skill 正文替换），未替换时取 skill base directory。

---
