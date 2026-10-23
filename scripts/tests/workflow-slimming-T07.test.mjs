import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
test("S4.1 T00 声明失效不回退全量",()=>{
  const s=raw('skills/writing-plans/references/task-templates.md');
  assert.match(s,/不回退完整测试套件/);assert.doesNotMatch(s,/回退运行完整测试套件/);
  const w=raw('skills/using-git-worktrees/SKILL.md');
  assert.match(w,/不回退全量/);assert.doesNotMatch(w,/回退完整\n?测试套件/);
});
test("S4.2 相关测试范围按自有测试与直接导入方推导",()=>{
  const s=raw('skills/writing-plans/references/plan-format.md');
  assert.match(s,/直接 import\/require/);assert.doesNotMatch(s,/路径判定，不做依赖分析/);assert.match(s,/回归不在任务内跑/);
});
test("S4.3 任务内不跑回归",()=>{
  assert.match(raw('skills/executing-plans/SKILL.md'),/不在任务内跑回归或完整套件/);
});
test('S11 final verification has an independent predecessor slot before acceptance',()=>{
 const text=raw('skills/writing-plans/references/delivery-templates.md');assert.match(text,/独立.*final|final.*验证票/);assert.match(text,/验收.*依赖.*final|final.*先于.*验收/);assert.doesNotMatch(text,/步骤 1：全量验证（安全网）与归属裁决/);
 assert.match(text,/execution-evidence\.mjs/);assert.match(text,/verifyDelivery/);
});
