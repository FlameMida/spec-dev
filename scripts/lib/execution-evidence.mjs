import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync,lstatSync,readdirSync,linkSync,unlinkSync,rmSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {parseUniqueJson,parseRecord} from '../../guardrail/lib/record-data.mjs';
import {normalizeWrite} from '../../guardrail/lib/write-paths.mjs';
const need=(ok,message)=>{if(!ok)throw new Error('evidence: '+message);};
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40,64}$/.test(v);
const digest=v=>createHash('sha256').update(v).digest('hex');
const array=v=>Array.isArray(v)&&v.every(x=>typeof x==='string'&&x.length);
const git=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
function keys(value,required){need(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===required.length&&required.every(k=>Object.hasOwn(value,k)),'invalid record fields');}
export function evidenceContext(feature){
  need(typeof feature==='string'&&path.isAbsolute(feature),'absolute feature directory required');
  const absolute=path.resolve(feature),actual=realpathSync(absolute);need(absolute===actual,'feature path alias');
  const repo=realpathSync(git(actual,'rev-parse','--show-toplevel').trim()),relative=path.relative(repo,actual).split(path.sep).join('/');
  need(/^\.spec-dev\/[^/]+$/.test(relative),'feature must be directly under .spec-dev');
  return {feature:actual,repo,relative};
}
export function evidenceFile(feature,relative){
  need(normalizeWrite(relative)===relative&&relative.startsWith('execution/'),'canonical execution path required');
  const target=path.join(feature,relative);let probe=target;
  while(!existsSync(probe)){
    try{need(!lstatSync(probe).isSymbolicLink(),'broken evidence symlink');}catch(e){if(e.code!=='ENOENT')throw e;}
    const parent=path.dirname(probe);need(parent!==probe,'missing evidence root');probe=parent;
  }
  need(realpathSync(probe)===probe,'evidence path alias');return target;
}
function treeRows(repo,commit){
  need(sha(commit)&&git(repo,'rev-parse',commit+'^{commit}').trim()===commit,'existing full commit required');
  return git(repo,'ls-tree','-r','-z',commit).split('\0').filter(Boolean);
}
const fileOf=row=>row.slice(row.indexOf('\t')+1);
const excluded=(relative,scope,file)=>file===relative+'/plan/progress.yaml'||file.startsWith(relative+'/execution/')||(scope.outputs??[]).some(p=>file===relative+'/'+p);
export function businessTree(repo,relative,commit){return digest(treeRows(repo,commit).filter(row=>!excluded(relative,{outputs:[]},fileOf(row))).join('\0'));}
function normalizeScope(value={kind:'repository',outputs:[]}){
  keys(value,value.kind==='paths'?['kind','paths','outputs']:['kind','outputs']);
  need(['repository','paths'].includes(value.kind)&&Array.isArray(value.outputs),'invalid verification scope');
  need(value.outputs.length<=1&&value.outputs.every(p=>p==='acceptance/acceptance-report.md'),'only declared acceptance report output is allowed');
  if(value.kind==='paths'){
    need(array(value.paths)&&value.paths.length&&new Set(value.paths).size===value.paths.length,'exact verification paths required');
    for(const p of value.paths)need(normalizeWrite(p,{allowSpecDev:true})===p,'noncanonical scope path');
  }
  return structuredClone(value);
}
function scopeDigest(ctx,commit,scope){
  const rows=treeRows(ctx.repo,commit),selected=scope.kind==='repository'?rows.filter(row=>!excluded(ctx.relative,scope,fileOf(row))):scope.paths.slice().sort().map(file=>rows.find(row=>fileOf(row)===file)??'missing\t'+file);
  return digest(selected.join('\0'));
}
function dirtyBusiness(ctx,scope){
  const names=[...git(ctx.repo,'diff','HEAD','--name-only','--no-renames','-z').split('\0'),...git(ctx.repo,'ls-files','--others','--exclude-standard','-z').split('\0')];
  return [...new Set(names.filter(Boolean).filter(file=>!excluded(ctx.relative,scope,file)))];
}
export function recordExecution({feature,task,phase,attempt,argv,scope}){
  const ctx=evidenceContext(feature);scope=normalizeScope(scope);
  need(/^T\d\d$/.test(task)&&['baseline','red','green','final','integration'].includes(phase),'task and phase required');
  need(typeof attempt==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(attempt),'unique attempt name required');
  need(array(argv)&&argv.length,'command argv required');
  if(scope.kind==='paths')for(const output of scope.outputs)need(!scope.paths.includes(ctx.relative+'/'+output),'verification input cannot also be an output');
  need(!dirtyBusiness(ctx,scope).length,'commit business changes before recording');
  const commit=git(ctx.repo,'rev-parse','HEAD').trim(),tree=businessTree(ctx.repo,ctx.relative,commit),measured=scopeDigest(ctx,commit,scope);
  if(scope.kind==='paths')scope.digest=measured;
  const relative=`execution/tasks/${task}/${attempt}`,directory=evidenceFile(ctx.feature,relative);
  mkdirSync(path.dirname(directory),{recursive:true});mkdirSync(directory); // Never overwrite an attempt.
  const result=spawnSync(argv[0],argv.slice(1),{cwd:ctx.repo,encoding:null,maxBuffer:64*1024*1024});
  const record={version:1,task,phase,command:argv,cwd:ctx.repo,exit_code:result.status,commit,tree,scope};
  for(const [name,bytes] of [['stdout',result.stdout??Buffer.alloc(0)],['stderr',result.stderr??Buffer.alloc(0)]]){
    record[name]=relative+'/'+name+'.log';record[name+'_sha256']=digest(bytes);writeFileSync(evidenceFile(ctx.feature,record[name]),bytes,{flag:'wx'});
  }
  let error=result.error?.message??null;
  try{
    need(Number.isInteger(result.status)&&result.status>=0&&!result.signal,'process did not exit normally');
    need(!dirtyBusiness(ctx,scope).length,'check changed files outside its declared outputs');
    need(scopeDigest(ctx,git(ctx.repo,'rev-parse','HEAD').trim(),scope)===measured,'check changed committed verification inputs');
  }catch(e){error=e.message;}
  if(error){
    writeFileSync(path.join(directory,'incomplete.json'),JSON.stringify({...record,signal:result.signal,error},null,2)+'\n',{flag:'wx'});
    return {ok:false,record:null,exit_code:result.status,error,attempt:relative};
  }
  const recordPath=relative+'/record.json';writeFileSync(evidenceFile(ctx.feature,recordPath),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  return {ok:true,record:recordPath,exit_code:result.status};
}
export function verifyReceipt({feature,record:recordPath,candidate}){
  const ctx=evidenceContext(feature),record=parseUniqueJson(readFileSync(evidenceFile(ctx.feature,recordPath),'utf8'));
  keys(record,['version','task','phase','command','cwd','exit_code','commit','tree','scope','stdout','stderr','stdout_sha256','stderr_sha256']);
  need(record.version===1&&/^T\d\d$/.test(record.task)&&['baseline','red','green','final','integration'].includes(record.phase),'invalid receipt identity');
  need(recordPath.startsWith('execution/tasks/'+record.task+'/')&&path.posix.basename(recordPath)==='record.json','receipt attribution mismatch');
  need(array(record.command)&&record.command.length&&Number.isInteger(record.exit_code)&&record.exit_code>=0&&record.exit_code<=255,'invalid command or exit');
  need(typeof record.cwd==='string'&&path.isAbsolute(record.cwd)&&path.normalize(record.cwd)===record.cwd,'invalid historical cwd');
  const scope=structuredClone(record.scope);if(scope.kind==='paths')delete scope.digest;normalizeScope(scope);
  need(record.tree===businessTree(ctx.repo,ctx.relative,record.commit),'recorded business tree mismatch');
  const measured=scopeDigest(ctx,record.commit,scope);
  if(scope.kind==='paths')need(record.scope.digest===measured,'recorded scope digest mismatch');
  need(scopeDigest(ctx,candidate,scope)===measured,'candidate verification inputs changed');
  const files={};for(const name of ['stdout','stderr']){
    need(record[name]===path.posix.dirname(recordPath)+'/'+name+'.log','stream attribution mismatch');
    const actual=digest(readFileSync(evidenceFile(ctx.feature,record[name])));need(actual===record[name+'_sha256'],'stream hash mismatch');files[name]={path:record[name],sha256:actual};
  }
  return {ok:true,record,record_path:recordPath,candidate,scope:record.scope,files};
}
function transferFiles(ctx){
  const chosen=new Set(),stateFile=path.join(ctx.feature,'plan/progress.yaml');
  const state=existsSync(stateFile)?parseRecord(readFileSync(stateFile,'utf8')):{};
  function add(relative,optional=false){
    const file=evidenceFile(ctx.feature,relative);
    if(optional&&!existsSync(file))return;
    const info=lstatSync(file);need(!info.isSymbolicLink(),'source evidence link');
    if(info.isDirectory()){for(const name of readdirSync(file).sort())add(relative+'/'+name);}
    else{need(info.isFile(),'evidence must be a regular file');chosen.add(relative);}
  }
  for(const root of ['execution/tasks','execution/groups'])add(root,true);
  for(const task of Object.values(state.tasks??{})){
    for(const ref of task.evidence_paths??[])add(ref);
    if(task.result_path)add(task.result_path);
    if(task.claim?.key){need(normalizeWrite(task.claim.key)===task.claim.key&&!task.claim.key.includes('/'),'invalid claim evidence key');add('execution/'+task.claim.key,true);}
  }
  for(const group of Object.values(state.integration?.groups??{}))for(const ref of group.evidence_paths??[])add(ref);
  for(const ref of state.delivery?.receipt_paths??[])add(ref);
  for(const entry of state.resources??[]){
    const m=/^evidence:\s+(.+?)\s+——/.exec(entry);if(!m)continue;
    const prefix=ctx.relative+'/';need(m[1].startsWith(prefix),'resource belongs to a different feature');add(m[1].slice(prefix.length).replace(/\/$/,''));
  }
  // Referenced streams extend the closure. Unknown registered files stay raw artifacts.
  function streams(record){
    for(const key of ['stdout','stderr'])if(Object.hasOwn(record,key+'_sha256')){
      need(typeof record[key]==='string','stream path required');add(record[key]);
      need(digest(readFileSync(evidenceFile(ctx.feature,record[key])))===record[key+'_sha256'],'source stream hash mismatch');
    }
    for(const operation of record.operations??[])streams(operation);
  }
  for(const relative of chosen){
    if(!relative.endsWith('.json'))continue;
    const value=parseUniqueJson(readFileSync(evidenceFile(ctx.feature,relative),'utf8'));
    if(value?.version===1&&value.task&&path.posix.basename(relative)==='record.json')verifyReceipt({feature:ctx.feature,record:relative,candidate:value.commit});
    else if(value?.command&&value.tree&&value.commit){
      need(value.tree===businessTree(ctx.repo,ctx.relative,value.commit),'historical source tree mismatch');
      need(typeof value.cwd==='string'&&path.isAbsolute(value.cwd),'historical cwd missing');
    }
    if(value&&typeof value==='object')streams(value);
  }
  return [...chosen].sort().map(relative=>({path:relative,sha256:digest(readFileSync(evidenceFile(ctx.feature,relative)))}));
}
export function publishEvidenceFile(source,target,expected){
  const bytes=readFileSync(source);need(digest(bytes)===expected,'source evidence hash mismatch');
  if(existsSync(target)){need(!lstatSync(target).isSymbolicLink()&&readFileSync(target).equals(bytes),'evidence target conflict');return {path:target,sha256:expected,reused:true};}
  mkdirSync(path.dirname(target),{recursive:true});
  const temporary=target+'.transfer-'+randomUUID();writeFileSync(temporary,bytes,{flag:'wx'});
  try{need(digest(readFileSync(temporary))===expected,'staging hash mismatch');linkSync(temporary,target);}finally{unlinkSync(temporary);}
  return {path:target,sha256:expected,reused:false};
}
export function transferEvidence({source,target}){
  const completed=[];let staging=null;
  try{
    const ctx=evidenceContext(source);source=ctx.feature;
    need(typeof target==='string'&&path.isAbsolute(target)&&path.resolve(target)===realpathSync(target),'canonical existing target directory required');
    need(lstatSync(target).isDirectory(),'target must be a directory');
    need(source!==target&&!source.startsWith(target+path.sep)&&!target.startsWith(source+path.sep),'source and target must be disjoint');
    const manifest=transferFiles(ctx);need(manifest.length,'no referenced execution evidence');
    // Reject every known conflict before writing any destination bytes.
    for(const item of manifest){
      const dest=evidenceFile(target,item.path);
      if(existsSync(dest))need(lstatSync(dest).isFile()&&digest(readFileSync(dest))===item.sha256,'evidence target conflict: '+item.path);
    }
    staging=evidenceFile(target,'execution/.transfer-'+randomUUID());mkdirSync(staging,{recursive:true});
    for(const item of manifest){
      const bytes=readFileSync(evidenceFile(source,item.path));need(digest(bytes)===item.sha256,'source changed during transfer');
      const file=path.join(staging,item.path);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,bytes,{flag:'wx'});
      need(digest(readFileSync(file))===item.sha256,'staging hash mismatch');
    }
    for(const item of manifest){
      const dest=evidenceFile(target,item.path);publishEvidenceFile(path.join(staging,item.path),dest,item.sha256);
      need(digest(readFileSync(dest))===item.sha256,'published hash mismatch');completed.push(item);
    }
    rmSync(staging,{recursive:true});return {ok:true,files:completed,source,target};
  }catch(error){return {ok:false,files:completed,source,target,staging,error:error.message};}
}
