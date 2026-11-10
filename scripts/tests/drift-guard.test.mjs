import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {workflowFixture,specText} from './helpers/workflow-fixture.mjs';
const cli='guardrail/check-spec-drift.mjs',guard=(f,args,options={})=>f.run(cli,args,options);
const specBody=f=>readFileSync(path.join(f.root,f.spec),'utf8');

test('active spec blocks covered code that changes without it',t=>{
  const f=workflowFixture(t);f.put('src/app.mjs','export const value=2;\n');f.git('add','src/app.mjs');
  const r=guard(f,['--staged']);assert.equal(r.status,1);assert.match(r.stderr,/drift guard/);
});
test('实施期间 spec 保持 draft，任务提交不被拦',t=>{
  const f=workflowFixture(t,{status:'draft'}),start=f.git('rev-parse','HEAD');
  f.put('src/app.mjs','export const value=2;\n');f.git('add','src/app.mjs');
  assert.equal(guard(f,['--staged']).status,0);
  assert.equal(guard(f,['--hook'],{input:JSON.stringify({tool_input:{file_path:'src/app.mjs'}})}).status,0);
  f.commit('feat(T01): implementation');
  assert.equal(guard(f,['--range',start+'..HEAD']).status,0);
});
test('交付提交翻 active 后，后续改动重新受守卫保护',t=>{
  const f=workflowFixture(t,{status:'draft'}),start=f.git('rev-parse','HEAD');
  f.put('src/app.mjs','export const value=2;\n');f.commit('feat(T01): implementation');
  f.put(f.spec,specText('active'));f.commit('deliver: activate spec');
  assert.equal(guard(f,['--range',start+'..HEAD']).status,0,'the implementation and delivery commits pass');
  const delivered=f.git('rev-parse','HEAD');
  f.put('src/app.mjs','export const value=3;\n');f.commit('later change without spec');
  assert.equal(guard(f,['--range',delivered+'..HEAD']).status,1);
});
test('修订已 active 的 spec：先改回 draft，交付时再翻 active',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD');
  f.put(f.spec,specText('draft')+'revised behavior\n');f.commit('spec: revise and return to draft');
  f.put('src/app.mjs','export const value=2;\n');f.commit('feat(T01): implementation');
  f.put(f.spec,specText('active')+'revised behavior\n');f.commit('deliver: activate spec');
  assert.equal(guard(f,['--range',start+'..HEAD']).status,0);
});
test('被取代的旧 spec 不再拦截，后继在交付时接管',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD'),next='.spec-dev/next/spec/next-design.md';
  f.put(f.spec,specText('superseded','  superseded_by: '+next+'\n'));f.put(next,specText('draft'));f.commit('start: supersede the old spec');
  f.put('src/app.mjs','export const value=2;\n');f.commit('feat(T01): implementation');
  f.put(next,specText('active'));f.commit('deliver: activate successor');
  assert.equal(guard(f,['--range',start+'..HEAD']).status,0);
  const delivered=f.git('rev-parse','HEAD');f.put('src/app.mjs','export const value=3;\n');f.commit('later change');
  const r=guard(f,['--range',delivered+'..HEAD']);assert.equal(r.status,1);assert.match(r.stderr,/next-design\.md/);
});
test('没有 frontmatter 的一页 spec 不参与守卫',t=>{
  const f=workflowFixture(t);f.put(f.spec,'# fixture\n\n## 目标与成功标准\n');f.commit('plain one-page spec');
  f.put('src/app.mjs','export const value=2;\n');f.git('add','src/app.mjs');assert.equal(guard(f,['--staged']).status,0);
});
test('历史上带 Spec-Task 的提交告警放行，不再核验绑定',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD');
  f.put('src/app.mjs','export const value=2;\n');
  const tip=f.commit('implementation\n\nSpec-Task: '+JSON.stringify({plan:f.feature+'/plan/index.md',task:'T01',authority:start}));
  const range=guard(f,['--range',start+'..'+tip]);assert.equal(range.status,0,range.stderr);assert.match(range.stderr,/Spec-Task/);
  const push=guard(f,['--push'],{input:`refs/heads/new ${tip} refs/heads/new ${'0'.repeat(40)}\n`});assert.equal(push.status,0,push.stderr);
});
test('staged check reads the index, never unstaged spec content',t=>{
  const f=workflowFixture(t);f.put('src/app.mjs','export const value=2;\n');f.git('add','src/app.mjs');
  f.put(f.spec,specBody(f)+'synchronized\n');
  assert.equal(guard(f,['--staged']).status,1,'an unstaged spec edit does not count for a commit');
  f.git('add',f.spec);assert.equal(guard(f,['--staged']).status,0);
});
test('edit hook accepts a spec already changed in the working tree',t=>{
  const f=workflowFixture(t),input=JSON.stringify({tool_input:{file_path:path.join(f.root,'src/app.mjs')}});
  assert.equal(guard(f,['--hook'],{input}).status,2);
  f.put(f.spec,specBody(f)+'synchronized\n');assert.equal(guard(f,['--hook'],{input}).status,0);
  assert.equal(guard(f,['--hook'],{input:JSON.stringify({tool_input:{file_path:path.join(f.outer,'outside.mjs')}})}).status,0,'paths outside the repository are ignored');
});
test('worktree audit is strict, and only advisory with --warn-only',t=>{
  const f=workflowFixture(t);f.put('src/app.mjs','export const value=2;\n');
  assert.equal(guard(f,['--worktree']).status,2);
  const advisory=guard(f,['--worktree','--warn-only']);
  assert.equal(advisory.status,0,advisory.stderr);assert.match(JSON.parse(advisory.stdout).systemMessage,/drift guard/);
});
test('history is checked commit by commit, so a later revert does not hide drift',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD');
  f.put('src/out.mjs','export const out=1;\n');f.commit('add');f.git('rm','-q','src/out.mjs');f.commit('revert');
  assert.equal(guard(f,['--range',start+'..HEAD']).status,1);
});
test('ordinary Spec trailer cannot authorize an unsynchronized commit',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD');f.put('src/app.mjs','changed');f.commit('edit\n\nSpec: '+f.spec);
  assert.equal(guard(f,['--range',start+'..HEAD']).status,1);
});
test('refs cannot borrow synchronization from one another',t=>{
  const f=workflowFixture(t),base=f.git('rev-parse','HEAD');
  f.put(f.spec,specBody(f)+'doc change\n');const doc=f.commit();
  f.git('checkout','-qb','code',base);f.put('src/app.mjs','changed');const code=f.commit();
  const input=`refs/heads/doc ${doc} refs/heads/doc ${base}\nrefs/heads/code ${code} refs/heads/code ${base}\n`;
  assert.equal(guard(f,['--push'],{input}).status,1);
});
test('synchronized edit and both waiver forms keep their meaning',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD');f.put('src/app.mjs','changed');f.put(f.spec,specBody(f)+'synchronized\n');
  f.commit('sync');assert.equal(guard(f,['--range',start+'..HEAD']).status,0);
  const next=f.git('rev-parse','HEAD');f.put('src/app.mjs','changed again');f.commit('waiver\n\nSpec-Guard: off formatting only');assert.equal(guard(f,['--range',next+'..HEAD']).status,0);
  f.put('src/app.mjs','third change');f.git('add','src/app.mjs');
  assert.equal(guard(f,['--staged']).status,1);
  assert.equal(guard(f,['--staged'],{env:{...process.env,SPEC_DEV_GUARD:'off'}}).status,0);
});
test('merge differences are checked against every parent',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD'),branch=f.git('branch','--show-current');
  f.git('checkout','-qb','side');f.put('src/other.mjs','side change');f.commit('side without spec');
  f.git('checkout','-q',branch);f.put('README.md','unrelated');f.commit('unrelated');
  f.git('merge','-q','--no-ff','side','-m','merge');
  assert.equal(guard(f,['--range',start+'..HEAD']).status,1);
});
test('a failed commit walk fails closed; a guard-internal read error warns and passes',t=>{
  const f=workflowFixture(t),start=f.git('rev-parse','HEAD');f.put('README.md','unrelated');const tip=f.commit('unrelated');
  assert.equal(guard(f,['--range',start+'..'+tip]).status,0);
  assert.equal(guard(f,['--range','0123456789abcdef0123456789abcdef01234567..'+tip]).status,1,'unknown commit');
  assert.equal(guard(f,['--range',start+'...'+tip]).status,1,'only A..B ranges are accepted');
  const blob=f.git('rev-parse',tip+':'+f.spec),file=path.resolve(f.root,f.git('rev-parse','--git-path','objects/'+blob.slice(0,2)+'/'+blob.slice(2))),bytes=readFileSync(file);unlinkSync(file);
  const broken=guard(f,['--range',start+'..'+tip]);assert.equal(broken.status,0);assert.match(broken.stderr,/已放行/);
  writeFileSync(file,bytes);assert.equal(guard(f,['--range',start+'..'+tip]).status,0);
});
