# 工作流瘦身 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。任务状态由 `plan/progress.yaml` 跟踪（唯一状态源；任务文件步骤用「**步骤 N:**」标题式、不含复选框）；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：把 spec-dev 的计划体量、审查扇出、测试时点、证据留存、台账提交与会话注入六处臃肿源改掉，使无 CI 的本地仓库交付路径只剩必要动作。

**Spec**：`../spec/workflow-slimming-design.md`

**架构**：九条需求落成十一个实施任务，每任务对应一条 Requirement 的文本或代码改动，并用 node:test 用例钉住新文本。文本类改动沿用仓库既有 `scripts/tests/skill-streamlining-T*.test.mjs` 模式，新增 `scripts/tests/workflow-slimming-TNN.test.mjs` 对 skill 文本做正则断言；代码类改动（plan-index 上限、受控运行器、session-context）改既有测试文件。本计划自身遵守 R1：任务文件只给新旧片段对照，单文件 ≤ 200 行。T12 步骤 8 的 git 历史重写是唯一不可逆动作：在镜像克隆上执行、核验后 force push，执行前当场取得用户确认。

**技术栈**：Node 20+（node:test、ESM）、Python 3.9+（受控审查运行器）、git、rtk。

**关联 skill**：
- executing-plans —— 执行方式；阶段 3 逐任务；本计划全部为普通行为票，无纯重构票、无集成组、不并发。
- using-git-worktrees —— T00 隔离；单点 `skills/using-git-worktrees/SKILL.md`。
- test-driven-development —— 每任务有效红→最小实现→绿；单点 `skills/test-driven-development/SKILL.md`。
- test-strategy —— 任务内 lane 为 fast（单测试文件）；最终任务 final 一次全量。
- acceptance-qa —— 不触发：矩阵全部为「任务内 TDD」行。

**设计原则**：本计划遵循 spec-dev 设计原则（不留向后兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策）；任务与代码不得违反，冲突时停下向计划作者确认。模块判据定义点：`skills/writing-plans/references/design-principles.md`。

## 全局约束

- 每次任务提交用 `SKIP_RELEASE_HOOK=1 git commit …`：仓库 post-commit 会自动发版打 tag；发版由用户在合并后手动运行 `node scripts/release.mjs`。
- 改 `skills/<name>/SKILL.md` 时：触发描述语义变了就同步改 `skills/<name>/agents/openai.yaml` 并一起 stage；没变则提交命令加 `SKIP_OPENAI_SYNC_CHECK=1`（check-openai-sync 自带的确认路径），并在提交信息注明「openai.yaml 无需同步」。只改 references/assets 不触发该检查。
- 每次提交前手动运行 `rtk proxy node scripts/validate-skills.mjs` 与 `rtk proxy node scripts/check-openai-sync.mjs`；pre-commit 的 `check-plugin --codex-validate` 仅因本机无 Codex CLI 失败时，才用 `SKIP_CODEX_PACKAGE_HOOK=1` 跳过。
- 触及 spec「取代与共存」节列为分面共存的 spec 所 covers 的文件时，提交信息尾部加 trailer：`Spec-Guard: off workflow-slimming (facet coexistence)`。
- 文本保持中文；结构标签（Requirement / Scenario / frontmatter 键 / lane 名）英文。
- 本计划任务文件 ≤ 200 行；T03 落地后由 `plan-index` 强制。

## 相关测试范围

无测试影响分析工具（package.json 无 scripts）。范围 = 本特性新增/修改的测试文件 + 直接读取被改文件的既有测试：

```bash
rtk proxy node --test scripts/tests/plan-index.test.mjs scripts/tests/session-explain.test.mjs scripts/tests/doctor.test.mjs scripts/tests/skill-streamlining-T03.test.mjs scripts/tests/skill-streamlining-T04.test.mjs scripts/tests/skill-streamlining-T08.test.mjs scripts/tests/skill-streamlining-T11.test.mjs scripts/tests/controlled-review.test.mjs
rtk proxy node scripts/validate-skills.mjs
rtk proxy node scripts/check-openai-sync.mjs
```

静态快检：不适用（无 tsc）。`.mjs` 用 `rtk proxy node --check <file>`；`.py` 用 `rtk proxy python3 -c "import ast,sys;ast.parse(open(sys.argv[1]).read())" <file>`。

## 体量说明

预期产品改动约 350 行（含 README 与测试）。tasks/*.md 合计约 1100 行，超出改动行数：文本类任务必须给旧文本锚点与新文本全文，对照本身即执行依据；已按 R1 去掉整文件内嵌与重复解释。

---

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 建立隔离工作区 | — | — | progress.notes：来源工作区绝对路径、来源分支、来源 HEAD、实施工作区与分支 |
| T01 证据留存规则与历史夹具收口 | T00 | T00 notes 的来源工作区绝对路径 | `.gitignore` 三条规则（execution/ 整目录、acceptance/* 除 acceptance-report.md）；索引不再含证据文件 |
| T02 writing-plans 计划体量规则 | T00 | — | `skills/writing-plans/SKILL.md` 新节「## 计划体量」：常量 200 行、30 行重合判定 |
| T03 plan-index 任务文件行数上限 | T02 | 「计划体量」节的 200 行数字 | `validate-output.mjs plan-index` 错误项 `{path:"tasks/TNN.md", expected:"<= 200 lines", actual:"N lines"}` |
| T04 requirement-analysis 档位裁剪 | T00 | — | spec-template「档位裁剪」表；spec-review 第二步 light 跳过 |
| T05 收尾审查编排文本 | T00 | — | review-orchestration「维度与路数」表 1/2/5；config 键 `critic`（on-findings/always）与 `evidence` 的文档定义 |
| T06 受控运行器对齐 | T05 | T05 定义的 `critic` 取值与 `evidence` 元素字段 `{task,phase,command,exit_code,stdout_sha256,stderr_sha256}` | `review_store.initialize` 接受 `critic`/`evidence`；roles regular=['AS','BC']；`context()` 返回 `execution_evidence` |
| T07 本地三时点测试 | T00 | — | plan-format「相关测试范围」推导规则：自有测试 + 直接导入方 |
| T08 test-strategy 本地三 lane | T07 | T07 的"任务内 / 最终任务"两时点 | lane 名 `fast` / `final` / `manual`；标记字面量 `manual-pending` |
| T09 acceptance-qa 复用执行证据 | T08 | lane 名与 `manual-pending` | acceptance-qa 阶段 2 unit/integration 回执复用规则 |
| T10 台账每任务一次提交 | T00 | — | delivery-templates 步骤 5 新文本；integration-groups `register_evidence` 无 checkpoint |
| T11 session-context 修复与去重 | T00 | — | `guardrail/session-context.mjs`：realpath 比较、引用判定、`spec-dev-session-<id>` 标记文件 |
| T12 合并与清理 | T01-T11 | T00 notes | 步骤 8：重写后的历史与提交号回填提交（交付后动作，需用户当场确认） |
