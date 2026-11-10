import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
export class GuardFailure extends Error {constructor(message){super(message);this.name='GuardFailure';}}
const raw=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
// One read interface over the three places a change can live: the working
// tree, the index, or a commit.
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
      if(kind!=='commit'&&fields[2]!=='0')throw new GuardFailure('unmerged index entry: '+file);
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
  return {kind,commit,readText,entries};
}
