import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync,symlinkSync,existsSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fixture,run,check,evidence,enter,waiting,archiveFixture,git,hash,projectRoot as root} from './helpers/group-fixture.mjs';
import {businessTree} from '../lib/execution-evidence.mjs';
test('S03 persisted task binding is a valid progress extension',()=>{
 const f=fixture();try{
  f.state.tasks.T04.binding={scope_commit:f.base,scope_digest:'a'.repeat(64),authorization_ref:'fixture',worktree:f.wt,branch:'fixture-work',claim_key:null,claim_checkpoint:null};
  f.save();assert.equal(run(f).status,0);
 }finally{rmSync(f.outer,{recursive:true});}
});
function ordinaryFixture(status='in_progress',parallel=false){
 const f=fixture(),p=path.join(f.dir,'index.md');let s=readFileSync(p,'utf8');
 s=s.replace('| T04 | T03 |','| T04 | T00 |').replace('"T04": "delivery"','"T06": "delivery"');
 s=s.replace('\n\n```json','\n| T05 | T00 | x | y |\n| T06 | T03,T04,T05 | x | y |\n\n```json');
 writeFileSync(p,s);for(const id of ['T05','T06'])writeFileSync(path.join(f.dir,'tasks',id+'.md'),'# '+id+'\n');
 f.state.tasks.T05={status};f.state.tasks.T06={status:'pending'};f.state.current=parallel?null:'T05';f.save();
 const h=git(f.wt,'rev-parse','HEAD');f.state.tasks.T00.commit=h;f.state.integration.base_commit=h;f.state.integration.validated_commit=h;
 if(parallel)f.state.execution={mode:'parallel',owner:f.state.integration.owner,integration_worktree:f.wt,integration_branch:'fixture-work',base_commit:h,validated_commit:h};
 f.save();return f;
}
function squashArchiveFixture(method='squash',withRecords=false,unverifiedSource=false){
 const f=fixture();writeFileSync(path.join(f.wt,'.gitignore'),'.spec-dev/**/execution/\n');
 if(withRecords){
  for(const dir of ['spec','acceptance'])mkdirSync(path.join(f.wt,f.feature,dir),{recursive:true});
  writeFileSync(path.join(f.wt,f.feature,'spec/fixture-design.md'),'---\nspec_dev:\n  status: active\n  sync_commit: null\n---\n# approved behavior\n');
  writeFileSync(path.join(f.wt,f.feature,'acceptance/acceptance-report.md'),'## 验收\nfixture result\n');
  git(f.wt,'add',f.feature+'/spec/fixture-design.md',f.feature+'/acceptance/acceptance-report.md');
 }
 git(f.wt,'add','.gitignore');git(f.wt,'commit','-qm','ignore raw evidence');
 const base=git(f.wt,'rev-parse','HEAD');f.base=base;f.state.tasks.T00.commit=base;f.state.integration.base_commit=base;f.state.integration.validated_commit=base;f.save();
 enter(f);waiting(f,'T01');waiting(f,'T02');f.save();
 const v=git(f.wt,'rev-parse','HEAD'),ev=evidence(f,'T03');
 for(const id of ['T01','T02'])Object.assign(f.state.tasks[id],{status:'completed',tests:'pass',commit:v});
 f.state.tasks.T03={status:'completed',tests:'pass',commit:v,evidence_paths:[ev]};Object.assign(f.state.integration.groups.G01,{status:'completed',validated_commit:v,evidence_paths:[ev]});Object.assign(f.state.integration,{active_group:null,validated_commit:v});
 f.state.tasks.T04={status:'in_progress'};f.state.current='T04';f.save('source ready');
 if(unverifiedSource){writeFileSync(path.join(f.wt,'source.txt'),'unverified source change\n');git(f.wt,'add','source.txt');git(f.wt,'commit','-qm','unverified source');}
 const sourceTip=git(f.wt,'rev-parse','HEAD'),sourceTree=businessTree(f.wt,f.feature,sourceTip),historyRef='refs/spec-dev/archive/fixture/source';git(f.wt,'update-ref',historyRef,sourceTip);
 const main=path.join(f.outer,'main'),target=path.join(main,f.feature);mkdirSync(target,{recursive:true});
 const copy=spawnSync(process.execPath,[path.join(root,'scripts/execution-evidence.mjs'),'transfer','--source',path.join(f.wt,f.feature),'--target',target],{encoding:'utf8'});assert.equal(copy.status,0,copy.stdout+copy.stderr);
 const operations=[],dir='execution/delivery/a1';mkdirSync(path.join(target,dir),{recursive:true});
 const mergeOperations=method==='squash'?[['merge','--squash','fixture-work'],['commit','-qm','actual squash']]:[method==='ff'?['merge','--ff-only','fixture-work']:['merge','--no-ff','fixture-work','-m','actual merge']];
 for(const args of mergeOperations){
  const r=spawnSync('git',['-C',main,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const op={argv:['git',...args],cwd:main,exit_code:r.status};
  for(const kind of ['stdout','stderr']){op[kind]=dir+'/'+operations.length+'-'+kind+'.log';writeFileSync(path.join(target,op[kind]),r[kind]);op[kind+'_sha256']=hash(r[kind]);}operations.push(op);
 }
 const targetCommit=git(main,'rev-parse','HEAD'),receipt=dir+'/record.json';writeFileSync(path.join(target,receipt),JSON.stringify({version:1,kind:'git',source_tip:sourceTip,target_commit:targetCommit,method,operations}));
 f.state.delivery={version:1,channel:'local',state:'merged',source_tip:sourceTip,source_tree:sourceTree,target_branch:git(main,'branch','--show-current'),merge_method:method,merge_commit:targetCommit,verified_target:targetCommit,history_ref:historyRef,receipt_paths:[receipt],post_merge:[]};
 assert.equal(git(f.wt,'status','--porcelain'),'');git(main,'worktree','remove','--force',f.wt);git(main,'branch','-D','fixture-work');
 f.wt=main;f.dir=path.join(target,'plan');f.git=(...a)=>git(main,...a);
 f.save=()=>{writeFileSync(path.join(f.dir,'progress.yaml'),JSON.stringify(f.state,null,2)+'\n');git(main,'add',f.feature+'/plan/progress.yaml');git(main,'commit','-qm','delivery state');};
 f.complete=()=>{f.state.tasks.T04={status:'completed',tests:'pass',commit:git(main,'rev-parse','HEAD')};f.state.current=null;f.save();};return f;
}
test('S23 final squash is verifiable through retained source history',()=>{
 const f=squashArchiveFixture();try{f.complete();const out=run(f);assert.equal(out.status,0,out.stdout+out.stderr);assert.deepEqual(JSON.parse(out.stdout).ready_tasks,[]);assert.equal(f.git('rev-parse',f.state.delivery.history_ref),f.state.delivery.source_tip);}finally{rmSync(f.outer,{recursive:true});}
});
test('S24 actual source tip cannot hide an unverified change after its accepted baseline',()=>{
 const f=squashArchiveFixture('squash',false,true);try{f.complete();check(f,false);}finally{rmSync(f.outer,{recursive:true});}
});
test('S21/S23/S24 ignored group evidence survives squash and cleanup without accepting a rewritten cwd',()=>{
 const f=squashArchiveFixture();try{
  const original=f.state.integration.worktree;assert.equal(existsSync(original),false);f.complete();check(f);
  const file=path.join(f.wt,f.feature,f.state.tasks.T03.evidence_paths[0]),bytes=readFileSync(file),record=JSON.parse(bytes);assert.equal(record.cwd,original);
  record.cwd=f.wt;writeFileSync(file,JSON.stringify(record));check(f,false);writeFileSync(file,bytes);check(f);
  assert.equal(f.git('rev-parse',f.state.delivery.history_ref),f.state.delivery.source_tip);
 }finally{rmSync(f.outer,{recursive:true});}
});
for(const method of ['ff','merge'])test('S23 delivery mapping keeps actual '+method+' ancestry',()=>{
 const f=squashArchiveFixture(method);try{f.complete();check(f);}finally{rmSync(f.outer,{recursive:true});}
});
for(const defect of ['missing-ref','wrong-ref','wrong-target','wrong-branch','bad-output','forged-binding','awaiting_merge','changed-code','orphan'])test('S24 final mapping rejects '+defect,()=>{
 const f=squashArchiveFixture();try{
  const d=f.state.delivery;
  if(defect==='missing-ref')f.git('update-ref','-d',d.history_ref);
  if(defect==='wrong-ref')f.git('update-ref',d.history_ref,d.merge_commit);
  if(defect==='wrong-target')d.merge_commit=f.git('rev-parse','HEAD~1');
  if(defect==='wrong-branch')d.target_branch='different';
  if(defect==='bad-output'){const r=JSON.parse(readFileSync(path.join(f.wt,f.feature,d.receipt_paths[0])));writeFileSync(path.join(f.wt,f.feature,r.operations[0].stdout),'corrupt');}
  if(defect==='forged-binding')f.state.integration.worktree='/forged/worktree';
  if(defect==='awaiting_merge')d.state='awaiting_merge';
  if(defect==='changed-code'){writeFileSync(path.join(f.wt,'source.txt'),'changed after accepted source\n');f.git('add','source.txt');f.git('commit','-qm','unverified change');}
  if(defect==='orphan'){f.git('checkout','--orphan','orphan');f.git('add','.');f.git('commit','-qm','copied orphan');d.target_branch='orphan';d.merge_commit=d.verified_target=f.git('rev-parse','HEAD');}
  f.complete();check(f,false);
 }finally{rmSync(f.outer,{recursive:true});}
});
test('S24 actual verification on the changed target restores delivery evidence',()=>{
 const f=squashArchiveFixture();try{
  writeFileSync(path.join(f.wt,'source.txt'),'verified target behavior\n');f.git('add','source.txt');f.git('commit','-qm','target repair');
  const r=spawnSync(process.execPath,[path.join(root,'scripts/execution-evidence.mjs'),'record','--feature',path.join(f.wt,f.feature),'--task','T04','--phase','final','--attempt','target-recheck','--',process.execPath,'-e','require("node:assert/strict").equal(require("node:fs").readFileSync("source.txt","utf8"),"verified target behavior\\n")'],{cwd:f.wt,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).exit_code,0);f.state.delivery.receipt_paths.push(JSON.parse(r.stdout).record);f.state.delivery.verified_target=f.git('rev-parse','HEAD');
  f.complete();check(f);
 }finally{rmSync(f.outer,{recursive:true});}
});
for(const kind of ['sync_commit','acceptance_delivery'])for(const valid of [true,false])test('S24 post-merge '+kind+' '+(valid?'records only delivery facts':'rejects body changes'),()=>{
 const f=squashArchiveFixture('squash',true);try{
  const d=f.state.delivery,file=f.feature+(kind==='sync_commit'?'/spec/fixture-design.md':'/acceptance/acceptance-report.md'),p=path.join(f.wt,file),before=readFileSync(p,'utf8');
  let after=kind==='sync_commit'?before.replace('sync_commit: null','sync_commit: '+d.merge_commit):before+'\n## 实际交付\n来源 '+d.source_tip+'\n目标 '+d.merge_commit+'\n';
  if(!valid)after=after.replace(kind==='sync_commit'?'approved behavior':'fixture result','changed original body');
  writeFileSync(p,after);f.git('add',file);f.git('commit','-qm','delivery record');d.post_merge.push({commit:f.git('rev-parse','HEAD'),kind,files:[file]});f.complete();check(f,valid);
 }finally{rmSync(f.outer,{recursive:true});}
});
test('S07 current ordinary task resumes before independent pending tasks',()=>{
 const f=ordinaryFixture();try{assert.deepEqual(check(f).ready_tasks,['T05']);assert.equal(f.state.tasks.T05.commit,undefined);}finally{rmSync(f.outer,{recursive:true});}
});
test('S08 blocked current task does not schedule independent pending work',()=>{
 const f=ordinaryFixture('blocked');try{assert.deepEqual(check(f).ready_tasks,[]);}finally{rmSync(f.outer,{recursive:true});}
});
test('S07 unexplained simultaneous serial work is inconsistent',()=>{
 const f=ordinaryFixture();try{f.state.tasks.T04.status='in_progress';f.save();check(f,false);}finally{rmSync(f.outer,{recursive:true});}
});
test('S07 parallel null current retains independent ready tasks',()=>{
 const f=ordinaryFixture('pending',true);try{assert.deepEqual(check(f).ready_tasks,['T01','T04','T05']);}finally{rmSync(f.outer,{recursive:true});}
});
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
