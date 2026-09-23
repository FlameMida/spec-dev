import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,symlinkSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
import {scopeFingerprint} from '../../guardrail/lib/task-scopes.mjs';
import {execFileSync} from 'node:child_process';
const cli='guardrail/check-spec-drift.mjs',guard=(f,args,options={})=>f.run(cli,args,options);
const trailer=(f,authority)=>'Spec-Task: '+JSON.stringify({plan:f.plan,task:'T01',authority});
test('S05/S06 an earlier unbound ref cannot hide a later task association on read failure',t=>{
 const f=workflowFixture(t),base=f.git('rev-parse','HEAD~1'),scope=f.git('rev-parse','HEAD'),{authority}=f.bind();
 f.put('src/app.mjs','changed');const tip=f.commit('implementation\n\n'+trailer(f,authority));
 const input=`refs/heads/docs ${scope} refs/heads/docs ${base}\nrefs/heads/task ${tip} refs/heads/task ${base}\n`;
 assert.equal(guard(f,['--push'],{input}).status,0);
 const blob=f.git('rev-parse',scope+':'+f.spec),file=path.resolve(f.root,f.git('rev-parse','--git-path','objects/'+blob.slice(0,2)+'/'+blob.slice(2))),bytes=readFileSync(file);unlinkSync(file);
 assert.equal(guard(f,['--push'],{input}).status,1);
 writeFileSync(file,bytes);assert.equal(guard(f,['--push'],{input}).status,0);
});
for(const missing of ['authority','scope','spec-blob','scope-tree'])for(const entry of ['range','push-existing','push-new'])test('S06 '+entry+' rejects missing '+missing+' history objects before reading associations',t=>{
  const f=workflowFixture(t),base=f.git('rev-parse','HEAD~1'),{authority}=f.bind();
  f.put('src/app.mjs','export const value=2;\n');const tip=f.commit('implementation\n\n'+trailer(f,authority));
  const run=()=>entry==='range'?guard(f,['--range',base+'..'+tip]):guard(f,['--push'],{input:`refs/heads/fixture ${tip} refs/heads/fixture ${entry==='push-new'?'0'.repeat(40):base}\n`});
  assert.equal(run().status,0);
  const scope=f.state.tasks.T01.binding.scope_commit;
  const object={authority,scope,'spec-blob':f.git('rev-parse',scope+':'+f.spec),'scope-tree':f.git('rev-parse',scope+'^{tree}')}[missing];
  const file=path.resolve(f.root,f.git('rev-parse','--git-path','objects/'+object.slice(0,2)+'/'+object.slice(2))),bytes=readFileSync(file);unlinkSync(file);
  assert.equal(f.git('cat-file','-t',base),'commit');assert.match(f.git('cat-file','-p',tip),/Spec-Task:/);
  const r=run();assert.equal(r.status,1,r.stderr);assert.match(r.stderr,/history|对象|object/i);
  writeFileSync(file,bytes);assert.equal(run().status,0,'restoring exact bytes restores valid history');
});
test('S03 committed spec permits a valid bound staged implementation',t=>{
  const f=workflowFixture(t);f.bind();f.put('src/app.mjs','export const value=2;\n');f.git('add','src/app.mjs');
  const r=guard(f,['--staged']);assert.equal(r.status,0,r.stderr);
});
test('S04 deletion outside the binding is rejected',t=>{
  const f=workflowFixture(t);f.put('src/other.mjs','export const other=1;\n');f.commit();f.bind();f.git('rm','src/other.mjs');
  assert.equal(guard(f,['--staged']).status,1);
});
test('S04 rename checks both old and new path',t=>{
  const f=workflowFixture(t);f.bind();f.git('mv','src/app.mjs','src/new.mjs');assert.equal(guard(f,['--staged']).status,1);
});
test('S03 staged scope reads index, never unstaged spec content',t=>{
  const f=workflowFixture(t);f.bind();f.put('src/app.mjs','export const value=2;\n');f.git('add','src/app.mjs');
  f.put(f.spec,'---\nspec_dev:\n  status: superseded\n---\n');
  assert.equal(guard(f,['--staged']).status,0);
  f.git('add',f.spec);assert.equal(guard(f,['--staged']).status,1);
});
test('S03 all owners must be covered by the binding',t=>{
  const f=workflowFixture(t);f.put('.spec-dev/other/spec/other-design.md',readFileSync(path.join(f.root,f.spec),'utf8'));f.commit();f.bind();
  f.put('src/app.mjs','export const value=2;\n');f.git('add','src/app.mjs');assert.equal(guard(f,['--staged']).status,1);
});
test('S04 hook and worktree fail closed for stale or corrupt binding, including repeated Stop',t=>{
  const f=workflowFixture(t);f.bind();f.scopes.tasks.T01.writes.push('src/new.mjs');f.setScopes(f.scopes);
  assert.equal(guard(f,['--hook'],{input:JSON.stringify({tool_input:{file_path:'src/new.mjs'}})}).status,2);
  assert.equal(guard(f,['--worktree'],{input:JSON.stringify({stop_hook_active:true})}).status,2);
  const p=path.resolve(f.root,f.git('rev-parse','--git-path','spec-dev-task.json'));writeFileSync(p,'{bad');
  assert.equal(guard(f,['--staged']).status,1);
});
test('S04 hook rejects escaping links before a file exists',t=>{
  const f=workflowFixture(t);f.bind();symlinkSync(f.outer,path.join(f.root,'linked'));
  assert.equal(guard(f,['--hook'],{input:JSON.stringify({path:'linked/new.mjs'})}).status,2);
});
test('S05 historical guard checks each commit even when an out-of-scope edit is reverted',t=>{
  const f=workflowFixture(t),{authority}=f.bind(),start=f.git('rev-parse','HEAD');
  f.put('src/out.mjs','export const out=1;\n');f.commit('bad\n\n'+trailer(f,authority));f.git('rm','src/out.mjs');f.commit('revert\n\n'+trailer(f,authority));
  assert.equal(guard(f,['--range',start+'..HEAD']).status,1);
});
test('S05 history uses committed view and association instead of checkout receipt',t=>{
  const f=workflowFixture(t),{authority}=f.bind(),start=f.git('rev-parse','HEAD');
  f.put('src/app.mjs','export const value=2;\n');const end=f.commit('implementation\n\n'+trailer(f,authority));
  f.put(f.spec,'dirty unrelated checkout');
  assert.equal(guard(f,['--range',start+'..'+end]).status,0);
});
test('S05 ordinary Spec trailer cannot authorize an unsynchronized commit',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD');f.put('src/app.mjs','changed');f.commit('edit\n\nSpec: '+f.spec);
  assert.equal(guard(f,['--range',start+'..HEAD']).status,1);
});
test('S05 refs cannot borrow synchronization from one another',t=>{
  const f=workflowFixture(t),base=f.git('rev-parse','HEAD');
  f.put(f.spec,readFileSync(path.join(f.root,f.spec),'utf8')+'doc change\n');const doc=f.commit();
  f.git('checkout','-qb','code',base);f.put('src/app.mjs','changed');const code=f.commit();
  const input=`refs/heads/doc ${doc} refs/heads/doc ${base}\nrefs/heads/code ${code} refs/heads/code ${base}\n`;
  assert.equal(guard(f,['--push'],{input}).status,1);
});
test('S05 association conflicts with both broad waiver forms',t=>{
  const f=workflowFixture(t),{authority}=f.bind(),start=f.git('rev-parse','HEAD');f.put('src/app.mjs','changed');f.git('add','src/app.mjs');
  assert.equal(guard(f,['--staged'],{env:{...process.env,SPEC_DEV_GUARD:'off'}}).status,1);
  f.commit('edit\n\n'+trailer(f,authority)+'\nSpec-Guard: off legacy');assert.equal(guard(f,['--range',start+'..HEAD']).status,1);
});
test('S05 ordinary synchronized edit and explicit legacy waiver retain their meaning',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD');f.put('src/app.mjs','changed');f.put(f.spec,readFileSync(path.join(f.root,f.spec),'utf8')+'synchronized\n');
  f.commit('sync');assert.equal(guard(f,['--range',start+'..HEAD']).status,0);
  const next=f.git('rev-parse','HEAD');f.put('src/app.mjs','changed again');f.commit('waiver\n\nSpec-Guard: off formatting only');assert.equal(guard(f,['--range',next+'..HEAD']).status,0);
});
test('S03 valid binding is shared by files, hook and worktree entry points',t=>{
  const f=workflowFixture(t);f.bind();
  assert.equal(guard(f,['--files','src/app.mjs']).status,0);
  assert.equal(guard(f,['--hook'],{input:JSON.stringify({file_path:path.join(f.root,'src/app.mjs')})}).status,0);
  f.put('src/app.mjs','changed');assert.equal(guard(f,['--worktree']).status,0);
  assert.equal(guard(f,['--files','src/not-authorized.mjs']).status,1);
});
test('S05 duplicate historical associations fail closed',t=>{
  const f=workflowFixture(t),{authority}=f.bind(),start=f.git('rev-parse','HEAD');f.put('src/app.mjs','changed');
  f.commit('edit\n\n'+trailer(f,authority)+'\n'+trailer(f,authority));assert.equal(guard(f,['--range',start+'..HEAD']).status,1);
});
test('S05 merge differences are checked against every parent',t=>{
  const f=workflowFixture(t);f.put('src/other.mjs','base');f.commit();const {authority}=f.bind(),start=f.git('rev-parse','HEAD'),branch=f.git('branch','--show-current');
  f.git('checkout','-qb','side');f.put('src/other.mjs','side change');f.commit('side');
  f.git('checkout',branch);f.put('src/app.mjs','implementation');f.commit('implementation\n\n'+trailer(f,authority));
  f.git('merge','--no-ff','side','-m','merge\n\n'+trailer(f,authority));
  assert.equal(guard(f,['--range',start+'..HEAD']).status,1);
});
test('S05 unbound environment waiver keeps its original explicit meaning',t=>{
  const f=workflowFixture(t);f.put('src/app.mjs','changed');f.git('add','src/app.mjs');
  assert.equal(guard(f,['--staged'],{env:{...process.env,SPEC_DEV_GUARD:'off'}}).status,0);
});
test('S03 a dangling task receipt is invalid rather than absent',t=>{
 const f=workflowFixture(t);f.bind();const file=path.resolve(f.root,f.git('rev-parse','--git-path','spec-dev-task.json'));unlinkSync(file);symlinkSync(path.join(f.outer,'missing-receipt'),file);
 assert.equal(guard(f,['--staged'],{env:{...process.env,SPEC_DEV_GUARD:'off'}}).status,1);
});
for(const defect of ['baseline','integration-worktree'])test('S04 parallel binding rejects inconsistent '+defect,t=>{
 const f=workflowFixture(t),base=f.git('rev-parse','HEAD'),branch=f.git('branch','--show-current'),wt=path.join(f.outer,'worker');f.git('worktree','add','-qb','worker',wt);
 const claim={key:'claim',owner:'fixture',agent_id:'fixture',worktree:wt,branch:'worker',base_commit:base};
 f.state.current=null;f.state.tasks.T01.claim=claim;f.state.execution={mode:'parallel',owner:'fixture',integration_worktree:defect==='integration-worktree'?f.outer:f.root,integration_branch:branch,base_commit:base,validated_commit:defect==='baseline'?f.git('rev-parse','HEAD~1'):base};
 const checkpoint=f.save();const view={readText:p=>execFileSync('git',['-C',f.root,'show',base+':'+p],{encoding:'utf8'})};
 f.state.tasks.T01.binding={scope_commit:base,scope_digest:scopeFingerprint(view,f.plan,'T01').digest,authorization_ref:'fixture-explicit-execution',worktree:wt,branch:'worker',claim_key:'claim',claim_checkpoint:checkpoint};
 const authority=f.save(),r=f.run('guardrail/task-binding.mjs',['bind','--plan',f.plan,'--task','T01','--authority',authority],{cwd:wt});
 assert.equal(r.status,1,r.stdout+r.stderr);
});
