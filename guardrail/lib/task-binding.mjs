import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,realpathSync,renameSync,unlinkSync,lstatSync} from 'node:fs';
import {parseRecord,parseUniqueJson} from './record-data.mjs';
import {readScopes,scopeFingerprint,legacyTasks} from './task-scopes.mjs';
import {normalizeWrite,resolveWrite} from './write-paths.mjs';

const need=(ok,message)=>{if(!ok)throw new Error('task binding: '+message);};
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40,64}$/.test(v);
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function keys(v,expected){need(object(v)&&Object.keys(v).length===expected.length&&expected.every(k=>Object.hasOwn(v,k)),'invalid fields');}
export const git=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export function commitView(repo,commit){
  need(sha(commit),'full commit required');need(git(repo,'rev-parse',commit+'^{commit}')===commit,'commit missing');
  return {commit,local:false,readText:p=>{try{return execFileSync('git',['-C',repo,'show',commit+':'+p],{encoding:'utf8',stdio:['ignore','pipe','pipe']});}catch{return null;}}};
}
export function worktreeView(repo){return {local:true,readText:p=>{try{return readFileSync(path.join(repo,p),'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}}};}
function ancestor(repo,from,to){try{git(repo,'merge-base','--is-ancestor',from,to);return true;}catch{return false;}}
export function validateBindingShape(b){
  keys(b,['scope_commit','scope_digest','authorization_ref','worktree','branch','claim_key','claim_checkpoint']);
  need(sha(b.scope_commit)&&/^[a-f0-9]{64}$/.test(b.scope_digest),'invalid scope version');
  need(nonempty(b.authorization_ref)&&nonempty(b.worktree)&&path.isAbsolute(b.worktree)&&nonempty(b.branch),'invalid authorization/workspace');
  need(b.claim_key===null?b.claim_checkpoint===null:nonempty(b.claim_key)&&sha(b.claim_checkpoint),'invalid claim binding');return b;
}
export function validateReference(r){
  keys(r,['version','plan','task','authority','worktree','branch']);
  need(r.version===1&&/^T\d{2}$/.test(r.task)&&sha(r.authority),'invalid task reference');
  need(normalizeWrite(r.plan,{allowSpecDev:true})===r.plan,'noncanonical plan path');
  need(nonempty(r.worktree)&&path.isAbsolute(r.worktree)&&nonempty(r.branch),'invalid workspace reference');return r;
}
function stateAt(view,plan){const text=view.readText(path.posix.join(path.posix.dirname(plan),'progress.yaml'));need(typeof text==='string','progress missing');return parseRecord(text);}
function scopeAt(view,plan){
  const text=view.readText(plan);need(typeof text==='string','plan missing');
  const ids=path.posix.basename(plan)==='index.md'?[...text.matchAll(/^\|\s*(T\d\d)\b/gm)].map(m=>m[1]):legacyTasks(text).map(t=>t.id);
  const scopes=readScopes(text,ids);need(scopes,'scope declaration missing');return scopes;
}
export function readBinding(repo,reference,view=worktreeView(repo)){
  const r=validateReference(reference),local=view.local!==false;
  repo=realpathSync(git(repo,'rev-parse','--show-toplevel'));
  if(local){need(r.worktree===repo&&git(repo,'branch','--show-current')===r.branch,'worktree/branch mismatch');need(resolveWrite(repo,r.plan,{allowSpecDev:true})===r.plan,'plan path alias');}
  const authority=commitView(repo,r.authority),split=path.posix.basename(r.plan)==='index.md';
  const state=split?stateAt(authority,r.plan):null;
  const selected=split?state.tasks?.[r.task]:null;
  let b;
  if(split){need(selected,'unknown task');b=validateBindingShape(selected.binding);}
  else{
    const t=scopeAt(authority,r.plan).tasks[r.task];need(t,'unknown task');
    b={scope_commit:r.authority,scope_digest:scopeFingerprint(authority,r.plan,r.task).digest,authorization_ref:t.authorization_ref,worktree:r.worktree,branch:r.branch,claim_key:null,claim_checkpoint:null};
  }
  need(b.worktree===r.worktree&&b.branch===r.branch,'workspace does not match authority');
  const basis=commitView(repo,b.scope_commit),scope=scopeAt(basis,r.plan).tasks[r.task];need(scope,'task scope missing');
  need(scope.authorization_ref===b.authorization_ref,'authorization source mismatch');
  need(scopeFingerprint(basis,r.plan,r.task).digest===b.scope_digest,'recorded digest mismatch');
  need(scopeFingerprint(view,r.plan,r.task).digest===b.scope_digest,'static scope/spec/task changed; rebind required');
  const tip=view.commit??git(repo,'rev-parse','HEAD');need(ancestor(repo,b.scope_commit,tip),'scope is not an ancestor of implementation');
  if(split){
    need(['in_progress','blocked'].includes(selected.status),'task is not active');
    if(b.claim_key===null){
      need(state.current===r.task,'current task mismatch');need(ancestor(repo,r.authority,tip),'authority is not an ancestor');
      const now=stateAt(view,r.plan),task=now.tasks?.[r.task];
      need(now.current===r.task&&task?.status==='in_progress','current task is not running');
      need(JSON.stringify(task.binding)===JSON.stringify(b),'current binding changed');
    }else{
      const claim=selected.claim;
      need(claim?.key===b.claim_key&&claim.worktree===b.worktree&&claim.branch===b.branch&&sha(claim.base_commit),'claim mismatch');
      need(ancestor(repo,b.scope_commit,claim.base_commit)&&ancestor(repo,claim.base_commit,tip),'claim baseline mismatch');
      const checkpoint=stateAt(commitView(repo,b.claim_checkpoint),r.plan),saved=checkpoint.tasks?.[r.task]?.claim;
      need(JSON.stringify(saved)===JSON.stringify(claim),'claim checkpoint mismatch');
      const execution=state.execution;need(execution?.mode==='parallel'&&nonempty(execution.integration_branch),'integration context missing');
      const integrationTip=git(repo,'rev-parse','refs/heads/'+execution.integration_branch);
      need(ancestor(repo,b.claim_checkpoint,integrationTip)&&ancestor(repo,r.authority,integrationTip),'claim is not in integration history');
      if(local){const current=stateAt(commitView(repo,integrationTip),r.plan).tasks?.[r.task];need(current?.status==='in_progress'&&JSON.stringify(current.claim)===JSON.stringify(claim)&&JSON.stringify(current.binding)===JSON.stringify(b),'claim expired');}
      for(const file of scope.writes)normalizeWrite(file); // implementers never own .spec-dev
    }
  }else{
    need(ancestor(repo,r.authority,tip),'authority is not an ancestor');
    const task=legacyTasks(view.readText(r.plan)).find(t=>t.id===r.task);need(task?.total&&task.checked<task.total,'legacy task is complete or ambiguous');
  }
  for(const file of [...scope.writes,...scope.specs])if(local)need(resolveWrite(repo,file,{allowSpecDev:true})===file,'path alias/rebinding: '+file);
  return {plan:r.plan,task:r.task,authority:r.authority,scope_commit:b.scope_commit,scope_digest:b.scope_digest,specs:scope.specs,writes:new Set(scope.writes),worktree:b.worktree,branch:b.branch,claim_key:b.claim_key};
}
export function receiptPath(repo){return path.resolve(repo,git(repo,'rev-parse','--git-path','spec-dev-task.json'));}
export function localReference(repo){const file=receiptPath(repo);if(!existsSync(file))return null;need(!lstatSync(file).isSymbolicLink(),'receipt symlink forbidden');return validateReference(parseUniqueJson(readFileSync(file,'utf8')));}
export function activateReceipt(repo,reference){
  const binding=readBinding(repo,reference),old=localReference(repo);
  need(!old||(old.plan===reference.plan&&old.task===reference.task),'another task receipt is active');
  const file=receiptPath(repo),tmp=file+'.tmp';
  writeFileSync(tmp,JSON.stringify(reference)+'\n',{flag:'wx'});renameSync(tmp,file);return {ok:true,receipt:file,binding};
}
export function clearReceipt(repo,plan,task){
  const old=localReference(repo);need(old&&old.plan===plan&&old.task===task,'receipt identity mismatch');
  need(old.worktree===realpathSync(git(repo,'rev-parse','--show-toplevel'))&&old.branch===git(repo,'branch','--show-current'),'receipt belongs to another workspace');
  unlinkSync(receiptPath(repo));return {ok:true,cleared:true,plan,task};
}
