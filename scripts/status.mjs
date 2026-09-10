#!/usr/bin/env node
import path from 'node:path';
import {collectStatus,renderStatus} from './lib/status.mjs';
const args=process.argv.slice(2),seen=new Set();let repo=process.cwd(),json=false;
const usage='Usage: node <plugin>/scripts/status.mjs [--repo PATH] [--json]\n       node <plugin>/scripts/status.mjs --help\n';
function bad(message){process.stderr.write(message+'\n'+usage);process.exit(2);}
if(args.length===1&&args[0]==='--help'){process.stdout.write(usage);process.exit(0);}
for(let i=0;i<args.length;i++){
 const a=args[i];if(seen.has(a))bad('Duplicate option: '+a);seen.add(a);
 if(a==='--json')json=true;
 else if(a==='--repo'){const value=args[++i];if(!value||value.startsWith('--'))bad('Missing --repo value');repo=path.resolve(value);}
 else bad('Unknown option: '+a);
}
try{
 const result=await collectStatus(repo);process.stdout.write(json?JSON.stringify(result,null,2)+'\n':renderStatus(result));process.exitCode=result.diagnostics.length?1:0;
}catch(e){
 if(e.code==='usage')bad(e.message);
 const failure={schema_version:1,verification:'not_performed',repository:{requested_path:repo,worktree:null,common_dir:null},worktrees:[],roadmaps:[],features:[],summary:{features:0,source_records:0},collected_at:new Date().toISOString(),diagnostics:[{worktree:null,path:null,code:'unreadable',message:e.message}]};
 process.stdout.write(json?JSON.stringify(failure,null,2)+'\n':renderStatus(failure));process.exitCode=1;
}
