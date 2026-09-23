import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
const cli='guardrail/check-spec-drift.mjs',guard=(f,args,options={})=>f.run(cli,args,options);
const trailer=(f,authority)=>'Spec-Task: '+JSON.stringify({plan:f.plan,task:'T01',authority});
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
