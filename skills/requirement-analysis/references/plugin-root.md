# 插件根解析

> 阅读时机：使用插件命令（`/doctor`、`/status`）或插件脚本之前。skill 本身不需要插件根。

## 插件根解析

**插件根**是插件安装目录的绝对路径，即 `skills/`、`scripts/`、`commands/` 的父目录。插件命令用到的脚本路径一律写作 `"${CLAUDE_PLUGIN_ROOT}/<相对插件根路径>"`（变量用双引号包裹）。cwd 是用户项目，插件文件不在其中，所以不能用相对路径。

平台没有替换 `${CLAUDE_PLUGIN_ROOT}` 时，按下面的顺序解析后代入：

1. 命令或 skill 正文里已被平台替换成 `/` 开头的绝对路径，直接取用。
2. skill base directory 上两级：skill 固定位于插件根下的 `skills/<name>/`。
3. 已安装插件目录：Claude Code 的 plugins cache（`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`）或 Codex 的插件安装目录。

三级都失败时向用户报告"无法定位插件根"并停下，不得静默跳过，不改用相对路径。只装了 skills 的环境没有插件脚本，这些命令不可用，不影响 skill 流程。

## skill 自己的文件

skill 引用自己目录下的脚本和 brief 时用 `${CLAUDE_SKILL_DIR}`（只在 skill 正文里替换）；没有被替换时取宿主加载该 skill 时给出的目录。引用别的 skill 时按名称加载，或读同级目录下它的 `SKILL.md`。
