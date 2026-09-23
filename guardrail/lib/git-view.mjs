import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {normalizeWrite,resolveWrite} from './write-paths.mjs';
import {parseUniqueJson,parseRecord} from './record-data.mjs';
import {commitView} from './task-binding.mjs';
export class ScopeViolation extends Error {constructor(message){super(message);this.name='ScopeViolation';}}
const raw=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
export function createGitView(repo,kind,ref=null){
  if(!['worktree','index','commit'].includes(kind))throw new Error('unknown Git view');
  const commit=kind==='commit'?raw(repo,'rev-parse',ref+'^{commit}').trim():null;
  let cached;
  function entries(){
    if(cached)return cached;
    const records=kind==='commit'?raw(repo,'ls-tree','-r','-z',commit):raw(repo,'ls-files','--stage','-z');
    const out=new Map();
    for(const record of records.split('\0').filter(Boolean)){
      const [meta,file]=[record.slice(0,record.indexOf('\t')),record.slice(record.indexOf('\t')+1)],fields=meta.split(' ');
      if(kind!=='commit'&&fields[2]!=='0')throw new ScopeViolation('unmerged index entry: '+file);
      out.set(file,{mode:fields[0],oid:fields[kind==='commit'?2:1]});
    }
    if(kind==='worktree'){
      for(const file of raw(repo,'ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean))out.set(file,{});
      for(const file of out.keys())try{const s=lstatSync(path.join(repo,file));out.set(file,{mode:s.isSymbolicLink()?'120000':s.isDirectory()?'160000':'100644'});}catch(e){if(e.code==='ENOENT')out.delete(file);else throw e;}
    }
    return cached=out;
  }
  function readText(file){
    if(!entries().has(file))return null;
    if(kind==='worktree')return readFileSync(path.join(repo,file),'utf8');
    return raw(repo,'show',(kind==='index'?':':commit+':')+file);
  }
  function resolvePath(file){
    normalizeWrite(file,{allowSpecDev:true});
    if(kind==='worktree')return resolveWrite(repo,file,{allowSpecDev:true});
    let parts=file.split('/'),hops=0;
    for(let i=0;i<parts.length;i++){
      const prefix=parts.slice(0,i+1).join('/'),entry=entries().get(prefix);
      if(entry?.mode==='120000'){
        if(++hops>40)throw new ScopeViolation('symlink cycle');
        const target=readText(prefix);if(path.posix.isAbsolute(target))throw new ScopeViolation('absolute symlink path: '+prefix);
        const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(prefix),target,...parts.slice(i+1)));
        normalizeWrite(resolved,{allowSpecDev:true});parts=resolved.split('/');i=-1;
      }else if(entry&&(entry.mode==='160000'||i<parts.length-1))throw new ScopeViolation('path is not a file: '+prefix);
    }
    return normalizeWrite(parts.join('/'),{allowSpecDev:true});
  }
  return {kind,commit,local:kind!=='commit',readText,entries,resolvePath};
}
export function taskAssociation(repo,body){
  const lines=body.split(/\r?\n/).filter(l=>/^Spec-Task:/i.test(l));if(!lines.length)return null;
  try{
    if(lines.length!==1)throw new Error('duplicate Spec-Task');
    const r=parseUniqueJson(lines[0].replace(/^Spec-Task:\s*/i,''));
    if(!r||Object.keys(r).length!==3||!['plan','task','authority'].every(k=>Object.hasOwn(r,k)))throw new Error('invalid Spec-Task fields');
    const authority=commitView(repo,r.authority);let worktree=repo,branch='historical';
    if(path.posix.basename(r.plan)==='index.md'){
      const state=parseRecord(authority.readText(path.posix.join(path.posix.dirname(r.plan),'progress.yaml'))),b=state.tasks?.[r.task]?.binding;
      if(!b)throw new Error('binding missing from authority');({worktree,branch}=b);
    }
    return {version:1,...r,worktree,branch};
  }catch(error){throw new ScopeViolation('invalid Spec-Task: '+error.message);}
}
