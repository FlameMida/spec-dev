import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
test("S3.6 路数表为 1/2/5 且读回执不复跑",()=>{
  const s=raw('skills/executing-plans/references/review-orchestration.md');
  assert.match(s,/\| 常规 \| 两路 AS \+ BC/);assert.doesNotMatch(s,/四路 A\/B\/C\/S/);
  assert.match(s,/facts\.json/);assert.doesNotMatch(s,/独立复跑相关测试，不采信自报告/);
  assert.match(s,/small\/regular.*on-findings.*零高\/中候选时不派 critic/);assert.match(s,/`critic`/);assert.match(s,/`evidence`/);
});
test("S3.6 执行入口与 reviewer 同步",()=>{
  const e=raw('skills/executing-plans/SKILL.md');assert.match(e,/高\/中候选才反驳/);assert.match(e,/critic.*档位.*配置/);assert.doesNotMatch(e,/loop-until-dry|四路 A\/B\/C\/S|独立复跑相关测试，不采信自报告/);
  const r=raw('agents/code-reviewer.md');assert.match(r,/facts\.json/);assert.doesNotMatch(r,/用 Bash 独立重跑本次变更涉及的测试，不采信实施者的自报告/);
});
test("S3.6 README 与 evals 同步",()=>{
  assert.doesNotMatch(raw('README.zh-CN.md'),/loop-until-dry|fan-out code-reviewer/);assert.doesNotMatch(raw('README.md'),/loop-until-dry|fans out code-reviewer/);
  assert.doesNotMatch(raw('skills/executing-plans/evals/evals.json'),/四路/);
});
test('S18 detailed review rejects contradictory large critic configuration',()=>{
 const s=raw('skills/executing-plans/references/review-orchestration.md');assert.match(s,/large.*on-findings.*拒绝/);assert.doesNotMatch(s,/不派反驳、不派 critic，直接收口/);
 assert.match(s,/record_path/);assert.match(s,/原件/);
});
