import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,chmodSync,readdirSync,symlinkSync,unlinkSync,rmSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
const install=f=>f.run('guardrail/install.mjs',['--repo',f.root,'--no-ci','--no-migrate']);
function installed(t){
  const f=workflowFixture(t);f.git('config','--unset','core.hooksPath');const r=install(f);assert.equal(r.status,0,r.stderr);
  assert.ok(existsSync(path.join(f.root,'scripts/spec-dev/task-binding.mjs')),'installed binding CLI is required');
  f.local=(script,args=[],options={})=>spawnSync(process.execPath,[path.join(f.root,'scripts/spec-dev',script),...args],{cwd:f.root,encoding:'utf8',...options});
  f.installedBind=()=>{const b=f.bind();const r=f.local('task-binding.mjs',['bind','--plan',f.plan,'--task','T01','--authority',b.authority]);assert.equal(r.status,0,r.stderr);return b;};
  return f;
}
test('S06 installed guard is self-contained and stamps a real task commit',t=>{
  const f=installed(t);f.installedBind();f.put('src/app.mjs','export const value=3;\n');f.git('add','src/app.mjs');f.git('commit','-qm','implementation');
  assert.match(f.git('log','-1','--format=%B'),/^Spec-Task: /m);
  for(const file of readdirSync(path.join(f.root,'scripts/spec-dev/lib')))assert.doesNotMatch(readFileSync(path.join(f.root,'scripts/spec-dev/lib',file),'utf8'),/from ['"](?:\.\.\/){2}|\/Users\/|plugins\/cache/);
  assert.equal(f.local('check-spec-drift.mjs',['--range','HEAD~1..HEAD']).status,0);
});
test('S06 reinstall preserves and executes custom hooks exactly once',t=>{
  const f=workflowFixture(t);f.git('config','core.hooksPath','.custom-hooks');
  for(const name of ['pre-commit','prepare-commit-msg','commit-msg']){
    f.put('.custom-hooks/'+name,'#!/bin/sh\nprintf "'+name+'\\n" >> "$(git rev-parse --git-path sentinel.log)"\nexit 0\n');chmodSync(path.join(f.root,'.custom-hooks',name),0o755);
  }
  assert.equal(install(f).status,0);const before=readFileSync(path.join(f.root,'.custom-hooks/commit-msg'),'utf8');assert.equal(install(f).status,0);
  assert.equal(readFileSync(path.join(f.root,'.custom-hooks/commit-msg'),'utf8'),before);
  f.bind();const p=path.resolve(f.root,f.git('rev-parse','--git-path','sentinel.log'));writeFileSync(p,'');
  f.put('src/app.mjs','changed');f.git('add','src/app.mjs');f.git('commit','-qm','implementation');
  assert.deepEqual(readFileSync(p,'utf8').trim().split('\n'),['pre-commit','prepare-commit-msg','commit-msg']);assert.match(f.git('log','-1','--format=%B'),/^Spec-Task: /m);
});
test('S06 message protocol is idempotent and rejects conflicting or duplicate associations',t=>{
  const f=installed(t),{authority}=f.installedBind(),file=path.resolve(f.root,f.git('rev-parse','--git-path','COMMIT_EDITMSG'));
  const expected='Spec-Task: '+JSON.stringify({authority,task:'T01',plan:f.plan});
  writeFileSync(file,'message\n\n'+expected+'\n');
  const call=command=>f.local('task-binding.mjs',[command,'--file',file]);
  assert.equal(call('prepare-message').status,0);assert.equal(readFileSync(file,'utf8').match(/Spec-Task:/g).length,1);assert.equal(call('check-message').status,0);
  writeFileSync(file,'message\n'+expected+'\n'+expected+'\n');assert.equal(call('check-message').status,1);
  writeFileSync(file,'message\n'+expected.replace('T01','T02'));assert.equal(call('prepare-message').status,1);
});
test('S06 message commands cannot append to arbitrary files or external symlinks',t=>{
  const f=installed(t);f.installedBind();const outside=path.join(f.outer,'outside');writeFileSync(outside,'unchanged');
  assert.equal(f.local('task-binding.mjs',['prepare-message','--file',outside]).status,1);assert.equal(readFileSync(outside,'utf8'),'unchanged');
  const file=path.resolve(f.root,f.git('rev-parse','--git-path','COMMIT_EDITMSG'));unlinkSync(file);symlinkSync(outside,file);
  assert.equal(f.local('task-binding.mjs',['prepare-message','--file',file]).status,1);assert.equal(readFileSync(outside,'utf8'),'unchanged');
});
test('S06 ordinary Spec text remains unbound and original hook failure is retained',t=>{
  const f=installed(t);f.commit('installation\n\nSpec: documentation');assert.doesNotMatch(f.git('log','-1','--format=%B'),/^Spec-Task:/m);
  f.put('.githooks/commit-msg','#!/bin/sh\nexit 7\n');chmodSync(path.join(f.root,'.githooks/commit-msg'),0o755);assert.equal(install(f).status,0);
  const file=path.resolve(f.root,f.git('rev-parse','--git-path','COMMIT_EDITMSG'));writeFileSync(file,'message');
  const r=spawnSync(path.join(f.root,'.githooks/commit-msg'),[file],{cwd:f.root,encoding:'utf8'});assert.equal(r.status,7,r.stderr);
});
test('S06 reinstall preserves pre-push refs for the original local hook',t=>{
  const f=installed(t),{authority}=f.installedBind();f.put('src/app.mjs','changed');f.git('add','src/app.mjs');f.git('commit','-qm','implementation');
  f.put('.git/hooks/pre-push','#!/bin/sh\ncat > "$(git rev-parse --git-path pushed-refs)"\n');chmodSync(path.join(f.root,'.git/hooks/pre-push'),0o755);
  assert.equal(install(f).status,0);const tip=f.git('rev-parse','HEAD'),input=`refs/heads/main ${tip} refs/heads/main ${authority}\n`;
  const r=spawnSync(path.join(f.root,'.githooks/pre-push'),[],{cwd:f.root,encoding:'utf8',input});assert.equal(r.status,0,r.stderr);
  assert.equal(readFileSync(path.join(f.root,'.git/pushed-refs'),'utf8'),input);
});
test('S06 commit-msg validates the message after a legacy hook edits it',t=>{
  const f=installed(t);f.installedBind();
  f.put('.git/hooks/commit-msg','#!/bin/sh\nprintf "\\nSpec-Task: {}\\n" >> "$1"\n');chmodSync(path.join(f.root,'.git/hooks/commit-msg'),0o755);
  f.put('src/app.mjs','changed');f.git('add','src/app.mjs');assert.throws(()=>f.git('commit','-qm','implementation'));
});
test('S06 a fresh clone checks durable history and pushes only to an owned local bare remote',t=>{
  const f=installed(t);f.installedBind();f.put('src/app.mjs','changed');f.git('add','src/app.mjs');f.git('commit','-qm','implementation');
  const clone=path.join(f.outer,'clone'),remote=path.join(f.outer,'remote.git');f.git('clone','-q',f.root,clone);f.git('init','--bare','-q',remote);
  const localGit=(...args)=>spawnSync('git',['-C',clone,...args],{encoding:'utf8'});
  assert.equal(localGit('config','core.hooksPath','.githooks').status,0);
  assert.equal(localGit('remote','add','owned-test',remote).status,0);
  const r=localGit('push','owned-test','HEAD:refs/heads/fixture');assert.equal(r.status,0,r.stderr);
  assert.ok(!existsSync(path.join(clone,'.git/spec-dev-task.json')));
});
test('S03/S06 installed commit to bare push to fresh clone needs no original workspace',t=>{
 const f=installed(t),{authority}=f.installedBind();f.put('src/app.mjs','export const value=11;\n');f.git('add','src/app.mjs');f.git('commit','-qm','implementation');
 const remote=path.join(f.outer,'portable.git'),clone=path.join(f.outer,'fresh');f.git('init','--bare','-q',remote);f.git('remote','add','portable-test',remote);f.git('push','portable-test','HEAD:refs/heads/delivered');f.git('clone','-q','--branch','delivered','--single-branch',remote,clone);
 rmSync(f.root,{recursive:true});const check=()=>spawnSync(process.execPath,[path.join(clone,'scripts/spec-dev/check-spec-drift.mjs'),'--range',authority+'..HEAD'],{cwd:clone,encoding:'utf8'});
 assert.equal(check().status,0);assert.ok(!existsSync(path.join(clone,'.git/spec-dev-task.json')));
 const g=(...args)=>spawnSync('git',['-C',clone,...args],{encoding:'utf8'});g('config','user.name','Fixture');g('config','user.email','fixture@example.invalid');
 // Simulate an untrusted remote history rewrite; the range guard must catch it independently of hooks.
 const changed=g('-c','core.hooksPath=/dev/null','commit','--amend','-qm','association removed');assert.equal(changed.status,0,changed.stderr);assert.equal(check().status,1);
});
