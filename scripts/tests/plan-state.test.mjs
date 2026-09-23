import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fixture,run,check,evidence,enter,waiting,archiveFixture,git,hash,projectRoot as root} from './helpers/group-fixture.mjs';
test('S07 group can start after external dependencies complete',()=>{const f=fixture();try{assert.deepEqual(check(f).ready_tasks,['T01']);}finally{rmSync(f.outer,{recursive:true});}});
test('S05/S07 waiting member permits only next in-group task',()=>{const f=fixture();try{enter(f);waiting(f,'T01');f.save();const j=check(f);assert.deepEqual(j.ready_tasks,['T02']);assert.equal(j.active_group,'G01');assert.equal(f.state.tasks.T01.status,'awaiting_verification');}finally{rmSync(f.outer,{recursive:true});}});
test('S12 blocked group returns no ready task without pretending inconsistent data',()=>{const f=fixture();try{enter(f);waiting(f,'T01');Object.assign(f.state.integration.groups.G01,{status:'blocked'});f.state.tasks.T02={status:'blocked',tests:'fail'};f.save();assert.deepEqual(check(f).ready_tasks,[]);}finally{rmSync(f.outer,{recursive:true});}});
test('S11 partial completion is rejected',()=>{const f=fixture();try{enter(f);waiting(f,'T01');f.state.tasks.T01={status:'completed',commit:f.base,tests:'pass'};f.save();check(f,false);}finally{rmSync(f.outer,{recursive:true});}});
test('S29 ordinary task has no waiting privilege',()=>{const f=fixture();try{waiting(f,'T04');f.save();check(f,false);}finally{rmSync(f.outer,{recursive:true});}});

test('S14 implementation checkpoint may be preserved without replay',()=>{const f=fixture();try{enter(f);waiting(f,'T01');f.save();const before=git(f.wt,'rev-parse','HEAD');check(f);assert.equal(git(f.wt,'rev-parse','HEAD'),before);}finally{rmSync(f.outer,{recursive:true});}});
test('S15 uncommitted completed state cannot unlock an external task',()=>{const f=fixture();try{enter(f);waiting(f,'T01');waiting(f,'T02');f.save();const v=git(f.wt,'rev-parse','HEAD'),ev=evidence(f,'T03');for(const id of ['T01','T02'])Object.assign(f.state.tasks[id],{status:'completed',tests:'pass',commit:v});f.state.tasks.T03={status:'completed',commit:v,tests:'pass',evidence_paths:[ev]};Object.assign(f.state.integration.groups.G01,{status:'completed',validated_commit:v,evidence_paths:[ev]});Object.assign(f.state.integration,{active_group:null,validated_commit:v});writeFileSync(path.join(f.dir,'progress.yaml'),JSON.stringify(f.state));assert.match(JSON.stringify(check(f,false)),/checkpoint_uncommitted/);f.save();assert.deepEqual(check(f).ready_tasks,['T04']);}finally{rmSync(f.outer,{recursive:true});}});
test('S16 missing/corrupt evidence is rejected',()=>{const f=fixture();try{enter(f);waiting(f,'T01');f.save();const rec=path.join(f.wt,f.feature,f.state.tasks.T01.evidence_paths[0]);const manifest=JSON.parse(readFileSync(rec));writeFileSync(path.join(f.wt,f.feature,manifest.stdout),'corrupt');git(f.wt,'add','.');git(f.wt,'commit','-qm','corrupt');check(f,false);}finally{rmSync(f.outer,{recursive:true});}});
test('S16 wrong branch binding is rejected',()=>{const f=fixture();try{f.state.integration.branch='different';f.save();check(f,false);}finally{rmSync(f.outer,{recursive:true});}});
test('S16 unexplained business commit is rejected',()=>{const f=fixture();try{writeFileSync(path.join(f.wt,'source.txt'),'unexplained\n');git(f.wt,'add','source.txt');git(f.wt,'commit','-qm','unknown business edit');check(f,false);}finally{rmSync(f.outer,{recursive:true});}});
test('S09 inconsistent parallel projection is rejected',()=>{const f=fixture();try{f.state.execution={mode:'parallel',owner:'another',integration_worktree:f.wt,integration_branch:'fixture-work',base_commit:f.base,validated_commit:f.base};f.save();check(f,false);}finally{rmSync(f.outer,{recursive:true});}});
test('S16 nonexistent implementation SHA is rejected',()=>{const f=fixture();try{enter(f);waiting(f,'T01');f.state.tasks.T01.implementation_commit='1'.repeat(40);f.save();check(f,false);}finally{rmSync(f.outer,{recursive:true});}});


test('S08 union of external prerequisites blocks early group entry',()=>{const f=fixture();try{
 const p=path.join(f.dir,'index.md');let text=readFileSync(p,'utf8');
 text=text.replace('| T02 | T01 |','| T02 | T01,T04 |').replace('| T04 | T03 |','| T04 | T00 |');
 text=text.replace('\n\n```json','\n| T05 | T03 | x | y |\n\n```json').replace('"T04": "delivery"','"T05": "delivery"');writeFileSync(p,text);writeFileSync(path.join(f.dir,'tasks/T05.md'),'# T05 delivery\n');f.state.tasks.T05={status:'pending'};f.save('new fixture contract');
 const b=git(f.wt,'rev-parse','HEAD');f.state.tasks.T00.commit=b;f.state.integration.base_commit=b;f.state.integration.validated_commit=b;f.base=b;f.save('new baseline');
 assert.deepEqual(check(f).ready_tasks,['T04']);
 f.state.tasks.T04={status:'completed',commit:b,tests:'pass'};f.save();assert.deepEqual(check(f).ready_tasks,['T01']);
}finally{rmSync(f.outer,{recursive:true});}});
test('S16 evidence symlink cannot escape the feature',()=>{const f=fixture();try{
 enter(f);waiting(f,'T01');f.save();const rec=path.join(f.wt,f.feature,f.state.tasks.T01.evidence_paths[0]);const e=JSON.parse(readFileSync(rec));const log=path.join(f.wt,f.feature,e.stdout),outside=path.join(f.outer,'outside.log');writeFileSync(outside,readFileSync(log));rmSync(log);symlinkSync(outside,log);git(f.wt,'add','.');git(f.wt,'commit','-qm','escaped log');assert.match(JSON.stringify(check(f,false)),/escapes/);
}finally{rmSync(f.outer,{recursive:true});}});
test('S16 failed verification record cannot support completed group',()=>{const f=fixture();try{
 enter(f);waiting(f,'T01');waiting(f,'T02');f.save();const v=git(f.wt,'rev-parse','HEAD'),ev=evidence(f,'T03',1);for(const id of ['T01','T02'])Object.assign(f.state.tasks[id],{status:'completed',tests:'pass',commit:v});f.state.tasks.T03={status:'completed',commit:v,tests:'pass',evidence_paths:[ev]};Object.assign(f.state.integration.groups.G01,{status:'completed',validated_commit:v,evidence_paths:[ev]});Object.assign(f.state.integration,{active_group:null,validated_commit:v});f.save();assert.match(JSON.stringify(check(f,false)),/verification did not pass/);
}finally{rmSync(f.outer,{recursive:true});}});

test('S17 unsupported data version is rejected',()=>{const f=fixture();try{f.state.format_version=9;f.save();check(f,false);}finally{rmSync(f.outer,{recursive:true});}});

test('S05/S16 waiting evidence must include the current implementation tree while preserving history',()=>{const f=fixture();try{
  enter(f);
  const command=[process.execPath,'-e',"require('node:assert/strict').equal(require('node:fs').readFileSync('source.txt','utf8'),'before\\n')"];
  const old=evidence(f,'T01',0,'baseline',command),recordPath=path.join(f.wt,f.feature,old),original=readFileSync(recordPath);
  assert.equal(JSON.parse(original).exit_code,0);
  f.state.tasks.T01={status:'awaiting_verification',implementation_commit:f.base,commit:null,tests:'pending_group',evidence_paths:[old]};
  f.save('same tree history');
  assert.deepEqual(check(f).ready_tasks,['T02']);
  writeFileSync(path.join(f.wt,'source.txt'),'after\n');git(f.wt,'add','source.txt');git(f.wt,'commit','-qm','migration');
  const implementation=git(f.wt,'rev-parse','HEAD');
  f.state.tasks.T01.implementation_commit=implementation;f.state.integration.groups.G01.checkpoint_commit=implementation;f.save();
  assert.match(JSON.stringify(check(f,false)),/current implementation tree/);
  const current=evidence(f,'T01',1,'current',command);
  assert.equal(JSON.parse(readFileSync(path.join(f.wt,f.feature,current))).exit_code,1);
  f.state.tasks.T01.evidence_paths.push(current);f.save('current check plus historical baseline');
  assert.deepEqual(check(f).ready_tasks,['T02']);
  assert.deepEqual(readFileSync(recordPath),original);
}finally{rmSync(f.outer,{recursive:true});}});

for(const name of ['index.md','progress.yaml'])test('S14 exact committed checkpoint accepts leading whitespace in '+name,()=>{const f=fixture();try{
  const file=path.join(f.dir,name);writeFileSync(file,'\n'+readFileSync(file,'utf8'));
  git(f.wt,'add','.');git(f.wt,'commit','-qm','legal leading whitespace');
  if(name==='index.md'){
    const base=git(f.wt,'rev-parse','HEAD');f.state.tasks.T00.commit=base;f.state.integration.base_commit=base;f.state.integration.validated_commit=base;f.save('bind plan baseline');
  }
  assert.deepEqual(check(f).ready_tasks,['T01']);
  writeFileSync(file,'\n'+readFileSync(file,'utf8'));
  assert.match(JSON.stringify(check(f,false)),/checkpoint_uncommitted/);
}finally{rmSync(f.outer,{recursive:true});}});


test('S27 terminal archive remains verifiable after actual merge and owned worktree cleanup',()=>{const f=archiveFixture();try{
 f.complete();assert.deepEqual(check(f).ready_tasks,[]);assert.equal(f.state.integration.worktree,f.originalWorktree);
 assert.deepEqual(readFileSync(path.join(f.wt,f.feature,f.ev)),f.originalRecord);
}finally{rmSync(f.outer,{recursive:true});}});
test('S27 terminal parallel archive preserves the historical execution projection',()=>{const f=archiveFixture();try{
 const x=f.state.integration;f.state.execution={mode:'parallel',owner:x.owner,integration_worktree:x.worktree,integration_branch:x.branch,base_commit:x.base_commit,validated_commit:x.validated_commit};
 f.complete();assert.deepEqual(check(f).ready_tasks,[]);
}finally{rmSync(f.outer,{recursive:true});}});
for(const status of ['in_progress','blocked','pending'])test('S27 post-cleanup '+status+' checkpoint never gains terminal scheduling privileges',()=>{const f=archiveFixture();try{
 f.state.tasks.T04={status};f.state.current=status==='in_progress'?'T04':null;f.save();check(f,false);
}finally{rmSync(f.outer,{recursive:true});}});
test('S27 terminal archive rejects rewritten historical cwd',()=>{const f=archiveFixture();try{
 const p=path.join(f.wt,f.feature,f.ev),e=JSON.parse(readFileSync(p));e.cwd=f.wt;writeFileSync(p,JSON.stringify(e));f.complete();
 assert.match(JSON.stringify(check(f,false)),/cwd mismatch/);
}finally{rmSync(f.outer,{recursive:true});}});
test('S27 terminal archive rejects changed evidence bytes',()=>{const f=archiveFixture();try{
 const e=JSON.parse(f.originalRecord);writeFileSync(path.join(f.wt,f.feature,e.stdout),'forged');f.complete();
 assert.match(JSON.stringify(check(f,false)),/hash mismatch/);
}finally{rmSync(f.outer,{recursive:true});}});
test('S27 terminal archive rejects unexplained target business changes',()=>{const f=archiveFixture();try{
 writeFileSync(path.join(f.wt,'source.txt'),'unverified target edit\n');git(f.wt,'add','.');git(f.wt,'commit','-qm','unverified');f.complete();
 assert.match(JSON.stringify(check(f,false)),/unexplained business commit/);
}finally{rmSync(f.outer,{recursive:true});}});
test('S27 terminal archive rejects missing original commit ancestry',()=>{const f=archiveFixture();try{
 f.complete();git(f.wt,'checkout','--orphan','unrelated');git(f.wt,'add','.');git(f.wt,'commit','-qm','copied archive without history');check(f,false);
}finally{rmSync(f.outer,{recursive:true});}});
test('S27 terminal archive still rejects uncommitted progress',()=>{const f=archiveFixture();try{
 f.complete();f.state.notes.push('uncommitted');writeFileSync(path.join(f.dir,'progress.yaml'),JSON.stringify(f.state));
 assert.match(JSON.stringify(check(f,false)),/checkpoint_uncommitted/);
}finally{rmSync(f.outer,{recursive:true});}});

for(const field of ['worktree','branch'])test('S27 terminal archive rejects forged historical '+field,()=>{const f=archiveFixture();try{
 if(field==='worktree'){
  f.state.integration.worktree=path.join(f.outer,'never-existed');
  for(const t of Object.values(f.state.tasks))for(const rel of t.evidence_paths??[]){
   const p=path.join(f.wt,f.feature,rel),e=JSON.parse(readFileSync(p));e.cwd=f.state.integration.worktree;writeFileSync(p,JSON.stringify(e));
  }
 }else f.state.integration.branch='never-existed';
 f.complete();assert.match(JSON.stringify(check(f,false)),/historical binding mismatch/);
}finally{rmSync(f.outer,{recursive:true});}});

for(const state of ['implementing','awaiting_merge'])test('S27 terminal archive rejects explicit incomplete delivery '+state,()=>{const f=archiveFixture();try{
 const x=f.state.integration;f.state.execution={mode:'parallel',owner:x.owner,integration_worktree:x.worktree,integration_branch:x.branch,base_commit:x.base_commit,validated_commit:x.validated_commit,delivery:{channel:'pr',state}};
 f.complete();assert.match(JSON.stringify(check(f,false)),/incomplete delivery/);
}finally{rmSync(f.outer,{recursive:true});}});
