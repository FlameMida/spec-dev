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
// Recursive JSON reader preserves object-key uniqueness before JSON.parse can erase it.
export function parseUniqueJson(text){
  let i=0; const ws=()=>{while(/\s/.test(text[i]??'') && i<text.length)i++;};
  const string=()=>{
    const start=i++; while(i<text.length){
      if(text[i]==='\\'){i+=2;continue;}
      if(text[i++]==='"') return JSON.parse(text.slice(start,i));
    } throw new Error('unterminated JSON string');
  };
  const value=()=>{
    ws();
    if(text[i]==='"') return string();
    if(text[i]==='{'){
      i++;ws(); const result=Object.create(null);
      if(text[i]==='}'){i++;return result;}
      while(i<text.length){
        need(text[i]==='"','JSON object key at '+i);const k=string();
        need(!own(result,k),'duplicate JSON key: '+k);ws();need(text[i++]===':','expected colon');
        result[k]=value();ws();const end=text[i++];if(end==='}')return result;
        need(end===',','expected comma');ws();
      }
    }else if(text[i]==='['){
      i++;ws();const result=[];if(text[i]===']'){i++;return result;}
      while(i<text.length){result.push(value());ws();const end=text[i++];if(end===']')return result;need(end===',','expected comma');}
    }else{
      const m=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
      need(m,'invalid JSON value at '+i);i+=m[0].length;return JSON.parse(m[0]);
    }
    throw new Error('unterminated JSON value');
  };
  const result=value();ws();need(i===text.length,'trailing JSON at '+i);return result;
}
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
  try{loadIntegrationPlan(planDir);return [];}catch(e){return [{path:'integration',expected:'valid integration plan',actual:e.message}];}
}
// GROUP-RUNTIME
