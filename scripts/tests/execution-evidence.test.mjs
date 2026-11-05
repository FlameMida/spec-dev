import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
const cli='scripts/execution-evidence.mjs';
const record=(f,attempt,script,extra=[])=>f.run(cli,['record','--feature',path.join(f.root,f.feature),'--task','T01','--phase','green','--attempt',attempt,...extra,'--',process.execPath,'-e',script]);
const verify=(f,recordPath)=>f.run(cli,['verify','--feature',path.join(f.root,f.feature),'--record',recordPath,'--candidate',f.git('rev-parse','HEAD')]);
test('S21 transfer CLI accepts one task or claim selector without weakening full transfer',t=>{
 const f=workflowFixture(t),source=path.join(f.root,f.feature),target=path.join(f.outer,'archive');mkdirSync(target);
 const own='execution/claim-one/result.json';f.put(f.feature+'/'+own,'claim bytes');
 f.state.tasks.T01.claim={key:'claim-one'};f.state.tasks.T01.result_path=own;
 f.state.tasks.T00.result_path='execution/old/missing.json';f.save();
 const args=['transfer','--source',source,'--target',target];
 assert.equal(f.run(cli,args).status,1);
 for(const extra of [['--task','T01'],['--claim','claim-one']]){
  const r=f.run(cli,[...args,...extra]);assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(JSON.parse(r.stdout).ok,true);assert.ok(existsSync(path.join(target,own)));
 }
 for(const extra of [['--task','T01','--claim','claim-one'],['--task'],['--claim','claim-one','--claim','claim-one']])assert.equal(f.run(cli,[...args,...extra]).status,2);
});
test('S15 record saves actual failure exit and preserves separate raw streams',t=>{
  const f=workflowFixture(t),head=f.git('rev-parse','HEAD'),r=record(f,'failure','process.stdout.write("out");process.stderr.write("err");process.exit(7)');
  assert.equal(r.status,0,r.stderr);const receipt=JSON.parse(r.stdout);assert.equal(receipt.exit_code,7);
  const v=verify(f,receipt.record);assert.equal(v.status,0,v.stderr);const data=JSON.parse(v.stdout);
  assert.equal(data.record.exit_code,7);assert.equal(data.record.commit,head);assert.equal(readFileSync(path.join(f.root,f.feature,data.files.stdout.path),'utf8'),'out');
  assert.equal(readFileSync(path.join(f.root,f.feature,data.files.stderr.path),'utf8'),'err');assert.equal(f.git('rev-parse','HEAD'),head);assert.equal(f.git('ls-files','--',f.feature+'/execution/'),'');
});
test('S15 attempt is unique and corrupted raw bytes fail verification',t=>{
  const f=workflowFixture(t),saved=JSON.parse(record(f,'unique','console.log(1)').stdout);
  assert.equal(record(f,'unique','console.log(2)').status,1);
  const r=JSON.parse(readFileSync(path.join(f.root,f.feature,saved.record)));writeFileSync(path.join(f.root,f.feature,r.stdout),'tampered');assert.equal(verify(f,saved.record).status,1);
});
test('S16 pure progress changes reuse actual evidence without rewriting it',t=>{
  const f=workflowFixture(t),saved=JSON.parse(record(f,'progress','console.log(1)').stdout),bytes=readFileSync(path.join(f.root,f.feature,saved.record));
  f.state.notes.push('resume');f.save();assert.equal(verify(f,saved.record).status,0);assert.deepEqual(readFileSync(path.join(f.root,f.feature,saved.record)),bytes);
});
for(const file of ['src/app.mjs','scripts/test.mjs','.spec-dev/fixture/spec/fixture-design.md'])test('S16 changed verification input invalidates evidence: '+file,t=>{
  const f=workflowFixture(t),saved=JSON.parse(record(f,'candidate','console.log(1)').stdout);
  f.put(file,'changed input\n');f.commit();const r=verify(f,saved.record);assert.equal(r.status,1,r.stdout+r.stderr);
});
test('S15 abnormal termination remains incomplete with raw output',t=>{
  const f=workflowFixture(t),r=record(f,'signal','process.stdout.write("before");process.kill(process.pid,"SIGTERM")');
  assert.equal(r.status,1,r.stdout+r.stderr);assert.equal(JSON.parse(r.stdout).record,null);
  const dir=path.join(f.root,f.feature,'execution/tasks/T01/signal'),incomplete=JSON.parse(readFileSync(path.join(dir,'incomplete.json')));
  assert.equal(incomplete.signal,'SIGTERM');assert.equal(incomplete.exit_code,null);assert.equal(readFileSync(path.join(dir,'stdout.log'),'utf8'),'before');
});
test('S15 unexpected command writes preserve an incomplete attempt, never a usable pass',t=>{
  const f=workflowFixture(t),r=record(f,'dirty','require("fs").writeFileSync("src/new.mjs","side effect")');assert.equal(r.status,1,r.stdout+r.stderr);assert.equal(JSON.parse(r.stdout).record,null);
});
test('S15 only the explicit generated acceptance report can be an output',t=>{
  const f=workflowFixture(t),output='acceptance/acceptance-report.md';
  const script=`require('fs').mkdirSync('${f.feature}/acceptance',{recursive:true});require('fs').writeFileSync('${f.feature}/${output}','actual generated report');`;
  const r=record(f,'report',script,['--output',output]);assert.equal(r.status,0,r.stdout+r.stderr);
  const saved=JSON.parse(r.stdout);f.commit('generated report');assert.equal(verify(f,saved.record).status,0);
  assert.equal(record(f,'bad-output','console.log(1)',['--output','spec/fixture-design.md']).status,1);
});
