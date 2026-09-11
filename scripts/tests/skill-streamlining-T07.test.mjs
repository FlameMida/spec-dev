import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S38 独立 DDD 与被调用 DDD 采用同一文档规范",()=>{

const s=raw('skills/ddd-lifecycle/SKILL.md');
assert.match(s,/独立与被调用完全统一/);
assert.match(s,/\.spec-dev\/glossary\.md/);assert.match(s,/\.spec-dev\/adr\//);
assert.match(s,/document-conventions\.md/);
const m=raw('skills/ddd-lifecycle/references/modeling/SKILL.md');
assert.match(m,/apply identically/);assert.doesNotMatch(m,/update .CONTEXT.md. right there/);

});

test("S39 术语明确不是自动保存许可",()=>{

const s=raw('skills/ddd-lifecycle/references/modeling/SKILL.md');
assert.match(s,/resolved term alone does not authorize a write/);
assert.match(s,/Reuse an existing same-scope authorization/);

});

test("S40 领域与局部术语不双写 S41 旧文件不自动迁移",()=>{

const s=raw('skills/ddd-lifecycle/SKILL.md');
assert.match(s,/同名不同义以适用域区分/);assert.match(s,/没有适用 spec 时先留候选/);
assert.match(s,/不自动搬移、删除或双写/);
assert.match(raw('skills/ddd-lifecycle/references/ATTRIBUTION.md'),/已适配文件/);

});
