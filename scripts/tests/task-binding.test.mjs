import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,symlinkSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
import {scopeFingerprint} from '../../guardrail/lib/task-scopes.mjs';
const cli='guardrail/task-binding.mjs',inspect=f=>f.run(cli,['inspect']);
const receipt=f=>path.resolve(f.root,f.git('rev-parse','--git-path','spec-dev-task.json'));
const rejected=r=>assert.equal(r.status,1,r.stdout+r.stderr);
test('S03 real committed binding activates and inspects without mutating Git',t=>{
  const f=workflowFixture(t),bound=f.bind(),tip=f.git('rev-parse','HEAD'),r=inspect(f);
  assert.equal(r.status,0,r.stdout+r.stderr);const value=JSON.parse(r.stdout);
  assert.equal(value.binding.authority,bound.authority);assert.deepEqual(value.binding.writes,['src/app.mjs']);
  assert.equal(f.git('rev-parse','HEAD'),tip);assert.equal(f.git('status','--porcelain'),'');
});
for(const target of ['spec','task','scope'])test('S02 modified '+target+' invalidates existing authority',t=>{
  const f=workflowFixture(t);f.bind();
  if(target==='spec')f.put(f.spec,readFileSync(path.join(f.root,f.spec),'utf8')+'changed contract\n');
  if(target==='task')f.put(f.feature+'/plan/tasks/T01.md','# changed implementation\n');
  if(target==='scope'){f.scopes.tasks.T01.writes.push('src/new.mjs');f.setScopes(f.scopes);}
  rejected(inspect(f));assert.match(inspect(f).stderr,/changed|rebind/);
});
for(const [field,value] of [['scope_digest','b'.repeat(64)],['authorization_ref','another source'],['worktree','/wrong/worktree'],['branch','wrong'],['claim_key','other-claim'],['scope_commit','a'.repeat(40)],['extra',true]])test('S03 invalid persisted '+field+' is refused',t=>{
  const f=workflowFixture(t);f.bind();f.state.tasks.T01.binding[field]=value;const authority=f.save();
  rejected(f.run(cli,['bind','--plan',f.plan,'--task','T01','--authority',authority]));
});
test('S03 task selection is explicit and cannot adopt another task',t=>{
  const f=workflowFixture(t),{authority}=f.bind();
  assert.equal(f.run(cli,['bind','--plan',f.plan,'--authority',authority]).status,2);
  rejected(f.run(cli,['bind','--plan',f.plan,'--task','T02','--authority',authority]));
  f.state.current='T02';f.save();rejected(inspect(f));
});
test('S06 receipts are local to a Git worktree and reject copied workspace references',t=>{
  const f=workflowFixture(t);f.bind();const other=path.join(f.outer,'other');f.git('worktree','add','-qb','other',other);
  const r=f.run(cli,['inspect'],{cwd:other});rejected(r);assert.match(r.stderr,/no active/);
  const p=receipt(f),ref=JSON.parse(readFileSync(p));ref.worktree=other;writeFileSync(p,JSON.stringify(ref));rejected(inspect(f));
});
test('S06 plan aliases and receipt symlinks cannot supply authority',t=>{
  const f=workflowFixture(t),{authority}=f.bind();
  rejected(f.run(cli,['bind','--plan',f.feature+'/plan/../plan/index.md','--task','T01','--authority',authority]));
  const p=receipt(f),saved=p+'.saved';writeFileSync(saved,readFileSync(p));unlinkSync(p);symlinkSync(saved,p);rejected(inspect(f));
});
test('S03 clear removes only the matching local reference even when its scope expired',t=>{
  const f=workflowFixture(t);f.bind();f.put(f.spec,'changed\n');const before=readFileSync(path.join(f.root,f.feature,'plan/progress.yaml'));
  rejected(f.run(cli,['clear','--plan',f.plan,'--task','T02']));assert.ok(existsSync(receipt(f)));
  const r=f.run(cli,['clear','--plan',f.plan,'--task','T01']);assert.equal(r.status,0,r.stderr);
  assert.ok(!existsSync(receipt(f)));assert.deepEqual(readFileSync(path.join(f.root,f.feature,'plan/progress.yaml')),before);
});
test('S10 legacy checkbox state does not invalidate a committed task scope',t=>{
  const f=workflowFixture(t),plan=f.feature+'/legacy-plan.md';
  const text='# plan\n### Task 0: isolation\n- [x] ready\n### Task 1: implement\n- [ ] first\n- [ ] second\n### Task 2: final\n- [ ] verify\n### Task 3: delivery\n- [ ] merge\n\n```json spec-dev-scopes\n'+JSON.stringify(f.scopes)+'\n```\n';
  f.put(plan,text);const authority=f.commit();const r=f.run(cli,['bind','--plan',plan,'--task','T01','--authority',authority]);assert.equal(r.status,0,r.stderr);
  f.put(plan,text.replace('[ ] first','[x] first'));assert.equal(inspect(f).status,0);
  f.put(plan,text.replace('[ ] first','[x] different contract'));rejected(inspect(f));
});
test('S04 claim checkpoint can be on integration history outside implementer ancestry',t=>{
  const f=workflowFixture(t),branch=f.git('branch','--show-current'),base=f.git('rev-parse','HEAD'),wt=path.join(f.outer,'implementer');
  f.git('worktree','add','-qb','ticket',wt);
  const claim={key:'c1',owner:'fixture',agent_id:'a1',worktree:wt,branch:'ticket',base_commit:base};
  f.state.current=null;f.state.execution={mode:'parallel',integration_branch:branch,integration_worktree:f.root,validated_commit:base};f.state.tasks.T01.claim=claim;
  const checkpoint=f.save();
  const view={readText:p=>execFileSync('git',['-C',f.root,'show',base+':'+p],{encoding:'utf8'})};
  f.state.tasks.T01.binding={scope_commit:base,scope_digest:scopeFingerprint(view,f.plan,'T01').digest,authorization_ref:'fixture-explicit-execution',worktree:wt,branch:'ticket',claim_key:'c1',claim_checkpoint:checkpoint};
  const authority=f.save(),r=f.run(cli,['bind','--plan',f.plan,'--task','T01','--authority',authority],{cwd:wt});
  assert.equal(r.status,0,r.stderr);assert.equal(f.run(cli,['inspect'],{cwd:wt}).status,0);
  f.state.tasks.T01.claim={...claim,key:'c2'};f.save();rejected(f.run(cli,['inspect'],{cwd:wt}));
});
