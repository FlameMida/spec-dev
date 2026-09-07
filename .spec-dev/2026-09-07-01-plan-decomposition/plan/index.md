# 计划分解与集成组实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill，从 T00 开始由主线程逐票串行执行；技能不可用时按本计划自足步骤执行。状态只写 `progress.yaml`，任务正文不以复选框跟踪。携带本计划须连同特性目录整体带走。
>
> **偏差处理**：唯一锚点或路径的小漂移，核对意图后就地修订并记录；状态协议、公共接口、授权门、证据等级变化先回设计，不猜着执行。普通“继续”不启动并发。

**目标**：交付 roadmap skill-ecosystem-absorption 第 5/8 项，让宽面迁移保留独立任务与实现提交，通过显式集成组统一验证，并补齐计划分解与需求输入规则。

**Spec**：[plan-decomposition-design.md](../spec/plan-decomposition-design.md)，active；[独立设计审查](../spec/design-review.md) Approved；[ADR-0008](../../adr/0008-integration-groups.md) Accepted。用户已批准方案 2、完整设计、spec 与编写计划；实施尚未开始。

**架构**：现有 plan-index 增量校验声明，新 plan-state 只读核对 v2/Git/证据；writing-plans 定义静态计划，integration-groups reference 定义执行协议，串并行入口引用；TDD/test-strategy 与 RA 沿原定义点补齐对应规则。无新 skill、调度服务、YAML 依赖或普通 implementer schema。

**技术栈**：现有 Node.js ESM/node:test、Markdown、JSON（组计划 progress.yaml 使用 JSON 子集）、Git；计划编辑和有界验收脚本用 Python 3 标准库，无新增依赖。

**设计原则**：不留兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策。获批 expand–contract 临时旧形必须在明确 contract 票删除；本项自身是逐票可验证的普通实现，不使用尚未交付的组机制调度自身。

## 文件结构与职责

| 文件组 | 职责 | 任务 |
|---|---|---|
| scripts/lib/integration-plan.mjs、validate-output.mjs、integration-plan/plan-state Node tests | 声明、v2状态、真实Git/路径/日志校验与公共CLI | T01–T03 |
| scripts/schemas/README.md | 公共CLI输入/输出与版本边界；不新增JSON schema文件 | T03 |
| executing-plans、executing-plans-parallel 及新 integration-groups.md | 持锁、待验、统一完成、修复恢复和模式规则 | T04 |
| writing-plans、design-principles、README、plugin-root.test.mjs | 类型化步骤、依赖第五查、迁移分解及原位更新旧四查断言 | T05 |
| test-driven-development、test-strategy | 有效红、前后保护及组验证时机 | T06 |
| requirement-analysis、exploration-patterns/spec-template/roadmap-template/codex-compat、README | 测试先例、真实参与者、约束归属、拒绝解读和gist | T07 |
| 上述六个技能的 openai.yaml/evals.json | 同票同步元数据；具名意图输入与独立预期 | T04–T07 |
| 本特性 execution/acceptance 与 spec/progress、三份旧spec、roadmap | 证据、取代回写、资源闭合与本地交付 | T00、T08–T09 |

## 全局约束与公共测试落点

- 默认串行、普通 v1 进度，无 integration/parallel 声明。T01—T03共享同一CLI模块，T04—T07消费单点协议且有共享文件，按真实依赖串行；不凭“多票”授权多人写共享目录。
- 机器公共 seam：`node scripts/validate-output.mjs plan-index <plan-dir>` 的 JSON/exit 与 `plan-state <plan-dir>` 的 JSON/exit/ready_tasks，完整签名见 spec「公共校验接口」。不为内部函数加独立测试入口；真实文件/Git/common-dir/路径/哈希均不 mock。受控损坏夹具只证明拒绝分支，不证明自主模型做过测试。
- 模型 seam：实际客户端加载候选根、真实输入/输出/工具trace、Git/文件状态；THEN 单独保存在判读资料，不能喂入提示。模型是非确定性依赖，实际配置继承本机并记录，不假定历史模型或擅改预算。只读回答、实际写入、受控进程分别标注。
- T01—T03 的 Node 行为测试和 T05 四查断言按有效红→绿；技能规则用具名 eval 意图加实际模型前后探针，文本缺句不是模型失败。旧规则若已经满足固定用例，记录该例既有通过、减少无用改动，不伪造 red；T08 全矩阵不省略。纯重构不造假红。
- 普通 implementer 五步/结果 schema/verifyResult 保留。组能力缺失停止的保证只约束遵守入口的执行者，不宣称可强制旧客户端；CLI不取锁、不执行任务命令。
- 保留中文描述、语言协议、plugin-root 引用及既有封装。每改 SKILL 同票同步对应 openai.yaml；不新增 trigger-evals 或修改 vendored 同步器。
- 计划中的代码块是未来实施内容，未运行。各票的精确 Python 替换块只运行一次；每个 anchor 唯一才写。恢复时先核实已落地代码/提交/证据，不能机械重放全部脚本。
- 后续实施命令 cwd 为 T00 核验后的 worktree；用 RTK。普通实施按仓库发版钩子，读最终 HEAD 后另存状态；本轮只提交计划文档并 `SKIP_RELEASE_HOOK=1`，不 push。

## 关联 skill 与来源

| Skill | 时机 / 任务 | 仓库来源指针 |
|---|---|---|
| using-git-worktrees | T00 隔离及所有权核验 | skills/using-git-worktrees/SKILL.md |
| executing-plans | 全计划执行、进度、原有收尾审查与交付 | skills/executing-plans/SKILL.md |
| test-driven-development | T01—T07 的适用验证纪律与修复 | skills/test-driven-development/SKILL.md |
| test-strategy | T01—T09 的Lane、真实模型边界与验收 | skills/test-strategy/SKILL.md |
| writing-plans | 本计划结构、四列接口和Self-Review | skills/writing-plans/SKILL.md |
| acceptance-qa | T08，由执行收尾触发 | skills/acceptance-qa/SKILL.md |

新 integration-groups reference 是 T04 的交付物，本计划普通任务不依赖其运行；验证新组能力的夹具必须使用本次候选CLI/reference，无法加载即blocked。公共seam以已批准spec/本票接口为准，不由技能引用重新批准。

## 相关测试范围

根 package.json 无依赖与 scripts/typecheck，T00 复核后无需安装依赖。基线为：

```bash
rtk proxy node --test scripts/tests/plan-index.test.mjs scripts/tests/plan-single-format.test.mjs scripts/tests/parallel-plan.test.mjs scripts/tests/parallel-integration.test.mjs scripts/tests/plugin-root.test.mjs scripts/tests/search-clause.test.mjs
rtk proxy node scripts/validate-skills.mjs
rtk proxy node scripts/check-plugin.mjs --codex-validate
```

T01 新增 integration-plan.test.mjs，T02 新增 plan-state.test.mjs；计入后续影响范围及最终安全网。声明失效回退完整 Node 套件并记录原因，失败不因范围外而自动忽略。修改批次用 validate-skills/check-plugin 做静态快检；typecheck 不适用，静态检查不代替行为或模型证据。

## 证据、提交与唯一状态写入

- T00 记录原始 base_commit、真实来源分支/路径；progress 唯一主线程写者。普通 v1 任务用 pending/in_progress/completed/blocked，不把本项开发票标 awaiting_verification。
- 所有 Python 块通过 `rtk proxy python3 - <<'PY'` 执行，末行 `PY`；bash块逐行核实先决条件，禁止看到多行就无条件全跑。代码块不存在对本轮 `/tmp` 作者脚本的运行依赖。
- 证据命令可用下列完整标准库包装器，设置 `PD_TASK` 与 `PD_CHECK` 标识；同名文件已存在就停止，使用新check名称保留失败。记录 exit 不自动产生 PASS，真实测试数量、skip、语义和模型动作由执行者/审查者判读。

```python
from pathlib import Path
import os,json,subprocess,time
root=Path.cwd().resolve();tid=os.environ.get('PD_TASK','T00');check=os.environ.get('PD_CHECK','baseline')
assert tid in [f'T{i:02}' for i in range(10)]
assert check.replace('-','').replace('_','').isalnum()
out=root/'.spec-dev/2026-09-07-01-plan-decomposition/execution/serial'/tid/check
out.mkdir(parents=True,exist_ok=False)
cmd=['rtk','proxy','node','--test','scripts/tests/plan-index.test.mjs','scripts/tests/plan-single-format.test.mjs','scripts/tests/parallel-plan.test.mjs','scripts/tests/parallel-integration.test.mjs','scripts/tests/plugin-root.test.mjs','scripts/tests/search-clause.test.mjs']
start=time.monotonic()
with (out/'stdout.log').open('w') as stdout,(out/'stderr.log').open('w') as stderr:
 p=subprocess.Popen(cmd,cwd=root,stdin=subprocess.DEVNULL,stdout=stdout,stderr=stderr)
 while p.poll() is None:
  try:p.wait(timeout=30)
  except subprocess.TimeoutExpired:print(tid,check,'running',round(time.monotonic()-start),flush=True)
(out/'facts.json').write_text(json.dumps({'command':cmd,'cwd':str(root),'exit':p.returncode,'elapsed':time.monotonic()-start},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(p.returncode)
```

每次只将 cmd 数组换为本票明确列出的真实命令；最终全量 cmd 使用 `['rtk','proxy','node','--test',*sorted(str(p) for p in Path('scripts/tests').glob('*.test.mjs'))]` 并断言列表非空。包装器不终止未知进程、不改变测试语义。持久进程创建即登记PID/所有权，活跃写者停止后才运行不可变工作区测试。

progress 原子保存代码如下：调用前设置 PD_TASK/PD_STATUS；completed 时必须将核验过的实际提交和测试摘要传入 PD_COMMIT/PD_TESTS，没有值就拒绝写入。本计划初始即为 v1 JSON 子集，无需通用YAML依赖，不改变 format_version。

```python
from pathlib import Path
import json,os
p=Path('.spec-dev/2026-09-07-01-plan-decomposition/plan/progress.yaml')
state=json.loads(p.read_text())
tid=os.environ['PD_TASK'];status=os.environ['PD_STATUS']
assert tid in state['tasks'] and status in ['pending','in_progress','completed','blocked']
record=dict(state['tasks'][tid]);record['status']=status
if status=='completed':
 import subprocess
 commit=os.environ['PD_COMMIT'];tests=os.environ['PD_TESTS'];assert tests.strip()
 subprocess.run(['rtk','proxy','git','cat-file','-e',commit+'^{commit}'],check=True)
 record.update(commit=commit,tests=tests)
state['tasks'][tid]=record;state['current']=tid if status in ['in_progress','blocked'] else None
tmp=p.with_name(p.name+'.tmp')
with tmp.open('x') as f:
 f.write(json.dumps(state,ensure_ascii=False,indent=2)+'\n');f.flush();os.fsync(f.fileno())
os.replace(tmp,p)
```

- 暂存限定本票产品、spec实施记录、进度及本票证据。QA嵌套仓库/工作区不直接 `git add` 成 submodule；先归档bundle/diff/状态/日志，再暂存普通证据文件。生成资源只由 resources 台账记录清理权。
- 暂存后运行 `rtk proxy node guardrail/check-spec-drift.mjs --staged` 并保存真实输出、`rtk git diff --cached --check`。本 spec「取代与共存」列出的旧契约仅分面交集时，沿原合法提交机制单次 `SPEC_DEV_GUARD=off` 与 `Spec-Guard: off` trailer 写明实际文件/旧Requirement/不变切面，不全局关闭守卫；新契约冲突停止。
- 提交正文用文件传入，包含 `Spec: .spec-dev/2026-09-07-01-plan-decomposition/spec/plan-decomposition-design.md` 与本票真实共存理由；不跳过 pre-commit。普通实施提交后检查自动发版改动与最终HEAD；无法归属的业务树变化先阻塞，不混入已验证事实。文档/证据/状态提交跳过发版。
- 模型环境不可用/超时/授权拒绝分别记 BLOCKED/not_run；不得以重写预期、放宽权限或补填exit=0造通过。nightly >=3trial 单独非阻塞，PR要求仍逐项满足。

## 任务导航表

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 隔离与相关范围基线 | — | 已提交且获准执行的 spec/plan，来源 `/Users/maverick/feature-dev` | 绑定的隔离目录/分支、原始 base_commit、真实基线与资源台账；后续命令 cwd 固定为核验后的 worktree |
| T01 校验集成组声明与依赖出口 | T00 | T00 隔离与基线；现有 plan-index CLI | plan-index 增量结构校验；loadIntegrationPlan(planDir) 内部复用数据（公共 seam 仍为 CLI） |
| T02 实现v2状态与组内外解锁 | T01 | T01 loadIntegrationPlan(planDir)；spec v2字段与状态转换 | plan-state CLI 的 JSON/exit/ready_tasks；validateStateShape、组内外 ready 规则 |
| T03 核验Git证据与恢复检查点 | T02 | T02 v2状态/ready 与公共 plan-state；实际 Git仓库及日志 | plan-state 拒绝未提交状态、错绑SHA/分支/证据、未知业务树；只读恢复事实 |
| T04 接入集成组执行与恢复协议 | T03 | T03 plan-state CLI/真实证据；原特性锁与并发接收纪律 | 串并行入口消费 integration-groups 单点；主线程分票待验/统一完成及恢复 |
| T05 生成类型化任务和集成组计划 | T04 | T04 集成组协议；T01-T03 public校验；现有三件套/四列导航 | writing-plans 组声明/v2字段单点、T01必要重构、第五查和关联skill |
| T06 统一前置重构与组验证纪律 | T05 | T05 类型化任务和共享判据；已获批公共seam | TDD/test-strategy 前置/组/收尾验证时机与有效红边界 |
| T07 补齐需求与上下文分解输入 | T06 | T05 约束判据/关联skill；T06公共验证纪律 | RA 测试先例、参与者、拒绝解读、review检查点和gist+pointer |
| T08 全矩阵验收与独立对账 | T07 | T01—T07 产品、原始 base_commit、33 Scenario 与执行证据 | 逐 Scenario 的真实状态、自动回归、模型只读/可写/受控三类证据和独立审查/完整性对账 |
| T09 全量安全网、本地交付与资源清理 | T08 | T08 必需矩阵与独立审查通过、原始 base_commit、资源所有权、七条部分取代映射 | 最终全量证据、本地来源分支的实际合并提交、资源处置、sync_commit 与 roadmap delivered |

## Requirement 与 Scenario 覆盖

| Requirement | Scenario | 实现任务 | 验证/交付任务 |
|---|---|---|---|
| A01 | S01、S02 | T05 | T08 |
| A02 | S03、S04 | T01 | T01、T08 |
| A03 | S05、S06 | T02、T04、T06 | T02、T04、T08 |
| A04 | S07、S08 | T02、T04 | T02、T08 |
| A05 | S09、S10 | T03、T04 | T03、T08 |
| A06 | S11、S12 | T02、T03、T04 | T02、T03、T08 |
| A07 | S13 | T04 | T04、T08 |
| A08 | S14、S15、S16 | T03、T04 | T03、T08 |
| A09 | S17、S18 | T01、T03、T04 | T01、T03、T08 |
| A10 | S19 | T05、T06 | T05、T08 |
| A11 | S20 | T05 | T05、T08 |
| A12 | S21 | T05、T07 | T07、T08 |
| A13 | S22 | T07 | T07、T08 |
| A14 | S23 | T07 | T07、T08 |
| A15 | S24、S25 | T05、T07 | T07、T08 |
| A16 | S26 | T05 | T05、T08 |
| M01 | S27 | T01、T02、T05 | T05、T08、T09 |
| M02 | S28 | T04 | T04、T08、T09 |
| M03 | S29 | T02、T04 | T02、T08、T09 |
| M04 | S30 | T04、T06 | T06、T08、T09 |
| M05 | S31 | T06 | T06、T08、T09 |
| M06 | S32 | T05 | T05、T08、T09 |
| M07 | S33 | T07 | T07、T08、T09 |

完整 GIVEN/WHEN/THEN 在 spec；机器断言位于 T01—T03，技能输入/独立预期在 T04—T07，T08 表逐行承接 PR 与 nightly 矩阵。M01—M07 的旧标记由 T09 最后回写；没有 REMOVED Requirement，不额外删除有效测试。

## 依赖最小性与计划检查

T00 保证隔离及基线；T01→T02→T03 是声明数据→状态语义→真实证据的可运行接口链；T04依赖完整CLI后才接执行入口；T05消费执行协议并定义模板/共享判据；T06消费类型及保护时机；T07通过T06传递依赖T05，并消费共享判据与验证规则；T08通过T07传递覆盖全部实施票；T09只消费验收结论。导航省略传递冗余边，没有删除安全边来制造并发。

2026-09-07 主线程完成五项 Self-Review：23 Requirement/33 Scenario 均有任务落点；十张任务票与导航一致；接口及传递依赖已对照。当前 plan-index 实际 exit 0；64 个精确替换锚点按任务顺序内存模拟通过，32 个 Python 块/29 个 Bash 块语法有效，5 个拟修改 JavaScript 文件与5份验收Python脚本语法有效，32个拟修改产品路径均在spec covers内。31个新增具名eval案例（S03/S04另由公共CLI夹具覆盖）ID唯一、重复分发的期望一致；原四查存量断言已安排T05原位更新。没有将候选代码写入产品或运行候选测试/模型验收；上述检查只证明计划可读取与语法/锚点一致。所有任务仍pending，正式实施等待用户授权。
