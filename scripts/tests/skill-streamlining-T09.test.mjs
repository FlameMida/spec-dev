import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S25 窄子题不强制八部分报告",()=>{

const s=raw('agents/code-explorer.md');
assert.doesNotMatch(s,/你的分析报告必须包含：/);
assert.match(s,/先直接回答有界子题/);
assert.match(s,/覆盖缺口/);

});

test("S26 原探索报告 schema 不变",()=>{

const s=JSON.parse(raw('scripts/schemas/exploration-report.json'));
assert.deepEqual(s.required,['keyFiles','coverage_note']);
assert.equal(s.properties.keyFiles.maxItems,10);
assert.match(raw('agents/code-explorer.md'),/JSON 契约模式继续遵循/);

});
