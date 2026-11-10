import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
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
test('S07 recovery relies only on the plan file and git history',()=>{
 const text=raw('skills/executing-plans/SKILL.md');assert.match(text,/恢复只认计划文件和 git log/);assert.match(text,/不重做/);
});
test('S25 lifecycle table keeps specs draft during implementation and activates on delivery',()=>{
 const text=readPolicy(root,'skills/requirement-analysis/SKILL.md').text;assert.match(text,/时点 \| 本 spec \| 受影响的旧 spec/);assert.match(text,/守卫只对 `active` 生效/);assert.match(text,/superseded_by/);assert.match(text,/默认不带 frontmatter/);
});
test('S27 plan entry reaches its template and task boundary rules',()=>{
 const files=readPolicy(root,'skills/writing-plans/SKILL.md').documents.map(d=>d.file);
 for(const name of ['plan-template','task-boundaries','design-principles'])assert.ok(files.includes('skills/writing-plans/references/'+name+'.md'),name);
});
