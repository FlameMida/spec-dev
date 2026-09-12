import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
test("S2.3 反模式段不再要求全流程",()=>{
  const s=raw('skills/requirement-analysis/SKILL.md');
  assert.doesNotMatch(s,/所有需求都要走完本流程/);assert.match(s,/light 档一次成稿一次批准/);assert.match(s,/不派 spec-reviewer/);
});
test("S2.2 模板标注档位",()=>{
  const s=raw('skills/requirement-analysis/assets/spec-template.md');
  assert.match(s,/档位裁剪/);assert.match(s,/\| light \| 背景与目标、非目标、已确认的关键决策、行为规范/);assert.match(s,/\| deep \| 全部小节/);
});
test("S2.1 light 一次批准",()=>{
  assert.match(raw('skills/requirement-analysis/references/spec-review.md'),/light 档跳过本步/);
  assert.match(raw('skills/requirement-analysis/SKILL.md'),/spec 草稿随完整设计同一条消息呈现/);
});
