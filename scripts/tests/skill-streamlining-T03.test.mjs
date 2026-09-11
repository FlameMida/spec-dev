import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S09 普通计划入口不内嵌组/并发字段全文",()=>{

const s=raw('skills/writing-plans/SKILL.md');
assert.match(s,/references\/plan-format\.md/);
assert.match(s,/references\/integration-declaration\.md/);
assert.doesNotMatch(s,/"protocol_version": 1/);
assert.match(policy('skills/writing-plans/SKILL.md'),/format_version/);

});

test("S10 自足产物和类型化步骤完整",()=>{

const s=policy('skills/writing-plans/SKILL.md');
assert.match(s,/每步给完整代码/);assert.match(s,/步骤 7：最终状态保存/);
assert.match(s,/零测试|SKIP/);assert.match(s,/资源台账总则/);

});

test("S21 七步收尾合法且 S22 普通行为票五步保持",()=>{

const s=raw('skills/writing-plans/SKILL.md');
assert.doesNotMatch(s,/一个任务超过 5 个实施步骤/);
assert.match(s,/普通行为票使用 TDD 五步/);
assert.match(policy('skills/writing-plans/SKILL.md'),/步骤 7：最终状态保存/);

});

test("S23 S24 就绪动作按实际包管理器和环境",()=>{

const s=raw('skills/using-git-worktrees/SKILL.md');
assert.match(s,/已有环境可用/);assert.match(s,/pyproject.toml 不等于必须 Poetry/);
assert.doesNotMatch(s,/\[ -f package\.json \]\s*&& npm install/);
assert.match(policy('skills/writing-plans/SKILL.md'),/已就绪不强制重装/);

});

test("S36 S37 模板的红来自业务断言而非符号缺失",()=>{

const s=policy('skills/writing-plans/SKILL.md');
assert.doesNotMatch(s,/预期：FAIL，报 "function not defined"/);
assert.match(s,/AssertionError：实际返回/);assert.match(s,/不算有效红/);

});
