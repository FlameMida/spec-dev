import {parseRecord,parseUniqueJson,fault} from './record-data.mjs';
export {parseRecord,fault} from './record-data.mjs';
const need=(ok,message,code='invalid_format')=>{if(!ok)throw fault(code,message);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
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

// 导航表每行：| TNN 标题 | 依赖 | … |；依赖可写单个 ID 或闭区间 TNN-TMM。
function readNavigation(markdown){
  const rows=[];
  for(const line of markdown.split('\n')){
    const m=line.match(/^\|\s*(T\d\d)\b[^|]*\|\s*([^|]*)\|/);if(!m)continue;
    const deps=[];need(!/T\d\d\s*[—–]\s*T\d\d|T\d\d\s*-\s*T\d\d\s*-\s*T\d\d/.test(m[2]),m[1]+': ASCII hyphen range TNN-TMM');
    for(const d of m[2].matchAll(/T(\d\d)(?:\s*-\s*T(\d\d))?/g)){
      const lo=Number(d[1]),hi=Number(d[2]??d[1]);need(lo<=hi,m[1]+': ascending range');
      for(let n=lo;n<=hi;n++)deps.push('T'+String(n).padStart(2,'0'));
    }
    rows.push({id:m[1],deps:[...new Set(deps)]});
  }
  return rows;
}
const own=(x,k)=>Object.hasOwn(x,k);
const STATUSES=['pending','in_progress','completed','blocked','awaiting_verification'];

// 现行计划是单个 Markdown 文件，进度就是任务节里的复选框。
function singleFilePlan(file,text){
  const tasks=[];let current=null;
  for(const line of outsideFences(text).split('\n')){
    const h=/^###\s+(?:任务|Task)\s+(\d+)\s*(?:[:：]\s*)?(.*)$/i.exec(line);
    if(h){need(!tasks.some(t=>Number(t.id)===Number(h[1])),'duplicate task heading','inconsistent');current={id:h[1],title:h[2],checked:0,total:0};tasks.push(current);continue;}
    if(/^ {0,3}#{1,3}(?:\s|$)/.test(line)){current=null;continue;}
    const box=/^\s*-\s+\[([ xX])\]\s/.exec(line);if(box&&current){current.total++;if(box[1]!==' ')current.checked++;}
  }
  need(tasks.length,'task headings not recognized','unsupported_syntax');
  tasks.sort((a,b)=>Number(a.id)-Number(b.id));
  for(const t of tasks)t.status=t.total===0?'unknown':t.checked===t.total?'checked':'unchecked';
  const unknown=tasks.filter(t=>t.status==='unknown').length;
  return {format:'single',file,mode:null,current:null,groups:[],tasks,counts:unknown?null:{total:tasks.length,checked:tasks.filter(t=>t.status==='checked').length,unchecked:tasks.filter(t=>t.status==='unchecked').length,unknown},diagnostics:unknown?[{code:'invalid_format',message:'task has no checkboxes'}]:[]};
}

// 早期版本的分文件计划（index.md + progress.yaml + tasks/）只读取进度，不再校验其执行协议。
function splitPlan(index,progress,taskNames){
  const rows=readNavigation(outsideFences(index)),ids=rows.map(r=>r.id);
  need(ids.length&&new Set(ids).size===ids.length,'invalid navigation','inconsistent');
  const named=taskNames.filter(n=>/^T\d\d.*\.md$/.test(n));
  need(named.length===ids.length&&ids.every(id=>named.includes(id+'.md')),'task files differ from navigation','missing');
  const state=parseRecord(progress);need(object(state),'progress object required');
  need([1,2].includes(state.format_version),'unsupported progress version','unsupported_version');
  need(object(state.tasks),'progress tasks required');
  need(Object.keys(state.tasks).length===ids.length&&ids.every(id=>own(state.tasks,id)),'progress/navigation mismatch','inconsistent');
  need(state.current==null||ids.includes(state.current),'unknown current','inconsistent');
  for(const [id,t] of Object.entries(state.tasks))need(object(t)&&STATUSES.includes(t.status),'invalid task status '+id,'inconsistent');
  const titles=new Map(outsideFences(index).split('\n').flatMap(l=>{const m=/^\|\s*(T\d\d)\b([^|]*)\|/.exec(l);return m?[[m[1],m[2].trim()]]:[];}));
  const tasks=ids.map(id=>({id,title:titles.get(id)||id,status:state.tasks[id].status,commit:state.tasks[id].commit??null,tests:state.tasks[id].tests??null})).sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
  const counts={total:ids.length,completed:0,pending:0,in_progress:0,blocked:0,awaiting_verification:0};for(const t of tasks)counts[t.status]++;
  const groups=object(state.integration?.groups)?Object.entries(state.integration.groups).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([id,g])=>({id,status:g?.status??null})):[];
  return {format:'v'+state.format_version,mode:state.execution?.mode??'serial',tasks,counts,current:state.current??null,groups};
}

function parsePlanInput(files){
 const {index=null,progress=null,taskNames=null,single=[]}=files;
 if(index!==null||progress!==null||taskNames!==null){
  need(index!==null&&progress!==null&&taskNames!==null,'incomplete split plan','missing');
  need(single.length===0,'conflicting single-file and split plan','inconsistent');
  return splitPlan(index,progress,taskNames);
 }
 if(single.length===0)return null;
 need(single.length===1,'multiple plan files','inconsistent');
 return singleFilePlan(...single[0]);
}
export function parsePlanFiles(files){try{return parsePlanInput(files);}catch(e){throw fault(e.code??'invalid_format',e.message);}}
