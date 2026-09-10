import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync,mkdirSync,mkdtempSync,writeFileSync,rmSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import path from 'node:path';
const entry=path.resolve('scripts/status.mjs'),scope=path.resolve('.worktrees/status-overview-qa');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(root,p,s)=>{const f=path.join(root,p);mkdirSync(path.dirname(f),{recursive:true});writeFileSync(f,s);};
function fixture(fn){mkdirSync(scope,{recursive:true});const dir=mkdtempSync(path.join(scope,'cli-'));try{const root=path.join(dir,'main');mkdirSync(root);git(root,'init','-q');git(root,'-c','user.name=Status Test','-c','user.email=status@example.invalid','-c','core.hooksPath=/dev/null','commit','--allow-empty','-qm','init');return fn(root,dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function call(root,args=['--json']){const p=spawnSync(process.execPath,[entry,...args],{cwd:root,encoding:'utf8',env:{...process.env,GIT_CEILING_DIRECTORIES:scope}});return {exit:p.status,out:p.stdout,err:p.stderr,data:p.stdout.startsWith('{')?JSON.parse(p.stdout):null};}
function plan(root,opts={}){
 const ids=['T00','T01'];write(root,'.spec-dev/F/spec/f-design.md','---\nspec_dev:\n  status: active\n  feature: F\n---\n');
 write(root,'.spec-dev/F/plan/index.md','| 任务 | 依赖 | 消费接口 | 产出接口 |\n|---|---|---|---|\n| T00 a | — | a | b |\n| T01 b | T00 | a | b |');
 for(const id of ids)write(root,'.spec-dev/F/plan/tasks/'+id+'.md','task body must remain unread');
 write(root,'.spec-dev/F/plan/progress.yaml',JSON.stringify({format_version:1,current:null,tasks:{T00:{status:'completed'},T01:{status:'pending'}},resources:[],notes:[],...opts}));
}
function digest(root){const out={};function walk(p){for(const n of readdirSync(p)){const f=path.join(p,n),s=lstatSync(f);if(s.isDirectory())walk(f);else if(s.isFile())out[path.relative(root,f)]=createHash('sha256').update(readFileSync(f)).digest('hex');}}walk(root);return out;}
test('S01 从子目录或显式路径查询 / S19 输出等价',()=>fixture(root=>{
 plan(root);mkdirSync(path.join(root,'nested dir'));const j=call(path.join(root,'nested dir')),t=call(root,[]),explicit=call(root,['--repo',root,'--json']);
 assert.equal(j.exit,0);assert.equal(explicit.exit,0);assert.equal(j.data.repository.worktree,root);assert.equal(t.exit,0);assert.match(t.out,/已完成记录 1\/2/);assert.match(t.out,/未重新验收/);assert.ok(t.out.includes(j.data.features[0].key));assert.ok(t.out.includes(root));
}));
test('S02 参数与非仓库错误',()=>fixture((root,dir)=>{
 for(const args of [['--unknown'],['--repo'],['--json','--json'],['--help','--json'],['--repo',dir]])assert.equal(call(root,args).exit,2);
 assert.equal(call(dir,['--help']).exit,0);
}));
test('S04 无法访问的已登记工作区 / S22 部分失败',()=>fixture((root,dir)=>{
 plan(root);const other=path.join(dir,'other');git(root,'worktree','add','-qb','other',other);renameSync(other,other+'-moved');const r=call(root);assert.equal(r.exit,1);assert.equal(r.data.features.length,1);assert.ok(r.data.worktrees.some(w=>w.path===other&&w.read_status==='error'));
}));
test('S09 v1 YAML读取 / S10 并发current / S21 blocked不是失败',()=>fixture(root=>{
 plan(root,{execution:{mode:'parallel'},tasks:{T00:{status:'in_progress'},T01:{status:'in_progress'}}});let r=call(root);assert.equal(r.exit,0);assert.ok(r.data.features.length>0);assert.equal(r.data.features[0].sources[0].plan.counts.in_progress,2);
 write(root,'.spec-dev/F/plan/progress.yaml','format_version: 1\ncurrent: null\ntasks:\n  T00: {status: completed}\n  T01: {status: blocked}\nresources: []\nnotes: []\n');r=call(root);assert.equal(r.exit,0);assert.ok(r.data.features.length>0);assert.equal(r.data.features[0].sources[0].plan.counts.blocked,1);
}));
test('S13 无法辨认的旧结构 / S14 缺失 / S15 错误版本',()=>fixture(root=>{
 write(root,'.spec-dev/Old/plan/a-plan.md','not a task');plan(root,{format_version:99});write(root,'.spec-dev/OnlyTasks/plan/tasks/T00.md','residue');
 const r=call(root);assert.equal(r.exit,1);assert.equal(r.data.features.length,3);for(const code of ['unsupported_version','unsupported_syntax','missing'])assert.ok(r.data.diagnostics.some(d=>d.code===code));
}));
test('S20 空仓库与稳定排序',()=>fixture(root=>{
 let r=call(root);assert.equal(r.exit,0);assert.deepEqual(r.data.features,[]);assert.match(call(root,[]).out,/未发现记录/);
 for(const f of ['中','a','B'])write(root,`.spec-dev/${f}/spec/f-design.md`,'---\nspec_dev:\n  status: draft\n---');
 const one=call(root).data,two=call(root).data;delete one.collected_at;delete two.collected_at;assert.deepEqual(one,two);assert.deepEqual(one.features.map(f=>f.key),['.spec-dev/B','.spec-dev/a','.spec-dev/中']);
}));
test('S23 查询前后文件、index、refs、配置不变',()=>fixture(root=>{
 plan(root,{tasks:{T00:{status:'completed',commit:'f'.repeat(40)},T01:{status:'completed',commit:'e'.repeat(40)}}});git(root,'add','.');git(root,'-c','user.name=Status Test','-c','user.email=status@example.invalid','-c','core.hooksPath=/dev/null','commit','-qm','records');write(root,'dirty.txt','untracked');
 const before=digest(root),r=call(root);assert.equal(r.exit,0);assert.equal(r.data.verification,'not_performed');assert.deepEqual(digest(root),before);
}));

test('S12/S13 旧任务区域结束后不消费附录复选框',()=>fixture(root=>{
 const file='.spec-dev/Old/plan/old-plan.md';
 for(const heading of ['## 后续候选','### 独立附录']){
  write(root,file,'### 任务 1：已完成\n#### 子步骤\n- [x] done\n'+heading+'\n- [ ] optional');
  let r=call(root);assert.equal(r.exit,0);assert.equal(r.data.features[0].sources[0].plan.counts.checked,1);assert.equal(r.data.features[0].sources[0].plan.tasks[0].total,1);
  write(root,file,'### 任务 1：没有步骤\n'+heading+'\n- [x] appendix');
  r=call(root);assert.equal(r.exit,1);assert.equal(r.data.features[0].sources[0].plan.counts,null);assert.equal(r.data.features[0].sources[0].plan.tasks[0].status,'unknown');
 }
}));

test('S20 BMP与补充平面路径按Unicode码点排序',()=>fixture(root=>{
 for(const name of ['Ａ','𠀀'])write(root,`.spec-dev/${name}/spec/f-design.md`,'---\nspec_dev:\n  status: draft\n---');
 const r=call(root);assert.equal(r.exit,0);assert.deepEqual(r.data.features.map(f=>f.key),['.spec-dev/Ａ','.spec-dev/𠀀']);
}));

test('S13/S26 解析失败明确区分未知与不存在',()=>fixture(root=>{
 plan(root);write(root,'.spec-dev/F/plan/progress.yaml','invalid : [ yaml');
 const json=call(root),text=call(root,[]);assert.equal(json.exit,1);assert.equal(text.exit,1);assert.equal(json.data.features[0].sources[0].plan.counts,null);
 assert.match(text.out,/未知不等于没有/);assert.match(text.out,/不能据空列表断言/);
}));
