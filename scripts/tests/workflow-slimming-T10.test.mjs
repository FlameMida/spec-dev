import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
test("S8.1 台账随任务一次提交",()=>{
  const d=raw('skills/writing-plans/references/delivery-templates.md');
  assert.match(d,/一次保存/);assert.match(d,/一次提交/);assert.doesNotMatch(d,/每次状态变化给出实际提交步骤/);
  const g=raw('skills/executing-plans/references/integration-groups.md');
  assert.doesNotMatch(g,/chore: register/);assert.match(g,/随本票的下一次 checkpoint 一起提交/);
  assert.match(raw('skills/executing-plans/SKILL.md'),/不为单个资源单独提交/);
});
