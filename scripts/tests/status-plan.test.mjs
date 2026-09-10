
import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePlanFiles} from '../lib/status-parse.mjs';
const nav=ids=>'| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n'+ids.map((id,i)=>`| ${id} title | ${i?ids[i-1]:'—'} | a | b |`).join('\n');
const basic=(changes={})=>({index:nav(['T00','T01']),taskNames:['T00.md','T01.md'],progress:JSON.stringify({format_version:1,current:null,tasks:{T00:{status:'completed'},T01:{status:'pending'}},resources:[],notes:[]}),...changes});
test('S09 v1 YAML 和 JSON：导航为计数分母',()=>assert.deepEqual(parsePlanFiles(basic()).counts,{total:2,completed:1,pending:1,in_progress:0,blocked:0,awaiting_verification:0}));
test('S10 并发 current 为 null',()=>{
 const f=basic(),s=JSON.parse(f.progress);s.execution={mode:'parallel'};s.tasks.T00.status=s.tasks.T01.status='in_progress';f.progress=JSON.stringify(s);
 assert.equal(parsePlanFiles(f).counts.in_progress,2);assert.equal(parsePlanFiles(f).current,null);
});
test('S11 v2 集成组待验',()=>{
 const a='a'.repeat(40),b='b'.repeat(40),ids=['T00','T01','T02','T03','T04'];
 const index='| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n| T00 | — | a | b |\n| T01 | T00 | a | b |\n| T02 | T01 | a | b |\n| T03 | T01-T02 | a | b |\n| T04 | T03 | a | b |\n```json spec-dev-integration\n'+JSON.stringify({protocol_version:1,task_roles:{T00:'isolation',T04:'delivery'},groups:{G01:{members:['T01','T02'],verify:'T03',reason:'atomic behavior'}}})+'\n```';
 const state={format_version:2,current:'T02',tasks:{T00:{status:'completed',commit:a},T01:{status:'awaiting_verification',tests:'pending_group',implementation_commit:b,commit:null,evidence_paths:['e']},T02:{status:'blocked'},T03:{status:'pending'},T04:{status:'pending'}},resources:[],notes:[],integration:{owner:'o',worktree:'/fixture',branch:'b',base_commit:a,validated_commit:a,active_group:'G01',groups:{G01:{status:'blocked',base_commit:a,checkpoint_commit:b,validated_commit:null,evidence_paths:[]}}}};
 const r=parsePlanFiles({index,progress:JSON.stringify(state),taskNames:ids.map(id=>id+'.md')});assert.equal(r.counts.total,5);assert.equal(r.counts.completed,1);assert.equal(r.counts.awaiting_verification,1);assert.equal(r.counts.blocked,1);
});
test('S12 旧任务与代码块中的复选框',()=>{
 const r=parsePlanFiles({legacy:[['old-plan.md','### 任务 0：one\n- [x] done\n```md\n### 任务 99\n- [x] fake\n```\n### Task 1: two\n- [ ] open']]});
 assert.equal(r.counts.total,2);assert.equal(r.counts.checked,1);assert.equal(r.format,'legacy');
});
test('S13 无法辨认的旧结构',()=>{
 assert.throws(()=>parsePlanFiles({legacy:[['old-plan.md','no task']]}));
 assert.equal(parsePlanFiles({legacy:[['old-plan.md','### 任务 1：无步骤']]}).counts,null);
});
test('S14 缺配套文件与任务不一致',()=>{
 for(const f of [{taskNames:['T00.md']},basic({index:null}),basic({taskNames:['T00.md']}),basic({progress:'format_version: 1\ncurrent: T99\ntasks: {}\nresources: []\nnotes: []'})])assert.throws(()=>parsePlanFiles(f));
});
test('S15 非法语法与未知协议',()=>{
 for(const patch of [{format_version:99},{format_version:1,tasks:{T00:{status:'awaiting_verification'},T01:{status:'pending'}}}]){
  const f=basic();f.progress=JSON.stringify({...JSON.parse(f.progress),...patch});assert.throws(()=>parsePlanFiles(f));
 }
});
