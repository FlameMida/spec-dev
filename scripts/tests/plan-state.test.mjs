import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),cli=path.join(root,'scripts/validate-output.mjs');
const git=(cwd,...args)=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
  const outer=realpathSync(mkdtempSync(path.join(tmpdir(),'pd-state-'))),main=path.join(outer,'main'),wt=path.join(outer,'wt');mkdirSync(main);
  git(main,'init','-q');git(main,'config','user.email','fixture@example.invalid');git(main,'config','user.name','Fixture');git(main,'config','core.hooksPath','/dev/null');
  writeFileSync(path.join(main,'source.txt'),'before\n');git(main,'add','.');git(main,'commit','-qm','base');git(main,'worktree','add','-qb','fixture-work',wt);
  const feature='.spec-dev/fixture',dir=path.join(wt,feature,'plan');mkdirSync(path.join(dir,'tasks'),{recursive:true});
  const ids=['T00','T01','T02','T03','T04'],deps=[[],['T00'],['T01'],['T01','T02'],['T03']];
  const decl={protocol_version:1,task_roles:{T00:'isolation',T04:'delivery'},groups:{G01:{members:['T01','T02'],verify:'T03',reason:'shared interface'}}};
  writeFileSync(path.join(dir,'index.md'),'# fixture\n\n| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n'+ids.map((id,i)=>`| ${id} | ${deps[i].join(',')} | x | y |`).join('\n')+'\n\n```json spec-dev-integration\n'+JSON.stringify(decl,null,2)+'\n```\n');
  for(const id of ids)writeFileSync(path.join(dir,'tasks',id+'.md'),'# '+id+'\n');
  const base=git(wt,'rev-parse','HEAD');
  const state={format_version:2,current:null,tasks:Object.fromEntries(ids.map(id=>[id,{status:'pending'}])),resources:[],notes:[],integration:{owner:'fixture-owner',worktree:wt,branch:'fixture-work',base_commit:base,validated_commit:base,active_group:null,groups:{G01:{status:'pending',base_commit:null,checkpoint_commit:null,validated_commit:null,evidence_paths:[]}}}};
  state.tasks.T00={status:'completed',commit:base,tests:'pass'};
  const save=(message='state')=>{writeFileSync(path.join(dir,'progress.yaml'),JSON.stringify(state,null,2)+'\n');git(wt,'add','.');git(wt,'commit','--allow-empty','-qm',message);};
  save('plan');
  const boundBase=git(wt,'rev-parse','HEAD');state.tasks.T00.commit=boundBase;state.integration.base_commit=boundBase;state.integration.validated_commit=boundBase;save('runtime');
  return {outer,wt,dir,state,base:boundBase,save,feature};
}
function run(f){return spawnSync(process.execPath,[cli,'plan-state',f.dir],{encoding:'utf8'});}
function check(f,ok=true){const r=run(f);assert.equal(r.status,ok?0:1,r.stdout+r.stderr);const j=JSON.parse(ok?r.stdout:r.stderr);assert.equal(j.ok,ok);if(!ok)assert.deepEqual(j.ready_tasks,[]);return j;}
function evidence(f,id,exit=0){
  const commit=git(f.wt,'rev-parse','HEAD');
  const listing=execFileSync('git',['-C',f.wt,'ls-tree','-r','-z',commit],{encoding:'utf8'});
  const tree=hash(listing.split('\0').filter(Boolean).filter(line=>{const name=line.slice(line.indexOf('\t')+1);return name!==f.feature+'/plan/progress.yaml'&&!name.startsWith(f.feature+'/execution/');}).join('\0'));
  const rel=`execution/groups/G01/${id}/a1`,dir=path.join(f.wt,f.feature,rel);mkdirSync(dir,{recursive:true});
  const processResult=spawnSync(process.execPath,['-e',`process.exit(${exit})`],{cwd:f.wt,encoding:'utf8'});
  writeFileSync(path.join(dir,'stdout.log'),processResult.stdout);writeFileSync(path.join(dir,'stderr.log'),processResult.stderr);
  const record={command:[process.execPath,'-e',`process.exit(${exit})`],cwd:f.wt,exit_code:processResult.status,commit,tree,stdout:rel+'/stdout.log',stderr:rel+'/stderr.log',stdout_sha256:hash(processResult.stdout),stderr_sha256:hash(processResult.stderr)};
  writeFileSync(path.join(dir,'record.json'),JSON.stringify(record));return rel+'/record.json';
}
function enter(f){f.state.integration.active_group='G01';Object.assign(f.state.integration.groups.G01,{status:'in_progress',base_commit:f.base,checkpoint_commit:f.base});}
function waiting(f,id){f.state.tasks[id]={status:'awaiting_verification',implementation_commit:git(f.wt,'rev-parse','HEAD'),commit:null,tests:'pending_group',evidence_paths:[evidence(f,id)]};f.state.integration.groups.G01.checkpoint_commit=f.state.tasks[id].implementation_commit;}
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
