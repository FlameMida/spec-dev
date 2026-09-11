import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S13 无编辑守卫仍必须五条 glob 反查",()=>{

const s=raw('skills/quick-fix/SKILL.md');
assert.match(s,/未安装守卫也执行/);
const d=raw('skills/quick-fix/references/spec-discovery.md');
assert.match(d,/五条 glob/);assert.match(d,/superseded_by/);assert.match(d,/\.specs/);

});

test("S14 命中守卫在首次动作前取得完整机制",()=>{

assert.match(raw('skills/quick-fix/SKILL.md'),/首次相关动作前取得全文/);
const s=raw('skills/quick-fix/references/guardrail-handling.md');
assert.match(s,/SPEC_DEV_GUARD=off/);assert.match(s,/Spec-Guard: off/);
assert.match(s,/不静默绕过、不伪造 spec 同步/);

});

test("S31 恢复既定行为不固定问契约事实",()=>{

const s=raw('skills/quick-fix/SKILL.md');
assert.doesNotMatch(s,/这题机器判不了，必须问人|依据步骤 3 第 3 问的答案/);
assert.match(s,/仅恢复既定行为时直接使用/);

});

test("S32 冲突和新语义仍保留裁决 S33 无 spec 不制造问题",()=>{

const s=policy('skills/quick-fix/SKILL.md');
assert.match(s,/事实判断不授权新行为或守卫放行/);
assert.match(s,/未知、冲突和证据不足/);
assert.match(s,/未命中适用 spec 如实说明/);
assert.match(s,/spec 增量提交前给用户过目/);

});
