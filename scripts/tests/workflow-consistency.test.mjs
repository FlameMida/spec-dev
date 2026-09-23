import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
import {spawnSync} from 'node:child_process';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=p=>readFileSync(path.join(root,p),'utf8');
test('S25 execution summary preserves canonical TDD exceptions',()=>{
 const text=raw('skills/executing-plans/SKILL.md');assert.doesNotMatch(text,/TDD 铁律无例外/);assert.match(text,/纯重构/);assert.match(text,/例外/);
});
test('S26 deterministic checking does not promise identical run results',()=>{
 const text=raw('skills/acceptance-qa/SKILL.md');assert.doesNotMatch(text,/每次运行结果相同/);assert.match(text,/断言/);
});
test('S25 the routing diagram starts with existing entry and distinguishes the final deliverable',()=>{
 const text=raw('skills/requirement-analysis/SKILL.md');assert.match(text,/```mermaid\nflowchart/);assert.match(text,/明确入口或恢复/);assert.match(text,/最终交付/);assert.match(text,/报告.*不是实施|报告.*不.*实施/);
});
test('S25 unknown quick-fix impact returns to clarification rather than unchanged',()=>{
 const text=readPolicy(root,'skills/quick-fix/SKILL.md').text;assert.match(text,/```mermaid\nflowchart/);assert.match(text,/K -->\|未知或冲突\| C/);assert.match(text,/C\[澄清或升级\]/);assert.match(text,/未知、冲突和证据不足/);
});
test('S07 execution routing separates terminal archives from business scheduling',()=>{
 const text=raw('skills/executing-plans/SKILL.md');assert.match(text,/```mermaid\nflowchart/);assert.match(text,/终端档案/);assert.match(text,/current/);assert.match(text,/交付恢复/);
});
test('S25 lifecycle table separates activation and delivery with frozen superseded history',()=>{
 const text=readPolicy(root,'skills/requirement-analysis/SKILL.md').text;assert.match(text,/事件 \| 新 spec 状态 \| 旧 spec 标注 \| 下一步/);assert.match(text,/pending.*不是.*状态/);assert.match(text,/superseded_by/);assert.match(text,/sync_commit.*冻结|冻结.*sync_commit/);
});
test('S27 plan entry uses an action reading table and keeps reachable authority',()=>{
 const text=raw('skills/writing-plans/SKILL.md');assert.match(text,/动作 \| 必读资料/);const policy=readPolicy(root,'skills/writing-plans/SKILL.md');assert.match(policy.text,/scope_protocol_version/);assert.match(policy.text,/资源台账总则/);
});
test('S15/S16/S19 final evidence is reusable only in a new matching review snapshot',t=>{
 const f=workflowFixture(t);f.state.tasks.T01={status:'completed',commit:f.git('rev-parse','HEAD')};f.state.tasks.T02={status:'in_progress'};f.state.current='T02';f.save();const head=f.git('rev-parse','HEAD');
 const saved=f.run('scripts/execution-evidence.mjs',['record','--feature',path.join(f.root,f.feature),'--task','T02','--phase','final','--attempt','actual-final','--',process.execPath,'--input-type=module','-e','import {value} from "./src/app.mjs"; if(value!==1)throw Error("wrong value"); console.log("actual final assertion passed")']);assert.equal(saved.status,0,saved.stderr);assert.equal(JSON.parse(saved.stdout).exit_code,0);
 const ref={task:'T02',phase:'final',feature:path.join(f.root,f.feature),record_path:JSON.parse(saved.stdout).record};
 const config={repo:f.root,base:f.git('rev-parse','HEAD~1'),head,spec:f.spec,plan:f.plan,tier:'regular',capacity:2,tests:[],evidence:[ref]};
 const review=(...args)=>spawnSync('python3',[path.join(root,'scripts/review-runner.py'),...args],{cwd:f.root,encoding:'utf8'});
 const initialize=(name)=>{const file=path.join(f.outer,name+'.json');writeFileSync(file,JSON.stringify({...config,head:f.git('rev-parse','HEAD')}));return review('init','--config',file,'--run',path.join(f.outer,name));};
 const first=initialize('first');assert.equal(first.status,0,first.stdout+first.stderr);
 f.state.notes.push('progress-only checkpoint');f.save();const old=review('status','--run',path.join(f.outer,'first'));assert.equal(JSON.parse(old.stdout).status,'blocked');assert.equal(initialize('second').status,0);
 f.put('src/app.mjs','export const value=2;\n');f.commit('changed candidate');assert.notEqual(initialize('changed').status,0);
 f.put('src/app.mjs','export const value = 1;\n');f.commit('restore tested content');const record=JSON.parse(readFileSync(path.join(ref.feature,ref.record_path)));rmSync(path.join(ref.feature,record.stdout));assert.notEqual(initialize('missing-original').status,0);
});
