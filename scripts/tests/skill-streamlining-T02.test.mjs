import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S15 内部入口不强制加载全部外部专题",()=>{

for(const f of ['skills/requirement-analysis/SKILL.md','skills/exploring/SKILL.md']){
 assert.match(raw(f),/共享入口/);
 assert.doesNotMatch(raw(f),/先收到各自内容，再(?:开始项目材料读取|读取项目材料)/);
}

});

test("S16 外部研究与恢复在动作前取得完整权威",()=>{

const s=policy('skills/requirement-analysis/SKILL.md');
assert.match(s,/外部研究在读取材料前取得/);
assert.match(s,/派发、接管或恢复代理前取得/);
assert.match(s,/新 worker/);

});

test("S19 容量分批且未启动不算完成",()=>{

const s=raw('skills/requirement-analysis/references/exploration-patterns.md');
assert.match(s,/平台容量/);assert.match(s,/分批/);assert.match(s,/未启动/);
assert.doesNotMatch(s,/必须在单个响应中发起所有并行任务|分批发起会退化为串行等待/);

});

test("S20 输入独立时尽早启动而非立即逐个等待",()=>{

const s=raw('skills/requirement-analysis/SKILL.md');
assert.match(s,/不要无故逐个启动后立即等待/);
assert.doesNotMatch(s,/必须在单条消息中一次性发起全部子代理/);

});
