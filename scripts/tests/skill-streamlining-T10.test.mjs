import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S27 删除劝诫不删除有效红与违规处理",()=>{

const s=raw('skills/test-driven-development/SKILL.md');
assert.match(s,/有效失败测试/);assert.match(s,/删除本次未经测试先行的实现/);
assert.doesNotMatch(s,/那是合理化借口|## 为什么顺序重要（借口对照表）/);

});

test("S28 纯重构和同范围例外授权保持",()=>{

const s=raw('skills/test-driven-development/SKILL.md');
assert.match(s,/刻画通过不是红证据/);assert.match(s,/同一范围内已授权/);
assert.match(s,/不反复询问/);

});
