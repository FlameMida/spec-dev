# portability-hygiene 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。任务状态由 `plan/progress.yaml` 跟踪（唯一状态源；任务文件步骤用「**步骤 N:**」标题式、不含复选框）；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：修掉 writing-plans 的裸相对路径 bug 并让插件根解析在任何用户项目 cwd 与两平台下可执行（单点定义解析序列 + 载入即声明 + 引用统一写法），顺手把失败隔离/契约校验/Codex 映射表/TDD 例外清单的复述收敛为单点引用、修正 README 漂移、结构化隔离 visual 会话产物、让导航表依赖范围写法被校验器展开。

**Spec**：`.spec-dev/2026-09-03-02-portability-hygiene/spec/portability-hygiene-design.md`（status: active；roadmap `2026-09-03-01-skill-ecosystem-absorption` 子项目 #1/8）

**架构**：exploration-patterns.md 成为插件根解析与契约校验降级的唯一定义点；四个含插件根命令的 SKILL.md 在语言协议块后固定一行 `${CLAUDE_PLUGIN_ROOT}` 声明（Claude Code 加载即替换为绝对路径，Codex 按序列推导）；13 处引用统一为双引号包裹的变量写法并去掉各处复述的降级说明；共享纪律复述改为同措辞 gist + 指针；validate-output.mjs 的 plan-index 展开 `TNN-TMM` 闭区间；start-server.sh 在 visual 根自建 `.gitignore`；README 双语新增「运行时依赖」「成熟度分区与发布纪律」并修正四处漂移。docs 断言测试（新建 plugin-root.test.mjs）把每条 Scenario 固化为回归线。

**技术栈**：markdown 指令文档 + Node ≥ 18（node:test、ESM）+ bash；无新依赖。

**设计原则**：本计划遵循 spec-dev 设计原则（不留向后兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策）；任务与代码不得违反，冲突时停下向计划作者确认。三种插件根写法并存的现状不保留（第 1 条）；不新建"运行时约定"reference（第 2 条）。

## 全局约束

- 本特性**不改任何 skill 的 `description` 与 `agents/openai.yaml`**：触碰 SKILL.md 的提交一律以 `SKIP_OPENAI_SYNC_CHECK=1` 通过 check-openai-sync（其豁免条件"确认不影响触发描述"成立）；本计划各提交步骤已内嵌该变量
- 实施阶段代码提交按仓库默认走 post-commit 自动发版（不加 `SKIP_RELEASE_HOOK`）；`feat(TN)` 前缀会升 minor、`fix/docs/chore` 升 patch——各任务提交前缀按实际语义写，最终版本号由 release.mjs 推断
- 既有 docs 断言测试的特征串必须保留：`外部搜索统一入口`+`anysearch`（search-clause，10 个 SKILL.md）、`登记进 progress.yaml 的 resources 键`/`存量单文件…台账行`（resource-ledger-split）、`渐进加载`/`ready 任务`/`按原样读取`/`格式嗅探`/`冻结`（plan-single-format）、`YYYY-MM-DD-NN-`（numbering-docs）
- 插件根命令统一形态：`node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" <schema> <file>`；变量必须双引号包裹；不出现 `<插件根>`、`<plugin-root>`、`<skill-base-directory>` 自造占位符
- 本条不涉及的路径保持原样：目标仓库路径 `scripts/spec-dev/**`（quick-fix:40、executing-plans:35、requirement-analysis 迁移句）、vendored skill（anysearch `<skill_dir>`、sequential-thinking `bun scripts/think.ts`）、commands/doctor.md:11 的仓库开发期维护提示
- 声明行字面量（四个 SKILL.md 逐字一致）：`> **插件根**：\`${CLAUDE_PLUGIN_ROOT}\`——本 skill 正文与其 references 中的插件根命令以此为准；若上式仍为变量字面量（平台未替换），按 requirement-analysis 的 references/exploration-patterns.md「插件根解析」序列推导。`
- 失败隔离 gist 字面量（四处逐字一致）：`失败先缩小范围重试 1 次，再失败主线程接管（定义见 exploration-patterns「派发要求与失败隔离」）`
- 契约校验 gist 字面量（review-orchestration:21 / executing-plans:93 / schemas/README:14 三处逐字一致）：`校验失败发回补全一次，再失败主线程接管（定义见 exploration-patterns「输出契约与校验」）`；acceptance-qa:117 用变体形态 `校验失败发回补全一次，再失败标记 unverified（acceptance-qa 变体；通用规则见 exploration-patterns「输出契约与校验」）`
- 漂移守卫：本 spec 已 active 且 covers 全部触碰文件；提交同时命中 major-upgrade / plan-single-format / supersede-lifecycle / resource-ledger / test-scoping 的 covers（分面共存）——本仓库未安装编辑期守卫、pre-commit 不跑漂移检查，每个任务提交前手工 `node guardrail/check-spec-drift.mjs --staged` 自检：只报这五份 spec 时属预期分面共存，在提交信息末尾加 trailer `Spec-Guard: off facet-coexist with <spec 名>`
- Node.js ≥ 18（node --test、ESM）

## 相关测试范围

- `node --test scripts/tests/*.test.mjs`（11 个既有 docs/unit 断言文件 + 本计划新建的 plugin-root.test.mjs；rtk 代理下目录形式不可用，用 glob 形式）
- `bash scripts/tests/visual-path.test.sh`
- `node scripts/validate-skills.mjs`
- `node scripts/check-openai-sync.mjs`
- `node scripts/check-plugin.mjs`

推导说明：仓库无测试影响分析工具；covers 含 `scripts/validate-output.mjs`、两个测试文件与 start-server.sh，其余为指令文档——按 covers 与影响面推导为全量 docs/unit 测试 + 四校验命令（与 plan-single-format 计划同口径）。

---

## 任务导航表

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 建立隔离工作区 | — | — | worktree `.worktrees/plan-2026-09-03-02-portability-hygiene`（分支 `plan/2026-09-03-02-portability-hygiene`） |
| T01 plan-index 依赖闭区间展开 | T00 | `scripts/validate-output.mjs` 的 `validatePlanIndex(planDir)`（deps 抽取 `m[2].match(/T\d\d/g)`） | 闭包函数 `expandDeps(cell: string, taskId: string): string[]`（闭区间展开；倒序 `errors.push({path:"<id>.deps", expected:"ascending range", actual})`；缺号交悬空检测）；writing-plans:118 整行（闭区间定义句 `\`T01-T06\` 表示 T01 至 T06 闭区间` + 命令 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index <plan目录>`） |
| T02 exploration-patterns 定义点 | T00 | exploration-patterns.md 现文（:64 输出契约节、:86 派发词模板、:89 失败隔离句） | 节 `## 插件根解析`；`## 输出契约与校验`（含"定义点"声明、命令双引号、`校验器不可用…契约校验降级` 句）；`**主线程止损**…不硬撑` 句；测试文件 `scripts/tests/plugin-root.test.mjs`（helper：`repoRoot`/`read`/`count`/`VENDORED`/`walk`/`mdFiles`/`EP`，末行 `export {`） |
| T03 四个 SKILL.md 载入即声明 + 命令写法 | T02 | T02 节标题；全局约束「声明行字面量」；plugin-root.test.mjs helper | RA/writing-plans/executing-plans/acceptance-qa 各含声明行（`> 语言协议：` 行之后）；executing-plans:93 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" review-findings <file>` + 契约 gist；acceptance-qa:78 双引号、:81 删除、:117 变体 gist |
| T04 visual 根自建 .gitignore + visual-preview 写法 | T00 | start-server.sh :152-167/:168-173/:182；visual-preview SKILL.md :36-38/:43/:71；plugin-root.test.mjs helper（T02） | bash 数组 `GITIGNORE_ROOTS`、函数 `ensure_visual_gitignore <root>`、dry-run 行 `GITIGNORE=<root>/.gitignore`；SKILL.md 含 `脚本自建`、`"${CLAUDE_SKILL_DIR}/scripts/start-server.sh"`，无 `<skill-base-directory>` |
| T05 references / agents / commands / schemas 写法统一 | T03, T04 | T02 节标题；全局约束「回退句」 | review-orchestration:20/:74、ai-acceptance:37、codex-compat:61、schemas/README:8/:16、code-explorer:148、external-resource-explorer:31、doctor.md:5 改定；全局断言：零裸路径/零自造占位符/变量双引号/降级说明零复述 |
| T06 失败隔离 / 契约校验 gist 收敛 | T05 | 全局约束两条 gist 字面量；T02 canonical | RA 阶段 2 句、quick-fix:38、codex-compat:54、review-orchestration:58 失败隔离 gist；review-orchestration:21、schemas/README:14 契约 gist；ai-acceptance:38 变体标注；code-explorer:116 / code-reviewer:147 补指针；`主进程接管` 零命中 |
| T07 Codex 映射表单点化 + quick-fix 例外清单引用 | T06 | codex-compat.md:3-4 前言、:22-28 总表；RA 兼容性节；quick-fix:66/:97-103 | codex-compat 前言含 `全 skill 共用`；RA 兼容性节一句 gist + 指针（无表格行）；quick-fix 兼容性节只留 `fork_turns: "none"` 自有行 + 指针；quick-fix:66 含 `例外清单以 test-driven-development skill 为准` 与 `纯文案` |
| T08 README 双语：运行时依赖 + 成熟度分区 + 漂移修正 | T00 | README.md / README.zh-CN.md 现文；plugin-root.test.mjs helper（T02） | `### Runtime dependencies` / `### 运行时依赖`（2 hard + 4 soft）；`### Maturity tiers and release discipline` / `### 成熟度分区与发布纪律`；trigger-evals 六个 skill；目录树 13 skill + doctor.mjs/update-vendored-skill.mjs；四查四项；`3 output contract schemas + 1 vendored manifest schema` / `3 类输出契约 schema + 1 个 vendored manifest schema` |
| T09 验收（acceptance-qa） | T01-T08 | 全部 | 验收报告落盘 `acceptance/` |
| T10 合并与清理 | T00-T09 | T09 报告、spec「取代与共存」节 | 取代回写（major-upgrade「visual-preview 产物归位特性目录」Superseded 标注 + pending 回收）、合并、sync_commit 锚定 |

## 资源预登记说明

资源台账承载于 `progress.yaml` 的 `resources` 键（worktree 行已预登记；T09 的 `/tmp/ph-accept-*` 即建即删、不入账；执行中创建其他持久资源即追加），最终任务（T10）清理步骤遍历该清单。
