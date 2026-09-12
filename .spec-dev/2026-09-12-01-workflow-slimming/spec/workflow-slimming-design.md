---
spec_dev:
  version: 1
  feature: workflow-slimming
  status: active
  covers:
    - ".gitignore"
    - "skills/writing-plans/SKILL.md"
    - "skills/writing-plans/references/task-templates.md"
    - "skills/writing-plans/references/plan-format.md"
    - "skills/writing-plans/references/delivery-templates.md"
    - "skills/writing-plans/agents/openai.yaml"
    - "skills/requirement-analysis/SKILL.md"
    - "skills/requirement-analysis/assets/spec-template.md"
    - "skills/requirement-analysis/references/spec-review.md"
    - "skills/requirement-analysis/agents/openai.yaml"
    - "skills/executing-plans/SKILL.md"
    - "skills/executing-plans/references/review-orchestration.md"
    - "skills/executing-plans/references/integration-groups.md"
    - "skills/executing-plans/agents/openai.yaml"
    - "skills/executing-plans/evals/evals.json"
    - "skills/acceptance-qa/SKILL.md"
    - "skills/acceptance-qa/references/acceptance-matrix.md"
    - "skills/acceptance-qa/agents/openai.yaml"
    - "skills/test-strategy/**"
    - "skills/using-git-worktrees/SKILL.md"
    - "skills/using-git-worktrees/agents/openai.yaml"
    - "agents/code-reviewer.md"
    - "scripts/validate-output.mjs"
    - "scripts/lib/review_store.py"
    - "scripts/lib/review_process.py"
    - "scripts/lib/review_broker.py"
    - "scripts/tests/controlled-review.test.mjs"
    - "scripts/tests/plan-index.test.mjs"
    - "scripts/tests/session-explain.test.mjs"
    - "scripts/tests/skill-streamlining-T03.test.mjs"
    - "scripts/tests/workflow-slimming-*.test.mjs"
    - "guardrail/session-context.mjs"
    - "README.md"
    - "README.zh-CN.md"
  sync_commit: 33c9d8bd97c241959906234c3631a3a2a2e13afc
  supersedes:
    - ".spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md"
    - ".spec-dev/2026-09-06-03-review-conformance/spec/review-conformance-design.md"
    - ".spec-dev/2026-09-06-03-review-conformance/spec/controlled-review-design.md"
    - ".spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md"
  superseded_by: null
---

# 工作流瘦身设计

> 档位：light（本 spec 按 light 五节成稿；因存在相交 active spec，保留「取代与共存」节）。

## 背景与目标

2026-09-11 审计确认三点：编码前 plan 体量是代码改动的 1.4 到 7.6 倍，根因是 writing-plans 要求每步完整代码导致整文件内嵌；编码后尾巴 73 到 102 分钟，来自多路审查各自复跑测试、无条件派 completeness critic、以及验收矩阵把"实际模型任务"放进交付路径（单特性 26 个模型会话 3.6M token、47 个独立会话、findings 为 0）；单特性 130 次测试文件运行中 56% 是非本特性测试。本仓库无 CI、无 PR，全部测试本地运行，PR / nightly lane 没有真实执行槽位。

**成功标准**：改完后，计划文件不再整文件内嵌且单任务 ≤ 200 行；常规交付的收尾只有两路审查、零候选不派反驳与 critic、审查不复跑已有回执；每任务只跑自有测试，完整套件只在最终任务跑一次；模型级评测只在用户当轮显式要求时运行；执行日志与模型夹具不再进 git；会话注入不再误报、不再重复。

## 非目标

- 不改 TDD 红绿纪律本身，不改 HARD-GATE（任何档位仍在批准前零实施）。
- 不回填、不校验历史已交付计划的任务文件行数。
- 历史重写只清除 execution/ 与 acceptance/（acceptance-report.md 除外）两类证据路径，不改 spec、plan 与产品代码的历史。
- 不删除受控审查运行器；只调整路数、critic 条件与证据来源。
- 不新增 CI 工作流或 PR 通道。

## 已确认的关键决策

- 计划代码形态：改动要点 + 关键 diff 片段 + 验收断言；整文件内嵌以"与现行文件逐字重合超过 30 行"判定；单任务文件 200 行硬上限由 plan-index 校验拦截 —— 可执行、可拦截，优于口头劝诫。
- light 档合并阶段 5 与阶段 7 为一次批准、不派 spec-reviewer；standard 保留两门；deep 必派 reviewer —— light 省文书不省批准。
- 收尾路数 1 / 2 / 5（AS；AS + BC；五路），critic 仅在存在高/中候选、large 档或用户要求彻底时派发；审查以 execution/ 回执为证据 —— 归档的 9 份 review JSON 累计 findings 为 0，无条件扇出没有产出。
- 本地三 lane：fast（每任务）/ final（最终任务一次全量）/ manual（用户当轮显式要求）；删除 PR / nightly 语义 —— 无 CI 的仓库不该背 CI 的词表。
- 执行证据与验收产物一律留在本地：`execution/` 整目录、`acceptance/` 除 `acceptance-report.md` 外全部走 .gitignore；工作区已删除的 6423 个文件（含该特性的验收报告）按用户决定不恢复、直接提交删除 —— 插件缓存整份复制仓库树，184 MB 里 .spec-dev 占 184 MB，体积必须从源头砍。
- 一次性重写 git 历史，清除上述两类路径：历史 blob 中 489 MB 验收产物 + 32.7 MB 执行证据可清，保留 6.3 MB；186 个只碰证据的提交被剪空；重写后按 commit-map 回填 .spec-dev 与 CHANGELOG 里的提交号 —— 不可逆、需 force push，执行前当场取得用户确认。
- 资源台账随所属任务一次提交；register_evidence 不再单独 checkpoint —— 接受"崩溃窗口内登记未提交"的微小风险换取提交数下降一个量级。evidence_paths 指向本地文件，不再要求进 git。
- session-context：hooksPath 用 realpath 比较；守卫脚本缺失仅在仓库 hooks/settings 引用该脚本时告警；同 session_id 第二次注入静默跳过。

## 取代与共存

- [部分取代] `.spec-dev/2026-08-09-test-scoping/spec/test-scoping-design.md`：Requirement「基线验证按声明范围执行」—— 删除"声明失效回退完整套件"分支；Requirement「计划头部声明相关测试范围」—— 无工具时的推导改为自有测试 + 直接导入方，不再按 covers glob 兜底。
- [部分取代] `.spec-dev/2026-09-06-03-review-conformance/spec/review-conformance-design.md`：Requirement「规模化维度编排」—— 常规四路改两路 AS + BC；Requirement「完整性审查的证据覆盖」—— critic 由无条件派发改为有候选 / large / 用户要求时派发。
- [部分取代] `.spec-dev/2026-09-06-03-review-conformance/spec/controlled-review-design.md`：Requirement「证据由宿主管理」—— A / AS 在 tests 为空且宿主提供 execution 回执时不再要求亲自复跑。
- [部分取代] `.spec-dev/2026-08-26-01-major-upgrade/spec/major-upgrade-design.md`：Requirement「test-strategy skill」—— 三 Lane 由 fast/PR/nightly 改为本地 fast/final/manual。
- [分面共存] `.spec-dev/2026-09-11-01-skill-instruction-streamlining`、`2026-09-07-01-plan-decomposition`、`2026-08-27-01-plan-single-format`、`2026-09-06-02-tdd-seam`、`2026-09-06-01-concurrent-execution`、`2026-08-10-supersede-lifecycle`、`2026-09-03-02-portability-hygiene`、`2026-09-08-01-quick-fix-diagnosis`、`2026-09-10-01-status-overview`：同文件不同切面，行为不冲突；触及其 covers 的提交带 `Spec-Guard: off workflow-slimming (facet coexistence)` trailer。

## MODIFIED Requirements

### Requirement: R1 计划体量与代码形态（改了什么：完整代码改为片段，新增 200 行上限与校验）

writing-plans SHALL 以「改动要点 + 关键 diff 片段 + 验收断言」表达改代码的步骤，禁止整文件内嵌；`tasks/TNN.md` 超过 200 行时 `validate-output.mjs plan-index` SHALL 报错。

#### Scenario: S1.2 任务文件超过 200 行被拦截
- **GIVEN** 计划目录 tasks/T01.md 有 201 行
- **WHEN** 运行 plan-index 校验
- **THEN** 退出码 1，errors 含 `tasks/T01.md` 与 `<= 200 lines`；恰好 200 行通过

#### Scenario: S1.3 skill 文本不再要求完整代码
- **GIVEN** 读取 writing-plans 的策略全文（SKILL.md 及其引用）与 README、openai.yaml
- **WHEN** 检索关键词
- **THEN** 含「计划体量」「关键 diff 片段」「单任务文件上限 200 行」「禁止整文件内嵌」；不含「每步给完整代码」；SKILL.md 正文不含「零上下文」；README 不含「完整代码」/「complete code」

### Requirement: R2 spec 档位裁剪（改了什么：档位从"只调篇幅"变为裁剪小节集合与批准门）

requirement-analysis SHALL 按档位裁剪 spec 小节集合：light 五节且阶段 5 与阶段 7 合并为一次批准、不派 spec-reviewer；standard 约 15 节；deep 全模板。

#### Scenario: S2.1 light 一次批准
- **GIVEN** 读取 spec-review.md 与 requirement-analysis SKILL.md 阶段 5
- **WHEN** 检索
- **THEN** spec-review 第二步标注「light 档跳过本步」；阶段 5 含 light 档 spec 草稿随完整设计同条消息呈现、一次批准直接落盘的条款

#### Scenario: S2.2 模板标注档位
- **GIVEN** 读取 spec-template.md
- **WHEN** 检索
- **THEN** 顶部有「档位裁剪」表，light 行为「背景与目标、非目标、已确认的关键决策、行为规范」开头，deep 行为「全部小节」

#### Scenario: S2.3 反模式段不再要求全流程
- **GIVEN** 读取 requirement-analysis SKILL.md
- **WHEN** 检索
- **THEN** 不含「所有需求都要走完本流程」，含「light 档一次成稿一次批准」与「不派 spec-reviewer」

### Requirement: R3 收尾审查路数与证据（改了什么：四路改两路、复跑改读回执、critic 改条件派发）

收尾编排与受控运行器 SHALL 按小 diff 一路 AS、常规两路 AS + BC、大变更五路派发；审查以 execution/ 回执为测试证据；零高/中候选且非 large / 非用户要求时不派反驳与 critic。

#### Scenario: S3.1 常规档派发两路
- **GIVEN** tier regular 的 run
- **WHEN** status
- **THEN** tasks 的 actor 为 `['AS','BC']`

#### Scenario: S3.2 零发现时无反驳无 critic 即可完成
- **GIVEN** AS 与 BC 均零 findings
- **WHEN** run 结束
- **THEN** status completed，tasks 不含 refute-* 与 critic-*

#### Scenario: S3.3 tests 为空时以宿主 evidence 为证据
- **GIVEN** config `tests: []` 且 `evidence` 含一条 execution 回执
- **WHEN** AS 读取 context 并提交零发现报告
- **THEN** context 含 `execution_evidence` 一条；提交被接受，无需 run_test 回执

#### Scenario: S3.4 零候选但 AS 覆盖有缺口时不完成
- **GIVEN** AS 与 BC 均零 findings，但 AS 的 coverage 有一条 status 为 gap
- **WHEN** run 结束
- **THEN** status incomplete，gaps 含 `Scenario未覆盖: <该 Scenario>`；仍不派反驳与 critic

#### Scenario: S3.5 critic=always 零发现仍派 critic
- **GIVEN** config `critic: "always"` 且零 findings
- **WHEN** run 结束
- **THEN** tasks 含 critic-1，status completed

#### Scenario: S3.7 large 档默认五路且派 critic
- **GIVEN** tier large 的 run，未显式给 critic
- **WHEN** status
- **THEN** tasks 的 actor 为 `['A','B-quality','B-simple','C','S','critic-1']`

#### Scenario: S3.8 非法 config 被 init 拒绝
- **GIVEN** config 分别为：tests 为空且无 evidence；evidence 元素缺键；exit_code 为字符串；command 为字符串；sha256 非 64 位十六进制；critic 为 never
- **WHEN** init
- **THEN** 退出码非 0，gaps 分别含「tests为空时必须提供evidence」「evidence必须为execution回执数组」「critic必须为on-findings或always」

#### Scenario: S3.6 文本与 README 同步
- **GIVEN** 读取 review-orchestration、executing-plans SKILL.md、code-reviewer.md、README、executing-plans evals
- **WHEN** 检索
- **THEN** 路数表为「两路 AS + BC」，含 `facts.json`、「零候选时不派 critic」、「有候选才反驳与 critic」；不含「四路 A/B/C/S」「独立复跑相关测试，不采信自报告」「loop-until-dry」

### Requirement: R4 本地三时点测试（改了什么：删除全量回退，任务内不跑回归）

任务内 SHALL 只跑本任务目标测试与相关测试范围内的自有测试；T00 声明失效 SHALL 改跑自有测试而非完整套件；完整套件 SHALL 只在最终任务运行一次。

#### Scenario: S4.1 T00 声明失效不回退全量
- **GIVEN** 读取 task-templates.md 与 using-git-worktrees SKILL.md
- **WHEN** 检索
- **THEN** 含「不回退完整测试套件」/「不回退全量」，不含「回退运行完整测试套件」与「回退完整测试套件」

#### Scenario: S4.2 相关测试范围按自有测试与直接导入方推导
- **GIVEN** 读取 plan-format.md
- **WHEN** 检索
- **THEN** 含「直接 import/require」，不含「路径判定，不做依赖分析」

#### Scenario: S4.3 任务内不跑回归
- **GIVEN** 读取 executing-plans SKILL.md 阶段 3
- **WHEN** 检索
- **THEN** 含「不在任务内跑回归或完整套件」

### Requirement: R5 本地三 lane（改了什么：fast/PR/nightly 改为 fast/final/manual）

test-strategy 及其消费方 SHALL 使用 fast / final / manual 三 lane，manual 行 SHALL 不由 executing-plans 或 acceptance-qa 自动触发。

#### Scenario: S5.1 lane 定义与消费方同步
- **GIVEN** 读取 test-strategy 全部文件、acceptance-matrix.md、spec-template.md、acceptance-qa SKILL.md
- **WHEN** 检索
- **THEN** 含 `| **manual** |` 与 `manual-pending`；不含 `nightly`、`PR lane`、`fast/PR`

### Requirement: R6 验收复用执行证据（改了什么：standard 不再默认全套复核与审计）

acceptance-qa SHALL 以 execution/ facts.json 作为 unit/integration 回执，缺失、非零或早于变更才复跑；standard 档 SHALL 只复核 fail/warn，pass 审计仅 deep。

#### Scenario: S6.1 文本同步
- **GIVEN** 读取 acceptance-qa SKILL.md
- **WHEN** 检索
- **THEN** 含「不采信无回执的自报告」「facts.json」「pass 项不派证据审计」，不含「全套复核与审计」；仍含「不无条件追加全量」「未到期的最终全量记待执行」

### Requirement: R7 执行证据留存（改了什么：证据与验收产物不进 git，历史一次性清除）

仓库 .gitignore SHALL 排除 `.spec-dev/**/execution/` 整目录与 `.spec-dev/**/acceptance/*`，仅 `acceptance/acceptance-report.md` 例外；已跟踪的匹配文件 SHALL 从索引移除但保留在磁盘；git 历史 SHALL 一次性清除这两类路径。

#### Scenario: S7.1 证据与验收产物被忽略
- **GIVEN** 规则已写入
- **WHEN** `git check-ignore --no-index` 检查 execution 下 facts.json、acceptance/model 下 events.jsonl、acceptance 下 review-A.json
- **THEN** 三者均退出 0

#### Scenario: S7.2 报告、spec 与 plan 仍被跟踪
- **GIVEN** 同上
- **WHEN** 检查 acceptance/acceptance-report.md、spec/x-design.md、plan/progress.yaml
- **THEN** 均退出 1

#### Scenario: S7.3 索引不再含证据文件
- **GIVEN** T01 完成
- **WHEN** `git ls-files` 匹配 `/execution/` 或 `/acceptance/` 且非 acceptance-report.md
- **THEN** 结果为空

#### Scenario: S7.4 历史清除后体积与引用完整
- **GIVEN** 历史重写并 force push 完成
- **WHEN** 检查对象库与引用
- **THEN** `git rev-list --objects --all` 中无 execution/ 与 acceptance/（报告除外）路径；`size-pack` < 20 MiB；.spec-dev 与 CHANGELOG 中每个提交号经 `git cat-file -e` 均可解析

### Requirement: R8 台账每任务一次提交（改了什么：逐资源提交改为随任务一次提交）

资源登记与清理结果 SHALL 随所属任务的状态提交一起提交；register_evidence SHALL 不再单独 checkpoint；最终任务清理 SHALL 逐条执行后一次保存一次提交。

#### Scenario: S8.1 文本与示例同步
- **GIVEN** 读取 delivery-templates.md、integration-groups.md、executing-plans SKILL.md
- **WHEN** 检索
- **THEN** 含「一次提交」「不为单个资源单独提交」；integration-groups 的 register_evidence 示例不含 `chore: register`；不含「每次状态变化给出实际提交步骤」

### Requirement: R9 会话注入准确且不重复（改了什么：修两处误报，新增同会话去重）

session-context SHALL 以 realpath 比较 core.hooksPath，worktree 内解析到主工作区 `.githooks` 亦视为已启用；守卫脚本缺失告警仅当 `.githooks/*`、`.claude/settings.json` 或 `.codex/hooks.json` 引用该脚本；同一 session_id 在 60 秒内的第二次 SessionStart SHALL 输出 `decision: skip`（只吞同一事件的双注册，resume/compact 等后续事件重新注入）。

#### Scenario: S9.1 绝对路径 hooksPath 不误报
- **GIVEN** 临时仓库 core.hooksPath 为 .githooks 的绝对路径、有 .githooks/pre-commit、无守卫脚本且无引用
- **WHEN** `--explain`
- **THEN** `decision: inject` 且输出不含 `health issue`

#### Scenario: S9.2 引用守卫但脚本缺失仍告警
- **GIVEN** `.claude/settings.json` 含 `scripts/spec-dev/check-spec-drift.mjs` 且文件不存在
- **WHEN** `--explain`
- **THEN** 输出含 `1 health issue`

#### Scenario: S9.3 同一 session_id 第二次注入被跳过
- **GIVEN** stdin 传入 `{"session_id":"<唯一值>"}`
- **WHEN** 60 秒内连续运行两次 `--explain`，随后把标记改为 120 秒前或非数字再运行
- **THEN** 第一次 `decision: inject`，第二次 `decision: skip` 且 reason 含 `duplicate`；窗口到期或标记非数字时重新 `decision: inject`

#### Scenario: S9.4 worktree 内 hooksPath 指向主工作区 .githooks 不误报
- **GIVEN** 主仓库有 .githooks/pre-commit，core.hooksPath 为主仓库 .githooks 的绝对路径，`git worktree add` 建出从属工作区
- **WHEN** 在从属工作区运行 `--explain`
- **THEN** `decision: inject` 且输出不含 `health issue`

## 测试与验收策略

### 测试落点声明

公共落点：`scripts/tests/*.test.mjs`（node:test）读取 skill 文本或驱动 CLI；受控运行器经 `scripts/review-runner.py` 的 status / run / broker 入口；session-context 经 `node guardrail/session-context.mjs --explain`；plan-index 经 `node scripts/validate-output.mjs plan-index`。允许替换的外部依赖：无。

| Scenario | Lane / 维度 | 执行方式 | 验收证据 |
|---|---|---|---|
| S1.2 | fast / unit | 任务内 TDD（scripts/tests/plan-index.test.mjs） | 测试通过 |
| S1.3、S2.1—S2.3、S3.6、S4.1—S4.3、S5.1、S6.1、S8.1 | fast / docs | 任务内 TDD（scripts/tests/workflow-slimming-TNN.test.mjs） | 测试通过 |
| S3.1—S3.5、S3.7、S3.8 | fast / integration | 任务内 TDD（scripts/tests/controlled-review.test.mjs） | 测试通过 |
| S7.1、S7.2 | fast / unit | 任务内 TDD（scripts/tests/workflow-slimming-T01.test.mjs） | 测试通过 |
| S7.3 | fast / unit | T01 步骤 4 内联检查 | `git ls-files` 过滤结果为空 |
| S7.4 | manual | T12 步骤 8 内联检查（重写属交付后动作，用户当场确认后执行） | count-objects 与 cat-file 输出 |
| S9.1—S9.4 | fast / integration | 任务内 TDD（scripts/tests/session-explain.test.mjs） | 测试通过 |
| 全量回归 | final | 最终任务一次 `rtk proxy node --test 'scripts/tests/*.test.mjs'` | 全绿或范围外失败归属裁决 |
