#!/usr/bin/env node
import {realpathSync} from 'node:fs';
import {git,localReference,activateReceipt,readBinding,clearReceipt} from './lib/task-binding.mjs';
const usage=message=>{throw Object.assign(new Error(message),{usage:true});};
try{
  const [command,...args]=process.argv.slice(2),allowed={bind:['--plan','--task','--authority'],inspect:[],clear:['--plan','--task']}[command];
  if(!allowed)usage('expected bind, inspect or clear');
  const flags={};for(let i=0;i<args.length;i+=2){if(!allowed.includes(args[i])||Object.hasOwn(flags,args[i])||!args[i+1]||args[i+1].startsWith('--'))usage('invalid argument');flags[args[i]]=args[i+1];}
  if(allowed.some(k=>!flags[k]))usage('missing required option');
  const repo=realpathSync(git(process.cwd(),'rev-parse','--show-toplevel'));
  let result;
  if(command==='bind')result=activateReceipt(repo,{version:1,plan:flags['--plan'],task:flags['--task'],authority:flags['--authority'],worktree:repo,branch:git(repo,'branch','--show-current')});
  if(command==='inspect'){const r=localReference(repo);if(!r)throw new Error('no active task receipt');result={ok:true,reference:r,binding:readBinding(repo,r)};}
  if(command==='clear')result=clearReceipt(repo,flags['--plan'],flags['--task']);
  process.stdout.write(JSON.stringify(result,(_,v)=>v instanceof Set?[...v]:v)+'\n');
}catch(error){process.stderr.write(JSON.stringify({ok:false,error:error.message})+'\n');process.exitCode=error.usage?2:1;}
