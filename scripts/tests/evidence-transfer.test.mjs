import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,symlinkSync,rmSync,chmodSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
import {createHash} from 'node:crypto';
import {evidence} from './helpers/group-fixture.mjs';
import {transferEvidence} from '../lib/execution-evidence.mjs';
const cli='scripts/execution-evidence.mjs';
function setup(t){
  const f=workflowFixture(t),source=path.join(f.root,f.feature),target=path.join(f.root,'archive',f.feature);mkdirSync(target,{recursive:true});
  const make=(attempt,script)=>{const r=f.run(cli,['record','--feature',source,'--task','T01','--phase','green','--attempt',attempt,'--',process.execPath,'-e',script]);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout).record;};
  const record=make('a1','console.log(7)');return {...f,source,target,record,make,transfer:()=>f.run(cli,['transfer','--source',source,'--target',target])};
}
test('S21 a registered execution root includes all owned raw originals',t=>{
 const f=setup(t),file='execution/native/note.txt';f.put(f.feature+'/'+file,'owned raw evidence\n');
 f.state.resources.push('evidence: '+f.feature+'/execution/ —— retain complete owned originals');f.save();
 const r=f.transfer();assert.equal(r.status,0,r.stdout+r.stderr);
 assert.deepEqual(readFileSync(path.join(f.target,file)),readFileSync(path.join(f.source,file)));
 assert.deepEqual(readFileSync(path.join(f.target,f.record)),readFileSync(path.join(f.source,f.record)));
});
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
  assert.equal(r.status,1,r.stdout+r.stderr);const result=JSON.parse(r.stdout);assert.ok(result.files.length>0);assert.equal(result.staging,null);
  assert.deepEqual(readdirSync(path.join(f.target,'execution')).filter(n=>n.startsWith('.transfer-')),[]);
  assert.ok(existsSync(path.join(f.source,f.record)));const retry=f.transfer();assert.equal(retry.status,0,retry.stdout+retry.stderr);
  assert.deepEqual(readFileSync(path.join(f.target,f.record)),readFileSync(path.join(f.source,f.record)));
});

test('S21 scoped transfer from a new worktree does not require other tickets ignored evidence',t=>{
 const f=setup(t),prior='execution/accepted-T00/result.json';
 f.put(f.feature+'/'+prior,'old accepted evidence');f.state.tasks.T00.result_path=prior;f.save();
 const child=path.join(f.outer,'ticket');f.git('worktree','add','-b','ticket/T01',child,'HEAD');
 const source=path.join(child,f.feature),own='execution/tasks/T01/a1/raw.log';
 mkdirSync(path.dirname(path.join(source,own)),{recursive:true});writeFileSync(path.join(source,own),'ticket evidence');
 const full=transferEvidence({source,target:f.target});
 assert.equal(full.ok,false);assert.equal(full.error,'evidence: missing source evidence: '+prior);
 assert.equal(readFileSync(path.join(source,own),'utf8'),'ticket evidence');
 const scoped=transferEvidence({source,target:f.target,scope:{task:'T01'}});
 assert.equal(scoped.ok,true,scoped.error);assert.deepEqual(scoped.files.map(x=>x.path),[own]);
 assert.equal(readFileSync(path.join(f.target,own),'utf8'),'ticket evidence');
});

test('S21 task scope selects its own attempts and group subtree without copying unrelated evidence',t=>{
 const f=setup(t);
 for(const p of ['execution/tasks/T02/other/raw.log','execution/groups/G01/T01/a/raw.log','execution/groups/G01/T02/a/raw.log','execution/native/shared/raw.log'])f.put(f.feature+'/'+p,p);
 f.state.resources.push('evidence: '+f.feature+'/execution/ —— whole feature');f.save();
 const r=transferEvidence({source:f.source,target:f.target,scope:{task:'T01'}});
 assert.equal(r.ok,true,r.error);assert.equal(r.files.length,4);
 assert.ok(existsSync(path.join(f.target,'execution/groups/G01/T01/a/raw.log')));
 for(const p of ['execution/tasks/T02','execution/groups/G01/T02','execution/native'])assert.equal(existsSync(path.join(f.target,p)),false);
});

test('S21 claim scope preserves the complete claim archive and skips other claims and task attempts',t=>{
 const f=setup(t),own='execution/claim-one';
 f.state.tasks.T01.claim={key:'claim-one'};f.state.tasks.T01.result_path=own+'/result.json';
 f.state.tasks.T01.evidence_paths=[own+'/failed.log'];
 f.state.tasks.T00.result_path='execution/claim-old/missing.json';
 for(const p of ['result.json','failed.log','attachments/raw.txt'])f.put(f.feature+'/'+own+'/'+p,p);
 f.state.resources.push('evidence: '+f.feature+'/'+own+'/ —— claim archive');f.save();
 const r=transferEvidence({source:f.source,target:f.target,scope:{claim:'claim-one'}});
 assert.equal(r.ok,true,r.error);assert.equal(r.files.length,3);assert.ok(r.files.every(x=>x.path.startsWith(own+'/')));
 assert.equal(existsSync(path.join(f.target,f.record)),false);
});

test('S22 scope never makes selected registered references optional',t=>{
 const f=setup(t),missing='execution/tasks/T01/missing/raw.log';
 f.state.tasks.T01.evidence_paths=[missing];f.save();
 const r=transferEvidence({source:f.source,target:f.target,scope:{task:'T01'}});
 assert.equal(r.ok,false);assert.equal(r.error,'evidence: missing source evidence: '+missing);
 assert.ok(existsSync(path.join(f.source,f.record)));assert.deepEqual(r.files,[]);
});

test('S22 invalid or empty scopes cannot fall back to whole-feature transfer',t=>{
 const f=setup(t);
 for(const scope of [{},{task:'T01',claim:'c1'},{task:'../T01'},{task:'T99'},{claim:'../escape'},{claim:'tasks'},{claim:'unknown'},{other:'T01'}]){
  const r=transferEvidence({source:f.source,target:f.target,scope});assert.equal(r.ok,false,JSON.stringify(scope));assert.match(r.error,/^evidence:/);assert.deepEqual(r.files,[]);
 }
});

test('S21 existing normalized claim keys remain valid in full and scoped transfers',t=>{
 const f=setup(t),key='claim-修复',file='execution/'+key+'/result.json';
 f.put(f.feature+'/'+file,'existing claim');f.state.tasks.T01.claim={key};f.state.tasks.T01.result_path=file;f.save();
 for(const scope of [undefined,{claim:key}]){
  const r=transferEvidence({source:f.source,target:f.target,scope});assert.equal(r.ok,true,r.error);
  assert.ok(r.files.some(x=>x.path===file));
 }
});
test('S21 registered review objects preserve inline outputs rather than treating them as paths',t=>{
 const f=setup(t),receipt=JSON.parse(readFileSync(path.join(f.source,f.record)));
 const artifact={kind:'test',stdout:readFileSync(path.join(f.source,receipt.stdout),'utf8'),stderr:readFileSync(path.join(f.source,receipt.stderr),'utf8'),stdout_sha256:receipt.stdout_sha256,stderr_sha256:receipt.stderr_sha256};
 const rel='execution/review-archive/object.json';f.put(f.feature+'/'+rel,JSON.stringify(artifact));f.state.resources.push('evidence: '+f.feature+'/execution/review-archive —— retain sealed review objects');f.save();
 const r=f.transfer();assert.equal(r.status,0,r.stdout+r.stderr);assert.deepEqual(readFileSync(path.join(f.target,rel)),readFileSync(path.join(f.source,rel)));
});
for(const style of ['document-relative','repository-relative'])test('S21 registered native '+style+' command records remain raw artifacts',t=>{
 const f=setup(t),dir='execution/native-review',record=dir+'/command.json';
 const raw='actual native review output\n',relative=dir+'/stdout.log';f.put(f.feature+'/'+relative,raw);
 const artifact={command:['node','review-repro.mjs'],cwd:f.root,exit_code:0,stdout:style==='document-relative'?'stdout.log':f.feature+'/'+relative,stdout_sha256:createHash('sha256').update(raw).digest('hex')};
 f.put(f.feature+'/'+record,JSON.stringify(artifact));f.state.resources.push('evidence: '+f.feature+'/'+dir+' —— retain complete native review originals');f.save();
 const r=f.transfer();assert.equal(r.status,0,r.stdout+r.stderr);
 for(const file of [record,relative])assert.deepEqual(readFileSync(path.join(f.target,file)),readFileSync(path.join(f.source,file)));
});
