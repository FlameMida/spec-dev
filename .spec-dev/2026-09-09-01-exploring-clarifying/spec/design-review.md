# Exploring-clarifying 设计审查记录

> 这是设计审查时点记录。后续进展（2026-09-09）：用户已review并同意编写计划，spec激活提交019c17b；实施计划见 ../plan/index.md，尚未实施。下文基线哈希和审查结论保留原时点含义。

## 结论与边界

**Approved（首轮 1 项发现已修正，独立增量复审通过）**。

设计：[exploring-clarifying-design.md](exploring-clarifying-design.md)，14 条 Requirement / 32 个 Scenario。初始提交 `c53cc1b5b5b224b8dbd76197ee3325c08028c837`；复审设计 SHA-256 为 `fa98777110ec19c9ee9f8d273f64dcef481b1644e08f37faa2cfcb893beb150c`。当前只有设计与审查产物，尚未编写实施计划、修改产品规则或运行产品行为验收。

## 独立性与实际运行

- 原生 `spawn_agent` 新建审查者被返回 `agent thread limit reached`；会话无 close-agent 工具。未用已有探索代理冒充无上下文审查。
- 改用本机全新 `codex exec --sandbox read-only --ephemeral --json` 会话，两次分别启动，不继承作者对话。沿 CLI 默认模型/认证，未覆盖模型或思考强度；当前 JSONL 初始化事件不提供实际模型名，故不推测。
- 主线程通过 CLI 的最终输出文件选项和 stdout/stderr 重定向保存证据。审查模型仅有只读环境；没有修改产品文件或执行实现。
- 首轮按 `spec-reviewer-prompt.md` 和 `design-principles.md` 核对完整性、一致性、可测性、差量及现行契约；第二轮仅复查唯一问题及修正引入的影响，不宣称第二次重审全部历史契约。
- 两轮进程实际 exit 0，语义结论分别为 Issues Found、Approved。进程成功与审查结论分别记录；实际命令、线程 ID、回执见 [review-run.json](review-run.json) 和 [recheck-run.json](recheck-run.json)。

原始输入/结果：[首轮输入](review-input.txt)、[首轮输出](review-output.md)、[复审输入](recheck-input.txt)、[复审输出](recheck-output.md)。工具调用与原始输出保存于同目录 `review-events.jsonl` / `recheck-events.jsonl`，stderr 原件分别保存。只读沙箱内 Git 曾提示无法创建 xcrun 临时缓存，相关读取命令仍 exit 0 并取得正确基线，不作为产品失败或规避沙箱的理由。

## 发现与处置

| 发现 | 影响 | 修正与复审 |
|---|---|---|
| 一手来源纪律只有 agent 文件落点，缺 Codex 派发承接 | `spawn_agent` 不自动加载 agent 定义；仅改该文件可能导致实际子代理收不到新规则，测试直接预加载又可能遮住缺口 | 补 exploration-patterns/codex-compat 归属与 covers；RA/exploring 非自动加载环境传递解析后的 agent 绝对路径并要求先读；不可取得时保持缺口，接管也须取得规则；S16/S17 与矩阵要求真实派发/读取回执，禁止宿主预加载替代。复审 Approved。 |

这项修正补齐已批准的一手追溯行为的真实入口，不改变 spike、可选落盘、单题、术语保存和迁移范围裁决。因 spec 已修订，仍需用户 review 当前版本。

## 主线程自检

- 结构检查 exit 0：14 条 Requirement 各一个 SHALL 且有 Scenario；S01–S32 连续唯一，均有 GIVEN/WHEN/THEN，全部映射验收矩阵；14 个已存在的引用路径核对通过。见 [structure-check.json](structure-check.json)。
- 初次宽泛路径扫描误把计划中懒创建的 `.spec-dev/glossary.md` 当作应存在源文件，exit 1；修正检查边界后通过。原始结果保留在 [structure-check-initial.json](structure-check-initial.json)，没有为满足扫描而创建空 glossary。
- 设计源与相交 spec 的读取区分 active、单条 Superseded 和历史记录；major-upgrade 被部分取代的标题与原文相符。其余范围按当前 spec 共存清单处理。
- 初始窄提交已通过官方 Codex 插件安装校验、14 个 skill 校验、openai.yaml 同步和 diff 格式检查；手动 `rtk proxy node guardrail/check-spec-drift.mjs --staged` exit 0。文档提交使用 `SKIP_RELEASE_HOOK=1`，未发版或 push。

以上是设计结构、来源及治理检查，**不是新增产品行为的验收 PASS**。后台能力、32 个真实行为场景和实际写入/运行证据在后续计划及实施中完成。

## 下一步

设计审查当时 spec 保持 `draft`、`sync_commit: null`。用户现已完成 review 并同意编写计划，spec 已激活并写旧条款 pending；计划已保存，等待明确实施指令。审查不等于产品验收，仍未进入实施流程。
