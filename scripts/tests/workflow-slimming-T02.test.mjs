import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;
test("S1.3 skill 文本不再要求完整代码",()=>{
  const s=policy('skills/writing-plans/SKILL.md');
  assert.match(s,/## 计划体量/);assert.match(s,/关键 diff 片段/);assert.match(s,/单任务文件上限 200 行/);assert.match(s,/禁止整文件内嵌/);
  assert.doesNotMatch(s,/每步给完整代码/);
  const body=raw('skills/writing-plans/SKILL.md');assert.doesNotMatch(body,/零上下文/);
});
test("S1.3 README 与 openai.yaml 同步",()=>{
  for(const f of ['README.zh-CN.md','README.md']) assert.doesNotMatch(raw(f),/完整代码|complete code/);
  assert.match(raw('skills/writing-plans/agents/openai.yaml'),/200 行/);
});
