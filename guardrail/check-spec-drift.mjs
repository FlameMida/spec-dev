#!/usr/bin/env node
// Shared guard for worktree, index and per-commit history. Task associations fail closed.
import {execFileSync} from 'node:child_process';
import {readFileSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {parseFrontmatter,globMatch} from './lib/spec-data.mjs';
import {createGitView,ScopeViolation,taskAssociation} from './lib/git-view.mjs';
import {localReference,readBinding} from './lib/task-binding.mjs';
import {normalizeWrite} from './lib/write-paths.mjs';
const MODE=process.argv[2],TRAILER_RE=/^spec-guard:\s*(off|skip)\b/im;
let stdinCache=null,associated=false;
const raw=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const git=(repo,...args)=>raw(repo,...args).trim();
const files=(repo,...args)=>raw(repo,...args).split('\0').filter(Boolean);
function history(repo,...args){
  try{return raw(repo,...args);}catch(error){
    // A failed walk has not established that the unread commits are unbound.
    throw new ScopeViolation('cannot read required Git history: '+error.message);
  }
}
const blockedCode=()=>['--hook','--worktree'].includes(MODE)?2:1;
function readStdin(){if(stdinCache===null)stdinCache=process.stdin.isTTY?'':readFileSync(0,'utf8');return stdinCache;}
function stopHookActive(){try{return JSON.parse(readStdin()).stop_hook_active===true;}catch{return false;}}
function changedBetween(repo,before,after){
  if(!before)return files(repo,'diff-tree','--root','--no-commit-id','--name-only','--no-renames','-r','-z',after);
  return files(repo,'diff','--name-only','--no-renames','-z',before,after);
}
function dirty(repo){return [...new Set([...files(repo,'diff','HEAD','--name-only','--no-renames','-z'),...files(repo,'ls-files','--others','--exclude-standard','-z')])];}
function activeSpecs(view){
  const out=[];
  for(const file of view.entries().keys()){
    if(!/^(?:\.spec-dev\/|docs\/).*\-design\.md$|^\.specs\/.*\.md$/.test(file))continue;
    const meta=parseFrontmatter(view.readText(file)??'')?.spec_dev;if(!meta)continue;
    if(meta.status&&!['active','draft','superseded'].includes(meta.status))warn('spec '+file+': unknown status; spec is NOT guarded');
    if(meta.status!=='active')continue;
    const covers=Array.isArray(meta.covers)?meta.covers.filter(c=>typeof c==='string'&&c.trim()):[];
    if(!covers.length&&meta.coversSuspect)warn('spec '+file+': covers list could not be parsed; spec is NOT guarded');
    out.push({relPath:file,feature:meta.feature||file,covers,matches:f=>covers.some(g=>globMatch(g,f))});
  }return out;
}
function check(repo,changed,view,previous,reference,sync=[]){
  let binding=null;
  if(reference){
    associated=true;
    try{
      if(process.env.SPEC_DEV_GUARD==='off')throw new Error('task association conflicts with SPEC_DEV_GUARD=off');
      binding=readBinding(repo,reference,view);
      const baseline=createGitView(repo,'commit',binding.scope_commit);
      for(const file of [reference.plan,...binding.specs,...binding.writes]){
        const original=baseline.resolvePath(file);
        if(original!==file||view.resolvePath(file)!==original||(previous&&previous.resolvePath(file)!==original))throw new Error('path alias/rebinding: '+file);
      }
      for(const file of changed){
        if(!binding.writes.has(file))throw new Error('write outside task scope: '+file);
        if(view.resolvePath(file)!==file||(previous&&previous.resolvePath(file)!==file))throw new Error('changed path escape/rebinding: '+file);
      }
    }catch(error){throw new ScopeViolation(error.message);}
  }else if(process.env.SPEC_DEV_GUARD==='off'){warn('SPEC_DEV_GUARD=off — legacy check waived');return [];}
  const touched=new Set([...changed,...sync]),violations=[];
  // Old owners also guard deletions and covers changes in the candidate view.
  for(const spec of [...activeSpecs(view),...(previous?activeSpecs(previous):[])]){
    const hit=changed.filter(file=>file!==spec.relPath&&spec.matches(file));
    if(hit.length&&!touched.has(spec.relPath)){
      const allowed=binding&&binding.specs.includes(spec.relPath)&&hit.every(file=>binding.writes.has(file));
      if(!allowed&&!violations.some(v=>v.spec===spec.relPath&&JSON.stringify(v.code)===JSON.stringify(hit)))violations.push({spec:spec.relPath,feature:spec.feature,code:hit});
    }
  }return violations;
}
function commitChecks(repo,commit,ref,body){
  const reference=taskAssociation(repo,body);
  if(reference)associated=true;
  if(TRAILER_RE.test(body)){
    if(reference)throw new ScopeViolation('Spec-Task conflicts with Spec-Guard waiver: '+commit);
    warn('Spec-Guard: off — legacy commit waived '+commit);return [];
  }
  const view=createGitView(repo,'commit',commit),parents=history(repo,'rev-list','--parents','-n','1',commit).trim().split(' ').slice(1),result=[];
  for(const parent of parents.length?parents:[null]){
    const violations=check(repo,changedBetween(repo,parent,commit),view,parent?createGitView(repo,'commit',parent):null,reference);
    if(violations.length)result.push({commit,ref,violations});
  }return result;
}
function historyChecks(repo,batches){
  const messages=batches.flatMap(({commits,ref})=>commits.map(commit=>({commit,ref,body:history(repo,'show','-s','--format=%B',commit)})));
  // Earlier unbound spec commits can supply objects needed by a later task.
  // Establish the range's associations before any tree/blob/diff read can fail.
  if(messages.some(({body})=>/^Spec-Task:/im.test(body)))associated=true;
  return messages.flatMap(({commit,ref,body})=>commitChecks(repo,commit,ref,body));
}
function rangeChecks(repo,range,ref=range){
  if(!range||!range.includes('..')||range.includes('...'))throw new ScopeViolation('expected A..B range');
  const commits=history(repo,'rev-list','--reverse',range).trim().split('\n').filter(Boolean);
  return historyChecks(repo,[{commits,ref}]);
}
function pushChecks(repo){
  const batches=[];
  for(const line of readStdin().split('\n').filter(l=>l.trim())){
    const [localRef,localSha,remoteRef,remoteSha]=line.trim().split(/\s+/);if(!localSha||/^0+$/.test(localSha))continue;
    if(!/^[a-f0-9]{40,64}$/.test(localSha)||!/^[a-f0-9]{40,64}$/.test(remoteSha??''))throw new ScopeViolation('invalid push input');
    // A new ref has no trustworthy remote boundary. Check all reachable commits.
    const range=/^0+$/.test(remoteSha)?localSha:remoteSha+'..'+localSha;
    batches.push({commits:history(repo,'rev-list','--reverse',range).trim().split('\n').filter(Boolean),ref:remoteRef||localRef});
  }
  return historyChecks(repo,batches);
}
try{
  if(!['--staged','--range','--push','--files','--hook','--worktree'].includes(MODE))usage();
  const repo=realpathSync(git(process.cwd(),'rev-parse','--show-toplevel'));let violations=[];
  if(MODE==='--range'||MODE==='--push'){
    const records=MODE==='--range'?rangeChecks(repo,process.argv[3]):pushChecks(repo);
    for(const record of records){process.stderr.write(JSON.stringify(record)+'\n');violations.push(...record.violations);}
  }else{
    let reference;try{reference=localReference(repo);}catch(error){throw new ScopeViolation(error.message);}
    associated=reference!==null;
    const view=createGitView(repo,MODE==='--staged'?'index':'worktree'),previous=createGitView(repo,'commit','HEAD');let changed;
    if(MODE==='--staged')changed=files(repo,'diff','--cached','--name-only','--no-renames','-z');
    else if(MODE==='--worktree')changed=dirty(repo);
    else{
      const input=MODE==='--hook'?extractHookFiles(readStdin()):process.argv.slice(3);
      changed=input.flatMap(file=>{
        const relative=path.relative(repo,path.resolve(process.cwd(),file)).split(path.sep).join('/');
        try{return [normalizeWrite(relative,{allowSpecDev:true})];}catch(error){if(reference)throw new ScopeViolation(error.message);return [];}
      });
    }
    violations=check(repo,changed,view,previous,reference,MODE==='--hook'?dirty(repo):[]);
  }
  if(violations.length){
    if(!associated&&MODE==='--worktree'&&stopHookActive()){warn('工作区仍存在 spec 漂移，本回合不再重复阻断。');process.exit(0);}
    report(violations);process.exit(blockedCode());
  }
}catch(error){
  if(error instanceof ScopeViolation||associated){process.stderr.write('[spec-dev scope] '+error.message+'\n');process.exit(blockedCode());}
  warn('漂移守卫执行异常，已放行（请检查守卫脚本）：'+error.message);
}
function extractHookFiles(raw) {
  if (!raw.trim()) return [];
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const out = new Set();
  const KEYS = ["file_path", "filePath", "path", "notebook_path", "target_file"];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    for (const [k, v] of Object.entries(node)) {
      if (KEYS.includes(k) && typeof v === "string") out.add(v);
      else walk(v);
    }
  };
  walk(json);
  return [...out];
}


function report(violations) {
  const R = (s) => `\x1b[31m${s}\x1b[0m`;
  const B = (s) => `\x1b[1m${s}\x1b[0m`;
  const lines = [];
  lines.push(R(B("✗ spec-dev drift guard: code covered by an active spec changed without syncing the spec. / spec-dev 漂移守卫：改动了 active spec 覆盖的代码，但对应 spec 未同步。")));
  lines.push("");
  for (const v of violations) {
    lines.push(`  ${B("Feature / 特性")} ${v.feature}  —  spec: ${v.spec}`);
    for (const f of v.code) lines.push(`    · ${f}`);
    lines.push("");
  }
  lines.push(B("How to resolve / 如何解除："));
  lines.push(`  1) Update the owning spec (requirements / acceptance matrix) and include it in this change. / 同步更新对应 spec（行为规范/验收矩阵），并把它一并纳入本次变更；`);
  lines.push(
    `  2) If this change truly does not affect the spec's behavior contract, leave a ${B("Spec-Guard: off <reason>")} trailer in the commit message (range checks pass it), or set ${B("SPEC_DEV_GUARD=off")} temporarily. / 若本次改动确不影响该 spec 的行为契约，在提交信息留该 trailer（区间检查会放行），或临时设该环境变量；`,
  );
  lines.push(`  3) If the spec is obsolete, set its frontmatter ${B("status")} to superseded AND fill ${B("superseded_by")} with the successor spec path (repo-root-relative; write a lightweight REMOVED-only successor spec if the feature is simply deleted). / 该 spec 已作废时，把其 frontmatter 的 status 改为 superseded 并同时填写 superseded_by 指向后继 spec（仓库根相对路径；特性纯删除时先写一份仅含 REMOVED 的轻量后继 spec）。`);
  lines.push("");
  lines.push(`  This applies without the spec-dev plugin too: artifacts live in .spec-dev/<date-feature>/; changing code means syncing the sibling spec. / 未安装 spec-dev 插件也应遵守：产物在 .spec-dev/<日期-特性>/，改代码即需同步同目录 spec。`);
  process.stderr.write(lines.join("\n") + "\n");
}

function usage() {
  process.stderr.write(
    "Usage / 用法: check-spec-drift.mjs --staged | --range <A>..<B> | --push | --files <f…> | --hook | --worktree\n",
  );
  process.exit(2);
}

function warn(msg) {
  process.stderr.write(`\x1b[33m[spec-dev guard] ${msg}\x1b[0m\n`);
}
