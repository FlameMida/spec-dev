import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {workflowFixture} from './helpers/workflow-fixture.mjs';
import {spawnSync} from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
test('S11 the declared F to A to D dependency uses the actual validator',t=>{
 const f=workflowFixture(t);f.scopes.acceptance_tasks=['T03'];f.setScopes(f.scopes);
 const text=readFileSync(path.join(f.root,f.plan),'utf8').replace('\n\n```json','\n| T04 | T03 | accepted | delivered |\n\n```json');
 f.put(f.plan,text);f.put(f.feature+'/plan/tasks/T04.md','# T04 delivery\n');
 const run=()=>f.run('scripts/validate-output.mjs',['plan-index',path.dirname(f.plan)]);
 const good=run();assert.equal(good.status,0,good.stdout+good.stderr);assert.equal(JSON.parse(good.stdout).scope_protocol_version,1);
 f.put(f.plan,text.replace('| T02 | T01 |','| T02 | T04 |'));assert.equal(run().status,1);
});
test('S23 the delivery template records actual Git bytes as parseable JSON',t=>{
 const f=workflowFixture(t),branch=f.git('branch','--show-current');f.git('checkout','-qb','delivery-template-source');f.put('src/app.mjs','export const value=9;\n');const source=f.commit();f.git('checkout',branch);
 const text=readFileSync(path.join(repoRoot,'skills/writing-plans/references/delivery-templates.md'),'utf8'),code=text.split('```python\n')[1].split('\n```')[0];
 const r=spawnSync('python3',['-',f.root,f.feature,source,'ff',JSON.stringify([['git','merge','--ff-only','delivery-template-source']]),'template'],{input:code,cwd:f.root,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);const result=JSON.parse(r.stdout),saved=JSON.parse(readFileSync(path.join(f.root,f.feature,result.record_path),'utf8'));
 assert.equal(saved.target_commit,f.git('rev-parse','HEAD'));assert.equal(saved.source_tip,source);assert.equal(saved.operations[0].exit_code,0);assert.ok(saved.operations[0].stdout_sha256);
});
