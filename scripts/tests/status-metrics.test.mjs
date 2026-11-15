import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {collectStatus,renderStatus} from '../lib/status.mjs';
const entry=path.resolve('scripts/status.mjs'),scope=path.resolve('.worktrees/status-overview-qa');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},stdio:['ignore','pipe','pipe']}).trim();
const identity=['-c','user.name=Status Test','-c','user.email=status@example.invalid','-c','core.hooksPath=/dev/null'];
async function fixture(fn){
 await fs.mkdir(scope,{recursive:true});const dir=await fs.mkdtemp(path.join(scope,'metrics-'));
 try{const root=path.join(dir,'main');await fs.mkdir(root);git(root,'init','-q');git(root,...identity,'commit','--allow-empty','-qm','init');await fn(root);}
 finally{await fs.rm(dir,{recursive:true,force:true});}
}
async function write(root,file,content){const p=path.join(root,file);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,content);}
const commit=(root,date,message)=>{git(root,'add','-A');git(root,...identity,'commit','-qm',message,'--date',date);};
const SPEC='.spec-dev/F/spec/f-design.md',PLAN='.spec-dev/F/plan/f-plan.md';
const plan=box=>`### 任务 1：行为\n- [${box}] **步骤 1：写失败测试**\n`;
async function history(root){
 await write(root,SPEC,'# F 设计\n');commit(root,'2026-01-01T00:00:00+08:00','spec');
 await write(root,PLAN,plan(' '));commit(root,'2026-01-01T06:00:00+08:00','plan');
 await write(root,SPEC,'# F 设计\n\n修订\n');commit(root,'2026-01-02T00:00:00+08:00','spec rework');
 await write(root,PLAN,plan('x'));commit(root,'2026-01-04T06:00:00+08:00','T01');
}
test('默认不读提交历史，来源记录里没有 metrics',()=>fixture(async root=>{
 await history(root);const calls=[];
 const r=await collectStatus(root,{git:async(cwd,args)=>{calls.push(args);return git(cwd,...args)+(args.includes('-z')?'':'\n');}});
 assert.equal('metrics' in r.features[0].sources[0],false);
 assert.ok(calls.every(a=>a[0]==='rev-parse'||a.join(' ')==='worktree list --porcelain -z'));
 assert.doesNotMatch(renderStatus(r),/提交记录/);
}));
test('--metrics 给出 spec 与计划的提交时间，以及计划首次提交后 spec 的改动次数',()=>fixture(async root=>{
 await history(root);
 const r=await collectStatus(root,{},{metrics:true});
 assert.deepEqual(r.features[0].sources[0].metrics,{
  spec_first_commit_at:'2026-01-01T00:00:00+08:00',plan_first_commit_at:'2026-01-01T06:00:00+08:00',
  plan_last_commit_at:'2026-01-04T06:00:00+08:00',spec_commits_after_plan:1,
 });
 assert.deepEqual(r.diagnostics,[]);assert.equal(r.verification,'not_performed');
 const text=renderStatus(r);
 assert.match(text,/提交记录：spec 首次提交 2026-01-01T00:00:00\+08:00/);
 assert.match(text,/计划首次提交 2026-01-01T06:00:00\+08:00（相隔 6\.0 小时）/);
 assert.match(text,/计划最近提交 2026-01-04T06:00:00\+08:00（相隔 3\.0 天）/);
 assert.match(text,/计划首次提交后 spec 改动 1 次/);
}));
test('--metrics 遇到未提交的 spec 与计划时如实留空',()=>fixture(async root=>{
 await write(root,SPEC,'# F 设计\n');await write(root,PLAN,plan(' '));
 const r=await collectStatus(root,{},{metrics:true});
 assert.deepEqual(r.features[0].sources[0].metrics,{spec_first_commit_at:null,plan_first_commit_at:null,plan_last_commit_at:null,spec_commits_after_plan:null});
 assert.deepEqual(r.diagnostics,[]);assert.match(renderStatus(r),/提交记录：spec 未提交；计划未提交/);
}));
test('--metrics 读不到提交历史时标为读取失败，不影响进度记录',()=>fixture(async root=>{
 await history(root);
 const r=await collectStatus(root,{git:async(cwd,args)=>{if(args[0]==='log'||args[0]==='rev-list')throw new Error('history unavailable');return git(cwd,...args)+(args.includes('-z')?'':'\n');}},{metrics:true});
 const source=r.features[0].sources[0];
 assert.equal(source.metrics,null);assert.equal(source.plan.counts.checked,1);assert.deepEqual(r.diagnostics,[]);
 assert.match(renderStatus(r),/提交记录：读取失败/);
}));
test('命令行 --metrics 可与 --json 组合，重复给出时报参数错误',()=>fixture(async root=>{
 await history(root);
 const call=args=>spawnSync(process.execPath,[entry,...args],{cwd:root,encoding:'utf8',env:{...process.env,GIT_CEILING_DIRECTORIES:scope}});
 const json=call(['--json','--metrics']);assert.equal(json.status,0,json.stderr);
 assert.equal(JSON.parse(json.stdout).features[0].sources[0].metrics.spec_commits_after_plan,1);
 assert.match(call(['--metrics']).stdout,/计划首次提交后 spec 改动 1 次/);
 assert.equal(call(['--metrics','--metrics']).status,2);
 assert.match(call(['--help']).stdout,/--metrics/);
}));
