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
  const text='# plan\n### Task 0: isolation\n- [x] ready\n### Task 1: implement\n- [ ] first\n- [ ] second\n```md\n- [ ] code sample\n```\n### Task 2: final\n- [ ] verify\n### Task 3: delivery\n- [ ] merge\n\n```json spec-dev-scopes\n'+JSON.stringify(f.scopes)+'\n```\n';
  f.put(plan,text);const authority=f.commit();const r=f.run(cli,['bind','--plan',plan,'--task','T01','--authority',authority]);assert.equal(r.status,0,r.stderr);
  f.put(plan,text.replace('[ ] first','[x] first'));assert.equal(inspect(f).status,0);
  f.put(plan,text.replace('[ ] first','[x] different contract'));rejected(inspect(f));
  f.put(plan,text.replace('[ ] code sample','[x] code sample'));rejected(inspect(f));
  f.put(plan,text+'\n### Task 01: duplicate\n- [ ] duplicate\n');rejected(inspect(f));
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
  f.put('src/independent.mjs','export const independent=1;\n');const advanced=f.commit('independent accepted implementation');f.state.execution.validated_commit=advanced;f.save();
  assert.equal(f.run(cli,['inspect'],{cwd:wt}).status,0,'an existing claim keeps its original validated base');
  f.state.tasks.T01.claim={...claim,key:'c2'};f.save();rejected(f.run(cli,['inspect'],{cwd:wt}));
});
test('S04 historical parallel association remains verifiable after integration branch rename',t=>{
 const f=workflowFixture(t),base=f.git('rev-parse','HEAD'),branch=f.git('branch','--show-current'),wt=path.join(f.outer,'historical-worker');f.git('worktree','add','-qb','historical-worker',wt);
 f.state.current=null;f.state.execution={mode:'parallel',integration_branch:branch,integration_worktree:f.root,validated_commit:base};
 f.state.tasks.T01.claim={key:'historical',owner:'fixture',agent_id:'fixture',worktree:wt,branch:'historical-worker',base_commit:base};const checkpoint=f.save();
 const view={readText:p=>execFileSync('git',['-C',f.root,'show',base+':'+p],{encoding:'utf8'})};
 f.state.tasks.T01.binding={scope_commit:base,scope_digest:scopeFingerprint(view,f.plan,'T01').digest,authorization_ref:'fixture-explicit-execution',worktree:wt,branch:'historical-worker',claim_key:'historical',claim_checkpoint:checkpoint};const authority=f.save();
 writeFileSync(path.join(wt,'src/app.mjs'),'export const value=2;\n');
 const gitWorker=(...args)=>execFileSync('git',['-C',wt,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();gitWorker('add','src/app.mjs');gitWorker('commit','-qm','implementation\n\nSpec-Task: '+JSON.stringify({plan:f.plan,task:'T01',authority}));const tip=gitWorker('rev-parse','HEAD');
 f.git('merge','--no-ff','historical-worker','-m','integrated');f.git('branch','-m','integration-archived');f.git('worktree','remove',wt);f.git('branch','-d','historical-worker');
 const r=f.run('guardrail/check-spec-drift.mjs',['--range',base+'..'+tip]);assert.equal(r.status,0,r.stdout+r.stderr);
});
test('S07 existing implementation commit does not complete or rewrite the task on inspect',t=>{
 const f=workflowFixture(t);f.bind();f.put('src/app.mjs','implemented\n');const commit=f.commit();
 f.state.tasks.T01.implementation_commit=commit;f.save();
 const before=readFileSync(path.join(f.root,f.feature,'plan/progress.yaml')),head=f.git('rev-parse','HEAD');
 assert.equal(inspect(f).status,0);assert.equal(f.state.tasks.T01.status,'in_progress');
 assert.deepEqual(readFileSync(path.join(f.root,f.feature,'plan/progress.yaml')),before);assert.equal(f.git('rev-parse','HEAD'),head);
});
test('S08 blocked current and conflicting serial work cannot activate a new task',t=>{
 const f=workflowFixture(t),{authority}=f.bind();f.state.tasks.T01.status='blocked';f.save();rejected(inspect(f));
 rejected(f.run(cli,['bind','--plan',f.plan,'--task','T02','--authority',authority]));
 f.state.tasks.T01.status='in_progress';f.state.tasks.T02.status='in_progress';f.save();rejected(inspect(f));
});
