import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const cli=path.join(root,'scripts/validate-output.mjs');
const rows=[['T00',[]],['T01',['T00']],['T02',['T01']],['T03',['T01','T02']],['T04',['T03']]];
function fixture(mutate=()=>{},raw=null){
  const dir=mkdtempSync(path.join(tmpdir(),'pd-index-'));mkdirSync(path.join(dir,'tasks'));
  const decl={protocol_version:1,task_roles:{T00:'isolation',T04:'delivery'},groups:{G01:{members:['T01','T02'],verify:'T03',reason:'two linked consumers'}}};
  const table=structuredClone(rows);mutate(decl,table);
  const md='# fixture\n\n| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n'+table.map(([id,deps])=>`| ${id} | ${deps.join(',')} | x | y |`).join('\n')+'\n\n```json spec-dev-integration\n'+(raw??JSON.stringify(decl,null,2))+'\n```\n';
  writeFileSync(path.join(dir,'index.md'),md);for(const [id] of table)writeFileSync(path.join(dir,'tasks',id+'.md'),'# '+id+'\n');
  writeFileSync(path.join(dir,'progress.yaml'),JSON.stringify({format_version:2,current:null,tasks:Object.fromEntries(table.map(([id])=>[id,{status:'pending'}])),resources:[],notes:[],integration:{owner:null,worktree:null,branch:null,base_commit:null,validated_commit:null,active_group:null,groups:{G01:{status:'pending',base_commit:null,checkpoint_commit:null,validated_commit:null,evidence_paths:[]}}}}));
  return dir;
}
function check(dir,ok){const r=spawnSync(process.execPath,[cli,'plan-index',dir],{encoding:'utf8'});assert.equal(r.status,ok?0:1,r.stdout+r.stderr);const j=JSON.parse(ok?r.stdout:r.stderr);assert.equal(j.ok,ok);return j;}
test('S03 valid group has two members and one verifier',()=>{const d=fixture();try{check(d,true);}finally{rmSync(d,{recursive:true});}});
for(const [name,mutate] of [
 ['unknown member',d=>d.groups.G01.members[1]='T99'],
 ['nested group',d=>d.groups.G01.groups={}],
 ['acceptance member',d=>d.task_roles.T02='acceptance'],
 ['delivery member',d=>d.groups.G01.members[1]='T04'],
 ['duplicate member',d=>d.groups.G01.members[1]='T01'],
 ['isolation as member',d=>d.groups.G01.members[0]='T00'],
 ['verifier as member',d=>d.groups.G01.members[1]='T03'],
 ['missing verifier deps',(d,r)=>r[3][1]=['T02']],
 ['external member consumer',(d,r)=>r[4][1]=['T01']],
 ['collapsed group cycle',(d,r)=>{r[1][1]=['T04'];}],
 ['member order',d=>d.groups.G01.members.reverse()],
 ['unknown group field',d=>d.groups.G01.alias='ignored'],
 ['unknown protocol',d=>d.protocol_version=9],
 ['duplicate group membership',d=>d.groups.G02={...d.groups.G01,verify:'T02'}]
])test('S03/S04 rejects '+name,()=>{const d=fixture(mutate);try{check(d,false);}finally{rmSync(d,{recursive:true});}});
test('S03 duplicate JSON keys cannot disappear during parsing',()=>{const d=fixture(()=>{},'{"protocol_version":1,"protocol_version":1,"task_roles":{},"groups":{}}');try{assert.match(JSON.stringify(check(d,false)),/duplicate/);}finally{rmSync(d,{recursive:true});}});

test('S03 group members cannot appear in parallel declaration',()=>{const d=fixture();try{
 const p=path.join(d,'index.md');writeFileSync(p,readFileSync(p,'utf8')+'\n```yaml spec-dev-parallel\nparallel:\n  tasks:\n    T01:\n      writes:\n        - "src/a.mjs"\n      resources: []\n```\n');
 assert.match(JSON.stringify(check(d,false)),/parallel/);
}finally{rmSync(d,{recursive:true});}});

test('S18 a group on v1 is rejected but existing v1 plan stays readable',()=>{const d=fixture();try{writeFileSync(path.join(d,'progress.yaml'),'format_version: 1\n');check(d,false);const old=fixture();try{const index=path.join(old,'index.md');writeFileSync(index,readFileSync(index,'utf8').split('\n```json spec-dev-integration')[0]+'\n');writeFileSync(path.join(old,'progress.yaml'),'format_version: 1\ncurrent: null\ntasks: {}\nresources: []\nnotes: []\n');check(old,true);}finally{rmSync(old,{recursive:true,force:true});}}finally{rmSync(d,{recursive:true});}});
