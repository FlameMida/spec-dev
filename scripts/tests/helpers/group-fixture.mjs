import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),root=projectRoot,cli=path.join(root,'scripts/validate-output.mjs');
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
function evidence(f,id,exit=0,attempt='a1',command=[process.execPath,'-e',`process.exit(${exit})`]){
  const commit=git(f.wt,'rev-parse','HEAD');
  const listing=execFileSync('git',['-C',f.wt,'ls-tree','-r','-z',commit],{encoding:'utf8'});
  const tree=hash(listing.split('\0').filter(Boolean).filter(line=>{const name=line.slice(line.indexOf('\t')+1);return name!==f.feature+'/plan/progress.yaml'&&!name.startsWith(f.feature+'/execution/');}).join('\0'));
  const rel=`execution/groups/G01/${id}/${attempt}`,dir=path.join(f.wt,f.feature,rel);mkdirSync(dir,{recursive:true});
  const processResult=spawnSync(command[0],command.slice(1),{cwd:f.wt,encoding:'utf8'});
  writeFileSync(path.join(dir,'stdout.log'),processResult.stdout);writeFileSync(path.join(dir,'stderr.log'),processResult.stderr);
  const record={command,cwd:f.wt,exit_code:processResult.status,commit,tree,stdout:rel+'/stdout.log',stderr:rel+'/stderr.log',stdout_sha256:hash(processResult.stdout),stderr_sha256:hash(processResult.stderr)};
  writeFileSync(path.join(dir,'record.json'),JSON.stringify(record));return rel+'/record.json';
}
function enter(f){f.state.integration.active_group='G01';Object.assign(f.state.integration.groups.G01,{status:'in_progress',base_commit:f.base,checkpoint_commit:f.base});}
function waiting(f,id){f.state.tasks[id]={status:'awaiting_verification',implementation_commit:git(f.wt,'rev-parse','HEAD'),commit:null,tests:'pending_group',evidence_paths:[evidence(f,id)]};f.state.integration.groups.G01.checkpoint_commit=f.state.tasks[id].implementation_commit;}
function archiveFixture(){
 const f=fixture();enter(f);waiting(f,'T01');waiting(f,'T02');f.save();
 const v=git(f.wt,'rev-parse','HEAD'),ev=evidence(f,'T03');
 for(const id of ['T01','T02'])Object.assign(f.state.tasks[id],{status:'completed',tests:'pass',commit:v});
 f.state.tasks.T03={status:'completed',tests:'pass',commit:v,evidence_paths:[ev]};
 Object.assign(f.state.integration.groups.G01,{status:'completed',validated_commit:v,evidence_paths:[ev]});
 Object.assign(f.state.integration,{active_group:null,validated_commit:v});
 f.state.tasks.T04={status:'in_progress'};f.state.current='T04';f.save('ready for delivery');check(f);
 const main=path.join(f.outer,'main'),originalWorktree=f.wt,originalRecord=readFileSync(path.join(f.wt,f.feature,ev));
 git(main,'merge','--ff-only','fixture-work');git(main,'worktree','remove',f.wt);git(main,'branch','-d','fixture-work');
 f.wt=main;f.dir=path.join(main,f.feature,'plan');
 f.save=(message='archive')=>{writeFileSync(path.join(f.dir,'progress.yaml'),JSON.stringify(f.state,null,2)+'\n');git(main,'add','.');git(main,'commit','--allow-empty','-qm',message);};
 f.complete=()=>{f.state.tasks.T04={status:'completed',tests:'pass',commit:git(main,'rev-parse','HEAD')};f.state.current=null;f.save();};
 return Object.assign(f,{originalWorktree,originalRecord,ev});
}

export {fixture,run,check,evidence,enter,waiting,archiveFixture,git,hash,projectRoot};
