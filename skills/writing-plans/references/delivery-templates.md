# final、验收与交付任务模板

> 阅读时机：生成 F、A、D 前。把示例路径、ID、argv 和已核实的 T00 来源绑定替换为计划实际值；每个任务给出自己的变量来源和失败分支，不依赖前一工具调用的 shell 变量。所调用工具必须在执行环境可达；脱离插件携带时，内嵌或随计划保存获批工具及直接依赖，不能留下失效的插件缓存路径。

## 独立 final 验证票 F（每份计划固定生成）

F 依赖全部实施和组验证出口，final 先于审查与验收；F 不依赖验收 A 或最大号交付 D。编号按导航顺延，禁止按“全部任务已完成”进入 F。

1. 核对实施出口的实际完成记录与待验版本，保存 F in_progress 检查点。完整套件命令来自项目和获批计划，不受票内相关范围限制；manual 仍需当轮授权，否则记 manual-pending。
2. 在已提交业务版本上真实运行并保存回执：

```bash
rtk proxy node "${CLAUDE_PLUGIN_ROOT}/scripts/execution-evidence.mjs" record \
  --feature "<绝对特性目录>" --task <F任务ID> --phase final --attempt <唯一尝试名> \
  -- <项目实际完整套件argv>
```

若验收报告仅为生成结果，可显式加 `--output acceptance/acceptance-report.md`；它作为测试输入时禁止排除。工具 exit0 只表示回执保存成功，必须读取 JSON.exit_code 和原始输出；零测试、缺工具、信号中断、SKIP 不记 pass。

3. 失败按归属处理：范围内失败或本次回归沿获批范围修复；范围外失败用来源的同一检查比较。来源有 dirty 时保护原件，在已授权隔离基线比较，不 stash/reset 或覆盖。证实既有失败后记录原件，只有尚未决定的阻塞取舍才交用户裁决。修复追加 attempt，不覆盖旧失败。
4. 核对回执适用于当前候选后保存 F completed，commit 指已存在的受测提交，evidence_paths 引用实际 record。状态原子写入并独立提交，随后进入独立审查。

后续审查、验收或合并检查引出修复，回到承担写集合的任务：先补验受影响范围，再复审相应维度、更新验收与对账；旧 F completed 不使新候选自动放行。

## 验收任务 A（矩阵含“验收任务”行时生成）

验收 A 依赖 final F，由独立审查之后的 acceptance-qa 按矩阵执行；D 依赖 F 与全部 A。矩阵全为票内 TDD 时不制造空验收任务，但仍完成证据核对和 Requirement 对账。

| Scenario / 检查项 | 维度 | 执行方式 | 目标 | 阈值/预期 | 验收证据 |
|---|---|---|---|---|---|
| 从现行 spec 逐行填实 | 对应维度 | D/A | 实际 URL/端点/文件 | 可判定预期 | 有效 F/局部回执及适用截图 |

输入含 spec、A 任务、当前候选、F 的实际 record、完整变更文件和 acceptance 目录。light/standard 的 pass 仍需证据，deep 另做独立 pass 审计与抽查；manual-pending 不伪装成通过。

## 最大号交付任务 D（每份计划固定生成）

以下七步必须写入实际任务。资源台账仍是 progress.resources；只清本计划拥有且已接受的资源，台账外不动、共享缓存默认保留、复用资源移交。T00 的来源路径、分支和 created/inherited 归属必须来自真实回执。

**步骤 1：消费有效验证、审查和验收结果**

按实际前置 ID 对账 T00、实施、F、A，不要求 D 先 completed。保存 D in_progress；逐条核对独立审查、适用 critic、验收及 Requirement 对账。按已有授权处置修复；新增取舍才询问，范围内例行修复不重复索取许可。

```bash
rtk proxy node "${CLAUDE_PLUGIN_ROOT}/scripts/execution-evidence.mjs" verify \
  --feature "<实际实施特性目录>" --record "<F的实际record路径>" --candidate <实际候选SHA>
```

报告、spec、fixture 或断言发生变化，先确认回执仍适用；不以“只是 Markdown”或时间较新放行。无有效回执不进入合并。

**步骤 2：测试退役与取代材料核对**

仅把“无现行 Scenario 且对应 Requirement 已 REMOVED/Superseded”的适用测试列为退役候选；不满足原命名约定的历史测试保守豁免。删除沿已有明确授权，无授权先展示具体候选再裁决，不能因名称变化删保护测试。

按 spec.supersedes 逐条完成取代：完全取代设置旧 status/superseded_by、接管仍存在的 covers；部分取代只标相应 Requirement，保留其余现行行为。取代材料应在 F 前准备并验证，D 核对随真实交付生效；D 新增契约正文改动须返回补验、复审和对账。没有 spec/supersedes 如实记录不适用。

**步骤 3：核对来源、历史锚和转存目标**

生成的任务把 T00 notes 中实际来源、分支、实施路径与资源归属展开为本步骤的具体参数；先核对 git root/common-dir、当前分支、原 tip 和差异归属。未知 dirty 不覆盖；已授权保留的无交集 dirty 逐文件核对原 hash，并采用已批准的合并方式。复用隔离交原机制，取得真实回执前不冒充合并。

在实施根取得已存在的 SOURCE_TIP，使用 businessTree 实算 source_tree；创建前核对 HISTORY_REF 未占用或已等于同一 tip：

```bash
rtk proxy git -C "<实际实施根>" rev-parse HEAD
rtk proxy git -C "<实际实施根>" show-ref --verify "refs/spec-dev/archive/<实际特性标识>/source"
# 不存在时，用全零旧值防止覆盖；已存在且不同则停止，不能强制改写。
rtk proxy git -C "<实际实施根>" update-ref "refs/spec-dev/archive/<实际特性标识>/source" <SOURCE_TIP> <全零旧值>
```

history_ref 登记为保留/移交资源。转存目标须位于清理后仍存活的目录，不能放在将删除的 worktree 或资源内；只保存 SHA 字符串不等于保存来源对象。

**步骤 4：真实交付与原件转存**

本地通道在实际来源工作区执行已批准的 ff/merge/squash；记录每次真实 Git argv/cwd/exit 与 stdout/stderr。以下完整记录片段由计划生成者填实参数与 operations；禁止在执行后手写成功回执。v2/parallel 必须在既有特性锁内执行目标写入，保留原历史 binding，不改旧 receipt.worktree 冒充锁交接。

```python
import sys,json,hashlib,subprocess
from pathlib import Path
repo,feature,source_tip,method,operations_json,attempt=sys.argv[1:]
target=Path(repo)/feature; relative='execution/delivery/'+attempt
folder=target/relative; folder.mkdir(parents=True,exist_ok=False)
operations=[]
for argv in json.loads(operations_json):
    result=subprocess.run(argv,cwd=repo,capture_output=True)
    item={'argv':argv,'cwd':str(Path(repo).resolve()),'exit_code':result.returncode}
    for name,raw in [('stdout',result.stdout),('stderr',result.stderr)]:
        item[name]=relative+'/'+str(len(operations))+'-'+name+'.log'
        (target/item[name]).write_bytes(raw)
        item[name+'_sha256']=hashlib.sha256(raw).hexdigest()
    operations.append(item)
    if result.returncode:
        (folder/'incomplete.json').write_text(json.dumps({'operations':operations})+'\n')
        raise SystemExit('交付失败，保留现场和原件，保存真实阻塞状态')
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
record={'version':1,'kind':'git','source_tip':source_tip,'target_commit':head,'method':method,'operations':operations}
(folder/'record.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'target_commit':head,'record_path':relative+'/record.json'}))
```

首次创建 delivery attempt 前，把实际 execution/delivery 目录登记进 resources 并提交；失败尝试因此也进入后续转存闭包，不能只登记最后成功的 record。

实际 operations 例如 `[["git","merge","--ff-only","<实施分支>"]]`；squash 包含 merge --squash 与随后的实际 commit。PR 沿授权执行对应工具动作，保存原始 API 响应、URL、source head、merge commit 与 hash；仍 open 则 awaiting_merge、D in_progress，不能锚定。默认本地，不因计划存在自动 push/创建/合并 PR。

```bash
rtk proxy node "${CLAUDE_PLUGIN_ROOT}/scripts/execution-evidence.mjs" transfer \
  --source "<实际实施特性目录>" --target "<存活目标特性目录>"
```

检查 JSON.ok 及逐文件 hash，保存转存回执。冲突或中断保留来源、已完成条目和 staging 路径；重试先核对磁盘，不覆盖不同 bytes。原 cwd 不改写，失败尝试一并转存。

主线程把真实 source_tip/source_tree、target_branch、merge_method/merge_commit、verified_target、history_ref、Git/PR 与 F/补验 record 路径填入唯一 delivery。未取得的事实为 null；目标有业务差异先在目标完成必要补验并更新审查/验收结论。保存映射检查点后，用实际校验器只读核对：

```javascript
// node --input-type=module - <实际delivery-proof.mjs路径> <目标根> <特性相对目录>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [tool,root,feature]=process.argv.slice(2);
const {verifyDelivery}=await import(pathToFileURL(tool).href);
const {parseRecord}=await import(new URL('../../guardrail/lib/record-data.mjs',pathToFileURL(tool)).href);
const state=parseRecord(fs.readFileSync(path.join(root,feature,'plan/progress.yaml'),'utf8'));
console.log(JSON.stringify(verifyDelivery(root,state,feature)));
```

普通最终 merge 仍验证来源 ancestry；squash 使用保留来源历史和目标映射。票级 verifyResult 继续禁止 squash/cherry-pick。缺对象、错误目标或原件不全时不清理、不标完成。

**步骤 5：台账清理与中断保存**

仅在目标 proof 和 transfer 均已核验、原 worktree 已接受且无待保存改动后执行台账的精确命令，例如 `git -C <来源> worktree remove <本计划创建的实施路径>`，再 `git -C <来源> branch -d <实际已合并分支>`；不得以 --force 吞掉 unknown dirty。squash 的分支删除只在来源历史已保留、内容映射及证据核验通过且有明确清理授权时使用对应已批准命令。

逐条核对真实结果，批次结束或中断时一次保存、一次提交，不逐资源 commit：成功/核实已不存在的条目销账；失败条目保留，D blocked；复用资源保留移交记录。中断时保存已完成动作，不笼统清空 resources。状态写入在存活来源进行，不能在被删 worktree 里继续操作；锁要求沿原载体保持。

生成时内嵌下面的台账写入代码，并给出实际参数。results 文件在本次 execution/ 中保存真实工具回执的 `entry/outcome/receipt`（outcome 只用 removed/missing/retained/failed）；missing 须有实体确实不存在的检查，不能按删除命令报错猜测。随后只暂存进度并独立 commit；失败分支提交后停止。

```javascript
// node --input-type=module - <实际record-data.mjs> <存活progress路径> <D的ID> <实际cleanup-results.json>
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const [parser,file,task,resultsFile]=process.argv.slice(2);
const {parseRecord}=await import(pathToFileURL(parser).href);
const state=parseRecord(fs.readFileSync(file,'utf8')),results=JSON.parse(fs.readFileSync(resultsFile,'utf8'));
for(const item of results){
  if(!state.resources.includes(item.entry)||!['removed','missing','retained','failed'].includes(item.outcome)||!item.receipt)throw Error('unverified cleanup result');
  if(['removed','missing'].includes(item.outcome))state.resources=state.resources.filter(x=>x!==item.entry);
  state.notes.push('cleanup: '+JSON.stringify(item));
}
if(results.some(x=>x.outcome==='failed')){state.tasks[task].status='blocked';state.current=task;}
fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2)+'\n',{flag:'wx'});fs.renameSync(file+'.tmp',file);
```

**步骤 6：sync_commit 与实际交付节**

sync_commit 指已核验目标 merge_commit 或 verified_target，不指未来状态/锚定提交。生成完整的 frontmatter 写入代码，只改该字段，独立提交并把已产生 SHA/files 记入 post_merge(kind=sync_commit)。无 frontmatter 的旧 spec 先按获批形制补齐，若不属于单字段记录性差异则补验，不能宽泛排除 Markdown。无 spec/非 Git 如实记不适用。

标准 spec frontmatter 的实际写入片段如下；生成者先核对本项目形制。传入 SHA 从已核验 delivery 读取，执行后 `git add -- <实际spec文件>`、独立 commit 并取得其现存 SHA，才写 post_merge。

```python
import re,sys
from pathlib import Path
file,anchor=sys.argv[1:]; p=Path(file); text=p.read_text()
assert re.fullmatch(r'[0-9a-f]{40,64}',anchor)
match=re.match(r'---\n([\s\S]*?)\n---',text); assert match, '先补齐形制并验证'
header=match[1]; assert len(re.findall(r'^  sync_commit:',header,re.M))<=1
if re.search(r'^  sync_commit:',header,re.M):
    header=re.sub(r'^  sync_commit:.*$', '  sync_commit: '+anchor,header,flags=re.M)
else:
    assert re.search(r'^spec_dev:\s*$',header,re.M)
    header=re.sub(r'^spec_dev:\s*$', 'spec_dev:\n  sync_commit: '+anchor,header,count=1,flags=re.M)
p.write_text('---\n'+header+'\n---'+text[match.end():])
```

验收报告仅可追加“## 实际交付”节，列实际 source_tip、merge_commit、转存与清理结果；原验收正文不改。记录该已存在的提交为 acceptance_delivery，再调用 verifyDelivery。其他代码、契约或报告正文变化返回补验与对应复审。

**步骤 7：最终状态保存**

前述适用动作全部有真实回执后，在存活工作区用临时文件 + rename 保存 D completed、current=null、delivery.state=completed，commit 引用已存在的核验目标；再只暂存进度独立提交。v2 同步允许的全局 validated_commit，但成员 implementation_commit、组验证 SHA 与旧 cwd/binding 原样保留。运行实际 verifyDelivery，组档案另运行 plan-state 并确认 ready_tasks=[]；失败保留未完成状态，不伪写 completed 来绕过预检。

```javascript
// node --input-type=module - <实际delivery-proof.mjs> <目标根> <特性相对目录> <D的ID>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [tool,root,feature,task]=process.argv.slice(2),file=path.join(root,feature,'plan/progress.yaml');
const {verifyDelivery}=await import(pathToFileURL(tool).href);
const {parseRecord}=await import(new URL('../../guardrail/lib/record-data.mjs',pathToFileURL(tool)).href);
const state=parseRecord(fs.readFileSync(file,'utf8'));
if(state.tasks[task].status!=='in_progress'||Object.entries(state.tasks).some(([id,t])=>id!==task&&t.status!=='completed'))throw Error('unfinished prerequisites');
verifyDelivery(root,state,feature);
const verified=state.delivery.verified_target;
state.tasks[task]={...state.tasks[task],status:'completed',commit:verified,tests:'pass'};
state.current=null;state.delivery.state='completed';
if(state.integration)state.integration.validated_commit=verified;
if(state.execution)state.execution.validated_commit=verified;
fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2)+'\n',{flag:'wx'});fs.renameSync(file+'.tmp',file);
```

然后执行 `git add -- <实际progress路径>` 和独立状态提交；命令在存活且有写权的目标根执行。提交检查失败时保留实际未完成检查点与原件，修正后重新核验，不能把暂存或落盘等同于已提交完成。

资源、合并、文档回写或原机制交付任一未完成，保持对应 waiting/blocked 与具体缺口。roadmap 仅在完整交付后回写 delivered。没有新决策时连续完成已授权收尾，不因正常通过重复征询。
