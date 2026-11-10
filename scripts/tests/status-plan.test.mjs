
import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePlanFiles} from '../lib/status-parse.mjs';
const nav=ids=>'| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n'+ids.map((id,i)=>`| ${id} title | ${i?ids[i-1]:'—'} | a | b |`).join('\n');
const basic=(changes={})=>({index:nav(['T00','T01']),taskNames:['T00.md','T01.md'],progress:JSON.stringify({format_version:1,current:null,tasks:{T00:{status:'completed'},T01:{status:'pending'}},resources:[],notes:[]}),...changes});
test('现行单文件计划：复选框即进度，执行记录不计入任务',()=>{
 const text='# 功能 实施计划\n\n**收尾预先决定**：做完再问\n\n## 任务导航\n\n| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n| T01 a | — | — | x |\n| T02 b | T01 | x | y |\n\n### 任务 1：第一个行为\n- [x] **步骤 1：写失败测试**\n- [x] **步骤 2：确认有效红**\n\n### 任务 2：第二个行为\n- [x] **步骤 1：写失败测试**\n- [ ] **步骤 2：确认有效红**\n\n## 执行记录\n- [x] 这不是任务步骤\n';
 const r=parsePlanFiles({single:[['f-plan.md',text]]});
 assert.equal(r.format,'single');assert.deepEqual(r.counts,{total:2,checked:1,unchecked:1,unknown:0});
 assert.deepEqual(r.tasks.map(t=>[t.id,t.status,t.checked,t.total]),[['1','checked',2,2],['2','unchecked',1,2]]);
});
test('S12 代码块中的任务与复选框不计入',()=>{
 const r=parsePlanFiles({single:[['old-plan.md','### 任务 0：one\n- [x] done\n```md\n### 任务 99\n- [x] fake\n```\n### Task 1: two\n- [ ] open']]});
 assert.equal(r.counts.total,2);assert.equal(r.counts.checked,1);
});
test('S13 无法辨认的结构',()=>{
 assert.throws(()=>parsePlanFiles({single:[['old-plan.md','no task']]}));
 assert.equal(parsePlanFiles({single:[['old-plan.md','### 任务 1：无步骤']]}).counts,null);
 assert.throws(()=>parsePlanFiles({single:[['a-plan.md','### 任务 1\n- [ ] x'],['b-plan.md','### 任务 1\n- [ ] x']]}),/multiple/);
});
test('S10 旧计划里的 scopes 块不影响复选框计数，也不改输入',()=>{
 const text='### Task 0: setup\n- [x] done\n### Task 1: implementation\n- [ ] next\n```json spec-dev-scopes\n{"version":1,"note":"- [x] sample"}\n```\n';
 const input={single:[['old.md',text]]},before=JSON.stringify(input),r=parsePlanFiles(input);
 assert.equal(r.counts.checked,1);assert.equal(r.counts.unchecked,1);assert.equal(JSON.stringify(input),before);
});
test('S09 早期分文件计划：导航为计数分母',()=>assert.deepEqual(parsePlanFiles(basic()).counts,{total:2,completed:1,pending:1,in_progress:0,blocked:0,awaiting_verification:0}));
test('S10/S11 早期分文件计划只读取进度，不再校验并发与集成组协议',()=>{
 const f=basic(),s=JSON.parse(f.progress);s.execution={mode:'parallel'};s.tasks.T00.status=s.tasks.T01.status='in_progress';f.progress=JSON.stringify(s);
 const parallel=parsePlanFiles(f);assert.equal(parallel.counts.in_progress,2);assert.equal(parallel.current,null);assert.equal(parallel.mode,'parallel');
 const ids=['T00','T01','T02','T03','T04'];
 const state={format_version:2,current:'T02',tasks:{T00:{status:'completed'},T01:{status:'awaiting_verification'},T02:{status:'blocked'},T03:{status:'pending'},T04:{status:'pending'}},resources:[],notes:[],unexpected:true,integration:{groups:{G01:{status:'blocked'}}}};
 const r=parsePlanFiles({index:nav(ids),progress:JSON.stringify(state),taskNames:ids.map(id=>id+'.md')});
 assert.equal(r.format,'v2');assert.equal(r.counts.total,5);assert.equal(r.counts.awaiting_verification,1);assert.equal(r.counts.blocked,1);assert.deepEqual(r.groups,[{id:'G01',status:'blocked'}]);
});
test('S14 缺配套文件与任务不一致',()=>{
 for(const f of [{taskNames:['T00.md']},basic({index:null}),basic({taskNames:['T00.md']}),basic({progress:'format_version: 1\ncurrent: T99\ntasks: {}\nresources: []\nnotes: []'})])assert.throws(()=>parsePlanFiles(f));
 assert.throws(()=>parsePlanFiles({...basic(),single:[['x-plan.md','### 任务 1\n- [ ] x']]}),/conflicting/);
});
test('S15 未知版本与未知状态',()=>{
 for(const patch of [{format_version:99},{tasks:{T00:{status:'bogus'},T01:{status:'pending'}}}]){
  const f=basic();f.progress=JSON.stringify({...JSON.parse(f.progress),...patch});assert.throws(()=>parsePlanFiles(f));
 }
});
