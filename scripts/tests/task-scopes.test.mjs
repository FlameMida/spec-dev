import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
import {scopeFingerprint,readScopes} from '../../guardrail/lib/task-scopes.mjs';
const inspect=f=>f.run('scripts/validate-output.mjs',['plan-index',path.dirname(f.plan)]);
test('S01 valid scope advertises the actual protocol',t=>{
  const f=workflowFixture(t),r=inspect(f);
  assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(JSON.parse(r.stdout).scope_protocol_version,1);
});
for(const writes of [['../escape'],['src/**'],['src'],['.git/config'],['a/A.mjs','a/a.mjs'],['a/é.mjs','a/e\u0301.mjs']]){
  test('S01 invalid scoped paths are rejected: '+writes.join(','),t=>{
    const f=workflowFixture(t);f.scopes.tasks.T01.writes=writes;f.setScopes(f.scopes);
    const r=inspect(f);assert.equal(r.status,1,r.stdout+r.stderr);assert.match(r.stderr,/scope|path|directory|duplicate|reserved/i);
  });
}
test('S01 duplicate JSON keys cannot erase a prior scope',t=>{
  const f=workflowFixture(t);const text=readFileSync(path.join(f.root,f.plan),'utf8');
  f.put(f.plan,text.replace('"version": 1','"version": 1, "version": 1'));
  assert.equal(inspect(f).status,1);
});
test('S01 a directory link escaping the repository is rejected',t=>{
  const f=workflowFixture(t);symlinkSync(f.outer,path.join(f.root,'linked'));f.scopes.tasks.T01.writes=['linked/out.txt'];f.setScopes(f.scopes);
  assert.equal(inspect(f).status,1);
});
test('S01 parallel uses the common writes authority',t=>{
  const f=workflowFixture(t);f.setScopes(f.scopes,'\n```yaml spec-dev-parallel\nparallel:\n  tasks:\n    T01:\n      resources: []\n```\n');
  const r=inspect(f);assert.equal(r.status,0,r.stdout+r.stderr);
});
test('S01 two writes authorities are rejected even if they agree',t=>{
  const f=workflowFixture(t);f.setScopes(f.scopes,'\n```yaml spec-dev-parallel\nparallel:\n  tasks:\n    T01:\n      writes:\n        - "src/app.mjs"\n      resources: []\n```\n');
  assert.equal(inspect(f).status,1);
});
test('S11 final cannot depend on delivery or leave an implementation out',t=>{
  const f=workflowFixture(t);let text=readFileSync(path.join(f.root,f.plan),'utf8');
  f.put(f.plan,text.replace('| T02 | T01 |','| T02 | T00 |'));
  assert.equal(inspect(f).status,1);
});
test('S11 acceptance must consume final verification',t=>{
  const f=workflowFixture(t);f.scopes.acceptance_tasks=['T01'];f.setScopes(f.scopes);
  assert.equal(inspect(f).status,1);
});
test('S02 fingerprint follows static inputs, not progress or business changes',t=>{
  const f=workflowFixture(t),view={readText:p=>{try{return readFileSync(path.join(f.root,p),'utf8');}catch{return null;}}};
  const fingerprint=()=>scopeFingerprint(view,f.plan,'T01').digest,base=fingerprint();
  f.put('src/app.mjs','export const value=2;');f.state.current=null;f.save();
  assert.equal(fingerprint(),base);
  for(const p of [f.spec,f.feature+'/plan/tasks/T01.md',f.plan]){
    const old=view.readText(p);f.put(p,old+'\nChanged constraint\n');
    assert.notEqual(fingerprint(),base,p);f.put(p,old);
  }
});
test('S10 legacy progress checkboxes are excluded, their wording stays authoritative',t=>{
  const f=workflowFixture(t),plan=f.feature+'/plan.md';
  const text='# plan\n### Task 0: isolation\n- [x] ready\n### Task 1: implementation\n- [ ] change value\n### Task 2: final\n- [ ] verify\n### Task 3: delivery\n- [ ] merge\n\n```json spec-dev-scopes\n'+JSON.stringify(f.scopes)+'\n```\n';
  const view={readText:p=>p===plan?current:readFileSync(path.join(f.root,p),'utf8')};let current=text;
  const fingerprint=()=>scopeFingerprint(view,plan,'T01').digest,base=fingerprint();
  current=text.replace('- [ ] change value','- [x] change value');assert.equal(fingerprint(),base);
  current=text.replace('change value','change contract');assert.notEqual(fingerprint(),base);
  current=text+'\n### Task 1: duplicate\n';assert.throws(fingerprint,/duplicate legacy task/);
});
test('S01 quoted scope examples never become declarations',()=>{
  assert.equal(readScopes('````markdown\n```json spec-dev-scopes\n{}\n```\n````\n',['T01']),null);
  assert.throws(()=>readScopes('```json spec-dev-scopes\n{}',['T01']),/unterminated/);
});
