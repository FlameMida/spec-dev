import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,symlinkSync,rmSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
import {evidence} from './helpers/group-fixture.mjs';
const cli='scripts/execution-evidence.mjs';
function setup(t){
  const f=workflowFixture(t),source=path.join(f.root,f.feature),target=path.join(f.root,'archive',f.feature);mkdirSync(target,{recursive:true});
  const make=(attempt,script)=>{const r=f.run(cli,['record','--feature',source,'--task','T01','--phase','green','--attempt',attempt,'--',process.execPath,'-e',script]);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout).record;};
  const record=make('a1','console.log(7)');return {...f,source,target,record,make,transfer:()=>f.run(cli,['transfer','--source',source,'--target',target])};
}
test('S21 transfer preserves ignored bytes and original cwd',t=>{
  const f=setup(t),before=readFileSync(path.join(f.source,f.record)),head=f.git('rev-parse','HEAD'),r=f.transfer();assert.equal(r.status,0,r.stderr);
  assert.deepEqual(readFileSync(path.join(f.target,f.record)),before);assert.equal(JSON.parse(before).cwd,f.root);assert.equal(f.git('rev-parse','HEAD'),head);
  assert.equal(JSON.parse(r.stdout).files.length,3);assert.ok(existsSync(path.join(f.source,f.record)));
});
test('S21 matching retries are idempotent and retain historical failed attempts',t=>{
  const f=setup(t),failed=f.make('failure','console.error("actual failure");process.exit(7)');assert.equal(f.transfer().status,0);assert.equal(f.transfer().status,0);
  assert.equal(JSON.parse(readFileSync(path.join(f.target,failed))).exit_code,7);assert.deepEqual(readFileSync(path.join(f.target,failed)),readFileSync(path.join(f.source,failed)));
});
test('S22 conflicts reject before publication and preserve both copies',t=>{
  const f=setup(t),target=path.join(f.target,f.record);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,'existing owner');
  assert.equal(f.transfer().status,1);assert.equal(readFileSync(target,'utf8'),'existing owner');assert.ok(existsSync(path.join(f.source,f.record)));assert.ok(!existsSync(path.join(f.target,path.dirname(f.record),'stdout.log')));
});
test('S22 source corruption cannot be transferred as verified evidence',t=>{
  const f=setup(t),r=JSON.parse(readFileSync(path.join(f.source,f.record)));writeFileSync(path.join(f.source,r.stdout),'tampered');assert.equal(f.transfer().status,1);assert.ok(!existsSync(path.join(f.target,f.record)));
});
test('S22 target path links and nested source copies are rejected',t=>{
  const f=setup(t),outside=path.join(f.outer,'outside');mkdirSync(outside);symlinkSync(outside,path.join(f.target,'execution'));assert.equal(f.transfer().status,1);
  const nested=path.join(f.source,'nested');mkdirSync(nested);
  for(const target of [f.source,nested])assert.equal(f.run(cli,['transfer','--source',f.source,'--target',target]).status,1);
});
test('S22 interrupted destination can resume from unchanged source',t=>{
  const f=setup(t);mkdirSync(path.join(f.target,'execution'));writeFileSync(path.join(f.target,'execution/tasks'),'interrupted destination');
  const r=f.transfer();assert.equal(r.status,1);assert.ok(existsSync(path.join(f.source,f.record)));
  rmSync(path.join(f.target,'execution/tasks'));const retry=f.transfer();assert.equal(retry.status,0,retry.stderr);assert.deepEqual(readFileSync(path.join(f.target,f.record)),readFileSync(path.join(f.source,f.record)));
});
test('S21 incomplete attempts and explicitly registered raw evidence remain available',t=>{
  const f=setup(t);const r=f.run(cli,['record','--feature',f.source,'--task','T01','--phase','red','--attempt','killed','--',process.execPath,'-e','process.kill(process.pid,"SIGTERM")']);assert.equal(r.status,1);
  f.put(f.feature+'/execution/manual/raw.log','raw manual evidence');f.state.resources.push('evidence: '+f.feature+'/execution/manual/ —— retain original');f.save();
  assert.equal(f.transfer().status,0);assert.equal(readFileSync(path.join(f.target,'execution/manual/raw.log'),'utf8'),'raw manual evidence');assert.ok(existsSync(path.join(f.target,'execution/tasks/T01/killed/incomplete.json')));
});
test('S21 existing group receipt fields are copied without rewriting',t=>{
  const f=setup(t),record=evidence({wt:f.root,feature:f.feature},'T01',7,'old-failure');
  const bytes=readFileSync(path.join(f.source,record));assert.deepEqual(Object.keys(JSON.parse(bytes)).sort(),['command','cwd','exit_code','commit','tree','stdout','stderr','stdout_sha256','stderr_sha256'].sort());
  const r=f.transfer();assert.equal(r.status,0,r.stdout+r.stderr);assert.deepEqual(readFileSync(path.join(f.target,record)),bytes);
});
test('S22 publication failure returns completed files and can resume after permissions are restored',t=>{
  const f=setup(t);f.make('z-last','console.log("last")');const blocked=path.join(f.target,'execution/tasks/T01/z-last');mkdirSync(blocked,{recursive:true});chmodSync(blocked,0o555);
  let r;try{r=f.transfer();}finally{chmodSync(blocked,0o755);}
  assert.equal(r.status,1,r.stdout+r.stderr);const result=JSON.parse(r.stdout);assert.ok(result.files.length>0);assert.ok(result.staging&&existsSync(result.staging));
  assert.ok(existsSync(path.join(f.source,f.record)));const retry=f.transfer();assert.equal(retry.status,0,retry.stdout+retry.stderr);
  assert.deepEqual(readFileSync(path.join(f.target,f.record)),readFileSync(path.join(f.source,f.record)));
});
