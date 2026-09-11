import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S01 S02 执行入口聚焦获批书面计划",()=>{

const s=raw('skills/executing-plans/SKILL.md').split('\n---')[0];
assert.match(s,/已批准的书面实施计划/);assert.match(s,/即兴修改/);
assert.doesNotMatch(s,/index\.md \+ tasks/);

});

test("S03 S04 验收与日常测试边界仍明确",()=>{

const s=raw('skills/acceptance-qa/SKILL.md').split('\n---')[0];
assert.match(s,/矩阵驱动的验收/);assert.match(s,/日常跑测试/);
assert.match(s,/可访问性/);assert.doesNotMatch(s,/Shadow DOM\/iframe/);

});

test("S05 S06 探索未承诺状态与实验授权保持",()=>{

const s=raw('skills/exploring/SKILL.md').split('\n---')[0];
assert.match(s,/尚未决定实施/);assert.match(s,/按授权/);
assert.match(s,/单点事实问答/);

});

test("S07 S08 需求设计不吞并其他入口",()=>{

const s=raw('skills/requirement-analysis/SKILL.md').split('\n---')[0];
assert.match(s,/有设计空间/);assert.match(s,/quick-fix/);
assert.match(s,/exploring/);assert.match(s,/日常测试不适用/);
assert.doesNotMatch(s,/并行探索、逐题澄清、对抗验证/);

});
