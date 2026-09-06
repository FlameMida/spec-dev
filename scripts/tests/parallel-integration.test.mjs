import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, renameSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { verifyResult } from "../lib/parallel-plan.mjs";
function fixture(fn) {
  const dir=mkdtempSync(path.join(tmpdir(),"parallel-git-"));
  const repo=path.join(dir,"repo"); mkdirSync(repo);
  const git=(...args)=>execFileSync("git",["-C",repo,...args],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
  const put=(file,text)=>writeFileSync(path.join(repo,file),text);
  const commit=()=>{git("add","--all");git("commit","-m","fixture");return git("rev-parse","HEAD");};
  try {
    git("init","-b","main");git("config","user.name","Fixture");git("config","user.email","fixture@example.invalid");git("config","core.hooksPath",path.join(dir,"no-hooks"));
    put("allowed.mjs","export const value=0;\n");put("outside.mjs","export const value=0;\n");commit();
    const base=git("rev-parse","HEAD");git("switch","-c","ticket/c1");
    const claim={task_id:"T01",key:"c1",worktree:repo,branch:"ticket/c1",base_commit:base};
    const red=path.join(dir,"red.log"),green=path.join(dir,"green.log");
    writeFileSync(red,"controlled red fixture\n");writeFileSync(green,"controlled green fixture\n");
    const report=()=>({task_id:"T01",claim_key:"c1",status:"ready",worktree:repo,branch:"ticket/c1",base_commit:base,commits:git("rev-list","--reverse",`${base}..HEAD`).split("\n").filter(Boolean),changed_files:git("diff","--name-only","--no-renames",base,"HEAD").split("\n").filter(Boolean),tests:[{command:"fixture",phase:"red",exit_code:1,evidence_path:red},{command:"fixture",phase:"green",exit_code:0,evidence_path:green}],self_check:{over_under_building:"pass",contract_alignment:"pass"},deviations:[],resources:[],blockers:[],coverage_note:"validator fixture only"});
    fn({dir,repo,git,put,commit,claim,report});
  } finally {rmSync(dir,{recursive:true,force:true});}
}
test("S14 红绿与自检证据齐全：真实提交和持久证据",()=>fixture(({put,commit,claim,report})=>{
  put("allowed.mjs","export const value=1;\n");commit();
  assert.deepEqual(verifyResult(report(),claim,["allowed.mjs"]),[]);
  const missing=report();missing.tests[1].evidence_path+=".missing";
  assert.match(verifyResult(missing,claim,["allowed.mjs"]).join("\n"),/durable/);
}));
test("S10 路径越界结果拒收：净差异与中间提交",()=>fixture(({put,commit,claim,report})=>{
  put("outside.mjs","changed\n");commit();
  assert.match(verifyResult(report(),claim,["allowed.mjs"]).join("\n"),/outside write set/);
  put("outside.mjs","export const value=0;\n");put("allowed.mjs","changed\n");commit();
  assert.match(verifyResult(report(),claim,["allowed.mjs"]).join("\n"),/commit outside write set/);
}));
test("S10 路径越界结果拒收：rename 两端",()=>fixture(({repo,commit,claim,report})=>{
  renameSync(path.join(repo,"outside.mjs"),path.join(repo,"new.mjs"));commit();
  assert.match(verifyResult(report(),claim,["new.mjs"]).join("\n"),/outside.mjs/);
}));
test("S12 旧结果重复回报：不能更新新 claim",()=>fixture(({put,commit,claim,report})=>{
  put("allowed.mjs","changed\n");commit();
  assert.match(verifyResult(report(),{...claim,key:"c2"},["allowed.mjs"]).join("\n"),/claim mismatch/);
}));
test("S13 基线错误先停：真实分支和未跟踪文件",()=>fixture(({put,commit,claim,report})=>{
  put("allowed.mjs","changed\n");commit();
  assert.match(verifyResult(report(),{...claim,branch:"wrong"},["allowed.mjs"]).join("\n"),/branch mismatch/);
  const good=report();put("untracked.mjs","x\n");
  assert.match(verifyResult(good,claim,["allowed.mjs"]).join("\n"),/dirty/);
}));

test("S10 未声明符号链接不能借目标文件权限",()=>fixture(({repo,commit,claim,report})=>{
  symlinkSync("allowed.mjs",path.join(repo,"alias.mjs"));commit();
  assert.match(verifyResult(report(),claim,["allowed.mjs"]).join("\n"),/outside write set/);
}));
test("S10 声明链接不能夹带重绑定目标的改动",()=>fixture(({repo,git,put,commit,claim,report})=>{
  symlinkSync("allowed.mjs",path.join(repo,"alias.mjs"));commit();
  claim.base_commit=git("rev-parse","HEAD");
  rmSync(path.join(repo,"alias.mjs"));symlinkSync("outside.mjs",path.join(repo,"alias.mjs"));
  put("outside.mjs","changed\n");const tip=commit();
  const result={...report(),base_commit:claim.base_commit,commits:[tip],changed_files:["alias.mjs","outside.mjs"]};
  assert.match(verifyResult(result,claim,["alias.mjs"]).join("\n"),/outside write set/);
}));

test("S10 中间提交链接重绑定不能被最终恢复掩盖",()=>fixture(({repo,git,commit,claim,report})=>{
  symlinkSync("allowed.mjs",path.join(repo,"alias.mjs"));commit();
  claim.base_commit=git("rev-parse","HEAD");
  rmSync(path.join(repo,"alias.mjs"));symlinkSync("outside.mjs",path.join(repo,"alias.mjs"));const first=commit();
  rmSync(path.join(repo,"alias.mjs"));symlinkSync("allowed.mjs",path.join(repo,"alias.mjs"));const last=commit();
  const result={...report(),base_commit:claim.base_commit,commits:[first,last],changed_files:[]};
  assert.match(verifyResult(result,claim,["alias.mjs"]).join("\n"),/write path rebound/);
}));
