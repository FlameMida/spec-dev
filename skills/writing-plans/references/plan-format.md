# 计划文档头部

> 阅读时机：编写任何新计划前；消费者需要字段/台账时。

## 计划文档头部

**每份计划必须以此头部开始**：

```markdown
# [功能名] 实施计划

> **执行方式**：使用 spec-dev 的 executing-plans skill 逐任务执行本计划；无该 skill 的环境直接从任务 0 起按序执行至最终任务。任务状态由 `plan/progress.yaml` 跟踪（唯一状态源；任务文件步骤用「**步骤 N:**」标题式、不含复选框）；脱离项目携带时连同特性目录（含 spec）整体带走。
>
> **偏差处理**：执行中发现计划与现实不符——小偏差（路径笔误、明显遗漏但意图清楚）就地修正并在提交信息中注明；接口、数据结构等契约级偏差停下向计划作者确认，不猜着改。

**目标**：[一句话说明构建什么]

**Spec**：[对应 spec 文件路径]

**架构**：[2-3 句方案概述]

**技术栈**：[关键技术/库]

**关联 skill**：逐项列名称、适用任务/时机、单点定义路径；包含执行方式、适用 TDD/纯重构/集成组、测试策略、隔离及验收。任务只写本票新增关联，不复制整套规则；获批 seam 仍沿导航/接口块继承。

**设计原则**：本计划遵循 spec-dev 设计原则（不留向后兼容垫片 / 最简实现 / 分层构建 / 不以未完成复杂性换可工作产品 / 模块化 / 优先成熟库 / 优先已有依赖 / 长期架构决策）；任务与代码不得违反，冲突时停下向计划作者确认。

## 全局约束

[spec 的项目级要求——版本下限、依赖限制、命名与文案规则、平台要求——
每条一行，数值从 spec 逐字复制。每个任务的要求都隐含本节。]

## 相关测试范围

[写计划时推导的本特性相关测试执行声明——命令级、随计划被审、可改。推导优先级：
1) 项目已有测试影响分析工具 → 写具体命令（如 `nx affected -t test`、`jest --changedSince`、
   `pytest --testmon`）。工具存在性以项目依赖/配置清单判定（package.json scripts、nx.json、
   pytest 插件等），拿不准时询问用户；
2) 无工具 → 范围 = 本特性将新增/修改的测试文件 + 直接 import/require 被改源文件的既有测试（grep 导入语句判定，一层即止，不做传递闭包）；不按目录 glob 圈入无关测试。
纯文档特性（`covers` 为空数组或全为文档路径）→ 显式声明为空并注明原因。
本声明约束任务 0 基线验证与各任务步骤 4（只跑本任务目标测试与本范围内的自有测试，回归不在任务内跑）；独立 final 验证票 F 的全量不受本节约束。F 先于审查与验收，后续修复按影响补验，不把“一次全量”解释成禁止重新验证。]

---
```

index.md 头部之后是**任务导航表**——四列：`任务 | 依赖 | 消费接口 | 产出接口`。规则：任务 ID 形如 `T\d\d` 全局唯一且与 tasks/ 文件名一一对应；依赖只引用表内 ID，可用闭区间写法（`T01-T06` 表示 T01 至 T06 闭区间——区间内每个编号都必须是表内任务，起点不得大于终点）；禁止环；接口列写精确签名（执行者只读自己的任务文件 + 依赖行的产出接口，不读其它任务正文）。生成后运行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index <plan目录>`（结构校验：文件↔导航表一致、依赖存在且区间可展开、无环），失败不得交付执行。

### 测试落点的接口传递

spec 测试策略中的获批 seam 沿四列导航的消费/产出接口及本票接口块传递：保留精确签名/协议，列出覆盖 Scenario、依赖替换边界和 spec 来源指针；执行者只读本票、spec 与依赖接口行就能获得同一边界，不把声明藏在前置任务正文。产出接口不是逐函数直测清单；不新增导航列、清单文件或 progress 字段。

### 静态快检命令

计划头部与本票测试命令中提供项目已有、适用的 typecheck/静态命令及配置来源，无则写不适用。编辑批次间快检的节奏与边界遵循 test-strategy；保留任务五步的有效红绿、相关测试、最终全量和失败归属裁决，不把编译报错写为预期红。

## progress.yaml 键结构

```yaml
format_version: 1
current: T03            # 当前指针（null=未开始）
tasks:
  T01: { status: completed, commit: <sha>, tests: pass }
  T02: { status: completed, commit: <sha>, tests: pass, deviations: ["路径笔误就地修正"] }
  T03: { status: in_progress }
resources:              # 资源台账（唯一登记处；最终任务清理步骤遍历此清单）
  - "worktree: .worktrees/<分支> —— git worktree remove …"
notes: []               # 偏差与备注，append-only
```

状态枚举：pending | in_progress | completed | blocked。主线程用同目录临时文件 + rename 原子保存，再单独提交；completed.commit 指已经存在的实现或验证 SHA，不自引用。in_progress 可无完成 SHA；串行先恢复 current（blocked 先处理阻塞），没有当前任务才取 ready。progress 不由 implementer 合并覆盖。`resources` 键即**资源台账规范定义点**（生成时预登记，创建即追加，交付时逐条核对）。

## 静态任务范围与能力标识（唯一定义点）

每份新计划在 index 放一个 `json spec-dev-scopes` 块。示例的 T01 为实施、T02 为 F、T03 为验收 A、T04 为最大号交付 D；真实任务号、路径与授权来源由生成者填实。F 的依赖闭包覆盖全部实施/组出口，A 依赖 F，D 依赖 F 与所有 A；F 不依赖 A/D。

```json spec-dev-scopes
{"version":1,"final_task":"T02","acceptance_tasks":["T03"],"tasks":{"T01":{"writes":["src/cart.mjs","tests/cart.test.mjs"],"specs":[".spec-dev/cart/spec/cart-design.md"],"authorization_ref":"已核实的计划执行授权来源"}}}
```

`tasks` 中每项仅有 `writes/specs/authorization_ref`；实施写集非空，主线程隔离/验证/交付可为空；specs 非空。路径是精确仓库相对文件名，拒绝 glob、目录、逃逸、重复键/块与大小写/Unicode 碰撞。`.git` 永不授权；主线程管理任务可列精确 `.spec-dev` 文件，implementer 不可。新 parallel 块只列 resources，writes 从本块读取；同一任务有两份 writes 即拒绝。没有 scopes 的历史 parallel 声明仍按原形读取。

运行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-output.mjs" plan-index <实际plan目录>`；含 scopes 时必须同时取得 `ok:true` 与 `scope_protocol_version:1`。旧工具仅返回 ok 不证明能力；缺能力停止新协议动作并报告缺口。引导计划未声明新块时不伪造能力回执。

静态指纹由 `guardrail/lib/task-scopes.mjs` 的 `scopeFingerprint(view,plan,task)` 计算，覆盖计划、任务正文与关联 spec。progress 和 execution 不混入静态范围；旧单文件仅归一化已识别任务内复选框的状态字符，保留正文、代码样例及所有授权内容。

## 绑定与激活（唯一定义点）

分文件 `tasks.TNN.binding` 仅含 `{scope_commit,scope_digest,authorization_ref,worktree,branch,claim_key,claim_checkpoint}`。scope_commit 是已经提交的静态版本，digest 由上述函数实算；worktree/branch 来自实际 Git，串行 claim 两项为 null。主线程核对已有用户授权、写入 in_progress/current 与 binding 后独立提交，得到 authority SHA，再激活本地引用。字段非空不证明用户授权或行为符合性。

生成每张需写入的票时，把以下顺序及实际变量值写全：

1. 提交 spec/plan/任务范围；用 `git show <scope_commit>:<路径>` 的原始内容构造 view（不能 trim blob），计算 digest。
2. 主线程原子写入 binding 与任务状态，`git add -- <实际progress路径>` 后单独 commit；取得 `git rev-parse HEAD` 为 authority，不能把它回填进同一个提交。
3. `node <实际task-binding.mjs路径> bind --plan <仓库相对入口> --task TNN --authority <完整SHA>`；再 `inspect` 核对回执。插件路径为 `guardrail/task-binding.mjs`，独立安装路径为 `scripts/spec-dev/task-binding.mjs`。
4. 实施提交由 prepare-commit-msg 补单行 `Spec-Task: {"plan":...,"task":...,"authority":...}`，commit-msg 核对最终消息；普通 `Spec:` 只作追溯，不能代替绑定。任务关联不能混用宽跳过。
5. 实现与验证提交已存在后，`clear --plan <入口> --task TNN` 清本地引用，再原子保存 completed 与该既存 SHA、独立提交进度。切票、范围过期或恢复时先核对旧引用，不能覆盖其他任务引用。

普通分文件串行任务的实际绑定写入如下；生成计划时填写四个真实参数，并把随后的窄暂存/状态提交、取得 authority、bind 命令写全。v2 仍在既有主线程锁内调用；并发由主线程按 claim 检查点生成绑定，不使用此串行片段。

```javascript
// node --input-type=module - <实际lib/task-binding.mjs> <实际仓库根> <计划相对入口> <任务ID>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [library,repo,plan,task]=process.argv.slice(2),url=pathToFileURL(library);
const {git,commitView,worktreeView}=await import(url.href);
const {readScopes,scopeFingerprint}=await import(new URL('./task-scopes.mjs',url).href);
const {parseRecord}=await import(new URL('./record-data.mjs',url).href);
const file=path.join(repo,path.dirname(plan),'progress.yaml'),state=parseRecord(fs.readFileSync(file,'utf8'));
if(state.execution||!state.tasks[task]||['completed','blocked'].includes(state.tasks[task].status)||(state.current!==null&&state.current!==task))throw Error('resolve current/blocked state before binding');
const scope_commit=git(repo,'rev-parse','HEAD'),view=commitView(repo,scope_commit);
const scope=readScopes(view.readText(plan),Object.keys(state.tasks)).tasks[task];
const scope_digest=scopeFingerprint(view,plan,task).digest;
if(scopeFingerprint(worktreeView(repo),plan,task).digest!==scope_digest)throw Error('static inputs must be committed');
state.tasks[task].binding={scope_commit,scope_digest,authorization_ref:scope.authorization_ref,worktree:fs.realpathSync(repo),branch:git(repo,'branch','--show-current'),claim_key:null,claim_checkpoint:null};
state.tasks[task].status='in_progress';state.current=task;
fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2)+'\n',{flag:'wx'});fs.renameSync(file+'.tmp',file);
```

本地引用由工具写到实际 Git dir 的 `spec-dev-task.json`，仅含 `{version:1,plan,task,authority,worktree,branch}`。并发 claim_checkpoint 指主线程保存真实 claim 的提交，可以不在 implementer 的祖先链上；scope_commit 必须先于 validated_commit，不能为适配绑定移动验证基线。主线程在 claim/工作区建立后保存绑定与 authority，才允许 implementer 激活。

旧计划恢复不重写 completed、历史提交或原件：先核对已有授权，再在原载体补当前/未执行任务范围和必要步骤。旧单文件继续使用复选框，以稳定 TNN 选任务，authority 指原计划的已提交范围版本；不新增 progress。缺版本、路径或授权证据时报告具体缺口，不批量迁移。

## 回执与交付映射（唯一定义点）

未提交的 TDD 红绿保留原始工具输出与工作副本记录，不伪绑提交 SHA；正式 record 要求业务版本已提交。普通 Receipt v1：`{version:1,task,phase,command,cwd,exit_code,commit,tree,scope,stdout,stderr,stdout_sha256,stderr_sha256}`。phase 为 baseline/red/green/final/integration；scope 为 `{kind:"repository",outputs:[]}` 或获批精确验证范围 `{kind:"paths",paths:[...],digest,outputs:[]}`。默认覆盖全仓，仅排除本特性 progress/execution；outputs 只允许显式生成的 `acceptance/acceptance-report.md`，该文件若作为测试输入则不能排除。旧组记录保留现有九个原字段与 bytes，不补造字段。

`execution-evidence.mjs record --feature <绝对特性目录> --task TNN --phase <phase> --attempt <唯一名> [--output acceptance/acceptance-report.md] -- <真实argv>` 真正执行并保存；工具 exit0 表示保存成功，还须读取 JSON.exit_code。信号/启动错误或额外写入留下 incomplete 与原始输出。`verify --feature <目录> --record <特性相对record路径> --candidate <SHA>` 核对原件与适用版本；`transfer --source <原特性目录> --target <存活特性目录>` 只复制并核对原件，不删除来源。原件不进 Git；提交引用，清理前转存并保存真实回执。

分文件唯一 `progress.delivery`：`{version:1,channel,state,source_tip,source_tree,target_branch,merge_method,merge_commit,verified_target,history_ref,receipt_paths,post_merge}`。channel 为 local/pr；state 为 implementing/awaiting_merge/merged/completed；method 为 ff/merge/squash，未知事实填 null。source_tree 由 `businessTree(repo,feature,commit)` 实算；history_ref 使用 `refs/spec-dev/archive/<特性标识>/source`，保留并登记，不随工作分支删除。post_merge 项为 `{commit,kind,files}`，kind 为 progress/sync_commit/acceptance_delivery；仅允许精确进度、单一 sync_commit 或验收报告追加的“实际交付”节，其它改动须有当前版本补验。

既有失败获准不阻塞时，receipt_paths 另引用 `{version:1,kind:"failure-disposition",baseline_record,final_record,comparison,comparison_sha256,authorization,authorization_sha256}`。baseline_record/final_record 一并登记，仍是原 Receipt v1；后四项为 execution 下来源比较、真实用户裁决原件的路径与 SHA-256。核验要求同命令、完整仓库范围/输出排除项、来源祖先、baseline/final 同一非零退出码，以及原件 hash；final 仍须适用于交付来源/目标。只接受 final 例外，不豁免组验证。相同退出码或有效 hash 不能证明失败等价性/授权真实性；主线程先用 T00 的实际来源比较失败原因，保存用户裁决，独立审查复核。无裁决、本次回归或新候选不能沿用旧处置，失败记录永不改成 pass。

Git 原件为 `{version:1,kind:"git",source_tip,target_commit,method,operations}`，每个真实 operation 保存 `{argv,cwd,exit_code,stdout,stderr,stdout_sha256,stderr_sha256}`；PR 原件保存实际 API 响应文件及 hash、url、source_tip、target_commit、method。PR 状态不能自证已合并。Receipt 与 Git/PR 回执路径列在 receipt_paths；最终验证用 `verifyDelivery(root,state,feature)`，缺源对象或原件即未验证。

未完成档案中旧 `execution.delivery` 在授权恢复时由主线程一次迁到顶层，旧值及来源提交记 notes；新形禁止双真源。已完成历史只读原形。旧单文件把同一 delivery 事实写入原最终任务的 `json spec-dev-delivery` 块，复选框仍是任务状态。


## 资源台账总则

台账总则：**清理只遍历本台账、台账外一律不动**（可疑残留只报告不删）；共享缓存（~/.cargo、pnpm store、npm cache 等）默认保留，仅用户显式要求清理时才登记入账；台账限定持久资源（容器、测试库/表、临时目录、后台服务），worktree 内构建产物随 worktree 删除自然回收、不入账。
