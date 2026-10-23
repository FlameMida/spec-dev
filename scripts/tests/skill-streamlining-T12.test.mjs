import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');

test("S42 全部场景有唯一对应资料",()=>{

const data=JSON.parse(raw('scripts/tests/fixtures/skill-instruction-streamlining-cases.json'));
assert.deepEqual(data.cases.map(c=>c.id),Array.from({length:43},(_,i)=>'S'+String(i+1).padStart(2,'0')));
assert.deepEqual(data.cases.filter(c=>c.lane==='PR-smoke').map(c=>c.id),['S03','S15','S31','S32','S38','S39']);
for(const c of data.cases) assert.ok(c.given&&c.when&&c.then);

});
