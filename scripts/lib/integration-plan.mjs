import {readFileSync, readdirSync, existsSync, realpathSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseParallelBlock, normalizeWrite} from './parallel-plan.mjs';
const own=(x,k)=>Object.hasOwn(x,k);
const object=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const need=(v,m)=>{if(!v) throw new Error(m);};
const keys=(x,required,optional=[],label='object')=>{
  need(object(x),label+': expected object');
  for(const k of required) need(own(x,k),label+': missing '+k);
  for(const k of Object.keys(x)) need([...required,...optional].includes(k),label+': unknown '+k);
};
import {parseUniqueJson} from '../../guardrail/lib/record-data.mjs';
export {parseUniqueJson} from '../../guardrail/lib/record-data.mjs';
export function readNavigation(markdown){
  const rows=[];
  for(const line of markdown.split('\n')){
    const m=line.match(/^\|\s*(T\d\d)\b[^|]*\|\s*([^|]*)\|/);if(!m)continue;
    const deps=[];need(!/T\d\d\s*[—–]\s*T\d\d|T\d\d\s*-\s*T\d\d\s*-\s*T\d\d/.test(m[2]),m[1]+': ASCII hyphen range TNN-TMM');
    for(const d of m[2].matchAll(/T(\d\d)(?:\s*-\s*T(\d\d))?/g)){
      const lo=Number(d[1]),hi=Number(d[2]??d[1]);need(lo<=hi,m[1]+': ascending range');
      for(let n=lo;n<=hi;n++)deps.push('T'+String(n).padStart(2,'0'));
    } rows.push({id:m[1],deps:[...new Set(deps)]});
  }
  return rows;
}
function acyclic(rows){
  const map=new Map(rows.map(r=>[r.id,r.deps])),done=new Set(),active=new Set();
  function walk(id){need(map.has(id),'dangling '+id);if(done.has(id))return;need(!active.has(id),'cycle via '+id);active.add(id);for(const d of map.get(id))walk(d);active.delete(id);done.add(id);}
  for(const id of map.keys())walk(id);
}
export function loadIntegrationPlan(planDir){
  const text=readFileSync(path.join(planDir,'index.md'),'utf8');
  const lines=text.replace(/\r\n/g,'\n').split('\n');
  const markers=lines.flatMap((line,i)=>line.includes('spec-dev-integration') && line.startsWith('```')?[i]:[]);
  if(!markers.length){
    const p=path.join(planDir,'progress.yaml');
    if(existsSync(p)){
      const s=readFileSync(p,'utf8');
      if(s.trim().startsWith('{'))need(parseUniqueJson(s).format_version!==2,'v2 requires integration declaration');
      else need(!/^format_version:\s*2\s*$/m.test(s),'v2 requires JSON integration declaration');
    }return null;
  }
  need(markers.length===1,'duplicate integration block');const start=markers[0];
  need(lines[start]==='```json spec-dev-integration','integration block must be json');
  const end=lines.findIndex((l,i)=>i>start && l==='```');need(end>=0,'unterminated integration block');
  const declaration=parseUniqueJson(lines.slice(start+1,end).join('\n'));
  keys(declaration,['protocol_version','task_roles','groups'],[],'integration');
  need(declaration.protocol_version===1,'unsupported protocol');
  const rows=readNavigation(text),ids=rows.map(r=>r.id),byId=new Map(rows.map(r=>[r.id,r]));
  need(ids.length && new Set(ids).size===ids.length,'unique navigation IDs required');acyclic(rows);
  const files=readdirSync(path.join(planDir,'tasks')).filter(f=>/^T\d\d.*\.md$/.test(f));
  need(files.length===ids.length && ids.every(id=>files.includes(id+'.md')),'navigation/task files mismatch');
  const roles=declaration.task_roles;need(object(roles),'task_roles object');
  for(const [id,role] of Object.entries(roles))need(ids.includes(id)&&['isolation','acceptance','delivery'].includes(role),'invalid role '+id);
  need(roles.T00==='isolation','T00 isolation required');
  need(Object.values(roles).filter(r=>r==='isolation').length===1,'one isolation required');
  need(Object.values(roles).filter(r=>r==='delivery').length===1 && roles[[...ids].sort().at(-1)]==='delivery','maximum task must be delivery');
  const groups=declaration.groups;need(object(groups)&&Object.keys(groups).length,'nonempty groups required');
  const membership=new Map(),verification=new Map();
  for(const [gid,g] of Object.entries(groups)){
    need(/^G\d\d$/.test(gid),'invalid group id');keys(g,['members','verify','reason'],[],gid);
    need(Array.isArray(g.members)&&g.members.length>=2&&new Set(g.members).size===g.members.length,'members need two unique task IDs');
    need(typeof g.reason==='string'&&g.reason.trim(),gid+': reason required');
    need(typeof g.verify==='string' && ids.includes(g.verify) && !own(roles,g.verify),'invalid verifier');
    need(!g.members.includes(g.verify)&&!verification.has(g.verify),'duplicate verifier');verification.set(g.verify,gid);
    for(const id of g.members){need(typeof id==='string'&&ids.includes(id)&&!own(roles,id)&&!membership.has(id),'invalid/duplicate member '+id);membership.set(id,gid);}
  }
  for(const id of membership.keys())need(!verification.has(id),'verifier cannot also be member');
  const owner=id=>membership.get(id)??verification.get(id)??id;
  for(const [gid,g] of Object.entries(groups)){
    const pos=new Map(g.members.map((id,i)=>[id,i]));
    for(const id of g.members)for(const d of byId.get(id).deps)if(pos.has(d))need(pos.get(d)<pos.get(id),'member order conflicts with deps');
    need(g.members.every(id=>byId.get(g.verify).deps.includes(id)),'verifier must depend on every member');
  }
  for(const r of rows)for(const d of r.deps)if(membership.has(d))need(owner(r.id)===membership.get(d),'external member dependency: '+r.id+' -> '+d);
  const collapsed=new Map();for(const id of ids)collapsed.set(owner(id),new Set());
  for(const r of rows)for(const d of r.deps)if(owner(r.id)!==owner(d))collapsed.get(owner(r.id)).add(owner(d));
  acyclic([...collapsed].map(([id,deps])=>({id,deps:[...deps]})));
  const parallel=parseParallelBlock(text,ids);
  for(const id of Object.keys(parallel?.tasks??{}))need(!membership.has(id)&&!verification.has(id),'group task cannot be parallel: '+id);
  const state=parseUniqueJson(readFileSync(path.join(planDir,'progress.yaml'),'utf8'));
  need(state.format_version===2,'groups require format_version 2');
  return {planDir:path.resolve(planDir),rows,ids,byId,declaration,membership,verification,parallel,state};
}
export function validateIntegrationPlan(planDir){
  try{const p=loadIntegrationPlan(planDir);if(p)validateStateShape(p);return [];}catch(e){return [{path:'integration',expected:'valid integration plan',actual:e.message}];}
}
// GROUP-RUNTIME

const statuses=['pending','in_progress','awaiting_verification','completed','blocked'];
const sha=x=>typeof x==='string'&&/^[0-9a-f]{40,64}$/.test(x);
const nullableSha=x=>x===null||sha(x);
const arr=x=>Array.isArray(x)&&x.every(v=>typeof v==='string');
export function validateStateShape(p){
  const s=p.state;keys(s,['format_version','current','tasks','resources','notes','integration'],['execution'],'progress');
  need(s.format_version===2,'unsupported progress version');need(s.current===null||p.ids.includes(s.current),'invalid current');
  need(arr(s.resources)&&arr(s.notes),'resources/notes string arrays');
  keys(s.tasks,p.ids,[],'tasks');
  for(const [id,t] of Object.entries(s.tasks)){
    keys(t,['status'],['commit','tests','deviations','claim','implementation_commit','result_path','evidence_paths'],id);
    need(statuses.includes(t.status),id+': invalid status');
    if(own(t,'deviations'))need(arr(t.deviations),id+': deviations array');
    if(own(t,'evidence_paths'))need(arr(t.evidence_paths),id+': evidence_paths array');
    for(const k of ['commit','implementation_commit'])if(own(t,k))need(nullableSha(t[k]),id+': invalid '+k);
    if(t.status==='awaiting_verification'){
      need(p.membership.has(id),id+': awaiting_verification requires group membership');
      need(t.tests==='pending_group'&&sha(t.implementation_commit)&&t.commit==null,id+': invalid pending evidence state');
      need(t.evidence_paths?.length,id+': waiting evidence missing');
    }
    if(t.status==='completed')need(sha(t.commit),id+': completed commit missing');
    if(p.membership.has(id)||p.verification.has(id)){
      need(!own(t,'claim')&&!own(t,'result_path'),id+': group task cannot use implementer claim');
      if(t.status==='completed'){
        need(t.tests==='pass'&&t.evidence_paths?.length,id+': group completion needs pass evidence');
        if(p.membership.has(id))need(sha(t.implementation_commit),id+': completed member implementation missing');
      }
    }
  }
  const x=s.integration;keys(x,['owner','worktree','branch','base_commit','validated_commit','active_group','groups'],[],'integration');
  for(const k of ['owner','worktree','branch'])need(x[k]===null||(typeof x[k]==='string'&&x[k].trim()),'invalid '+k);
  for(const k of ['base_commit','validated_commit'])need(nullableSha(x[k]),'invalid '+k);
  keys(x.groups,Object.keys(p.declaration.groups),[],'runtime groups');
  need(x.active_group===null||own(x.groups,x.active_group),'invalid active_group');
  for(const [gid,g] of Object.entries(x.groups)){
    keys(g,['status','base_commit','checkpoint_commit','validated_commit','evidence_paths'],[],gid);
    need(['pending','in_progress','blocked','completed'].includes(g.status),gid+': invalid group status');
    need(arr(g.evidence_paths),gid+': evidence_paths array');
    for(const k of ['base_commit','checkpoint_commit','validated_commit'])need(nullableSha(g[k]),gid+': invalid '+k);
    const d=p.declaration.groups[gid],members=d.members.map(id=>s.tasks[id]),v=s.tasks[d.verify];
    if(g.status==='pending')need([...members,v].every(t=>t.status==='pending')&&[g.base_commit,g.checkpoint_commit,g.validated_commit].every(v=>v===null),gid+': dirty pending group');
    if(g.status==='completed'){
      need(sha(g.validated_commit)&&g.evidence_paths.length && [...members,v].every(t=>t.status==='completed'&&t.commit===g.validated_commit),gid+': partial group completion');
      need(x.active_group!==gid,gid+': completed cannot remain active');
    }else{
      need(g.validated_commit===null,gid+': premature verified commit');
      need([...members,v].every(t=>t.status!=='completed'),gid+': premature task completion');
    }
    if(['in_progress','blocked'].includes(g.status)){
      need(x.active_group===gid&&sha(g.base_commit)&&sha(g.checkpoint_commit),gid+': active binding missing');
      need(g.base_commit===x.validated_commit,gid+': global validated baseline moved');
    }
  }
  if(x.active_group!==null){
    need(['in_progress','blocked'].includes(x.groups[x.active_group].status),'inactive active_group');
    const d=p.declaration.groups[x.active_group];
    if(s.tasks[d.verify].status==='in_progress')need(d.members.every(id=>s.tasks[id].status==='awaiting_verification'),'verifier started before all members ready');
  }
  if(s.current!==null){
    need(['in_progress','blocked'].includes(s.tasks[s.current].status),'current must point to active task');
    if(x.active_group!==null)need((p.membership.get(s.current)??p.verification.get(s.current))===x.active_group,'current outside active group');
  }
  const running=Object.entries(s.tasks).filter(([,t])=>t.status==='in_progress');
  if(x.active_group!==null)need(running.every(([id])=>id===s.current),'other task running during group');
  if(s.execution){
    keys(s.execution,['mode','owner','integration_worktree','integration_branch','base_commit','validated_commit'],['activation','delivery'],'execution');
    need(s.execution.mode==='parallel','unsupported execution mode');
    for(const [left,right] of [['owner','owner'],['worktree','integration_worktree'],['branch','integration_branch'],['base_commit','base_commit'],['validated_commit','validated_commit']])need(x[left]===s.execution[right],'projection mismatch: '+left);
  }
  const bootstrap=s.tasks.T00.status!=='completed';
  if(bootstrap)need(x.base_commit===null&&x.validated_commit===null&&x.active_group===null&&Object.entries(s.tasks).every(([id,t])=>id==='T00'||t.status==='pending'),'invalid bootstrap');
  else need(x.owner&&path.isAbsolute(x.worktree??'')&&x.branch&&sha(x.base_commit)&&sha(x.validated_commit),'runtime binding missing');
  return s;
}
function readyTasks(p){
  const s=p.state,x=s.integration,completed=id=>s.tasks[id].status==='completed';
  if(s.tasks.T00.status!=='completed')return s.tasks.T00.status==='blocked'?[]:['T00'];
  if(x.active_group){
    const gid=x.active_group,g=p.declaration.groups[gid],runtime=x.groups[gid];
    if(runtime.status==='blocked')return [];
    for(const id of g.members){
      const t=s.tasks[id];if(t.status==='awaiting_verification')continue;
      if(t.status==='blocked')return [];
      const eligible=p.byId.get(id).deps.every(d=>p.membership.get(d)===gid?['awaiting_verification','completed'].includes(s.tasks[d].status):completed(d));
      return eligible?[id]:[];
    }
    return s.tasks[g.verify].status==='blocked'?[]:[g.verify];
  }
  const ready=[];
  for(const row of p.rows){
    if(!['pending','in_progress'].includes(s.tasks[row.id].status))continue;
    if(p.verification.has(row.id))continue;
    if(p.membership.has(row.id)){
      const gid=p.membership.get(row.id),g=p.declaration.groups[gid];if(row.id!==g.members[0])continue;
      const all=[...g.members,g.verify],external=[...new Set(all.flatMap(id=>p.byId.get(id).deps).filter(d=>!all.includes(d)))];
      if(external.every(completed)&&!Object.values(s.tasks).some(t=>t.status==='in_progress'))ready.push(row.id);
    }else if(row.deps.every(completed))ready.push(row.id);
  }
  return ready.sort();
}
function runtimeFacts(p){
  const s=p.state,x=s.integration;
  // A completed archive is never a scheduling/recovery workspace. Keep its
  // historical binding and evidence intact when inspecting the merged copy.
  const archived=s.current===null&&x.active_group===null&&
    Object.values(s.tasks).every(t=>t.status==='completed')&&
    Object.values(x.groups).every(g=>g.status==='completed');
  const git=(cwd,...args)=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const root=realpathSync(git(p.planDir,'rev-parse','--show-toplevel'));
  const feature=path.relative(root,path.dirname(p.planDir)).split(path.sep).join('/');
  need(feature.startsWith('.spec-dev/')&&!feature.includes('..'),'plan outside feature root');
  const relPlan=feature+'/plan',progressRel=relPlan+'/progress.yaml',evidencePrefix=feature+'/execution/';
  const status=git(root,'status','--porcelain','--untracked-files=all','--',relPlan);
  need(!status,'checkpoint_uncommitted');
  for(const name of ['index.md','progress.yaml']){
    const actual=readFileSync(path.join(p.planDir,name),'utf8');
    const committed=execFileSync('git',['-C',root,'show','HEAD:'+relPlan+'/'+name],{encoding:'utf8'});
    need(committed===actual,'checkpoint_uncommitted: '+name);
  }
  const head=git(root,'rev-parse','HEAD');
  const ancestor=(a,b)=>{
    need(sha(a)&&sha(b),'invalid commit SHA');
    git(root,'cat-file','-e',a+'^{commit}');git(root,'cat-file','-e',b+'^{commit}');
    git(root,'merge-base','--is-ancestor',a,b);
  };
  const businessTree=commit=>{
    const raw=execFileSync('git',['-C',root,'ls-tree','-r','-z',commit],{encoding:'utf8'});
    const entries=raw.split('\0').filter(Boolean).filter(line=>{const f=line.slice(line.indexOf('\t')+1);return f!==progressRel&&!f.startsWith(evidencePrefix);});
    return createHash('sha256').update(entries.join('\0')).digest('hex');
  };
  const withinFeature=relative=>{
    need(typeof relative==='string'&&relative.startsWith('execution/groups/')&&!relative.includes('\\'),'invalid evidence path');
    normalizeWrite(relative);
    const base=realpathSync(path.dirname(p.planDir)),resolved=realpathSync(path.join(base,relative)),rel=path.relative(base,resolved);
    need(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel),'evidence escapes feature');return resolved;
  };
  function readEvidence(relative,verified=null){
    const file=withinFeature(relative),r=parseUniqueJson(readFileSync(file,'utf8'));
    keys(r,['command','cwd','exit_code','commit','tree','stdout','stderr','stdout_sha256','stderr_sha256'],[],'evidence');
    need(arr(r.command)&&r.command.length&&Number.isInteger(r.exit_code),'invalid test record');
    need(archived?r.cwd===x.worktree:realpathSync(r.cwd)===root,'evidence cwd mismatch');ancestor(r.commit,head);
    need(r.tree===businessTree(r.commit),'evidence tree mismatch');
    for(const kind of ['stdout','stderr']){
      const bytes=readFileSync(withinFeature(r[kind]));need(createHash('sha256').update(bytes).digest('hex')===r[kind+'_sha256'],'evidence hash mismatch');
    }
    if(verified){need(r.exit_code===0,'verification did not pass');need(r.tree===businessTree(verified),'verification tied to different business tree');}
    return r;
  }
  const bootstrap=s.tasks.T00.status!=='completed';
  if(bootstrap)return;
  if(archived){
    need(!s.execution?.delivery||['merged','completed'].includes(s.execution.delivery.state),'terminal archive has incomplete delivery');
    need(path.isAbsolute(x.worktree)&&path.normalize(x.worktree)===x.worktree,'invalid archived worktree path');
  }else{
    need(realpathSync(x.worktree)===root&&git(root,'branch','--show-current')===x.branch,'worktree/branch binding mismatch');
    const gd=realpathSync(git(root,'rev-parse','--absolute-git-dir'));
    const cd=realpathSync(path.resolve(root,git(root,'rev-parse','--git-common-dir')));
    need(gd!==cd,'group plan requires isolated worktree');
  }
  ancestor(x.base_commit,x.validated_commit);ancestor(x.validated_commit,head);
  for(const [id,t] of Object.entries(s.tasks)){
    for(const k of ['commit','implementation_commit'])if(t[k])ancestor(t[k],head);
    if(archived&&p.membership.has(id)){
      const history=parseUniqueJson(execFileSync('git',['-C',root,'show',t.implementation_commit+':'+progressRel],{encoding:'utf8'}));
      need(history.format_version===2&&['worktree','branch','base_commit'].every(k=>history.integration?.[k]===x[k]),
        id+': historical binding mismatch');
    }
    const records=(t.evidence_paths??[]).map(ep=>readEvidence(ep));
    if(t.status==='awaiting_verification'){
      const gid=p.membership.get(id);need(epPrefix(t.evidence_paths,gid,id),'member evidence attribution mismatch');
      ancestor(x.groups[gid].base_commit,t.implementation_commit);ancestor(t.implementation_commit,x.groups[gid].checkpoint_commit);
      need(records.some(r=>r.tree===businessTree(t.implementation_commit)),id+': missing evidence for current implementation tree');
    }
  }
  function epPrefix(paths,gid,id){return paths.every(q=>q.startsWith('execution/groups/'+gid+'/'+id+'/'));}
  for(const [gid,g] of Object.entries(x.groups)){
    if(g.status==='pending')continue;
    ancestor(x.base_commit,g.base_commit);ancestor(g.base_commit,g.checkpoint_commit);ancestor(g.checkpoint_commit,head);
    const d=p.declaration.groups[gid],all=[...d.members,d.verify];
    for(const id of all)for(const dep of p.byId.get(id).deps)if(!all.includes(dep))need(s.tasks[dep].status==='completed',gid+': external dependency not complete');
    if(g.status==='completed'){
      ancestor(g.base_commit,g.validated_commit);ancestor(g.validated_commit,x.validated_commit);
      need(epPrefix(g.evidence_paths,gid,d.verify),'verification evidence attribution mismatch');
      for(const ep of g.evidence_paths)readEvidence(ep,g.validated_commit);
      need(g.evidence_paths.every(ep=>s.tasks[d.verify].evidence_paths?.includes(ep)),'verifier/group evidence mismatch');
    }
  }
  const allowed=relative=>relative===progressRel||relative.startsWith(evidencePrefix);
  const baseline=x.active_group?x.groups[x.active_group].checkpoint_commit:x.validated_commit;
  const changes=execFileSync('git',['-C',root,'diff','--name-only','--no-renames','-z',baseline,head],{encoding:'utf8'}).split('\0').filter(Boolean);
  need(changes.every(allowed),'unexplained business commit after checkpoint');
  const dirty=execFileSync('git',['-C',root,'status','--porcelain=v1','-z','--untracked-files=all'],{encoding:'utf8'});
  // Any dirty path requires explicit recovery; metadata is committed before readiness too.
  need(!dirty,'uncommitted work requires recovery');
}

export function inspectPlanState(planDir){
  const result={ok:false,schema:'plan-state',file:planDir,errors:[],protocol_version:1,active_group:null,ready_tasks:[]};
  try{
    const p=loadIntegrationPlan(planDir);need(p,'plan-state requires integration v2');validateStateShape(p);
    runtimeFacts(p);
    result.active_group=p.state.integration.active_group;result.ready_tasks=readyTasks(p);result.ok=true;
  }catch(e){result.errors.push({path:'plan-state',expected:'consistent persisted integration state',actual:e.message});}
  return result;
}
