import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S11 分诊入口不内嵌生命周期和整幅重复流程图",()=>{

const s=raw('skills/requirement-analysis/SKILL.md');
assert.match(s,/references\/spec-lifecycle\.md/);
assert.match(s,/references\/spec-review\.md/);
assert.doesNotMatch(s,/digraph requirement_analysis/);
assert.doesNotMatch(s,/Accepted 后正文不可变/);

});

test("S12 生命周期与批准门由入口完整取得",()=>{

const s=policy('skills/requirement-analysis/SKILL.md');
assert.match(s,/Accepted 后正文不可变/);
assert.match(s,/落盘前重扫/);
assert.match(s,/Superseded-pending/);
assert.match(s,/开始编写实施计划/);
assert.match(s,/普通实施|完整设计|批准/);

});

test("S42 文档位置保存和 ADR 只有统一权威",()=>{

const s=policy('skills/requirement-analysis/SKILL.md');
assert.match(s,/所有技能，包括独立 DDD 与被调用 DDD/);
assert.match(s,/术语已讨论清楚本身不是文件写入授权/);
assert.match(s,/同范围既有明确授权直接复用/);
assert.match(s,/难以逆转/);assert.match(s,/Accepted 后正文不可变/);

});
