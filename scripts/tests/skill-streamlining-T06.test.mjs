import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S17 锁单点可被串行组直接定位",()=>{

const s=raw('skills/executing-plans/references/integration-groups.md');
assert.match(s,/executing-plans-parallel\/references\/feature-lock\.md/);
const lock=raw('skills/executing-plans-parallel/references/feature-lock.md');
assert.match(lock,/\.maintenance/);assert.match(lock,/实体标识/);assert.match(lock,/UTF-8/);

});

test("S18 并发入口保持未知阻塞并按路径读恢复",()=>{

const s=raw('skills/executing-plans-parallel/SKILL.md');
assert.match(s,/activation-recovery\.md/);assert.match(s,/result-integration\.md/);
assert.doesNotMatch(s,/mkdir\(L \+ "\.maintenance"\)/);
const full=policy('skills/executing-plans-parallel/SKILL.md');
assert.match(full,/不重复 merge/);assert.match(full,/未知则阻塞/);
assert.match(full,/原始审查基线|最初特性审查/);

});
