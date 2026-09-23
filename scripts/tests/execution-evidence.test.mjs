import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fixture,git,projectRoot} from './helpers/group-fixture.mjs';
import {workflowFixture} from './helpers/workflow-fixture.mjs';
const cli='scripts/execution-evidence.mjs';
const record=(f,attempt,script,extra=[])=>f.run(cli,['record','--feature',path.join(f.root,f.feature),'--task','T01','--phase','green','--attempt',attempt,...extra,'--',process.execPath,'-e',script]);
const verify=(f,recordPath)=>f.run(cli,['verify','--feature',path.join(f.root,f.feature),'--record',recordPath,'--candidate',f.git('rev-parse','HEAD')]);
test('S21 original group recorder retains ignored evidence without staging it',()=>{
  const f=fixture();try{
    writeFileSync(path.join(f.wt,'.gitignore'),'.spec-dev/**/execution/\n');f.save('ignore evidence');
    const base=git(f.wt,'rev-parse','HEAD');f.state.tasks.T00.commit=base;f.state.integration.base_commit=base;f.state.integration.validated_commit=base;f.save('rebind baseline');
    const source=readFileSync(path.join(projectRoot,'skills/executing-plans/references/integration-groups.md'),'utf8').split('<!-- integration-group-reference:start -->\n```python\n')[1].split('\n```')[0];
    const code=`import sys,json,base64\nfrom pathlib import Path\nnamespace={}\nexec(base64.b64decode('${Buffer.from(source).toString('base64')}'),namespace)\nrepo,feature_key,validator=sys.argv[1:]\nwith namespace['held_lock'](repo,feature_key,'fixture-owner') as receipt:\n    receipt['validator']=str(Path(validator).resolve(strict=True))\n    state=json.loads((Path(repo)/feature_key/'plan/progress.yaml').read_text())\n    attempt='execution/groups/G01/T01/a1'\n    namespace['register_evidence'](receipt,state,attempt,'retain until delivery')\n    namespace['checkpoint'](receipt,state,'fixture resource')\n    commit=namespace['git'](repo,'rev-parse','HEAD').decode().strip()\n    record,code=namespace['record_check'](receipt,['python3','-c','print(7)'],attempt,commit)\n    assert code==0\n    assert not namespace['git'](repo,'ls-files','--',feature_key+'/execution/').strip()\n`;
    const r=spawnSync('python3',['-',f.wt,f.feature,path.join(projectRoot,'scripts/validate-output.mjs')],{input:code,encoding:'utf8'});
    const log=readFileSync(path.join(f.wt,f.feature,'execution/groups/G01/T01/a1/stdout.log'),'utf8');
    assert.equal(log,'7\n');assert.equal(r.status,0,r.stdout+r.stderr+'\noriginal stdout: '+log);
    assert.equal(git(f.wt,'ls-files','--',f.feature+'/execution/'),'');
  }finally{rmSync(f.outer,{recursive:true,force:true});}
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
