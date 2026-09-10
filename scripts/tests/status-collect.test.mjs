import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {collectStatus,groupSources} from '../lib/status.mjs';
const scope=path.resolve('.worktrees/status-overview-qa');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},stdio:['ignore','pipe','pipe']}).trim();
async function fixture(fn){
 await fs.mkdir(scope,{recursive:true});const dir=await fs.mkdtemp(path.join(scope,'machine-'));
 try{const root=path.join(dir,'main');await fs.mkdir(root);git(root,'init','-q');git(root,'-c','user.name=Status Test','-c','user.email=status@example.invalid','-c','core.hooksPath=/dev/null','commit','--allow-empty','-qm','init');await fn(root,dir);}
 finally{await fs.rm(dir,{recursive:true,force:true});}
}
async function write(root,file,content){const p=path.join(root,file);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,content);}
const spec='---\nspec_dev:\n  feature: F\n  status: active\n---\n';
async function plan(root,state='pending'){
 await write(root,'.spec-dev/F/spec/f-design.md',spec);
 await write(root,'.spec-dev/F/plan/index.md','| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n| T00 first | — | a | b |');
 await write(root,'.spec-dev/F/plan/tasks/T00.md','do not read this task body');
 await write(root,'.spec-dev/F/plan/progress.yaml',JSON.stringify({format_version:1,current:null,tasks:{T00:{status:state}},resources:[],notes:[]}));
}
test('S03 主工作区与 detached 工作区 / S16 相同进度折叠 / S17 状态不同',()=>fixture(async(root,dir)=>{
 const other=path.join(dir,'other tree'),detached=path.join(dir,'detached');git(root,'worktree','add','-qb','other',other);git(root,'worktree','add','--detach',detached);
 await plan(root);await plan(other);await plan(detached,'blocked');
 const r=await collectStatus(other);assert.equal(r.worktrees.length,3);assert.equal(r.features.length,1);assert.equal(r.summary.source_records,3);assert.equal(r.features[0].divergence.different,true);assert.equal(r.diagnostics.length,0);assert.equal(r.worktrees.filter(w=>w.detached).length,1);
}));
test('S05 深层验收夹具排除 / S14 tasks-only / S18 单分支特性',()=>fixture(async(root)=>{
 await plan(root);await write(root,'.spec-dev/F/acceptance/x/.spec-dev/demo/plan/progress.yaml','fake');await write(root,'.spec-dev/Broken/plan/tasks/T00.md','residue');
 const r=await collectStatus(root);assert.deepEqual(r.features.map(f=>f.key),['.spec-dev/Broken','.spec-dev/F']);assert.ok(r.diagnostics.some(d=>d.code==='missing'));
}));
test('S06 历史位置与符号链接 / S12 旧任务',()=>fixture(async(root,dir)=>{
 await write(root,'docs/2020-01-01-old/plan/old-plan.md','### 任务 0：one\n- [x] done');await fs.mkdir(path.join(root,'.spec-dev'));await fs.symlink(dir,path.join(root,'.spec-dev/link'));
 const r=await collectStatus(root);assert.ok(r.features.length>0);assert.equal(r.features[0].sources[0].plan.format,'legacy');assert.ok(r.diagnostics.some(d=>d.code==='symlink_skipped'));
}));
test('S07 active spec 没有计划 / S08 未知状态与缺失关联',()=>fixture(async(root)=>{
 await write(root,'.spec-dev/F/spec/f-design.md',spec);await write(root,'.spec-dev/G/spec/g-design.md',spec.replace('active','delivered'));
 await write(root,'.spec-dev/roadmaps/p.md','---\nspec_dev_roadmap:\n  project: P\n  status: active\n---\n## 子项目\n| # | 子项目 | 范围 | 依赖 | 状态 | 特性目录 |\n|---|---|---|---|---|---|\n| 1 | Missing | x | — | pending | .spec-dev/none/ |');
 const r=await collectStatus(root);assert.ok(r.features.length>0);assert.equal(r.features[0].sources[0].plan,null);assert.equal(r.features[1].sources[0].specs[0].status,'delivered');assert.ok(r.diagnostics.some(d=>d.code==='missing'));
}));
test('S23 已完成记录不触发验证',()=>fixture(async(root)=>{
 await plan(root,'completed');const file=path.join(root,'.spec-dev/F/plan/progress.yaml'),before=await fs.readFile(file,'utf8'),calls=[],reads=[];
 const r=await collectStatus(root,{git:async(cwd,args)=>{calls.push(args);return git(cwd,...args)+(args.includes('-z')?'':'\n');},read:async p=>{reads.push(p);return fs.readFile(p,'utf8');}});
 assert.equal(r.verification,'not_performed');assert.equal(await fs.readFile(file,'utf8'),before);assert.ok(calls.every(a=>a[0]==='rev-parse'||a.join(' ')==='worktree list --porcelain -z'));assert.ok(reads.every(p=>!p.includes('/tasks/')&&!p.includes('/acceptance/')&&!p.includes('/execution/')));
}));
test('S24 文件在读取期间更新 / S25 第一次变化后稳定',()=>fixture(async(root)=>{
 await plan(root);const file=path.join(root,'.spec-dev/F/plan/progress.yaml');let writes=0;
 const run=limit=>collectStatus(root,{read:async p=>{const text=await fs.readFile(p,'utf8');if(p===file&&writes<limit){writes++;await fs.writeFile(p,text+' ');}return text;}});
 let r=await run(1);assert.equal(r.diagnostics.length,0);writes=0;r=await run(2);assert.ok(r.diagnostics.some(d=>d.code==='unstable'));assert.equal(r.features[0].sources[0].plan,null);
}));
test('S17 仅关联 roadmap 状态不同也保留分歧',()=>fixture(async(root,dir)=>{
 await plan(root);const other=path.join(dir,'other');git(root,'worktree','add','-qb','other',other);await plan(other);
 for(const [target,status] of [[root,'pending'],[other,'in-progress']])await write(target,'.spec-dev/roadmaps/p.md','---\nspec_dev_roadmap:\n  project: P\n  status: active\n---\n## 子项目\n| # | 子项目 | 范围 | 依赖 | 状态 | 特性目录 |\n|---|---|---|---|---|---|\n| 1 | F | x | — | '+status+' | .spec-dev/F/ |');
 const r=await collectStatus(root);assert.ok(r.features.length>0);assert.equal(r.diagnostics.length,0);assert.deepEqual(r.features[0].divergence.fields,['roadmaps']);assert.equal(r.features[0].sources[0].roadmaps.length,1);
}));
test('S18 特性只存在于一个分支不报缺失',()=>fixture(async(root,dir)=>{
 await plan(root);git(root,'worktree','add','-qb','empty',path.join(dir,'empty'));
 const r=await collectStatus(root);assert.equal(r.worktrees.length,2);assert.equal(r.summary.source_records,1);assert.deepEqual(r.diagnostics,[]);
}));
test('S16 notes差异不构成进度分歧 / S18 路径身份',()=>{
 const s={key:'.spec-dev/F',worktree:'/a',specs:[],plan:null,roadmaps:[],read_status:'ok',notes:['a']};
 const r=groupSources([s,{...s,worktree:'/b',notes:['b']},{...s,key:'.spec-dev/G'}]);assert.equal(r.length,2);assert.equal(r[0].divergence.different,false);
});
