import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const files=['skills/test-strategy/SKILL.md','skills/test-strategy/references/frontend-testing.md','skills/test-strategy/references/ai-agent-testing.md','skills/test-strategy/agents/openai.yaml','skills/test-strategy/evals/evals.json','skills/test-strategy/evals/trigger-evals.json','skills/acceptance-qa/references/acceptance-matrix.md','skills/acceptance-qa/SKILL.md','skills/requirement-analysis/assets/spec-template.md'];
test("S5.1 lane 定义与消费方同步",()=>{
  for(const f of files) assert.doesNotMatch(raw(f),/nightly|PR lane|fast\/PR/,f);
  const s=raw('skills/test-strategy/SKILL.md');assert.match(s,/\| \*\*manual\*\* \|/);assert.match(s,/\| \*\*final\*\* \|/);assert.match(s,/manual-pending/);
  assert.match(raw('skills/acceptance-qa/SKILL.md'),/manual-pending/);
});
