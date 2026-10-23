import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');

test("S26 原探索报告 schema 不变",()=>{

const s=JSON.parse(raw('scripts/schemas/exploration-report.json'));
assert.deepEqual(s.required,['keyFiles','coverage_note']);
assert.equal(s.properties.keyFiles.maxItems,10);

});
