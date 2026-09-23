# 工作流一致性实施计划

> **执行方式**：使用 executing-plans，默认主线程串行。先执行 T00，随后按依赖连续执行至 T14；T15 取得 final 全量回执后做独立审查、矩阵证据对账，最后执行 T16。状态仅在 progress.yaml；任务正文不使用复选框。无插件时按本 index 与各票完整步骤执行。
>
> **偏差处理**：路径笔误等意图明确的小偏差就地修正并记录；数据字段、授权或验证语义变化先回到 spec 裁决，不用放宽断言绕过失败。

**目标**：修复任务守卫、恢复、证据与交付的六处断点，统一三处规则及其图文说明。

**Spec**：[workflow-consistency-design.md](../spec/workflow-consistency-design.md)，14 条 Requirement、27 个 Scenario；已 active。代码规划基准 `23d6934`，规划完成提交是 T00 的实际起点。

**架构**：独立守卫复用小型纯数据解析和范围判据；计划仍是静态定义，progress 或旧单文件复选框仍是唯一运行状态。原始证据留本地；来源历史和交付映射连接最终目标。新机制先在真实 Git 夹具中完成，再同步执行说明。

**技术栈**：Node.js 标准库/ESM、Python 3 标准库、Git、node:test；不新增第三方依赖。工作目录默认本票绑定的仓库根，所有 shell 命令使用 rtk。

**关联 skill**：executing-plans（执行）；test-driven-development（T02—T14 行为红绿；T01 纯重构保绿）；test-strategy（目标/final/manual 分层）；using-git-worktrees（T00）；writing-plans 的资源台账与 delivery-templates（T16）。本 spec 的 final 前移优先于旧模板的“最终任务里首次全量”。

**设计原则**：遵循不留兼容垫片、最简实现、分层构建、不以未完成复杂性换产品、模块化、优先成熟工具、优先已有依赖和长期决策。读取历史格式是现行数据合同；新实现不双写竞争状态。完整判据见 [design-principles.md](../../../skills/writing-plans/references/design-principles.md)。

## 全局约束

- 仅执行本次批准范围。`hooks/hooks.json` 是来源原有 dirty 文件，保存哈希并原样保留；不得 reset/stash/clean 或纳入本次提交。
- 本计划是产生新协议的引导计划：当前可用 v1 进度/parallel 语法用于自身编排；新绑定/安装器仅在夹具中验证，不在源仓库提前安装尚未完成的守卫。若实际宿主守卫阻止必要动作，沿已有授权/明确例外处理，不伪改 spec。
- T00 前不创建实施 worktree。T00 记录真实来源路径/分支/HEAD、实际实施路径/分支及 created/inherited 归属。计划默认建议分支 `codex/workflow-consistency`，手工目录 `.worktrees/workflow-consistency`；实际值以回执为准。
- 本次不自动发版：任务/状态提交都使用仓库已有 `SKIP_RELEASE_HOOK=1`，避免 post-commit 修改版本、CHANGELOG 和 tags。实际 code 提交保留正常 pre-commit；纯计划/进度提交可按仓库文档使用 `SKIP_CODEX_PACKAGE_HOOK=1`，仍检查 staged diff。
- SKILL 的触发/职责描述变化同步对应 openai.yaml；仅正文变化而元数据语义确实不变时，实际核对后可使用仓库已有 `SKIP_OPENAI_SYNC_CHECK=1` 并记录理由，不制造无意义字段变更来凑暂存同步。
- 已存在接口的有效红必须是公共行为断言失败。T01 不伪造红；新文件不存在、导入失败、环境缺件和零测试不算红。T07 先复现现有 record_check 的 ignore 故障，再分循环扩展新工具行为。
- 不能同时更新竞争写集合；普通并发历史声明保持可读，新声明只引用共用范围。主线程管理字段不授予 implementer `.spec-dev` 写权限。
- 本计划无集成组：每票可独立验证，不生成 v2 组声明或锁协议。对产品中既有 v2 的修改用真实夹具验证，不把本计划伪装为组计划。
- 真实模型任务属于 manual，未获当轮显式执行要求时记录 manual-pending；静态指令检查不声称模型遵循 PASS。

## 相关测试范围与快检

T00 只跑现存相关文件：`rtk proxy node --test scripts/tests/integration-plan.test.mjs scripts/tests/plan-state.test.mjs scripts/tests/plan-index.test.mjs scripts/tests/parallel-plan.test.mjs scripts/tests/parallel-integration.test.mjs scripts/tests/status-parse.test.mjs scripts/tests/status-plan.test.mjs scripts/tests/controlled-review.test.mjs scripts/tests/workflow-slimming-T05.test.mjs scripts/tests/workflow-slimming-T09.test.mjs scripts/tests/plan-single-format.test.mjs`。

后续每票只跑本票列出的目标文件；新增自有文件为 `task-scopes.test.mjs`、`task-binding.test.mjs`、`drift-guard.test.mjs`、`guard-install.test.mjs`、`execution-evidence.test.mjs`、`evidence-transfer.test.mjs`、`workflow-consistency.test.mjs`。文件尚不存在时 T00 不补空测试，不回退全量。

快检：修改的 `.mjs` 使用 `rtk proxy node --check <本票具体文件>`；Python 用 `compile(source, filename, 'exec')` 在内存检查，不生成 pycache。Node 测试中的 Git/目录夹具是本地可控 IO，不接真实远端。未定义 typecheck，不虚构 tsc。完整 `rtk proxy node --test scripts/tests/*.test.mjs` 仅在 T15；必要补验按 spec M05。

## 任务导航

| 任务 | 依赖 | 消费接口 | 产出接口 |
|---|---|---|---|
| T00 [隔离与基线](tasks/T00.md) | — | Git/worktree 工具回执、当前 progress JSON | notes 的真实来源/实施绑定、T00.commit、资源归属 |
| T01 [纯数据解析归位](tasks/T01.md) | T00 | parseUniqueJson(text)、parseRecord(text) 现有行为 | guardrail/lib/record-data.mjs 的同名纯函数；原公共导出保持 |
| T02 [共用静态任务范围](tasks/T02.md) | T01 | parseUniqueJson、parseRecord；plan-index CLI | readScopes(markdown,ids)、scopeFingerprint(view,plan,task)、共用路径判据；workflowFixture(t) |
| T03 [任务绑定与本地定位](tasks/T03.md) | T02 | readScopes、scopeFingerprint、Git view | task-binding.mjs bind/inspect/clear；readBinding(repo,receipt,view) |
| T04 [守卫各视图与历史判定](tasks/T04.md) | T03 | readBinding、spec parse/glob | check-spec-drift 各原模式的逐视图核验；ScopeViolation |
| T05 [提交关联与独立安装](tasks/T05.md) | T04 | Spec-Task 关联、bind/inspect | prepare-commit-msg/commit-msg 接线；独立安装后的全入口守卫 |
| T06 [当前票与旧计划恢复](tasks/T06.md) | T03 | v1/v2/legacy 记录、当前绑定 | current 优先的 ready；旧单文件局部补齐/静态投影 |
| T07 [真实回执记录](tasks/T07.md) | T01 | 原 record_check、businessTree、真实子进程 | execution-evidence record/verify；Receipt v1；组证据不再提交 |
| T08 [转存与断点保全](tasks/T08.md) | T02,T07 | Receipt v1、旧组记录、workflowFixture | execution-evidence transfer；TransferManifest；清理前证明 |
| T09 [最终交付映射](tasks/T09.md) | T06,T08 | plan-state、Receipt/TransferManifest、真实 Git | progress.delivery、verifyDelivery(root,state)、来源归档 ref |
| T10 [回执导入与失效](tasks/T10.md) | T07 | Receipt v1、受控 review init/broker | review 外部证据真实导入；严格 run 快照与语义复用分离 |
| T11 [critic 条件统一](tasks/T11.md) | T10 | review init/tasks/status | large+on-findings 拒绝；适用 critic 完成判据 |
| T12 [无环模板与恢复文档](tasks/T12.md) | T05,T09,T11 | 安装协议、含恢复的 plan-state、final_task 声明 | F→审查→验收/对账→D 的完整模板和证据消费说明 |
| T13 [图表与入口精简](tasks/T13.md) | T12 | 已定稿规则、policy-documents 读取器 | 决策图/状态表/阅读表、简介和 README 双语同步 |
| T14 [组合回归与发布材料检查](tasks/T14.md) | T13 | 安装器、guard、plan-state、review CLI | S01—S27 覆盖审计及组合回归，不冒充模型行为验收 |
| T15 [final 全量与审查输入](tasks/T15.md) | T14 | 全部实施票、execution-evidence CLI | 当前候选 final 回执、审查输入、manual 边界 |
| T16 [交付、转存与归档](tasks/T16.md) | T15 | 实际独立审查/对账回执、T00 绑定 | 实际合并、证据移交、清理、sync_commit、最终状态 |

### 可选并发声明

默认不启用。T04 与 T06 的文件不相交、均消费 T03 的固定接口；T08 与 T10 均消费 T07，分别改转存与审查导入。其余链路存在接口或同文件依赖；T01/T00/T15/T16 由主线程执行。声明沿当前可用格式，不提前调用拟实现的新 parser。

```yaml spec-dev-parallel
parallel:
  tasks:
    T04:
      writes:
        - "guardrail/check-spec-drift.mjs"
        - "guardrail/lib/git-view.mjs"
        - "guardrail/lib/spec-data.mjs"
        - "scripts/tests/drift-guard.test.mjs"
      resources: []
    T06:
      writes:
        - "scripts/lib/integration-plan.mjs"
        - "scripts/lib/status-parse.mjs"
        - "guardrail/lib/task-binding.mjs"
        - "scripts/tests/plan-state.test.mjs"
        - "scripts/tests/status-plan.test.mjs"
        - "scripts/tests/task-binding.test.mjs"
      resources: []
    T08:
      writes:
        - "scripts/execution-evidence.mjs"
        - "scripts/lib/execution-evidence.mjs"
        - "scripts/tests/evidence-transfer.test.mjs"
      resources: []
    T10:
      writes:
        - "scripts/lib/review_store.py"
        - "scripts/lib/review_broker.py"
        - "scripts/tests/controlled-review.test.mjs"
      resources: []
```

## 接口与数据定稿

下列字段是本计划内相邻任务共用合同；函数内部拆分可按实际代码调整，公共 CLI、字段含义和失败语义改变须先修订本计划。

### 静态范围与版本

新计划增加一个 `json spec-dev-scopes` fenced block：`{version:1, final_task:"T15", acceptance_tasks:[], tasks:{T01:{writes:[精确路径],specs:[仓库相对spec路径],authorization_ref:可恢复来源字符串}}}`。不在该块存 commit、自身哈希或运行状态。task key 与导航/旧单文件标题映射一致；普通实施写集非空，主线程验证/隔离/交付可为空；并发仍必须有非空业务写集。

`readScopes(markdown, taskIds)` 返回该对象或 null；重复块/JSON 键、悬空 ID、非法路径拒绝。`parseParallelBlock` 在有 scopes 时只从共用 tasks 取得 writes，parallel 块只声明 resources；同时出现第二份 writes 即拒绝。无 scopes 的历史声明沿原读取，不双写升级。

含 scopes 的 plan-index 成功回执在原字段外带 `scope_protocol_version:1`；新消费方要求该值，避免旧校验器静默忽略新块后仅凭 ok 放行。无 scopes 的历史回执保持原形。这是范围数据能力标识，不是新增执行器版本或状态源。

`scopeFingerprint(view, planPath, taskId)` 返回 `{digest,spec_blobs,task_digest}`：计划全局约束/导航/范围、该任务正文及关联 spec 的静态内容均参与 SHA-256。旧单文件只归一化已识别任务下的复选框状态字符，保留整行正文；精确排除本协议声明的运行记录块，不笼统排除 Markdown。

### 绑定与提交关联

分文件 `tasks.TNN.binding`：`{scope_commit,scope_digest,authorization_ref,worktree,branch,claim_key:null或字符串,claim_checkpoint:null或SHA}`。scope_commit 指绑定建立前已存在的静态范围版本；它不是包含自己字段的提交。状态更新由主线程原子保存并提交，生成 authority 提交后才能 activate 本地回执。

本地回执位于 `git rev-parse --git-path spec-dev-task.json`，只含 `{version:1,plan,task,authority,worktree,branch}`，通过真实 Git dir 区分各 worktree。`task-binding.mjs bind --plan <仓库相对路径> --task TNN --authority <已存在SHA>` 校验并写该引用；`inspect` 只读输出绑定和缺口；`clear` 只清本工作区本计划已核验回执，不清任务状态。

旧单文件保持复选框，在原文的范围块保存静态授权来源；authority 指该已提交版本，本地回执显式选择 task key，不额外生成 progress。分文件从 authority 的进度读取 binding。并发工作区从已验证代码基线建立，claim 检查点可能位于集成分支：scope_commit 须先于实现基线，claim_checkpoint 则核对真实 claim 及集成上下文，不能错误要求它是 implementer 初始 HEAD 的祖先。

实现提交使用一行 `Spec-Task: {"plan":"仓库相对计划入口","task":"T01","authority":"完整提交SHA"}`。prepare-commit-msg 只从有效本地回执补缺失关联；commit-msg 拒绝不匹配/重复关联。不同用户原有 hook 内容保留。历史入口解析关联并核对每个提交的文件及对应 spec 视图；普通 `Spec:` 不升级为授权。最终 squash 使用 delivery 的来源关系，不伪造普通票 ancestry。

### Receipt v1 与转存

普通回执字段：`{version:1,task,phase,command,cwd,exit_code,commit,tree,scope,stdout,stderr,stdout_sha256,stderr_sha256}`。scope 为 `{kind:"repository",outputs:[]}` 或 `{kind:"paths",paths:[精确路径],digest,outputs:[]}`；默认完整仓库，仅排除本特性 progress 和 execution，显式 paths 必须来自获批验证范围。outputs 只允许已声明的本特性 `acceptance/acceptance-report.md` 生成结果；CLI 用 `--output acceptance/acceptance-report.md` 显式指定，不能排除 skill/spec/测试或任意 Markdown。若项目把此报告当测试输入，则不得列为 output。新增未声明业务文件使 repository scope 失效。命令、fixture/测试配置与适用契约变化按 spec M05 判失效，不用 writes 冒充测试依赖闭包。

`node scripts/execution-evidence.mjs record --feature <特性绝对目录> --task TNN --phase <baseline|red|green|final|integration> --attempt <唯一名> [--output acceptance/acceptance-report.md] -- <argv...>` 真正运行命令，原件写 `execution/tasks/TNN/<attempt>/`，返回 `{ok,record,exit_code}`；record 返回 0 表示成功保存，不代表被测命令通过，调用者检查 exit_code。重复 attempt/越界/执行前后额外脏改动拒绝且保留原输出。已有组记录按原十字段读取，不改写其历史 bytes。T07 同时导出 `businessTree(repo,featureRelativePath,commit)`，复用组的十字段树算法，供交付证明调用；Receipt 的显式 scope 与该全树标识分开记录。

`verify --feature <目录> --record <相对路径> --candidate <SHA>`：只读核验原件/命令/内容归属，stdout `{ok,record:已核验记录对象,record_path,candidate,scope,files:{stdout:{path,sha256},stderr:{path,sha256}}}`，不匹配 exit1。record 子命令的 record 是相对路径，verify 子命令的 record 是内容，消费方按子命令区分。`transfer --source <特性目录> --target <存活特性目录>`：先验证被引用原件和失败尝试，复制临时文件后逐字节核验并发布；同名同字节幂等、不同字节拒绝。返回 `{ok,files:[{path,sha256}],source,target}`，不删除来源、不修改原 cwd、不给状态写者越权。

### 交付与审查导入

分文件统一 `progress.delivery`：`{version:1,channel,state,source_tip,source_tree,target_branch,merge_method,merge_commit,verified_target,history_ref,receipt_paths,post_merge}`。状态沿用 implementing/awaiting_merge/merged/completed；merge_method 为 ff/merge/squash。未取得的事实填 null，不伪造 SHA。原 execution.delivery 在未完成档案的授权恢复时一次移到此位置，旧值/来源提交记 notes；禁止同时出现两个真源。已完成历史档案只读原形，不批量迁移。旧单文件把同一事实记录放原最终任务的 `json spec-dev-delivery` 块，复选框仍是任务状态。

source_tree 使用现有 businessTree 的 SHA-256（仅排除本特性 progress/execution）。Git 交付回执存于 `execution/delivery/<attempt>/record.json`：`{version:1,kind:"git",source_tip,target_commit,method,operations:[{argv,cwd,exit_code,stdout,stderr,stdout_sha256,stderr_sha256}]}`；stdout/stderr 是 feature 相对原件路径，真实 Git 调用返回后记录。PR 回执保存实际工具/API 原文及其 hash、PR URL、源 head 与合并提交，不能手写 state=merged 代替原文。`post_merge` 为 `{commit,kind,files}` 数组，只允许核验过的本特性进度、单一 sync_commit 字段或验收报告追加的实际交付节；变更其它正文/代码必须补验，不能按文件后缀放行。

`history_ref` 使用 `refs/spec-dev/archive/<feature>/source`，创建前确认无冲突，指向已接受来源 tip，登记为保留/移交资源，不随临时分支删除。普通 merge 仍验证 ancestry；squash 用来源 history_ref 中的原任务/组历史加真实目标映射。目标合并、后续 sync_commit 锚定及最终状态提交分别保存，不自引用。缺来源对象的跨机器检查明确失败/未验证，不宣称本地锚已自动发布远端。

review `config.evidence` 改为 `{task,phase,feature,record_path}` 引用数组；init 实际核验 Receipt、原件及 candidate，封存真实 bytes 到本 run 对象存储后供 broker 消费，不再接受只有伪哈希的自报。旧 run 的 manifest/对象维持不可变读取；新 init 拒绝旧自报形状，strict snapshot 仍生效。

## Scenario 映射与证据边界

| Scenario | 任务 | 证明 |
|---|---|---|
| S01—S02 | T02,T03 | 范围唯一、版本变化与自扩写拒绝 |
| S03—S06 | T03—T05,T14 | 实际 hook/index/range/push/安装后新检出 |
| S07—S10 | T06 | current、blocked、无完成 SHA、旧单文件静态/运行分离 |
| S11—S14 | T12,T14,T15 | 合成计划 DAG、既有失败/修复回路、实际 final |
| S15—S16,S19 | T07,T10,T14 | 回执原件、内容失效、strict run 与纯进度区别 |
| S17—S18 | T11 | 真实 review init/tasks/status 分支 |
| S20 | T12,T13 | 条件文档与契约；实际模型动作仍 manual |
| S21—S22 | T07,T08,T14 | ignore 下记录、转存冲突/中断/清理后复核 |
| S23—S24 | T09,T14 | 真实 merge/squash、来源历史/错误目标/旧拒绝反例 |
| S25—S27 | T12,T13,T14 | 静态规则/图表/元数据；模型语义另记 manual-pending |

## 每票状态与资源记录

progress.yaml 使用 JSON 文本（文件名不变，当前解析器已支持），便于标准库原子写入；初始所有票 pending、current=null。每票开始先保存 in_progress，完成保存真实已存在的实现/验证 SHA，不能填本次状态提交自己的 SHA。以下完整命令在**实际实施仓库根**运行，TID/STATUS/RESULT 取本票给定值；SHA 由当前已提交且已验证代码取得。

```bash
TASK_SHA=$(rtk proxy git rev-parse HEAD)
rtk proxy python3 - "$TID" "$STATUS" "$TASK_SHA" "$RESULT" <<'PY'
import json,os,sys
from pathlib import Path
p=Path('.spec-dev/2026-09-23-01-workflow-consistency/plan/progress.yaml')
s=json.loads(p.read_text()); task,status,sha,result=sys.argv[1:]
assert task in s['tasks'] and status in ('in_progress','completed','blocked')
s['tasks'][task]['status']=status
if status=='completed':s['tasks'][task].update(commit=sha,tests=result)
s['current']=None if status=='completed' else task
tmp=p.with_name(p.name+'.tmp');tmp.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n');os.replace(tmp,p)
PY
rtk proxy git add -- .spec-dev/2026-09-23-01-workflow-consistency/plan/progress.yaml
rtk proxy env SKIP_RELEASE_HOOK=1 SKIP_CODEX_PACKAGE_HOOK=1 git commit -m "chore($TID): save $STATUS checkpoint"
```

每次在同一次 shell 调用的首行设置本票 TID/STATUS/RESULT，再接上述完整代码，不依赖前一工具调用或前票 shell。不得把仅中间失败的本次 red 写成任务最终 tests:pass；证据追加原路径及实际 exit。资源创建即登记，同一任务随检查点提交；测试夹具只清理自身 mkdtemp，由 t.after/finally 完成，残留按实际路径登记。

## 体量与交付

任务文件均不超过 200 行；代码片段聚焦接口与关键分支，不抄整文件。预计涉及约 2,000—3,500 行实现/测试/说明变化，实际以 diff 为准；计划包含跨入口协议、真实 Git 反例与收尾命令，不能以行数缩减取消这些边界。

计划阶段只做 schema、路径、依赖、片段静态检查，不执行这些任务。写计划不代表开始实施；执行授权在交接时取得。

## 计划自检记录（2026-09-23）

| 检查 | 结果 |
|---|---|
| Spec 覆盖 | A01—A03、M01—M11 均有任务归属；S01—S27 在映射表中完整覆盖，manual 单独标识 |
| 占位符与自足性 | 未保留占位文本；T00/T16 从真实回执/notes 取路径，状态与实现 SHA 分离 |
| 类型与接口 | 统一 scope、binding、Receipt、transfer、delivery、review 导入字段；组历史十字段不改写 |
| 导航与文件 | 17 个任务与文件、初始进度一一对应；plan-index 通过，单票最大 154 行 |
| 依赖与并发 | 无环；T04/T06 与 T08/T10 可选并发，实际默认串行；清理/最终验证归主线程 |

42 段 JavaScript/Python/Bash 片段及 Bash 中 Python heredoc 通过静态语法检查，相对文档链接可达；未执行任务代码、产品测试、安装、模型验收或创建实施 worktree。结构通过不代表运行通过。
