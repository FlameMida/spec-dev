import {normalizeWrite} from '../../guardrail/lib/write-paths.mjs';
import path from 'node:path';
import {readFileSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseUniqueJson,parseRecord} from '../../guardrail/lib/record-data.mjs';
import {businessTree,evidenceFile,verifyReceipt} from './execution-evidence.mjs';
const need=(ok,message)=>{if(!ok)throw new Error('delivery: '+message);};
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40,64}$/.test(v);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,names)=>need(object(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k)),'invalid fields');
export function validateDeliveryShape(d){
  keys(d,['version','channel','state','source_tip','source_tree','target_branch','merge_method','merge_commit','verified_target','history_ref','receipt_paths','post_merge']);
  need(d.version===1&&['local','pr'].includes(d.channel)&&['implementing','awaiting_merge','merged','completed'].includes(d.state),'invalid version/channel/state');
  for(const k of ['source_tip','merge_commit','verified_target'])need(d[k]===null||sha(d[k]),'invalid '+k);
  need(d.source_tree===null||typeof d.source_tree==='string'&&/^[a-f0-9]{64}$/.test(d.source_tree),'invalid source tree');
  need(d.target_branch===null||typeof d.target_branch==='string'&&d.target_branch.trim(),'invalid target branch');
  need(d.merge_method===null||['ff','merge','squash'].includes(d.merge_method),'invalid method');
  need(d.history_ref===null||typeof d.history_ref==='string'&&/^refs\/spec-dev\/archive\/[^/]+\/source$/.test(d.history_ref),'invalid history ref');
  need(Array.isArray(d.receipt_paths)&&new Set(d.receipt_paths).size===d.receipt_paths.length,'receipt paths required');
  for(const p of d.receipt_paths)need(normalizeWrite(p)===p&&p.startsWith('execution/'),'canonical receipt path required');
  need(Array.isArray(d.post_merge),'post_merge array required');
  for(const item of d.post_merge){
    keys(item,['commit','kind','files']);need(sha(item.commit)&&['progress','sync_commit','acceptance_delivery'].includes(item.kind),'invalid post-merge item');
    need(Array.isArray(item.files)&&item.files.length&&new Set(item.files).size===item.files.length,'post-merge files required');
    for(const p of item.files)need(normalizeWrite(p,{allowSpecDev:true})===p,'canonical post-merge file required');
  }
  need(new Set(d.post_merge.map(x=>x.commit)).size===d.post_merge.length,'duplicate post-merge commit');return d;
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const raw=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const git=(root,...args)=>raw(root,...args).trim();
function ancestor(root,a,b){need(sha(a)&&sha(b),'invalid ancestry endpoints');git(root,'merge-base','--is-ancestor',a,b);}
function blob(root,commit,file){try{return raw(root,'show',commit+':'+file);}catch{return null;}}
function syncOnly(before,after,anchors){
  if(before===null||after===null)return false;
  const strip=text=>{
    const match=/^---\r?\n([\s\S]*?)\r?\n---/.exec(text);if(!match)return null;
    const lines=match[1].split('\n'),fields=lines.filter(l=>/^  sync_commit:/.test(l));if(fields.length>1)return null;
    return {value:fields[0]?.replace(/^  sync_commit:\s*/,''),text:text.replace(match[0],'---\n'+lines.filter(l=>!/^  sync_commit:/.test(l)).join('\n')+'\n---')};
  };
  const a=strip(before),b=strip(after);return Boolean(a&&b&&anchors.includes(b.value)&&a.text===b.text);
}
export function verifyDelivery(root,state,feature){
  const d=validateDeliveryShape(state.delivery);need(['merged','completed'].includes(d.state),'delivery is not merged');
  root=realpathSync(root);const featureDir=path.join(root,feature),head=git(root,'rev-parse','HEAD');
  need(d.source_tip&&d.merge_commit&&d.verified_target&&d.history_ref&&d.source_tree&&d.target_branch&&d.merge_method,'delivery facts incomplete');
  need(git(root,'rev-parse',d.history_ref)===d.source_tip,'source history ref mismatch');
  need(businessTree(root,feature,d.source_tip)===d.source_tree,'source tree mismatch');
  ancestor(root,d.merge_commit,d.verified_target);ancestor(root,d.verified_target,head);
  need(git(root,'branch','--show-current')===d.target_branch&&git(root,'rev-parse','refs/heads/'+d.target_branch)===head,'wrong target branch');
  const parents=git(root,'rev-list','--parents','-n','1',d.merge_commit).split(' ').slice(1);
  if(d.merge_method==='squash'){
    need(parents.length===1,'squash target must have one parent');need(git(root,'merge-base',parents[0],d.source_tip),'squash has no shared source base');
  }else ancestor(root,d.source_tip,d.merge_commit);
  let delivered=false,verified=false,verifiedSource=false;
  for(const relative of d.receipt_paths){
    const r=parseUniqueJson(readFileSync(evidenceFile(featureDir,relative),'utf8'));
    if(r.version===1&&r.task){
      verifyReceipt({feature:featureDir,record:relative,candidate:r.commit});
      if(r.exit_code===0&&['final','integration'].includes(r.phase)&&r.scope?.kind==='repository'){
        // Preserve stale/failed attempts, but consume only an applicable passing receipt.
        try{verifyReceipt({feature:featureDir,record:relative,candidate:d.verified_target});verified=true;}catch{}
        try{verifyReceipt({feature:featureDir,record:relative,candidate:d.source_tip});verifiedSource=true;}catch{}
      }
      continue;
    }
    need(r.version===1&&['git','pr'].includes(r.kind),'unsupported delivery receipt');
    need(r.source_tip===d.source_tip&&r.target_commit===d.merge_commit&&r.method===d.merge_method,'receipt target mapping mismatch');
    if(r.kind==='git'){
      need(d.channel==='local'&&Array.isArray(r.operations)&&r.operations.length,'local Git operation receipt required');
      const commands=[];
      for(const op of r.operations){
        need(Array.isArray(op.argv)&&op.argv.every(a=>typeof a==='string')&&op.exit_code===0&&op.cwd===root,'invalid Git operation');
        for(const stream of ['stdout','stderr'])need(hash(readFileSync(evidenceFile(featureDir,op[stream])))===op[stream+'_sha256'],'Git raw output hash mismatch');
        let args=op.argv.slice();if(args[0]==='rtk'&&args[1]==='proxy')args=args.slice(2);
        need(args.shift()==='git','receipt did not execute Git');
        if(args[0]==='-C'){need(path.resolve(root,args[1])===root,'Git operation cwd mismatch');args=args.slice(2);}
        commands.push(args);
      }
      const merge=commands.find(a=>a[0]==='merge');need(merge,'actual merge operation missing');
      need(d.merge_method==='squash'?merge.includes('--squash')&&commands.some(a=>a[0]==='commit'):!merge.includes('--squash'),'Git method mismatch');delivered=true;
    }else{
      need(d.channel==='pr'&&typeof r.url==='string','PR receipt required');
      const bytes=readFileSync(evidenceFile(featureDir,r.raw));need(hash(bytes)===r.raw_sha256,'PR raw response hash mismatch');
      const response=parseUniqueJson(bytes.toString('utf8'));
      need((response.state==='MERGED'||response.merged===true||Boolean(response.merged_at))&&(response.headRefOid??response.head?.sha)===d.source_tip&&(response.mergeCommit?.oid??response.merge_commit_sha)===d.merge_commit&&(response.html_url??response.url)===r.url,'PR raw response does not prove this merge');delivered=true;
    }
  }
  need(delivered,'actual delivery receipt missing');
  const sourceProgress=blob(root,d.source_tip,feature+'/plan/progress.yaml');
  const acceptedSource=sourceProgress?parseRecord(sourceProgress).integration?.validated_commit:null;
  need(verifiedSource||(acceptedSource&&businessTree(root,feature,acceptedSource)===d.source_tree),'source changed after accepted baseline without full verification');
  const byCommit=new Map(d.post_merge.map(item=>[item.commit,item])),seen=new Set();
  function recordingCommit(commit){
    const ps=git(root,'rev-list','--parents','-n','1',commit).split(' ').slice(1);need(ps.length===1,'post-merge record must have one parent');
    const changed=raw(root,'diff','--name-only','--no-renames','-z',ps[0],commit).split('\0').filter(Boolean),progress=feature+'/plan/progress.yaml';
    if(changed.every(file=>file===progress))return true;
    const item=byCommit.get(commit);if(!item)return false;
    need(JSON.stringify(item.files.slice().sort())===JSON.stringify(changed.slice().sort()),'post-merge files differ from Git');
    const accepted=changed.every(file=>{
      if(file===progress)return true;
      const before=blob(root,ps[0],file),after=blob(root,commit,file);
      if(item.kind==='sync_commit')return file.startsWith(feature+'/spec/')&&file.endsWith('-design.md')&&syncOnly(before,after,[d.merge_commit,d.verified_target]);
      if(item.kind==='acceptance_delivery')return file===feature+'/acceptance/acceptance-report.md'&&before!==null&&after?.startsWith(before)&&/^\s*## (?:实际交付|Actual delivery)\s*\n/.test(after.slice(before.length))&&after.slice(before.length).includes(d.merge_commit)&&after.slice(before.length).includes(d.source_tip);
      return false;
    });need(accepted,'post-merge change exceeds recorded metadata');seen.add(commit);return true;
  }
  const targetTree=businessTree(root,feature,d.merge_commit);
  if(targetTree!==d.source_tree)need(verified,'merged target differs from verified source without new verification');
  for(const commit of git(root,'rev-list','--reverse',d.merge_commit+'..'+d.verified_target).split('\n').filter(Boolean)){
    if(!recordingCommit(commit))need(verified,'target change lacks verification');
  }
  for(const commit of git(root,'rev-list','--reverse',d.verified_target+'..'+head).split('\n').filter(Boolean))need(recordingCommit(commit),'unverified change after verified target');
  for(const item of d.post_merge){ancestor(root,d.merge_commit,item.commit);ancestor(root,item.commit,head);if(!seen.has(item.commit))need(recordingCommit(item.commit),'invalid declared post-merge record');}
  return {sourceTip:d.source_tip,targetCommit:d.merge_commit,verifiedTarget:d.verified_target,historyRef:d.history_ref,method:d.merge_method};
}
