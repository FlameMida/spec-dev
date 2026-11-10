import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,chmodSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {workflowFixture,specText} from './helpers/workflow-fixture.mjs';
const install=f=>f.run('guardrail/install.mjs',['--repo',f.root,'--no-ci']);
const START='# spec-dev:guard:start',END='# spec-dev:guard:end';
// What an earlier installer wrote for the two message hooks.
const oldTemplate=name=>name==='commit-msg'
  ?`#!/usr/bin/env sh\nlegacy_dir="$(git rev-parse --git-common-dir)/hooks"\nself_dir="$(cd "$(dirname "$0")" && pwd)"\nif [ -x "$legacy_dir/commit-msg" ] && [ "$(cd "$legacy_dir" 2>/dev/null && pwd)" != "$self_dir" ]; then\n  "$legacy_dir/commit-msg" "$@" || exit $?\nfi\n${START}\nspec_dev_binding="$(git rev-parse --show-toplevel)/scripts/spec-dev/task-binding.mjs"\nnode "$spec_dev_binding" check-message --file "$1" || exit $?\n${END}\nexit 0\n`
  :`#!/usr/bin/env sh\n${START}\nspec_dev_binding="$(git rev-parse --show-toplevel)/scripts/spec-dev/task-binding.mjs"\nnode "$spec_dev_binding" prepare-message --file "$1" || exit $?\n${END}\nlegacy_dir="$(git rev-parse --git-common-dir)/hooks"\nself_dir="$(cd "$(dirname "$0")" && pwd)"\nif [ -x "$legacy_dir/prepare-commit-msg" ] && [ "$(cd "$legacy_dir" 2>/dev/null && pwd)" != "$self_dir" ]; then\n  "$legacy_dir/prepare-commit-msg" "$@" || exit $?\nfi\nexit 0\n`;

test('installation preserves legacy artifacts; migration remains a separate explicit command',t=>{
 const f=workflowFixture(t);
 const files={
  'docs/2026-01-01-legacy/spec/legacy-design.md':'---\nspec_dev:\n  version: 1\n  status: active\n  covers: []\n---\n# Legacy\n',
  'docs/adr/0001-original.md':'# Original decision\n',
  'docs/explorations/notes.md':'# Original exploration\n'
 };
 for(const [file,body] of Object.entries(files))f.put(file,body);
 f.commit('legacy artifacts');const head=f.git('rev-parse','HEAD');
 const result=f.run('guardrail/install.mjs',['--repo',f.root,'--no-ci','--no-git-hook']);assert.equal(result.status,0,result.stderr);
 for(const [file,body] of Object.entries(files)){
  assert.ok(existsSync(path.join(f.root,file)),'installer moved legacy artifact: '+file);
  assert.equal(readFileSync(path.join(f.root,file),'utf8'),body);
 }
 assert.equal(f.git('rev-parse','HEAD'),head,'installation must not commit');
 const migrated=f.run('guardrail/migrate-to-spec-dev.mjs',['--repo',f.root]);assert.equal(migrated.status,0,migrated.stderr);
 assert.ok(!existsSync(path.join(f.root,'docs/2026-01-01-legacy')));
 assert.equal(readFileSync(path.join(f.root,'.spec-dev/2026-01-01-legacy/spec/legacy-design.md'),'utf8'),files['docs/2026-01-01-legacy/spec/legacy-design.md']);
 assert.equal(f.git('rev-parse','HEAD'),head,'explicit migration must not auto-commit');
});
test('installed guard is self-contained and installs only the drift hooks',t=>{
  const f=workflowFixture(t);f.git('config','--unset','core.hooksPath');const r=install(f);assert.equal(r.status,0,r.stderr);
  const dir=path.join(f.root,'scripts/spec-dev');
  assert.deepEqual(readdirSync(path.join(dir,'lib')).sort(),['git-view.mjs','spec-data.mjs']);
  assert.ok(!existsSync(path.join(dir,'task-binding.mjs')));
  for(const file of readdirSync(path.join(dir,'lib')))assert.doesNotMatch(readFileSync(path.join(dir,'lib',file),'utf8'),/from ['"](?:\.\.\/){2}|\/Users\/|plugins\/cache/);
  assert.deepEqual(readdirSync(path.join(f.root,'.githooks')).sort(),['pre-commit','pre-push']);
  const local=(...args)=>spawnSync(process.execPath,[path.join(dir,'check-spec-drift.mjs'),...args],{cwd:f.root,encoding:'utf8'});
  f.put('src/app.mjs','export const value=3;\n');f.git('add','src/app.mjs');
  assert.equal(local('--staged').status,1,'the installed copy guards the active spec');
  assert.throws(()=>f.git('commit','-qm','implementation'),'pre-commit blocks the unsynchronized commit');
});
test('message hooks written by the user are left alone',t=>{
  const f=workflowFixture(t);f.git('config','core.hooksPath','.custom-hooks');
  const file=path.join(f.root,'.custom-hooks/commit-msg'),body='#!/usr/bin/env python3\nimport sys\nsys.exit(0)\n';
  f.put('.custom-hooks/commit-msg',body);chmodSync(file,0o755);f.commit('custom hook');
  const r=install(f);assert.equal(r.status,0,r.stderr);assert.equal(readFileSync(file,'utf8'),body);
  assert.ok(!existsSync(path.join(f.root,'.custom-hooks/prepare-commit-msg')));
});
test('reinstall removes the message guards and scripts left by task binding',t=>{
  const f=workflowFixture(t);f.git('config','core.hooksPath','.custom-hooks');
  f.put('.custom-hooks/prepare-commit-msg',oldTemplate('prepare-commit-msg'));
  f.put('.custom-hooks/commit-msg','#!/bin/sh\necho user-check\n'+START+'\nspec_dev_binding="$(git rev-parse --show-toplevel)/scripts/spec-dev/task-binding.mjs"\nnode "$spec_dev_binding" check-message --file "$1" || exit $?\n'+END+'\nexit 0\n');
  for(const stale of ['task-binding.mjs','lib/task-binding.mjs','lib/task-scopes.mjs','lib/record-data.mjs','lib/write-paths.mjs'])f.put('scripts/spec-dev/'+stale,'// stale\n');
  const r=install(f);assert.equal(r.status,0,r.stderr);
  assert.ok(!existsSync(path.join(f.root,'.custom-hooks/prepare-commit-msg')),'a hook that was only our template is removed');
  assert.equal(readFileSync(path.join(f.root,'.custom-hooks/commit-msg'),'utf8'),'#!/bin/sh\necho user-check\nexit 0\n','user content survives without the guard block');
  for(const stale of ['task-binding.mjs','lib/task-binding.mjs','lib/task-scopes.mjs','lib/record-data.mjs','lib/write-paths.mjs'])assert.ok(!existsSync(path.join(f.root,'scripts/spec-dev',stale)),stale);
  assert.equal(install(f).status,0,'a second run is a no-op');
  assert.equal(readFileSync(path.join(f.root,'.custom-hooks/commit-msg'),'utf8'),'#!/bin/sh\necho user-check\nexit 0\n');
});
const BINDING='spec_dev_binding="$(git rev-parse --show-toplevel)/scripts/spec-dev/task-binding.mjs"';
const call=verb=>'node "$spec_dev_binding" '+verb+' --file "$1" || exit $?';
test('reinstall cleans damaged or repeated binding guards, so commits keep working',t=>{
  const f=workflowFixture(t,{status:'draft'});f.git('config','core.hooksPath','.custom-hooks');
  // An orphan start marker (its end was deleted) followed by user content and a complete block.
  f.put('.custom-hooks/commit-msg',['#!/bin/sh','echo user-check',START,BINDING,call('check-message'),'echo keep-me',START,BINDING,call('check-message'),END,'exit 0',''].join('\n'));
  f.put('.custom-hooks/prepare-commit-msg',['#!/bin/sh',START,BINDING,call('prepare-message'),END,'echo between',START,BINDING,call('prepare-message'),END,'exit 0',''].join('\n'));
  for(const name of ['commit-msg','prepare-commit-msg'])chmodSync(path.join(f.root,'.custom-hooks',name),0o755);
  const r=install(f);assert.equal(r.status,0,r.stderr);
  const msg=readFileSync(path.join(f.root,'.custom-hooks/commit-msg'),'utf8'),prepare=readFileSync(path.join(f.root,'.custom-hooks/prepare-commit-msg'),'utf8');
  for(const text of [msg,prepare])assert.doesNotMatch(text,/task-binding|spec_dev_binding/);
  assert.match(msg,/echo user-check\n/);assert.match(msg,/echo keep-me\n/,'content after an orphan marker is not swallowed');
  assert.equal(prepare,'#!/bin/sh\necho between\nexit 0\n');
  f.put('notes.txt','after reinstall\n');f.git('add','notes.txt');f.git('commit','-qm','commit still works');
});
test('a customized call into task-binding is reported instead of silently left behind',t=>{
  const f=workflowFixture(t);f.git('config','core.hooksPath','.custom-hooks');
  const body='#!/bin/sh\nnode scripts/spec-dev/task-binding.mjs check-message --file "$1" || true\n';
  f.put('.custom-hooks/commit-msg',body);
  const r=install(f);assert.equal(r.status,0,r.stderr);
  assert.equal(readFileSync(path.join(f.root,'.custom-hooks/commit-msg'),'utf8'),body,'user-written lines are not rewritten');
  assert.match(r.stdout+r.stderr,/commit-msg[^\n]*task-binding\.mjs/);
});
test('the default .githooks is cleaned even when core.hooksPath points elsewhere',t=>{
  const f=workflowFixture(t);f.git('config','core.hooksPath','.custom-hooks');
  f.put('.githooks/commit-msg',oldTemplate('commit-msg'));f.put('.githooks/prepare-commit-msg',oldTemplate('prepare-commit-msg'));
  const r=install(f);assert.equal(r.status,0,r.stderr);
  for(const name of ['commit-msg','prepare-commit-msg'])assert.ok(!existsSync(path.join(f.root,'.githooks',name)),name);
});
test('reinstall preserves and executes a custom pre-commit hook exactly once',t=>{
  const f=workflowFixture(t,{status:'draft'});f.git('config','core.hooksPath','.custom-hooks');
  f.put('.custom-hooks/pre-commit','#!/bin/sh\nprintf "pre-commit\\n" >> "$(git rev-parse --git-path sentinel.log)"\nexit 0\n');chmodSync(path.join(f.root,'.custom-hooks/pre-commit'),0o755);
  assert.equal(install(f).status,0);const before=readFileSync(path.join(f.root,'.custom-hooks/pre-commit'),'utf8');assert.equal(install(f).status,0);
  assert.equal(readFileSync(path.join(f.root,'.custom-hooks/pre-commit'),'utf8'),before);
  const p=path.resolve(f.root,f.git('rev-parse','--git-path','sentinel.log'));writeFileSync(p,'');
  f.put('src/app.mjs','changed');f.git('add','src/app.mjs');f.git('commit','-qm','implementation');
  assert.deepEqual(readFileSync(p,'utf8').trim().split('\n'),['pre-commit']);
});
test('reinstall preserves pre-push refs for the original local hook',t=>{
  const f=workflowFixture(t,{status:'draft'});f.git('config','--unset','core.hooksPath');assert.equal(install(f).status,0);
  const base=f.git('rev-parse','HEAD');f.put('src/app.mjs','changed');f.git('add','src/app.mjs');f.git('commit','-qm','implementation');
  f.put('.git/hooks/pre-push','#!/bin/sh\ncat > "$(git rev-parse --git-path pushed-refs)"\n');chmodSync(path.join(f.root,'.git/hooks/pre-push'),0o755);
  assert.equal(install(f).status,0);const tip=f.git('rev-parse','HEAD'),input=`refs/heads/main ${tip} refs/heads/main ${base}\n`;
  const r=spawnSync(path.join(f.root,'.githooks/pre-push'),[],{cwd:f.root,encoding:'utf8',input});assert.equal(r.status,0,r.stderr);
  assert.equal(readFileSync(path.join(f.root,'.git/pushed-refs'),'utf8'),input);
});
test('a fresh clone pushes a draft-then-active history through the installed hooks',t=>{
  const f=workflowFixture(t,{status:'draft'});f.git('config','--unset','core.hooksPath');assert.equal(install(f).status,0);f.commit('install guard');
  f.put('src/app.mjs','changed');f.commit('feat(T01): implementation');f.put(f.spec,specText('active'));f.commit('deliver: activate spec');
  const clone=path.join(f.outer,'clone'),remote=path.join(f.outer,'remote.git');f.git('clone','-q',f.root,clone);f.git('init','--bare','-q',remote);
  const localGit=(...args)=>spawnSync('git',['-C',clone,...args],{encoding:'utf8'});
  assert.equal(localGit('config','core.hooksPath','.githooks').status,0);
  assert.equal(localGit('remote','add','owned-test',remote).status,0);
  const r=localGit('push','owned-test','HEAD:refs/heads/fixture');assert.equal(r.status,0,r.stderr);
  for(const [k,v] of [['user.name','Fixture'],['user.email','fixture@example.invalid']])localGit('config',k,v);
  writeFileSync(path.join(clone,'src/app.mjs'),'drift');localGit('add','src/app.mjs');
  assert.notEqual(localGit('commit','-qm','drift after delivery').status,0,'the delivered spec guards later changes');
});
