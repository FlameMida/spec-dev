import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
test("S6.1 验收复用执行证据且 standard 不审计 pass",()=>{
  const s=raw('skills/acceptance-qa/SKILL.md');
  assert.match(s,/不采信无回执的自报告/);assert.match(s,/facts\.json/);assert.match(s,/pass 项不派证据审计/);
  assert.doesNotMatch(s,/全套复核与审计/);
  assert.match(s,/不无条件追加全量/);assert.match(s,/未到期的最终全量记待执行/);
});
