import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseUniqueJson} from './record-data.mjs';
import {normalizeWrite} from './write-paths.mjs';

const need=(ok,message)=>{if(!ok)throw new Error('scope: '+message);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=text=>createHash('sha256').update(text).digest('hex');

// Respect outer Markdown fences; quoted examples are not declarations.
export function scopeBlocks(markdown,tag='spec-dev-scopes'){
  const lines=markdown.replace(/\r\n/g,'\n').split('\n'),blocks=[];
  let fence=null,body=[],start=0,selected=false;
  for(let i=0;i<lines.length;i++){
    const m=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    if(!fence&&m){
      fence={char:m[1][0],length:m[1].length};start=i;body=[];
      selected=m[2].trim().split(/\s+/).includes(tag);
      if(selected)need(m[1]==='```'&&m[2].trim()==='json '+tag,'expected json '+tag+' fence');
    }else if(fence&&m&&m[1][0]===fence.char&&m[1].length>=fence.length&&!m[2].trim()){
      if(selected)blocks.push({text:body.join('\n'),start,end:i});
      fence=null;selected=false;
    }else if(fence)body.push(lines[i]);
  }
  need(!fence||!selected,'unterminated '+tag+' block');
  return blocks;
}

export function readScopes(markdown,taskIds){
  const blocks=scopeBlocks(markdown);
  if(!blocks.length)return null;
  need(blocks.length===1,'duplicate scope block');
  const s=parseUniqueJson(blocks[0].text);
  need(object(s)&&s.version===1&&object(s.tasks),'invalid version/tasks');
  need(Object.keys(s).every(k=>['version','tasks','final_task','acceptance_tasks'].includes(k)),'unknown root field');
  need(Object.keys(s.tasks).length,'empty tasks');
  for(const [id,t] of Object.entries(s.tasks)){
    need(taskIds.includes(id)&&object(t),'unknown task '+id);
    need(Object.keys(t).every(k=>['writes','specs','authorization_ref'].includes(k)),'unknown task field');
    need(Array.isArray(t.writes)&&Array.isArray(t.specs)&&t.specs.length,'writes/specs arrays required');
    need(typeof t.authorization_ref==='string'&&t.authorization_ref.trim(),'authorization reference required');
    for(const values of [t.writes,t.specs]){
      for(const value of values)normalizeWrite(value,{allowSpecDev:true});
      need(new Set(values.map(v=>v.normalize('NFC').toLowerCase())).size===values.length,'duplicate paths');
    }
    if(!['T00',s.final_task,taskIds.at(-1),...(s.acceptance_tasks??[])].includes(id))need(t.writes.length,'implementation writes cannot be empty');
  }
  need(taskIds.includes(s.final_task)&&s.final_task!=='T00'&&s.final_task!==taskIds.at(-1),'invalid final task');
  need(Array.isArray(s.acceptance_tasks)&&new Set(s.acceptance_tasks).size===s.acceptance_tasks.length,'acceptance task array required');
  need(s.acceptance_tasks.every(id=>taskIds.includes(id)&&!['T00',s.final_task,taskIds.at(-1)].includes(id)),'invalid acceptance task');
  return s;
}

export function validateScopeOrder(scopes,rows){
  const map=new Map(rows.map(r=>[r.id,r.deps]));
  function ancestors(id,seen=new Set()){
    for(const dep of map.get(id)??[]){if(seen.has(dep))continue;seen.add(dep);ancestors(dep,seen);}return seen;
  }
  const delivery=rows.map(r=>r.id).sort().at(-1),final=scopes.final_task,acceptance=scopes.acceptance_tasks;
  const beforeFinal=ancestors(final);
  need(!beforeFinal.has(delivery)&&!acceptance.some(id=>beforeFinal.has(id)),'final depends on acceptance/delivery');
  for(const id of map.keys())if(!['T00',final,delivery,...acceptance].includes(id))need(beforeFinal.has(id),'final misses implementation '+id);
  for(const id of acceptance)need(ancestors(id).has(final),'acceptance must depend on final');
  need([final,...acceptance].every(id=>ancestors(delivery).has(id)),'delivery must depend on final and acceptance');
}

export function legacyTasks(markdown){
  const tasks=[];let current=null,fence=null;
  for(const line of markdown.replace(/\r\n/g,'\n').split('\n')){
    const m=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if(!fence&&m)fence={char:m[1][0],length:m[1].length};
    else if(fence&&m&&m[1][0]===fence.char&&m[1].length>=fence.length&&!m[2].trim()){fence=null;if(current)current.lines.push(line);continue;}
    if(!fence){
      const heading=/^###\s+(?:任务|Task)\s+(\d+)\s*(?:[:：]\s*)?(.*)$/i.exec(line);
      if(heading){
        const id='T'+heading[1].padStart(2,'0');need(!tasks.some(t=>t.id===id),'duplicate legacy task');
        current={id,title:heading[2],lines:[line],checked:0,total:0};tasks.push(current);continue;
      }
      if(/^#{1,3}\s/.test(line))current=null;
      if(current){const b=/^\s*-\s+\[([ xX])\]\s/.exec(line);if(b){current.total++;if(b[1]!==' ')current.checked++;}}
    }
    if(current)current.lines.push(line);
  }
  need(tasks.length,'legacy task headings not recognized');return tasks;
}

function staticLegacy(markdown){
  const excluded=scopeBlocks(markdown,'spec-dev-delivery'),lines=markdown.replace(/\r\n/g,'\n').split('\n');
  const skip=new Set(excluded.flatMap(b=>Array.from({length:b.end-b.start+1},(_,i)=>b.start+i)));
  let task=false,fence=null;const result=[];
  for(let i=0;i<lines.length;i++){
    if(skip.has(i))continue;
    let line=lines[i];const m=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if(!fence&&m)fence={char:m[1][0],length:m[1].length};
    else if(fence&&m&&m[1][0]===fence.char&&m[1].length>=fence.length&&!m[2].trim()){fence=null;result.push(line);continue;}
    if(!fence){
      if(/^###\s+(?:任务|Task)\s+\d+\b/i.test(line))task=true;
      else if(/^#{1,3}\s/.test(line))task=false;
      if(task)line=line.replace(/^(\s*-\s+\[)[ xX](\]\s)/,'$1 $2');
    }
    result.push(line);
  }
  return result.join('\n');
}

export function scopeFingerprint(view,planPath,taskId){
  planPath=normalizeWrite(planPath,{allowSpecDev:true});
  const text=view.readText(planPath);need(typeof text==='string','plan version missing');
  const split=path.posix.basename(planPath)==='index.md';
  const legacy=split?null:legacyTasks(text);
  const ids=split?[...text.matchAll(/^\|\s*(T\d\d)\b/gm)].map(m=>m[1]):legacy.map(t=>t.id);
  const scopes=readScopes(text,ids);need(scopes&&Object.hasOwn(scopes.tasks,taskId),'task scope missing');
  const taskText=split?view.readText(path.posix.join(path.posix.dirname(planPath),'tasks',taskId+'.md')):staticLegacy(legacy.find(t=>t.id===taskId).lines.join('\n'));
  need(typeof taskText==='string','task version missing');
  const spec_blobs=scopes.tasks[taskId].specs.slice().sort().map(p=>{
    const content=view.readText(p);need(typeof content==='string','spec version missing: '+p);
    return {path:p,sha256:hash(content)};
  });
  const task_digest=hash(taskText);
  return {digest:hash(JSON.stringify({plan:split?text:staticLegacy(text),task:taskId,task_digest,spec_blobs})),spec_blobs,task_digest};
}
