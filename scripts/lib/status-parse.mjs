import {parseUniqueJson} from './integration-plan.mjs';
export const fault=(code,message)=>Object.assign(new Error(message),{code});
const need=(ok,message,code='invalid_format')=>{if(!ok)throw fault(code,message);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const put=(o,k,v)=>{need(!Object.hasOwn(o,k),'duplicate key: '+k);Object.defineProperty(o,k,{value:v,enumerable:true,writable:true,configurable:true});};
function uncomment(s){
 let q=null;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(q==='"'&&c==='\\'){i++;continue;}
  if(q==="'"&&c==="'"&&s[i+1]==="'"){i++;continue;}
  if(q){if(c===q)q=null;}else if((c==='"'||c==="'")&&(!s.slice(0,i).trim()||/[:\[{,]\s*$/.test(s.slice(0,i))||/^\s*-\s*$/.test(s.slice(0,i))))q=c;
  else if(c==='#'&&(i===0||/\s/.test(s[i-1])))return s.slice(0,i).trimEnd();
 }
 need(q===null,'unterminated quote');return s.trimEnd();
}
function inline(input){
 let i=0;
 const ws=()=>{while(/\s/.test(input[i]??'')&&i<input.length)i++;};
 const quoted=()=>{
  const q=input[i++];let out='';
  if(q==='"'){
   const start=i-1;while(i<input.length){if(input[i]==='\\'){i+=2;continue;}if(input[i++]==='"')return JSON.parse(input.slice(start,i));}
  }else{
   while(i<input.length){const c=input[i++];if(c==="'"){if(input[i]==="'"){out+="'";i++;}else return out;}else out+=c;}
  }throw fault('invalid_format','unterminated quote');
 };
 const scalar=s=>{
  s=s.trim();need(s.length,'empty scalar');
  need(!/^[&*!|>]/.test(s),'unsupported YAML syntax','unsupported_syntax');
  if(s==='null'||s==='~')return null;if(s==='true')return true;if(s==='false')return false;
  if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s))return Number(s);
  return s;
 };
 const value=()=>{
  ws();if(input[i]==='"'||input[i]==="'")return quoted();
  if(input[i]==='['){
   i++;ws();const a=[];if(input[i]===']'){i++;return a;}
   while(i<input.length){a.push(value());ws();const c=input[i++];if(c===']')return a;need(c===',','expected array comma');ws();}
   throw fault('invalid_format','unterminated array');
  }
  if(input[i]==='{'){
   i++;ws();const o={};if(input[i]==='}'){i++;return o;}
   while(i<input.length){
    let k;if(input[i]==='"'||input[i]==="'")k=quoted();else{const start=i;while(i<input.length&&input[i]!==':')i++;k=input.slice(start,i).trim();need(/^[\w.-]+$/.test(k),'invalid key');}
    ws();need(input[i++]===':','expected colon');put(o,k,value());ws();const c=input[i++];if(c==='}')return o;need(c===',','expected map comma');ws();
   }throw fault('invalid_format','unterminated map');
  }
  const start=i;while(i<input.length&&!/[\],}]/.test(input[i]))i++;
  return scalar(input.slice(start,i));
 };
 if(!/^[\[{"\']/.test(input.trimStart()))return scalar(input);
 const result=value();ws();need(i===input.length,'trailing scalar input');return result;
}
function parseRecordInput(text){
 const input=text.replace(/\r\n/g,'\n').trim();need(input,'empty record');
 if(input.startsWith('{')||input.startsWith('[')){
  try{return parseUniqueJson(input);}catch(e){throw fault('invalid_format',e.message);}
 }
 const lines=input.split('\n').flatMap((raw,n)=>{
  need(!/^\s*\t/.test(raw),'tabs in indentation');const s=uncomment(raw);
  if(!s.trim())return [];const indent=s.length-s.trimStart().length;
  return [{indent,text:s.trimStart(),line:n+1}];
 });let i=0;
 const block=depth=>{
  need(i<lines.length&&lines[i].indent===depth,'bad indentation');
  const sequence=/^-($|\s)/.test(lines[i].text),out=sequence?[]:{};
  while(i<lines.length&&lines[i].indent===depth){
   const row=lines[i++];let k,tail;
   if(sequence){need(/^-($|\s)/.test(row.text),'mixed map and sequence');tail=row.text.slice(1).trim();}
   else{
    const m=/^([\w.-]+|"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'):\s*(.*)$/.exec(row.text);
    need(m,'expected mapping on line '+row.line);k=/^["']/.test(m[1])?inline(m[1]):m[1];tail=m[2];
   }
   let v;
   if(tail){v=inline(tail);need(i===lines.length||lines[i].indent<=depth,'unexpected nested value');}
   else v=i<lines.length&&lines[i].indent>depth?block(lines[i].indent):null;
   if(sequence)out.push(v);else put(out,k,v);
  }return out;
 };
 need(lines.length&&lines[0].indent===0,'root indentation');const result=block(0);need(i===lines.length,'unconsumed indentation');return result;
}
export function parseRecord(text){try{return parseRecordInput(text);}catch(e){throw fault(e.code??'invalid_format',e.message);}}
export function outsideFences(text){
 let fence=null;const out=[];
 for(const line of text.replace(/\r\n/g,'\n').split('\n')){
  const m=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if(!fence&&m){fence={char:m[1][0],size:m[1].length};continue;}
  if(fence){if(m&&m[1][0]===fence.char&&m[1].length>=fence.size&&!m[2].trim())fence=null;continue;}
  out.push(line);
 }return out.join('\n');
}
export function parseMeta(text,kind){
 const m=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
 need(m,'missing or unclosed frontmatter');const root=parseRecord(m[1]);
 const key=kind==='roadmap'?'spec_dev_roadmap':'spec_dev';need(object(root)&&object(root[key]),'missing '+key);return root[key];
}
function cells(line){
 let escaped=false,cell='',out=[];
 for(const c of line.trim()){
  if(escaped){cell+=c;escaped=false;}else if(c==='\\')escaped=true;
  else if(c==='|'){out.push(cell.trim());cell='';}else cell+=c;
 }out.push(cell.trim());return out.slice(1,-1);
}
export function parseRoadmap(text){
 const meta=parseMeta(text,'roadmap'),lines=outsideFences(text).split('\n');
 const start=lines.findIndex(l=>/^##\s+(?:子项目|Subprojects|Sub-projects)\s*$/i.test(l));need(start>=0,'missing subprojects section');
 const end=lines.findIndex((l,i)=>i>start&&/^##\s/.test(l)),section=lines.slice(start+1,end<0?undefined:end);
 const table=section.filter(l=>/^\s*\|/.test(l));need(table.length>=2,'missing subprojects table');
 need(cells(table[0]).length===6&&cells(table[1]).every(c=>/^:?-+:?$/.test(c)),'invalid subprojects header');
 const ids=new Set(),rows=[];
 for(const line of table.slice(2)){
  const c=cells(line);need(c.length===6,'expected six columns');const [id,name,scope,deps,status,target]=c;
  need(id&&!ids.has(id),'duplicate or empty row id');ids.add(id);
  const link=/^\[[^\]]*\]\(([^)]+)\)$/.exec(target);
  rows.push({id,name,scope,deps,status,target:['—','-',''].includes(target)?null:link?link[1]:target.replace(/^`|`$/g,''),link:Boolean(link)});
 }return {meta,rows};
}


import {readNavigation,validateStateShape} from './integration-plan.mjs';
import {parseParallelBlock} from './parallel-plan.mjs';
const own=(x,k)=>Object.hasOwn(x,k);
const keys=(x,required,optional=[],label='object')=>{
 need(object(x),label+': expected object');
 for(const k of required)need(own(x,k),label+': missing '+k);
 for(const k of Object.keys(x))need([...required,...optional].includes(k),label+': unknown '+k);
};
function acyclic(rows){
  const map=new Map(rows.map(r=>[r.id,r.deps])),done=new Set(),active=new Set();
  function walk(id){need(map.has(id),'dangling '+id);if(done.has(id))return;need(!active.has(id),'cycle via '+id);active.add(id);for(const d of map.get(id))walk(d);active.delete(id);done.add(id);}
  for(const id of map.keys())walk(id);
}
function groupContext(index,progress,taskNames){
  const text=index;
  const lines=text.replace(/\r\n/g,'\n').split('\n');
  const markers=lines.flatMap((line,i)=>line.includes('spec-dev-integration') && line.startsWith('```')?[i]:[]);
  if(!markers.length){
    if(progress!==null){
      const s=progress;
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
  const rows=readNavigation(outsideFences(text)),ids=rows.map(r=>r.id),byId=new Map(rows.map(r=>[r.id,r]));
  need(ids.length && new Set(ids).size===ids.length,'unique navigation IDs required');acyclic(rows);
  const files=taskNames.filter(f=>/^T\d\d.*\.md$/.test(f));
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
  const state=parseUniqueJson(progress);
  need(state.format_version===2,'groups require format_version 2');
  return {planDir:'snapshot',rows,ids,byId,declaration,membership,verification,parallel,state};
}

function parsePlanInput(files){
 const {index=null,progress=null,taskNames=null,legacy=[]}=files;
 if(index!==null||progress!==null||taskNames!==null){
  need(index!==null&&progress!==null&&taskNames!==null,'incomplete split plan','missing');
  need(legacy.length===0,'conflicting legacy and split plan','inconsistent');
  const rows=readNavigation(outsideFences(index)),ids=rows.map(r=>r.id);
  need(ids.length&&new Set(ids).size===ids.length,'invalid navigation','inconsistent');acyclic(rows);
  const named=taskNames.filter(n=>/^T\d\d.*\.md$/.test(n));
  need(named.length===ids.length&&ids.every(id=>named.includes(id+'.md')),'task files differ from navigation','missing');
  const state=parseRecord(progress);need(object(state),'progress object required');
  need([1,2].includes(state.format_version),'unsupported progress version','unsupported_version');
  need(object(state.tasks)&&Array.isArray(state.resources)&&Array.isArray(state.notes),'progress tasks/resources/notes required');
  need(Object.keys(state.tasks).length===ids.length&&ids.every(id=>own(state.tasks,id)),'progress/navigation mismatch','inconsistent');
  need(state.current===null||ids.includes(state.current),'unknown current','inconsistent');
  for(const [id,t] of Object.entries(state.tasks))need(object(t)&&['pending','in_progress','completed','blocked',...(state.format_version===2?['awaiting_verification']:[])].includes(t.status),'invalid task status '+id,'inconsistent');
  if(state.format_version===2){
   need(progress.trim().startsWith('{'),'v2 requires JSON','unsupported_syntax');
   const group=groupContext(index,progress,taskNames);need(group,'missing integration declaration','missing');validateStateShape(group);
  }else{
   need(!own(state,'integration')&&!index.includes('spec-dev-integration'),'v1 cannot declare integration','inconsistent');
   parseParallelBlock(index,ids);
   if(state.execution)need(state.execution.mode==='parallel','invalid execution mode','inconsistent');
  }
  const titles=new Map(outsideFences(index).split('\n').flatMap(l=>{const m=/^\|\s*(T\d\d)\b([^|]*)\|/.exec(l);return m?[[m[1],m[2].trim()]]:[];}));
  const tasks=ids.map(id=>({id,title:titles.get(id)||id,status:state.tasks[id].status,commit:state.tasks[id].commit??null,tests:state.tasks[id].tests??null})).sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
  const counts={total:ids.length,completed:0,pending:0,in_progress:0,blocked:0,awaiting_verification:0};for(const t of tasks)counts[t.status]++;
  return {format:'v'+state.format_version,mode:state.execution?.mode??'serial',tasks,counts,current:state.current,groups:Object.entries(state.integration?.groups??{}).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([id,g])=>({id,status:g.status}))};
 }
 if(legacy.length===0)return null;
 need(legacy.length===1,'multiple legacy plans','inconsistent');
 const [file,text]=legacy[0],tasks=[];let current=null;
 for(const line of outsideFences(text).split('\n')){
  const h=/^###\s+(?:任务|Task)\s+(\d+)\s*(?:[:：]\s*)?(.*)$/i.exec(line);
  if(h){need(!tasks.some(t=>t.id===h[1]),'duplicate legacy task','inconsistent');current={id:h[1],title:h[2],checked:0,total:0};tasks.push(current);continue;}
  if(/^ {0,3}#{1,3}(?:\s|$)/.test(line)){current=null;continue;}
  const box=/^\s*-\s+\[([ xX])\]\s/.exec(line);if(box&&current){current.total++;if(box[1]!==' ')current.checked++;}
 }
 need(tasks.length,'legacy task headings not recognized','unsupported_syntax');
 tasks.sort((a,b)=>Number(a.id)-Number(b.id));
 for(const t of tasks)t.status=t.total===0?'unknown':t.checked===t.total?'checked':'unchecked';
 const unknown=tasks.filter(t=>t.status==='unknown').length;
 return {format:'legacy',file,mode:null,current:null,groups:[],tasks,counts:unknown?null:{total:tasks.length,checked:tasks.filter(t=>t.status==='checked').length,unchecked:tasks.filter(t=>t.status==='unchecked').length,unknown},diagnostics:unknown?[{code:'invalid_format',message:'legacy task has no checkboxes'}]:[]};
}
export function parsePlanFiles(files){try{return parsePlanInput(files);}catch(e){throw fault(e.code??'invalid_format',e.message);}}
