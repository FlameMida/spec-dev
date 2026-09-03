# ADR-0006: 插件根路径解析——载入即声明 + 单点解析序列，不随守卫分发校验器副本

**Status**: Accepted (2026-09-03)

插件内文件（契约校验器、环境检测脚本、anysearch CLI）的路径一律写成 `"${CLAUDE_PLUGIN_ROOT}/<相对插件根路径>"`；含此类命令的 skill 在正文顶部固定一行 `${CLAUDE_PLUGIN_ROOT}` 声明（载入即声明），平台替换后成为该会话的插件根事实来源；references 与派发词中的同名变量是占位符，执行者按 exploration-patterns 单点定义的三级解析序列（正文已替换值 → skill base directory 上两级 → 已安装插件目录）代入。不随 guardrail 安装器向目标仓库分发 `validate-output.mjs` 副本。

理由：Claude Code 只在 skill/agent 正文替换 `${CLAUDE_PLUGIN_ROOT}`，不导出到模型的 Bash 环境，运行期读取的 references 也不替换；Codex 全程不替换。因此仅"统一变量写法"（生态对比报告 AB-38 原案）会把 writing-plans:118 的裸路径 bug 换成变量字面量 bug——12 处引用中 5 处 reference 落点今天已是这种状态。载入即声明利用官方替换语义把绝对路径一次性带进会话，是让统一写法可执行的必要机制；解析序列单点定义让 Codex 与非插件安装场景有确定性的推导路径。

被否方案：随守卫安装器分发校验器与 schemas 副本到目标仓库 `scripts/spec-dev/`（不依赖变量，但副本要随插件升级同步、牵动 install.mjs / 两份 guardrail README / doctor 健康项，且守卫与 skill 运行时耦合）；依赖 Bash 环境变量（官方明确不导出）；references 改用自造 `<plugin-root>` 占位符并逐处复述推导说明（多一套记法、每处复述）；新建"运行时约定"reference 集中收纳（exploration-patterns 已承担该角色，第二个文件是投机抽象且要改 10 个搜索块与测试特征串）。
