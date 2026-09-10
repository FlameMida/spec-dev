import path from 'node:path';
import * as fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {parseRecord,parseMeta,parseRoadmap,parsePlanFiles,fault} from './status-parse.mjs';
const execute=promisify(execFile);
const sort=(a,b)=>a<b?-1:a>b?1:0;
const stable=x=>JSON.stringify(x);
const fingerprint=s=>s?[s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs].join(':'):'absent';
const defaults={
 stat:p=>fs.lstat(p),list:p=>fs.readdir(p),read:p=>fs.readFile(p,'utf8'),real:p=>fs.realpath(p),now:()=>new Date().toISOString(),
 git:async(cwd,args)=>(await execute('git',args,{cwd,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},encoding:'utf8',maxBuffer:16*1024*1024})).stdout
};
export function parseWorktrees(raw){
 const out=[];let x=null;
 for(const item of raw.split('\0')){
  if(item.startsWith('worktree ')){x={path:item.slice(9),branch:null,head:null,detached:false};out.push(x);}
  else if(x&&item.startsWith('HEAD '))x.head=item.slice(5);
  else if(x&&item.startsWith('branch '))x.branch=item.slice(7).replace(/^refs\/heads\//,'');
  else if(x&&item==='detached')x.detached=true;
  else if(x&&item==='bare')x.bare=true;
 }
 if(!out.length)throw fault('invalid_format','empty worktree enumeration');return out.filter(w=>!w.bare).sort((a,b)=>sort(a.path,b.path));
}
function project(source){
 return {specs:source.specs.map(s=>({path:s.path,status:s.status})),plan:source.plan?{
  format:source.plan.format,mode:source.plan.mode,current:source.plan.current,counts:source.plan.counts,
  tasks:source.plan.tasks.map(t=>({id:t.id,status:t.status,...(source.plan.format==='legacy'?{checked:t.checked,total:t.total}:{})})),groups:source.plan.groups
 }:null,roadmaps:source.roadmaps.map(r=>({path:r.path,id:r.id,status:r.status,roadmap_status:r.roadmap_status}))};
}
export function groupSources(sources){
 const map=new Map();for(const s of sources){if(!map.has(s.key))map.set(s.key,[]);map.get(s.key).push(s);}
 return [...map].sort(([a],[b])=>sort(a,b)).map(([key,all])=>{
  all.sort((a,b)=>sort(a.worktree,b.worktree));const usable=all.filter(s=>s.read_status==='ok'),projections=usable.map(project);
  const fields=['specs','plan','roadmaps'].filter(k=>new Set(projections.map(p=>stable(p[k]))).size>1);
  return {key,sources:all,divergence:{different:fields.length>0,fields,uncomparable:all.length-usable.length}};
 });
}
export async function collectStatus(repoPath,overrides={}){
 const io={...defaults,...overrides},result={schema_version:1,verification:'not_performed',repository:{requested_path:path.resolve(repoPath),worktree:null,common_dir:null},worktrees:[],roadmaps:[],features:[],diagnostics:[],summary:{features:0,source_records:0},collected_at:io.now()};
 const diagnostic=(worktree,file,e)=>result.diagnostics.push({worktree,path:file,code:e.code&&['missing','invalid_format','unsupported_version','unsupported_syntax','inconsistent','unstable','symlink_skipped'].includes(e.code)?e.code:'unreadable',message:e.message});
 let root,common;
 try{root=(await io.git(repoPath,['rev-parse','--show-toplevel'])).trim();common=await io.real((await io.git(root,['rev-parse','--path-format=absolute','--git-common-dir'])).trim());}
 catch(e){throw fault('usage','target is not an accessible Git worktree: '+e.message);}
 result.repository.worktree=root;result.repository.common_dir=common;
 let worktrees;
 try{worktrees=parseWorktrees(await io.git(root,['worktree','list','--porcelain','-z']));}
 catch(e){diagnostic(root,'',e);return result;}
 const sources=[],roadmaps=[];
 for(const wt of worktrees){
  wt.read_status='ok';result.worktrees.push(wt);
  try{const c=await io.real((await io.git(wt.path,['rev-parse','--path-format=absolute','--git-common-dir'])).trim());if(c!==common)throw fault('inconsistent','worktree common-dir mismatch');}
  catch(e){wt.read_status='error';diagnostic(wt.path,'',e);continue;}
  const secure=async rel=>{
   const abs=path.resolve(wt.path,rel),r=path.relative(wt.path,abs);
   if(r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r))throw fault('inconsistent','path escapes worktree');
   let p=wt.path,last=null;
   for(const part of r.split(path.sep).filter(Boolean)){
    p=path.join(p,part);
    try{last=await io.stat(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}
    if(last.isSymbolicLink())throw fault('symlink_skipped','symbolic link: '+p);
   }return last;
  };
  const list=async rel=>{const s=await secure(rel);if(!s)return [];if(!s.isDirectory())throw fault('invalid_format','expected directory: '+rel);return (await io.list(path.join(wt.path,rel))).sort(sort);};
  const bounded=async(rel,build)=>{
   for(let attempt=0;attempt<2;attempt++){
    const watched=new Map();
    const probe=async p=>{const s=await secure(p);if(!watched.has(p))watched.set(p,fingerprint(s));return s;};
    const directory=async p=>{const s=await probe(p);if(!s)return null;if(!s.isDirectory())throw fault('invalid_format','expected directory: '+p);return (await io.list(path.join(wt.path,p))).sort(sort);};
    const read=async p=>{const s=await probe(p);if(!s)return null;if(!s.isFile())throw fault('invalid_format','expected file: '+p);try{return await io.read(path.join(wt.path,p));}catch(e){if(e.code==='ENOENT')throw fault('changed','file disappeared: '+p);throw e;}};
    try{
     const value=await build({probe,directory,read});let changed=false;
     for(const [p,before]of watched)if(fingerprint(await secure(p))!==before){changed=true;break;}
     if(!changed)return value;
    }catch(e){if(e.code!=='changed')throw e;}
   }throw fault('unstable','record changed during both reads: '+rel);
  };
  const feature=async(key,specOnly=null)=>{
   let source={key,worktree:wt.path,files:[],specs:[],plan:null,roadmaps:[],read_status:'ok'};
   try{
    const captured=await bounded(key,async({probe,directory,read})=>{
     const specs=[],files=[];let index=null,progress=null,taskNames=null,legacy=[];
     const names=specOnly?[specOnly]:[...(await directory(key)??[]).filter(n=>n.endsWith('-design.md')).map(n=>key+'/'+n),...(await directory(key+'/spec')??[]).filter(n=>n.endsWith('-design.md')).map(n=>key+'/spec/'+n)];
     for(const name of names.sort(sort)){const text=await read(name);if(text!==null){specs.push([name,text]);files.push(name);}}
     if(!specOnly){
      const plan=key+'/plan';index=await read(plan+'/index.md');progress=await read(plan+'/progress.yaml');taskNames=await directory(plan+'/tasks');
      if(index!==null)files.push(plan+'/index.md');if(progress!==null)files.push(plan+'/progress.yaml');
      if(taskNames!==null){files.push(plan+'/tasks/');for(const n of taskNames.filter(n=>/^T\d\d.*\.md$/.test(n))){const s=await probe(plan+'/tasks/'+n);if(!s?.isFile())throw fault('missing','task is not a file: '+n);}}
      for(const n of(await directory(plan)??[]).filter(n=>n.endsWith('-plan.md'))){const text=await read(plan+'/'+n);legacy.push([plan+'/'+n,text]);files.push(plan+'/'+n);}
     }
     return {specs,files,index,progress,taskNames,legacy,found:specs.length>0||index!==null||progress!==null||taskNames!==null||legacy.length>0};
    });
    if(!captured.found)return;source.files=captured.files;
    for(const [file,text]of captured.specs){
     try{const meta=parseMeta(text,'spec');source.specs.push({path:file,feature:meta.feature??null,status:meta.status??null});if(!['draft','active','superseded'].includes(meta.status))throw fault('invalid_format','unknown spec status: '+meta.status);}
     catch(e){source.read_status='partial';diagnostic(wt.path,file,e);}
    }
    try{source.plan=parsePlanFiles(captured);for(const e of source.plan?.diagnostics??[]){source.read_status='partial';diagnostic(wt.path,key+'/plan',e);}}
    catch(e){let raw_version=null;try{raw_version=parseRecord(captured.progress)?.format_version??null;}catch{}source.read_status='partial';source.plan={format:'unknown',raw_version,counts:null,tasks:[],groups:[],current:null,error:e.message};diagnostic(wt.path,key+'/plan',e);}
   }catch(e){source.read_status='partial';diagnostic(wt.path,key,e);}
   sources.push(source);
  };
  for(const base of ['.spec-dev','docs']){
   let names;try{names=await list(base);}catch(e){diagnostic(wt.path,base,e);continue;}
   for(const name of names){
    if(name.startsWith('.')||['roadmaps','reports','explorations','adr','acceptance','execution'].includes(name))continue;
    if(base==='docs'&&!/^\d{4}-\d{2}-\d{2}-/.test(name))continue;
    const key=base+'/'+name;
    try{const s=await secure(key);if(s?.isDirectory())await feature(key);}catch(e){diagnostic(wt.path,key,e);}
   }
  }
  try{for(const name of(await list('.specs')).filter(n=>n.endsWith('.md')))await feature('.specs/'+name,'.specs/'+name);}catch(e){diagnostic(wt.path,'.specs',e);}
  let roadmapNames;try{roadmapNames=await list('.spec-dev/roadmaps');}catch(e){diagnostic(wt.path,'.spec-dev/roadmaps',e);roadmapNames=[];}
  for(const name of roadmapNames.filter(n=>n.endsWith('.md'))){
   const file='.spec-dev/roadmaps/'+name,record={path:file,worktree:wt.path,meta:null,rows:[],read_status:'ok'};
   try{
    const text=await bounded(file,({read})=>read(file));if(text===null)throw fault('missing','roadmap disappeared');
    record.meta=parseMeta(text,'roadmap');if(!['active','done','superseded'].includes(record.meta.status))throw fault('invalid_format','unknown roadmap status');
    record.rows=parseRoadmap(text).rows;
    for(const row of record.rows){
     if(!['pending','in-progress','delivered','dropped'].includes(row.status)){record.read_status='partial';diagnostic(wt.path,file,fault('invalid_format','unknown row status: '+row.id));}
     if(row.target){
      const abs=path.resolve(row.link?path.dirname(path.join(wt.path,file)):wt.path,row.target),key=path.relative(wt.path,abs).split(path.sep).join('/').replace(/\/$/,'');row.feature_key=key;
      try{if(!await secure(key))throw fault('missing','missing feature target: '+row.target);}
      catch(e){record.read_status='partial';diagnostic(wt.path,file,e);}
     }
    }
   }catch(e){record.read_status='partial';diagnostic(wt.path,file,e);}
   roadmaps.push(record);
  }
 }
 for(const source of sources){
  source.roadmaps=roadmaps.filter(r=>r.worktree===source.worktree).flatMap(r=>r.rows.filter(row=>row.feature_key===source.key).map(row=>({path:r.path,id:row.id,status:row.status,roadmap_status:r.meta?.status??null}))).sort((a,b)=>sort(a.path+'\0'+a.id,b.path+'\0'+b.id));
 }
 result.features=groupSources(sources);
 const rm=new Map();for(const r of roadmaps){if(!rm.has(r.path))rm.set(r.path,[]);rm.get(r.path).push(r);}result.roadmaps=[...rm].sort(([a],[b])=>sort(a,b)).map(([key,all])=>({key,sources:all}));
 result.summary={features:result.features.length,source_records:sources.length};
 result.diagnostics.sort((a,b)=>sort(a.worktree+'\0'+a.path+'\0'+a.code,b.worktree+'\0'+b.path+'\0'+b.code));
 return result;
}
