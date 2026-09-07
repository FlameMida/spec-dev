import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, readdirSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli=path.join(root,'scripts/review-runner.py');
function invoke(args) {
  try {return {code:0,data:JSON.parse(execFileSync('python3',[cli,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}))};}
  catch(e) {let data;try{data=JSON.parse(String(e.stdout))}catch{data={error:String(e.stderr)}} return {code:e.status,data};}
}
function fixture(t, extra={}) {
 const dir=mkdtempSync(path.join(tmpdir(),'controlled-review-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const repo=path.join(dir,'repo');mkdirSync(repo);
 const git=(...a)=>execFileSync('git',a,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-q');git('config','user.email','test@example.invalid');git('config','user.name','test');
 writeFileSync(path.join(repo,'spec.md'),extra.fixtureSpec || '### Requirement: total\n#### Scenario: empty\nempty returns zero\n');
 writeFileSync(path.join(repo,'plan.md'),'Implement total.\n');
 writeFileSync(path.join(repo,'cart.py'),'def total(values):\n    return sum(values)\n');
 writeFileSync(path.join(repo,'check.py'),'import sys\nprint("actual test stdout")\nprint("actual stderr",file=sys.stderr)\nsys.exit(1)\n');
 git('add','.');git('commit','-qm','base');const base=git('rev-parse','HEAD');
 writeFileSync(path.join(repo,'cart.py'),'def total(values):\n    return sum(values) + 1\n');git('add','.');git('commit','-qm','change');
 const run=path.join(dir,'run');const config={repo,base,head:git('rev-parse','HEAD'),spec:'spec.md',plan:'plan.md',tier:'regular',capacity:2,tests:[{id:'related',argv:['python3','check.py']}],...extra};
 delete config.fixtureSpec;
 const cp=path.join(dir,'config.json');writeFileSync(cp,JSON.stringify(config));
 const initialized=invoke(['init','--config',cp,'--run',run]);
 assert.equal(initialized.code,0,`生产CLI必须建立固定run: ${JSON.stringify(initialized.data)}`);
 return {dir,repo,run,config};
}
async function broker(t,run,actor) {
 const p=spawn('python3',[cli,'broker','--run',run,'--actor',actor],{stdio:['pipe','pipe','pipe']});
 const pending=new Map();let n=0;let stderr='';p.stderr.on('data',x=>stderr+=x);
 createInterface({input:p.stdout}).on('line',line=>{const m=JSON.parse(line);pending.get(m.id)?.(m);pending.delete(m.id)});
 t.after(()=>{p.stdin.end();p.kill()});
 const rpc=(method,params={})=>new Promise((resolve,reject)=>{const id=++n;const timer=setTimeout(()=>reject(Error('RPC timeout '+stderr)),5000);pending.set(id,m=>{clearTimeout(timer);resolve(m)});p.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n')});
 assert.equal((await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}})).result.protocolVersion,'2025-06-18');
 const call=async(name,args={})=>{const r=await rpc('tools/call',{name,arguments:args});assert.ok(r.result,JSON.stringify(r));return {error:r.result.isError===true,data:JSON.parse(r.result.content[0].text)}};
 return {rpc,call};
}
function cleanReport(extra={}) {return {report:{findings:[],coverage_note:'已核对本角色范围；测试和引用由执行记录说明。'},citations:[],coverage:[{scenario:'empty',status:'reviewed',citations:[{file:'spec.md',line:3,quote:'empty returns zero'}]}],evidence_ids:[],d_request:[],...extra};}

test('R01 受控工具不接受输出路径或actor；报告不能覆盖真实测试原件',async t=>{
 const f=fixture(t);const b=await broker(t,f.run,'A');
 const list=await b.rpc('tools/list');assert.deepEqual(list.result.tools.map(x=>x.name).sort(),['context','read_source','run_test','submit_report']);
 assert.equal((await b.call('run_test',{test_id:'related',output:'parent-test.json',actor:'B'})).error,true);
 const result=await b.call('run_test',{test_id:'related'});assert.equal(result.error,false);assert.equal(result.data.exit,1);assert.equal(result.data.actor,'A');assert.equal(result.data.stdout,'actual test stdout\n');assert.equal(result.data.stderr,'actual stderr\n');
 const again=await b.call('run_test',{test_id:'related'});assert.equal(again.data.id,result.data.id);
 const submitted=await b.call('submit_report',cleanReport({evidence_ids:[result.data.id]}));assert.equal(submitted.error,false,JSON.stringify(submitted));
 assert.equal((await b.call('run_test',{test_id:'related'})).data.id,result.data.id);
 const status=invoke(['status','--run',f.run]);assert.equal(status.data.status,'incomplete');assert.ok(status.data.gaps.some(x=>x.includes('回执')));
});

test('R02 A不能用B真实测试冒充独立复跑',async t=>{
 const f=fixture(t);const b=await broker(t,f.run,'B');const a=await broker(t,f.run,'A');
 const evidence=await b.call('run_test',{test_id:'related'});
 const r=await a.call('submit_report',cleanReport({evidence_ids:[evidence.data.id]}));assert.equal(r.error,true);assert.match(r.data.error,/独立复跑/);
});

test('R03 拒绝目录逃逸、错误原文、缺失主引用以及未知字段',async t=>{
 const f=fixture(t);const b=await broker(t,f.run,'B');
 assert.equal((await b.call('read_source',{file:'../config.json'})).error,true);
 const finding={file:'cart.py',line:2,severity:'高',category:'Bug',confidence:95,description:'返回总额额外加一，empty返回1，违反empty契约。',fix_suggestion:'移除额外加一'};
 const missing=await b.call('submit_report',cleanReport({report:{findings:[finding],coverage_note:'checked'}}));assert.equal(missing.error,true);
 const falseQuote=await b.call('submit_report',cleanReport({citations:[{finding_index:0,file:'cart.py',line:2,quote:'return 0'}],report:{findings:[finding],coverage_note:'checked'}}));assert.equal(falseQuote.error,true);assert.match(falseQuote.data.error,/原文/);
 const valid=await b.call('submit_report',cleanReport({citations:[{finding_index:0,file:'cart.py',line:2,quote:'    return sum(values) + 1'}],report:{findings:[finding],coverage_note:'checked'}}));assert.equal(valid.error,false,JSON.stringify(valid));
 assert.equal((await b.call('submit_report',{...cleanReport(),actor:'A'})).error,true);
});

test('R04 零发现不放行缺少角色和critic的运行',t=>{
 const f=fixture(t);const s=invoke(['status','--run',f.run]);assert.equal(s.data.status,'incomplete');assert.ok(s.data.gaps.some(x=>x.includes('critic')));assert.ok(s.data.gaps.some(x=>x.includes('A')));
});

test('R06 固定快照变化拒绝继续；持久证据被篡改不能放行',async t=>{
 const f=fixture(t);const b=await broker(t,f.run,'A');const e=await b.call('run_test',{test_id:'related'});assert.equal(e.error,false);
 const file=path.join(f.run,'objects',e.data.id+'.json');const old=readFileSync(file);writeFileSync(file,old.toString().replace('actual test stdout','forged test stdout'));
 const status=invoke(['status','--run',f.run]);assert.equal(status.data.status,'blocked');assert.match(status.data.gaps.join(' '),/哈希/);
 writeFileSync(file,old);writeFileSync(path.join(f.repo,'cart.py'),'changed snapshot\n');
 const resume=invoke(['run','--run',f.run,'--budget-seconds','1']);assert.notEqual(resume.code,0);assert.match(JSON.stringify(resume.data),/快照/);
});

function fakeClient(dir, mode='normal') {
 const file=path.join(dir,'client.py');
 writeFileSync(file, String.raw`import sys,json,subprocess,time
from pathlib import Path
mode=sys.argv[1]
marker=Path(__file__).with_suffix('.ready')
cfg=json.loads(sys.argv[sys.argv.index('--mcp-config')+1])['mcpServers']['review']
actor=cfg['args'][-1]
print(json.dumps({'type':'system','subtype':'init','tools':['mcp__review__context','mcp__review__read_source','mcp__review__run_test','mcp__review__submit_report']}),flush=True)
if mode=='slow': time.sleep(10)
p=subprocess.Popen([cfg['command'],*cfg['args']],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
n=0
def rpc(method,params):
 global n
 n+=1;p.stdin.write(json.dumps({'jsonrpc':'2.0','id':n,'method':method,'params':params})+'\n');p.stdin.flush();return json.loads(p.stdout.readline())['result']
def call(name,args={}):
 if mode=='skip-supplement-context' and actor.startswith('supplement-') and name=='context': return {'task':{}}
 result=rpc('tools/call',{'name':name,'arguments':args})
 if result.get('isError'): raise Exception(result)
 value=json.loads(result['content'][0]['text'])
 if mode=='partial-context' and actor=='critic-1' and name=='context' and value.get('paged'): return {'task':{}}
 if mode=='page-resume' and actor=='critic-1' and name=='context' and marker.exists() and value.get('paged'): return {'task':{}}
 if value.get('paged'):
  raw=value['content']
  while value['next_cursor'] is not None:
   result=rpc('tools/call',{'name':'context','arguments':{'resource':value['resource'],'cursor':value['next_cursor']}})
   if result.get('isError'): raise Exception(result)
   value=json.loads(result['content'][0]['text']);raw+=value['content']
  return json.loads(raw)
 return value
rpc('initialize',{'protocolVersion':'2025-06-18'})
c=call('context');e=[]
if mode=='page-resume' and actor=='critic-1' and not marker.exists(): marker.write_text('context delivered');time.sleep(30)
if actor in ['A','AS'] or actor.startswith('supplement-A'): e=[call('run_test',{'test_id':'related'})['id']]
body={'report':{'findings':[],'coverage_note':'Protocol fixture, not model acceptance'},'citations':[],'coverage':[{'scenario':'empty','status':'reviewed','citations':[{'file':'spec.md','line':3,'quote':'empty returns zero'}]}],'evidence_ids':e,'d_request':[]}
if (mode in ['candidate','low'] and actor=='B') or (mode in ['late','last-candidate','late-d'] and actor=='critic-1') or (mode=='last-candidate' and actor=='critic-2') or (mode in ['merge','cross-merge'] and actor in ['A','S']):
 body['report']['findings']=[{'file':'cart.py','line':2,'severity':'中','category':'Bug','confidence':95,'description':'total adds one','fix_suggestion':'remove plus one'}]
 body['citations']=[{'finding_index':0,'file':'cart.py','line':2,'quote':'    return sum(values) + 1'}]
if mode=='low' and actor=='B': body['report']['findings'][0]['severity']='低'
if mode=='late-d' and actor=='critic-1': body['d_request']=[{'file':'cart.py','line':2,'quote':'    return sum(values) + 1'}]
if actor.startswith('refute-'):
 body['decisions']=[{'candidate_id':x['id'],'verdict':'rejected','citations':[{'file':'cart.py','line':2,'quote':'    return sum(values) + 1'}],'reason':'Protocol negative fixture: completion must not imply confirmation'} for x in c['task']['candidates']]
if mode in ['merge','cross-merge'] and actor in ['A','S']:
 line=6 if mode=='cross-merge' and actor=='S' else 3
 quote='null throws TypeError' if line==6 else 'empty returns zero'
 body['citations'].append({'finding_index':0,'file':'spec.md','line':line,'quote':quote})
if mode=='cross-merge': body['coverage'].append({'scenario':'invalid','status':'reviewed','citations':[{'file':'spec.md','line':6,'quote':'null throws TypeError'}]})
if mode in ['merge','cross-merge'] and actor.startswith('refute-'):
 for decision in body['decisions']: decision['verdict']='confirmed'
 body['merge_groups']=[{'candidate_ids':[x['id'] for x in c['task']['candidates']],'reason':'修复同一额外加一同时消除两个报告','citations':[{'file':'cart.py','line':2,'quote':'    return sum(values) + 1'}]}]
if mode=='dynamic-d' and actor=='C': body['d_request']=[{'file':'cart.py','line':2,'quote':'    return sum(values) + 1'}]
if actor.startswith('critic-'): body['gaps']=[]
if mode in ['supplement','last-d','skip-supplement-context'] and actor=='critic-1': body['gaps']=[{'actor':'S','reason':'need additional empty scenario check'}]
if mode=='last-d' and actor=='critic-2': body['d_request']=[{'file':'cart.py','line':2,'quote':'    return sum(values) + 1'}]
call('submit_report',body)
p.stdin.close();p.wait()
print(json.dumps({'type':'result','is_error':False,'result':'submitted'}),flush=True)
`);
 return ['python3',file,mode];
}

test('R05 真实进程调度按容量完成且否决回执不进入confirmed',async t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder,'candidate')});
 const result=invoke(['run','--run',f.run,'--budget-seconds','20']);
 assert.equal(result.data.status,'completed',JSON.stringify(result));assert.equal(result.data.confirmed.length,0);assert.equal(result.data.rejected.length,1);
 const events=JSON.parse(readFileSync(path.join(f.run,'segments.json'),'utf8'));
 assert.equal(events.length,1);assert.ok(events[0].peak_workers<=2);assert.ok(events[0].peak_workers>0);
 assert.ok(result.data.tasks.some(x=>x.actor==='refute-1'));assert.ok(result.data.tasks.some(x=>x.actor==='critic-1'));
 const reportsBefore=readdirSync(path.join(f.run,'objects')).sort();
 assert.equal(invoke(['run','--run',f.run,'--budget-seconds','20']).data.status,'completed');
 assert.deepEqual(readdirSync(path.join(f.run,'objects')).sort(),reportsBefore);
});

test('R06 超时保留同run，三片段上限不能用重复启动绕过',async t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder,'slow')});
 for(let i=0;i<3;i++) {const r=invoke(['run','--run',f.run,'--budget-seconds','0.25']);assert.equal(r.data.status,'incomplete');}
 const exhausted=invoke(['run','--run',f.run,'--budget-seconds','0.25']);assert.equal(exhausted.data.status,'blocked');assert.match(exhausted.data.gaps.join(' '),/片段/);
 const segments=JSON.parse(readFileSync(path.join(f.run,'segments.json'),'utf8'));assert.equal(segments.length,3);assert.ok(segments.every(x=>x.finished&&x.peak_workers<=2));
});

for (const [mode,actors] of [['dynamic-d',['D','critic-1']],['late',['refute-2','critic-2']],['supplement',['supplement-S','critic-2']]]) {
 test('R04 有界补查与独立回执 '+mode,t=>{
  const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const f=fixture(t,{client:fakeClient(folder,mode)});
  const r=invoke(['run','--run',f.run,'--budget-seconds','20']);assert.equal(r.data.status,'completed',JSON.stringify(r));
  for(const actor of actors) assert.ok(r.data.tasks.some(x=>x.actor===actor),actor);
  if(mode==='late') {assert.equal(r.data.confirmed.length,0);assert.equal(r.data.rejected.length,1);}
 });
}

test('R06 同run并发启动被拒绝，终止后无活动worker',async t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder,'slow')});
 const proc=spawn('python3',[cli,'run','--run',f.run,'--budget-seconds','2'],{stdio:['ignore','pipe','pipe']});
 t.after(()=>proc.kill());
 await new Promise(resolve=>setTimeout(resolve,300));
 const conflict=invoke(['run','--run',f.run,'--budget-seconds','1']);assert.equal(conflict.data.status,'blocked');assert.match(conflict.data.gaps.join(' '),/并发resume/);
 await new Promise(resolve=>proc.on('close',resolve));
 const segments=JSON.parse(readFileSync(path.join(f.run,'segments.json'),'utf8'));
 for(const w of segments[0].workers) assert.throws(()=>process.kill(w.pid,0));
});

for(const mode of ['last-candidate','late-d','low','merge']) {
 test('R04 不丢末轮候选、后续D、低发现和同根因来源 '+mode,t=>{
  const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const f=fixture(t,{client:fakeClient(folder,mode)});const r=invoke(['run','--run',f.run,'--budget-seconds','20']);
  if(mode==='last-candidate') {assert.equal(r.data.status,'incomplete');assert.match(r.data.gaps.join(' '),/未复核候选/);}
  else {assert.equal(r.data.status,'completed',JSON.stringify(r));
   if(mode==='late-d') {assert.ok(r.data.tasks.some(x=>x.actor==='D'));assert.ok(r.data.tasks.some(x=>x.actor==='critic-2'));}
   if(mode==='low') assert.equal(r.data.observations.length,1);
   if(mode==='merge') {assert.equal(r.data.confirmed.length,1);assert.equal(r.data.confirmed[0].sources.length,2);}
  }
 });
}

test('R04 最终critic之后新增D，旧覆盖依据不能冒充完整',t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder,'last-d')});const r=invoke(['run','--run',f.run,'--budget-seconds','20']);
 assert.equal(r.data.status,'incomplete');assert.match(r.data.gaps.join(' '),/最终critic.*过期/);
});

test('R03 context提供固定行号源码包，省去重复机械读取',async t=>{
 const f=fixture(t);const b=await broker(t,f.run,'A');const r=await b.call('context');
 assert.equal(r.error,false);assert.equal(r.data.source_documents['cart.py'].content,'def total(values):\n    return sum(values) + 1\n');
 assert.match(r.data.source_documents['cart.py'].numbered,/2:     return sum/);
});

test('R06 中断测试保留真实部分输出且拒绝自动重跑',t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder),tests:[{id:'related',argv:['python3','-u','-c','import time; print("partial before interruption",flush=True); time.sleep(30)']}]});
 const r=invoke(['run','--run',f.run,'--budget-seconds','1.5']);assert.equal(r.data.status,'blocked',JSON.stringify(r));
 const records=readdirSync(path.join(f.run,'objects')).map(x=>JSON.parse(readFileSync(path.join(f.run,'objects',x),'utf8'))).filter(x=>x.kind==='test');
 assert.ok(records.some(x=>x.actor==='A'&&!x.complete&&x.stdout.includes('partial before interruption')));
 const again=invoke(['run','--run',f.run,'--budget-seconds','1']);assert.equal(again.data.status,'blocked');
 assert.equal(JSON.parse(readFileSync(path.join(f.run,'segments.json'),'utf8')).length,1);
});

test('R04 同一源码行上的不同Scenario不能凭一次编辑而误合并',t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder,'cross-merge'),fixtureSpec:'### Requirement: total\n#### Scenario: empty\nempty returns zero\n### Requirement: validation\n#### Scenario: invalid\nnull throws TypeError\n'});
 const r=invoke(['run','--run',f.run,'--budget-seconds','20']);assert.equal(r.data.status,'incomplete',JSON.stringify(r));assert.equal(r.data.confirmed.length,0);
});

test('R06 CLI原始完成日志被改写或缺失必须阻止完成',t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder)});assert.equal(invoke(['run','--run',f.run,'--budget-seconds','20']).data.status,'completed');
 const log=path.join(f.run,'actors','A','attempt-1.jsonl');const raw=readFileSync(log);writeFileSync(log,'forged completion\n');
 assert.equal(invoke(['status','--run',f.run]).data.status,'blocked');
 writeFileSync(log,raw);rmSync(log);assert.equal(invoke(['status','--run',f.run]).data.status,'blocked');
 writeFileSync(log,raw);const stderr=path.join(f.run,'actors','A','attempt-1.stderr');writeFileSync(stderr,'changed stderr');assert.equal(invoke(['status','--run',f.run]).data.status,'blocked');
});

test('R05 合法测试超过30秒且仍在片段预算内可以完成',t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder),tests:[{id:'related',argv:['python3','-u','-c','import time; time.sleep(31); print("completed within segment")']}]});
 const r=invoke(['run','--run',f.run,'--budget-seconds','40']);assert.equal(r.data.status,'completed',JSON.stringify(r));
});

test('R03 大上下文在受控接口内完整分页，不能落到worker不可读的客户端文件',async t=>{
 const spec='### Requirement: total\n#### Scenario: empty\nempty returns zero\n'+('中文完整上下文\\n'.repeat(12000));
 const f=fixture(t,{fixtureSpec:spec});const b=await broker(t,f.run,'B');
 const first=await b.call('context');assert.ok(Buffer.byteLength(JSON.stringify(first.data))<12000);
 assert.equal(first.data.paged,true);let page=first.data;let raw='';
 for(;;) {raw+=page.content;if(page.next_cursor===null) break;const next=await b.call('context',{resource:page.resource,cursor:page.next_cursor});assert.equal(next.error,false);page=next.data;assert.ok(Buffer.byteLength(JSON.stringify(page))<12000);}
 const actual=JSON.parse(raw);assert.equal(actual.spec,spec);assert.deepEqual(actual.tests,f.config.tests);
 assert.equal((await b.call('context',{resource:'../manifest',cursor:0})).error,true);
});

test('R01 大测试输出分页保留完整原件与哈希',async t=>{
 const f=fixture(t,{tests:[{id:'related',argv:['python3','-c','print("evidence"*8000)']}]});const b=await broker(t,f.run,'A');
 let page=(await b.call('run_test',{test_id:'related'})).data;assert.equal(page.paged,true);let raw='';
 for(;;) {assert.ok(Buffer.byteLength(JSON.stringify(page))<12000);raw+=page.content;if(page.next_cursor===null)break;page=(await b.call('context',{resource:page.resource,cursor:page.next_cursor})).data;}
 const receipt=JSON.parse(raw);assert.equal(receipt.stdout,'evidence'.repeat(8000)+'\n');assert.equal(receipt.actor,'A');assert.equal(receipt.complete,true);
 assert.equal((await b.call('submit_report',cleanReport({evidence_ids:[receipt.id]}))).error,false);
});

test('R04 critic只看上下文首段不能冒充已读全部依赖',t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder,'partial-context'),fixtureSpec:'### Requirement: total\n#### Scenario: empty\nempty returns zero\n'+('context detail\n'.repeat(1000))});
 const r=invoke(['run','--run',f.run,'--budget-seconds','20']);assert.equal(r.data.status,'incomplete',JSON.stringify(r));assert.deepEqual(r.data.gaps,['critic-1 缺少完成回执']);
});

test('R06 新worker不能继承旧worker的分页已读记录',async t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder,'page-resume'),fixtureSpec:'### Requirement: total\n#### Scenario: empty\nempty returns zero\n'+('context detail\n'.repeat(1000))});
 const proc=spawn('python3',[cli,'run','--run',f.run,'--budget-seconds','20'],{stdio:['ignore','pipe','pipe']});const closed=new Promise(resolve=>proc.on('close',resolve));t.after(()=>proc.kill());
 const deadline=Date.now()+10000;while(!existsSync(path.join(folder,'client.ready'))&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
 assert.ok(existsSync(path.join(folder,'client.ready')),'first worker must really finish context delivery');proc.kill('SIGTERM');await closed;
 const resumed=invoke(['run','--run',f.run,'--budget-seconds','20']);assert.equal(resumed.data.status,'incomplete',JSON.stringify(resumed));assert.deepEqual(resumed.data.gaps,['critic-1 缺少完成回执']);
});

test('R03 大校验错误也可在受控接口中完整读取',async t=>{
 const f=fixture(t);const b=await broker(t,f.run,'B');let result=await b.call('submit_report',cleanReport({report:{findings:Array.from({length:150},()=>({})),coverage_note:'invalid protocol payload'}}));
 assert.equal(result.error,true);let page=result.data;assert.ok(Buffer.byteLength(JSON.stringify(page))<12000);assert.equal(page.paged,true);let raw='';
 for(;;){raw+=page.content;if(page.next_cursor===null)break;page=(await b.call('context',{resource:page.resource,cursor:page.next_cursor})).data;assert.ok(Buffer.byteLength(JSON.stringify(page))<12000);}
 assert.match(JSON.parse(raw).error,/schema/);assert.ok(raw.length>12000);
});

test('R04 初审维度不读取其他维度结论，D仍取得真实触发范围',async t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const trigger={file:'cart.py',line:2,quote:'    return sum(values) + 1'};
 const f=fixture(t,{client:fakeClient(folder),d_request:[trigger]});assert.equal(invoke(['run','--run',f.run,'--budget-seconds','20']).data.status,'completed');
 const b=await broker(t,f.run,'B');const c=(await b.call('context')).data;assert.deepEqual(c.reports,{});assert.ok(c.test_receipts.every(x=>x.actor==='B'));
 const d=await broker(t,f.run,'D');assert.deepEqual((await d.call('context')).data.architecture_scope,[trigger]);
});

test('R04 补查者必须实际读取原报告与critic缺口',t=>{
 const folder=mkdtempSync(path.join(tmpdir(),'review-client-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const f=fixture(t,{client:fakeClient(folder,'skip-supplement-context')});const r=invoke(['run','--run',f.run,'--budget-seconds','20']);assert.equal(r.data.status,'incomplete',JSON.stringify(r));assert.ok(r.data.gaps.includes('supplement-S 缺少完成回执'));
});
