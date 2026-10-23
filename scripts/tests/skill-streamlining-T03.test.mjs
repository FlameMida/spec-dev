import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

test('plan formats and task templates are reachable from the skill entry',()=>{
 const files=new Set(readPolicy(root,'skills/writing-plans/SKILL.md').documents.map(d=>d.file));
 for(const name of ['plan-format','task-templates','delivery-templates','integration-declaration'])
  assert.ok(files.has(`skills/writing-plans/references/${name}.md`),name);
});

test('behavior and delivery templates keep contiguous numbered step structures',()=>{
 const behavior=readFileSync(path.join(root,'skills/writing-plans/references/task-templates.md'),'utf8').split('## 任务结构')[1];
 const delivery=readFileSync(path.join(root,'skills/writing-plans/references/delivery-templates.md'),'utf8');
 const numbers=text=>[...text.matchAll(/\*\*步骤 (\d)[：:]([^\n]+?)\*\*/g)].map(m=>Number(m[1]));
 assert.deepEqual(numbers(behavior),[1,2,3,4,5]);
 assert.deepEqual(numbers(delivery),[1,2,3,4,5,6,7]);
});
