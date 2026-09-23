#!/usr/bin/env node
import {recordExecution,verifyReceipt,transferEvidence} from './lib/execution-evidence.mjs';
try{
  const [command,...args]=process.argv.slice(2),flags={},allowed={record:['--feature','--task','--phase','--attempt','--output'],verify:['--feature','--record','--candidate'],transfer:['--source','--target']}[command];
  const usage=m=>{throw Object.assign(new Error(m),{usage:true});};if(!allowed)usage('expected record, verify or transfer');
  let argv=[];for(let i=0;i<args.length;i+=2){if(args[i]==='--'){argv=args.slice(i+1);break;}if(!allowed.includes(args[i])||Object.hasOwn(flags,args[i])||!args[i+1]||args[i+1].startsWith('--'))usage('invalid option');flags[args[i]]=args[i+1];}
  for(const name of allowed.filter(k=>k!=='--output'))if(!flags[name])usage('missing '+name);
  let result;
  if(command==='record'){if(!argv.length)usage('command argv after -- required');result=recordExecution({feature:flags['--feature'],task:flags['--task'],phase:flags['--phase'],attempt:flags['--attempt'],argv,scope:{kind:'repository',outputs:flags['--output']?[flags['--output']]:[]}});}
  else{if(argv.length)usage('only record takes a child command');result=command==='verify'?verifyReceipt({feature:flags['--feature'],record:flags['--record'],candidate:flags['--candidate']}):transferEvidence({source:flags['--source'],target:flags['--target']});}
  process.stdout.write(JSON.stringify(result)+'\n');if(!result.ok)process.exitCode=1;
}catch(error){process.stderr.write(JSON.stringify({ok:false,error:error.message})+'\n');process.exitCode=error.usage?2:1;}
