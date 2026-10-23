import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecord,parseMeta,parseRoadmap,outsideFences} from '../lib/status-parse.mjs';
const yaml = `format_version: 1
current: null
tasks:
  T00: {status: completed, commit: 'abc', tests: pass}
resources:
  - "worktree: /tmp/a # literal"
notes: ['quoted, comma', "escaped\\nline"]
`;
test('S09 v1 YAML 和 JSON：格式及引号语义',()=>{
 const x=parseRecord(yaml);
 assert.deepEqual(JSON.parse(JSON.stringify(x)),{format_version:1,current:null,tasks:{T00:{status:'completed',commit:'abc',tests:'pass'}},resources:['worktree: /tmp/a # literal'],notes:['quoted, comma','escaped\nline']});
 assert.equal(parseRecord('{"format_version":1,"current":null}').current,null);
 assert.equal(parseRecord("note: don't treat [plain] as a flow collection").note,"don't treat [plain] as a flow collection");
});
test('S15 非法语法与未知协议：重复键/模板外语法',()=>{
 for(const x of ['a: 1\na: 2','{"a":1,"a":2}','a: &anchor value','a: |\n  body','a: [1,2','a:\n \tbad: 1'])
  assert.throws(()=>parseRecord(x));
});
test('S07 active spec 没有计划：生命周期独立',()=>{
 assert.equal(parseMeta('---\nspec_dev:\n  status: active\n  feature: F\n---\ntext','spec').status,'active');
});
test('S08 未知状态与缺失关联：保留状态到语义层',()=>{
 assert.equal(parseMeta('---\nspec_dev:\n  status: delivered\n---','spec').status,'delivered');
});
test('S12 旧任务与代码块中的复选框：围栏排除',()=>{
 const x='before\n````md\n### 任务 1\n- [x] fake\n```\n````\nafter';
 assert.equal(outsideFences(x),'before\nafter');
});
test('S07 Roadmap 行保留路径和原状态',()=>{
 const x='---\nspec_dev_roadmap:\n  version: 1\n  project: P\n  status: active\n---\n## 子项目\n| # | 子项目 | 范围 | 依赖 | 状态 | 特性目录 |\n|---|---|---|---|---|---|\n| 1 | F | a\\|b | — | pending | [.spec-dev/F/](../F/) |';
 const r=parseRoadmap(x);assert.equal(r.meta.project,'P');assert.equal(r.rows[0].scope,'a|b');assert.equal(r.rows[0].target,'../F/');assert.equal(r.rows[0].link,true);
});
